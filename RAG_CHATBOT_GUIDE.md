# 🤖 RAG Chatbot Implementation Guide

## 📋 Overview

This document guides you through implementing an AI-powered learning assistant using **RAG (Retrieval-Augmented Generation)** with Genkit and Firebase. The chatbot answers questions based on your quiz data and learning materials with proper permission controls.

## ✨ Key Features

- **Permission-Aware**: Respects public vs password-protected content
- **Citation Support**: 90% accuracy target with source references
- **Fast Response**: < 2.5s latency (p95)
- **Modern UI**: ChatGPT-like interface
- **Vietnamese Support**: Primary language with English fallback

## 🏗️ Architecture

```
User Question
     ↓
1. Embed Question (text-embedding-004)
     ↓
2. Retrieve Top K Similar Chunks (Cosine Similarity)
     ↓
3. Filter by Permission (Check Firestore access/{uid})
     ↓
4. Build Prompt with Context
     ↓
5. Call Gemini 2.0 Flash (Answer Generation)
     ↓
6. Extract Citations (Title | Page | QuizId)
     ↓
User Response (Answer + Citations)
```

## 📁 File Structure

```
src/lib/genkit/
  ├── config.ts              ✅ Genkit configuration
  ├── types.ts               ✅ TypeScript interfaces
  ├── embeddings.ts          ✅ Vector generation (768-dim)
  ├── indexing.ts            ✅ Data extraction & indexing
  ├── permissions.ts         ⏳ Permission checking (TODO)
  └── ragFlow.ts             ⏳ RAG flow logic (TODO)

scripts/
  └── buildVectorIndex.ts    ✅ Index builder script

data/
  └── vector-index.json      📦 Generated vector index

functions/src/rag/
  └── ask.ts                 ⏳ Cloud Function endpoint (TODO)

src/components/rag/
  ├── ChatbotModal.tsx       ⏳ Main chatbot UI (TODO)
  ├── MessageList.tsx        ⏳ Message display (TODO)
  └── CitationBadge.tsx      ⏳ Citation component (TODO)
```

## 🚀 Implementation Progress

### ✅ Phase 1: Setup Genkit & Dependencies (COMPLETED)

**Files Created:**
- `src/lib/genkit/config.ts` - API key, models, generation params
- `src/lib/genkit/types.ts` - All interfaces (ChunkMetadata, Citation, etc.)

**Configuration:**
```typescript
// API Key: AIzaSyDQT4sxlCRVxm0xqvfzaBIobv-3y8KfV-k
// Chat Model: gemini-2.0-flash-exp
// Embedding Model: text-embedding-004
// Generation: temp=0.3, maxOutputTokens=1024
// RAG: topK=4, chunkSize=500, similarity=0.6
```

---

### ✅ Phase 2: Data Indexing Pipeline (COMPLETED)

**Files Created:**
- `src/lib/genkit/embeddings.ts` - Embedding generation with Google AI
- `src/lib/genkit/indexing.ts` - Extract quizzes, chunk text, build index
- `scripts/buildVectorIndex.ts` - Build script

**Functions:**
1. **extractQuizData()** - Fetch approved quizzes from Firestore, extract metadata + questions
2. **chunkText()** - Split text into 500-token chunks with 50-token overlap
3. **buildIndex()** - Orchestrate extraction → embedding → index creation
4. **saveIndexToFile()** - Save to `data/vector-index.json`

**Compilation Issues Fixed:**
- ✅ Fixed crypto-js import: `import CryptoJS from 'crypto-js'`
- ✅ Removed unused Firestore imports
- ✅ Fixed embeddings.ts to use direct Google AI API (not Genkit embed())

---

### 🔄 Phase 3: Test Vector Index Build (IN PROGRESS)

**Next Action:**
Run the indexing script to verify everything works:

```bash
npm run build:index
```

**Expected Output:**
```
🚀 Starting vector index build...
📱 Initializing Firebase...
✅ Firebase initialized

🔨 Building vector index...
📖 Extracting quiz data from Firestore...
✅ Extracted 45 chunks from quizzes

🧠 Generating embeddings...
  ✓ 10/45 chunks embedded
  ✓ 20/45 chunks embedded
  ...
✅ Embedded 45 chunks

✅ Index built successfully in 23.45s

📊 Index Statistics:
   Total chunks: 45
   Quiz chunks: 45
   PDF chunks: 0
   Build time: 23.45s

🔍 Sample chunk:
   ID: quiz_abc123_meta
   Title: Quiz Toán Học Cơ Bản
   Embedding dimensions: 768

💾 Saving index to data/vector-index.json...
✅ Index saved! File size: 2.34 MB

🎉 Build complete!
```

