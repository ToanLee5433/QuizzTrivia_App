# 4.2.1. PHÂN HỆ XÁC THỰC VÀ PHÂN QUYỀN

---

## Tổng quan

Phân hệ xác thực và phân quyền là nền tảng bảo mật của hệ thống QuizTrivia App, được xây dựng trên Firebase Authentication. Hệ thống hỗ trợ đăng ký, đăng nhập qua Email/Password và Google OAuth, cùng với cơ chế phân quyền Role-Based Access Control (RBAC).

---

## 1. Kiến trúc Xác thực

### 1.1. Sơ đồ xác thực

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐        ┌──────────────────┐        ┌──────────┐  │
│   │  Client  │ ─────▶ │ Firebase Auth    │ ─────▶ │ Firestore│  │
│   │  (React) │        │ (Authentication) │        │  (Users) │  │
│   └──────────┘        └──────────────────┘        └──────────┘  │
│        │                      │                        │        │
│        │              ┌───────┴───────┐               │        │
│        │              │               │               │        │
│        │        ┌─────▼─────┐   ┌─────▼─────┐        │        │
│        │        │  Email/   │   │  Google   │        │        │
│        │        │  Password │   │   OAuth   │        │        │
│        │        └───────────┘   └───────────┘        │        │
│        │                                              │        │
│        │◀────────────── ID Token ────────────────────┤        │
│        │                                              │        │
│        │────────────── User Data ───────────────────▶│        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2. Roles và Permissions

| Role | Code | Permissions |
|------|------|-------------|
| **User** | `user` | Làm quiz, xem leaderboard, lưu favorites |
| **Creator** | `creator` | User + Tạo quiz, quản lý quiz của mình |
| **Admin** | `admin` | Creator + Quản lý users, phê duyệt quiz, xem thống kê |

---

## 2. Test Cases - Đăng ký tài khoản

### 2.1. TC-AUTH-001: Đăng ký với Email hợp lệ

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-001 |
| **Mô tả** | Đăng ký tài khoản mới với email và password hợp lệ |
| **Preconditions** | Email chưa được đăng ký trong hệ thống |
| **Test Data** | Email: `newuser@test.com`, Password: `Test@123456` |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Truy cập trang `/register` | Hiển thị form đăng ký |
| 2 | Nhập email `newuser@test.com` | Field email được điền |
| 3 | Nhập password `Test@123456` | Field password được điền (hiển thị dấu •) |
| 4 | Nhập confirm password | Password match |
| 5 | Click nút "Đăng ký" | Loading state hiển thị |
| 6 | Đợi xử lý | Redirect đến Dashboard |
| 7 | Kiểm tra Firestore | Document user được tạo với role = "user" |

**Kết quả:** ✅ PASS

**Evidence:**
```json
// Firestore Document: /users/{uid}
{
  "uid": "abc123xyz",
  "email": "newuser@test.com",
  "displayName": "newuser",
  "role": "user",
  "createdAt": "2025-01-15T10:30:00Z",
  "stats": {
    "quizzesCompleted": 0,
    "totalScore": 0
  }
}
```

---

### 2.2. TC-AUTH-002: Đăng ký với Email đã tồn tại

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-002 |
| **Mô tả** | Đăng ký với email đã có trong hệ thống |
| **Preconditions** | Email `existing@test.com` đã được đăng ký |
| **Test Data** | Email: `existing@test.com`, Password: `Test@123456` |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Truy cập trang `/register` | Hiển thị form đăng ký |
| 2 | Nhập email đã tồn tại | Field email được điền |
| 3 | Nhập password hợp lệ | Field password được điền |
| 4 | Click nút "Đăng ký" | Loading state hiển thị |
| 5 | Đợi xử lý | Hiển thị lỗi: "Email này đã được sử dụng" |
| 6 | Kiểm tra form | Form không reset, user có thể sửa |

**Kết quả:** ✅ PASS

---

### 2.3. TC-AUTH-003: Đăng ký với Password yếu

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-003 |
| **Mô tả** | Đăng ký với password không đủ mạnh |
| **Test Data** | Password variations |

**Test Data và Expected Results:**

| Password | Độ dài | Kết quả | Lỗi hiển thị |
|----------|--------|---------|--------------|
| `123` | 3 | ❌ FAIL | "Mật khẩu tối thiểu 6 ký tự" |
| `12345` | 5 | ❌ FAIL | "Mật khẩu tối thiểu 6 ký tự" |
| `123456` | 6 | ✅ PASS | - |
| `password` | 8 | ⚠️ WARN | Hiển thị "Mật khẩu yếu" (vẫn cho đăng ký) |
| `Test@123` | 8 | ✅ PASS | Hiển thị "Mật khẩu mạnh" |

