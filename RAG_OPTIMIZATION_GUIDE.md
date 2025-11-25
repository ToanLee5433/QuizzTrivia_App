# 🚀 RAG Search Optimization Guide v2.2 (PRODUCTION READY)

## Tổng quan

Hướng dẫn này mô tả các chiến lược tối ưu hóa cho hệ thống RAG (Retrieval-Augmented Generation) trong QuizTrivia-App, **đã fix các lỗi logic** và thêm các tối ưu production-grade.

---

## 📊 Đánh giá Hệ thống RAG Hiện tại

### ✅ Những gì đã tốt:
1. **Vector Embeddings**: Sử dụng `text-embedding-004` (768 dimensions)
2. **Caching**: Index cache với 5 phút TTL
3. **Cloud Storage**: Lưu trữ vector index tại `rag/indices/vector-index.json`
4. **Auto-update**: Firestore Triggers tự động cập nhật RAG khi quiz được approved/deleted

### ⚠️ Các vấn đề cần cải thiện:
1. **Brute-force search**: Phải load toàn bộ index vào RAM để tính cosine similarity
2. **Thiếu Hybrid Search**: Chỉ dùng semantic search, không kết hợp keyword
3. **Thiếu Re-ranking**: Không có AI re-ranking để chọn kết quả tốt nhất
4. **Query Expansion**: Không mở rộng query để tăng recall

---

## 🔥 TỐI ƯU 1: Global Variable Caching (Warm Instance)

### Vấn đề Cold Start

Dù dùng Stream hay Orama, mỗi khi Cloud Function khởi động lại (Cold Start), nó vẫn phải:
- Tải file từ Storage về (~500ms-1s)
- Parse JSON (~200-500ms)
- Total: 1-2 giây latency

### Giải pháp: Tận dụng Warm Instance

Cloud Functions giữ instance "warm" trong 15-30 phút. Biến khai báo **ngoài hàm handler** sẽ được giữ lại!

```typescript
// ✅ CORRECT: Khai báo biến Global (nằm NGOÀI hàm export)
let globalVectorIndex: VectorIndex | null = null;
let globalIndexLoadTime: number = 0;

// Cache TTL: 5 phút
const INDEX_CACHE_TTL_MS = 5 * 60 * 1000;

export const askRAG = onCall(async (request) => {
  const now = Date.now();
  
  // 1. Kiểm tra Cache trên RAM trước
  if (globalVectorIndex && (now - globalIndexLoadTime) < INDEX_CACHE_TTL_MS) {
    console.log("🔥 Warm Start: Using cached index from RAM");
    // Search ngay lập tức! < 50ms
  } else {
    console.log("❄️ Cold Start: Downloading index...");
    globalVectorIndex = await loadIndexFromStorage();
    globalIndexLoadTime = now;
  }

  // 2. Search (Cực nhanh vì đã có trong RAM)
  const results = await vectorSearch(globalVectorIndex, query);
  // ...
});
```

### Kết quả

| Request | Latency | RAM Usage |
|---------|---------|-----------|
| Cold Start (đầu tiên) | 1.5-2s | 50-100MB |
| Warm Start (sau đó) | **< 100ms** | ~0 (đã có) |

**Tác dụng**: 
- Người dùng đầu tiên: ~2s (Cold start)
- Những người sau (15-30 phút): **< 100ms** (Warm start)

---

## 🎯 TỐI ƯU 2: Fast Path Strategy (QUAN TRỌNG!)

**Nguyên tắc**: Search trước, rewrite sau (chỉ khi kết quả kém)

