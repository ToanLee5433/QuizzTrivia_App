# 🎓 Smart Learning Advisor System v3.0

## Tổng quan

Hệ thống RAG Chatbot đã được nâng cấp từ **"Người tìm kiếm"** (Librarian) sang **"Cố vấn học tập thông minh"** (Learning Advisor).

### Điểm khác biệt chính:

| Trước (v2.x) | Sau (v3.0) |
|--------------|------------|
| User hỏi → Vector Search → Trả kết quả | User hỏi → Phân loại ý định → Chiến lược phù hợp |
| "Có quiz Java không?" → Tìm quiz Java | "Muốn học Web" → Phân tích → Gợi ý HTML → JS → Java → SQL |
| Chỉ tìm theo từ khóa chính xác | Suy luận các skill liên quan và tìm kiếm mở rộng |

---

## 📊 Kiến trúc Hệ thống

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER QUESTION                                │
│                   "Tôi muốn học lập trình web"                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│            STEP 1: INTENT CLASSIFICATION (Gemini Flash)             │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐    │
│  │ fact_retrieval  │  │ learning_path   │  │   quiz_search    │    │
│  │ "Java là gì?"   │  │ "Học lập trình" │  │ "Quiz React"     │    │
│  └────────┬────────┘  └────────┬────────┘  └────────┬─────────┘    │
│           │                    │                     │              │
│           ▼                    ▼                     ▼              │
│      Standard Mode       Learning Path Mode     Standard Mode       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
┌───────────────────────────────┐  ┌───────────────────────────────────┐
│   STANDARD MODE (v2.x)        │  │  LEARNING PATH MODE (NEW v3.0)    │
│                               │  │                                   │
│ 1. Hybrid Search              │  │ STEP 2: Planner Agent             │
│    (Vector + Keyword)         │  │ - Input: "Web Development"        │
│                               │  │ - Output: ["HTML", "JS", "Java"]  │
│ 2. AI Re-ranking              │  │                                   │
│                               │  │ STEP 3: Multi-hop Retrieval       │
│ 3. Generate Answer            │  │ - Search "HTML" → Quiz 1, 2       │
│                               │  │ - Search "JS" → Quiz 3, 4         │
│ 4. Quiz Recommendations       │  │ - Search "Java" → Quiz 5, 6       │
│                               │  │                                   │
│                               │  │ STEP 4: Synthesis                 │
│                               │  │ - Merge & Sort by learning order  │
│                               │  │ - Generate learning path answer   │
└───────────────────────────────┘  └───────────────────────────────────┘
```

---

## 🔄 Chi tiết từng bước

### Step 1: Intent Classification

**AI Prompt:**
```
Phân loại ý định người dùng:
- fact_retrieval: Câu hỏi cụ thể ("Java ra đời năm nào?")
- learning_path: Muốn học chủ đề rộng ("Học Web Development")
- quiz_search: Tìm quiz cụ thể ("Quiz React")
- general_chat: Trò chuyện chung ("Xin chào")
```

**Output:**
```json
{
  "intent": "learning_path",
  "confidence": 0.95,
  "extractedTopic": "Web Development",
  "reasoning": "User dùng từ 'muốn học' + chủ đề rộng"
}
```

### Step 2: Planner Agent

**AI Prompt:**
```
Phân tích chủ đề "Web Development" và đề xuất các kỹ năng cần học.
```

**Output:**
```json
{
  "mainTopic": "Web Development",
  "subTopics": ["HTML/CSS", "JavaScript", "React", "Node.js", "SQL"],
  "prerequisites": ["Kiến thức máy tính cơ bản"],
  "learningOrder": ["HTML/CSS", "JavaScript", "React", "Node.js", "SQL"]
}
```

### Step 3: Multi-hop Retrieval

Tìm kiếm **song song** cho từng sub-topic:

```javascript
// Search đồng thời
const searchPromises = subTopics.map(topic => 
  vectorSearch(generateEmbedding(topic), 3)
);
const results = await Promise.all(searchPromises);

