# 🔐 Hướng Dẫn Cấu Hình OTP Email

## 📧 Bước 1: Tạo Gmail App Password

1. Đăng nhập Gmail của bạn
2. Bật **2-Factor Authentication**:
   - Vào: https://myaccount.google.com/security
   - Chọn "2-Step Verification" → Bật

3. Tạo **App Password**:
   - Vào: https://myaccount.google.com/apppasswords
   - Chọn:
     - App: **Mail**
     - Device: **Other** (nhập "Quiz App")
   - Click **Generate**
   - Copy mật khẩu 16 ký tự (ví dụ: `abcd efgh ijkl mnop`)

## ⚙️ Bước 2: Config Firebase Functions

### Option 1: Dùng Firebase CLI (Recommended)

```powershell
# Set email config
firebase functions:config:set email.user="your-email@gmail.com" email.password="abcdefghijklmnop"

# Verify config
firebase functions:config:get
```

### Option 2: Dùng .env (Development)

Sửa file `functions/.env`:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
```

⚠️ **Lưu ý**: Option 2 chỉ dùng cho development. Production phải dùng Option 1.

## 🚀 Bước 3: Deploy Functions

```powershell
# Build functions
cd functions
npm run build

# Deploy
cd ..
firebase deploy --only functions
```

Đợi vài phút để Functions deploy xong.

## ✅ Bước 4: Test

1. Mở: http://localhost:5173
2. Click "Đăng ký"
3. Nhập thông tin → Submit
4. Check email (có thể trong Spam)
5. Nhập OTP 6 số
6. Đăng ký thành công!

## 🔍 Debug

### Nếu không nhận được email:

1. **Check Functions logs**:
   ```powershell
   firebase functions:log
   ```

2. **Check Gmail settings**:
   - "Less secure app access" phải TẮT (vì dùng App Password)
   - App Password đúng chưa?

3. **Check Firestore**:
   - Collection `otp_logs` → xem status "sent" hay "failed"

4. **Test Functions local**:
   ```powershell
   firebase emulators:start --only functions
   ```

### Lỗi thường gặp:

❌ **"Invalid login"**: App Password sai
- Tạo lại App Password mới

❌ **"Failed to send email"**: SMTP config sai
- Check EMAIL_USER và EMAIL_PASSWORD

❌ **"Missing or insufficient permissions"**: Firestore rules
- Rules đã được deploy chưa?

## 📝 Email Template

Email OTP có:
- **Subject**: 🔐 Mã xác thực đăng ký Quiz App
- **Content**: 
  - Logo Quiz App
  - Mã OTP 6 số (font lớn, dễ đọc)
  - Cảnh báo: Có hiệu lực 10 phút
  - Lưu ý bảo mật

## 🔐 Bảo Mật

✅ **Đã implement**:
- OTP được hash (SHA256) trước khi lưu
- Lưu trong sessionStorage (không Firestore)
- Gửi OTP qua Cloud Functions (server-side)
- Giới hạn 3 lần thử
- Hết hạn sau 10 phút
- Không log OTP ra console

✅ **Không lộ OTP**:
- Network tab chỉ thấy "success": true
- Console không in OTP
- Browser không lưu OTP

---

## 🎯 Summary

**Flow hoàn chỉnh**:
```
User Register
    ↓
Generate OTP (6 digits)
    ↓
Hash OTP → Store sessionStorage
    ↓
Call Cloud Function sendOTP(email, otp)
    ↓
Function gửi email qua Gmail SMTP
    ↓
User nhận email → Nhập OTP
    ↓
Verify hash → Success
    ↓
Create Firebase Account
    ↓
Navigate to role-selection
```

**Email được gửi TỰ ĐỘNG** bởi Firebase Functions!
**OTP được BẢO MẬT** với hash và sessionStorage!
**Không cần Firestore permissions** cho OTP storage!

🎉 Done!