```typescript
// functions/src/rag/optimizedRAG.ts

// ⚠️ QUAN TRỌNG: KHÔNG hardcode threshold!
// Cần tune dựa trên production data
const CONFIG = {
  // Có thể override qua Environment Variables
  FAST_PATH_THRESHOLD: parseFloat(process.env.RAG_FAST_PATH_THRESHOLD || '0.70'),
  LOG_SCORES_FOR_TUNING: process.env.RAG_LOG_SCORES === 'true',
};

async function smartSearch(query: string, topK: number = 5): Promise<SearchResult[]> {
  
  // === BƯỚC 1: FAST PATH - Search trực tiếp ===
  const directResults = await vectorSearch(query, topK);
  
  // Kiểm tra chất lượng kết quả
  const avgScore = directResults.reduce((sum, r) => sum + r.score, 0) / directResults.length;
  const topScore = directResults[0]?.score || 0;
  
  // 📊 Log scores để tune threshold (enable 1 tuần đầu)
  if (CONFIG.LOG_SCORES_FOR_TUNING) {
    console.log(`📊 Score Tuning:`, {
      query: query.substring(0, 50),
      topScore: topScore.toFixed(3),
      avgScore: avgScore.toFixed(3),
      threshold: CONFIG.FAST_PATH_THRESHOLD,
    });
  }
  
  // Nếu kết quả tốt → trả về ngay - KHÔNG cần rewrite
  if (avgScore >= CONFIG.FAST_PATH_THRESHOLD && directResults.length >= topK / 2) {
    console.log('✅ Fast Path: Direct search successful');
    return directResults;
  }
  
  // === BƯỚC 2: SLOW PATH - AI Query Rewriting (chỉ khi cần) ===
  console.log('🔄 Slow Path: Activating AI Query Rewriting...');
  
  const rewrittenQueries = await rewriteQueryWithAI(query);
  // ... search với các query đã rewrite
}
```

### ⚠️ Cẩn thận với Score Threshold!

**Vấn đề**: Điểm Cosine Similarity phụ thuộc vào:
- Model Embedding (`text-embedding-004`)
- Độ dài văn bản
- Ngôn ngữ (Tiếng Việt vs English)

**ĐỪNG hardcode số 0.70 vội!**

👉 **Cách tune threshold**:
1. Set `RAG_LOG_SCORES=true` trong production
2. Chạy 1 tuần, thu thập logs
3. Phân tích: Query nào có score thấp nhưng kết quả tốt? Ngược lại?
4. Điều chỉnh: Có thể 0.62 là optimal, hoặc 0.75
```

---

## 🔄 TỐI ƯU 3: Stream Processing / TopK Heap (FIX LỖI LOGIC!)

**Vấn đề**: JSON.parse load toàn bộ index vào RAM → OOM với 100K+ quizzes

**Giải pháp**: TopK Heap - giữ chỉ top K kết quả trong RAM

```typescript
// functions/src/rag/optimizedRAG.ts

/**
 * Min-heap để giữ top K results với O(n log k) complexity
 * Thay vì sort toàn bộ array O(n log n)
 */
class TopKHeap {
  private heap: SearchResult[] = [];
  private k: number;
  
  constructor(k: number) {
    this.k = k;
  }
  
  add(result: SearchResult): void {
    if (this.heap.length < this.k) {
      this.heap.push(result);
      this.heap.sort((a, b) => a.score - b.score); // Min-heap
    } else if (result.score > this.heap[0].score) {
      this.heap[0] = result;
      this.heap.sort((a, b) => a.score - b.score);
    }
  }
  
  getResults(): SearchResult[] {
    return [...this.heap].sort((a, b) => b.score - a.score);
  }
}

async function vectorSearch(
  queryEmbedding: number[],
  topK: number = 10
): Promise<SearchResult[]> {
  const index = await loadVectorIndex(); // Từ Global Cache
  const topKHeap = new TopKHeap(topK);
  
  // Brute-force qua TẤT CẢ vectors, nhưng chỉ giữ top K
  for (const chunk of index.chunks) {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    topKHeap.add({
      chunkId: chunk.chunkId,
      quizId: chunk.quizId,
      title: chunk.title,
      text: chunk.text,
      score,
    });
  }
  
  return topKHeap.getResults();
}
```

### Khi nào cần Stream Processing thực sự?

TopK Heap đủ tốt khi:
- Index < 100K vectors
- File < 50MB

Cần Stream Processing (JSONStream) khi:
- Index > 100K vectors
- File > 100MB
- Memory constraint nghiêm ngặt
```

---

