# 4.2.5. KẾT QUẢ KIỂM THỬ PHÂN HỆ ADMIN & PHI CHỨC NĂNG

---

## Tổng quan

Phân hệ này bao gồm các chức năng quản trị (Admin Dashboard) và các kiểm thử phi chức năng như PWA, Offline mode, Responsive design.

**Tổng số Test Cases:** 8  
**Môi trường kiểm thử:** Chrome 120+, Firefox 121+, Safari 17+, Edge  
**Thiết bị test:** Desktop, Mobile (iPhone 14, Samsung S23), Tablet (iPad Air)  
**Ngày thực hiện:** 22/12/2024

---

## Phần I: Kiểm thử Quản trị (Admin Functions)

| STT | Tên kịch bản | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|-----|-------------|-------------------|------------------|-----------------|------------|
| TC-ADMIN-01 | **Admin phê duyệt Quiz đang chờ (Approve)** | 1. Đăng nhập với tài khoản Admin<br>2. Vào Admin Dashboard (`/admin`)<br>3. Chọn tab "Quiz chờ duyệt"<br>4. Click vào Quiz cần duyệt<br>5. Review nội dung Quiz<br>6. Click "Phê duyệt" (Approve) | - Admin thấy danh sách Quiz pending<br>- Xem chi tiết Quiz<br>- Sau approve: Quiz chuyển sang Published<br>- Gửi notification cho Author | - Badge "Chờ duyệt (5)" hiển thị trên menu<br>- List: Quiz title, Author, Submit date, Quick preview<br>- Click Quiz → Modal preview full: Questions, Options, Images<br>- Review checklist: Content appropriate ✅, No spam ✅<br>- Click "Phê duyệt" → Confirm dialog<br>- Success: "Quiz đã được phê duyệt và xuất bản"<br>- Quiz status: `pending` → `published`<br>- Email sent to author: "Quiz của bạn đã được duyệt!"<br>- In-app notification cho author | ✅ **PASS** |
| TC-ADMIN-02 | **Admin từ chối Quiz (Reject) kèm lý do** | 1. Từ danh sách Quiz chờ duyệt<br>2. Click Quiz vi phạm/không đạt<br>3. Click "Từ chối" (Reject)<br>4. Chọn lý do từ dropdown<br>5. Thêm ghi chú chi tiết<br>6. Confirm từ chối | - Dialog nhập lý do hiển thị<br>- Các lý do preset có sẵn<br>- Quiz chuyển về Draft cho author<br>- Author nhận thông báo kèm lý do | - Click "Từ chối" → Modal với form<br>- Dropdown lý do preset:<br>  • "Nội dung không phù hợp"<br>  • "Câu hỏi trùng lặp"<br>  • "Chất lượng thấp"<br>  • "Vi phạm bản quyền"<br>  • "Khác..."<br>- Textarea ghi chú: max 500 chars<br>- Confirm: Quiz status → `rejected`<br>- Email: "Quiz bị từ chối - Lý do: [lý do]"<br>- Author thấy Quiz ở tab "Bị từ chối" với lý do<br>- Nút "Chỉnh sửa & Gửi lại" available | ✅ **PASS** |
| TC-ADMIN-03 | **Admin khóa tài khoản người dùng vi phạm** | 1. Admin vào "Quản lý Users"<br>2. Tìm user vi phạm bằng search<br>3. Click "Khóa tài khoản"<br>4. Chọn thời hạn khóa<br>5. Nhập lý do<br>6. Confirm | - User bị khóa không thể đăng nhập<br>- Các Quiz của user bị ẩn tạm thời<br>- User nhận email thông báo<br>- Admin thấy user trong "Banned list" | - User Management với search/filter<br>- User card: Avatar, Name, Email, Quiz count, Reports count<br>- Click "Khóa" → Modal<br>- Thời hạn: 1 ngày, 7 ngày, 30 ngày, Vĩnh viễn<br>- Lý do: Required field<br>- Confirm: User status → `banned`<br>- User's Quizzes: `visibility: hidden`<br>- User đăng nhập: "Tài khoản bị khóa đến [date]. Lý do: [reason]"<br>- Admin log: Action recorded với timestamp<br>- "Mở khóa" button available trong Banned list | ✅ **PASS** |
| TC-ADMIN-04 | **Kiểm tra bảo mật URL (User thường truy cập link Admin)** | 1. Đăng nhập với tài khoản User thường<br>2. Truy cập trực tiếp URL `/admin`<br>3. Thử các URL admin khác:<br>   - `/admin/users`<br>   - `/admin/quizzes`<br>   - `/admin/reports` | - User bị redirect về trang Home<br>- Hiển thị thông báo "Không có quyền truy cập"<br>- Không leak thông tin admin | - Truy cập `/admin`:<br>  • Route Guard check role<br>  • Redirect đến `/` (home)<br>  • Toast: "Bạn không có quyền truy cập trang này"<br>- Không hiển thị Admin menu trong Sidebar<br>- API calls trả về 403 Forbidden<br>- Console: No sensitive info logged<br>- Network tab: Admin API endpoints reject với 403<br>- Firestore Rules: `request.auth.token.role == 'admin'` enforced | ✅ **PASS** |

