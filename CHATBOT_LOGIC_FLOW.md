# 🤖 RAG Chatbot Logic Flow - Master Plan v4.1 Enhanced

> **Báo cáo này mô tả chi tiết luồng xử lý của Agentic RAG Chatbot sau khi cải thiện v4.1.**
> **Cập nhật: 2025-11-26 - Thêm Help/Support, Unclear Intent, Tag Quality Control, Analytics**

---

## 📊 Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       🎯 AGENTIC RAG PIPELINE v4.1                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌───────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│   │  User     │───▶│  ask.ts      │───▶│ optimized   │───▶│   Firebase      │  │
│   │  Input    │    │  (Entry)     │    │ RAG.ts      │    │   Response      │  │
│   └───────────┘    └──────────────┘    └─────────────┘    └─────────────────┘  │
│                            │                  │                                 │
│                            ▼                  ▼                                 │
│                    ┌──────────────┐    ┌─────────────┐                         │
│                    │ Router Agent │    │ Orama DB    │                         │
│                    │ (GĐ2 v4.1)  │    │ (GĐ1)       │                         │
│                    └──────────────┘    └─────────────┘                         │
│                            │                  │                                 │
│     ┌──────────────────────┼──────────────────┼──────────────────────┐         │
│     ▼            ▼         ▼         ▼        ▼              ▼       ▼         │
│ ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────┐ ┌────────┐ ┌─────────┐ ┌───────┐  │
│ │LEARNING│ │QUIZ      │ │FACT    │ │CHAT  │ │HELP    │ │UNCLEAR  │ │       │  │
│ │PATH    │ │SEARCH    │ │RETRIEV.│ │      │ │SUPPORT │ │(ask)    │ │Analytics│ │
│ └────────┘ └──────────┘ └────────┘ └──────┘ └────────┘ └─────────┘ └───────┘  │
│     │            │           │         │         │           │         │       │
│     ▼            └─────┬─────┘         ▼         ▼           ▼         ▼       │
│ ┌────────┐             │         Direct    Help       Clarifying   Firestore   │
│ │Planner │             ▼         Gemini    Response   Question     Logging     │
│ │(depth) │     ┌──────────────┐                                                │
│ └────────┘     │ Hybrid Search│                                                │
│     │          └──────────────┘                                                │
│     ▼                  │                                                       │
│ ┌────────────┐         ▼                                                       │
│ │ Multi-Hop  │  ┌──────────────┐                                               │
│ │ + Alt Res  │  │ AI Rerank    │                                               │
│ └────────────┘  └──────────────┘                                               │
│     │                  │                                                       │
│     ▼                  ▼                                                       │
│ ┌────────────┐  ┌──────────────┐                                               │
│ │Synthesizer │  │ Generate     │                                               │
│ │+ Suggest   │  │ Answer       │                                               │
│ └────────────┘  └──────────────┘                                               │
│         └──────────────┬──────────────────────────────────────────────────────│
│                        ▼                                                       │
│           ┌──────────────────────────┐                                         │
│           │  Final RAGResponse       │                                         │
│           │  + Quiz Recommendations  │                                         │
│           │  + Suggested Questions   │  ◄── NEW v4.1                           │
│           └──────────────────────────┘                                         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Chi Tiết Luồng Xử Lý

### **STEP 0: Entry Point (`ask.ts`)**

```typescript
// File: functions/src/rag/ask.ts
export const askRAG = onCall(async (request) => {
  const { question, language } = request.data;
  
  // Gọi askQuestion từ optimizedRAG.ts
  const response = await askQuestion({
    question,
    targetLang: language || 'vi',
    enableRerank: true,
  });
  
  return response;
});
```

**Nhiệm vụ:**
- Nhận request từ Firebase Callable Function
- Validate input (question, language)
- Rate limiting (10 requests/minute/user)
- Forward đến `askQuestion()`

---

### **STEP 1: Router Agent - Intent Classification (`classifyIntent`)**

