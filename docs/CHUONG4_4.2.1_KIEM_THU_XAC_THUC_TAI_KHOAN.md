# 4.2.1. KẾT QUẢ KIỂM THỬ PHÂN HỆ XÁC THỰC & TÀI KHOẢN

---

## Tổng quan

Phân hệ Xác thực & Tài khoản là nền tảng bảo mật của hệ thống QuizTrivia App. Các test case dưới đây kiểm tra toàn bộ quy trình đăng ký, đăng nhập, khôi phục mật khẩu và quản lý hồ sơ người dùng.

**Tổng số Test Cases:** 7  
**Môi trường kiểm thử:** Chrome 120+, Firefox 121+, Safari 17+, Mobile (iOS/Android)  
**Ngày thực hiện:** 20/12/2024

---

## Bảng Kết quả Kiểm thử Chi tiết

| STT | Tên kịch bản | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|-----|-------------|-------------------|------------------|-----------------|------------|
| TC-AUTH-01 | **Đăng ký tài khoản thành công với Email hợp lệ** | 1. Truy cập trang Đăng ký (`/register`)<br>2. Nhập Email: `testuser@gmail.com`<br>3. Nhập Mật khẩu: `Test@123456`<br>4. Nhập Xác nhận mật khẩu: `Test@123456`<br>5. Nhập Tên hiển thị: `Test User`<br>6. Tick đồng ý Điều khoản sử dụng<br>7. Click nút "Đăng ký" | - Hiển thị thông báo "Đăng ký thành công"<br>- Gửi email xác thực đến địa chỉ đã đăng ký<br>- Chuyển hướng đến trang Đăng nhập hoặc Dashboard<br>- Tài khoản được tạo trong Firebase Auth | - Thông báo "Đăng ký thành công!" hiển thị dạng Toast màu xanh<br>- Email xác thực được gửi trong vòng 5 giây<br>- Tự động chuyển đến `/login` sau 2 giây<br>- Document user được tạo trong Firestore collection `users` | ✅ **PASS** |
| TC-AUTH-02 | **Kiểm tra báo lỗi khi Đăng ký trùng Email** | 1. Truy cập trang Đăng ký (`/register`)<br>2. Nhập Email đã tồn tại: `existing@gmail.com`<br>3. Nhập đầy đủ các thông tin khác hợp lệ<br>4. Click nút "Đăng ký" | - Hiển thị thông báo lỗi "Email đã được sử dụng"<br>- Form không được submit<br>- Không tạo tài khoản mới<br>- Field Email được highlight màu đỏ | - Toast lỗi hiển thị: "Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập."<br>- Input Email có border màu đỏ và icon cảnh báo<br>- Focus tự động vào field Email<br>- Không có request tạo user mới | ✅ **PASS** |
| TC-AUTH-03 | **Đăng nhập thành công với tài khoản đã kích hoạt** | 1. Truy cập trang Đăng nhập (`/login`)<br>2. Nhập Email: `verified@gmail.com`<br>3. Nhập Mật khẩu: `Correct@123`<br>4. Click nút "Đăng nhập" | - Đăng nhập thành công<br>- Hiển thị thông báo "Chào mừng trở lại!"<br>- Chuyển hướng đến Dashboard<br>- Lưu session/token vào localStorage | - Loading spinner hiển thị 1-2 giây<br>- Toast thành công: "Chào mừng trở lại, [Tên user]!"<br>- Redirect đến `/dashboard`<br>- JWT token được lưu, user state cập nhật trong Redux | ✅ **PASS** |
| TC-AUTH-04 | **Kiểm tra báo lỗi khi Đăng nhập sai mật khẩu** | 1. Truy cập trang Đăng nhập (`/login`)<br>2. Nhập Email hợp lệ: `user@gmail.com`<br>3. Nhập Mật khẩu sai: `WrongPass123`<br>4. Click nút "Đăng nhập"<br>5. Thử lại 3 lần với mật khẩu sai | - Hiển thị thông báo lỗi "Email hoặc mật khẩu không đúng"<br>- Không đăng nhập được<br>- Sau 5 lần sai: Tạm khóa 15 phút | - Lần 1-4: Toast lỗi "Email hoặc mật khẩu không chính xác"<br>- Lần 5: "Tài khoản tạm khóa do đăng nhập sai nhiều lần. Thử lại sau 15 phút."<br>- Field mật khẩu bị clear sau mỗi lần thử<br>- Rate limiting hoạt động đúng (Firebase Auth) | ✅ **PASS** |
| TC-AUTH-05 | **Đăng nhập thành công bằng Google (OAuth)** | 1. Truy cập trang Đăng nhập (`/login`)<br>2. Click nút "Đăng nhập với Google"<br>3. Popup Google Sign-In mở ra<br>4. Chọn tài khoản Google<br>5. Cấp quyền truy cập (nếu lần đầu) | - Popup Google hiển thị đúng<br>- Đăng nhập thành công sau khi chọn tài khoản<br>- Tự động tạo user mới nếu chưa có<br>- Lấy Avatar và Tên từ Google Profile | - Popup Google Sign-In mở trong cửa sổ mới<br>- Sau khi chọn account: redirect về app trong 2-3 giây<br>- User mới: tự động tạo document trong `users` collection với `provider: "google"`<br>- Avatar và displayName được sync từ Google<br>- Toast: "Đăng nhập thành công với Google!" | ✅ **PASS** |
| TC-AUTH-06 | **Sử dụng chức năng Quên mật khẩu/Đặt lại mật khẩu** | 1. Truy cập trang Đăng nhập (`/login`)<br>2. Click link "Quên mật khẩu?"<br>3. Nhập Email: `forgetpass@gmail.com`<br>4. Click "Gửi link đặt lại"<br>5. Mở email và click link reset<br>6. Nhập mật khẩu mới: `NewPass@456`<br>7. Xác nhận mật khẩu mới<br>8. Click "Đặt lại mật khẩu" | - Email reset được gửi trong 30 giây<br>- Link reset hợp lệ trong 1 giờ<br>- Đặt lại mật khẩu thành công<br>- Có thể đăng nhập với mật khẩu mới | - Modal "Quên mật khẩu" hiển thị<br>- Sau khi submit: "Email đặt lại mật khẩu đã được gửi!"<br>- Email từ Firebase đến trong 10-20 giây<br>- Link redirect đến `/reset-password?oobCode=xxx`<br>- Sau reset: "Mật khẩu đã được cập nhật thành công!"<br>- Đăng nhập với mật khẩu mới: OK | ✅ **PASS** |
| TC-AUTH-07 | **Cập nhật thông tin hồ sơ (Avatar, Tên hiển thị)** | 1. Đăng nhập vào hệ thống<br>2. Vào trang Hồ sơ (`/profile`)<br>3. Click nút "Chỉnh sửa"<br>4. Upload ảnh Avatar mới (file JPG 2MB)<br>5. Đổi Tên hiển thị: "Nguyen Van A"<br>6. Click "Lưu thay đổi" | - Upload ảnh thành công (resize nếu > 1MB)<br>- Tên hiển thị được cập nhật<br>- Thông báo "Cập nhật thành công"<br>- Avatar mới hiển thị ngay trên Header | - Khi chọn ảnh: Preview hiển thị ngay<br>- Ảnh được upload lên Firebase Storage, resize còn 200x200px<br>- Progress bar hiển thị % upload<br>- Sau khi lưu: Toast "Hồ sơ đã được cập nhật!"<br>- Avatar mới hiển thị ở Header, Sidebar, Profile page<br>- Firestore document `users/{uid}` được update | ✅ **PASS** |

