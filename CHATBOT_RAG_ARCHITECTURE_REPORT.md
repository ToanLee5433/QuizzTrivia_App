# 📊 BÁO CÁO CHI TIẾT: HỆ THỐNG RAG CHATBOT

> **Version**: v4.2 (Multi-Agent Architecture)  
> **Ngày tạo**: December 7, 2025

---

## 1. 🏗️ KIẾN TRÚC TỔNG QUAN

### 1.1 Multi-Agent Architecture

Hệ thống sử dụng kiến trúc **Multi-Agent** với **Conversation Memory**:

```
┌─────────────────────────────────────────────────────────────┐
│  User Input + History → Query Rewriter → Refined Query     │
│                              ↓                              │
│  Refined Query → Router Agent → [Search/Planner/Chat]      │
│                              ↓                              │
│  Planner Agent → multiSearch (Parallel) → Synthesizer      │
│                              ↓                              │
│  Output: Rich Answer + Quiz Cards (Context-Aware!)         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Các thành phần chính

| File | Vai trò |
|------|---------|
| `functions/src/rag/optimizedRAG.ts` | Core RAG engine, orchestration logic |
| `functions/src/lib/hybridSearch.ts` | Hybrid search utilities (Vector + Keyword + RRF) |
| `functions/src/lib/orama.ts` | Orama DB wrapper cho in-memory search |
| `functions/src/rag/autoTagging.ts` | Auto-tagging pipeline khi quiz được duyệt |

---

## 2. 🔍 THUẬT TOÁN TÌM KIẾM

### 2.1 Hybrid Search (Vector + Keyword + RRF)

Hệ thống sử dụng **3 phương pháp search kết hợp**:

#### a) **Vector Search (Semantic)**
- **Model**: `gemini-embedding-001` (768 dimensions)
- **Similarity metric**: Cosine Similarity
- **Complexity**: 
  - Orama mode: O(log n)
  - Legacy brute-force: O(n)

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

#### b) **Keyword Search (BM25)**
- Sử dụng **Orama's built-in BM25** cho keyword matching
- Search trên: `title`, `text`, `summary`, `tags`
- **Vietnamese text processing**:
  - Stop words filtering (VI + EN)
  - Diacritics removal cho fallback matching
  - Compound word normalization (e.g., "lập trình" → "laptrinh")
  - N-gram generation cho fuzzy matching

#### c) **Reciprocal Rank Fusion (RRF)**
- Công thức: `RRF(d) = Σ 1/(k + rank(d))` với `k = 60`
- Merge results từ Vector và Keyword search
- **Weight**: 60% vector, 40% keyword (configurable)

```typescript
export function reciprocalRankFusion<T extends { chunkId: string }>(
  resultSets: T[][],
  k: number = 60
): Array<T & { rrfScore: number }> {
  // ...merge logic...
}
```

### 2.2 Smart Search Pipeline (Fast Path + Slow Path)

```
Query → Generate Embedding → Direct Vector Search
                                    ↓
                    ┌───────────────┴───────────────┐
                    │ avgScore >= 0.70?             │
                    ├───YES─────────────────────────┤
                    │ FAST PATH: Return immediately │
                    ├───NO──────────────────────────┤
                    │ SLOW PATH:                    │
                    │ 1. AI Query Rewriting         │
                    │ 2. Re-search với rewritten    │
                    │ 3. Merge & deduplicate        │
                    └───────────────────────────────┘
```

---

## 3. 📦 EMBEDDING VÀ LƯU TRỮ

### 3.1 Embedding Generation
- **Model**: `gemini-embedding-001`
- **Dimensions**: 768
- **Storage**: Firebase Cloud Storage (`rag/indices/vector-index.json`)

### 3.2 Index Structure
```typescript
interface VectorIndex {
  version: string;          // "1.1.{timestamp}"
  createdAt: number;
  totalChunks: number;
  chunks: VectorChunk[];
  sources: Record<string, number>;  // quizId → chunk count
}

interface VectorChunk {
  chunkId: string;          // "quiz_{quizId}_meta" hoặc "quiz_{quizId}_q{n}"
  quizId?: string;
  text: string;
  title: string;
  embedding: number[];      // 768-dim vector
  metadata?: {
    title: string;
    summary?: string;
    category?: string;
    difficulty?: string;
    tags?: string[];
  };
}
```

### 3.3 Orama In-Memory Database
- Khởi tạo từ JSON index khi Cold Start
- **Cache TTL**: 5 phút
- **Schema**:
```typescript
const oramaSchema = {
  chunkId: 'string',
  quizId: 'string',
  title: 'string',
  text: 'string',
  summary: 'string',
  category: 'string',
  difficulty: 'string',
  tags: 'string[]',
  embedding: 'vector[768]',
};
```

---

## 4. 📈 RANKING/RE-RANKING LOGIC

### 4.1 Confidence Levels

```typescript
export const RELEVANCE_THRESHOLDS = {
  HIGH: 0.70,      // Tin cậy cao
  MEDIUM: 0.55,    // Tin cậy trung bình
  LOW: 0.40,       // Tin cậy thấp, hiện warning
  MINIMUM: 0.30,   // Dưới mức này → reject
};
```

### 4.2 AI Re-ranking (Cross-encoder style)
- Chỉ kích hoạt khi `avgScore < 0.70`
- Sử dụng `gemini-2.5-flash-lite`
- **Timeout**: 10 giây
- Validate indices để tránh array out of bounds

```typescript
export async function aiRerank<T extends { text: string; title: string }>(
  query: string,
  candidates: T[],
  model: GenerativeModel,
  topK: number = 4
): Promise<Array<T & { rerankScore: number }>> {
  // Prompt LLM đánh giá relevance và trả về ranking
}
```

---

## 5. 🔄 DATA FLOW - QUESTION ANSWERING

### 5.1 Main Pipeline (`askQuestion`)

```
1. CONTEXTUAL QUERY REWRITING (v4.2)
   - Nếu có history: Viết lại câu hỏi mơ hồ
   - Pattern detection: "Thế còn...", "Vậy với...", câu quá ngắn
   
