# 🔄 PHASE 2: PHƯƠNG ÁN TỐI ƯU - TÍCH HỢP VÀO CẤU TRÚC HIỆN CÓ

## ❌ VẤN ĐỀ: Code hiện tại (KHÔNG TỐI ƯU)

Tôi đã tạo quá nhiều folders/files mới:
```
functions/src/
├── triggers/           ❌ Folder mới (4 files)
├── migrations/         ❌ Folder mới (1 file)
├── monitoring/         ❌ Folder mới (1 file)
├── scheduled/          ❌ Folder mới (1 file)
└── lib/                ✅ OK (core logic)
```

**Tại sao không tốt:**
- Tạo cấu trúc phức tạp không cần thiết
- Không tận dụng file `index.ts` hiện có
- Khó bảo trì (quá nhiều files nhỏ)
- Không theo convention của dự án

---

## ✅ PHƯƠNG ÁN TỐI ƯU

### **Nguyên tắc:**
1. **Tận dụng `index.ts` hiện có** - Đã có sẵn `generateQuestions`, `testAI`, `sendOTP`
2. **Giữ `lib/` cho core logic** - Utilities và business logic
3. **Giữ `rag/` như hiện tại** - Đã có `ask.ts` và `simpleRAG.ts`
4. **Export tất cả từ `index.ts`** - Single entry point

### **Cấu trúc mới:**
```
functions/src/
├── index.ts            ✅ Gộp tất cả triggers, migrations, scheduled
├── lib/                ✅ Giữ nguyên (core utilities)
│   ├── storageUtils.ts
│   ├── indexManager.ts
│   ├── indexCache.ts
│   └── indexQueue.ts
└── rag/                ✅ Giữ nguyên
    ├── ask.ts
    └── simpleRAG.ts
```

---

## 📋 KẾ HOẠCH REFACTOR

### **BƯỚC 1: Gộp Triggers vào index.ts**

**XÓA folders:**
- ❌ `functions/src/triggers/`

**THÊM vào `index.ts`:**
```typescript
// ============================================================
// 🔄 Auto-Indexing Triggers (Phase 2.2)
// ============================================================

/**
 * Auto-index when quiz is created/approved
 */
export const onQuizCreated = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .firestore.document('quizzes/{quizId}')
  .onCreate(async (snapshot, context) => {
    const quizId = context.params.quizId;
    const quizData = snapshot.data();

    if (quizData.status !== 'approved') return null;

    try {
      const { addQuizToIndex } = await import('./lib/indexManager');
      await addQuizToIndex(quizId, quizData);
      console.log(`✅ Auto-indexed quiz: ${quizId}`);
      return { success: true, quizId };
    } catch (error) {
      console.error(`❌ Failed to auto-index quiz ${quizId}:`, error);
      return { success: false, error: error.message };
    }
  });

/**
 * Auto-update index when quiz is modified
 */
export const onQuizUpdated = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .firestore.document('quizzes/{quizId}')
  .onUpdate(async (change, context) => {
    const quizId = context.params.quizId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Prevent infinite loops
    if (afterData._updatedByTrigger) return null;

    // Smart change detection
    const importantFields = ['title', 'description', 'category', 'status', 'visibility'];
    const hasChange = importantFields.some(f => beforeData[f] !== afterData[f]);
    
    if (!hasChange) return null;

    try {
      const { updateQuizInIndex } = await import('./lib/indexManager');
      await updateQuizInIndex(quizId, beforeData, afterData);
      console.log(`✅ Auto-updated index for quiz: ${quizId}`);
      return { success: true, quizId };
    } catch (error) {
      console.error(`❌ Failed to update index for quiz ${quizId}:`, error);
      return { success: false, error: error.message };
    }
  });

/**
 * Auto-remove from index when quiz is deleted
 */
export const onQuizDeleted = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .firestore.document('quizzes/{quizId}')
  .onDelete(async (snapshot, context) => {
    const quizId = context.params.quizId;

    try {
      const { removeQuizFromIndex } = await import('./lib/indexManager');
      await removeQuizFromIndex(quizId);
      console.log(`✅ Auto-removed quiz from index: ${quizId}`);
      return { success: true, quizId };
    } catch (error) {
      console.error(`❌ Failed to remove quiz ${quizId} from index:`, error);
      return { success: false, error: error.message };
    }
  });
```

---

### **BƯỚC 2: Gộp Migration vào index.ts**

**XÓA folders:**
- ❌ `functions/src/migrations/`