---

## Chi tiết Kỹ thuật Các Test Case

### TC-AUTH-01: Đăng ký tài khoản

**Validation Rules đã kiểm tra:**
- Email: Format hợp lệ (regex), không trống
- Password: Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt
- Confirm Password: Khớp với Password
- Display Name: 2-50 ký tự, không ký tự đặc biệt

**Firebase Auth Response:**
```json
{
  "user": {
    "uid": "abc123xyz",
    "email": "testuser@gmail.com",
    "emailVerified": false,
    "displayName": "Test User"
  }
}
```

### TC-AUTH-05: Google OAuth Flow

**OAuth Scopes được yêu cầu:**
- `email` - Địa chỉ email
- `profile` - Tên và ảnh đại diện

**Data được sync:**
```typescript
{
  uid: googleUser.uid,
  email: googleUser.email,
  displayName: googleUser.displayName,
  photoURL: googleUser.photoURL,
  provider: "google",
  createdAt: serverTimestamp()
}
```

---

## Tổng kết

| Metric | Giá trị |
|--------|---------|
| Tổng số Test Cases | 7 |
| Passed | 7 |
| Failed | 0 |
| Blocked | 0 |
| **Tỷ lệ Pass** | **100%** |

### Ghi chú
- Tất cả test cases đều PASS trên cả 3 trình duyệt (Chrome, Firefox, Safari)
- Mobile testing (iOS Safari, Android Chrome): PASS
- Rate limiting hoạt động đúng theo cấu hình Firebase Auth
- Email verification flow hoạt động ổn định

---

*Chương 4 - Mục 4.2.1 - Kết quả Kiểm thử Phân hệ Xác thực & Tài khoản*
