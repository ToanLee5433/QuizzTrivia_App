# 4.3.1. ĐÁNH GIÁ TỐC ĐỘ TẢI TRANG

---

## Tổng quan

Đánh giá hiệu năng tải trang của QuizTrivia App sử dụng các công cụ tiêu chuẩn như Google Lighthouse, Chrome DevTools Performance, và WebPageTest. Các chỉ số được đo trên cả Desktop và Mobile để đảm bảo trải nghiệm người dùng tốt trên mọi thiết bị.

---

## 1. Môi trường Đo lường

### 1.1. Công cụ sử dụng

| Tool | Version | Mục đích |
|------|---------|----------|
| Google Lighthouse | 12.x (in Chrome 120+) | Core Web Vitals, Performance Score |
| Chrome DevTools | 120+ | Network, Performance timeline |
| WebPageTest | Latest | Multi-location, waterfall |
| Vite Build Analyzer | Built-in | Bundle size analysis |

### 1.2. Điều kiện Test

| Condition | Desktop | Mobile (Simulated) |
|-----------|---------|---------------------|
| CPU | No throttling | 4x slowdown |
| Network | Cable (Fast) | 4G (Slow 4G) |
| Screen | 1920x1080 | 390x844 (iPhone 14) |
| Test runs | 5 lần, lấy median | 5 lần, lấy median |

### 1.3. Các trang được đo

1. **Landing Page** - `/` (Public)
2. **Quiz List** - `/quizzes` (Authenticated)
3. **Quiz Player** - `/quiz/:id/play` (Authenticated)
4. **Dashboard** - `/dashboard` (Authenticated)
5. **Admin Panel** - `/admin` (Admin)

---

## 2. Core Web Vitals Analysis

### 2.1. Giải thích các chỉ số

