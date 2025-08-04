# Hướng dẫn Setup SMTP cho Quiz App

## 🎯 Tổng quan
Hệ thống OTP mới sử dụng Direct SMTP Service thay vì Firebase Functions, giúp tiết kiệm chi phí và dễ setup hơn.

## 📋 2 Cách gửi email:

### Cách 1: SMTP Server Local (Khuyến nghị)
Chạy server Node.js local để gửi email thực qua Gmail SMTP

### Cách 2: Test Mode 
Hiển thị OTP trong popup để test (không gửi email thực)

## 🚀 Setup SMTP Server Local

### Bước 1: Cài đặt dependencies
```bash
cd d:\Thuctap_WebQuiz\QuizTrivia-App
npm install express nodemailer cors
```

### Bước 2: Chạy SMTP Server
```bash
node smtp-server.js
```

Server sẽ chạy trên: `http://localhost:3001`

### Bước 3: Test kết nối
Mở browser: `http://localhost:3001/api/test`

Kết quả mong đợi:
```json
{
  "success": true,
  "message": "SMTP server is running",
  "config": {
    "host": "smtp.gmail.com",
    "port": 587,
    "user": "lequytoanptit0303@gmail.com"
  }
}
```

## 📧 Thông tin SMTP đã cấu hình

Từ hình ảnh bạn cung cấp:
- **SMTP Server**: smtp.gmail.com
- **Port**: 587
- **Security**: Auto (STARTTLS)
- **Username**: lequytoanptit0303@gmail.com
- **Password**: zzeh rnuz bmwz sqsa (App Password)

## 🔍 Test OTP System

### Với SMTP Server (Email thực):
1. Chạy: `node smtp-server.js`
2. Mở: `http://localhost:5173/login`
3. Đăng ký với email thật
4. Kiểm tra email inbox

### Với Test Mode (Popup):
1. Không chạy SMTP server
2. Mở: `http://localhost:5173/login` 
3. Đăng ký với email bất kỳ
4. Copy OTP từ popup

## 📁 Files đã tạo:

### `smtp-server.js`
- Node.js server xử lý gửi email
- Sử dụng nodemailer với Gmail SMTP
- API endpoint: `/api/send-otp`

### `src/services/directSMTPService.ts`
- Service client gửi email
- Tự động fallback nếu server không chạy
- Template email OTP đẹp

### `src/features/auth/services/otpService.ts` (đã cập nhật)
- Sử dụng DirectSMTPService thay vì Firebase Functions
- Vẫn lưu log vào Firestore để tracking

## 🔧 Cấu hình SMTP khác

Để đổi sang email provider khác, sửa `SMTP_CONFIG` trong `smtp-server.js`:

### Outlook/Hotmail:
```javascript
const SMTP_CONFIG = {
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@outlook.com',
    pass: 'your-password'
  }
};
```

### Yahoo:
```javascript
const SMTP_CONFIG = {
  host: 'smtp.mail.yahoo.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@yahoo.com',
    pass: 'your-app-password'
  }
};
```

## 🚨 Troubleshooting

### SMTP Server không khởi động:
```bash
# Kiểm tra port 3001 có bị chiếm không
netstat -an | findstr :3001

# Kill process nếu cần
taskkill /F /PID <process_id>
```

### Email không gửi được:
1. **Kiểm tra Gmail App Password:**
   - Phải bật 2FA trước
   - Tạo App Password tại: https://myaccount.google.com/apppasswords
   - Sử dụng password 16 ký tự (không có dấu cách)

2. **Kiểm tra network:**
   - Firewall có block port 587 không
   - VPN có ảnh hưởng không

3. **Kiểm tra logs:**
   ```bash
   # Xem console của smtp-server.js
   # Xem browser console (F12)
   ```

### OTP không hoạt động:
1. **Kiểm tra Firestore rules** cho collection `otp_verifications`
2. **Kiểm tra thời gian hệ thống** (OTP expires trong 10 phút)
3. **Clear cache browser** và thử lại

## 📊 Monitoring

### SMTP Server logs:
```bash
# Console sẽ hiện:
✅ SMTP server ready to send emails
📧 Sending OTP 123456 to user@example.com...
✅ Email sent: <message-id>
```

### Frontend logs:
```javascript
// Browser console (F12):
📧 Preparing to send OTP 123456 to user@example.com...
✅ Email sent via local server to user@example.com
```

### Firestore tracking:
Collection: `email_queue`
```json
{
  "to": "user@example.com",
  "template": "otp_verification", 
  "status": "sent_via_direct_smtp",
  "method": "direct_smtp",
  "createdAt": "timestamp"
}
```

## 🎉 Lợi ích của solution mới:

1. **Không cần Firebase Blaze plan** (tiết kiệm chi phí)
2. **Setup đơn giản** (chỉ cần chạy 1 file Node.js)
3. **Có fallback** (test mode nếu server không chạy)
4. **Email template đẹp** (responsive, professional)
5. **Logging đầy đủ** (debug dễ dàng)
6. **Flexible** (dễ đổi SMTP provider)

## 🔗 Next Steps:

1. **Chạy SMTP server**: `node smtp-server.js`
2. **Test đăng ký account** với email thật
3. **Check email inbox** để xem OTP
4. **Deploy** lên server production nếu cần
