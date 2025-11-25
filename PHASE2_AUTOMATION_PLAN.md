# 📑 PHASE 2: TỰ ĐỘNG HÓA PIPELINE DỮ LIỆU RAG

## 🎯 MỤC TIÊU CHIẾN LƯỢC

Chuyển đổi từ **Manual Batch Processing** → **Real-time Event-Driven Architecture**

### Kiến trúc hiện tại (AS-IS)
```
Admin bấm nút → Đọc toàn bộ DB → Tạo lại toàn bộ Index → Lưu đè Firestore
```

**Vấn đề:**
- ⏱️ Chậm: Xử lý hàng nghìn quiz mỗi lần
- 💰 Tốn tài nguyên: Re-embed toàn bộ data
- 📊 Data stale: Chatbot trả lời dữ liệu cũ cho đến lần build tiếp theo
- 🔒 Giới hạn: Firestore document 1MB limit

### Kiến trúc mục tiêu (TO-BE)
```
Quiz thay đổi → Firestore Trigger → Xử lý vi mô → Cập nhật cục bộ Index
```

**Lợi ích:**
- ⚡ Real-time: Cập nhật tức thì
- 💸 Tiết kiệm: Chỉ xử lý phần thay đổi
- 📈 Scalable: Hỗ trợ hàng ngàn quiz
- 🎯 Accurate: Dữ liệu luôn mới nhất

---

## 📋 LỘ TRÌNH THỰC HIỆN

### 🔵 GIAI ĐOẠN 2.1: STORAGE MIGRATION (Tuần 1)

**Mục tiêu:** Giải quyết giới hạn 1MB của Firestore

#### **Nhiệm vụ:**
1. ✅ Tạo Cloud Storage utilities
2. ✅ Migrate load/save functions từ Firestore → Storage
3. ✅ Update Cloud Functions để đọc từ Storage
4. ✅ Update build script để upload lên Storage
5. ✅ Implement versioning & backup

#### **Cấu trúc Storage:**
```
gs://datn-quizapp.appspot.com/
  rag/
    indices/
      vector-index.json          # Current active index
      vector-index-v2.json       # Versioned backups
      vector-index-v1.json
    backups/
      2025-11-24_index.json      # Daily backups
      2025-11-23_index.json
```

#### **Files cần tạo/sửa:**
- ✅ `functions/src/lib/storageUtils.ts` - Storage helpers
- ✅ `functions/src/lib/indexManager.ts` - Index CRUD operations
- 🔧 `functions/src/rag/simpleRAG.ts` - Update load logic
- 🔧 `scripts/buildVectorIndex.ts` - Upload to Storage
- 🔧 `src/lib/genkit/indexing.ts` - Remove file system dependency

#### **Metrics:**
- File size support: Up to 5GB
- Read latency: ~200-500ms (vs Firestore ~100ms)
- Write latency: ~1-2s (acceptable for batch)
- Cost: $0.026/GB/month (vs Firestore $0.18/GB/month)

---

### 🔵 GIAI ĐOẠN 2.2: FIRESTORE TRIGGERS (Tuần 2)

**Mục tiêu:** Tự động cập nhật index khi quiz thay đổi

#### **Triggers cần implement:**

**1. onCreate - Quiz được tạo/duyệt**
```typescript
// functions/src/triggers/onQuizCreated.ts
exports.onQuizCreated = onDocumentCreated('quizzes/{quizId}', async (event) => {
  const quiz = event.data?.data();
  if (quiz.status !== 'approved') return; // Skip unapproved
  
  // 1. Extract quiz chunks
  const chunks = await extractQuizChunks(quiz);
  
  // 2. Generate embeddings
  const indexedChunks = await embedChunks(chunks);
  
  // 3. Load current index
  const index = await loadIndexFromStorage();
  
  // 4. Append new chunks
  index.chunks.push(...indexedChunks);
  index.totalChunks = index.chunks.length;
  index.updatedAt = Date.now();
  
  // 5. Save back
  await saveIndexToStorage(index);
});
```