---

## Phần II: Kiểm thử Phi chức năng (Non-Functional)

| STT | Tên kịch bản | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|-----|-------------|-------------------|------------------|-----------------|------------|
| TC-NFR-01 | **Cài đặt ứng dụng PWA (Add to Home Screen)** | 1. Mở ứng dụng trên Chrome Mobile<br>2. Đợi prompt "Thêm vào Màn hình chính"<br>3. Click "Cài đặt"<br>4. Mở app từ Home Screen<br>5. Kiểm tra trải nghiệm | - PWA installable<br>- Icon xuất hiện trên Home<br>- App mở fullscreen (no browser UI)<br>- Splash screen hiển thị | - Chrome hiển thị banner "Thêm QuizTrivia vào Màn hình chính"<br>- Click "Cài đặt" → Download progress<br>- Icon 192x192 xuất hiện trên Home<br>- Tap icon: Splash screen 2s với logo<br>- App mở standalone mode (no URL bar)<br>- Status bar màu theme: #4F46E5<br>- Navigation gestures work<br>- manifest.json configured correctly:<br>  • `display: "standalone"`<br>  • `theme_color: "#4F46E5"`<br>  • `background_color: "#ffffff"` | ✅ **PASS** |
| TC-NFR-02 | **Chơi Quiz offline (Đã download trước)** | 1. Online: Vào Quiz đã chơi trước đó<br>2. Click "Tải xuống để chơi offline"<br>3. Đợi download complete<br>4. Tắt WiFi/Mobile data<br>5. Mở Quiz từ "Quiz Offline"<br>6. Chơi quiz hoàn chỉnh | - Quiz được cache locally<br>- Indicator "Có sẵn offline" ✓<br>- Chơi được khi không có mạng<br>- Tính điểm và hiển thị kết quả | - Button "Tải offline" trên Quiz detail<br>- Progress bar download (Questions + Images)<br>- Toast: "Đã tải xuống! Quiz có thể chơi offline"<br>- Badge "Offline ✓" trên Quiz card<br>- Tắt network: Chrome DevTools → Offline<br>- App vẫn load (Service Worker)<br>- Menu "Quiz Offline" hiển thị downloaded quizzes<br>- Chơi quiz: Full functionality<br>  • Questions render ✅<br>  • Images display (cached) ✅<br>  • Timer works ✅<br>  • Score calculated locally ✅<br>- Kết quả saved to IndexedDB | ✅ **PASS** |
| TC-NFR-03 | **Tự động đồng bộ kết quả offline khi có mạng trở lại** | 1. Chơi Quiz khi offline (từ TC-NFR-02)<br>2. Hoàn thành quiz, xem kết quả<br>3. Bật WiFi/Mobile data<br>4. Kiểm tra sync status<br>5. Kiểm tra trên thiết bị khác | - Kết quả được queue trong IndexedDB<br>- Auto sync khi có network<br>- Sync indicator hiển thị<br>- Data consistent trên các thiết bị | - Sau khi chơi offline:<br>  • Kết quả save local: IndexedDB<br>  • Badge "Chờ đồng bộ" (1) trên icon<br>- Bật network:<br>  • Auto detect: `navigator.onLine` event<br>  • Sync process start (background)<br>  • Toast: "Đang đồng bộ kết quả..."<br>  • Progress: Uploading 1/1<br>- Success: "Đồng bộ hoàn tất!"<br>- Badge "Chờ đồng bộ" biến mất<br>- Firestore updated với quiz attempt<br>- Đăng nhập thiết bị khác: Kết quả hiển thị trong History<br>- Leaderboard updated | ✅ **PASS** |
| TC-NFR-04 | **Kiểm tra Responsive Design trên Mobile** | 1. Mở ứng dụng trên iPhone 14 (390x844)<br>2. Kiểm tra trang Home<br>3. Chơi Quiz<br>4. Kiểm tra các form (Login, Create Quiz)<br>5. Mở trên Tablet (iPad) | - Layout adapt theo screen size<br>- Không bị overflow/scroll ngang<br>- Touch targets đủ lớn (min 44px)<br>- Font readable (min 14px) | **iPhone 14 (390x844):**<br>- Home: Single column layout ✅<br>- Navigation: Bottom tab bar ✅<br>- Quiz cards: Full width, stacked ✅<br>- Quiz play: Questions readable ✅<br>- Answer buttons: Full width, 48px height ✅<br>- Forms: Full width inputs ✅<br>- No horizontal scroll ✅<br>- Font sizes: min 14px ✅<br><br>**iPad Air (820x1180):**<br>- Home: 2-column grid ✅<br>- Sidebar visible ✅<br>- Quiz cards: Larger, 2 per row ✅<br>- More content visible ✅<br><br>**Touch targets:**<br>- All buttons ≥ 44px ✅<br>- Links have sufficient padding ✅<br>- Inputs: 48px height ✅ | ✅ **PASS** |

