# 🚀 Hướng dẫn Deploy Chatbot AI

## Bước 1: Deploy Cloud Functions

Mở terminal trong thư mục project và chạy:

```bash
# 1. Build functions
cd functions
npm run build

# 2. Deploy functions
firebase deploy --only functions

# 3. Kiểm tra functions đã deploy
firebase functions:list
```

## Bước 2: Xây dựng Vector Index

1. Đăng nhập với tài khoản admin
2. Vào trang: `/admin/build-index`
3. Nhấn "Build Index" để tạo vector index cho RAG

## Bước 3: Kiểm tra API Keys

Đảm bảo các API key sau còn hiệu lực:
- Google AI API Key (trong `functions/src/rag/simpleRAG.ts`)
- Gemini API Key (trong `src/services/geminiAI.ts`)

## Bước 4: Test Chatbot

1. Đăng nhập vào ứng dụng
2. Nhấn nút chatbot floating button (góc dưới phải)
3. Thử hỏi: "Công thức toán học là gì?"

## Lỗi thường gặp và cách fix

### 1. "Function not found"
→ Chạy lại `firebase deploy --only functions`

### 2. "No data available"
→ Vào `/admin/build-index` để xây dựng index

### 3. "API key invalid"
→ Cập nhật API key trong file config

### 4. "Permission denied"
→ Kiểm tra Firestore rules và authentication
