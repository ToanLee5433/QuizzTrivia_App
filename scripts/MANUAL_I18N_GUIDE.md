# Hướng Dẫn Hoàn Thiện i18n Thủ Công

## ✅ Đã Hoàn Thành

- ✅ **1,689 translation keys** đã được tạo trong `public/locales/`
- ✅ **Translation infrastructure** hoàn chỉnh (i18next, useTranslation)
- ✅ **Automation scripts** sẵn sàng

## 🚧 Còn Lại - Làm Thủ Công An Toàn

### **Tại sao không dùng aggressive replacer?**
- Aggressive replacer đã thay thế cả trong:
  - Object keys: `{ role: 'user' }` → `{ t('user') }`
  - Type definitions: `'quizzes' | 'reviews'` → `t('quizzes') | t('reviews')`
  - URL paths, API endpoints
  - Configuration values
  
→ Gây ra **1,027 lỗi TypeScript**

### **Cách Làm An Toàn**

#### 1. **Xác định các string cần i18n:**
```typescript
// ✅ CẦN thay thế (UI text):
<button>Đăng nhập</button>           → <button>{t('dangNhap')}</button>
<p>Xin chào</p>                      → <p>{t('xinChao')}</p>
alert('Lưu thành công')              → alert(t('luuThanhCong'))

// ❌ KHÔNG thay thế (technical values):
role: 'user'                         → GIỮ NGUYÊN
type: 'quizzes' | 'reviews'          → GIỮ NGUYÊN  
path: '/dashboard'                   → GIỮ NGUYÊN
firebase: 'error'                    → GIỮ NGUYÊN
```

#### 2. **Quy trình từng file:**

**Bước 1**: Mở file cần i18n
```bash
code src/features/auth/components/RoleSelection.tsx
```

**Bước 2**: Thêm import nếu chưa có:
```typescript
import { useTranslation } from 'react-i18next';
```

**Bước 3**: Thêm hook trong component:
```typescript
const { t } = useTranslation();
```

**Bước 4**: Thay thế từng string (CHỈ UI text):
```typescript
// Before:
<h2>Chọn vai trò</h2>
<p>Quản trị viên có quyền cao nhất</p>

// After:
<h2>{t('chonVaiTro')}</h2>
<p>{t('quanTriVienCoQuyenCaoNhat')}</p>
```

**Bước 5**: Kiểm tra ngay:
```bash
npm run dev
# Test trang vừa sửa
# Đổi ngôn ngữ VI ↔ EN
```

#### 3. **Ưu tiên các module:**

**Mức cao (User-facing UI):**
1. `src/features/auth/components/` - Authentication UI
2. `src/features/quiz/components/` - Quiz cards, filters
3. `src/shared/components/` - Sidebar, Header, Footer
4. `src/features/admin/pages/` - Admin dashboard

**Mức trung (Forms & Modals):**
5. `src/features/quiz/pages/CreateQuizPage/` - Create quiz flow
6. `src/features/auth/pages/` - Login/register pages
7. `src/features/quiz/pages/QuizPage/` - Quiz taking

**Mức thấp (Technical):**
8. `src/services/` - API services (CHỈ error messages)
9. `src/lib/` - Utilities (THƯỜNG KHÔNG CẦN)

### **Công cụ Hỗ trợ**

#### A. **Tìm strings cần thay:**
```bash
# Tìm JSX text content
npm run i18n:aggressive-dry | grep "replacements"

# Hoặc dùng VS Code Search (Ctrl+Shift+F):
# Pattern: >([\p{L}\s]+)<
# In: src/features/auth/
```

#### B. **Check translation key có sẵn:**
```bash
# Mở file JSON
code public/locales/vi/common.json

# Search key (Ctrl+F): "dangNhap"
```

#### C. **Test ngay lập tức:**
```bash
npm run dev
# Navigate to trang vừa sửa
# Click language switcher (VI/EN)
# Verify text changes
```

### **Checklist Từng Module**

#### ✅ Auth Module
- [ ] `RoleSelection.tsx` - Chọn vai trò
- [ ] `Login/Register forms` - Form đăng nhập
- [ ] `OTPVerification.tsx` - Xác thực OTP
- [ ] `ForgotPassword.tsx` - Quên mật khẩu
- [ ] `Profile.tsx` - Trang profile

#### ✅ Quiz Module  
- [ ] `QuizCard.tsx` - Card hiển thị quiz
- [ ] `QuizFilters.tsx` - Bộ lọc
- [ ] `QuizList.tsx` - Danh sách quiz
- [ ] `CreateQuizPage/` - Tạo quiz (4 steps)
- [ ] `QuizPage/index.tsx` - Làm quiz
- [ ] `ResultPage/` - Kết quả quiz

#### ✅ Admin Module
- [ ] `AdminDashboard.tsx` - Dashboard
- [ ] `AdminQuizManagement.tsx` - Quản lý quiz
- [ ] `AdminUserManagement.tsx` - Quản lý user
- [ ] `StatsDashboard.tsx` - Thống kê

#### ✅ Shared Components
- [ ] `Header.tsx` - Header (nếu có)
- [ ] `Sidebar.tsx` - Sidebar navigation
- [ ] `Footer.tsx` - Footer
- [ ] `EmptyState.tsx` - Empty states
- [ ] `ErrorBoundary.tsx` - Error messages

### **Lưu ý Quan Trọng**

#### 1. **Không thay thế:**
```typescript
// ❌ TECHNICAL VALUES - GIỮ NGUYÊN
const role = 'user' | 'admin' | 'creator';
const status = 'active' | 'inactive';
const difficulty = 'easy' | 'medium' | 'hard';
import { auth } from 'firebase/auth';
```

#### 2. **Error handling:**
```typescript
// ✅ Chỉ thay message hiển thị cho user
try {
  // ...
} catch (error) {
  // ❌ Không thay: console.error('Error:', error)
  // ✅ Thay này: toast.error(t('errorOccurred'))
}
```

#### 3. **Dynamic strings:**
```typescript
// ✅ Với biến:
t('welcomeUser', { name: user.name })

// Translation file:
{
  "welcomeUser": "Chào {{name}}",
  "welcomeUser@en": "Welcome {{name}}"
}
```

### **Khi Hoàn Thành**

#### 1. Test toàn bộ app:
```bash
npm run dev
# Test tất cả trang
# Đổi ngôn ngữ nhiều lần
# Check responsive mobile/desktop
```

#### 2. Build production:
```bash
npm run build
# Không có lỗi TypeScript
# Build size hợp lý
```

#### 3. Commit:
```bash
git add .
git commit -m "feat: Complete manual i18n implementation for [Module Name]"
```

### **Tips & Tricks**

1. **Làm từng module nhỏ**, test ngay, commit ngay
2. **Copy-paste translation keys** từ JSON file
3. **Dùng regex find trong VS Code** để tìm Vietnamese text
4. **Test cả VI và EN** sau mỗi thay đổi
5. **Giữ code backup**: `git stash` trước khi thay đổi lớn

### **Estimated Time**

- Auth module: ~2 hours
- Quiz module: ~4 hours  
- Admin module: ~2 hours
- Shared components: ~1 hour

**Total: ~9 hours** làm thủ công cẩn thận

---

## Kết Luận

✅ **Infrastructure hoàn chỉnh** - Không cần thêm automation
✅ **1,689 keys sẵn sàng** - Chỉ cần dùng `t(key)`
✅ **Làm thủ công** - An toàn, kiểm soát được
✅ **Test liên tục** - Không bị lỗi lớn

**Bắt đầu với module nhỏ nhất** (vd: Auth/RoleSelection) để làm quen workflow!