```typescript
// File: optimizedRAG.ts - v4.1 Enhanced

async function classifyIntent(question: string): Promise<IntentClassification> {
  const model = getChatModel(); // gemini-2.5-flash-lite
  
  // 6 intents in v4.1 (was 4 in v4.0)
  const prompt = `Classify user intent into ONE category:
  
  1. "learning_path" - Muốn học rộng một chủ đề
  2. "quiz_search" - Tìm quiz cụ thể
  3. "fact_retrieval" - Hỏi kiến thức cụ thể  
  4. "general_chat" - Chat thông thường
  5. "help_support" - Cần hướng dẫn sử dụng chatbot  ◄── NEW v4.1
  6. "unclear" - Không rõ ý định, cần hỏi lại      ◄── NEW v4.1
  
  Question: "${question}"`;
  
  // NEW v4.1: Check confidence threshold
  if (parsed.confidence < CONFIG.INTENT_CONFIDENCE_THRESHOLD) {
    return { intent: 'unclear', clarifyingQuestion: generateClarifyingQuestion(...) };
  }
  
  return { intent, confidence, extractedTopic, clarifyingQuestion };
}
```

**6 Intent Types (v4.1):**

| Intent | Trigger Keywords | Xử lý |
|--------|-----------------|-------|
| `learning_path` | "muốn học", "hướng dẫn từ đầu", "học từ cơ bản" | → Planner Agent (with depth option) |
| `quiz_search` | "quiz về", "tìm quiz", "test về" | → Hybrid Search |
| `fact_retrieval` | "là gì", "giải thích", "tại sao" | → Hybrid Search |
| `general_chat` | "xin chào", "cảm ơn", không liên quan quiz | → Direct Gemini |
| `help_support` | "làm sao để", "chatbot làm được gì" | → Help Response |
| `unclear` | câu quá ngắn, mơ hồ, confidence < 0.65 | → Clarifying Question |

---

### **STEP 2A: Learning Path Mode (GĐ3-5)**

Khi `intent === 'learning_path'`:

#### **2A.1: Planner Agent (`generateLearningPlan`)**

```typescript
// v4.1: Added depth customization + save to Firestore

type LearningDepth = 'basic' | 'intermediate' | 'advanced' | 'expert';

async function generateLearningPlan(
  topic: string,
  options?: { depth: LearningDepth, saveToFirestore?: boolean, userId?: string }
): Promise<LearningPlan> {
  const stepCount = getStepCountForDepth(depth);
  // basic: 3 steps, intermediate: 5, advanced: 7, expert: 10
  
  // Generate structured learning plan
  return {
    mainTopic: "JavaScript",
    steps: [
      { stepNumber: 1, title: "Cơ bản", searchQuery: "biến hằng kiểu dữ liệu JavaScript", keyTopics: [...] },
      // ... more steps based on depth
    ]
  };
}

// NEW v4.1: Save plan to Firestore for later reference
async function saveLearningPlanToFirestore(userId: string, plan: LearningPlan): Promise<string> {
  const docRef = await firestore.collection('learningPlans').add({
    userId, plan, createdAt: serverTimestamp(), status: 'active'
  });
  return docRef.id;
}
```

**Depth Options (NEW v4.1):**

| Depth | Steps | Description |
|-------|-------|-------------|
| `basic` | 3 | Kiến thức nền tảng nhất |
| `intermediate` | 5 | Cốt lõi + một số nâng cao |
| `advanced` | 7 | Chuyên sâu + best practices |
| `expert` | 10 | Toàn diện + edge cases |

#### **2A.2: Multi-Hop Retrieval (`multiHopRetrieval`)**

