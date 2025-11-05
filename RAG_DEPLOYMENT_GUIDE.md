# 🚀 RAG Chatbot - Deployment Guide

## 📋 Quick Deployment Checklist

- [ ] Build vector index
- [ ] Test RAG flow locally
- [ ] Deploy Cloud Functions
- [ ] Add ChatbotButton to your app
- [ ] Test end-to-end
- [ ] Monitor performance

---

## 1️⃣ Build Vector Index

**Build the index from your quiz data:**

```bash
npm run build:index
```

**Expected output:**
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

✅ Index built successfully in 23.45s
💾 Index saved! File size: 2.34 MB
```

**Verify the index:**
```bash
# Check if file exists
ls -lh data/vector-index.json

# Check structure
cat data/vector-index.json | jq '.totalChunks'
cat data/vector-index.json | jq '.chunks[0].embedding | length'  # Should be 768
```

---

## 2️⃣ Test RAG Flow Locally

**Run test suite:**

```bash
npm run test:rag
```

**Expected output:**
```
🚀 Starting RAG Chatbot Test Suite
============================================================
Running tests...

🧪 Testing: Public Quiz Question
   Question: "Công thức tính diện tích hình tròn là gì?"
   ⏱️  Latency: 1850ms
   📚 Citations: 2
   📄 Chunks used: 3
   ✅ Test passed

...

📊 Test Results Summary
Total Tests: 4
✅ Passed: 4
❌ Failed: 0
⏱️  Average Latency: 1925ms
📚 Citation Accuracy: 95.0%

🎯 Performance Evaluation:
   ✅ Latency: PASS (target: < 2500ms)
   ✅ Citation Accuracy: PASS (target: ≥ 90%)

🎉 All tests passed! RAG chatbot is production-ready.
```

**Manual testing:**

```typescript
// In browser console or Node script
import { askQuestion } from './src/lib/genkit/ragFlow';

const result = await askQuestion({
  userId: 'your-test-user-id',
  question: 'Công thức toán học là gì?',
  targetLang: 'vi'
});

console.log(result);
```

---

## 3️⃣ Deploy Cloud Functions

**Build and deploy:**

```bash
# Navigate to functions directory
cd functions

# Install dependencies (if not done)
npm install

# Deploy RAG functions
firebase deploy --only functions:askRAG,functions:askRAGHealth

# Or deploy all functions
firebase deploy --only functions
```

**Expected output:**
```
✔  functions: Finished running predeploy script.
i  functions: preparing codebase functions for deployment
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
i  functions: uploading functions codebase...
✔  functions: uploaded codebase successfully

i  functions: creating function askRAG...
✔  functions[askRAG] Successful create operation.
✔  Deploy complete!

Functions URLs:
- askRAG: https://asia-southeast1-datn-quizapp.cloudfunctions.net/askRAG
- askRAGHealth: https://asia-southeast1-datn-quizapp.cloudfunctions.net/askRAGHealth
```

**Test the endpoint:**

```bash
# Test health check
curl https://asia-southeast1-datn-quizapp.cloudfunctions.net/askRAGHealth

# Expected response:
# {"status":"healthy","timestamp":1699999999999,"version":"1.0.0"}
```

---

## 4️⃣ Add ChatbotButton to Your App

**Option A: Add to main layout (recommended)**

```typescript
// src/App.tsx or src/layouts/MainLayout.tsx
import { ChatbotButton } from './components/rag';

function App() {
  return (
    <div>
      {/* Your existing app content */}
      
      {/* Add floating chatbot button */}
      <ChatbotButton />
    </div>
  );
}
```

**Option B: Add to specific pages**

```typescript
// src/pages/QuizDetail.tsx
import { ChatbotButton } from '../components/rag';

export function QuizDetail() {
  return (
    <div>
      {/* Page content */}
      
      {/* Chatbot for quiz-specific questions */}
      <ChatbotButton />
    </div>
  );
}
```

---

## 5️⃣ Connect ChatbotModal to Cloud Function

**Update `src/components/rag/ChatbotModal.tsx`:**

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

// Inside handleSendMessage function:
const functions = getFunctions();
const askRAG = httpsCallable(functions, 'askRAG');

try {
  const result = await askRAG({
    question: userMessage.content,
    topK: 4,
    targetLang: 'vi'
  });

  const data = result.data as { success: boolean; data: RAGResponse };

  if (data.success) {
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: data.data.answer,
      citations: data.data.citations,
      timestamp: Date.now(),
      usedChunks: data.data.usedChunks,
      processingTime: data.data.processingTime,
    };

    setMessages(prev => [...prev, assistantMessage]);
  }
} catch (error) {
  console.error('Error calling askRAG:', error);
  setError('Không thể kết nối với AI. Vui lòng thử lại sau.');
}
```

---

## 6️⃣ Test End-to-End

**Manual testing steps:**