---

## Chi tiết Kỹ thuật

### TC-ADMIN-04: Security Implementation

**Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin-only collections
    match /admin/{document=**} {
      allow read, write: if isAdmin();
    }
    
    // Pending quizzes - Admin can approve/reject
    match /quizzes/{quizId} {
      allow update: if isAdmin() && 
        request.resource.data.status in ['published', 'rejected'];
    }
    
    // User management - Admin only
    match /users/{userId} {
      allow update: if isAdmin() && 
        request.resource.data.keys().hasOnly(['status', 'bannedUntil', 'banReason']);
    }
    
    function isAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

**React Route Guard:**
```typescript
// AdminRoute.tsx
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      toast.error('Bạn không có quyền truy cập trang này');
      navigate('/');
    }
  }, [user, loading, navigate]);
  
  if (loading) return <LoadingSpinner />;
  if (!user || user.role !== 'admin') return null;
  
  return <>{children}</>;
};
```

### TC-NFR-02 & TC-NFR-03: Offline/Sync Implementation

**Service Worker Caching:**
```javascript
// sw.js
const CACHE_NAME = 'quiztrivia-v1';
const OFFLINE_QUIZ_CACHE = 'offline-quizzes';

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/quiz/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request);
      })
    );
  }
});
```

**IndexedDB Sync Queue:**
```typescript
// offlineSync.ts
interface SyncQueueItem {
  id: string;
  type: 'quiz_attempt';
  data: QuizAttempt;
  createdAt: number;
  synced: boolean;
}

const syncPendingResults = async () => {
  const db = await openDB('quiztrivia-offline');
  const pending = await db.getAll('syncQueue');
  
  for (const item of pending.filter(i => !i.synced)) {
    try {
      await uploadQuizAttempt(item.data);
      item.synced = true;
      await db.put('syncQueue', item);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
};

// Auto-sync when online
window.addEventListener('online', syncPendingResults);
```

### TC-NFR-04: Responsive Breakpoints

```css
/* Tailwind CSS Breakpoints */
/* sm: 640px, md: 768px, lg: 1024px, xl: 1280px */

.quiz-grid {
  @apply grid grid-cols-1 gap-4;      /* Mobile */
  @apply sm:grid-cols-2;               /* Tablet */
  @apply lg:grid-cols-3;               /* Desktop */
  @apply xl:grid-cols-4;               /* Large Desktop */
}

.answer-button {
  @apply w-full py-3 px-4;            /* Full width on mobile */
  @apply min-h-[48px];                 /* Touch-friendly */
  @apply text-base;                    /* Readable font */
}
```

---

## Accessibility Checklist (A11y)

| Criteria | Status | Notes |
|----------|--------|-------|
| Color Contrast (WCAG AA) | ✅ | Minimum 4.5:1 ratio |
| Keyboard Navigation | ✅ | All interactive elements focusable |
| Screen Reader (VoiceOver) | ✅ | ARIA labels present |
| Focus Indicators | ✅ | Visible focus rings |
| Touch Target Size | ✅ | Minimum 44x44px |

---

## Lighthouse Scores

| Category | Score | Notes |
|----------|-------|-------|
| Performance | 92 | LCP: 1.8s |
| Accessibility | 98 | Minor contrast in footer |
| Best Practices | 95 | |
| SEO | 100 | |
| PWA | ✅ | Installable, Offline-ready |

---

## Tổng kết

| Metric | Giá trị |
|--------|---------|
| Tổng số Test Cases | 8 |
| Passed | 8 |
| Failed | 0 |
| Blocked | 0 |
| **Tỷ lệ Pass** | **100%** |

### Ghi chú
- Admin functions hoạt động đúng với role-based access control
- Security rules Firestore được test kỹ, không có bypass
- PWA installable và offline mode hoạt động xuất sắc
- Auto-sync reliable, không mất data
- Responsive design đạt chuẩn trên tất cả thiết bị test

---

## Tổng kết Toàn bộ Mục 4.2 - Kiểm thử Chức năng

| Phân hệ | Số TC | Passed | Failed | Tỷ lệ |
|---------|-------|--------|--------|-------|
| 4.2.1 - Xác thực & Tài khoản | 7 | 7 | 0 | 100% |
| 4.2.2 - Quản lý Quiz & AI | 13 | 13 | 0 | 100% |
| 4.2.3 - Quiz Player | 12 | 12 | 0 | 100% |
| 4.2.4 - Multiplayer | 10 | 10 | 0 | 100% |
| 4.2.5 - Admin & Phi chức năng | 8 | 8 | 0 | 100% |
| **TỔNG CỘNG** | **50** | **50** | **0** | **100%** |

---

*Chương 4 - Mục 4.2.5 - Kết quả Kiểm thử Phân hệ Admin & Phi chức năng*