```typescript
// v4.1: Enhanced with empty results handling

async function multiHopRetrieval(plan: LearningPlan): Promise<Map<string, SearchResult[]>> {
  const resultsByTopic = new Map();
  
  // Search cho mỗi step trong plan
  for (const step of plan.steps) {
    const embedding = await generateEmbedding(step.searchQuery);
    const results = await vectorSearch(embedding, 5, step.searchQuery);
    resultsByTopic.set(step.title, results);
  }
  
  // NEW v4.1: Log coverage statistics
  const coveredTopics = allResults.filter(r => r.hasResults).length;
  console.log(`📊 Multi-hop Coverage: ${coveredTopics}/${totalTopics} topics have quiz content`);
  
  return resultsByTopic;
}

// NEW v4.1: Generate alternative resources when no quiz found
function generateAlternativeResources(missingTopics: string[]): string {
  return missingTopics.map(topic => `
📖 **${topic}:**
   - 🎥 YouTube: https://youtube.com/results?search_query=${topic}+tutorial
   - 📚 Coursera/Udemy: Tìm "${topic}"
  `).join('\n');
}
```

#### **2A.3: Synthesizer Agent (`synthesizeLearningPath`)**

```typescript
// v4.1: Enhanced formatting + Suggested next actions

async function synthesizeLearningPath(
  question: string,
  plan: LearningPlan,
  resultsByTopic: Map<string, QuizRecommendation[]>
): Promise<string> {
  // Gap Detection: Kiểm tra topic nào thiếu quiz
  const gaps = findGaps(plan, resultsByTopic);
  
  // NEW v4.1: Generate suggested follow-up questions
  const suggestedQuestions = generateSuggestedQuestions(plan.mainTopic, plan.steps);
  
  // Generate personalized learning path with recommendations
  let answer = `## 📚 Lộ Trình Học ${plan.mainTopic}
  
  ### Bước 1: ${plan.steps[0].title}
  🎯 Quiz đề xuất: ...
  
  💭 **Bạn có thể hỏi thêm:**
  ${suggestedQuestions}`;
  
  // NEW v4.1: Append alternative resources for missing topics
  if (gaps.length > 0) {
    answer += generateAlternativeResources(gaps);
  }
  
  return answer;
}

// NEW v4.1: Generate suggested questions
function generateSuggestedQuestions(mainTopic: string, steps: LearningStep[]): string {
  return [
    `- "Quiz về ${steps[0].keyword}"`,
    `- "${steps[1]?.keyword} là gì?"`,
    `- "Lộ trình ${mainTopic} nâng cao"`,
  ].join('\n');
}
```

---

### **STEP 2B: Standard Search Mode (Quiz/Fact)**

Khi `intent === 'quiz_search' | 'fact_retrieval'`:

#### **2B.1: Hybrid Search (GĐ1 - Orama)**

```typescript
// Line 820-920 - vectorSearch()

async function vectorSearch(
  queryEmbedding: number[],
  topK: number,
  originalQuery?: string
): Promise<SearchResult[]> {
  
  if (USE_ORAMA_SEARCH && originalQuery) {
    // === ORAMA HYBRID MODE (60% vector, 40% keyword) ===
    const oramaDB = await initializeOramaFromIndex(index);
    return await oramaHybridSearch(oramaDB, originalQuery, queryEmbedding, topK, 0.6);
  }
  
  // === FALLBACK: Brute-force cosine similarity ===
  for (const chunk of index.chunks) {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    topKHeap.add({ ...chunk, score });
  }
  return topKHeap.getResults();
}
```

**Orama Search Flow:**

```
User Query: "quiz về JavaScript arrays"
    │
    ▼
┌──────────────────────────────────────────┐
│  1. Generate Embedding (text-embedding-004) │
│     query → [0.12, -0.34, 0.78, ...]    │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│  2. Orama Hybrid Search                  │
│     - Vector: cosine similarity (60%)    │
│     - BM25: keyword matching (40%)       │
│     - Combined score = 0.6v + 0.4k       │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│  3. Top-K Results (default: 10)          │
│     [{ chunkId, quizId, score, text }]   │
└──────────────────────────────────────────┘
```

#### **2B.2: Confidence Categorization**

