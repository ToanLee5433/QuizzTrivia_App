# 🤖 CHATBOT RAG - TROUBLESHOOTING GUIDE

## ✅ Đã cập nhật model và config

### **Model mới: `gemini-2.5-flash-lite`**

**Thông số Gemini 2.5 Flash-Lite (Free Tier):**
- **RPM (Requests Per Minute):** 4,000
- **TPM (Tokens Per Minute):** 4,000,000
- **RPD (Requests Per Day):** Unlimited (*)
- **Max Output Tokens:** 8,192
- **Batch Queue Limit:** 10,000,000

### **Cập nhật đã thực hiện:**

1. ✅ **Config chính** - `src/lib/genkit/config.ts`
   - `chatModel`: `gemini-2.5-flash-lite`
   - `maxOutputTokens`: 8192 (tăng từ 1024)
   - `temperature`: 0.7 (tăng từ 0.3)

2. ✅ **Rate Limiting** - `functions/src/rag/ask.ts`
   - `maxRequests`: 100/minute (tăng từ 20)
   - Lý do: Gemini 2.5 Flash-Lite hỗ trợ 4000 RPM

3. ✅ **Frontend Config** - `src/config/gemini.ts`
   - `MAX_REQUESTS_PER_MINUTE`: 4000
   - `MAX_TOKENS_PER_REQUEST`: 4000000

---

## 🔍 KIỂM TRA CHATBOT HOẠT ĐỘNG

### **1. Chatbot Button không hiển thị?**

**Nguyên nhân:** Chatbot button chỉ hiển thị cho **authenticated users**

```typescript
// src/components/rag/ChatbotButton.tsx (line 24-26)
if (!user) {
  return null; // ❌ Không render nếu chưa login
}
```

**Giải pháp:**
1. ✅ **Đăng nhập** vào hệ thống
2. Refresh page
3. Button sẽ xuất hiện ở **bottom-right corner** (bên trái nút scroll)

---

### **2. Quiz Recommendations không hiển thị?**

**Vị trí:** `src/components/rag/MessageList.tsx` (line 108-139)

**Điều kiện hiển thị:**
```typescript
{message.role === 'assistant' && 
 message.quizRecommendations && 
 message.quizRecommendations.length > 0 && (
  // Render quiz cards
)}
```

**Nguyên nhân không hiển thị:**

#### **A. Vector Index chưa được build**
```bash
# Kiểm tra index có tồn tại không
# Firestore Console: system/vector-index
```

**Giải pháp:**
```bash
# Build vector index
npm run build:index

# Hoặc vào Admin Panel
http://localhost:5173/admin/build-index
```

#### **B. Không có quiz nào match với câu hỏi**
- AI tìm quiz dựa trên **cosine similarity**
- Threshold: 0.6 (chỉ lấy quiz liên quan)

**Giải pháp:**
- Hỏi câu hỏi cụ thể hơn (VD: "Toán học lớp 10", "JavaScript cơ bản")
- Thêm quiz vào database

#### **C. Quiz không có metadata đầy đủ**
```typescript
// Cần có ít nhất:
{
  quizId: string,
  title: string,
  category: string,
  // Optional but recommended:
  imageUrl?: string,
  difficulty?: string,
  questionCount?: number,
  averageRating?: number,
  totalAttempts?: number
}
```

---

### **3. Chatbot trả lời "Không có dữ liệu"**

**Nguyên nhân:**
```typescript
// functions/src/rag/simpleRAG.ts (line 99-106)
if (contexts.length === 0) {
  return {
    answer: `Xin chào! 👋 Hiện tại hệ thống chưa có dữ liệu quiz...`
  }
}
```

**Giải pháp:**
1. Build vector index (admin/build-index)
2. Kiểm tra Firestore có quiz không
3. Kiểm tra `system/vector-index` document

---

### **4. Click vào Quiz Card không chuyển trang**

**Vị trí:** `src/components/rag/QuizRecommendationCard.tsx` (line 49-52)

```typescript
const handleClick = () => {
  onNavigate?.(); // Close modal
  navigate(`/quiz/${quiz.quizId}/preview`);
};
```

**Kiểm tra:**
1. ✅ Có `quizId` hợp lệ không?
2. ✅ Route `/quiz/:id/preview` có tồn tại không?
3. ✅ Modal có close sau khi click không?