**Kết quả:** ✅ PASS - Validation hoạt động đúng

---

### 2.4. TC-AUTH-004: Đăng ký với Email không hợp lệ

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-004 |
| **Mô tả** | Đăng ký với các định dạng email không hợp lệ |

**Test Data:**

| Email Input | Kết quả | Lỗi hiển thị |
|-------------|---------|--------------|
| `notanemail` | ❌ FAIL | "Email không hợp lệ" |
| `missing@domain` | ❌ FAIL | "Email không hợp lệ" |
| `@nodomain.com` | ❌ FAIL | "Email không hợp lệ" |
| `spaces in@email.com` | ❌ FAIL | "Email không hợp lệ" |
| `` (empty) | ❌ FAIL | "Email là bắt buộc" |
| `valid+tag@email.com` | ✅ PASS | - |
| `user.name@sub.domain.com` | ✅ PASS | - |

**Kết quả:** ✅ PASS

---

## 3. Test Cases - Đăng nhập

### 3.1. TC-AUTH-005: Đăng nhập Email/Password thành công

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-005 |
| **Mô tả** | Đăng nhập với credentials đúng |
| **Preconditions** | Account `user@test.com` đã tồn tại |
| **Test Data** | Email: `user@test.com`, Password: `Test@123456` |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Truy cập trang `/login` | Hiển thị form đăng nhập |
| 2 | Nhập email đúng | Field được điền |
| 3 | Nhập password đúng | Field được điền |
| 4 | Click "Đăng nhập" | Loading state |
| 5 | Đợi xử lý | Redirect đến `/dashboard` |
| 6 | Kiểm tra header | Hiển thị avatar và tên user |
| 7 | Kiểm tra localStorage | `firebase:authUser` được lưu |

**Kết quả:** ✅ PASS

---

### 3.2. TC-AUTH-006: Đăng nhập với Password sai

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-006 |
| **Mô tả** | Đăng nhập với password không đúng |
| **Test Data** | Email: `user@test.com`, Password: `WrongPassword` |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Nhập email đúng | Field được điền |
| 2 | Nhập password sai | Field được điền |
| 3 | Click "Đăng nhập" | Loading state |
| 4 | Đợi xử lý | Lỗi: "Email hoặc mật khẩu không đúng" |
| 5 | Kiểm tra form | Password field được clear |
| 6 | Kiểm tra redirect | Vẫn ở trang `/login` |

**Kết quả:** ✅ PASS

**Ghi chú bảo mật:** Lỗi không tiết lộ email có tồn tại hay không (generic error message)

---

### 3.3. TC-AUTH-007: Đăng nhập với Google OAuth

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-007 |
| **Mô tả** | Đăng nhập bằng tài khoản Google |
| **Preconditions** | Đã có tài khoản Google |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Truy cập `/login` | Form hiển thị |
| 2 | Click "Đăng nhập với Google" | Popup Google Sign-in mở |
| 3 | Chọn tài khoản Google | Popup đóng |
| 4 | Đợi xử lý | Redirect đến Dashboard |
| 5 | Kiểm tra user info | Avatar và tên từ Google |
| 6 | Kiểm tra Firestore | Document user được tạo (nếu mới) |

**Kết quả:** ✅ PASS

**Evidence:**
```json
// User từ Google OAuth
{
  "uid": "google-uid-123",
  "email": "user@gmail.com",
  "displayName": "Google User",
  "photoURL": "https://lh3.googleusercontent.com/...",
  "role": "user",
  "provider": "google.com"
}
```

---

### 3.4. TC-AUTH-008: Brute Force Protection

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-008 |
| **Mô tả** | Kiểm tra bảo vệ chống brute force |
| **Preconditions** | Account tồn tại |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1-5 | Đăng nhập sai 5 lần liên tiếp | Lỗi thông thường |
| 6 | Đăng nhập sai lần thứ 6 | Lỗi: "Quá nhiều lần thử. Vui lòng đợi" |
| 7 | Thử ngay lập tức | Vẫn bị block |
| 8 | Đợi 5 phút | Có thể thử lại |
| 9 | Đăng nhập đúng | Thành công |

**Kết quả:** ✅ PASS - Firebase Auth tự động implement rate limiting

---

## 4. Test Cases - Quên Mật khẩu

### 4.1. TC-AUTH-009: Reset Password thành công

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-009 |
| **Mô tả** | Reset password qua email |
| **Test Data** | Email: `user@test.com` (đã đăng ký) |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Quên mật khẩu?" tại login page | Redirect đến `/forgot-password` |
| 2 | Nhập email đã đăng ký | Field được điền |
| 3 | Click "Gửi email reset" | Loading state |
| 4 | Đợi xử lý | Thông báo: "Email đã được gửi" |
| 5 | Kiểm tra inbox | Email reset password nhận được |
| 6 | Click link trong email | Trang đặt password mới |
| 7 | Nhập password mới | Cập nhật thành công |
| 8 | Đăng nhập với password mới | Thành công |