**2. onUpdate - Quiz được chỉnh sửa**
```typescript
// functions/src/triggers/onQuizUpdated.ts
exports.onQuizUpdated = onDocumentUpdated('quizzes/{quizId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  
  // Check if important fields changed
  const importantFields = ['title', 'description', 'category', 'status'];
  const hasImportantChange = importantFields.some(
    field => before[field] !== after[field]
  );
  
  if (!hasImportantChange) return; // Skip trivial updates
  
  // 1. Remove old chunks
  const index = await loadIndexFromStorage();
  index.chunks = index.chunks.filter(c => !c.chunkId.startsWith(`quiz_${quizId}`));
  
  // 2. Add new chunks (if approved)
  if (after.status === 'approved') {
    const newChunks = await extractAndEmbedQuiz(after);
    index.chunks.push(...newChunks);
  }
  
  // 3. Save
  await saveIndexToStorage(index);
});
```

**3. onDelete - Quiz bị xóa**
```typescript
// functions/src/triggers/onQuizDeleted.ts
exports.onQuizDeleted = onDocumentDeleted('quizzes/{quizId}', async (event) => {
  const quizId = event.params.quizId;
  
  // Remove all chunks for this quiz
  const index = await loadIndexFromStorage();
  index.chunks = index.chunks.filter(c => !c.chunkId.startsWith(`quiz_${quizId}`));
  index.totalChunks = index.chunks.length;
  
  await saveIndexToStorage(index);
});
```

#### **Optimization: Debouncing**
```typescript
// Queue updates instead of immediate processing
const updateQueue = new Map<string, NodeJS.Timeout>();

function debouncedUpdate(quizId: string, updateFn: () => Promise<void>) {
  // Cancel previous timeout
  if (updateQueue.has(quizId)) {
    clearTimeout(updateQueue.get(quizId)!);
  }
  
  // Schedule new update after 2 minutes
  const timeout = setTimeout(async () => {
    await updateFn();
    updateQueue.delete(quizId);
  }, 120000); // 2 minutes
  
  updateQueue.set(quizId, timeout);
}
```

---

### 🔵 GIAI ĐOẠN 2.3: DATA INTEGRITY (Tuần 3)

**Mục tiêu:** Đảm bảo an toàn dữ liệu khi có nhiều concurrent updates

#### **Vấn đề: Race Condition**
```
Admin A duyệt Quiz 1 → Load Index → Update → Save (5s)
Admin B duyệt Quiz 2 → Load Index → Update → Save (6s)
                                    ↑ Mất data của Quiz 1!
```

#### **Giải pháp 1: File Locking (Simple)**
```typescript
// functions/src/lib/lockManager.ts
export class SimpleLockManager {
  private locks = new Map<string, { owner: string; expiresAt: number }>();
  
  async acquireLock(resource: string, timeout = 30000): Promise<string> {
    const lockId = `${resource}_${Date.now()}`;
    const existing = this.locks.get(resource);
    
    // Check if lock is expired
    if (existing && existing.expiresAt > Date.now()) {
      throw new Error('Resource is locked');
    }
    
    // Set lock
    this.locks.set(resource, {
      owner: lockId,
      expiresAt: Date.now() + timeout
    });
    
    return lockId;
  }
  
  async releaseLock(resource: string, lockId: string): Promise<void> {
    const lock = this.locks.get(resource);
    if (lock?.owner === lockId) {
      this.locks.delete(resource);
    }
  }
}
```

