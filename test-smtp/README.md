# Hướng dẫn Test SMTP Firebase

## 🎯 Mục đích
Trang test này giúp bạn kiểm tra cấu hình SMTP và gửi email OTP trước khi tích hợp vào dự án chính.

## 📁 Cấu trúc files
```
test-smtp/
├── index.html      # Trang web test SMTP
├── functions.js    # Firebase Functions để gửi email
├── package.json    # Dependencies cho functions
└── README.md       # Hướng dẫn này
```

## 🚀 Cách sử dụng

### Bước 1: Mở trang test
1. Mở file `index.html` bằng browser
2. Hoặc chạy local server: `python -m http.server 8000` và truy cập `http://localhost:8000`

### Bước 2: Cấu hình Firebase Config
Trong file `index.html`, cập nhật Firebase config (dòng 150):
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... các config khác
};
```

### Bước 3: Deploy Functions (nếu muốn test qua HTTP Functions)
```bash
cd test-smtp
npm install
firebase deploy --only functions
```

### Bước 4: Cấu hình Email
```bash
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-app-password"
```

## 📧 Cách test

### Test 1: Qua Firestore Trigger (Khuyến nghị)
1. Nhập email nhận
2. Chọn template "OTP Verification"
3. Click "Gửi Email Test"
4. Kiểm tra collection `email_queue` trong Firestore
5. Xem status: `pending` → `sent` hoặc `failed`

### Test 2: Qua HTTP Function
1. Nhập email nhận
2. Chọn template "Test"
3. Click "Gửi Email Test"
4. Kiểm tra console logs

## 🔍 Debug

### Kiểm tra Firebase Functions Logs:
```bash
firebase functions:log
```

### Kiểm tra Firestore:
- Collection: `email_queue`
- Document fields: `status`, `error`, `sentAt`, `failedAt`

### Kiểm tra Email:
- Inbox email nhận
- Spam folder
- Email provider logs

## ⚠️ Lưu ý quan trọng

### Gmail App Password:
1. Bật 2-Factor Authentication
2. Tạo App Password tại: https://myaccount.google.com/apppasswords
3. Sử dụng App Password thay vì mật khẩu Gmail

### Firestore Rules:
Thêm rule cho `email_queue`:
```javascript
match /email_queue/{emailId} {
  allow create: if true; // Cho phép tạo từ client
  allow read, write: if false; // Chỉ functions mới được đọc/ghi
}
```

### SMTP Providers:
#### Gmail:
```
Service: gmail
User: your-email@gmail.com
Password: your-app-password
```

#### Outlook:
```
Service: hotmail
User: your-email@outlook.com
Password: your-password
```

#### Custom SMTP:
```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.your-provider.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@domain.com',
    pass: 'your-password'
  }
});
```

## 🎉 Kết quả mong đợi

### Thành công:
- ✅ Email queue được tạo trong Firestore
- ✅ Status chuyển từ `pending` → `sent`
- ✅ Nhận được email với mã OTP

### Thất bại:
- ❌ Status chuyển thành `failed`
- ❌ Error message trong Firestore
- ❌ Logs Firebase Functions có lỗi

## 🔧 Troubleshooting

### Lỗi "Invalid credentials":
- Kiểm tra App Password
- Đảm bảo 2FA đã bật

### Lỗi "Connection refused":
- Kiểm tra firewall
- Thử port khác (465, 587, 25)

### Email không gửi được:
- Kiểm tra quota Gmail (100 emails/day)
- Verify domain sender
- Kiểm tra spam policies

### Functions không chạy:
- Kiểm tra billing account
- Verify functions region
- Check IAM permissions

## 📞 Support
Nếu gặp vấn đề, kiểm tra:
1. Firebase Console → Functions → Logs
2. Browser Console → Network tab
3. Firestore → email_queue collection
4. Email provider logs