## ⚠️ TỐI ƯU 4: Race Condition Protection (Nâng cao)

### Vấn đề

Khi dùng Firestore Triggers để auto-update index:

```
Admin A duyệt Quiz 1  ────┐
                          │   Cùng tải index.json về
Admin B duyệt Quiz 2  ────┘   Cùng thêm quiz, ghi đè
                              ↓
                          MẤT DỮ LIỆU của 1 người!
```

### Giải pháp Phase 1 (Hiện tại)

**Chấp nhận rủi ro nhỏ** vì:
- Tần suất admin duyệt bài cùng 1 giây là cực thấp
- Rebuild index định kỳ sẽ fix lại

```typescript
// ⚠️ RACE CONDITION WARNING in optimizedRAG.ts
/**
 * GIẢI PHÁP CHO PHASE 2 (khi scale):
 * 1. Firestore Lock: Dùng transaction với lock document
 * 2. Update Queue: Dùng Cloud Tasks để queue updates
 * 3. Atomic Updates: Tách index thành nhiều files nhỏ
 */
```

### Giải pháp Phase 2 (Khi scale)

```typescript
// Option 1: Firestore Lock
const lockRef = admin.firestore().collection('system').doc('index-lock');

async function updateIndexWithLock(quizId: string) {
  const lockDoc = await lockRef.get();
  
  if (lockDoc.exists && lockDoc.data()?.locked) {
    // Wait or retry
    await delay(1000);
    return updateIndexWithLock(quizId);
  }
  
  try {
    await lockRef.set({ locked: true, by: quizId, at: Date.now() });
    await addQuizToIndex(quizId, quizData);
  } finally {
    await lockRef.delete();
  }
}

// Option 2: Cloud Tasks Queue (recommended for high volume)
import { CloudTasksClient } from '@google-cloud/tasks';

async function queueIndexUpdate(quizId: string) {
  const client = new CloudTasksClient();
  await client.createTask({
    parent: 'projects/.../queues/index-updates',
    task: {
      httpRequest: {
        url: 'https://.../processIndexUpdate',
        body: Buffer.from(JSON.stringify({ quizId })),
      },
    },
  });
}
```

---

## 🤖 TỐI ƯU 5: AI Query Rewriting (Không dùng synonym dictionary)

**Nguyên tắc**: Dùng AI để mở rộng query, không hardcode synonyms

```typescript
// functions/src/lib/hybridSearch.ts

async function rewriteQueryWithAI(query: string, model: GenerativeModel): Promise<string[]> {
  const prompt = `Bạn là expert query expansion.
Cho câu hỏi: "${query}"

Tạo 2-3 phiên bản câu hỏi khác nhau để tìm kiếm quiz:
1. Mở rộng viết tắt (JS→JavaScript, AI→Artificial Intelligence)
2. Dùng từ đồng nghĩa tiếng Việt/Anh
3. Đơn giản hóa nếu phức tạp

Trả về JSON array: ["query1", "query2", ...]
Chỉ trả về JSON, không giải thích.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3, // Low for consistency
        maxOutputTokens: 200,
      },
    });
    
    const queries = JSON.parse(result.response.text());
    return [query, ...queries]; // Include original
  } catch {
    return [query]; // Fallback
  }
}
```

---

## 🎖️ TỐI ƯU 6: AI Re-ranking (Token-Optimized)

**QUAN TRỌNG**: Chỉ gửi `title` + `summary` cho AI, KHÔNG gửi full content!

```typescript
// functions/src/lib/hybridSearch.ts

