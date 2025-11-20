# 🔍 AI Generator Troubleshooting Guide

## Vấn đề hiện tại
```
Error: Không thể phân tích câu hỏi từ AI
```

## Các bước debug đã thêm

### 1. Enhanced Logging trong firebaseAIService.ts
- ✅ Log request details trước khi gọi Firebase Function
- ✅ Log raw response từ Firebase Function
- ✅ Log chi tiết từng question khi parse
- ✅ Log validation errors cụ thể

### 2. Chi tiết logs sẽ hiển thị

Khi generate questions, check browser console để thấy:

```
🚀 Calling Firebase Function generateQuestions...
📤 Request: {
  promptLength: 500,
  contentLength: 1000,
  numQuestions: 5,
  difficulty: 'medium',
  language: 'vi',
  model: 'gemini-2.0-flash-exp'
}

📥 Firebase Function response: {
  success: true,
  questions: [...],
  generatedAt: ...
}

📥 Parsing questions data: [...]
📝 Processing question 1: {...}
✅ Question 1 parsed successfully
...
✅ Successfully parsed 5/5 questions
```

## Các lỗi có thể xảy ra

### Lỗi 1: `questionsData is not an array`
**Nguyên nhân**: Firebase Function trả về `data.questions` không phải array

**Giải pháp**: Check response structure trong Firebase Console Logs

### Lỗi 2: `AI không trả về câu hỏi nào`
**Nguyên nhân**: Array rỗng từ AI

**Giải pháp**: 
- Check prompt có đúng format không
- Tăng `maxTokens` lên 3000-4000
- Thử model khác: `gemini-pro` thay vì `gemini-2.0-flash-exp`

### Lỗi 3: `Question X missing text/answers`
**Nguyên nhân**: AI trả về JSON không đúng format

**Giải pháp**: 
- Check Firebase Function logs để xem raw AI response
- Có thể AI trả về markdown hoặc text thay vì JSON
- Cần improve prompt để AI chỉ trả JSON

### Lỗi 4: `Firebase Function không trả về questions array`
**Nguyên nhân**: Response structure sai

**Giải pháp**: Check `data.success` và `data.questions` có tồn tại không

## Cách test

### Test 1: Console Logs
1. Mở browser DevTools (F12)
2. Tab Console
3. Generate questions
4. Xem logs chi tiết

### Test 2: Firebase Functions Logs
```bash
cd functions
firebase functions:log --only generateQuestions
```

### Test 3: Test AI Function trực tiếp
Browser console:
```javascript
// Get Firebase instance
const functions = firebase.functions();
const generateQuestions = functions.httpsCallable('generateQuestions');

// Test call
generateQuestions({
  prompt: "Tạo 2 câu hỏi về JavaScript",
  content: "JavaScript là ngôn ngữ lập trình web phổ biến",
  config: {
    model: 'gemini-2.0-flash-exp',
    temperature: 0.7,
    maxTokens: 2000
  }
}).then(result => {
  console.log('✅ Success:', result.data);
}).catch(error => {
  console.error('❌ Error:', error);
});
```

## Giải pháp khẩn cấp

### Nếu vẫn lỗi, sử dụng fallback:

1. **Tạm thời disable Firebase AI, dùng local AI service**
2. **Hoặc tạo mock data** cho development

File: `src/features/quiz/services/simpleAIService.ts`

Thêm fallback:
```typescript
// Nếu Firebase fails, return mock data
const mockQuestions = [
  {
    text: "Sample question 1?",
    answers: [
      { text: "Answer A", isCorrect: true },
      { text: "Answer B", isCorrect: false },
      { text: "Answer C", isCorrect: false },
      { text: "Answer D", isCorrect: false }
    ],
    explanation: "Sample explanation",
    points: 10,
    difficulty: "medium"
  }
];
```

## Next Steps

1. **Xem console logs** khi generate
2. **Share logs** để identify root cause
3. **Check Firebase Functions deployed** hay chưa:
   ```bash
   firebase functions:list
   ```
4. **Check API quota** Google AI:
   https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

## Common Issues

- ❌ **"unauthenticated"**: User chưa login
- ❌ **"Thiếu prompt hoặc content"**: Request data sai format
- ❌ **"Không nhận được phản hồi từ AI"**: API key sai hoặc quota hết
- ❌ **"Không thể phân tích câu hỏi"**: AI response không đúng JSON format

## Firebase Function Check

Run:
```bash
cd functions
npm run deploy
```

Hoặc deploy chỉ generateQuestions:
```bash
firebase deploy --only functions:generateQuestions
```
