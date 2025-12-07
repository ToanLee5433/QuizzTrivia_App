# 🤖 RAG Chatbot System v4.3.1 - Technical Report

> **Ngày cập nhật:** December 7, 2025  
> **Version:** 4.3.1  
> **Status:** ✅ Production Ready (MVP+)

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Security & Stability Fixes (v4.3)](#security--stability-fixes-v43)
5. [v4.3.1 Improvements](#v431-improvements)
6. [API Reference](#api-reference)
7. [Configuration Guide](#configuration-guide)
8. [Performance Optimization](#performance-optimization)
9. [Known Limitations & Workarounds](#known-limitations--workarounds)
10. [Planned Improvements](#planned-improvements)
11. [Deployment Checklist](#deployment-checklist)
12. [Troubleshooting](#troubleshooting)

---

## 🎯 Executive Summary

### Tổng quan
RAG Chatbot là hệ thống AI Learning Assistant sử dụng kiến trúc **Retrieval-Augmented Generation** để trả lời câu hỏi và gợi ý quiz phù hợp cho người dùng.

### Công nghệ chính
| Component | Technology | Notes |
|-----------|------------|-------|
| AI Model | Google Gemini 2.5 Flash Lite | Fast response, large context window |
| Embedding | gemini-embedding-001 (768 dim) | ✅ Latest stable model (Dec 2025), supports task types |
| Search Engine | Orama (Hybrid Vector + BM25) | ⚠️ Migrate to Firestore Vector Search for production |
| Backend | Firebase Cloud Functions Gen 2 | Memory: 512MB+ recommended (256MB may cause OOM) |
| Database | Firestore + RTDB | RTDB for rate limiting only |
| Storage | Firebase Storage | Index file storage (legacy) |

### Các tính năng chính
- ✅ Multi-Agent System (Router, Planner, Synthesizer)
- ✅ Contextual Query Rewriting (v4.2)
- ✅ Hybrid Search (Vector + Keyword + BM25)
- ✅ Learning Path Generation
- ✅ Distributed Rate Limiting via RTDB (v4.3)
- ✅ AI Timeout Protection (v4.3 → 15s)
- ✅ Index Validation (v4.3)
- ✅ Vietnamese Tokenization Preprocessing (v4.3.1)
- ✅ Scheduled RTDB Cleanup (v4.3.1)
- ✅ Conversation History Pairs (v4.3.1)

---

## 🏗️ System Architecture

### High-Level Flow
```
┌─────────────────────────────────────────────────────────────────┐
│  Client (ChatbotModal.tsx)                                      │
│  └─ httpsCallable('askRAG')                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cloud Function: askRAG (ask.ts)                                │
│  ├─ 1. Authentication Check                                     │
│  ├─ 2. Distributed Rate Limiting (RTDB)                        │
│  ├─ 3. Input Validation                                         │
│  ├─ 4. AI Timeout Protection (15s) ← v4.3.1                    │
│  └─ 5. Call optimizedRAG.askQuestion()                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  RAG Engine (optimizedRAG.ts)                                   │
│  ├─ Step 0: Contextual Query Rewriting                         │
│  ├─ Step 1: Intent Classification (Router Agent)               │
│  │   ├─ quiz_search    → Vector Search                         │
│  │   ├─ quiz_browse    → Popular Quizzes                       │
│  │   ├─ learning_path  → Planner Agent                         │
│  │   ├─ fact_retrieval → Standard Search                       │
│  │   ├─ general_chat   → Direct AI Response                    │
│  │   ├─ help_support   → Help Message                          │
│  │   └─ unclear        → Clarifying Question                   │
│  ├─ Step 2: Hybrid Search (Orama + Vector)                     │
│  ├─ Step 3: AI Re-ranking (optional)                           │
│  └─ Step 4: Answer Generation                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Storage Layer                                                  │
│  ├─ Firebase Storage: rag/indices/vector-index.json            │
│  ├─ Firestore: quizzes collection                              │
│  └─ RTDB: /rateLimits/rag/{userId}                            │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Architecture
```
User Query + History
        │
        ▼
┌───────────────────┐
│  Query Rewriter   │ ← Viết lại câu hỏi mơ hồ
│  (contextualizeQuery)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Router Agent     │ ← Phân loại intent (7 nhóm)
│  (classifyIntent)
└─────────┬─────────┘
          │
    ┌─────┴─────┬────────┬────────┐
    ▼           ▼        ▼        ▼
┌───────┐  ┌────────┐ ┌──────┐ ┌──────┐
│Search │  │Planner │ │Browse│ │Chat  │
│Agent  │  │Agent   │ │Agent │ │Agent │
└───┬───┘  └───┬────┘ └──┬───┘ └──┬───┘
    │          │         │        │
    └──────────┴─────────┴────────┘
                   │
                   ▼
          ┌───────────────┐
          │  Synthesizer  │ ← Tạo câu trả lời
          └───────────────┘
```

---

## 🧩 Core Components

### 1. ask.ts - Cloud Function Endpoint
**Path:** `functions/src/rag/ask.ts`  
**Lines:** ~330

| Function | Description |
|----------|-------------|
| `askRAG` | Main callable function |
| `checkRateLimitDistributed` | RTDB-based rate limiting |
| `cleanupOldRateLimits` | Cleanup expired entries |
| `validateQuestion` | Input validation |

**Cloud Function Config:**
```typescript
{
  region: 'us-central1',
  memory: '512MiB',        // ⚠️ 256MB causes OOM with large indexes
                           // Recommend: 512MB-1GB for production
  timeoutSeconds: 60,
  maxInstances: 20,
  secrets: ['GOOGLE_AI_API_KEY']
}
```

> **⚠️ Memory Warning (2025):** Node.js AI SDKs + JSON index loading require more RAM. 
> 256MB will cause frequent OOM errors. Upgrade to 512MB minimum, 1GB recommended.

### 2. optimizedRAG.ts - Core RAG Engine
**Path:** `functions/src/rag/optimizedRAG.ts`  
**Lines:** ~2280

> **⚠️ Code Smell (2025):** File 2280 dòng chứa cả Router, Planner, Search, Generation là **Monolithic**.
> Xu hướng 2025 là Micro-Agent architecture. Khó debug, khó scale.
> 
> **Refactor Plan (v4.5):**
> - `agents/router.ts` - Intent classification
> - `agents/planner.ts` - Learning path generation  
> - `services/searchService.ts` - Vector/hybrid search
> - `services/generationService.ts` - Answer synthesis

| Function | Description |
|----------|-------------|
| `askQuestion` | Main entry point |
| `contextualizeQuery` | Query rewriting với history |
| `classifyIntent` | Router Agent |
| `generateLearningPlan` | Planner Agent |
| `hybridSearch` | Vector + Keyword search |
| `vectorSearch` | Orama/Legacy search |
| `generateAnswer` | Synthesizer Agent |
| `validateVectorIndex` | Index validation |
| `loadVectorIndex` | Global cache management |

### 3. oramaEngine.ts - Search Engine
**Path:** `functions/src/rag/oramaEngine.ts`  
**Lines:** ~350

| Function | Description |
|----------|-------------|
| `initializeOramaFromIndex` | Initialize Orama DB |
| `oramaHybridSearch` | Vector + BM25 search |
| `oramaVectorSearch` | Vector-only search |
| `oramaKeywordSearch` | Keyword-only search |

### 4. hybridSearch.ts - Search Utilities
**Path:** `functions/src/lib/hybridSearch.ts`  
**Lines:** ~341

| Function | Description |
|----------|-------------|
| `rewriteQueryWithAI` | AI query expansion |
| `aiRerank` | AI re-ranking |
| `keywordSearch` | Exact match search |
| `reciprocalRankFusion` | RRF merge |
| `categorizeByConfidence` | Score categorization |

### 5. Client Components
**Path:** `src/components/rag/`

| Component | Description |
|-----------|-------------|
| `ChatbotModal.tsx` | Main chat UI |
| `ChatbotButton.tsx` | Floating button |
| `MessageList.tsx` | Message display |
| `QuizRecommendationCard.tsx` | Quiz cards |
| `TypingIndicator.tsx` | Loading animation |
| `CitationBadge.tsx` | Source citations |

---

## 🛡️ Security & Stability Fixes (v4.3)

### 1. Distributed Rate Limiting (CRITICAL FIX)

**Problem:** In-memory rate limiting không work với multiple Cloud Function instances.

**Solution:** Migrated to RTDB-based distributed rate limiting.

```typescript
// RTDB Structure
/rateLimits/rag/{userId}: {
  count: number,      // Request count in window
  resetTime: number,  // Window reset timestamp
  lastRequest: number // Last request timestamp
}
```

**Features:**
- ✅ Atomic transactions với `userRef.transaction()`
- ✅ Auto-cleanup entries cũ hơn 2 minutes
- ✅ Graceful degradation khi RTDB fail
- ✅ Transaction committed check
- ✅ Null data safety check

**Config:**
```typescript
const RATE_LIMIT_CONFIG = {
  maxRequests: 20,      // 20 requests
  windowMs: 60 * 1000,  // per 1 minute
};
```

**RTDB Rules:**
```json
{
  "rateLimits": {
    "rag": {
      "$userId": {
        ".read": false,
        ".write": false
      },
      ".indexOn": ["resetTime"]
    }
  }
}
```

### 2. AI Timeout Protection (HIGH FIX)

**Problem:** AI calls có thể hang indefinitely, block resources. 30s là quá lâu cho UX.

**Solution:** Promise.race với **15s** timeout (giảm từ 30s).

```typescript
// v4.3.1: Reduced from 30s to 15s for better UX
// Users typically leave after 8-10s without response
const AI_TIMEOUT_MS = 15000;

const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => {
    reject(new functions.https.HttpsError(
      'deadline-exceeded',
      'Request timed out. Please try a simpler question.'
    ));
  }, AI_TIMEOUT_MS);
});

const result = await Promise.race([
  askQuestion({ ... }),
  timeoutPromise,
]);
```

### 3. Index Validation (HIGH FIX)

**Problem:** Corrupt/malformed index có thể crash system.

**Solution:** Validate index trước khi load với ngưỡng nghiêm ngặt.

```typescript
function validateVectorIndex(index: any): IndexValidationResult {
  // Check basic structure
  if (!index.version || !Array.isArray(index.chunks)) {
    return { isValid: false, error: '...' };
  }
  
  // Sample validation (20 chunks)
  // Check: chunkId/id, text, embedding, dimension
  
  // ⚠️ STRICT: Fail if >5% invalid (production standard)
  // Rationale: 40% corrupt data = chatbot answers wrong half the time
  if (invalidRatio > 0.05) {
    return { isValid: false, error: 'Index corruption > 5%, requires rebuild' };
  }
  
  return { isValid: true, stats: { ... } };
}
```

> **⚠️ Production Note:** Ngưỡng 50% (v4.3 cũ) là quá lỏng. Đã siết xuống **5%** cho production.
> Nếu index hỏng > 5%, từ chối load và alert Admin ngay.

**Validates:**
- ✅ Index version field
- ✅ Chunks array structure
- ✅ chunkId OR id field
- ✅ text field presence
- ✅ embedding array (768 dimensions)
- ✅ Embedding values are numbers
- ✅ **v4.3.1:** Try-catch for JSON.parse to handle corrupted files
- ✅ **v4.3.1:** Strict 5% threshold (was 50%)

---

## 🆕 v4.3.1 Improvements

### 1. Scheduled RTDB Cleanup (Architecture Fix)

**Problem:** Probabilistic cleanup (5% chance) trong user request path gây latency cho user "xui".

**Solution:** Chuyển sang Cloud Scheduler chạy định kỳ.

```typescript
// Cloud Function chạy mỗi 5 phút via Cloud Scheduler
export const cleanupRateLimitsScheduled = functions
  .region('us-central1')
  .pubsub.schedule('every 5 minutes')
  .onRun(async () => {
    await cleanupOldRateLimits();
    return null;
  });
```

**Benefits:**
- ✅ Không impact user latency
- ✅ Đảm bảo cleanup chạy đều đặn (không phụ thuộc traffic)
- ✅ Dễ monitor và debug

### 2. Conversation History Pairs (Logic Fix)

**Problem:** Lấy 5 messages (số lẻ) có thể cắt context giữa chừng (user hỏi mà mất answer trước đó).

**Solution:** Đảm bảo history luôn là số chẵn (pairs of user-assistant).

```typescript
// v4.3.1: Ensure even number of messages (pairs)
if (validatedHistory.length % 2 !== 0) {
  validatedHistory = validatedHistory.slice(1); // Remove oldest to make even
}
validatedHistory = validatedHistory.slice(-6); // Max 3 pairs
```

### 3. Vietnamese Tokenization Preprocessing

**Problem:** Orama BM25 không support Vietnamese tokenization → search kém với từ ghép tiếng Việt.

**Solution:** Thêm preprocessing layer cho Vietnamese text.

```typescript
// Compound words mapping
const VIETNAMESE_COMPOUNDS = new Map([
  ['lập trình', 'laptrinh'],
  ['cơ sở dữ liệu', 'cosodulidulieu'],
  ['trí tuệ nhân tạo', 'trituenhantao'],
  ['học máy', 'hocmay'],
  // ... 30+ compounds
]);

// Preprocessing function
function preprocessVietnameseText(text: string) {
  return {
    original: text,
    normalized: lower,
    noDiacritics: removeVietnameseDiacritics(lower),
    compounds: replaceCompounds(lower),
    ngrams: generateVietnameseNgrams(lower),
  };
}

// Enhanced keyword extraction
function extractVietnameseKeywords(text: string): string[] {
  // Basic keywords + compound versions + no-diacritics fallback
}
```

> **⚠️ WORKAROUND (Temporary Solution):**  
> 30 từ ghép hard-coded chỉ giải quyết đúng 30 trường hợp đó. 
> Gặp từ mới như "trí tuệ nhân tạo tạo sinh" (GenAI) có thể tách sai.
>
> **Production Recommendation (v4.5):**
> - Tích hợp `underthesea-js` hoặc `vntk` (optimized 2025 version)
> - Hoặc dùng Vietnamese Word Segmentation API nếu latency cho phép (<50ms)
> - Năm 2025, các thư viện này đã rất nhẹ và chính xác

**Features:**
- ✅ 30+ compound word mappings (tech, education, subjects)
- ✅ N-gram generation for fuzzy matching
- ✅ No-diacritics fallback matching
- ✅ Exported for use in Orama indexing
- ⚠️ **Limitation:** Hard-coded list, không cover từ mới

### 4. Safe JSON Parsing

**Problem:** Nếu file index bị lỗi JSON syntax, `JSON.parse` crash toàn function.

**Solution:** Try-catch riêng cho JSON.parse với error message cụ thể.

```typescript
let index: any;
try {
  index = JSON.parse(content.toString());
} catch (parseError) {
  console.error('❌ Index file has invalid JSON syntax:', parseError);
  console.error('Please rebuild the index using rebuildFullIndex function.');
  return null;
}
```

### 5. Raw Scores in API Response

**Problem:** Client không có raw scores để debug hoặc hiển thị UI bar.

**Solution:** Thêm `rawScores` và `confidenceScore` vào response.

```typescript
searchMetrics: {
  // ... existing fields
  rawScores?: number[];       // Individual chunk scores
  confidenceScore?: number;   // Numeric confidence (0-1)
}
```

### 6. Tunable Parameters Documentation

Updated CONFIG với notes về tuning cho Vietnamese:

```typescript
// Tunable: Start at 0.70, may need to lower for Vietnamese
FAST_PATH_THRESHOLD: 0.70,

// Tunable: Started at 0.65, Vietnamese may need lower (0.55-0.60)
INTENT_CONFIDENCE_THRESHOLD: 0.65,
```

---

## 📡 API Reference

### askRAG (Cloud Function)

**Request:**
```typescript
interface AskRAGRequest {
  question: string;           // Max 500 chars
  history?: ConversationMessage[];  // Max 6 messages (3 pairs)
  topK?: number;              // Default: 4, Max: 10
  targetLang?: 'vi' | 'en';   // Default: 'vi'
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;            // Max 500 chars each
}
```

**Response:**
```typescript
interface AskRAGResponse {
  success: boolean;
  data: {
    answer: string;
    citations: Array<{ title: string; quizId?: string }>;
    quizRecommendations?: QuizRecommendation[];
    usedChunks: number;
    processingTime: number;
    tokensUsed: { input: number; output: number };
    // v4.3.1: Gemini 2.5 usageMetadata for accurate billing
    usageMetadata?: {
      promptTokenCount: number;
      candidatesTokenCount: number;
      totalTokenCount: number;
    };
    searchMetrics: {
      fastPathUsed: boolean;
      avgScore: number;
      topScore: number;
      confidence: 'high' | 'medium' | 'low' | 'none';
      rawScores?: number[];       // v4.3.1: Individual chunk scores
      confidenceScore?: number;   // v4.3.1: Numeric confidence (0-1)
      queryRewritten?: boolean;
      originalQuery?: string;
    };
  };
}
```

> **💡 Gemini 2.5 Note:** Field `usageMetadata` là tính năng chuẩn của Gemini 2.5,
> cho phép track token usage chính xác hơn `tokensUsed` (estimated).

**Error Codes:**
| Code | Description |
|------|-------------|
| `unauthenticated` | User not logged in |
| `invalid-argument` | Invalid question format |
| `resource-exhausted` | Rate limit exceeded |
| `deadline-exceeded` | Request timeout (15s) |
| `internal` | Unknown server error |

---

## ⚙️ Configuration Guide

### Environment Variables

```bash
# Required
GOOGLE_AI_API_KEY=your-api-key

# Optional (with defaults)
RAG_USE_ORAMA=true                    # Use Orama search
RAG_FAST_PATH_THRESHOLD=0.70          # Fast path score threshold
RAG_MIN_RELEVANCE=0.40                # Minimum relevance score
RAG_VECTOR_TOP_K=10                   # Vector search results
RAG_FINAL_TOP_K=5                     # Final results count
RAG_ENABLE_RERANK=true                # Enable AI reranking
RAG_ENABLE_LEARNING_PATH=true         # Enable learning paths
RAG_MAX_SUBTOPICS=6                   # Max subtopics in plan
RAG_QUIZZES_PER_TOPIC=3               # Quizzes per topic
RAG_INTENT_CONFIDENCE=0.65            # Intent confidence threshold
RAG_ENABLE_ANALYTICS=true             # Enable analytics logging
RAG_LOG_SCORES=false                  # Log scores for tuning
```

### Firebase Rules

**database.rules.json:**
```json
{
  "rateLimits": {
    "rag": {
      "$userId": {
        ".read": false,
        ".write": false,
        "count": { ".validate": "newData.isNumber()" },
        "resetTime": { ".validate": "newData.isNumber()" },
        "lastRequest": { ".validate": "newData.isNumber()" }
      },
      ".indexOn": ["resetTime"]
    }
  }
}
```

---

## ⚡ Performance Optimization

### Caching Strategy

| Cache | TTL | Description |
|-------|-----|-------------|
| `globalVectorIndex` | 5 min | JSON index in memory |
| `globalOramaDB` | 5 min | Orama DB instance |
| `globalGenAI` | Persistent | AI client |

### Search Performance

| Method | Complexity | Use Case |
|--------|------------|----------|
| Orama Hybrid | O(log n) | Default search |
| Legacy Brute-force | O(n) | Fallback |
| Keyword Search | O(n) | Exact match |

### Latency Breakdown (typical)

| Step | Time |
|------|------|
| Rate Limit Check | 20-50ms |
| Index Load (cached) | <50ms |
| Index Load (cold) | 1-2s |
| Query Rewriting | 200-300ms |
| Intent Classification | 300-500ms |
| Vector Search | 100-200ms |
| AI Generation | 1-3s |
| **Total (warm)** | **2-4s** |
| **Total (cold)** | **3-6s** |

---

## ⚠️ Known Limitations

> **🚨 CRITICAL BOTTLENECK (2025):** Điểm yếu lớn nhất không còn nằm ở AI Model,
> mà ở **Kiến trúc dữ liệu (Legacy JSON Storage)** và **Cấu trúc code (Monolithic file)**.
> Với Gemini 2.5 Flash Lite phản hồi tính bằng mili-giây, việc mất 3-6s chỉ để load index 
> là **lãng phí hiệu năng của Model xịn**.

### 1. 🚨 Index Size (CRITICAL - Priority #1)
- **Root Cause**: Load file JSON vào RAM là kỹ thuật của năm 2023
- **Impact**: Cold start 3-6s, OOM với index >10MB
- **2025 Standard**: Firestore Vector Search (GA), Pinecone Serverless
- **Action Required**: Migrate ASAP - đây là blocker chính cho scale

```
Current Flow (Legacy):
Storage → Download JSON → Parse → RAM → Search
Latency: 1-2s cold, <50ms warm

Target Flow (2025):
Firestore Vector Search → Direct Query
Latency: <100ms always
```

### 2. Rate Limiting
- Window-based (không sliding window)
- All instances share RTDB quota
- **v4.3.1**: Sử dụng scheduled cleanup thay vì probabilistic

### 3. Query Rewriting
- Only triggers for short/ambiguous queries
- May not catch all context-dependent cases
- Depends on quality of conversation history

### 4. Vietnamese Search Quality
- Embedding model: gemini-embedding-001 (multilingual, better Vietnamese support)
- **v4.3.1**: Upgraded from text-embedding-004
- **v4.3.1**: N-gram tokenization workaround (2-3 grams)
- Orama BM25 không support Vietnamese natively

### 5. Cold Start Latency
- First request: 3-6s (loading index, initializing)
- **Mitigation**: minInstances: 1 (có phí)
- Warm request: 2-4s

### 6. AI Timeout
- **v4.3.1**: 15s timeout (giảm từ 30s)
- Complex learning plans may timeout
- Consider parallel processing for production

---

## 🚀 Planned Improvements (Roadmap)

> **Priority Focus:** Đập bỏ cơ chế load file JSON, chuyển sang Native Vector Search.

### Phase 1: Critical (v4.4) - ⏰ URGENT
| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| 🔴 P0 | **Firestore Vector Search** | Cold start 3-6s → <100ms | High |
| 🟠 P1 | **Refactor Monolithic** | Maintainability, debugging | Medium |
| ✅ ~~P2~~ | ~~**Upgrade Embedding**~~ | ✅ Done: gemini-embedding-001 | - |
| 🟡 P2 | **minInstances: 1** | Eliminate cold start | Config |
| 🟢 P3 | **Cloud Scheduler** | Automated RTDB cleanup | Low |

### Phase 2: Medium-term (v4.5)
- [ ] **Streaming responses**: Real-time generation display
- [ ] **Full Vietnamese tokenizer**: Integrate underthesea/vntk (2025 optimized)
- [ ] **Sliding window rate limiting**: More accurate throttling
- [ ] **Memory optimization**: Reduce from 512MB if using Vector Search

### Phase 3: Long-term (v5.0)
- [ ] **Multi-modal**: Image-based questions, diagram understanding
- [ ] **Agentic RAG**: Tool-use cho search, calculation
- [ ] **Personalization**: User learning style adaptation

---

## ✅ Deployment Checklist

### Pre-deployment
- [x] Set `GOOGLE_AI_API_KEY` secret
- [x] Deploy RTDB rules (`database.rules.json`)
- [x] Build index (`rebuildFullIndex`)
- [x] Test rate limiting locally
- [x] Verify embedding dimensions (768)
- [x] Build functions successfully (`npm run build`)

### Post-deployment
- [ ] Monitor Cloud Function logs
- [ ] Check RTDB `/rateLimits/rag` for entries
- [ ] Test from different users
- [ ] Verify 15s timeout behavior
- [ ] Check error rates in Firebase Console
- [ ] Deploy Cloud Scheduler for cleanup (optional)

### Commands
```bash
# Build
cd functions && npm run build

# Deploy functions
firebase deploy --only functions:askRAG,functions:askRAGHealth

# Deploy RTDB rules  
firebase deploy --only database

# Deploy scheduled cleanup (optional)
firebase deploy --only functions:cleanupRateLimitsScheduled

# Test locally
firebase emulators:start --only functions,database
```

---

## 🔧 Troubleshooting

### Error: Rate limit always passes

**Cause:** RTDB connection failed, falling back to allow.

**Fix:**
1. Check RTDB rules are deployed
2. Verify Admin SDK has RTDB access
3. Check Firebase project configuration

### Error: Index validation failed

**Cause:** Corrupt or outdated index file.

**Fix:**
1. Check Storage file exists: `rag/indices/vector-index.json`
2. Verify index structure matches schema
3. Rebuild index: call `rebuildFullIndex`

### Error: Request timeout

**Cause:** AI model taking too long.

**Fix:**
1. Simplify user query
2. Reduce topK parameter
3. Increase `AI_TIMEOUT_MS` (not recommended)
4. Check AI API quota

### Error: No quiz recommendations

**Cause:** 
1. Index empty or not built
2. No approved quizzes match query
3. Score threshold too high

**Fix:**
1. Rebuild index
2. Lower `RAG_MIN_RELEVANCE`
3. Add more quizzes to database

### Error: Orama search failed

**Cause:** Orama initialization error.

**Fix:**
1. Check index has valid embeddings
2. Verify embedding dimensions (768)
3. System falls back to brute-force (check logs)

---

## 📊 Metrics & Monitoring

### Key Metrics to Track
- Request count per user
- Rate limit hits
- Average processing time
- Timeout rate
- Intent distribution
- Search confidence levels

### Logging
All sensitive data is redacted in logs:
- User ID: `xxx12345...` (first 8 chars)
- Question: Length only
- No embeddings or full content logged

### Health Check
```typescript
// askRAGHealth endpoint
{
  status: 'healthy',
  timestamp: 1733584000000,
  version: '1.0.0'
}
```

---

## 📁 File Structure Summary

```
functions/src/
├── rag/
│   ├── ask.ts              # Cloud Function endpoint (v4.3)
│   ├── optimizedRAG.ts     # Core RAG engine
│   ├── oramaEngine.ts      # Orama search
│   ├── rebuildIndex.ts     # Index rebuilder
│   └── autoTagging.ts      # Auto-tagging trigger
├── lib/
│   └── hybridSearch.ts     # Search utilities

src/components/rag/
├── ChatbotModal.tsx        # Main UI
├── ChatbotButton.tsx       # Floating button
├── MessageList.tsx         # Message display
├── QuizRecommendationCard.tsx
├── TypingIndicator.tsx
├── CitationBadge.tsx
└── index.ts

database.rules.json         # RTDB rules (includes rateLimits)
```

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| v4.3 | Dec 7, 2025 | Distributed rate limiting, AI timeout, index validation |
| v4.2 | - | Contextual query rewriting |
| v4.1 | - | Enhanced intent classification, quiz browse |
| v4.0 | - | Multi-agent architecture |
| v3.0 | - | Learning path generation |
| v2.0 | - | Hybrid search (Orama) |
| v1.0 | - | Basic RAG implementation |

---

## 📞 Support

For issues or questions:
1. Check logs in Firebase Console
2. Review this documentation
3. Check `CHATBOT_TROUBLESHOOTING.md`
4. Contact development team

---

*Document generated: December 7, 2025*  
*RAG Chatbot v4.3 - QuizTrivia App*
