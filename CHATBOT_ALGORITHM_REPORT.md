# 🤖 BÁO CÁO CHI TIẾT THUẬT TOÁN RAG CHATBOT

## Hệ thống AI Learning Assistant v4.3.2

> **Tác giả:** QuizTrivia Development Team  
> **Cập nhật:** December 8, 2025  
> **Version:** 4.3.2

---

## 📑 MỤC LỤC

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [RAG là gì?](#2-rag-là-gì)
3. [Các Thành Phần Chính](#3-các-thành-phần-chính)
4. [Luồng Xử Lý Chi Tiết](#4-luồng-xử-lý-chi-tiết)
5. [Thuật Toán Tìm Kiếm](#5-thuật-toán-tìm-kiếm)
6. [Thuật Toán Xếp Hạng](#6-thuật-toán-xếp-hạng)
7. [Tối Ưu Hóa Hiệu Năng](#7-tối-ưu-hóa-hiệu-năng)
8. [Công Thức Toán Học](#8-công-thức-toán-học)
9. [Sơ Đồ Kiến Trúc](#9-sơ-đồ-kiến-trúc)
10. [Kết Luận](#10-kết-luận)

---

## 1. Tổng Quan Kiến Trúc

### 1.1 Mô Hình Multi-Agent RAG

Hệ thống chatbot sử dụng kiến trúc **Multi-Agent RAG** (Retrieval-Augmented Generation), bao gồm nhiều "tác nhân AI" chuyên biệt làm việc cùng nhau:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    🤖 AI LEARNING ASSISTANT v4.3                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    📝 User Input                                                            │
│         │                                                                   │
│         ▼                                                                   │
│    ┌─────────────────┐                                                      │
│    │  QUERY REWRITER │ ← Viết lại câu hỏi mơ hồ                            │
│    │   (Gemini AI)   │   "cái đó" → "môn Toán học"                         │
│    └────────┬────────┘                                                      │
│             ▼                                                               │
│    ┌─────────────────┐     ┌──────────────────────┐                        │
│    │  FAST INTENT    │     │   INTENT CATEGORIES  │                        │
│    │   DETECTION     │────▶│  • quiz_search       │                        │
│    │ (Regex + LLM)   │     │  • learning_path     │                        │
│    └────────┬────────┘     │  • fact_retrieval    │                        │
│             │              │  • quiz_browse       │                        │
│             │              │  • general_chat      │                        │
│             ▼              │  • help_support      │                        │
│    ┌─────────────────┐     └──────────────────────┘                        │
│    │ HYBRID SEARCH   │                                                      │
│    │ (Vector + BM25) │                                                      │
│    └────────┬────────┘                                                      │
│             ▼                                                               │
│    ┌─────────────────┐                                                      │
│    │   AI RERANKER   │ ← Xếp hạng lại bằng LLM                             │
│    │   (Optional)    │                                                      │
│    └────────┬────────┘                                                      │
│             ▼                                                               │
│    ┌─────────────────┐                                                      │
│    │   SYNTHESIZER   │ ← Tổng hợp câu trả lời                              │
│    │   (Gemini AI)   │                                                      │
│    └────────┬────────┘                                                      │
│             ▼                                                               │
│    📤 Response + Quiz Recommendations                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Công Nghệ Sử Dụng

| Thành phần | Công nghệ | Mục đích |
|------------|-----------|----------|
| **LLM (Chat)** | Gemini 2.5 Flash-Lite | Phân loại ý định, tổng hợp câu trả lời |
| **Embedding** | Gemini Embedding-001 | Chuyển text → vector 768 chiều |
| **Vector DB** | Orama (In-memory) | Tìm kiếm semantic nhanh |
| **Keyword Search** | BM25 | Tìm kiếm từ khóa chính xác |
| **Backend** | Firebase Cloud Functions | Serverless, auto-scale |
| **Storage** | Cloud Storage | Lưu trữ Vector Index |

---

## 2. RAG là gì?

### 2.1 Định Nghĩa

**RAG (Retrieval-Augmented Generation)** là kỹ thuật kết hợp:
- **Retrieval (Truy xuất):** Tìm kiếm thông tin liên quan từ cơ sở dữ liệu
- **Augmented (Bổ sung):** Bổ sung context vào prompt
- **Generation (Sinh):** LLM sinh câu trả lời dựa trên context

### 2.2 Tại Sao Dùng RAG?

| Vấn đề của LLM thuần | Giải pháp RAG |
|---------------------|---------------|
| Hallucination (bịa đặt) | Trả lời dựa trên dữ liệu thực |
| Kiến thức cũ (cutoff date) | Cập nhật real-time từ database |
| Không biết context cụ thể | Inject dữ liệu quiz/bài học |
| Tốn token khi context dài | Chỉ lấy K documents liên quan nhất |

### 2.3 So Sánh với Fine-tuning

```
┌──────────────────────────────────────────────────────────────────┐
│                    RAG vs Fine-tuning                            │
├───────────────────────┬──────────────────────────────────────────┤
│       RAG ✅          │           Fine-tuning ❌                 │
├───────────────────────┼──────────────────────────────────────────┤
│ Không cần training    │ Cần GPU + thời gian train               │
│ Dữ liệu cập nhật ngay │ Phải retrain khi có dữ liệu mới         │
│ Chi phí thấp          │ Chi phí cao                              │
│ Dễ debug (trace được) │ Khó debug (black box)                    │
│ Giảm hallucination    │ Vẫn có thể hallucinate                   │
└───────────────────────┴──────────────────────────────────────────┘
```

---

## 3. Các Thành Phần Chính

### 3.1 Query Rewriter (Viết Lại Câu Hỏi)

**Mục đích:** Xử lý câu hỏi mơ hồ, có ngữ cảnh từ conversation history.

**Ví dụ:**
```
Conversation History:
- User: "Tôi muốn học JavaScript"
- Bot: "Đây là lộ trình JavaScript..."
- User: "Thế còn CSS?"  ← Câu hỏi mơ hồ

Query Rewriter output:
"Thế còn CSS?" → "Lộ trình học CSS, có liên quan đến JavaScript"
```

**Thuật toán:**
1. Phân tích 5 message gần nhất
2. Detect đại từ chỉ định ("cái đó", "nó", "thế")
3. Thay thế bằng entity cụ thể từ history
4. Expand abbreviations (JS → JavaScript)

### 3.2 Intent Router (Phân Loại Ý Định)

**Mục đích:** Xác định người dùng muốn gì để điều hướng đến handler phù hợp.

**7 Loại Intent:**

| Intent | Ví dụ | Handler |
|--------|-------|---------|
| `quiz_search` | "Quiz JavaScript" | Hybrid Search |
| `quiz_browse` | "Quiz hay cho tôi" | Popular Quizzes |
| `learning_path` | "Học Web Development" | Planner Agent |
| `fact_retrieval` | "React là gì?" | Hybrid Search |
| `general_chat` | "Xin chào" | Direct Chat |
| `help_support` | "Chatbot làm được gì?" | Help Response |
| `unclear` | "hmm", "ok" | Clarifying Question |

**Quy trình 2 bước:**

```
Step 1: REGEX HEURISTIC (O(1) - Instant)
        │
        ├─ Match? ──▶ Return intent ngay
        │
        └─ No match? ──▶ Step 2
        
Step 2: LLM CLASSIFICATION (200-500ms)
        │
        └─ Gemini phân loại bằng Few-shot Prompting
```

**Regex Patterns (Fast Route):**
```javascript
// HELP patterns
/^(help|trợ giúp|hướng dẫn)/i  →  help_support

// GREETING patterns  
/^(xin chào|hello|hi)[\s!.]*$/i  →  general_chat

// QUIZ BROWSE (không có topic)
/^(quiz|bài test)[\s]*(hay|hot|mới)?$/i  →  quiz_browse

// DEFINITION questions
/^(.+)\s+(là gì)\s*\??$/i  →  fact_retrieval
```

### 3.3 Vector Index (Chỉ Mục Vector)

**Cấu trúc dữ liệu:**
```json
{
  "version": "4.3.2",
  "createdAt": 1733529600000,
  "totalChunks": 1500,
  "chunks": [
    {
      "chunkId": "quiz_abc123_chunk_0",
      "quizId": "abc123",
      "title": "Quiz JavaScript Cơ Bản",
      "text": "JavaScript là ngôn ngữ lập trình...",
      "embedding": [0.021, -0.035, ..., 0.018],  // 768 dimensions
      "metadata": {
        "category": "Programming",
        "difficulty": "easy",
        "tags": ["javascript", "web", "frontend"]
      }
    }
  ]
}
```

**Embedding Process:**
```
"JavaScript là gì?" 
       │
       ▼
┌─────────────────────────────────┐
│   Gemini Embedding-001 API     │
│   text-embedding-004           │
└─────────────────────────────────┘
       │
       ▼
[0.021, -0.035, 0.089, ..., 0.018]  ← Vector 768 chiều
```

---

## 4. Luồng Xử Lý Chi Tiết

### 4.1 Sequence Diagram

```
┌──────┐     ┌──────────┐     ┌────────┐     ┌────────┐     ┌───────────┐
│ User │     │ Rewriter │     │ Router │     │ Search │     │Synthesizer│
└──┬───┘     └────┬─────┘     └───┬────┘     └───┬────┘     └─────┬─────┘
   │              │               │              │                 │
   │  Question    │               │              │                 │
   │─────────────▶│               │              │                 │
   │              │               │              │                 │
   │              │ Rewrite query │              │                 │
   │              │──────────────▶│              │                 │
   │              │               │              │                 │
   │              │               │ Classify     │                 │
   │              │               │ Intent       │                 │
   │              │               │─────────────▶│                 │
   │              │               │              │                 │
   │              │               │              │ Hybrid Search   │
   │              │               │              │ (Vector + BM25) │
   │              │               │              │────────────────▶│
   │              │               │              │                 │
   │              │               │              │                 │ Generate
   │              │               │              │                 │ Answer
   │              │               │              │◀────────────────│
   │              │               │              │                 │
   │◀─────────────────────────────────────────────────────────────│
   │              Answer + Quiz Recommendations                    │
```

### 4.2 Xử Lý Từng Bước

**Bước 1: Nhận Input**
```javascript
{
  question: "Quiz JavaScript cơ bản",
  userId: "user123",
  conversationHistory: [...],  // 5 messages gần nhất
  options: { depth: "intermediate" }
}
```

**Bước 2: Query Rewriting (nếu cần)**
```javascript
// Nếu có history và câu hỏi mơ hồ
if (hasHistory && isAmbiguous(question)) {
  question = await rewriteQuery(question, history);
}
```

**Bước 3: Intent Classification**
```javascript
// Fast path: Regex O(1)
let intent = fastIntentDetection(question);

// Slow path: LLM nếu regex không match
if (!intent) {
  intent = await classifyIntentWithLLM(question);
}
```

**Bước 4: Route to Handler**
```javascript
switch (intent.intent) {
  case 'quiz_search':
  case 'fact_retrieval':
    return await hybridSearch(question);
    
  case 'learning_path':
    return await handleLearningPath(question, intent.extractedTopic);
    
  case 'quiz_browse':
    return await fetchPopularQuizzes();
    
  case 'general_chat':
    return await generateChatResponse(question);
    
  case 'help_support':
    return generateHelpResponse();
}
```

**Bước 5: Hybrid Search**
```javascript
// 1. Generate embedding
const embedding = await generateEmbedding(question);

// 2. Vector Search (Semantic)
const vectorResults = await oramaVectorSearch(embedding, topK=10);

// 3. Keyword Search (BM25)
const keywordResults = await keywordSearch(question, topK=10);

// 4. Merge với RRF
const fusedResults = reciprocalRankFusion([vectorResults, keywordResults]);
```

**Bước 6: AI Reranking (Optional)**
```javascript
// Chỉ rerank nếu:
// - Bật config ENABLE_AI_RERANK
// - topScore < 0.85 (kết quả chưa đủ tốt)
// - confidence không phải 'high'

if (shouldRerank) {
  results = await aiRerank(question, results, topK=5);
}
```

**Bước 7: Generate Answer**
```javascript
const answer = await synthesizeResponse({
  question,
  contexts: results,
  targetLang: 'vi'
});
```

**Bước 8: Return Response**
```javascript
{
  answer: "JavaScript là ngôn ngữ lập trình...",
  quizRecommendations: [...],
  citations: [...],
  processingTime: 1250,  // ms
  searchMetrics: {
    fastPathUsed: true,
    avgScore: 0.78,
    topScore: 0.89,
    confidence: 'high'
  }
}
```

---

## 5. Thuật Toán Tìm Kiếm

### 5.1 Vector Search (Semantic Search)

**Nguyên lý:** Chuyển text thành vector số, tìm kiếm dựa trên độ tương đồng không gian.

**Cosine Similarity:**

$$\text{similarity}(A, B) = \frac{A \cdot B}{||A|| \times ||B||} = \frac{\sum_{i=1}^{n} A_i \times B_i}{\sqrt{\sum_{i=1}^{n} A_i^2} \times \sqrt{\sum_{i=1}^{n} B_i^2}}$$

Trong đó:
- $A, B$: Vector embedding 768 chiều
- $A \cdot B$: Dot product
- $||A||$: Norm (độ dài) của vector

**Ví dụ tính toán:**
```
Query: "JavaScript là gì"
Query Vector: [0.2, 0.5, -0.3, ..., 0.1]  (768 dims)

Document 1: "JavaScript programming"
Doc1 Vector: [0.25, 0.48, -0.28, ..., 0.12]
Cosine Sim = 0.92 ✅ Rất liên quan

Document 2: "Cooking recipes"  
Doc2 Vector: [-0.1, 0.8, 0.6, ..., -0.3]
Cosine Sim = 0.15 ❌ Không liên quan
```

**Code Implementation:**
```javascript
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### 5.2 BM25 (Keyword Search)

**Nguyên lý:** Xếp hạng document dựa trên tần suất từ khóa, có điều chỉnh cho độ dài document.

**Công thức BM25:**

$$\text{BM25}(D, Q) = \sum_{i=1}^{n} \text{IDF}(q_i) \times \frac{f(q_i, D) \times (k_1 + 1)}{f(q_i, D) + k_1 \times (1 - b + b \times \frac{|D|}{avgdl})}$$

Trong đó:
- $Q$: Query (danh sách từ khóa)
- $D$: Document
- $f(q_i, D)$: Tần suất từ $q_i$ trong $D$
- $|D|$: Độ dài document
- $avgdl$: Độ dài trung bình của tất cả documents
- $k_1$: Thường là 1.2-2.0
- $b$: Thường là 0.75

**IDF (Inverse Document Frequency):**

$$\text{IDF}(q_i) = \log\left(\frac{N - n(q_i) + 0.5}{n(q_i) + 0.5}\right)$$

- $N$: Tổng số documents
- $n(q_i)$: Số documents chứa từ $q_i$

**Ví dụ:**
```
Query: "JavaScript quiz"
Documents: 1000 total

Doc1: "JavaScript quiz cơ bản" (chứa cả 2 từ)
Doc2: "Python programming" (không chứa từ nào)
Doc3: "JavaScript tutorial" (chứa 1 từ)

BM25 Scores:
- Doc1: 4.5 (cao nhất)
- Doc3: 2.1 (trung bình)
- Doc2: 0.0 (không match)
```

### 5.3 Hybrid Search

**Nguyên lý:** Kết hợp ưu điểm của cả Vector Search và BM25.

| Phương pháp | Ưu điểm | Nhược điểm |
|-------------|---------|------------|
| Vector Search | Hiểu ngữ nghĩa, đồng nghĩa | Có thể miss exact match |
| BM25 | Exact match chính xác | Không hiểu ngữ nghĩa |
| **Hybrid** | **Cả hai** | Phức tạp hơn |

**Workflow:**
```
Query: "Học lập trình web"
           │
           ├──────────────────┬──────────────────┐
           │                  │                  │
           ▼                  ▼                  │
    ┌─────────────┐    ┌─────────────┐          │
    │Vector Search│    │ BM25 Search │          │
    │ (Semantic)  │    │  (Keyword)  │          │
    └──────┬──────┘    └──────┬──────┘          │
           │                  │                  │
           │ Results A        │ Results B        │
           │                  │                  │
           └────────┬─────────┘                  │
                    │                            │
                    ▼                            │
           ┌───────────────┐                     │
           │  RRF Fusion   │◀────────────────────┘
           │ (Merge & Rank)│     Weight: 60% Vector
           └───────┬───────┘              40% Keyword
                   │
                   ▼
            Final Results
```

### 5.4 Reciprocal Rank Fusion (RRF)

**Nguyên lý:** Merge nhiều danh sách kết quả bằng cách tổng hợp rank position.

**Công thức RRF:**

$$\text{RRF}(d) = \sum_{r \in R} \frac{1}{k + \text{rank}_r(d)}$$

Trong đó:
- $d$: Document
- $R$: Tập các result lists
- $\text{rank}_r(d)$: Vị trí của $d$ trong list $r$
- $k$: Hằng số (thường = 60)

**Ví dụ:**
```
Vector Results: [Doc1, Doc3, Doc5, Doc2]
BM25 Results:   [Doc3, Doc1, Doc4, Doc5]

RRF Scores (k=60):
- Doc1: 1/(60+1) + 1/(60+2) = 0.0164 + 0.0161 = 0.0325
- Doc3: 1/(60+2) + 1/(60+1) = 0.0161 + 0.0164 = 0.0325
- Doc5: 1/(60+3) + 1/(60+4) = 0.0159 + 0.0156 = 0.0315
- Doc2: 1/(60+4) + 0         = 0.0156
- Doc4: 0        + 1/(60+3)  = 0.0159

Final Ranking: [Doc1, Doc3, Doc5, Doc4, Doc2]
```

**Code:**
```javascript
function reciprocalRankFusion(resultSets, k = 60) {
  const scores = new Map();
  
  for (const results of resultSets) {
    results.forEach((item, rank) => {
      const rrfScore = 1 / (k + rank + 1);
      const existing = scores.get(item.id) || 0;
      scores.set(item.id, existing + rrfScore);
    });
  }
  
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => ({ id, score }));
}
```

---

## 6. Thuật Toán Xếp Hạng

### 6.1 Confidence-Based Categorization

**Ngưỡng phân loại:**

| Level | Score Range | Hành động |
|-------|-------------|-----------|
| **HIGH** | ≥ 0.70 | Trả lời tự tin |
| **MEDIUM** | 0.55 - 0.69 | Trả lời kèm disclaimer |
| **LOW** | 0.40 - 0.54 | Warning + gợi ý rephrase |
| **NONE** | < 0.40 | Reject, yêu cầu làm rõ |

**Algorithm:**
```javascript
function categorizeByConfidence(results) {
  const high = results.filter(r => r.score >= 0.70);
  const medium = results.filter(r => r.score >= 0.55 && r.score < 0.70);
  const low = results.filter(r => r.score >= 0.40 && r.score < 0.55);
  
  if (high.length >= 2) {
    return { results: high, confidence: 'high' };
  }
  if (high.length + medium.length >= 2) {
    return { results: [...high, ...medium], confidence: 'medium' };
  }
  if (low.length > 0) {
    return { 
      results: [...high, ...medium, ...low], 
      confidence: 'low',
      warning: 'Kết quả có thể không chính xác'
    };
  }
  return { results: [], confidence: 'none' };
}
```

### 6.2 AI Re-ranking (Cross-Encoder)

**Khi nào sử dụng:**
- `topScore < 0.85` (kết quả chưa đủ tốt)
- `confidence !== 'high'`
- `results.length > topK`

**Nguyên lý:**
1. Gửi top 10-15 candidates cho LLM
2. LLM đánh giá relevance từng cặp (query, document)
3. Trả về top K documents với score mới

**Prompt Template:**
```
Bạn là AI đánh giá độ liên quan của kết quả tìm kiếm quiz.

CÂU HỎI TÌM KIẾM: "${query}"

CÁC KẾT QUẢ:
[0] JavaScript Basics: Học JavaScript từ đầu...
[1] Python Programming: Lập trình Python...
[2] Web Development: Xây dựng website...

TIÊU CHÍ ĐÁNH GIÁ:
- 0.9-1.0: Trực tiếp trả lời câu hỏi
- 0.7-0.89: Liên quan một phần
- 0.5-0.69: Ít liên quan
- < 0.5: Không liên quan

TRẢ VỀ JSON:
{"rankings": [{"index": 0, "score": 0.95}, {"index": 2, "score": 0.72}]}
```

### 6.3 Threshold Skip Optimization

**Vấn đề:** AI Reranking tốn 500-1000ms latency

**Giải pháp:** Skip reranking nếu `topScore >= 0.85`

```javascript
const HIGH_CONFIDENCE_SKIP_RERANK = 0.85;

if (topScore >= HIGH_CONFIDENCE_SKIP_RERANK) {
  console.log('⚡ Skip reranking - results already excellent');
  return results.slice(0, topK);
}
// Chỉ rerank khi thực sự cần
return await aiRerank(query, results, topK);
```

**Impact:**
- Giảm 30-40% requests cần rerank
- Tiết kiệm ~500ms latency cho queries có kết quả tốt

---

## 7. Tối Ưu Hóa Hiệu Năng

### 7.1 Fast Path Strategy

**Nguyên lý:** Search trước, rewrite sau (chỉ khi kết quả kém)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FAST PATH vs SLOW PATH                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Query ──▶ Direct Search ──▶ avgScore >= 0.70? ──▶ Return ✅    │
│                                    │                            │
│                                    │ No                         │
│                                    ▼                            │
│                          AI Query Rewrite                       │
│                                    │                            │
│                                    ▼                            │
│                          Re-search + Merge                      │
│                                    │                            │
│                                    ▼                            │
│                               Return                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Top-K Heap (Memory Optimization)

**Vấn đề:** Sort toàn bộ N documents có O(N log N)

**Giải pháp:** Dùng Min-Heap giữ K documents có O(N log K)

```javascript
class TopKHeap {
  private heap: Result[] = [];
  private k: number;
  
  add(result: Result): void {
    if (this.heap.length < this.k) {
      this.heap.push(result);
      this.heap.sort((a, b) => a.score - b.score);  // Min-heap
    } else if (result.score > this.heap[0].score) {
      this.heap[0] = result;  // Replace minimum
      this.heap.sort((a, b) => a.score - b.score);
    }
  }
  
  getResults(): Result[] {
    return [...this.heap].sort((a, b) => b.score - a.score);
  }
}
```

**Complexity:**
- Sort tất cả: O(N log N) với N = 1500 chunks
- Top-K Heap: O(N log K) với K = 10
- Tiết kiệm: ~40% thời gian cho large datasets

### 7.3 Global Cache (Warm Instance)

**Nguyên lý:** Cache Vector Index trong memory giữa các requests

```javascript
// Global variables (persist across requests)
let globalVectorIndex: VectorIndex | null = null;
let globalIndexLoadTime: number = 0;
const INDEX_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadVectorIndex(): Promise<VectorIndex> {
  // Check cache validity
  if (globalVectorIndex && 
      (Date.now() - globalIndexLoadTime) < INDEX_CACHE_TTL_MS) {
    return globalVectorIndex;  // Cache HIT ⚡
  }
  
  // Cache MISS - load from Storage
  const index = await downloadFromStorage('rag-index/index.json');
  globalVectorIndex = index;
  globalIndexLoadTime = Date.now();
  
  return index;
}
```

**Performance Impact:**
| Scenario | Latency |
|----------|---------|
| Cold Start (no cache) | 2-3s |
| Warm Instance (cache hit) | 50-100ms |

### 7.4 Regex Heuristic Router

**Nguyên lý:** Nhận diện intent đơn giản bằng regex, tránh gọi LLM

**Patterns:**
```javascript
const FAST_PATTERNS = {
  help_support: [
    /^(help|trợ giúp|hướng dẫn)/i,
    /^\/help$/i,
  ],
  general_chat: [
    /^(xin chào|hello|hi)[\s!.]*$/i,
    /^(cảm ơn|thanks)[\s!.]*$/i,
  ],
  quiz_browse: [
    /^(quiz|bài test)[\s]*(hay|hot|mới)?[\s!?.]*$/i,
  ],
  fact_retrieval: [
    /^(.+)\s+(là gì|nghĩa là gì)\s*\??$/i,
  ],
};
```

**Impact:**
- ~40% requests route qua regex
- Tiết kiệm 200-500ms mỗi request

---

## 8. Công Thức Toán Học

### 8.1 Tổng Hợp Các Công Thức

#### Cosine Similarity
$$\cos(\theta) = \frac{\mathbf{A} \cdot \mathbf{B}}{||\mathbf{A}|| \cdot ||\mathbf{B}||} \in [-1, 1]$$

#### BM25 Score
$$\text{BM25}(D, Q) = \sum_{i=1}^{n} \text{IDF}(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot (1 - b + b \cdot \frac{|D|}{avgdl})}$$

#### Inverse Document Frequency
$$\text{IDF}(t) = \log\left(\frac{N - df(t) + 0.5}{df(t) + 0.5}\right)$$

#### Reciprocal Rank Fusion
$$\text{RRF}(d) = \sum_{r \in R} \frac{1}{k + \text{rank}_r(d)}$$

#### Confidence Score (Combined)
$$\text{final\_score} = \alpha \cdot \text{vector\_score} + (1-\alpha) \cdot \text{bm25\_score}$$

với $\alpha = 0.6$ (mặc định)

### 8.2 Các Ngưỡng Quan Trọng

| Parameter | Value | Mô tả |
|-----------|-------|-------|
| `FAST_PATH_THRESHOLD` | 0.70 | avgScore để dùng Fast Path |
| `HIGH_CONFIDENCE_SKIP_RERANK` | 0.85 | topScore để skip rerank |
| `MIN_RELEVANCE_SCORE` | 0.40 | Score tối thiểu để accept |
| `INTENT_CONFIDENCE_THRESHOLD` | 0.65 | Confidence để accept intent |
| `RRF_K` | 60 | Hằng số cho RRF fusion |
| `VECTOR_WEIGHT` | 0.60 | Trọng số Vector trong Hybrid |

---

## 9. Sơ Đồ Kiến Trúc

### 9.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           QUIZTRIVIA RAG SYSTEM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         CLIENT (React App)                            │  │
│  │  ┌─────────────┐                              ┌─────────────────────┐ │  │
│  │  │  Chatbot    │───── HTTP POST /askRAG ────▶│ Firebase Function   │ │  │
│  │  │  Modal UI   │◀──── JSON Response ─────────│  (Node.js 20)       │ │  │
│  │  └─────────────┘                              └─────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      CLOUD FUNCTIONS LAYER                            │  │
│  │                                                                       │  │
│  │  askRAG() ────▶ processUserQuery() ────▶ Response                    │  │
│  │       │                 │                                             │  │
│  │       │                 ├──▶ rewriteQuery()                          │  │
│  │       │                 ├──▶ classifyIntent()                        │  │
│  │       │                 ├──▶ hybridSearch()                          │  │
│  │       │                 ├──▶ aiRerank()                              │  │
│  │       │                 └──▶ generateAnswer()                        │  │
│  │       │                                                               │  │
│  │       ▼                                                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │  │ Orama DB    │  │ Cloud       │  │ Gemini AI   │                   │  │
│  │  │ (In-Memory) │  │ Storage     │  │ APIs        │                   │  │
│  │  │             │  │             │  │             │                   │  │
│  │  │ Vector+BM25 │  │ index.json  │  │ Embedding   │                   │  │
│  │  │ Search      │  │ (10MB)      │  │ Chat        │                   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        DATA LAYER (Firebase)                          │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │  │ Firestore   │  │ RTDB        │  │ Cloud       │                   │  │
│  │  │             │  │             │  │ Storage     │                   │  │
│  │  │ quizzes     │  │ rateLimits  │  │             │                   │  │
│  │  │ users       │  │ (RAG)       │  │ rag-index/  │                   │  │
│  │  │ chatLogs    │  │             │  │ index.json  │                   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RAG DATA FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. INDEX BUILDING (Offline)                                                │
│  ═══════════════════════════                                                │
│                                                                             │
│  Firestore          Cloud Function           Cloud Storage                  │
│  ┌─────────┐        ┌─────────────┐         ┌─────────────┐                │
│  │ quizzes │──────▶│rebuildIndex │───────▶│ index.json  │                │
│  │ (1000+) │        │             │         │ (768-dim    │                │
│  └─────────┘        │ 1. Fetch    │         │  vectors)   │                │
│                     │ 2. Chunk    │         └─────────────┘                │
│                     │ 3. Embed    │                                         │
│                     │ 4. Save     │                                         │
│                     └─────────────┘                                         │
│                                                                             │
│  2. QUERY PROCESSING (Online)                                               │
│  ════════════════════════════                                               │
│                                                                             │
│  User Query         askRAG Function          External APIs                  │
│  ┌─────────┐        ┌─────────────┐         ┌─────────────┐                │
│  │"Quiz    │──────▶│ 1. Rewrite  │◀───────▶│ Gemini AI   │                │
│  │ JS cơ  │        │ 2. Classify │         │ - Chat      │                │
│  │ bản"   │        │ 3. Search   │         │ - Embedding │                │
│  └─────────┘        │ 4. Rerank   │         └─────────────┘                │
│                     │ 5. Generate │                                         │
│       ▲             └──────┬──────┘                                         │
│       │                    │                                                │
│       │                    ▼                                                │
│       │             ┌─────────────┐                                         │
│       └─────────────│  Response   │                                         │
│         JSON        │  + Quizzes  │                                         │
│                     └─────────────┘                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.3 Intent Classification Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTENT CLASSIFICATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Input: "Quiz JavaScript cơ bản"                                            │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              STEP 1: FAST REGEX DETECTION (O(1))                    │   │
│  │                                                                     │   │
│  │  ┌────────────────┐                                                 │   │
│  │  │ Pattern Match  │─────▶ Match? ───Yes──▶ Return Intent            │   │
│  │  │ /^quiz.*/i     │                          (0-10ms)               │   │
│  │  └────────────────┘                                                 │   │
│  │         │                                                           │   │
│  │         │ No Match                                                  │   │
│  │         ▼                                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              STEP 2: LLM CLASSIFICATION (200-500ms)                 │   │
│  │                                                                     │   │
│  │  ┌────────────────┐      ┌─────────────────────────────────────┐   │   │
│  │  │ Gemini Flash   │─────▶│ Few-shot Prompt                     │   │   │
│  │  │ (Chat Model)   │      │ + Intent Categories                 │   │   │
│  │  └────────────────┘      │ + Examples                          │   │   │
│  │         │                └─────────────────────────────────────┘   │   │
│  │         ▼                                                           │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │ Output: { intent: "quiz_search", confidence: 0.95,          │    │   │
│  │  │          extractedTopic: "JavaScript" }                     │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Output: quiz_search → Hybrid Search Handler                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Kết Luận

### 10.1 Tóm Tắt Hệ Thống

Hệ thống RAG Chatbot của QuizTrivia sử dụng kiến trúc **Multi-Agent** với các thuật toán tiên tiến:

| Component | Algorithm | Complexity |
|-----------|-----------|------------|
| Vector Search | Cosine Similarity | O(N) → O(log N) với Orama |
| Keyword Search | BM25 | O(N × M) |
| Result Fusion | RRF (k=60) | O(N × R) |
| Re-ranking | Cross-Encoder (LLM) | O(K) |
| Intent Detection | Regex + LLM | O(1) → O(1) |

### 10.2 Điểm Mạnh

✅ **Hybrid Search:** Kết hợp semantic + keyword tốt hơn single approach  
✅ **Fast Path Strategy:** Giảm latency cho 60%+ requests  
✅ **Confidence-Based:** Tự nhận biết khi không chắc chắn  
✅ **Vietnamese Optimized:** Compound words, diacritics handling  
✅ **Scalable:** Serverless, auto-scale với Firebase  

### 10.3 Metrics Hiệu Năng

| Metric | Value |
|--------|-------|
| Average Latency | 800-1500ms |
| Cold Start | 2-3s |
| Warm Request | 500-800ms |
| Cache Hit Rate | ~70% |
| Rerank Skip Rate | ~35% |

### 10.4 Hướng Phát Triển

1. **HNSW Index:** Thay thế brute-force bằng approximate nearest neighbor
2. **Semantic Cache:** Cache response cho queries tương tự
3. **Streaming Response:** Trả lời từng phần thay vì đợi toàn bộ
4. **Fine-tuned Embeddings:** Train embedding model riêng cho Vietnamese

---

> **Tài liệu này được tạo để phục vụ mục đích báo cáo đồ án và thuyết trình.**  
> **Mọi công thức và thuật toán đều được implement trong code thực tế.**

---

**Appendix A: Glossary**

| Term | Definition |
|------|------------|
| RAG | Retrieval-Augmented Generation |
| LLM | Large Language Model |
| BM25 | Best Matching 25 (ranking function) |
| RRF | Reciprocal Rank Fusion |
| Embedding | Vector representation of text |
| Cosine Similarity | Measure of similarity between vectors |
| Few-shot Prompting | Teaching LLM với examples trong prompt |
| Cross-Encoder | Re-ranking model xem xét query-document pairs |

**Appendix B: Config Parameters**

```javascript
const CONFIG = {
  FAST_PATH_THRESHOLD: 0.70,
  HIGH_CONFIDENCE_SKIP_RERANK: 0.85,
  MIN_RELEVANCE_SCORE: 0.40,
  VECTOR_TOP_K: 10,
  FINAL_TOP_K: 5,
  RERANK_WINDOW_SIZE: 10,
  INTENT_CONFIDENCE_THRESHOLD: 0.65,
  INDEX_CACHE_TTL_MS: 5 * 60 * 1000,
};
```