// Kết quả:
// "HTML/CSS" → [Quiz: HTML Basics, Quiz: CSS Flex]
// "JavaScript" → [Quiz: JS Fundamentals]
// "React" → [Quiz: ReactJS nhập môn]
// "Node.js" → [Quiz: Node Backend]
// "SQL" → [Quiz: SQL cơ bản]
```

### Step 4: Synthesis

AI tổng hợp thành lộ trình học có cấu trúc:

```markdown
🎯 **Mục tiêu:** Trở thành lập trình viên Web full-stack

📚 **Giai đoạn 1: Nền tảng Frontend**
HTML và CSS giúp bạn hiểu cách xây dựng cấu trúc và giao diện web.
→ Quiz gợi ý: HTML Basics, CSS Flex

📚 **Giai đoạn 2: Logic & Tương tác**
JavaScript là ngôn ngữ chính để tạo tương tác cho website.
→ Quiz gợi ý: JS Fundamentals

📚 **Giai đoạn 3: Framework hiện đại**
React giúp xây dựng ứng dụng web phức tạp hiệu quả.
→ Quiz gợi ý: ReactJS nhập môn

💡 **Lời khuyên:** Học theo thứ tự, thực hành song song!

🚀 Bạn muốn bắt đầu từ phần nào?
```

---

## 📝 Cấu hình

```env
# Enable/disable Learning Path feature
RAG_ENABLE_LEARNING_PATH=true

# Số lượng sub-topics tối đa
RAG_MAX_SUBTOPICS=6

# Số quiz mỗi topic
RAG_QUIZZES_PER_TOPIC=3
```

---

## 🧪 Test Cases

### Test 1: Learning Path Mode
```
User: "Tôi muốn học lập trình web"

Expected:
- Intent: learning_path
- Planner generates: HTML, CSS, JS, React, Node.js, SQL
- Multi-hop search for each
- Answer: Lộ trình 3-4 giai đoạn với quiz từng phần
```

### Test 2: Fact Retrieval Mode
```
User: "JavaScript có mấy kiểu dữ liệu?"

Expected:
- Intent: fact_retrieval
- Standard vector search
- Answer: Giải thích về primitive types, object types
- Quiz recommendations: JS Fundamentals
```

### Test 3: Quiz Search Mode
```
User: "Có quiz React không?"

Expected:
- Intent: quiz_search
- Standard vector search với keyword "React"
- Answer: "Dưới đây là các quiz React phù hợp"
- Quiz recommendations: ReactJS nhập môn, React Hooks, etc.
```

### Test 4: General Chat
```
User: "Xin chào"

Expected:
- Intent: general_chat
- NO vector search
- Answer: Greeting thân thiện
- NO quiz recommendations
```

---

## 📈 Metrics mới trong Response

```typescript
interface RAGResponse {
  // ... existing fields ...
  
  searchMetrics: {
    fastPathUsed: boolean;
    avgScore: number;
    topScore: number;
    confidence: 'high' | 'medium' | 'low' | 'none';
    
    // NEW in v3.0
    intent?: 'fact_retrieval' | 'learning_path' | 'quiz_search' | 'general_chat';
    learningPath?: {
      enabled: boolean;
      topic: string;
      subTopics: string[];
      learningOrder?: string[];
    };
  };
}
```

---

## 🔮 Cải tiến tương lai

### 1. Smart Tagging (Taxonomy Graph)
Khi Admin tạo Quiz "Spring Boot", tự động gắn tags:
- Tags trực tiếp: `Java`, `Backend`, `Framework`
- Tags mở rộng (AI): `Web Development`, `Enterprise`, `Microservices`

### 2. User Learning History
Track quizzes đã làm → Gợi ý quiz tiếp theo phù hợp

### 3. Adaptive Difficulty
Dựa trên điểm số → Gợi ý quiz dễ/khó hơn

---

## 📊 So sánh Performance

| Metric | v2.x (Searcher) | v3.0 (Advisor) |
|--------|-----------------|----------------|
| Response Time | ~2-3s | ~4-6s (Learning Path) |
| Relevance | Single-keyword | Multi-topic expansion |
| User Experience | "Đây là quiz" | "Đây là lộ trình học" |
| AI Calls | 1-2 | 3-4 (Intent + Planner + Synthesis) |

**Trade-off:** Response time tăng nhẹ, nhưng chất lượng gợi ý tốt hơn nhiều cho câu hỏi về lộ trình học.
