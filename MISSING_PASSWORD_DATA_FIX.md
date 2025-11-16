# 🔧 Fix Missing Password Data - Hướng dẫn xử lý

## 🚨 Vấn đề

Quiz có `havePassword: 'password'` nhưng thiếu field `pwd` (salt + hash).

**Error message:**
```
❌ Quiz password data is missing or disabled: undefined
Error: Quiz này được đánh dấu có mật khẩu nhưng thiếu thông tin bảo mật.
```

## 📋 Nguyên nhân

1. Quiz được tạo trước khi có hệ thống password mới
2. Dữ liệu không được lưu đầy đủ khi tạo quiz
3. Quiz bị lỗi trong quá trình migration

## ✅ Giải pháp Tức Thì (Trong Firebase Console)

### Option 1: Xóa password protection (Khuyến nghị)

1. Vào Firebase Console > Firestore Database
2. Tìm quiz có lỗi (ví dụ: `cPwmY9Ik4Wn2e8BlB0HY`)
3. Sửa các fields:
   ```
   havePassword: "public"
   visibility: "public"
   ```
4. Xóa field `pwd` nếu có
5. Save changes

**Sau đó:** Owner phải vào Edit Quiz và set lại password để tạo pwd field mới.

### Option 2: Thêm pwd field thủ công (Phức tạp hơn)

Nếu bạn biết password gốc:

1. Dùng tool online để tạo SHA256 hash:
   - Salt: Tạo random 32-char hex string
   - Hash: SHA256(salt + ":" + password)

2. Trong Firestore, thêm field:
   ```json
   {
     "pwd": {
       "enabled": true,
       "algo": "SHA256",
       "salt": "your-32-char-hex-salt",
       "hash": "your-64-char-hex-hash"
     }
   }
   ```

## 🔧 Giải pháp Dài hạn (Migration Script)

### Chuẩn bị

1. Lấy `serviceAccountKey.json` từ Firebase Console:
   - Project Settings > Service Accounts
   - Generate new private key
   - Download và đặt vào root folder

2. Chạy dry-run để xem có bao nhiêu quiz bị lỗi:
   ```bash
   node scripts/fixMissingPasswordData.mjs --dry-run
   ```

3. Apply fixes (xóa password protection cho quiz bị lỗi):
   ```bash
   node scripts/fixMissingPasswordData.mjs --fix
   ```

### Script làm gì?

- Tìm tất cả quiz có `havePassword='password'` hoặc `visibility='password'`
- Nhưng không có `pwd.salt` và `pwd.hash`
- Set về `public` (xóa password protection)
- Owner phải vào Edit và set lại password

## 🎯 Thông báo cho Users

Nếu user gặp lỗi này:

**Tin nhắn hiển thị:**
> "Quiz này được đánh dấu có mật khẩu nhưng thiếu thông tin bảo mật. Vui lòng liên hệ người tạo quiz để cập nhật lại mật khẩu."

**Hướng dẫn cho Owner:**
1. Vào "My Quizzes"
2. Edit quiz bị lỗi
3. Bỏ check "Password Protection" → Save
4. Edit lại → Check "Password Protection" → Nhập password mới → Save
5. Hệ thống sẽ tự động tạo pwd field đúng

## 📊 Kiểm tra Quiz có bị lỗi không

Trong Firestore Console, mở quiz document và check:

**❌ BỊ LỖI:**
```json
{
  "havePassword": "password",  // hoặc visibility: "password"
  "pwd": null                  // hoặc không có field pwd
}
```

**✅ ĐÚNG:**
```json
{
  "havePassword": "password",
  "pwd": {
    "enabled": true,
    "algo": "SHA256",
    "salt": "a1b2c3d4e5f6...",  // 32-char hex
    "hash": "9f86d081884c..."   // 64-char hex
  }
}
```

## 🔐 Cách tạo Quiz với Password đúng

Khi tạo quiz mới với password:

1. ✅ Check "Password Protection"
2. ✅ Nhập password (min 6 chars)
3. ✅ Click "Create Quiz"

Hệ thống tự động:
- Generate random salt
- Hash password: SHA256(salt + ":" + password)
- Lưu `pwd: { enabled, algo, salt, hash }`
- Set `havePassword: 'password'` và `visibility: 'password'`

## 📝 Logs để Debug

Khi unlock quiz, check console logs:

```javascript
🔓 Attempting to unlock quiz: cPwmY9Ik4Wn2e8BlB0HY
🔍 Quiz metadata: {
  id: 'cPwmY9Ik4Wn2e8BlB0HY',
  visibility: undefined,
  havePassword: 'password',
  hasPwd: false  // ← BỊ LỖI! phải là true
}
```

Nếu `hasPwd: false` → Quiz thiếu pwd field → Cần fix.

## 🆘 Support

Nếu vẫn gặp lỗi sau khi fix:
1. Clear browser cache
2. Logout và login lại
3. Kiểm tra Firestore rules đã deploy chưa
4. Check console logs để debug thêm