**THÊM vào `index.ts`:**
```typescript
// ============================================================
// 🔄 Migration Functions (Phase 2.1 - One-time)
// ============================================================

/**
 * Migrate index from Firestore to Cloud Storage
 */
export const migrateIndexToStorage = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onCall(async (data, context) => {
    // Require admin auth
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    
    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    if (userDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }

    try {
      const { migrateFromFirestore } = await import('./lib/storageUtils');
      await migrateFromFirestore();
      
      return { success: true, message: 'Migration complete' };
    } catch (error) {
      throw new functions.https.HttpsError('internal', `Migration failed: ${error.message}`);
    }
  });
```

---

### **BƯỚC 3: Gộp Scheduled Functions vào index.ts**

**XÓA folders:**
- ❌ `functions/src/scheduled/`

**THÊM vào `index.ts`:**
```typescript
// ============================================================
// ⏰ Scheduled Functions (Phase 2.3)
// ============================================================

/**
 * Process index update queue every minute
 */
export const processIndexQueue = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .pubsub.schedule('every 1 minutes')
  .timeZone('Asia/Ho_Chi_Minh')
  .onRun(async () => {
    try {
      const { processQueue } = await import('./lib/indexQueue');
      const result = await processQueue(10);
      console.log('✅ Queue processed:', result);
      return result;
    } catch (error) {
      console.error('❌ Queue processing failed:', error);
      throw error;
    }
  });

/**
 * Daily cleanup of old queue tasks
 */
export const cleanupIndexQueue = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .pubsub.schedule('0 2 * * *') // 2 AM daily
  .timeZone('Asia/Ho_Chi_Minh')
  .onRun(async () => {
    try {
      const { cleanupQueue } = await import('./lib/indexQueue');
      const deletedCount = await cleanupQueue(7);
      console.log(`✅ Cleanup complete: ${deletedCount} tasks removed`);
      return { deletedCount };
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  });
```

---

### **BƯỚC 4: Gộp Monitoring vào lib/indexManager.ts**

**XÓA folders:**
- ❌ `functions/src/monitoring/`

**CẬP NHẬT `lib/indexManager.ts`:**
```typescript
// Đã có monitoring logic trong indexManager.ts rồi
// Chỉ cần đảm bảo logIndexUpdate được gọi đúng chỗ
```

---

### **BƯỚC 5: Giữ lib/ như hiện tại**

**GIỮ NGUYÊN:**
- ✅ `lib/storageUtils.ts` - Cloud Storage operations
- ✅ `lib/indexManager.ts` - CRUD + monitoring
- ✅ `lib/indexCache.ts` - Caching layer
- ✅ `lib/indexQueue.ts` - Queue management

---

## 📁 CẤU TRÚC CUỐI CÙNG

```
functions/src/
├── index.ts                    ← GỘP TẤT CẢ (triggers, migrations, scheduled)
│   ├── generateQuestions       (đã có)
│   ├── testAI                  (đã có)
│   ├── sendOTP                 (đã có)
│   ├── askRAG                  (export từ rag/)
│   ├── onQuizCreated           ← MỚI
│   ├── onQuizUpdated           ← MỚI
│   ├── onQuizDeleted           ← MỚI
│   ├── migrateIndexToStorage   ← MỚI
│   ├── processIndexQueue       ← MỚI
│   └── cleanupIndexQueue       ← MỚI
│
├── lib/                        ← CORE LOGIC
│   ├── storageUtils.ts         (Cloud Storage + backup)
│   ├── indexManager.ts         (CRUD + monitoring)
│   ├── indexCache.ts           (Caching)
│   └── indexQueue.ts           (Queue)
│
└── rag/                        ← RAG SYSTEM (giữ nguyên)
    ├── ask.ts                  (askRAG endpoint)
    └── simpleRAG.ts            (RAG logic)
```

---

## 📊 SO SÁNH

### **Trước (Không tốt):**
- 15 files mới
- 7 folders
- Phức tạp, khó maintain

### **Sau (Tối ưu):**
- 4 files core (lib/)
- 1 file chính (index.ts)
- Đơn giản, dễ maintain

---

## ✅ LỢI ÍCH

1. **Đơn giản hơn**
   - Chỉ cần check `index.ts` để biết có functions nào
   - Không cần nhớ cấu trúc nhiều folders

2. **Dễ maintain**
   - Ít files hơn
   - Logic rõ ràng
   - Theo convention Firebase Functions

3. **Tích hợp tốt**
   - Tận dụng cấu trúc hiện có
   - Không gây breaking changes
   - Dễ deploy

4. **Performance tốt hơn**
   - Lazy import trong triggers
   - Chỉ load khi cần
   - Giảm cold start time

---

## 🚀 HÀNH ĐỘNG TIẾP THEO

**Tôi sẽ:**
1. XÓA các folders không cần thiết (triggers/, migrations/, monitoring/, scheduled/)
2. GỘP tất cả logic vào `index.ts`
3. GIỮ lại 4 files core trong `lib/`
4. CẬP NHẬT export trong `index.ts`

**Bạn đồng ý với phương án này không?**