```
┌─────────────────────────────────────────────────────────────────┐
│                    CORE WEB VITALS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐  │
│   │      LCP       │   │      FID       │   │      CLS       │  │
│   │ Largest        │   │ First Input    │   │ Cumulative     │  │
│   │ Contentful     │   │ Delay          │   │ Layout Shift   │  │
│   │ Paint          │   │                │   │                │  │
│   └───────┬────────┘   └───────┬────────┘   └───────┬────────┘  │
│           │                    │                    │           │
│   Good: < 2.5s         Good: < 100ms        Good: < 0.1        │
│   Needs: 2.5-4s        Needs: 100-300ms     Needs: 0.1-0.25    │
│   Poor: > 4s           Poor: > 300ms        Poor: > 0.25       │
│                                                                  │
│   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐  │
│   │      FCP       │   │      TBT       │   │       SI       │  │
│   │ First          │   │ Total          │   │ Speed          │  │
│   │ Contentful     │   │ Blocking       │   │ Index          │  │
│   │ Paint          │   │ Time           │   │                │  │
│   └───────┬────────┘   └───────┬────────┘   └───────┬────────┘  │
│           │                    │                    │           │
│   Good: < 1.8s         Good: < 200ms        Good: < 3.4s       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Kết quả Lighthouse - Desktop

### 3.1. Landing Page (/)

| Metric | Score/Value | Target | Status |
|--------|-------------|--------|--------|
| **Performance** | 94/100 | > 90 | ✅ |
| **Accessibility** | 98/100 | > 90 | ✅ |
| **Best Practices** | 100/100 | > 90 | ✅ |
| **SEO** | 100/100 | > 90 | ✅ |
| FCP | 0.8s | < 1.8s | ✅ |
| LCP | 1.2s | < 2.5s | ✅ |
| TBT | 90ms | < 200ms | ✅ |
| CLS | 0.02 | < 0.1 | ✅ |
| Speed Index | 1.4s | < 3.4s | ✅ |

### 3.2. Quiz List (/quizzes)

| Metric | Score/Value | Target | Status |
|--------|-------------|--------|--------|
| **Performance** | 89/100 | > 90 | ⚠️ |
| **Accessibility** | 95/100 | > 90 | ✅ |
| **Best Practices** | 100/100 | > 90 | ✅ |
| **SEO** | 92/100 | > 90 | ✅ |
| FCP | 1.1s | < 1.8s | ✅ |
| LCP | 2.3s | < 2.5s | ✅ |
| TBT | 180ms | < 200ms | ✅ |
| CLS | 0.05 | < 0.1 | ✅ |
| Speed Index | 2.1s | < 3.4s | ✅ |

**Note:** Performance thấp hơn do:
- Fetch danh sách quizzes từ Firestore
- Render nhiều quiz cards với images

### 3.3. Quiz Player (/quiz/:id/play)

| Metric | Score/Value | Target | Status |
|--------|-------------|--------|--------|
| **Performance** | 91/100 | > 90 | ✅ |
| **Accessibility** | 96/100 | > 90 | ✅ |
| **Best Practices** | 100/100 | > 90 | ✅ |
| **SEO** | 95/100 | > 90 | ✅ |
| FCP | 0.9s | < 1.8s | ✅ |
| LCP | 1.8s | < 2.5s | ✅ |
| TBT | 150ms | < 200ms | ✅ |
| CLS | 0.01 | < 0.1 | ✅ |
| Speed Index | 1.6s | < 3.4s | ✅ |

### 3.4. Dashboard (/dashboard)

| Metric | Score/Value | Target | Status |
|--------|-------------|--------|--------|
| **Performance** | 87/100 | > 90 | ⚠️ |
| **Accessibility** | 94/100 | > 90 | ✅ |
| **Best Practices** | 100/100 | > 90 | ✅ |
| **SEO** | 90/100 | > 90 | ✅ |
| FCP | 1.2s | < 1.8s | ✅ |
| LCP | 2.6s | < 2.5s | ⚠️ |
| TBT | 210ms | < 200ms | ⚠️ |
| CLS | 0.08 | < 0.1 | ✅ |
| Speed Index | 2.4s | < 3.4s | ✅ |

**Bottleneck Analysis:**
- Multiple Firebase queries (user stats, recent quizzes, achievements)
- Chart rendering (Recharts library)
- Solution: Implement skeleton loading, lazy load charts

### 3.5. Admin Panel (/admin)

| Metric | Score/Value | Target | Status |
|--------|-------------|--------|--------|
| **Performance** | 82/100 | > 90 | ❌ |
| **Accessibility** | 92/100 | > 90 | ✅ |
| **Best Practices** | 100/100 | > 90 | ✅ |
| **SEO** | 88/100 | > 90 | ⚠️ |
| FCP | 1.5s | < 1.8s | ✅ |
| LCP | 3.2s | < 2.5s | ❌ |
| TBT | 350ms | < 200ms | ❌ |
| CLS | 0.12 | < 0.1 | ❌ |

**Root Causes:**
- Heavy data tables với pagination
- Real-time listeners cho pending quizzes
- Solution: Virtual scrolling, debounced listeners

---

## 4. Kết quả Lighthouse - Mobile (4G)

### 4.1. Performance Summary

| Page | Performance | LCP | TBT | CLS |
|------|-------------|-----|-----|-----|
| Landing | 78/100 | 2.4s | 320ms | 0.04 |
| Quiz List | 72/100 | 3.5s | 450ms | 0.08 |
| Quiz Player | 80/100 | 2.8s | 280ms | 0.02 |
| Dashboard | 68/100 | 4.1s | 520ms | 0.11 |
| Admin | 58/100 | 5.2s | 680ms | 0.15 |

### 4.2. Mobile-specific Issues

```
┌─────────────────────────────────────────────────────────────────┐
│                 MOBILE PERFORMANCE ISSUES                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Issue #1: Large JavaScript Bundle                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ main.js: 450KB (gzipped: 145KB)                            │ │
│  │ - React: 42KB                                               │ │
│  │ - Firebase: 85KB                                            │ │
│  │ - UI Libraries: 65KB                                        │ │
│  │ - App Code: 258KB                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Issue #2: Render-blocking CSS                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ tailwind.css: 28KB (critical: 8KB)                         │ │
│  │ Solution: Extract critical CSS, lazy load rest             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Issue #3: Large Images                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Average quiz thumbnail: 150KB                               │ │
│  │ Solution: Use WebP, responsive images, lazy loading        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Bundle Size Analysis