2. INTENT CLASSIFICATION
   - 7 intents: quiz_search, quiz_browse, learning_path,
                fact_retrieval, general_chat, help_support, unclear
   - Confidence threshold: 0.65
   
3. ROUTE BY INTENT
   ├── help_support → Return help message
   ├── unclear (& no rewrite) → Ask clarifying question
   ├── quiz_browse → Fetch popular quizzes
   ├── learning_path → Planner Agent flow
   ├── general_chat → Direct LLM response
   └── quiz_search/fact_retrieval → Standard search

4. STANDARD SEARCH FLOW
   a. Hybrid Search (Vector + Keyword + RRF)
   b. Categorize by confidence
   c. Optional AI Re-ranking
   d. Generate answer with context
   e. Fetch quiz details from Firestore
   
5. RETURN RESPONSE
   - answer, citations, quizRecommendations
   - searchMetrics (for debugging/tuning)
```

### 5.2 Learning Path Flow

```
Topic → Planner Agent → Generate Skeleton (3-10 steps)
                              ↓
            multiHopRetrieval (parallel search per step)
                              ↓
            Synthesizer Agent → Natural language response
                              ↓
            Return: answer + quizRecommendations + plan
```

---

## 6. 🔄 AUTO-UPDATE INDEX KHI CÓ QUIZ MỚI

### 6.1 Firestore Trigger (`autoTagOnApproval`)

```typescript
// Trigger: quizzes/{quizId} onWrite

CASE 1: Quiz bị XÓA
  → removeQuizFromIndex(quizId)

CASE 2: Quiz bị HỦY DUYỆT (approved → pending/rejected)
  → removeQuizFromIndex(quizId)

CASE 3: Quiz được DUYỆT MỚI
  → generateTagsWithAI(quizData)  // Gemini tạo 5-10 tags
  → Update quiz document với autoTags
  → addQuizToIndex(quizId, quizData, allTags)
  → invalidateGlobalCache() + invalidateOramaCache()
```

### 6.2 Index Update Flow

```
Quiz Approved → Generate Tags (AI)
                    ↓
            Create meta chunk: "quiz_{id}_meta"
            Create question chunks: "quiz_{id}_q1", "quiz_{id}_q2", ...
                    ↓
            Generate embedding for each chunk
                    ↓
            Append to index.chunks[]
                    ↓
            Save to Cloud Storage
                    ↓
            Invalidate caches (JSON + Orama)