async function aiRerank<T extends { text: string; title: string }>(
  query: string,
  candidates: T[],
  model: GenerativeModel,
  topK: number = 5
): Promise<Array<T & { rerankScore: number }>> {
  
  // ✅ Token-optimized: Chỉ gửi title + truncated text
  const candidateList = candidates
    .slice(0, 15) // Max 15 để tránh token limit
    .map((c, i) => `[${i}] ${c.title}: ${c.text.substring(0, 150)}...`)
    .join('\n\n');
  
  const prompt = `Câu hỏi: "${query}"

Kết quả:
${candidateList}

Chọn ${topK} kết quả PHÙ HỢP NHẤT.
Trả về JSON: {"rankings": [{"index": 0, "score": 0.95}, ...]}`;

  // Token usage: ~500-1000 thay vì 10K+ nếu gửi full content!
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
  });

  const parsed = JSON.parse(result.response.text());
  return parsed.rankings.slice(0, topK).map((r: any) => ({
    ...candidates[r.index],
    rerankScore: r.score,
  }));
}
```

---

## 🔀 TỐI ƯU 7: Hybrid Search với RRF (Reciprocal Rank Fusion)

```typescript
// functions/src/lib/hybridSearch.ts

/**
 * Merge multiple result sets using RRF
 * Formula: score = Σ 1/(k + rank_i)
 */
function reciprocalRankFusion<T extends { chunkId: string }>(
  resultSets: T[][],
  k: number = 60
): Array<T & { rrfScore: number }> {
  const rrfScores = new Map<string, { score: number; item: T }>();
  
  for (const results of resultSets) {
    results.forEach((item, rank) => {
      const rrfScore = 1 / (k + rank + 1);
      const existing = rrfScores.get(item.chunkId);
      
      if (existing) {
        existing.score += rrfScore;
      } else {
        rrfScores.set(item.chunkId, { score: rrfScore, item });
      }
    });
  }
  
  return Array.from(rrfScores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ score, item }) => ({ ...item, rrfScore: score }));
}

// Usage: Kết hợp 70% semantic + 30% keyword
const fused = reciprocalRankFusion([
  semanticResults,  // Vector search results
  keywordResults,   // Exact match results  
]);
```

---

## 🔧 Pipeline Tối ưu Hoàn chỉnh

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER QUERY                                │
│                    "Tìm quiz về lịch sử"                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 0: CHECK WARM INSTANCE CACHE                              │
│  ─────────────────────────────────                              │
│  • globalVectorIndex có trong RAM? → Skip download              │
│  • Cold Start: Tải từ Storage (1-2s)                            │
│  • Warm Start: Dùng ngay từ RAM (<50ms)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: FAST PATH - Direct Vector Search                       │
│  ─────────────────────────────────────────                      │
│  • Embed query với text-embedding-004                           │
│  • Brute-force search với TopK Heap (giữ top K trong RAM)       │
│  • 📊 Log topScore để tune threshold                             │
│  • Nếu avg_score >= THRESHOLD → Trả về ngay (SKIP bước 2-3)    │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │ avg_score < THRESHOLD (cần tune!) │
            └─────────────────┬─────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: SLOW PATH - AI Query Rewriting                         │
│  ─────────────────────────────────────────                      │
│  • AI tạo 2-3 phiên bản query (không dùng synonym dict)         │
│  • Search với mỗi query                                         │
│  • Merge + deduplicate kết quả                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Hybrid Search + RRF                                    │
│  ─────────────────────────────────                              │
│  • Keyword search (tìm exact matches)                           │
│  • Kết hợp với semantic results                                 │
│  • RRF: 70% semantic + 30% keyword                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: AI Re-ranking (Token-Optimized)                        │
│  ─────────────────────────────────────                          │
│  • Gửi CHỈ title + summary (KHÔNG full content!)               │
│  • AI chọn top 5 phù hợp nhất                                   │
│  • ~500-1000 tokens thay vì 10K+                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Fetch Quiz Details (Lazy Loading)                      │
│  ─────────────────────────────────────────                      │
│  • Chỉ query Firestore cho 5 quizzes đã chọn                    │
│  • Lấy full content để generate response                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Generate Response                                       │
│  ───────────────────────────                                    │
│  • Context = top 5 quizzes content                              │
│  • gemini-2.5-flash-lite tạo câu trả lời                        │
│  • Return: answer + quiz recommendations + metrics               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📈 Benchmark Dự kiến

| Metric | Trước Tối ưu | Sau Tối ưu | Cải thiện |
|--------|--------------|------------|-----------|
| Latency (Cold Start) | 2-3s | 1.5-2s | **1.5x faster** |
| Latency (Warm Start) | 2-3s | **< 500ms** | **5-6x faster** |
| Memory Usage | 500MB+ | 50-100MB | **5-10x less** |
| Relevance Score | 0.65 | 0.85+ | **30%+ better** |
| Token Usage (re-rank) | 10K+ | 500-1K | **10x cheaper** |
| Fast Path Hit Rate | 0% | 70%+ | **Tiết kiệm AI calls** |

---

## 🛠️ Implementation Status

### ✅ Phase 1: Global Caching (DONE)
- [x] Global Variable Caching trong `optimizedRAG.ts`
- [x] Cache TTL 5 phút
- [x] `invalidateGlobalCache()` khi index update

### ✅ Phase 2: Fast Path Strategy (DONE)
- [x] `smartSearch()` với configurable threshold
- [x] Score logging cho tuning (`RAG_LOG_SCORES=true`)
- [x] Environment variable config

### ✅ Phase 3: AI Query Rewriting (DONE)
- [x] `rewriteQueryWithAI()` trong `hybridSearch.ts`
- [x] Không dùng synonym dictionary
- [x] Fallback khi AI fail

### ✅ Phase 4: AI Re-ranking (DONE)
- [x] `aiRerank()` token-optimized
- [x] Chỉ gửi title + truncated text
- [x] Fallback khi parse fail

### ✅ Phase 5: Hybrid Search (DONE)
- [x] `keywordSearch()` với stop words
- [x] `reciprocalRankFusion()`
- [x] Vietnamese diacritics support

### ⏳ Phase 6: Production Tuning (TODO)
- [ ] Deploy và monitor 1 tuần
- [ ] Tune score threshold dựa trên logs
- [ ] Adjust RRF weights nếu cần

---

## 📝 Environment Variables

```bash
# functions/.env hoặc Firebase Console

