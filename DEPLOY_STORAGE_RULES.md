# 🔥 Deploy Firebase Storage Rules

## ⚠️ QUAN TRỌNG - Phải deploy Storage Rules trước khi test upload!

### Cách 1: Deploy qua Firebase Console (Khuyến nghị)

1. **Mở Firebase Console:**
   ```
   https://console.firebase.google.com
   ```

2. **Chọn project: `quiztrivia-app`**

3. **Vào Storage → Rules**
   - Click tab "Rules" ở thanh menu trên

4. **Copy nội dung từ `storage.rules`:**
   - Mở file `storage.rules` trong project
   - Copy toàn bộ nội dung

5. **Paste vào editor trên Firebase Console**

6. **Click "Publish" (màu xanh)**

7. **Đợi 10-30s để rules có hiệu lực**

---

### Cách 2: Deploy qua Firebase CLI

```bash
# 1. Đăng nhập Firebase (nếu chưa)
firebase login

# 2. Deploy Storage Rules
firebase deploy --only storage

# 3. Xác nhận thành công
✔  Deploy complete!
```

---

## 📁 Cấu trúc Thư mục Storage Mới

```
firebase-storage/
│
├── user-avatars/
│   └── {userId}/
│       └── {timestamp}_{filename}.jpg     # Ảnh đại diện
│
├── quiz-covers/
│   └── {quizId}/
│       └── {timestamp}_{filename}.jpg     # Ảnh bìa quiz
│
├── learning-resources/                     # ⭐ TÀI LIỆU HỌC TẬP
│   ├── videos/
│   │   └── {quizId}/
│   │       └── {timestamp}_{filename}.mp4
│   │
│   ├── pdfs/
│   │   └── {quizId}/
│   │       └── {timestamp}_{filename}.pdf
│   │
│   ├── audios/
│   │   └── {quizId}/
│   │       └── {timestamp}_{filename}.mp3
│   │
│   └── images/
│       └── {quizId}/
│           └── {timestamp}_{filename}.jpg
│
├── question-images/                        # Ảnh trong câu hỏi
│   └── {quizId}/
│       └── {questionId}/
│           └── {timestamp}_{filename}.jpg
│
├── temp-uploads/                           # Upload tạm thời
│   └── {userId}/
│       └── {timestamp}_{filename}.*
│
└── thumbnails/                             # Ảnh thu nhỏ (auto)
    └── {various sizes}/
```

---

## ✅ Ưu điểm Cấu trúc Mới

### 1. **Rõ ràng theo chức năng**
```
✓ Mỗi loại file có thư mục riêng
✓ Dễ tìm kiếm và quản lý
✓ Dễ backup theo từng nhóm
```

### 2. **Phân quyền chặt chẽ**
```
✓ Video/PDF/Audio: Max size khác nhau
✓ Chỉ user đã login mới upload
✓ Validate đúng content-type
```

### 3. **Tổ chức theo Quiz ID**
```
learning-resources/videos/quiz123/
  ├── 1730000001_intro.mp4
  ├── 1730000002_lesson1.mp4
  └── 1730000003_summary.mp4
```
→ Dễ xóa toàn bộ tài liệu của 1 quiz

### 4. **Dễ scale**
```
✓ Thêm loại file mới: Chỉ cần thêm 1 match rule
✓ Thay đổi size limit: Sửa 1 chỗ
✓ Analytics: Group theo folder
```

---

## 🔒 Quyền truy cập (Security Rules)

| Thư mục | Read | Create | Delete |
|---------|------|--------|--------|
| `user-avatars` | Public | Own folder only | Own only |
| `quiz-covers` | Public | Auth required | Auth required |
| `learning-resources/*` | Public | Auth + validate | Auth required |
| `question-images` | Public | Auth + validate | Auth required |
| `temp-uploads` | Public | Own folder only | Own only |
| `thumbnails` | Public | Auto only | Denied |

---

## 🧪 Test sau khi deploy

### 1. Test Upload Video
```
1. Vào /creator → Tạo quiz
2. Thêm tài liệu → Chọn "Video"
3. Upload file .mp4
4. ✅ Thành công → URL có dạng:
   https://firebasestorage.../learning-resources/videos/draft_xxx/xxx.mp4
```

### 2. Test Upload PDF
```
1. Chọn "PDF"
2. Upload file .pdf
3. ✅ Thành công → URL có dạng:
   https://firebasestorage.../learning-resources/pdfs/draft_xxx/xxx.pdf
```

### 3. Test Upload Audio
```
1. Chọn "Audio"
2. Upload file .mp3
3. ✅ Thành công
```

### 4. Test Validation
```
1. Chọn "Video" → Upload .pdf
   ❌ Bị chặn: "Chỉ chấp nhận file video!"
   
2. Chọn "PDF" → Upload .mp4
   ❌ Bị chặn: "Chỉ chấp nhận file PDF!"
   
3. Upload file > 50MB
   ❌ Bị chặn: "File quá lớn!"
```

---

## 🐛 Troubleshooting

### Lỗi: "User does not have permission"
```bash
→ Chưa deploy Storage Rules
→ Giải pháp: Deploy rules theo hướng dẫn trên
```

### Lỗi: "File too large"
```bash
→ Vượt quá size limit
→ Giải pháp: 
  - Video: Max 50MB
  - PDF: Max 10MB
  - Audio: Max 10MB
  - Image: Max 5MB
```

### Lỗi: "Invalid file type"
```bash
→ Sai định dạng file
→ Giải pháp: Check lại file extension và MIME type
```

---

## 📊 Monitor Storage

### Firebase Console
```
Storage → Files → Xem cấu trúc thư mục
Storage → Usage → Xem dung lượng đã dùng
```

### Cleanup (nếu cần)
```bash
# Xóa temp files cũ hơn 7 ngày
firebase functions:shell
> cleanupTempUploads()
```

---

## 🚀 Ready to go!

1. ✅ Deploy Storage Rules
2. ✅ Build project: `npm run build`
3. ✅ Start dev: `npm run dev`
4. ✅ Test upload tất cả loại file
5. ✅ Verify files trong Firebase Console

**Good luck!** 🎉