```typescript
// Score thresholds
const thresholds = {
  HIGH: 0.75,    // Direct match, high confidence
  MEDIUM: 0.55,  // Related content
  LOW: 0.35,     // Weak match
};

// Categorize results
if (avgScore >= HIGH) return 'high';
if (avgScore >= MEDIUM) return 'medium';
return 'low';
```

#### **2B.3: AI Reranking (Optional)**

```typescript
// Chỉ chạy khi confidence !== 'high'
if (enableRerank && confidence !== 'high') {
  const reranked = await aiRerank(question, contexts);
  contexts = reranked.slice(0, topK);
}
```

#### **2B.4: Generate Answer**

```typescript
// Line 1060-1120
async function generateAnswer(question: string, contexts: SearchResult[]): Promise<string> {
  const model = getChatModel(); // gemini-2.5-flash-lite
  
  const prompt = `Bạn là AI Learning Assistant.
  Dựa vào context sau, trả lời câu hỏi:
  
  Context: ${contexts.map(c => c.text).join('\n')}
  Question: ${question}`;
  
  return result.response.text();
}
```

---

### **STEP 2C: General Chat Mode**

Khi `intent === 'general_chat'`:

```typescript
// Direct response without search
const chatModel = getChatModel();
const result = await chatModel.generateContent(
  `Bạn là AI Learning Assistant thân thiện. Trả lời ngắn gọn:\n\nUser: ${question}`
);

return {
  answer: result.response.text(),
  quizRecommendations: undefined, // No quiz search
  searchMetrics: { confidence: 'none' },
};
```

---

### **STEP 3: Fetch Quiz Details & Return Response**

```typescript
// Line 1160-1210 - fetchQuizDetails()
async function fetchQuizDetails(quizIds: string[]): Promise<QuizRecommendation[]> {
  for (const quizId of quizIds) {
    const quizDoc = await firestore.collection('quizzes').doc(quizId).get();
    
    if (quizDoc.exists && quizData.status === 'approved') {
      recommendations.push({
        quizId,
        title: quizData.title,
        description: quizData.description,
        difficulty: quizData.difficulty,
        category: quizData.category,
        questionCount: quizData.questionCount,
        hasPassword: !!(quizData.password || quizData.accessCode),
      });
    }
  }
  return recommendations;
}
```

---

## 🗂️ Auto-Tagging Trigger (GĐ4) - v4.1 with Quality Control

**File:** `functions/src/rag/autoTagging.ts`

```
Quiz Approval Flow (v4.1 Enhanced):
                                    
┌──────────────┐     onWrite      ┌──────────────────────┐
│  Firestore   │ ─────────────▶   │  autoTagOnApproval   │
│  /quizzes/*  │                  │  Trigger             │
└──────────────┘                  └──────────────────────┘
                                           │
           ┌───────────────────────────────┼───────────────────────────────┐
           │                               │                               │
           ▼                               ▼                               ▼
    ┌──────────────┐             ┌──────────────────┐             ┌──────────────┐
    │  DELETE      │             │  APPROVED        │             │  UN-APPROVED │
    │  Document    │             │  status changed  │             │  or other    │
    └──────────────┘             └──────────────────┘             └──────────────┘
           │                               │                               │
           ▼                               │                               ▼
    removeQuizFromIndex()                  │                    removeQuizFromIndex()
           │                    ┌──────────┴──────────┐                    │
           │                    │                     │                    │
           │                    ▼                     ▼                    │
           │           generateTags()         addQuizToIndex()             │
           │                    │                     │                    │
           │                    ▼                     │                    │
           │         ┌─────────────────────┐         │                    │
           │         │ tagStatus =         │  ◄── NEW v4.1                │
           │         │ 'pending_review'    │                              │
           │         └─────────────────────┘                              │
           │                    │                     │                    │
           │                    └──────────┬──────────┘                    │
           │                               │                               │
           └───────────────────────────────┼───────────────────────────────┘
                                           ▼
                         ┌─────────────────────────────────┐
                         │      Admin Review Panel         │  ◄── NEW v4.1
                         │  ┌─────────────────────────┐    │
                         │  │ reviewTags() function   │    │
                         │  │ - approve               │    │
                         │  │ - reject                │    │
                         │  │ - modify                │    │
                         │  └─────────────────────────┘    │
                         └─────────────────────────────────┘
```