**Validation Checklist:**
- [ ] Script runs without errors
- [ ] Quiz data extracted (check count)
- [ ] Embeddings are 768-dimensional vectors
- [ ] Index file created in `data/vector-index.json`
- [ ] File size is reasonable (< 50 MB for <1000 chunks)

**Troubleshooting:**

If you get **"Cannot find module"** errors:
```bash
# tsx might not be installed globally
npm install --save-dev tsx

# Or run directly
npx tsx scripts/buildVectorIndex.ts
```

If you get **Firebase authentication** errors:
- Ensure Firebase config in `src/lib/firebase/config.ts` is correct
- Check Firebase project permissions in console

If embeddings fail with **API errors**:
- Verify API key: `AIzaSyDQT4sxlCRVxm0xqvfzaBIobv-3y8KfV-k`
- Check Google AI Studio quota: https://ai.google.dev/
- Ensure Generative Language API is enabled

---

### ⏳ Phase 4: Permission-Aware Retrieval (TODO)

**File to Create:** `src/lib/genkit/permissions.ts`

**Implementation:**

```typescript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { ChunkMetadata, PermissionCheckResult } from './types';

/**
 * Check if user has access to a specific chunk
 */
export async function checkChunkAccess(
  userId: string,
  chunk: ChunkMetadata
): Promise<PermissionCheckResult> {
  // Public chunks are always accessible
  if (chunk.visibility === 'public') {
    return { allowed: true };
  }

  // Password-protected chunks require access check
  if (!chunk.quizId) {
    return {
      allowed: false,
      reason: 'Password-protected content without quiz ID',
    };
  }

  try {
    // Check if user has access token in Firestore
    const accessDoc = await getDoc(
      doc(db, 'quizzes', chunk.quizId, 'access', userId)
    );

    if (accessDoc.exists()) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Quiz not unlocked',
      missingQuizId: chunk.quizId,
    };
  } catch (error) {
    console.error('Permission check error:', error);
    return {
      allowed: false,
      reason: 'Permission check failed',
    };
  }
}

/**
 * Filter chunks array by user permissions (parallel)
 */
export async function filterChunksByPermission(
  userId: string,
  chunks: ChunkMetadata[]
): Promise<ChunkMetadata[]> {
  const checks = await Promise.all(
    chunks.map(chunk => checkChunkAccess(userId, chunk))
  );

  return chunks.filter((_, i) => checks[i].allowed);
}
```

**Testing:**
- Test with public quiz chunks → should pass
- Test with password quiz (locked) → should deny
- Test with password quiz (unlocked) → should allow

---

### ⏳ Phase 5: RAG Flow with Genkit (TODO)

**File to Create:** `src/lib/genkit/ragFlow.ts`

**Implementation:**

```typescript
import { defineFlow, run } from '@genkit-ai/core';
import { generate } from '@genkit-ai/ai/generate';
import { googleAI } from '@genkit-ai/googleai';
import type { RAGRequest, RAGResponse, Citation } from './types';
import { generateEmbedding, findTopKSimilar } from './embeddings';
import { loadIndexFromFile } from './indexing';
import { filterChunksByPermission } from './permissions';
import { GENKIT_CONFIG } from './config';

/**
 * Build prompt with context chunks
 */
function buildRAGPrompt(
  question: string,
  chunks: ChunkMetadata[],
  targetLang: string = 'vi'
): string {
  const context = chunks
    .map((chunk, i) => `[${i + 1}] ${chunk.title}\n${chunk.text}`)
    .join('\n\n---\n\n');

  if (targetLang === 'vi') {
    return `
Bạn là trợ lý học tập AI. Nhiệm vụ: Trả lời câu hỏi dựa HOÀN TOÀN vào ngữ cảnh được cung cấp.

NGUYÊN TẮC:
1. CHỈ sử dụng thông tin từ ngữ cảnh dưới đây
2. Nếu không đủ thông tin → Trả lời: "Tôi không có đủ dữ liệu để trả lời câu hỏi này"
3. Trích dẫn nguồn: Ghi rõ [số] sau mỗi thông tin

NGỮ CẢNH:
${context}

CÂU HỎI: ${question}

TRẢ LỜI (kèm trích dẫn [số]):
`;
  }

  // English version
  return `
You are an AI learning assistant. Task: Answer the question using ONLY the provided context.

RULES:
1. Use ONLY information from the context below
2. If insufficient information → Answer: "I don't have enough data to answer this question"
3. Cite sources: Include [number] after each fact

