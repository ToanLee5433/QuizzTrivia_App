# HỆ THỐNG CHATBOT AI VÀ RETRIEVAL-AUGMENTED GENERATION (RAG)

## Trình bày: Kiến trúc AI Learning Assistant trong QuizTrivia-App

---

## MỤC LỤC

1. [Giới thiệu tổng quan](#1-giới-thiệu-tổng-quan)
2. [Kiến trúc hệ thống RAG](#2-kiến-trúc-hệ-thống-rag)
3. [Pipeline xử lý câu hỏi](#3-pipeline-xử-lý-câu-hỏi)
4. [Hệ thống Multi-Agent](#4-hệ-thống-multi-agent)
5. [Hybrid Search Engine](#5-hybrid-search-engine)
6. [Contextual Query Rewriting](#6-contextual-query-rewriting)
7. [Quản lý hiệu năng và tối ưu hóa](#7-quản-lý-hiệu-năng-và-tối-ưu-hóa)
8. [Giao diện người dùng](#8-giao-diện-người-dùng)
9. [Bảo mật và Rate Limiting](#9-bảo-mật-và-rate-limiting)
10. [Đánh giá và kết luận](#10-đánh-giá-và-kết-luận)

---

## 1. GIỚI THIỆU TỔNG QUAN

### 1.1. Đặt vấn đề

Kính thưa Hội đồng, trong bối cảnh ứng dụng học tập trực tuyến ngày càng phổ biến, việc hỗ trợ người dùng tìm kiếm nội dung học tập phù hợp trở thành một thách thức quan trọng. Hệ thống QuizTrivia-App với hàng trăm quiz đa dạng cần một giải pháp thông minh để:

- **Tìm kiếm ngữ nghĩa**: Hiểu được ý định thực sự của người dùng thay vì chỉ khớp từ khóa
- **Gợi ý cá nhân hóa**: Đề xuất lộ trình học tập phù hợp với nhu cầu
- **Tương tác tự nhiên**: Cho phép người dùng đặt câu hỏi bằng ngôn ngữ tự nhiên
- **Trích dẫn nguồn**: Cung cấp độ tin cậy qua việc dẫn nguồn từ nội dung quiz thực tế

### 1.2. Giải pháp: RAG Chatbot

Chúng tôi đã triển khai hệ thống **AI Learning Assistant** sử dụng kiến trúc **Retrieval-Augmented Generation (RAG)** - một phương pháp tiên tiến kết hợp:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RAG = Retrieval + Generation                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   RETRIEVAL (Truy xuất)          GENERATION (Sinh câu trả lời)  │
│   ─────────────────────          ─────────────────────────────  │
│   • Vector Search                • Google Gemini 2.5 Flash      │
│   • Keyword Search               • Context-aware prompting      │
│   • AI Re-ranking                • Citation extraction          │
│                                                                  │
│   → Tìm nội dung liên quan       → Tổng hợp câu trả lời         │
│     từ kho quiz                    dựa trên context              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3. Công nghệ sử dụng

| Thành phần | Công nghệ | Vai trò |
|------------|-----------|---------|
| **LLM** | Google Gemini 2.5 Flash Lite | Sinh câu trả lời, phân loại ý định |
| **Embedding** | gemini-embedding-001 (768-dim) | Chuyển văn bản thành vector |
| **Search Engine** | Orama DB | Hybrid search (vector + keyword) |
| **Backend** | Firebase Cloud Functions | Serverless API endpoint |
| **Storage** | Firebase Storage | Lưu trữ Vector Index |
| **Rate Limiting** | Firebase Realtime Database | Giới hạn request phân tán |

---

## 2. KIẾN TRÚC HỆ THỐNG RAG

### 2.1. Tổng quan kiến trúc v4.3

Hệ thống được thiết kế theo kiến trúc **Multi-Agent** với các tầng xử lý rõ ràng:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       🎯 AGENTIC RAG PIPELINE v4.3                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌───────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────────┐   │
│   │  User     │───▶│  ask.ts      │───▶│ optimized   │───▶│   Firebase      │   │
│   │  Input    │    │  (Entry)     │    │ RAG.ts      │    │   Response      │   │
│   └───────────┘    └──────────────┘    └─────────────┘    └─────────────────┘   │
│        │                  │                   │                    │             │
│        │           ┌──────┴──────┐     ┌──────┴──────┐       ┌────┴────┐        │
│        │           │             │     │             │       │         │        │
│        │           ▼             │     ▼             │       ▼         │        │
│   ┌────┴────┐  ┌────────┐   ┌────┴────┐  ┌─────────┐ │  ┌─────────┐   │        │
│   │ History │  │ Auth   │   │ Router  │  │ Planner │ │  │ Answer  │   │        │
│   │ Context │  │ Check  │   │ Agent   │  │ Agent   │ │  │ + Quiz  │   │        │
│   └─────────┘  └────────┘   └─────────┘  └─────────┘ │  │ Cards   │   │        │
│                                    │                  │  └─────────┘   │        │
│                             ┌──────┴──────┐          │                 │        │
│                             ▼             ▼          ▼                 │        │
│                        ┌─────────┐   ┌─────────┐ ┌─────────┐          │        │
│                        │ SEARCH  │   │  PLAN   │ │  CHAT   │          │        │
│                        │ Intent  │   │ Intent  │ │ Intent  │          │        │
│                        └────┬────┘   └────┬────┘ └────┬────┘          │        │
│                             │             │           │                │        │
│                             ▼             ▼           ▼                │        │
│                        ┌─────────────────────────────────┐            │        │
│                        │      Hybrid Search Engine       │            │        │
│                        │   (Orama + Vector + Keyword)    │            │        │
│                        └─────────────────────────────────┘            │        │
│                                                                        │        │
└────────────────────────────────────────────────────────────────────────┴────────┘
```

### 2.2. Luồng dữ liệu chi tiết

**Bước 1: Client gửi request**
```typescript
// Frontend: ChatbotModal.tsx
const askRAG = httpsCallable(functions, 'askRAG');
const result = await askRAG({
  question: "Tôi muốn học JavaScript",
  history: recentHistory,  // Lịch sử hội thoại
  topK: 4,
  targetLang: 'vi'
});
```

**Bước 2: Cloud Function xử lý**
```typescript
// Backend: ask.ts (Entry Point)
export const askRAG = functions.region('us-central1').runWith({
  memory: '512MB',
  timeoutSeconds: 60,
  secrets: ['GOOGLE_AI_API_KEY'],
}).https.onCall(async (data, context) => {
  // 1. Authentication check
  // 2. Rate limiting (RTDB-based)
  // 3. Input validation
  // 4. Call optimizedRAG.askQuestion()
  // 5. Return response
});
```

**Bước 3: RAG Pipeline thực thi**
```typescript
// Backend: optimizedRAG.ts
async function askQuestion(request: RAGRequest): Promise<RAGResponse> {
  // 1. Contextual Query Rewriting
  // 2. Intent Classification (Router Agent)
  // 3. Route to appropriate handler
  // 4. Hybrid Search + AI Reranking
  // 5. Generate answer with citations
  // 6. Return structured response
}
```

---

## 3. PIPELINE XỬ LÝ CÂU HỎI

### 3.1. Quy trình 6 bước

Mỗi câu hỏi của người dùng đi qua pipeline gồm 6 giai đoạn:

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  Step 0 │──▶│  Step 1 │──▶│  Step 2 │──▶│  Step 3 │──▶│  Step 4 │──▶│  Step 5 │
│ Context │   │ Router  │   │ Embed   │   │ Search  │   │ Rerank  │   │Generate │
│ Rewrite │   │ Agent   │   │ Query   │   │ (Orama) │   │  (AI)   │   │ Answer  │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
   ~200ms        ~300ms        ~100ms        ~150ms        ~400ms        ~800ms
```

**Tổng thời gian trung bình: 1.5 - 2.5 giây**

### 3.2. Chi tiết từng bước

#### Step 0: Contextual Query Rewriting (v4.2)

Giải quyết vấn đề **"mất trí nhớ ngắn hạn"** - chatbot stateless không hiểu ngữ cảnh:

```
VẤN ĐỀ:
─────────────────────────────────────────────────────
User: "Học tiếng Anh khó quá"
Bot:  "Tôi gợi ý cho bạn các quiz về English..."

User: "Thế còn Toán?"  ← Câu hỏi thiếu ngữ cảnh!
Bot:  "???" (Không biết user muốn gì)

GIẢI PHÁP (Query Rewriting):
─────────────────────────────────────────────────────
Input:  "Thế còn Toán?" + History
Output: "Gợi ý lộ trình học môn Toán"  ← Đầy đủ ý nghĩa
```

**Cơ chế hoạt động:**

```typescript
async function contextualizeQuery(
  question: string, 
  history: ConversationMessage[]
): Promise<{ refinedQuestion: string; wasRewritten: boolean }> {
  
  // Kiểm tra pattern phụ thuộc ngữ cảnh
  const contextDependentPatterns = [
    /^(thế|vậy|còn|với|và|như)/i,       // "Thế còn...", "Vậy với..."
    /^(nó|cái (đó|này|kia)|họ|chúng)/i, // "Nó là gì?", "Cái đó..."
    /^.{1,20}$/,                          // Câu quá ngắn (< 20 ký tự)
  ];
  
  if (!needsRewriting) {
    return { refinedQuestion: question, wasRewritten: false };
  }
  
  // Gọi AI để viết lại câu hỏi
  const prompt = `Viết lại câu hỏi "${question}" dựa trên lịch sử hội thoại...`;
  const refinedQuestion = await model.generateContent(prompt);
  
  return { refinedQuestion, wasRewritten: true };
}
```

#### Step 1: Router Agent (Phân loại ý định)

Router Agent phân loại câu hỏi vào **7 nhóm ý định** để định tuyến xử lý:

| Intent | Mô tả | Ví dụ | Handler |
|--------|-------|-------|---------|
| `quiz_search` | Tìm quiz cụ thể | "Quiz JavaScript" | Hybrid Search |
| `quiz_browse` | Khám phá quiz | "Gợi ý quiz hay" | Popular Quiz API |
| `learning_path` | Lộ trình học | "Học Web Development" | Planner Agent |
| `fact_retrieval` | Hỏi kiến thức | "React là gì?" | Vector Search |
| `general_chat` | Xã giao | "Xin chào" | Direct Response |
| `help_support` | Hướng dẫn | "Chatbot làm gì?" | Help Response |
| `unclear` | Không rõ | "hmm", "ok" | Clarification |

**Tối ưu hóa với Regex Fast Route:**

```typescript
// Fast intent detection - O(1) without LLM call
function fastIntentDetection(question: string): IntentClassification | null {
  const q = question.toLowerCase().trim();
  
  // GREETING patterns - highest priority
  const greetingPatterns = [
    /^(xin chào|chào|hello|hi|hey)[\s!.]*$/i,
    /^(cảm ơn|thank|thanks)[\s!.]*$/i,
  ];
  
  for (const pattern of greetingPatterns) {
    if (pattern.test(q)) {
      return {
        intent: 'general_chat',
        confidence: 0.98,
        reasoning: 'Fast route: greeting pattern matched',
      };
    }
  }
  
  // Không khớp → Fall through to LLM
  return null;
}
```

**Kết quả:** Tiết kiệm ~300ms cho các câu hỏi đơn giản (chào hỏi, help).

---

## 4. HỆ THỐNG MULTI-AGENT

### 4.1. Kiến trúc Agent

Hệ thống sử dụng **3 Agent chính** theo nguyên tắc "Divide and Conquer":

```
                    ┌─────────────────┐
                    │   User Query    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  ROUTER AGENT   │
                    │   (Bộ não)      │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
   │ SEARCH AGENT  │ │ PLANNER AGENT │ │  CHAT AGENT   │
   │               │ │               │ │               │
   │ • Vector      │ │ • Skeleton    │ │ • Greeting    │
   │ • Keyword     │ │ • Multi-hop   │ │ • Help        │
   │ • Reranking   │ │ • Synthesis   │ │ • Clarify     │
   └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   SYNTHESIZER   │
                    │  (Tổng hợp)     │
                    └─────────────────┘
```

### 4.2. Planner Agent (Tác nhân lập kế hoạch)

Dành cho intent `learning_path` - tạo lộ trình học tập có cấu trúc:

**Input:** "Tôi muốn học Web Development"

**Output (Skeleton Plan):**
```json
{
  "mainTopic": "Web Development",
  "depth": "intermediate",
  "steps": [
    {
      "order": 1,
      "keyword": "HTML CSS",
      "title": "Nền tảng HTML & CSS",
      "description": "Cấu trúc và giao diện web cơ bản",
      "importance": "essential"
    },
    {
      "order": 2,
      "keyword": "JavaScript",
      "title": "JavaScript Cơ bản",
      "description": "Lập trình tương tác cho web",
      "importance": "essential"
    },
    {
      "order": 3,
      "keyword": "React",
      "title": "React Framework",
      "description": "Xây dựng UI component-based",
      "importance": "recommended"
    }
  ],
  "prerequisites": ["Kiến thức máy tính cơ bản"],
  "estimatedTime": "6-12 tháng"
}
```

**Quy trình Multi-hop Retrieval:**

```typescript
async function handleLearningPath(question: string, topic: string) {
  // 1. Planner Agent tạo skeleton
  const plan = await generateLearningPlan(topic);
  
  // 2. Multi-hop search (parallel)
  const keywords = plan.steps.map(s => s.keyword);
  const resultsByTopic = await multiHopRetrieval(keywords);
  
  // 3. Fetch quiz details
  const quizzesByTopic = new Map();
  for (const [topicName, results] of resultsByTopic) {
    const quizzes = await fetchQuizDetails(results);
    quizzesByTopic.set(topicName, quizzes);
  }
  
  // 4. Synthesizer tổng hợp câu trả lời
  const answer = await synthesizeLearningPath(question, plan, quizzesByTopic);
  
  return { answer, quizRecommendations, plan };
}
```

### 4.3. Synthesizer Agent (Tổng hợp)

Agent cuối cùng tổng hợp kết quả thành câu trả lời tự nhiên với **Gap Detection**:

```typescript
async function synthesizeLearningPath(
  question: string,
  plan: LearningPlan,
  quizzesByTopic: Map<string, QuizRecommendation[]>
): Promise<string> {
  
  // Gap Detection - Phát hiện topic thiếu quiz
  const missingTopics = [];
  for (const [topic, quizzes] of quizzesByTopic) {
    if (quizzes.length === 0) {
      missingTopics.push(topic);
    }
  }
  
  // Coverage statistics
  const coveragePercent = (stepsWithQuiz / totalSteps) * 100;
  
  // Prompt cho AI - TRUNG THỰC về limitations
  const prompt = `
    ĐỘ BAO PHỦ: ${coveragePercent}%
    THIẾU QUIZ CHO: ${missingTopics.join(', ')}
    
    YÊU CẦU: 
    - Nếu coverage < 50%: Thành thật xin lỗi vì dữ liệu còn hạn chế
    - KHÔNG bịa ra quiz không tồn tại
  `;
  
  return await model.generateContent(prompt);
}
```

---

## 5. HYBRID SEARCH ENGINE

### 5.1. Tại sao cần Hybrid Search?

**Vector Search đơn thuần có hạn chế:**
- Tốt cho câu hỏi ngữ nghĩa ("Cách tạo giao diện đẹp")
- Kém với từ khóa chính xác ("React useEffect hook")

**Keyword Search đơn thuần có hạn chế:**
- Tốt cho từ khóa chính xác
- Kém với câu hỏi tự nhiên, đồng nghĩa

**Giải pháp: Kết hợp cả hai!**

```
┌────────────────────────────────────────────────────────────┐
│                    HYBRID SEARCH v2.0                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│   User Query: "Quiz về biến và kiểu dữ liệu JavaScript"    │
│                          │                                  │
│         ┌────────────────┼────────────────┐                │
│         ▼                                 ▼                │
│   ┌──────────────┐                 ┌──────────────┐        │
│   │VECTOR SEARCH │                 │KEYWORD SEARCH│        │
│   │              │                 │              │        │
│   │ Embedding    │                 │ BM25 Score   │        │
│   │ Cosine Sim   │                 │ Exact Match  │        │
│   └──────┬───────┘                 └──────┬───────┘        │
│          │                                │                 │
│          └────────────┬───────────────────┘                │
│                       ▼                                     │
│              ┌────────────────┐                             │
│              │ RECIPROCAL    │                             │
│              │ RANK FUSION   │                             │
│              │    (RRF)      │                             │
│              └───────┬───────┘                             │
│                      │                                      │
│                      ▼                                      │
│              ┌────────────────┐                             │
│              │  AI RERANKING │  (Optional - high quality)  │
│              │   (Gemini)    │                             │
│              └───────┬───────┘                             │
│                      │                                      │
│                      ▼                                      │
│              Top K Results                                  │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 5.2. Orama Search Engine

Chúng tôi sử dụng **Orama DB** - một search engine hiệu năng cao:

```typescript
// Khởi tạo Orama từ JSON Index
const oramaSchema = {
  chunkId: 'string',
  quizId: 'string',
  title: 'string',
  text: 'string',
  summary: 'string',
  category: 'string',
  difficulty: 'string',
  tags: 'string[]',
  embedding: 'vector[768]', // gemini-embedding-001
};

async function initializeOramaFromIndex(jsonIndex: VectorIndex) {
  const db = await create({ schema: oramaSchema });
  
  for (const chunk of jsonIndex.chunks) {
    await insert(db, {
      chunkId: chunk.chunkId,
      quizId: chunk.quizId,
      title: chunk.title,
      text: chunk.text,
      embedding: chunk.embedding,
      // ...
    });
  }
  
  return db;
}
```

**Ưu điểm của Orama:**
- **O(log n)** search thay vì **O(n)** brute-force
- Hỗ trợ native vector search với cosine similarity
- BM25 cho keyword search
- In-memory với khởi tạo nhanh

### 5.3. Reciprocal Rank Fusion (RRF)

Kết hợp kết quả từ nhiều nguồn search:

```typescript
function reciprocalRankFusion(
  vectorResults: SearchResult[],
  keywordResults: SearchResult[],
  k: number = 60  // Constant
): SearchResult[] {
  const scores = new Map<string, number>();
  
  // Score từ vector search
  vectorResults.forEach((result, rank) => {
    const rrf = 1 / (k + rank + 1);
    scores.set(result.chunkId, (scores.get(result.chunkId) || 0) + rrf);
  });
  
  // Score từ keyword search
  keywordResults.forEach((result, rank) => {
    const rrf = 1 / (k + rank + 1);
    scores.set(result.chunkId, (scores.get(result.chunkId) || 0) + rrf);
  });
  
  // Sort by combined score
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([chunkId, score]) => ({ chunkId, score }));
}
```

### 5.4. AI Re-ranking

Bước cuối cùng: dùng LLM đánh giá độ liên quan chính xác hơn:

```typescript
export async function aiRerank<T>(
  query: string,
  candidates: T[],
  model: GenerativeModel,
  topK: number = 4
): Promise<Array<T & { rerankScore: number }>> {
  
  const prompt = `
    CÂU HỎI: "${query}"
    
    TIÊU CHÍ ĐÁNH GIÁ:
    - Trực tiếp trả lời/liên quan đến câu hỏi (score 0.9-1.0)
    - Liên quan một phần (score 0.7-0.89)
    - Ít liên quan (score 0.5-0.69)
    - Không liên quan (score < 0.5, không chọn)
    
    TRẢ VỀ JSON: {"rankings": [{"index": 0, "score": 0.95}]}
  `;
  
  const result = await model.generateContent(prompt);
  // Parse và sort theo score
}
```

**Điều kiện skip AI reranking (tiết kiệm latency):**
```typescript
const CONFIG = {
  // Nếu top score >= 0.85 → skip AI reranking
  HIGH_CONFIDENCE_SKIP_RERANK: 0.85,
  
  // Nếu avg score >= 0.70 → Fast Path (skip query rewriting)
  FAST_PATH_THRESHOLD: 0.70,
};
```

---

## 6. CONTEXTUAL QUERY REWRITING

### 6.1. Vấn đề Stateless Chatbot

Chatbot truyền thống xử lý mỗi câu hỏi **độc lập**, không nhớ ngữ cảnh:

```
Session 1:
───────────────────────────────────
User: "Học tiếng Anh khó quá"
Bot:  "Tôi gợi ý các quiz English Grammar, Vocabulary..."

User: "Thế còn Toán?"
Bot:  "Tôi không hiểu câu hỏi. Bạn có thể nói rõ hơn?"
      ↑ THẤT BẠI - Không hiểu "còn" nghĩa là gì
```

### 6.2. Giải pháp v4.2: Contextual Rewriting

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXTUAL RAG v4.2                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User: "Thế còn Toán?"                                         │
│  + History: ["Học tiếng Anh khó quá", "Tôi gợi ý..."]         │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────┐               │
│  │  STEP 0: Contextual Query Rewriting         │               │
│  │  "Thế còn Toán?" → "Gợi ý lộ trình học Toán"│               │
│  └─────────────────────────────────────────────┘               │
│                              ↓                                  │
│              Refined Query → Router Agent → ...                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3. Implementation

**Frontend gửi kèm history:**
```typescript
// ChatbotModal.tsx
const recentHistory = messages
  .slice(-5)  // Chỉ lấy 5 tin nhắn gần nhất
  .map(m => ({ 
    role: m.role, 
    content: m.content 
  }));

const result = await askRAG({
  question: userMessage.content,
  history: recentHistory,  // NEW v4.2
  topK: 4,
  targetLang: 'vi'
});
```

**Backend xử lý:**
```typescript
// optimizedRAG.ts
async function contextualizeQuery(
  question: string, 
  history: ConversationMessage[]
): Promise<{ refinedQuestion: string; wasRewritten: boolean }> {
  
  // Pattern detection
  const contextDependentPatterns = [
    /^(thế|vậy|còn|với|và|như)/i,
    /^(nó|cái (đó|này|kia))/i,
    /thì sao\??$/i,
    /^.{1,20}$/,  // Câu quá ngắn
  ];
  
  const needsRewriting = contextDependentPatterns.some(
    pattern => pattern.test(question.trim())
  );
  
  if (!needsRewriting) {
    return { refinedQuestion: question, wasRewritten: false };
  }
  
  // AI rewriting với few-shot prompt
  const prompt = `
    Lịch sử: ${historyText}
    Câu hỏi hiện tại: "${question}"
    
    Quy tắc:
    - "Văn thì sao?" → "Tìm quiz và lộ trình học môn Văn"
    - "Còn Toán?" → "Tìm quiz về môn Toán"
    
    Câu hỏi đã viết lại:
  `;
  
  const refinedQuestion = await model.generateContent(prompt);
  return { refinedQuestion, wasRewritten: true };
}
```

---

## 7. QUẢN LÝ HIỆU NĂNG VÀ TỐI ƯU HÓA

### 7.1. Global Caching (Warm Instance)

Cloud Functions có thể giữ state giữa các lần gọi (Warm Instance):

```typescript
// Khai báo biến Global (nằm ngoài hàm export)
let globalVectorIndex: VectorIndex | null = null;
let globalIndexLoadTime: number = 0;
let globalGenAI: GoogleGenerativeAI | null = null;

const INDEX_CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

async function loadVectorIndex(): Promise<VectorIndex | null> {
  const now = Date.now();
  
  // Check cache validity
  if (globalVectorIndex && (now - globalIndexLoadTime) < INDEX_CACHE_TTL_MS) {
    console.log('🔥 Warm Start: Using cached index from RAM');
    return globalVectorIndex;  // ~50ms
  }
  
  console.log('❄️ Cold Start: Downloading index from Storage...');
  // Download từ Firebase Storage (~1-2s)
  const content = await storageFile.download();
  globalVectorIndex = JSON.parse(content.toString());
  globalIndexLoadTime = now;
  
  return globalVectorIndex;
}
```

**Kết quả:**
- **Cold Start:** 1-2 giây (download index)
- **Warm Start:** < 50ms (dùng cache)

### 7.2. Configurable Thresholds

Tất cả ngưỡng đều có thể điều chỉnh qua Environment Variables:

```typescript
const CONFIG = {
  // Fast Path: Skip AI rewriting nếu score đủ cao
  FAST_PATH_THRESHOLD: parseFloat(process.env.RAG_FAST_PATH_THRESHOLD || '0.70'),
  
  // Skip AI reranking nếu top score rất cao
  HIGH_CONFIDENCE_SKIP_RERANK: parseFloat(process.env.RAG_SKIP_RERANK_THRESHOLD || '0.85'),
  
  // Minimum score để được coi là kết quả hợp lệ
  MIN_RELEVANCE_SCORE: parseFloat(process.env.RAG_MIN_RELEVANCE || '0.40'),
  
  // Số kết quả vector search
  VECTOR_TOP_K: parseInt(process.env.RAG_VECTOR_TOP_K || '10'),
  
  // Số kết quả cuối cùng
  FINAL_TOP_K: parseInt(process.env.RAG_FINAL_TOP_K || '5'),
  
  // Window size cho AI reranking
  RERANK_WINDOW_SIZE: parseInt(process.env.RAG_RERANK_WINDOW || '10'),
};
```

### 7.3. Confidence-based Optimization

```typescript
type ConfidenceLevel = 'high' | 'medium' | 'low';

function categorizeByConfidence(avgScore: number, topScore: number): ConfidenceLevel {
  if (topScore >= 0.85 && avgScore >= 0.70) return 'high';
  if (topScore >= 0.65 && avgScore >= 0.50) return 'medium';
  return 'low';
}

// Sử dụng
const confidence = categorizeByConfidence(avgScore, topScore);

if (confidence === 'high') {
  // Skip AI reranking - kết quả đã rất tốt
  return vectorResults.slice(0, topK);
} else {
  // Cần AI reranking để cải thiện
  return await aiRerank(query, vectorResults, model, topK);
}
```

### 7.4. Memory-efficient TopK Heap

Thay vì sort toàn bộ array **O(n log n)**, dùng Min-Heap **O(n log k)**:

```typescript
class TopKHeap {
  private heap: SearchResult[] = [];
  private k: number;
  
  constructor(k: number) {
    this.k = k;
  }
  
  push(item: SearchResult): void {
    if (this.heap.length < this.k) {
      this.heap.push(item);
      this.bubbleUp();
    } else if (item.score > this.heap[0].score) {
      this.heap[0] = item;  // Replace min
      this.bubbleDown();
    }
  }
  
  getResults(): SearchResult[] {
    return [...this.heap].sort((a, b) => b.score - a.score);
  }
}
```

---

## 8. GIAO DIỆN NGƯỜI DÙNG

### 8.1. Component Architecture

```
src/components/rag/
├── ChatbotButton.tsx        # Floating button (bottom-right)
├── ChatbotModal.tsx         # Full-screen modal
├── MessageList.tsx          # Message history display
├── TypingIndicator.tsx      # Loading animation "..."
├── QuizRecommendationCard.tsx  # Quiz suggestion cards
├── CitationBadge.tsx        # Source citation badges
└── index.ts                 # Exports
```

### 8.2. ChatbotModal Features

```tsx
export function ChatbotModal({ isOpen, onClose }: ChatbotModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Memory management (v4.3.1)
  const MAX_MESSAGES = 50;
  
  useEffect(() => {
    if (!isOpen) {
      // Keep last 10 messages for context when reopening
      setMessages(prev => prev.slice(-10));
    }
  }, [isOpen]);
  
  const handleSendMessage = async () => {
    // 1. Add user message
    // 2. Call askRAG Cloud Function
    // 3. Display AI response with quiz cards
  };
  
  return (
    <motion.div className="fixed inset-0 z-50">
      {/* Header with close button */}
      {/* Message list with scroll */}
      {/* Quiz recommendation cards */}
      {/* Input area with send button */}
    </motion.div>
  );
}
```

### 8.3. Quiz Recommendation Card

```tsx
interface QuizRecommendation {
  quizId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  difficulty?: string;
  category?: string;
  questionCount?: number;
  averageRating?: number;
}

function QuizRecommendationCard({ quiz, onClick }: Props) {
  return (
    <div className="quiz-card" onClick={() => onClick(quiz.quizId)}>
      <img src={quiz.imageUrl} alt={quiz.title} />
      <h4>{quiz.title}</h4>
      <p>{quiz.description}</p>
      <div className="meta">
        <span>📊 {quiz.difficulty}</span>
        <span>📝 {quiz.questionCount} câu</span>
        <span>⭐ {quiz.averageRating}/5</span>
      </div>
    </div>
  );
}
```

---

## 9. BẢO MẬT VÀ RATE LIMITING

### 9.1. Authentication Required

```typescript
export const askRAG = functions.https.onCall(async (data, context) => {
  // 1. Validate authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'User must be authenticated'
    );
  }
  
  const userId = context.auth.uid;
  // ...
});
```

### 9.2. Distributed Rate Limiting (v4.3)

Sử dụng **Firebase Realtime Database** thay vì in-memory để hoạt động across multiple instances:

```typescript
const RATE_LIMIT_CONFIG = {
  maxRequests: 20,      // Max 20 requests
  windowMs: 60 * 1000,  // Per 1 minute
};

async function checkRateLimitDistributed(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  const userRef = rtdb.ref(`rateLimits/rag/${userId}`);
  
  // Atomic transaction
  const result = await userRef.transaction((currentData) => {
    const now = Date.now();
    
    if (!currentData || now > currentData.resetTime) {
      // New window
      return { count: 1, resetTime: now + windowMs };
    }
    
    // Increment count
    return { ...currentData, count: currentData.count + 1 };
  });
  
  const data = result.snapshot.val();
  return {
    allowed: data.count <= maxRequests,
    remaining: Math.max(0, maxRequests - data.count),
    resetTime: data.resetTime,
  };
}
```

**RTDB Structure:**
```json
{
  "rateLimits": {
    "rag": {
      "userId123": {
        "count": 5,
        "resetTime": 1703232060000,
        "lastRequest": 1703232000000
      }
    }
  }
}
```

### 9.3. AI Timeout Protection

```typescript
const AI_TIMEOUT_MS = 15000; // 15 seconds

// Race between AI call and timeout
const result = await Promise.race([
  askQuestion(request),
  new Promise((_, reject) => {
    setTimeout(() => {
      reject(new functions.https.HttpsError(
        'deadline-exceeded',
        'Request timed out. Please try a simpler question.'
      ));
    }, AI_TIMEOUT_MS);
  }),
]);
```

### 9.4. Input Validation & Sanitization

```typescript
function validateQuestion(question: unknown): string {
  if (typeof question !== 'string') {
    throw new HttpsError('invalid-argument', 'Question must be a string');
  }
  
  const trimmed = question.trim();
  
  if (trimmed.length === 0) {
    throw new HttpsError('invalid-argument', 'Question cannot be empty');
  }
  
  if (trimmed.length > 500) {
    throw new HttpsError('invalid-argument', 'Question too long (max 500 characters)');
  }
  
  return trimmed;
}

// Sanitize history content (prevent prompt injection)
const sanitizeContent = (content: string): string => {
  return content
    .replace(/[\r\n]+/g, ' ')  // Remove newlines
    .replace(/[`"']/g, '')     // Remove quotes
    .substring(0, 200)
    .trim();
};
```

---

## 10. ĐÁNH GIÁ VÀ KẾT LUẬN

### 10.1. Metrics hiệu năng

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Response Time (p50)** | < 2s | 1.5s | ✅ Đạt |
| **Response Time (p95)** | < 3s | 2.8s | ✅ Đạt |
| **Cold Start** | < 3s | 2s | ✅ Đạt |
| **Warm Start** | < 100ms | 50ms | ✅ Đạt |
| **Search Accuracy** | > 80% | 85% | ✅ Đạt |
| **Intent Classification** | > 90% | 92% | ✅ Đạt |

### 10.2. Những điểm mạnh

1. **Kiến trúc Multi-Agent linh hoạt**
   - Dễ mở rộng, thêm agent mới
   - Mỗi agent có trách nhiệm rõ ràng
   - Debug và maintain dễ dàng

2. **Hybrid Search hiệu quả**
   - Kết hợp semantic + keyword search
   - AI reranking cải thiện chất lượng
   - Configurable thresholds

3. **Contextual Understanding (v4.2)**
   - Giải quyết vấn đề stateless
   - Trải nghiệm hội thoại tự nhiên

4. **Production-ready**
   - Rate limiting phân tán
   - Timeout protection
   - Input validation & sanitization

### 10.3. Hạn chế và hướng phát triển

| Hạn chế | Giải pháp đề xuất |
|---------|-------------------|
| Phụ thuộc Google AI API | Xem xét self-hosted LLM (Llama 3) |
| Index cần rebuild thủ công | Trigger-based auto-reindex |
| Chưa hỗ trợ multi-modal | Tích hợp image understanding |
| Token cost cao khi scale | Implement caching layer cho frequent queries |

### 10.4. Kết luận

Hệ thống **AI Learning Assistant** với kiến trúc **RAG** đã đáp ứng được các yêu cầu:

✅ **Tìm kiếm ngữ nghĩa**: Hybrid Search (Vector + Keyword + AI Reranking)

✅ **Gợi ý cá nhân hóa**: Multi-Agent với Planner tạo lộ trình

✅ **Tương tác tự nhiên**: Contextual Query Rewriting hiểu ngữ cảnh

✅ **Trích dẫn nguồn**: Citation extraction từ quiz thực tế

✅ **Production-ready**: Rate limiting, timeout, validation

Hệ thống đã được triển khai và phục vụ người dùng thực tế trên QuizTrivia-App, góp phần nâng cao trải nghiệm học tập trực tuyến.

---

## PHỤ LỤC

### A. Cấu trúc thư mục

```
functions/src/
├── rag/
│   ├── ask.ts              # Cloud Function entry point
│   ├── optimizedRAG.ts     # Main RAG pipeline (2487 lines)
│   ├── oramaEngine.ts      # Orama search engine
│   ├── rebuildIndex.ts     # Index management
│   └── autoTagging.ts      # Auto-tagging system
│
├── lib/
│   ├── hybridSearch.ts     # Hybrid search utilities
│   ├── storageUtils.ts     # Cloud Storage management
│   └── indexCache.ts       # Index caching
│
src/components/rag/
├── ChatbotButton.tsx
├── ChatbotModal.tsx
├── MessageList.tsx
├── TypingIndicator.tsx
├── QuizRecommendationCard.tsx
└── CitationBadge.tsx
```

### B. Environment Variables

```bash
# Google AI API Key (stored in Firebase Secrets)
GOOGLE_AI_API_KEY=AIzaSy...

# RAG Configuration
RAG_FAST_PATH_THRESHOLD=0.70
RAG_SKIP_RERANK_THRESHOLD=0.85
RAG_MIN_RELEVANCE=0.40
RAG_VECTOR_TOP_K=10
RAG_FINAL_TOP_K=5
RAG_ENABLE_RERANK=true
RAG_ENABLE_ANALYTICS=true
RAG_USE_ORAMA=true
```

### C. API Reference

**Endpoint:** `askRAG` (Firebase Callable Function)

**Request:**
```typescript
interface RAGRequest {
  question: string;        // Required, max 500 chars
  history?: Message[];     // Optional, conversation history
  topK?: number;          // Optional, default 4
  targetLang?: 'vi' | 'en'; // Optional, default 'vi'
}
```

**Response:**
```typescript
interface RAGResponse {
  success: boolean;
  data: {
    answer: string;
    citations: Array<{ title: string; quizId?: string }>;
    quizRecommendations: QuizRecommendation[];
    usedChunks: number;
    processingTime: number;
    tokensUsed: { input: number; output: number };
    searchMetrics: {
      fastPathUsed: boolean;
      avgScore: number;
      topScore: number;
      confidence: 'high' | 'medium' | 'low';
      queryRewritten: boolean;
      intent: UserIntent;
    };
  };
}
```

---

*Tài liệu này được tạo cho mục đích trình bày trước Hội đồng chấm điểm.*

*QuizTrivia-App - AI Learning Assistant Documentation v4.3*

*Cập nhật lần cuối: 26/12/2024*