### 5.1. Vite Build Output

```
vite v5.4.19 building for production...
✓ 2847 modules transformed.

dist/index.html                          1.18 kB
dist/assets/index-DfK23kHs.css          89.45 kB  │  gzip: 14.82 kB
dist/assets/vendor-Bq2KdF8v.js         185.23 kB  │  gzip: 61.45 kB
dist/assets/firebase-D9sK2mNx.js       142.67 kB  │  gzip: 42.18 kB
dist/assets/index-Ks8dHf3x.js          298.34 kB  │  gzip: 78.92 kB
dist/assets/admin-Lm4Kd8Hs.js           85.12 kB  │  gzip: 22.34 kB
dist/assets/multiplayer-Px9Kf3Js.js     45.67 kB  │  gzip: 12.89 kB
dist/assets/chatbot-Qw2Ld9Mx.js         38.45 kB  │  gzip: 10.23 kB

Total: 886.11 kB  │  gzip: 242.83 kB
```

### 5.2. Code Splitting Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    CODE SPLITTING                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Initial Load (required for all pages):                        │
│   ┌────────────────────────────────────────────────────────────┐│
│   │ vendor.js (React, React Router, Redux)    185KB → 61KB    ││
│   │ firebase.js (Auth, Firestore)             142KB → 42KB    ││
│   │ index.js (App shell, common components)   298KB → 79KB    ││
│   └────────────────────────────────────────────────────────────┘│
│                                                                  │
│   Lazy Loaded (on demand):                                      │
│   ┌────────────────────────────────────────────────────────────┐│
│   │ admin.js         → /admin/*                                ││
│   │ multiplayer.js   → /multiplayer/*                          ││
│   │ chatbot.js       → ChatBot component                       ││
│   │ quiz-editor.js   → /quiz/create, /quiz/edit                ││
│   └────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3. Route-based Lazy Loading

```typescript
// src/routes/index.tsx
const AdminLayout = lazy(() => import('@/features/admin/AdminLayout'));
const MultiplayerLobby = lazy(() => import('@/features/multiplayer/MultiplayerLobby'));
const QuizCreator = lazy(() => import('@/features/quiz/QuizCreator'));
const ChatBot = lazy(() => import('@/features/chatbot/ChatBot'));
```

---

## 6. Waterfall Analysis

### 6.1. Landing Page Load Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                  WATERFALL DIAGRAM                               │
├─────────────────────────────────────────────────────────────────┤
│ Time:  0ms      500ms     1000ms    1500ms    2000ms            │
│        │         │         │         │         │                 │
│ HTML   ████                                                      │
│        └─ 45ms (cached: 15ms)                                   │
│                                                                  │
│ CSS    ░░░░████                                                  │
│            └─ 120ms (cached: 30ms)                              │
│                                                                  │
│ JS     ░░░░░░░░██████████                                        │
│ vendor         └─ 280ms                                          │
│                                                                  │
│ JS     ░░░░░░░░░░░░████████                                      │
│ index              └─ 350ms                                      │
│                                                                  │
│ Font   ░░░░░░░░░░░░░░░░████                                      │
│ Inter              └─ 200ms                                      │
│                                                                  │
│ Firebase  ░░░░░░░░░░░░░░░░░░░░████                               │
│ Auth SDK                   └─ 150ms                              │
│                                                                  │
│ Images ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████                      │
│ hero                               └─ 400ms (lazy)               │
│                                                                  │
│ FCP    ─────────────────────┬                                    │
│                             │ 800ms                              │
│ LCP    ──────────────────────────────────┬                       │
│                                          │ 1200ms                │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2. Critical Rendering Path

1. **HTML** - 45ms (First byte)
2. **Critical CSS** - 8KB inline trong `<head>`
3. **JS (async)** - Non-blocking, deferred execution
4. **FCP** - Text content hiển thị @ 800ms
5. **LCP** - Hero image loaded @ 1200ms

---

## 7. Caching Strategy

### 7.1. Service Worker Cache

```typescript
// vite.config.ts - Workbox config
runtimeCaching: [
  {
    urlPattern: /^https:\/\/fonts\.googleapis\.com/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts-stylesheets',
      expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 }
    }
  },
  {
    urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'images',
      expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }
    }
  },
  {
    urlPattern: /^https:\/\/firebasestorage\.googleapis\.com/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'firebase-storage',
      expiration: { maxEntries: 200 }
    }
  }
]
```

### 7.2. Cache Hit Rates

| Resource Type | First Visit | Return Visit | Strategy |
|---------------|-------------|--------------|----------|
| HTML | Miss | Network First | Fresh content |
| CSS | Miss | Cache First | Versioned |
| JS | Miss | Cache First | Hashed filename |
| Images | Miss | Cache First | Long expiry |
| API | Miss | Stale While Revalidate | Fresh + cached |
| i18n JSON | Miss | Cache First | Versioned |

---

## 8. Optimization Recommendations

### 8.1. Implemented Optimizations

| Optimization | Impact | Status |
|--------------|--------|--------|
| Code splitting | -150KB initial | ✅ Done |
| Tree shaking | -80KB unused | ✅ Done |
| Gzip compression | -65% size | ✅ Done |
| Image lazy loading | -400ms LCP | ✅ Done |
| Font preload | -200ms FCP | ✅ Done |
| DNS prefetch | -100ms | ✅ Done |

### 8.2. Pending Optimizations

| Optimization | Expected Impact | Priority |
|--------------|-----------------|----------|
| WebP images | -40% image size | High |
| Critical CSS extraction | -100ms FCP | High |
| Virtual scrolling (Admin) | -300ms TBT | Medium |
| Service Worker precache | Instant return | ✅ Done |
| CDN for static assets | -50ms global | Low |

---

## 9. Bảng Tổng hợp Performance

### 9.1. Desktop Summary

| Page | Performance | LCP | TBT | CLS | Status |
|------|-------------|-----|-----|-----|--------|
| Landing | 94 | 1.2s | 90ms | 0.02 | ✅ Excellent |
| Quiz List | 89 | 2.3s | 180ms | 0.05 | ✅ Good |
| Quiz Player | 91 | 1.8s | 150ms | 0.01 | ✅ Excellent |
| Dashboard | 87 | 2.6s | 210ms | 0.08 | ⚠️ Needs Work |
| Admin | 82 | 3.2s | 350ms | 0.12 | ❌ Poor |

### 9.2. Mobile Summary (4G)

| Page | Performance | LCP | TBT | CLS | Status |
|------|-------------|-----|-----|-----|--------|
| Landing | 78 | 2.4s | 320ms | 0.04 | ✅ Good |
| Quiz List | 72 | 3.5s | 450ms | 0.08 | ⚠️ Needs Work |
| Quiz Player | 80 | 2.8s | 280ms | 0.02 | ✅ Good |
| Dashboard | 68 | 4.1s | 520ms | 0.11 | ❌ Poor |
| Admin | 58 | 5.2s | 680ms | 0.15 | ❌ Poor |

---

## Kết luận

### Đánh giá tổng thể

- **Desktop Performance**: 88.6/100 trung bình - **Tốt**
- **Mobile Performance**: 71.2/100 trung bình - **Cần cải thiện**

### Điểm mạnh

1. Landing page và Quiz Player đạt điểm cao
2. SEO và Accessibility tốt (>90)
3. Code splitting hiệu quả
4. Service Worker caching hoạt động tốt

### Điểm cần cải thiện

1. Dashboard và Admin cần optimize LCP
2. Mobile performance cần giảm TBT
3. Admin panel cần virtual scrolling
4. Image optimization (WebP conversion)

**Khuyến nghị:** Ưu tiên optimize Admin panel và Dashboard cho mobile devices để đạt Performance Score > 80 trên tất cả các trang.

---

*Chương 4 - Mục 4.3.1 - Đánh giá Tốc độ Tải trang*