**NEW v4.1 - Tag Quality Control:**

| Function | Description |
|----------|-------------|
| `tagStatus` field | `'pending_review'` / `'approved'` / `'rejected'` |
| `reviewTags()` | Admin approve/reject/modify auto-generated tags |
| `getPendingTagReviews()` | List quizzes with pending tag review |
| `tag_reviews` collection | Audit log of all tag reviews |

**Các trường hợp xử lý:**

| Event | Action | Tag Status |
|-------|--------|------------|
| Quiz deleted | `removeQuizFromIndex()` | - |
| Quiz approved | `addQuizToIndex()` + `generateTags()` | `pending_review` |
| Quiz un-approved | `removeQuizFromIndex()` | - |
| Admin approves tags | Update `tagStatus: 'approved'` | `approved` |
| Admin rejects tags | Remove auto-tags, clear from index | `rejected` |
| Admin modifies tags | Update with new tags | `approved` |

---

## 📦 Index Storage

**Location:** `gs://datn-quizapp.firebasestorage.app/rag/indices/vector-index.json`

**Schema:**
```typescript
interface VectorIndex {
  version: string;        // "4.0.0"
  updatedAt: string;      // ISO timestamp
  totalChunks: number;    // 31
  totalQuizzes: number;   // 10
  chunks: Array<{
    chunkId: string;      // "quiz_abc123_0"
    quizId: string;       // "abc123"
    title: string;        // "JavaScript Basics"
    text: string;         // Content chunk
    embedding: number[];  // 768 dimensions
    metadata: {
      category: string;
      difficulty: string;
      tags: string[];
      summary: string;
    }
  }>;
}
```

---

## 🔧 Configuration

```typescript
// optimizedRAG.ts - CONFIG object (v4.1 Enhanced)
const CONFIG = {
  // Search
  VECTOR_TOP_K: 10,
  FINAL_TOP_K: 5,
  BM25_WEIGHT: 0.4,
  VECTOR_WEIGHT: 0.6,
  
  // AI Models
  CHAT_MODEL: 'gemini-2.5-flash-lite',
  EMBEDDING_MODEL: 'text-embedding-004',
  EMBEDDING_DIMENSION: 768,
  
  // Features
  ENABLE_AI_RERANK: true,
  ENABLE_LEARNING_PATH: true,
  USE_ORAMA_SEARCH: true,
  
  // Cache
  CACHE_TTL_MS: 300000, // 5 minutes
  
  // NEW v4.1: Intent Classification
  INTENT_CONFIDENCE_THRESHOLD: 0.65,  // Below this = unclear
  
  // NEW v4.1: Analytics
  ENABLE_ANALYTICS: true,
};
```

---

## 📊 Analytics & Monitoring (NEW v4.1)

**Firestore Collection:** `chatbot_analytics`

```typescript
interface AnalyticsEvent {
  type: 'intent_classification' | 'learning_path' | 'search' | 'error';
  userId?: string;
  question?: string;      // First 100 chars only
  intent?: UserIntent;
  confidence?: number;
  topic?: string;
  depth?: LearningDepth;
  quizCount?: number;
  processingTime?: number;
  timestamp: number;
  createdAt: Timestamp;
}

// Non-blocking logging
function logAnalytics(event: AnalyticsEvent): void {
  if (!CONFIG.ENABLE_ANALYTICS) return;
  
  firestore.collection('chatbot_analytics').add({
    ...event,
    createdAt: serverTimestamp(),
  }).catch(err => console.warn('Analytics failed:', err));
}
```

**Sample Analytics Queries:**