**Kết quả:** ✅ PASS

---

### 4.2. TC-AUTH-010: Reset Password - Email không tồn tại

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-010 |
| **Mô tả** | Reset password với email không có trong hệ thống |
| **Test Data** | Email: `nonexistent@test.com` |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Nhập email không tồn tại | Field được điền |
| 2 | Click "Gửi email reset" | Loading state |
| 3 | Đợi xử lý | Thông báo: "Email đã được gửi" |

**Kết quả:** ✅ PASS

**Ghi chú bảo mật:** Hệ thống hiển thị thông báo giống hệt như khi email tồn tại để tránh enumeration attack. Thực tế không có email nào được gửi.

---

## 5. Test Cases - Phân quyền

### 5.1. TC-AUTH-011: User truy cập trang Admin

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-011 |
| **Mô tả** | Người dùng thường cố gắng truy cập Admin Panel |
| **Preconditions** | Đăng nhập với role = "user" |
| **Test Data** | URL: `/admin/*` |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Đăng nhập với account user | Dashboard hiển thị |
| 2 | Truy cập `/admin` trực tiếp | Redirect đến `/unauthorized` hoặc `/` |
| 3 | Truy cập `/admin/users` | Redirect đến `/unauthorized` |
| 4 | Truy cập `/admin/quizzes` | Redirect đến `/unauthorized` |
| 5 | Kiểm tra navigation | Không có menu item "Admin" |

**Kết quả:** ✅ PASS

**Implementation:**
```typescript
// src/routes/ProtectedRoute.tsx
function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
}
```

---

### 5.2. TC-AUTH-012: Creator truy cập trang Admin

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-012 |
| **Mô tả** | Creator không được truy cập Admin Panel |
| **Preconditions** | Đăng nhập với role = "creator" |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Đăng nhập với account creator | Dashboard hiển thị |
| 2 | Kiểm tra navigation | Có "Tạo Quiz", không có "Admin" |
| 3 | Truy cập `/admin` | Redirect đến `/unauthorized` |
| 4 | Truy cập `/create-quiz` | Trang tạo quiz hiển thị ✅ |
| 5 | Truy cập `/my-quizzes` | Danh sách quiz của mình ✅ |

**Kết quả:** ✅ PASS

---

### 5.3. TC-AUTH-013: Anonymous User Access

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-013 |
| **Mô tả** | User chưa đăng nhập có thể xem public content |
| **Preconditions** | Không đăng nhập |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Truy cập `/` (Landing Page) | Hiển thị trang chủ ✅ |
| 2 | Truy cập `/quizzes` | Hiển thị danh sách quiz public ✅ |
| 3 | Click vào một quiz | Hiển thị preview ✅ |
| 4 | Click "Bắt đầu Quiz" | Redirect đến `/login` |
| 5 | Truy cập `/dashboard` | Redirect đến `/login` |
| 6 | Truy cập `/create-quiz` | Redirect đến `/login` |
| 7 | Truy cập `/profile` | Redirect đến `/login` |

**Kết quả:** ✅ PASS

---

### 5.4. TC-AUTH-014: Admin Full Access

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-014 |
| **Mô tả** | Admin có quyền truy cập tất cả |
| **Preconditions** | Đăng nhập với role = "admin" |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Đăng nhập với account admin | Dashboard admin hiển thị |
| 2 | Truy cập `/admin` | ✅ Admin Panel |
| 3 | Truy cập `/admin/users` | ✅ Danh sách users |
| 4 | Truy cập `/admin/quizzes` | ✅ Tất cả quizzes (kể cả pending) |
| 5 | Truy cập `/create-quiz` | ✅ Có thể tạo quiz |
| 6 | Truy cập quiz của user khác | ✅ Có thể xem và edit |
| 7 | Approve/Reject quiz | ✅ Thành công |

**Kết quả:** ✅ PASS

---

## 6. Test Cases - Session Management

### 6.1. TC-AUTH-015: Persistent Session

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-015 |
| **Mô tả** | Session được giữ sau khi đóng browser |
| **Preconditions** | Đăng nhập thành công |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Đăng nhập thành công | Dashboard hiển thị |
| 2 | Đóng browser hoàn toàn | - |
| 3 | Mở lại browser | - |
| 4 | Truy cập app | Vẫn đang đăng nhập ✅ |
| 5 | Kiểm tra localStorage | Token vẫn còn |

**Kết quả:** ✅ PASS