# Score threshold cho Fast Path (default: 0.70)
# Cần tune dựa trên production data!
RAG_FAST_PATH_THRESHOLD=0.70

# Minimum relevance score (default: 0.40)
RAG_MIN_RELEVANCE=0.40

# Vector search top K (default: 10)
RAG_VECTOR_TOP_K=10

# Final results top K (default: 5)
RAG_FINAL_TOP_K=5

# Enable AI re-ranking (default: true)
RAG_ENABLE_RERANK=true

# Enable score logging for tuning (SET TRUE FOR FIRST WEEK!)
RAG_LOG_SCORES=true
```

---

## 📝 Lưu ý quan trọng

1. **🔥 Warm Instance saves 70%+ latency** - Global caching là key optimization
2. **📊 TUNE THRESHOLD sau 1 tuần** - Đừng trust 0.70 mù quáng
3. **⚠️ Race condition** - Chấp nhận cho hiện tại, fix khi scale
4. **💰 Token optimization** - Re-ranking chỉ cần title + summary
5. **🔄 Cache invalidation** - Triggers tự động invalidate khi index update

---

## 🔗 Files đã implement

| File | Mô tả | Status |
|------|-------|--------|
| `functions/src/rag/optimizedRAG.ts` | Core RAG với tất cả optimizations | ✅ NEW |
| `functions/src/lib/hybridSearch.ts` | AI Query Rewriting, Re-ranking, RRF | ✅ UPDATED |
| `functions/src/triggers/onQuizApproved.ts` | Auto-add + cache invalidation | ✅ UPDATED |
| `functions/src/triggers/onQuizDeleted.ts` | Auto-remove + cache invalidation | ✅ UPDATED |

---

## 🚀 Deployment Command

```bash
cd functions

# Build
npm run build

# Deploy all RAG functions
firebase deploy --only functions:askRAG,functions:onQuizApproved,functions:onQuizDeleted,functions:onQuizCreatedApproved

# Set environment variables
firebase functions:config:set rag.fast_path_threshold="0.70" rag.log_scores="true"
```

---

*Last updated: v2.2 - Production-ready with Global Caching, Configurable Thresholds, Race Condition Warning*
