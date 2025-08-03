# 🚀 Hướng dẫn cài đặt Advanced File Upload với AI

## 📋 Tổng quan
Tính năng này cho phép tải lên các file ảnh, PDF, DOC, Excel và tự động sinh câu hỏi bằng AI.

## 🔧 Cài đặt Dependencies

### 1. Cài đặt các package cần thiết:

```bash
# File processing libraries
npm install tesseract.js pdf-parse mammoth xlsx

# Type definitions
npm install @types/pdf-parse @types/mammoth

# Optional: PDF.js for better PDF support
npm install pdfjs-dist

# Optional: React Toastify for notifications (nếu chưa có)
npm install react-toastify
```

### 2. Cấu hình PDF.js Worker (nếu sử dụng pdfjs-dist):

Tạo file `public/pdf.worker.js` hoặc config trong vite.config.ts:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // PDF.js worker configuration
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  }
});
```

## 🤖 AI Providers Setup

### Option 1: OpenAI
1. Đăng ký tài khoản tại https://platform.openai.com/
2. Tạo API key tại https://platform.openai.com/api-keys
3. Giá: ~$0.002/1K tokens (GPT-3.5-turbo)

### Option 2: Claude (Anthropic)
1. Đăng ký tại https://console.anthropic.com/
2. Tạo API key
3. Giá: ~$0.003/1K tokens

### Option 3: Google Gemini
1. Đăng ký tại https://ai.google.dev/
2. Tạo API key
3. Free tier: 60 requests/minute

### Option 4: Local AI (Ollama)
```bash
# Cài đặt Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download models
ollama pull llama2
ollama pull codellama
ollama pull mistral

# Chạy server
ollama serve
```

## 📱 Cách sử dụng

### 1. Trong CreateQuizPage:
Component `AdvancedFileUpload` đã được tích hợp sẵn vào `QuestionsStep`.

### 2. Workflow:
1. **Upload File**: Chọn file ảnh/PDF/DOC/Excel
2. **Preview Content**: Xem nội dung đã trích xuất
3. **AI Configuration**: Chọn provider và nhập API key
4. **Generate Questions**: AI tạo câu hỏi từ nội dung
5. **Review & Import**: Xem lại và import câu hỏi

### 3. Supported File Types:
- **Images**: .jpg, .jpeg, .png, .gif, .bmp, .webp (OCR)
- **Documents**: .pdf, .doc, .docx, .txt, .rtf
- **Spreadsheets**: .csv, .xlsx, .xls

## 🔒 Bảo mật API Keys

### Frontend Storage (Not Recommended for Production):
```typescript
// Temporary storage trong component state
const [apiKey, setApiKey] = useState('');
```

### Recommended: Backend Proxy
Tạo API endpoint trên backend để proxy AI requests:

```typescript
// backend/routes/ai.ts
app.post('/api/ai/generate-questions', async (req, res) => {
  const { content, provider } = req.body;
  
  // Use server-side API keys
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Call AI service
  const questions = await generateQuestions(content, apiKey);
  
  res.json(questions);
});
```

## 🐛 Troubleshooting

### 1. OCR không hoạt động:
```bash
# Clear cache và reinstall
rm -rf node_modules package-lock.json
npm install
```

### 2. PDF parsing lỗi:
```typescript
// Add to vite.config.ts
define: {
  global: 'globalThis',
}
```

### 3. Memory issues với large files:
```typescript
// Giới hạn file size
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
```

### 4. CORS issues với AI APIs:
Sử dụng backend proxy hoặc configure CORS headers.

## 📊 Performance Optimization

### 1. Lazy Loading:
```typescript
// Lazy load heavy libraries
const loadOCR = async () => {
  const { createWorker } = await import('tesseract.js');
  return createWorker();
};
```

### 2. Worker Threads:
```typescript
// Use web workers for heavy processing
const worker = new Worker('/ocr-worker.js');
```

### 3. File Size Limits:
- Images: Max 10MB
- PDFs: Max 50MB
- Documents: Max 20MB

## 🔄 Workflow Integration

### 1. Với existing QuizBulkImport:
Cả hai components hoạt động độc lập trong QuestionsStep.

### 2. Error Handling:
```typescript
try {
  const result = await processFile(file);
  if (!result.success) {
    toast.error(result.error);
    return;
  }
  // Process success
} catch (error) {
  toast.error('Unexpected error occurred');
}
```

### 3. Progress Tracking:
Component có 4 steps: Upload → Preview → Generate → Review

## 🌟 Advanced Features

### 1. Custom AI Prompts:
Users có thể tùy chỉnh prompt để tạo câu hỏi theo style riêng.

### 2. Batch Processing:
Xử lý multiple files cùng lúc.

### 3. Question Templates:
AI có thể tạo các loại câu hỏi khác nhau: multiple choice, true/false, fill-in-blank.

### 4. Content Analysis:
AI phân tích nội dung và gợi ý difficulty levels.

## 📝 Example Usage

```typescript
// Trong CreateQuizPage
const handleAIImport = (questions: Question[]) => {
  setQuiz(prev => ({
    ...prev,
    questions: [...prev.questions, ...questions]
  }));
  toast.success(`Imported ${questions.length} AI-generated questions!`);
};

// Component render
<AdvancedFileUpload onQuestionsImported={handleAIImport} />
```

## 🚨 Important Notes

1. **API Costs**: AI APIs có cost per token - monitor usage
2. **Rate Limits**: Các providers có rate limits khác nhau
3. **Privacy**: Nội dung file sẽ được gửi lên AI services
4. **Quality**: AI-generated questions nên được review trước khi sử dụng
5. **Fallbacks**: Luôn có fallback khi AI services unavailable

## 📞 Support

Nếu gặp issues:
1. Check browser console for errors
2. Verify API keys và network connectivity
3. Test với small files trước
4. Check file formats được support

## 🔄 Future Enhancements

1. **Advanced OCR**: Support cho handwritten text
2. **Video Processing**: Extract text từ video subtitles
3. **Audio Processing**: Speech-to-text cho audio files
4. **Collaborative AI**: Multiple AI providers cùng lúc để so sánh quality
5. **Question Validation**: AI tự động validate question quality