**Debug:**
```typescript
// Thêm log trong QuizRecommendationCard
const handleClick = () => {
  console.log('🎯 Navigate to quiz:', quiz.quizId);
  onNavigate?.();
  navigate(`/quiz/${quiz.quizId}/preview`);
};
```

---

## 🧪 TESTING CHECKLIST

### **Bước 1: Kiểm tra Authentication**
- [ ] Login vào hệ thống
- [ ] Kiểm tra Redux store: `state.auth.user !== null`
- [ ] Button chatbot hiển thị ở bottom-right

### **Bước 2: Kiểm tra Vector Index**
```bash
# Terminal
npm run build:index

# Hoặc browser
http://localhost:5173/admin/build-index
```

- [ ] Script chạy thành công
- [ ] Firestore `system/vector-index` có data
- [ ] Console log: "✅ Index built successfully"

### **Bước 3: Test Chatbot**
1. Click vào chatbot button
2. Gửi câu hỏi: **"Toán học là gì?"**
3. Kiểm tra response:
   - [ ] AI trả lời có nội dung
   - [ ] Có citations (nếu có match)
   - [ ] Có quiz recommendations (nếu có quiz toán học)

### **Bước 4: Test Quiz Navigation**
1. Click vào một Quiz Recommendation Card
2. Kiểm tra:
   - [ ] Modal đóng lại
   - [ ] Chuyển đến `/quiz/:id/preview`
   - [ ] Trang preview load đúng

---

## 🔧 QUICK FIXES

### **Fix 1: Chatbot không mở được**

```typescript
// src/components/rag/ChatbotModal.tsx
// Kiểm tra isOpen prop
<ChatbotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
```

**Debug:**
```typescript
// ChatbotButton.tsx
const [isOpen, setIsOpen] = useState(false);

console.log('Chatbot isOpen:', isOpen); // Should toggle true/false
```

### **Fix 2: Force rebuild index**

```bash
# Delete old index
firebase firestore:delete system/vector-index

# Rebuild
npm run build:index
```

### **Fix 3: Clear rate limit cache**

```typescript
// functions/src/rag/ask.ts
// Restart Cloud Functions để clear in-memory cache
firebase deploy --only functions:askRAG
```

---

## 📊 MONITORING

### **Check Cloud Function logs:**
```bash
firebase functions:log --only askRAG
```

**Tìm kiếm:**
- ✅ "RAG request from user"
- ❌ "Rate limit exceeded"
- ❌ "Vector index not found"

### **Check Frontend console:**
```javascript
// Network tab
Filter: askRAG

// Console
Filter: chatbot
```

---

## 🚀 DEPLOYMENT

Sau khi test local thành công:

```bash
# 1. Build index (cần chạy trước khi deploy)
npm run build:index

# 2. Deploy functions
cd functions
npm run build
firebase deploy --only functions

# 3. Deploy frontend
npm run build
firebase deploy --only hosting
```

---

## ✨ EXPECTED BEHAVIOR

**Khi hoạt động đúng:**

1. **Button hiển thị:** Bottom-right, purple gradient, có animation
2. **Click button:** Modal fullscreen mở ra
3. **Gửi câu hỏi:** AI trả lời trong 2-5 giây
4. **Citations:** Hiển thị dưới câu trả lời (nếu có)
5. **Quiz Cards:** Hiển thị trong section riêng, có ảnh, stats, difficulty badge
6. **Click quiz:** Chuyển đến preview page, modal đóng

---

## 🆘 VẪN KHÔNG HOẠT ĐỘNG?

### **Kiểm tra logs:**

1. **Browser DevTools Console**
   - Có error gì không?
   - Network tab: request askRAG có success không?

2. **Firebase Functions Logs**
   ```bash
   firebase functions:log --only askRAG
   ```

3. **Firestore Database**
   - Collection `quizzes` có data không?
   - Document `system/vector-index` có tồn tại không?

### **Common Errors:**

| Error | Nguyên nhân | Giải pháp |
|-------|-------------|-----------|
| "User must be authenticated" | Chưa login | Đăng nhập lại |
| "Vector index not found" | Chưa build index | Run `npm run build:index` |
| "Rate limit exceeded" | Quá 100 req/min | Đợi 1 phút hoặc tăng limit |
| "No quiz found" | Database rỗng | Thêm quiz hoặc import data |
| 404 on quiz navigation | Quiz không tồn tại | Kiểm tra quizId |

---

**Last updated:** 2025-11-24  
**Model:** gemini-2.5-flash-lite  
**Rate limit:** 100 requests/minute (local), 4000 RPM (API limit)