#### **Giải pháp 2: Firestore Queue (Professional)**
```typescript
// functions/src/lib/indexQueue.ts
interface IndexUpdateTask {
  id: string;
  type: 'create' | 'update' | 'delete';
  quizId: string;
  data?: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  processedAt?: number;
}

// Enqueue task
async function enqueueIndexUpdate(task: Omit<IndexUpdateTask, 'id' | 'status' | 'createdAt'>) {
  await admin.firestore().collection('index_queue').add({
    ...task,
    status: 'pending',
    createdAt: Date.now()
  });
}

// Process queue (scheduled function runs every minute)
export const processIndexQueue = onSchedule('every 1 minutes', async () => {
  const queue = await admin.firestore()
    .collection('index_queue')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'asc')
    .limit(10)
    .get();
  
  for (const doc of queue.docs) {
    const task = doc.data() as IndexUpdateTask;
    
    try {
      // Mark as processing
      await doc.ref.update({ status: 'processing' });
      
      // Process task
      await processTask(task);
      
      // Mark as completed
      await doc.ref.update({ 
        status: 'completed',
        processedAt: Date.now()
      });
    } catch (error) {
      await doc.ref.update({ 
        status: 'failed',
        error: error.message 
      });
    }
  }
});
```

#### **Comparison:**

| Method | Pros | Cons | Recommended |
|--------|------|------|-------------|
| File Locking | Simple, fast | Single instance only | Dev/Testing |
| Firestore Queue | Reliable, scalable | More complex | Production |

---

### 🔵 GIAI ĐOẠN 2.4: OPTIMIZATION (Tuần 4)

**Mục tiêu:** Giảm latency và chi phí

#### **1. Cold Start Strategy**
```typescript
// Cache index in memory
let cachedIndex: VectorIndex | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadIndexWithCache(): Promise<VectorIndex> {
  if (cachedIndex && Date.now() < cacheExpiry) {
    console.log('✅ Using cached index');
    return cachedIndex;
  }
  
  console.log('📥 Loading index from Storage...');
  cachedIndex = await loadIndexFromStorage();
  cacheExpiry = Date.now() + CACHE_TTL;
  
  return cachedIndex;
}
```

#### **2. Incremental Embedding**
```typescript
// Only re-embed if content changed
async function smartUpdate(quiz: Quiz, oldQuiz?: Quiz) {
  const oldHash = oldQuiz?.contentHash;
  const newHash = calculateHash(quiz);
  
  if (oldHash === newHash) {
    console.log('⏭️ Skip: Content unchanged');
    return;
  }
  
  console.log('🔄 Re-embedding: Content changed');
  await embedAndUpdate(quiz);
}
```

#### **3. Batch Processing**
```typescript
// Process multiple updates in one write
async function batchUpdate(tasks: IndexUpdateTask[]) {
  const index = await loadIndexFromStorage();
  
  for (const task of tasks) {
    switch (task.type) {
      case 'create':
        index.chunks.push(...task.chunks);
        break;
      case 'update':
        index.chunks = index.chunks.filter(c => c.quizId !== task.quizId);
        index.chunks.push(...task.chunks);
        break;
      case 'delete':
        index.chunks = index.chunks.filter(c => c.quizId !== task.quizId);
        break;
    }
  }
  
  // Single write
  await saveIndexToStorage(index);
}
```

#### **4. Monitoring & Alerts**
```typescript
// Log metrics to Cloud Monitoring
import { Logging } from '@google-cloud/logging';

async function logIndexUpdate(event: string, metadata: any) {
  const logging = new Logging();
  const log = logging.log('rag-index-updates');
  
  await log.write({
    severity: 'INFO',
    resource: { type: 'cloud_function' },
    jsonPayload: {
      event,
      ...metadata,
      timestamp: Date.now()
    }
  });
}
```

---

## 🛡️ QUẢN LÝ RỦI RO

### **1. Infinite Loop Prevention**

**Vấn đề:**
```
Trigger updates quiz → Quiz updated → Trigger fires again → Loop!
```

**Giải pháp:**
```typescript
// Use a flag field to prevent recursion
exports.onQuizUpdated = onDocumentUpdated('quizzes/{quizId}', async (event) => {
  const data = event.data?.after.data();
  
  // ⚠️ CRITICAL: Check if update was from trigger
  if (data._updatedByTrigger) {
    console.log('⏭️ Skip: Update was from trigger itself');
    return;
  }
  
  // Process update...
  
  // If need to update quiz, set flag
  await event.data.after.ref.update({
    _updatedByTrigger: true,
    someField: newValue
  });
});
```

### **2. Data Consistency Check**