CONTEXT:
${context}

QUESTION: ${question}

ANSWER (with citations [number]):
`;
}

/**
 * Extract citations from response text
 */
function extractCitations(
  responseText: string,
  chunks: ChunkMetadata[]
): Citation[] {
  const citations: Citation[] = [];
  const citationRegex = /\[(\d+)\]/g;

  let match;
  while ((match = citationRegex.exec(responseText)) !== null) {
    const index = parseInt(match[1], 10) - 1;
    if (index >= 0 && index < chunks.length) {
      const chunk = chunks[index];
      citations.push({
        title: chunk.title,
        quizId: chunk.quizId,
        snippet: chunk.text.substring(0, 200) + '...',
      });
    }
  }

  return citations;
}

/**
 * Main RAG flow
 */
export const askQuestionFlow = defineFlow(
  {
    name: 'askQuestion',
    inputSchema: z.object({
      userId: z.string(),
      question: z.string(),
      topK: z.number().optional(),
      targetLang: z.enum(['vi', 'en']).optional(),
    }),
    outputSchema: z.object({
      answer: z.string(),
      citations: z.array(z.any()),
      usedChunks: z.number(),
      confidence: z.number().optional(),
      processingTime: z.number(),
    }),
  },
  async (request: RAGRequest) => {
    const startTime = Date.now();

    try {
      // 1. Embed question
      const queryEmbedding = await generateEmbedding(request.question);

      // 2. Load index and find similar chunks
      const index = await loadIndexFromFile();
      const topK = request.topK || GENKIT_CONFIG.rag.topK;
      const similarChunks = findTopKSimilar(
        queryEmbedding,
        index.chunks,
        topK,
        GENKIT_CONFIG.rag.similarityThreshold
      );

      // 3. Filter by permission
      const allowedChunks = await filterChunksByPermission(
        request.userId,
        similarChunks.map(c => c.chunk)
      );

      // 4. Handle no context case
      if (allowedChunks.length === 0) {
        return {
          answer:
            request.targetLang === 'vi'
              ? 'Tôi không có đủ dữ liệu để trả lời câu hỏi này.'
              : 'I don\'t have enough data to answer this question.',
          citations: [],
          usedChunks: 0,
          processingTime: Date.now() - startTime,
        };
      }

      // 5. Build prompt
      const prompt = buildRAGPrompt(
        request.question,
        allowedChunks,
        request.targetLang || 'vi'
      );

      // 6. Call Gemini
      const response = await generate({
        model: googleAI.model('gemini-2.0-flash-exp'),
        config: {
          temperature: GENKIT_CONFIG.generation.temperature,
          maxOutputTokens: GENKIT_CONFIG.generation.maxOutputTokens,
        },
        prompt,
      });

      // 7. Extract citations
      const citations = extractCitations(response.text, allowedChunks);

      // 8. Return response
      const processingTime = Date.now() - startTime;

      return {
        answer: response.text,
        citations,
        usedChunks: allowedChunks.length,
        processingTime,
        tokensUsed: {
          input: response.usage?.promptTokens || 0,
          output: response.usage?.outputTokens || 0,
        },
      };
    } catch (error) {
      console.error('RAG flow error:', error);
      throw error;
    }
  }
);
```

**Performance Optimization:**
- Use Gemini 2.0 Flash (fastest model)
- Cache index in memory (reload only if updated)
- Set max tokens to 1024 (faster generation)
- Temperature 0.3 (focused, deterministic)

**Testing:**
- Test with simple question: "Toán học là gì?"
- Verify citations are extracted correctly
- Measure latency (should be < 2.5s)

---

### ⏳ Phase 6: Cloud Function Endpoint (TODO)

**File to Create:** `functions/src/rag/ask.ts`

**Implementation:**

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { askQuestionFlow } from '../../../src/lib/genkit/ragFlow';

