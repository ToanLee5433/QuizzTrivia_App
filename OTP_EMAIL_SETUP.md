# Hướng dẫn cấu hình OTP Email System

## 1. Cài đặt và Deploy Firebase Functions

### Bước 1: Cài đặt Firebase CLI
```bash
npm install -g firebase-tools
```

### Bước 2: Đăng nhập Firebase
```bash
firebase login
```

### Bước 3: Cấu hình email credentials
```bash
# Thay thế bằng thông tin email của bạn
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-app-password"
```

**Lưu ý quan trọng về App Password:**
- Đối với Gmail, bạn cần sử dụng "App Password" thay vì mật khẩu thường
- Bật 2-Factor Authentication trên Gmail
- Tạo App Password tại: https://myaccount.google.com/apppasswords
- Sử dụng App Password này thay vì mật khẩu Gmail

### Bước 4: Deploy functions
```bash
cd functions
firebase deploy --only functions
```

## 2. Cấu hình Firestore Rules

Thêm rules cho các collections mới:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Existing rules...
    
    // OTP verifications - chỉ user có thể đọc OTP của mình
    match /otp_verifications/{otpId} {
      allow read, write: if request.auth != null && request.auth.token.email == resource.data.email;
      allow create: if request.auth == null; // Cho phép tạo OTP khi chưa đăng nhập
    }
    
    // Email queue - chỉ admin và functions có thể truy cập
    match /email_queue/{emailId} {
      allow read, write: if false; // Chỉ functions mới có thể truy cập
    }
  }
}
```

## 3. Test OTP System

### Test tạo OTP:
1. Truy cập `/login`
2. Chọn tab "Đăng ký"
3. Nhập email và mật khẩu
4. Click "Đăng ký" - hệ thống sẽ gửi OTP

### Kiểm tra email queue trong Firestore:
- Collection: `email_queue`
- Document sẽ có status: `pending` → `sent` hoặc `failed`

### Kiểm tra OTP trong Firestore:
- Collection: `otp_verifications`
- Document chứa mã OTP đã hash và thời gian hết hạn

## 4. Cấu hình SMTP khác (nếu không dùng Gmail)

### Outlook/Hotmail:
```bash
firebase functions:config:set email.service="hotmail"
firebase functions:config:set email.user="your-email@outlook.com"
firebase functions:config:set email.password="your-password"
```

### SMTP tùy chỉnh:
```bash
firebase functions:config:set email.host="smtp.your-provider.com"
firebase functions:config:set email.port="587"
firebase functions:config:set email.secure="false"
firebase functions:config:set email.user="your-email@domain.com"
firebase functions:config:set email.password="your-password"
```

## 5. Monitoring và Debug

### Xem logs Firebase Functions:
```bash
firebase functions:log
```

### Debug email gửi:
- Kiểm tra Firestore collection `email_queue`
- Xem logs Firebase Functions
- Kiểm tra spam folder của email

## 6. Security Notes

- OTP có thời gian sống 10 phút
- Mỗi email chỉ được thử 3 lần
- OTP được hash trước khi lưu vào Firestore
- Email queue tự động cleanup sau 7 ngày

## 7. Troubleshooting

### Lỗi "Invalid credentials":
- Kiểm tra App Password đã đúng chưa
- Đảm bảo 2FA đã bật cho Gmail

### Email không gửi được:
- Kiểm tra functions logs
- Verify email configuration
- Kiểm tra firewall/network

### OTP không hoạt động:
- Kiểm tra Firestore rules
- Verify email trong collection
- Kiểm tra thời gian hệ thống