```sql
-- Most common intents
SELECT intent, COUNT(*) as count
FROM chatbot_analytics
WHERE type = 'intent_classification'
GROUP BY intent
ORDER BY count DESC

-- Average processing time by intent
SELECT intent, AVG(processingTime) as avg_time
FROM chatbot_analytics
WHERE type = 'learning_path'
GROUP BY intent

-- Low confidence questions (needs improvement)
SELECT question, confidence
FROM chatbot_analytics
WHERE confidence < 0.65
ORDER BY timestamp DESC
LIMIT 50
```

---

## ✅ Checklist Hoàn Thành (v4.1)

| Giai đoạn | Tính năng | Status |
|-----------|-----------|--------|
| GĐ1 | Orama DB + Hybrid Search | ✅ |
| GĐ1 | Multi-hop Retrieval | ✅ |
| GĐ1 | Alternative Resources for missing topics | ✅ NEW v4.1 |
| GĐ2 | Router Agent (6 intents) | ✅ Enhanced v4.1 |
| GĐ2 | Help/Support intent | ✅ NEW v4.1 |
| GĐ2 | Unclear intent + Clarifying question | ✅ NEW v4.1 |
| GĐ3 | Planner Agent (Learning Plan) | ✅ |
| GĐ3 | Depth customization (basic/advanced/expert) | ✅ NEW v4.1 |
| GĐ3 | Save plan to Firestore | ✅ NEW v4.1 |
| GĐ4 | Auto-Tagging Trigger | ✅ |
| GĐ4 | Remove from Index on Delete | ✅ |
| GĐ4 | Tag Quality Control (pending_review) | ✅ NEW v4.1 |
| GĐ4 | Admin reviewTags() function | ✅ NEW v4.1 |
| GĐ4 | getPendingTagReviews() function | ✅ NEW v4.1 |
| GĐ5 | Synthesizer + Gap Detection | ✅ |
| GĐ5 | Suggested follow-up questions | ✅ NEW v4.1 |
| - | Analytics Logging (chatbot_analytics) | ✅ NEW v4.1 |
| - | Cleanup unused code | ✅ |

---

## 📝 Files Structure (v4.1 Updated)

```
functions/src/
├── rag/
│   ├── ask.ts                    # Entry point (callable function)
│   ├── optimizedRAG.ts           # Main RAG pipeline (Router, Planner, Synthesizer) - UPDATED v4.1
│   ├── autoTagging.ts            # Firestore trigger + Tag Review functions - UPDATED v4.1
│   ├── oramaEngine.ts            # Orama DB hybrid search engine
│   └── buildIndex.ts             # Manual index rebuild
├── lib/
│   ├── gemini.ts                 # AI model initialization
│   └── ... (other utilities)
└── index.ts                      # Firebase exports - UPDATED v4.1
```

**New Functions Exported (v4.1):**
- `reviewTags` - Admin approve/reject/modify tags
- `getPendingTagReviews` - List quizzes pending tag review

**New Firestore Collections (v4.1):**
- `chatbot_analytics` - User behavior analytics
- `learningPlans` - Saved learning plans
- `system/rag-logs/tag_reviews` - Tag review audit log

---

## 🚀 Next Steps

1. **Deploy to Production:**
   ```bash
   firebase deploy --only functions
   ```

2. **Test New Features:**
   - Test Help: "Chatbot này làm được gì?"
   - Test Unclear: "ok" → should ask clarifying question
   - Test Depth: "Tôi muốn học JavaScript nâng cao"
   - Test Tag Review: Call `getPendingTagReviews()` in admin panel

3. **Monitor Analytics:**
   - Firebase Console → Firestore → `chatbot_analytics`
   - Check intent distribution
   - Find low-confidence questions to improve

4. **Admin Panel Integration:**
   - Add UI for `getPendingTagReviews()`
   - Add buttons to call `reviewTags({ quizId, action: 'approve' | 'reject' | 'modify' })`

---

*Báo cáo cập nhật: 2025-11-26*
*Version: Master Plan v4.1 - Enhanced with Quality Control & Analytics*