**Implementation:**
```typescript
// Firebase Auth persistence
import { browserLocalPersistence, setPersistence } from 'firebase/auth';

setPersistence(auth, browserLocalPersistence);
```

---

### 6.2. TC-AUTH-016: Logout

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-016 |
| **Mô tả** | Đăng xuất xóa session hoàn toàn |
| **Preconditions** | Đang đăng nhập |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click avatar → "Đăng xuất" | Confirm dialog |
| 2 | Confirm đăng xuất | Redirect đến `/` |
| 3 | Kiểm tra localStorage | Auth tokens bị xóa |
| 4 | Truy cập `/dashboard` | Redirect đến `/login` |
| 5 | Nhấn nút Back | Không thể quay lại protected page |

**Kết quả:** ✅ PASS

---

## 7. Test Cases - Security

### 7.1. TC-AUTH-017: XSS Prevention trong Email

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-017 |
| **Mô tả** | Input được sanitize để ngăn XSS |
| **Test Data** | Malicious inputs |

**Test Data:**

| Input | Field | Expected |
|-------|-------|----------|
| `<script>alert('xss')</script>@test.com` | Email | Bị reject hoặc escaped |
| `user"><img src=x onerror=alert(1)>` | Display Name | Escaped khi hiển thị |
| `javascript:alert(1)` | Profile URL | Không thực thi |

**Kết quả:** ✅ PASS - DOMPurify và Firebase validation bảo vệ

---

### 7.2. TC-AUTH-018: CSRF Protection

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AUTH-018 |
| **Mô tả** | Request từ domain khác không thực hiện được |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tạo trang HTML giả mạo | - |
| 2 | Submit form đến API | Request bị block bởi CORS |
| 3 | Kiểm tra response | 403 Forbidden |

**Kết quả:** ✅ PASS - Firebase SDK sử dụng token-based auth

---

## 8. Bảng Tổng hợp Test Cases

| Test ID | Tên Test | Kết quả | Ghi chú |
|---------|----------|---------|---------|
| TC-AUTH-001 | Đăng ký email hợp lệ | ✅ PASS | - |
| TC-AUTH-002 | Đăng ký email trùng | ✅ PASS | Error handling |
| TC-AUTH-003 | Password validation | ✅ PASS | 6-128 chars |
| TC-AUTH-004 | Email validation | ✅ PASS | RFC 5322 |
| TC-AUTH-005 | Đăng nhập thành công | ✅ PASS | - |
| TC-AUTH-006 | Đăng nhập sai password | ✅ PASS | Generic error |
| TC-AUTH-007 | Google OAuth | ✅ PASS | Popup flow |
| TC-AUTH-008 | Brute force protection | ✅ PASS | Firebase built-in |
| TC-AUTH-009 | Reset password | ✅ PASS | Email link |
| TC-AUTH-010 | Reset - email không tồn tại | ✅ PASS | No enumeration |
| TC-AUTH-011 | User → Admin access | ✅ PASS | Blocked |
| TC-AUTH-012 | Creator → Admin access | ✅ PASS | Blocked |
| TC-AUTH-013 | Anonymous access | ✅ PASS | Public only |
| TC-AUTH-014 | Admin full access | ✅ PASS | All routes |
| TC-AUTH-015 | Persistent session | ✅ PASS | localStorage |
| TC-AUTH-016 | Logout | ✅ PASS | Clear tokens |
| TC-AUTH-017 | XSS prevention | ✅ PASS | Sanitized |
| TC-AUTH-018 | CSRF protection | ✅ PASS | Token-based |

---

## 9. Các vấn đề phát hiện và khắc phục

### 9.1. Issues Found

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Password không hiện yêu cầu độ mạnh | Low | ✅ Fixed |
| 2 | Google OAuth popup bị block trên Safari | Medium | ✅ Fixed (redirect mode) |
| 3 | Session không refresh sau 1 giờ | Medium | ✅ Fixed (auto refresh) |

### 9.2. Security Recommendations

1. ✅ **Implemented**: Rate limiting cho login attempts
2. ✅ **Implemented**: Generic error messages
3. ✅ **Implemented**: HTTPS only
4. ⏳ **Planned**: Two-Factor Authentication (2FA)
5. ⏳ **Planned**: Login activity log

---

## Kết luận

Phân hệ xác thực và phân quyền của QuizTrivia App đã được kiểm thử toàn diện với:

- **18 test cases** covering authentication flows
- **100% pass rate** trên tất cả test cases
- **Security best practices** được implement đầy đủ
- **Role-based access control** hoạt động chính xác

Hệ thống đảm bảo bảo mật và phân quyền đúng đắn cho tất cả các loại người dùng.

---

*Chương 4 - Mục 4.2.1 - Phân hệ Xác thực và Phân quyền*
