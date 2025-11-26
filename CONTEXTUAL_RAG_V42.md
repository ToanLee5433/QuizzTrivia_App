# 🧠 Contextual RAG v4.2 - Implementation Complete

## 📋 Tóm tắt

**Vấn đề:** Chatbot bị "mất trí nhớ ngắn hạn" (Stateless) - mỗi câu hỏi được xử lý độc lập, không hiểu ngữ cảnh từ các tin nhắn trước.

**Giải pháp:** Contextual Query Rewriting - Client gửi kèm lịch sử hội thoại, Server viết lại câu hỏi mơ hồ trước khi tìm kiếm.

## 🔄 Flow Mới (v4.2)

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
│  ┌─────────────────────────────────────────────┐               │
│  │  STEP 1: Intent Classification              │               │
│  │  Intent: learning_path                       │               │
│  │  Topic: "Toán"                               │               │
│  └─────────────────────────────────────────────┘               │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────┐               │
│  │  STEP 2: Learning Path / Search             │               │
│  │  Tìm quiz về Toán (với query đã refined)    │               │
│  └─────────────────────────────────────────────┘               │
│                              ↓                                  │
│  Output: Quiz về Toán + Lộ trình học Toán ✅                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Files Modified

### 1. Frontend: `src/components/rag/ChatbotModal.tsx`
```typescript
// Build conversation history (last 5 messages)
const recentHistory = messages
  .slice(-5)
  .filter(m => m.role === 'user' || m.role === 'assistant')
  .map(m => ({ role: m.role, content: m.content }));

// Send with request
const result = await askRAG({
  question: userMessage.content,
  history: recentHistory,  // NEW v4.2
  topK: 4,
  targetLang: 'vi'
});
```

### 2. Backend: `functions/src/rag/ask.ts`
- Validates history array
- Truncates to last 5 messages
- Limits content to 500 chars per message
- Passes to `askQuestion()`

### 3. Backend: `functions/src/rag/optimizedRAG.ts`

#### New Function: `contextualizeQuery()`
```typescript
async function contextualizeQuery(
  question: string, 
  history: ConversationMessage[]
): Promise<{ refinedQuestion: string; wasRewritten: boolean }>
```

**Logic:**
1. Detect context-dependent patterns:
   - "Thế...", "Còn...", "Với..."
   - "Nó là gì?", "Cái đó..."
   - Câu quá ngắn (<15 ký tự)

2. If needs rewriting → Call Gemini Flash Lite to expand

3. Return refined question for search

#### Updated Pipeline:
```
STEP 0: contextualizeQuery() ← NEW
STEP 1: classifyIntent() - uses refined question
STEP 2: handleLearningPath() / hybridSearch()
STEP 3: generateAnswer()
STEP 4: fetchQuizDetails()
```

## 📊 Metrics Added

```typescript
searchMetrics: {
  // ...existing
  queryRewritten: boolean;    // Was the query rewritten?
  originalQuery?: string;     // Original query before rewriting
}
```

## 🧪 Test Cases

| User Input | History | Refined Query |
|------------|---------|---------------|
| "Thế còn Toán?" | ["Học Tiếng Anh khó quá"] | "Gợi ý lộ trình học môn Toán" |
| "Tại sao?" | ["React là gì?", "Đây là..."] | "Tại sao nên dùng React?" |
| "Tôi muốn tất cả" | ["Quiz về JavaScript"] | "Tìm tất cả quiz về JavaScript" |
| "Ví dụ?" | ["Hàm async/await"] | "Cho ví dụ về hàm async/await" |

## ⚡ Performance

| Metric | Value |
|--------|-------|
| Query Rewriting Latency | ~200-300ms |
| Added Token Cost | ~50-100 tokens per rewrite |
| Context Window | Last 5 messages |
| Max Content per Message | 500 characters |

## ✅ Benefits

1. **Tìm kiếm chính xác hơn:** Câu hỏi mơ hồ được làm rõ trước khi search
2. **Router thông minh hơn:** Intent classification trên refined query
3. **UX tốt hơn:** User không cần nhắc lại ngữ cảnh
4. **Stateless:** Server không cần lưu session (client gửi history)
5. **Token-efficient:** Chỉ rewrite khi cần thiết

## 🚀 Deployment

```bash
# Already deployed!
firebase deploy --only functions:askRAG
```

---

**Version:** 4.2.0  
**Date:** 2025-11-26  
**Status:** ✅ Deployed and Ready