1. **Open your app** (http://localhost:5173)
2. **Sign in** with a test account
3. **Click the chatbot button** (bottom-right corner)
4. **Ask a question** about a public quiz
5. **Verify the response:**
   - Answer is relevant
   - Citations are displayed
   - Response time < 2.5s
6. **Test password-protected content:**
   - Ask about a locked quiz
   - Should get "Quiz not unlocked" message
   - Unlock the quiz
   - Ask again - should get answer

**Browser console checks:**

```javascript
// Check if Cloud Function is called
// Open Network tab in DevTools
// Look for request to askRAG function
// Verify response structure
```

---

## 7️⃣ Monitor Performance

**Firebase Console:**

1. Go to Firebase Console → Functions
2. Click on `askRAG` function
3. Monitor:
   - Invocations count
   - Error rate
   - Execution time (should be < 2.5s avg)
   - Memory usage

**Custom logging:**

```typescript
// Cloud Function already logs:
// - Request metadata (no sensitive data)
// - Processing time
// - Citations count
// - Tokens used

// View logs:
firebase functions:log --only askRAG
```

**Set up alerts:**

```bash
# In Firebase Console → Functions → askRAG
# Set up alerts for:
# - Error rate > 5%
# - Average latency > 3s
# - Memory usage > 80%
```

---

## 8️⃣ Optimize Performance (if needed)

**If latency > 2.5s:**

1. **Reduce topK:**
   ```typescript
   // In GENKIT_CONFIG (src/lib/genkit/config.ts)
   rag: {
     topK: 3, // Reduce from 4 to 3
   }
   ```

2. **Cache index in memory:**
   ```typescript
   // In ragFlow.ts
   let cachedIndex: VectorIndex | null = null;
   
   async function getIndex(): Promise<VectorIndex> {
     if (!cachedIndex) {
       cachedIndex = await loadIndexFromFile();
     }
     return cachedIndex;
   }
   ```

3. **Use Cloud Storage for index:**
   - Upload index to Firebase Storage
   - Load from Storage instead of local file
   - Better for distributed functions

**If citation accuracy < 90%:**

1. **Improve prompts:**
   - Add more citation instructions
   - Use stricter formatting
   
2. **Increase chunk overlap:**
   ```typescript
   rag: {
     chunkOverlap: 100, // Increase from 50
   }
   ```

3. **Better chunking:**
   - Split by paragraphs instead of tokens
   - Preserve semantic boundaries

---

## 9️⃣ Production Checklist

Before going live:

- [ ] **Security:**
  - [ ] App Check enabled in Firebase Console
  - [ ] Rate limiting configured (20 req/min per user)
  - [ ] API key secured (not in client code)
  
- [ ] **Performance:**
  - [ ] Average latency < 2.5s
  - [ ] Citation accuracy ≥ 90%
  - [ ] Index size < 50 MB
  
- [ ] **Monitoring:**
  - [ ] Error alerts set up
  - [ ] Performance alerts set up
  - [ ] Usage tracking enabled
  
- [ ] **User Experience:**
  - [ ] Chatbot button visible but not intrusive
  - [ ] Loading states work correctly
  - [ ] Error messages are user-friendly
  - [ ] Citations are clickable
  
- [ ] **Documentation:**
  - [ ] User guide for chatbot
  - [ ] Admin guide for updating index
  - [ ] Troubleshooting guide

---

## 🔧 Troubleshooting

### Issue: "Cannot find module './embeddings'"

**Solution:**
```bash
# Restart TypeScript server in VS Code
# Ctrl+Shift+P → TypeScript: Restart TS Server

# Or rebuild
npm run build
```

### Issue: Cloud Function timeout

**Solution:**
```typescript
// In functions/src/rag/ask.ts
export const askRAG = onCall({
  timeoutSeconds: 60, // Increase from 30
  memory: '1GiB', // Increase from 512MiB
}, async (request) => {
  // ...
});
```

### Issue: High latency (> 3s)

**Diagnosis:**
```typescript
// Add timing logs in ragFlow.ts
console.time('embedding');
const embedding = await generateEmbedding(question);
console.timeEnd('embedding');

console.time('retrieval');
const chunks = findTopKSimilar(...);
console.timeEnd('retrieval');

console.time('gemini');
const result = await model.generateContent(...);
console.timeEnd('gemini');
```

**Common causes:**
- Embedding generation slow (100-300ms expected)
- Too many chunks (topK > 5)
- Gemini API slow (1-2s expected)
- Cold start (first request after deployment)

---

## 📞 Support

If you encounter issues:

1. **Check logs:**
   ```bash
   firebase functions:log --only askRAG
   ```

2. **Check documentation:**
   - RAG_CHATBOT_GUIDE.md
   - RAG_STATUS.md

3. **Test locally:**
   ```bash
   npm run test:rag
   ```

---

## 🎉 Success Criteria

Your RAG chatbot is production-ready when:

- ✅ All tests pass (`npm run test:rag`)
- ✅ Average latency < 2.5s
- ✅ Citation accuracy ≥ 90%
- ✅ Cloud Functions deployed successfully
- ✅ UI is responsive and user-friendly
- ✅ Error handling works correctly
- ✅ Permission control is secure

---

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Ready for Production 🚀