```

---

## 7. ⚙️ CÁC THAM SỐ QUAN TRỌNG

| Parameter | Default | Env Variable | Ý nghĩa |
|-----------|---------|--------------|---------|
| `HIGH_CONFIDENCE_THRESHOLD` | 0.70 | `RAG_HIGH_CONFIDENCE` | Score tối thiểu để skip AI rewriting |
| `MINIMUM_SCORE` | 0.40 | `RAG_MIN_SCORE` | Score tối thiểu của kết quả hợp lệ |
| `TOP_K_RESULTS` | 10 | `RAG_TOP_K` | Số kết quả vector search |
| `MAX_QUIZ_RECOMMENDATIONS` | 5 | `RAG_MAX_QUIZZES` | Số quiz recommendations cuối cùng |
| `ENABLE_AI_RERANK` | true | `RAG_AI_RERANK` | Bật/tắt AI reranking |
| `INTENT_CONFIDENCE_THRESHOLD` | 0.65 | - | Ngưỡng confidence cho intent |
| `CACHE_TTL` | 5 phút | - | Cache TTL cho index |
| `REWRITE_TIMEOUT` | 5s | - | Timeout cho query rewriting |
| `RERANK_TIMEOUT` | 10s | - | Timeout cho AI reranking |

---

## 8. ✅ ƯU ĐIỂM CỦA CÁCH TIẾP CẬN

### 8.1 Performance
- **Warm Instance Caching**: Index được cache trong RAM giữa các lần gọi
- **Fast Path Strategy**: Skip AI rewriting khi score đủ tốt → giảm latency
- **Parallel Search**: multiHopRetrieval chạy song song cho nhiều topics
- **TopKHeap**: O(n log k) thay vì O(n log n) cho sorting

### 8.2 Accuracy
- **Hybrid Search**: Kết hợp semantic + keyword cho kết quả tốt hơn
- **Vietnamese Support**: Stop words, diacritics removal, compound words
- **AI Re-ranking**: Cross-encoder style reranking khi confidence thấp
- **Contextual Query Rewriting**: Xử lý câu hỏi mơ hồ dựa vào history

### 8.3 Reliability
- **Index Validation**: Kiểm tra integrity trước khi sử dụng (max 5% invalid)
- **Timeout Protection**: Tất cả AI calls có timeout
- **Fallback Strategies**: Graceful degradation khi component fail
- **NaN Sanitization**: Tránh crash do invalid numeric values

### 8.4 Maintainability
- **Configurable Thresholds**: Env variables cho tuning
- **Analytics Logging**: Track intent, confidence, processing time
- **Modular Architecture**: Tách riêng search, tagging, synthesis

---

## 9. ⚠️ NHƯỢC ĐIỂM VÀ RISKS

### 9.1 Scalability Issues
- **Race Condition**: Nếu 2 admin duyệt quiz cùng lúc, có thể mất data
  - *Mitigation planned*: Firestore Lock / Update Queue
- **Single JSON Index**: Toàn bộ index trong 1 file → chậm khi scale
  - *Suggestion*: Sharding theo category hoặc dùng vector database

### 9.2 Cost Concerns
- **Multiple Gemini Calls**: Query rewriting + embedding + reranking + generation
- **Cold Start Latency**: Download index từ Storage (1-2s)

### 9.3 Accuracy Limitations
- **Vietnamese BM25**: Orama không native support Vietnamese tokenization
  - *Workaround*: Compound word mapping, n-grams
- **Threshold Tuning**: Các threshold (0.70, 0.55, 0.40) cần tune với production data

### 9.4 Missing Features
- **No incremental index update**: Phải rebuild toàn bộ khi có nhiều thay đổi
- **No user personalization**: Chưa có personalized recommendations
- **No feedback loop**: Không học từ user interactions

---

## 10. 📐 DIAGRAM TỔNG HỢP

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RAG CHATBOT SYSTEM v4.2                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │   CLIENT    │───▶│  FIREBASE   │───▶│  CLOUD FUNCTIONS       │ │
│  │  (React)    │    │  FUNCTIONS  │    │  askQuestion()         │ │
│  └─────────────┘    └─────────────┘    └───────────┬─────────────┘ │
│                                                     │               │
│  ┌──────────────────────────────────────────────────┴─────────────┐│
│  │                    PROCESSING PIPELINE                         ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ ││
│  │  │   Query      │  │   Router     │  │  Intent Handlers     │ ││
│  │  │   Rewriter   │─▶│   Agent      │─▶│  - Learning Path     │ ││
│  │  │   (Gemini)   │  │   (Gemini)   │  │  - Quiz Search       │ ││
│  │  └──────────────┘  └──────────────┘  │  - Chat/Help         │ ││
│  │                                       └──────────┬───────────┘ ││
│  └──────────────────────────────────────────────────┼─────────────┘│
│                                                     │               │
│  ┌──────────────────────────────────────────────────┴─────────────┐│
│  │                      SEARCH ENGINE                             ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ ││
│  │  │   Embedding  │  │   Orama DB   │  │   Hybrid Search      │ ││
│  │  │   (Gemini)   │─▶│   (Vector +  │─▶│   (RRF Fusion)       │ ││
│  │  │              │  │    BM25)     │  │   + AI Rerank        │ ││
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                      DATA LAYER                                ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ ││
│  │  │  Cloud       │  │  Firestore   │  │   Auto-Tagging       │ ││
│  │  │  Storage     │◀─│  Triggers    │◀─│   (On Quiz Approve)  │ ││
│  │  │  (Index)     │  │              │  │                      │ ││
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 11. 📝 RECOMMENDATIONS

### Short-term
- Enable `RAG_DEBUG=true` trong 1 tuần để thu thập data tuning thresholds
- Monitor AI call latency và costs

### Medium-term
- Implement Firestore Lock để tránh race condition
- Add caching layer cho quiz details (Redis/Memcached)

### Long-term
- Migrate sang dedicated vector database (Pinecone, Qdrant, Weaviate)
- Implement user feedback loop để improve ranking
- Add A/B testing framework cho threshold tuning

---

## 12. AI MODELS ĐANG SỬ DỤNG

| Purpose | Model | Notes |
|---------|-------|-------|
| Chat/Generation | `gemini-2.5-flash-lite` | Fast, cost-effective |
| Embedding | `gemini-embedding-001` | 768 dimensions |
| Intent Classification | `gemini-2.5-flash-lite` | JSON output mode |
| Query Rewriting | `gemini-2.5-flash-lite` | 5s timeout |
| AI Reranking | `gemini-2.5-flash-lite` | 10s timeout |
| Tag Generation | `gemini-2.5-flash-lite` | Auto-tagging |

---

*Báo cáo này được tạo tự động dựa trên phân tích mã nguồn.*
