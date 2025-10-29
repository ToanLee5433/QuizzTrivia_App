# 📧 Hướng dẫn sử dụng Trigger Email from Firestore Extension

## ✅ Extension đã được cài đặt với thông tin:

### 🔧 Configuration hiện tại:

- **Firestore Instance ID**: `(default)`
- **Firestore Instance Location**: `nam5`
- **Authentication Type**: `UsernamePassword`
- **SMTP Connection URI**: `smtps://lequytoanptit0303@gmail.com:vdkgkkemskjpnwty@smtp.gmail.com:465`
- **OAuth2 SMTP Port**: `465`
- **Email documents collection**: `mail` ← **Collection để gửi email**
- **Default FROM address**: `lequytoanptit0303@gmail.com`
- **Default REPLY-TO address**: `lequytoanptit0303@gmail.com`
- **Firestore TTL**: `1 day` (Email sẽ tự động xóa sau 1 ngày)

---

## 🚀 Cách hoạt động:

### 1. **Hệ thống OTP tự động**:
```
User đăng ký → Generate OTP 6 số → Tạo document trong collection 'mail'
   ↓
Extension phát hiện document mới → Gửi email qua Gmail SMTP
   ↓
Email đến inbox user → User nhập OTP → Verify → Tạo account
```

### 2. **Firestore Document Structure**:
Khi user đăng ký, code sẽ tạo document như sau:

```javascript
// Collection: mail
{
  to: ["user@example.com"],
  from: "lequytoanptit0303@gmail.com",
  replyTo: "lequytoanptit0303@gmail.com",
  message: {
    subject: "🔐 Mã xác thực đăng ký Quiz App",
    html: "<html>...</html>",  // HTML template đẹp
    text: "Mã OTP của bạn là: 123456"
  },
  createdAt: Date
}
```

### 3. **Extension tự động**:
- ✅ Phát hiện document mới trong `mail` collection
- ✅ Gửi email qua Gmail SMTP đã config
- ✅ Cập nhật document với status: `delivery.state = "SUCCESS"` hoặc `"ERROR"`
- ✅ Tự động xóa document sau 1 ngày (TTL = 1 day)

---

## 🔐 Bảo mật đã có sẵn:

✅ **App Password Gmail**: Extension sử dụng App Password `vdkgkkemskjpnwty`
✅ **SMTP Secure**: Port 465 với SSL/TLS
✅ **No Cloud Functions needed**: Không cần config Firebase Functions
✅ **Auto cleanup**: Email documents tự động xóa sau 1 ngày

---

## 📝 Cập nhật Code đã thực hiện:

### File: `src/features/auth/services/otpService.ts`

```typescript
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const db = getFirestore();

export const sendOTPEmail = async (email: string, otp: string) => {
  // Tạo document trong collection 'mail'
  await addDoc(collection(db, 'mail'), {
    to: [email],
    from: 'lequytoanptit0303@gmail.com',
    replyTo: 'lequytoanptit0303@gmail.com',
    message: {
      subject: '🔐 Mã xác thực đăng ký Quiz App',
      html: `<!-- Beautiful HTML template -->`,
      text: `Mã OTP của bạn là: ${otp}`
    },
    createdAt: new Date()
  });
  
  // Extension sẽ tự động gửi email!
};
```

---

## ✅ Không cần làm gì thêm!

### ✨ Các tính năng hoạt động ngay:

1. **OTP Generation**: 6-digit random code
2. **Hash OTP**: SHA256 với secret key
3. **SessionStorage**: Lưu OTP hash client-side
4. **Email Sending**: Extension tự động gửi qua Gmail
5. **Beautiful Template**: HTML email responsive với gradient
6. **Verify Flow**: 3 attempts, 10 minutes expiry
7. **Auto Cleanup**: Firestore TTL xóa email sau 1 ngày

---

## 🧪 Test luôn:

### 1. Chạy frontend:
```bash
npm run dev
```

### 2. Thử đăng ký:
- Mở http://localhost:5173
- Click "Đăng ký"
- Nhập email của bạn
- Click "Đăng ký" → Email sẽ được gửi tự động!
- Kiểm tra inbox → Nhập OTP 6 số
- Hoàn tất đăng ký ✅

### 3. Kiểm tra Firestore Console:
- Vào Firebase Console → Firestore Database
- Collection `mail` → Xem document vừa tạo
- Kiểm tra field `delivery.state`: 
  - `SUCCESS` = Email đã gửi thành công ✅
  - `ERROR` = Có lỗi ❌

---

## 🐛 Troubleshooting:

### ❌ Email không đến:

1. **Kiểm tra Firestore Console**:
   - Collection `mail` có document mới không?
   - Field `delivery.state` là gì?
   - Field `delivery.error` có error message?

2. **Kiểm tra Gmail**:
   - Email có bị vào Spam không?
   - Gmail App Password có đúng không?

3. **Kiểm tra Extension Logs**:
   - Firebase Console → Extensions
   - Click "Trigger Email from Firestore"
   - Tab "Logs" → Xem error logs

### ❌ Extension không hoạt động:

```bash
# Check extension status
firebase ext:list

# View extension info
firebase ext:info firebase/firestore-send-email

# View logs
firebase functions:log --only firestore-send-email
```

---

## 🎯 So sánh với Cloud Functions:

| Feature | Cloud Functions | Firestore Extension |
|---------|----------------|-------------------|
| Setup | Phức tạp, cần config | ✅ Đã setup sẵn |
| Code | Phải viết function | ✅ Chỉ tạo document |
| Deployment | `firebase deploy --only functions` | ✅ Không cần deploy |
| Email Config | Phải set config | ✅ Đã config trong extension |
| Monitoring | Functions logs | ✅ Extension logs + Firestore |
| Cost | Functions invocations | ✅ Chỉ Firestore reads/writes |

---

## 📊 Flow hoàn chỉnh:

```
1. User nhập email + password → Click "Đăng ký"
   ↓
2. Frontend: generateOTP() → Random 6 digits
   ↓
3. Frontend: storeOTP() → Hash + save to sessionStorage
   ↓
4. Frontend: sendOTPEmail() → addDoc(collection(db, 'mail'), {...})
   ↓
5. Extension: Phát hiện document mới → Gửi email qua Gmail SMTP
   ↓
6. User: Kiểm tra inbox → Nhận email với OTP
   ↓
7. User: Nhập 6 số OTP → Click "Xác thực"
   ↓
8. Frontend: verifyOTP() → So sánh hash
   ↓
9. Frontend: createUserWithEmailAndPassword() → Tạo Firebase account
   ↓
10. ✅ Đăng ký thành công!
```

---

## 🎉 Kết luận:

✅ **Không cần Cloud Functions**
✅ **Không cần `firebase deploy --only functions`**
✅ **Không cần config email password trong Firebase Functions**
✅ **Extension đã sẵn sàng, chỉ cần tạo documents trong `mail` collection**
✅ **Email tự động gửi, tự động cleanup**

**→ READY TO TEST! 🚀**
