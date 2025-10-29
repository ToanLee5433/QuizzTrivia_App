# 🔧 Troubleshooting: Không thể upload PDF/Video/Audio

## ✅ ĐÃ FIX

### Vấn đề phát hiện:
1. ❌ Firebase Storage chưa được export trong config
2. ❌ Code upload dùng dynamic import không ổn định
3. ❌ Storage Rules chưa được deploy

### Giải pháp đã áp dụng:
1. ✅ Thêm `export const storage` trong `config.ts`
2. ✅ Import static thay vì dynamic
3. ✅ Deploy Storage Rules: `firebase deploy --only storage`
4. ✅ Thêm logging chi tiết để debug

---

## 🧪 Cách Test Upload

### Test 1: Qua UI (Recommended)
```bash
npm run dev
# http://localhost:5174/creator

1. Tạo quiz mới
2. Thêm tài liệu → Chọn "PDF"
3. Upload file PDF (< 10MB)
4. Xem console log:
   📤 Starting upload for: pdf filename.pdf
   📂 Upload path: learning-resources/pdfs/draft_xxx/xxx.pdf
   📦 File info: { name, type, size }
   ⬆️ Uploading to Firebase Storage...
   ✅ Upload complete, getting download URL...
   🔗 Download URL: https://...
   ✅ Upload pdf thành công!
```

### Test 2: Qua Browser Console
```javascript
// Mở console (F12)
// Copy paste đoạn này:

const testUpload = async () => {
  const { storage } = await import('./src/lib/firebase/config');
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  
  const testContent = 'Test content';
  const blob = new Blob([testContent], { type: 'text/plain' });
  const file = new File([blob], 'test.txt');
  
  const path = `learning-resources/pdfs/test_${Date.now()}/test.txt`;
  const storageRef = ref(storage, path);
  
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  
  console.log('✅ Test passed! URL:', url);
};

testUpload();
```

---

## ❌ Các Lỗi Thường Gặp

### 1. "storage/unauthorized"
```
❌ FirebaseError: User does not have permission to access...
```

**Nguyên nhân:**
- Storage Rules chưa deploy
- Rules sai cú pháp
- User chưa đăng nhập

**Giải pháp:**
```bash
# Check rules đã deploy chưa
firebase projects:list
firebase use datn-quizapp

# Deploy lại
firebase deploy --only storage

# Đợi 30s cho rules có hiệu lực
```

**Verify trên Firebase Console:**
1. https://console.firebase.google.com
2. Storage → Rules
3. Check xem có rules mới nhất không
4. Test qua "Rules Playground"

---

### 2. "storage not initialized"
```
❌ Cannot read property 'ref' of undefined
```

**Nguyên nhân:**
- Firebase Storage chưa được import
- App chưa init

**Giải pháp:**
```typescript
// Check file: src/lib/firebase/config.ts
import { getStorage } from "firebase/storage";
export const storage = getStorage(app);  // ✅ Phải có dòng này
```

---

### 3. "File too large"
```
❌ File quá lớn! Tối đa XMB cho video
```

**Giới hạn:**
- Video: 50MB
- PDF: 10MB
- Audio: 10MB
- Image: 5MB

**Giải pháp:**
- Nén file trước khi upload
- Hoặc dùng external hosting (YouTube, Google Drive)

---

### 4. "Invalid file type"
```
❌ Định dạng file không hợp lệ cho pdf!
```

**Nguyên nhân:**
- Upload sai loại file
- File bị corrupt
- MIME type không đúng

**Giải pháp:**
- Check extension: `.pdf`, `.mp4`, `.mp3`
- Re-export file từ app gốc
- Check MIME type: `console.log(file.type)`

---

## 🔍 Debug Checklist

### Trước khi upload:
```
□ User đã login?
□ Storage Rules đã deploy? (firebase deploy --only storage)
□ Firebase config có export storage?
□ File size < limit?
□ File type đúng?
```

### Trong quá trình upload:
```
□ Mở Console (F12) để xem logs
□ Check Network tab để xem request
□ Verify path: learning-resources/{type}/{quizId}/{filename}
□ Check auth token trong header
```

### Sau khi upload:
```
□ Có URL không?
□ URL accessible không?
□ File có trong Firebase Console Storage không?
□ Size và type đúng không?
```

---

## 📊 Verify trên Firebase Console

### 1. Check Storage Rules
```
Firebase Console → Storage → Rules

Phải có rules cho:
✓ learning-resources/videos/{quizId}/{fileName}
✓ learning-resources/pdfs/{quizId}/{fileName}
✓ learning-resources/audios/{quizId}/{fileName}
✓ learning-resources/images/{quizId}/{fileName}
```

### 2. Check Files
```
Firebase Console → Storage → Files

Cấu trúc:
learning-resources/
├── videos/
│   └── draft_1730000/
│       └── 1730000_video.mp4
├── pdfs/
│   └── draft_1730000/
│       └── 1730000_document.pdf
└── audios/
    └── draft_1730000/
        └── 1730000_audio.mp3
```

### 3. Check Usage
```
Firebase Console → Storage → Usage

✓ Used space
✓ Download bandwidth
✓ Upload operations
```

---

## 🚀 Test Commands

### Test 1: Upload PDF
```bash
npm run dev
# Browser: localhost:5174/creator
# Tạo quiz → Thêm PDF → Upload
# Check console logs
```

### Test 2: Upload Video
```bash
# Same as above, chọn Video thay vì PDF
# Max 50MB
```

### Test 3: Upload Audio
```bash
# Same as above, chọn Audio
# Max 10MB
```

---

## 📝 Logs Chuẩn

Khi upload thành công, console phải log:
```
📤 Starting upload for: pdf document.pdf
📂 Upload path: learning-resources/pdfs/draft_1730123456/1730123456_document.pdf
📦 File info: {
  name: "document.pdf",
  type: "application/pdf",
  size: "2.34 MB"
}
⬆️ Uploading to Firebase Storage...
✅ Upload complete, getting download URL...
🔗 Download URL: https://firebasestorage.googleapis.com/...
✅ Upload pdf thành công!
```

Nếu thấy logs này → Upload OK! ✅

---

## 🆘 Vẫn Lỗi?

### Các bước cuối cùng:

1. **Clear browser cache:**
```
Ctrl + Shift + Delete → Clear all
```

2. **Re-login:**
```
Logout → Login lại
```

3. **Re-deploy everything:**
```bash
firebase deploy
```

4. **Check Firebase project:**
```bash
firebase projects:list
firebase use datn-quizapp
firebase open
```

5. **Contact support:**
```
Firebase Console → Help → Support
```

---

## ✅ Kết luận

Nếu đã làm đủ:
- ✅ Deploy Storage Rules
- ✅ Export storage trong config
- ✅ Import storage đúng cách
- ✅ Add logging chi tiết

→ Upload sẽ hoạt động 100%! 🎉