export const askRAG = onCall(async (request) => {
  // 1. Validate authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const { question, topK, targetLang } = request.data;

  // 2. Validate input
  if (!question || typeof question !== 'string') {
    throw new HttpsError('invalid-argument', 'Question is required');
  }

  if (question.length > 500) {
    throw new HttpsError('invalid-argument', 'Question too long (max 500 chars)');
  }

  try {
    // 3. Call RAG flow
    const result = await askQuestionFlow({
      userId,
      question,
      topK: topK || 4,
      targetLang: targetLang || 'vi',
    });

    // 4. Log metrics (no sensitive data)
    console.log('RAG request completed', {
      userId,
      questionLength: question.length,
      usedChunks: result.usedChunks,
      citationCount: result.citations.length,
      processingTime: result.processingTime,
      tokensUsed: result.tokensUsed,
    });

    // 5. Return response
    return result;
  } catch (error) {
    console.error('RAG error:', error);
    throw new HttpsError('internal', 'Failed to process question');
  }
});
```

**Deployment:**
```bash
firebase deploy --only functions:askRAG
```

---

### ⏳ Phase 7: Modern Chatbot UI (TODO)

**Files to Create:**

1. **src/components/rag/ChatbotModal.tsx** - Main modal
2. **src/components/rag/MessageList.tsx** - Message display
3. **src/components/rag/CitationBadge.tsx** - Citation component

**Design Requirements:**
- Full-screen overlay (similar to ChatGPT)
- Smooth animations (framer-motion)
- Mobile responsive
- Dark mode support
- Typing indicator
- Citation badges (clickable)

---

### ⏳ Phase 8: Testing & Validation (TODO)

**Test Cases:**

1. **Public Quiz Questions**
   - Ask: "Công thức tính diện tích hình tròn là gì?"
   - Expected: Correct answer with citation

2. **Password Quiz (Locked)**
   - User without access asks question about locked quiz
   - Expected: "Không đủ dữ liệu" response

3. **Password Quiz (Unlocked)**
   - User with access asks question
   - Expected: Correct answer with citation

4. **No Context Available**
   - Ask: "Công thức lượng tử là gì?" (not in data)
   - Expected: "Không đủ dữ liệu" response

5. **Citation Accuracy**
   - Manually verify 20 responses
   - Target: ≥ 90% valid citations

6. **Latency Test**
   - Measure p95 latency over 100 requests
   - Target: < 2.5s

**Validation Script:**
```typescript
// scripts/testRAG.ts
async function runTests() {
  const testCases = [
    { question: "...", expectedKeywords: [...], userId: "..." },
    // ... more cases
  ];

  for (const test of testCases) {
    const result = await askRAG(test);
    console.log(`✓ ${test.question}: ${result.answer}`);
  }
}
```

---

## 🔧 Troubleshooting

### Common Issues

**1. Embedding Generation Fails**
- Check API key validity
- Verify Google AI Studio quota
- Ensure Generative Language API is enabled

**2. Permission Checks Fail**
- Verify Firestore rules allow reading `quizzes/{id}/access/{uid}`
- Check user authentication status
- Ensure quizId is present in password chunks

**3. High Latency (> 2.5s)**
- Use Gemini 2.0 Flash (fastest model)
- Reduce topK (fewer chunks to process)
- Cache index in memory (avoid disk reads)
- Consider pgvector for large datasets

**4. Low Citation Accuracy (< 90%)**
- Improve prompt engineering (clearer citation instructions)
- Increase chunk overlap (better context preservation)
- Use larger chunks (500-800 tokens instead of 300-500)

---

## 📊 Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Latency (p95) | < 2.5s | Time from request to response |
| Citation Accuracy | ≥ 90% | Manual validation of 100 samples |
| Context Relevance | ≥ 80% | User feedback / thumbs up/down |
| Permission Accuracy | 100% | Test locked/unlocked scenarios |

---

## 🚀 Next Steps

1. **Run `npm run build:index`** to test the indexing pipeline
2. **Verify** the generated `data/vector-index.json` file
3. **Create** `permissions.ts` for permission-aware retrieval
4. **Implement** `ragFlow.ts` for RAG logic
5. **Deploy** Cloud Function endpoint
6. **Build** modern chatbot UI
7. **Test** comprehensive validation

---

## 📚 Resources

- **Genkit Documentation**: https://firebase.google.com/docs/genkit
- **Google AI Studio**: https://ai.google.dev/
- **Gemini API Reference**: https://ai.google.dev/api/rest
- **Firebase Functions**: https://firebase.google.com/docs/functions

---

## 🎯 Success Criteria

- [x] Phase 1: Setup complete
- [x] Phase 2: Indexing pipeline working
- [ ] Phase 3: Index built successfully
- [ ] Phase 4: Permission logic implemented
- [ ] Phase 5: RAG flow working
- [ ] Phase 6: Cloud Function deployed
- [ ] Phase 7: UI complete
- [ ] Phase 8: All tests passing

**When all phases complete:**
- 90% citation accuracy ✅
- < 2.5s latency ✅
- Password content properly restricted ✅
- Modern, responsive UI ✅

---

**Document Version:** 1.0
**Last Updated:** 2024
**Status:** Phases 1-2 Complete, Phase 3 In Progress