**Weekly re-sync script:**
```typescript
// scripts/resyncIndex.ts
async function resyncIndex() {
  console.log('🔍 Checking index consistency...');
  
  // Load index
  const index = await loadIndexFromStorage();
  
  // Get all approved quizzes
  const quizzes = await admin.firestore()
    .collection('quizzes')
    .where('status', '==', 'approved')
    .get();
  
  const expectedQuizIds = new Set(quizzes.docs.map(d => d.id));
  const indexedQuizIds = new Set(
    index.chunks
      .map(c => c.chunkId.match(/^quiz_([^_]+)/)?.[1])
      .filter(Boolean)
  );
  
  // Find missing/extra quizzes
  const missing = [...expectedQuizIds].filter(id => !indexedQuizIds.has(id));
  const extra = [...indexedQuizIds].filter(id => !expectedQuizIds.has(id));
  
  console.log(`Missing in index: ${missing.length}`);
  console.log(`Extra in index: ${extra.length}`);
  
  // Fix inconsistencies
  if (missing.length > 0 || extra.length > 0) {
    console.log('⚠️ Inconsistency detected! Rebuilding...');
    await buildIndex();
  } else {
    console.log('✅ Index is consistent');
  }
}
```

### **3. Backup Strategy**

```typescript
// Daily backup (scheduled function)
export const dailyBackup = onSchedule('every day 02:00', async () => {
  const index = await loadIndexFromStorage();
  const date = new Date().toISOString().split('T')[0];
  
  await saveIndexToStorage(index, `backups/${date}_index.json`);
  console.log(`✅ Backup created: ${date}_index.json`);
  
  // Clean old backups (keep 30 days)
  await cleanOldBackups(30);
});
```

---

## 📊 METRICS & MONITORING

### **Key Metrics:**

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Index update latency | < 10s | > 30s |
| Embedding success rate | > 99% | < 95% |
| Queue processing time | < 5 min | > 15 min |
| Index size | < 500MB | > 1GB |
| Failed updates | 0 | > 5/hour |

### **Dashboard:**
```
Firebase Console → Functions → Metrics
- onQuizCreated: Invocations, errors, duration
- onQuizUpdated: Invocations, errors, duration
- processIndexQueue: Items processed, success rate
```

---

## 🚀 DEPLOYMENT PLAN

### **Week 1: Storage Migration**
```bash
# 1. Deploy storage utils
cd functions
npm run build
firebase deploy --only functions:storageUtils

# 2. Test migration
npm run test:migration

# 3. Migrate existing index
npm run migrate:index

# 4. Verify
npm run verify:storage
```

### **Week 2: Enable Triggers**
```bash
# Deploy triggers (disabled by default)
firebase deploy --only functions:onQuizCreated
firebase deploy --only functions:onQuizUpdated
firebase deploy --only functions:onQuizDeleted

# Monitor logs
firebase functions:log --only onQuizCreated
```

### **Week 3: Enable Queue**
```bash
# Deploy queue processor
firebase deploy --only functions:processIndexQueue

# Test with staging data
npm run test:queue
```

### **Week 4: Optimization & Monitoring**
```bash
# Deploy optimizations
firebase deploy --only functions

# Set up alerts
npm run setup:alerts

# Performance testing
npm run test:performance
```

---

## ✅ SUCCESS CRITERIA

- [ ] Index updates within 10 seconds of quiz change
- [ ] Zero data loss during concurrent updates
- [ ] Index size supports 10,000+ quizzes
- [ ] 99.9% trigger success rate
- [ ] Chatbot always returns latest data
- [ ] Weekly consistency check passes
- [ ] Cost < $10/month for 1000 updates/day

---

## 📚 DOCUMENTATION UPDATES

- [ ] Update README with new architecture
- [ ] Create migration guide for existing data
- [ ] Document troubleshooting steps
- [ ] Add monitoring dashboard screenshots
- [ ] Create runbook for incidents

---

**Last Updated:** 2025-11-24  
**Status:** Phase 2.1 In Progress  
**Next Review:** 2025-12-01
