# 📦 BÁO CÁO CHI TIẾT PWA STORAGE - QuizTrivia-App

**Ngày phân tích:** 01/12/2025  
**Mục đích:** Giải thích tại sao máy tính hiện 2GB nhưng điện thoại hiện 36GB quota

---

## 📊 TẠI SAO QUOTA KHÁC NHAU?

### Câu trả lời ngắn gọn:
**Storage quota KHÔNG cố định** - nó phụ thuộc vào:
1. Trình duyệt (Chrome/Safari/Firefox)
2. Thiết bị (Desktop vs Mobile)
3. Dung lượng ổ cứng/bộ nhớ còn trống
4. Thuật toán riêng của mỗi browser

---

## 🖥️ QUOTA TRÊN MÁY TÍNH (Desktop)

### Chrome Desktop
```
Quota = min(
  (Tổng dung lượng ổ cứng) / 3,  // ~33% ổ cứng
  2GB mỗi origin                  // Giới hạn cứng (có thể tăng)
)
```

**Ví dụ:**
- Ổ cứng 500GB → Quota tối đa ~166GB
- Nhưng Chrome **giới hạn cứng 2GB mỗi origin** (mặc định)
- Có thể tăng nếu user cấp quyền "Persistent Storage"

### Firefox Desktop
```
Quota = min(
  10GB,                          // Giới hạn cứng
  (Dung lượng trống ổ cứng) / 5  // ~20% dung lượng trống
)
```

### Safari Desktop (macOS)
```
Quota = 1GB mỗi origin (rất hạn chế)
```
Safari rất khắt khe, hay tự động xóa IndexedDB khi ít dùng!

---

## 📱 QUOTA TRÊN ĐIỆN THOẠI (Mobile)

### Chrome Android
```
Quota = min(
  (Tổng dung lượng thiết bị) * 0.6,  // 60% bộ nhớ!
  Không có giới hạn cứng             // Tùy thiết bị
)
```

**Ví dụ:**
- iPhone 64GB → Quota ~38GB (60%)
- Android 128GB → Quota ~77GB (60%)
- **Đây là lý do bạn thấy 36GB trên điện thoại!**

### Safari iOS (PWA)
```
Quota = 50MB (mặc định) - 1GB (nếu Add to Home Screen)
```
Safari iOS **RẤT hạn chế** với web storage, nhưng tăng lên khi app được "Add to Home Screen"

### Firefox Android
```
Quota = (Dung lượng trống) / 5  // ~20%
```

---

## 🔍 KIỂM TRA QUOTA THỰC TẾ

### Code để kiểm tra:

```javascript
// Chạy trong Console (F12)
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const estimate = await navigator.storage.estimate();
  console.log({
    usage: (estimate.usage / 1024 / 1024).toFixed(2) + ' MB',
    quota: (estimate.quota / 1024 / 1024 / 1024).toFixed(2) + ' GB',
    percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2) + '%'
  });
}
```

### Kết quả mẫu:

**Máy tính (Chrome):**
```json
{
  "usage": "45.23 MB",
  "quota": "2.00 GB",     // ← Giới hạn cứng
  "percentUsed": "2.21%"
}
```

**Điện thoại (Chrome Android):**
```json
{
  "usage": "45.23 MB",
  "quota": "36.40 GB",    // ← 60% của 64GB bộ nhớ
  "percentUsed": "0.12%"
}
```

---

## 📋 BẢNG SO SÁNH QUOTA

| Browser | Desktop | Mobile | Ghi chú |
|---------|---------|--------|---------|
| **Chrome** | 2GB (có thể tăng) | 60% bộ nhớ | Cần "Persistent Storage" để tăng |
| **Firefox** | 10GB | 20% dung lượng trống | Quota động |
| **Safari** | 1GB | 50MB-1GB | Hay tự xóa data! |
| **Edge** | Như Chrome | Như Chrome | Dùng Chromium engine |

---

## 🛡️ PERSISTENT STORAGE

### Vấn đề:
- Mặc định, browser có thể **TỰ ĐỘNG XÓA** IndexedDB khi cần bộ nhớ
- Đặc biệt Safari rất hay làm điều này

### Giải pháp:
Request "Persistent Storage" để browser không xóa data:

```javascript
if (navigator.storage && navigator.storage.persist) {
  const isPersisted = await navigator.storage.persist();
  console.log(`Persistent storage granted: ${isPersisted}`);
}
```

**App đã implement trong:** `DownloadManager.ts` → `requestPersistentStorage()`

---

## 📱 TẠI SAO ĐIỆN THOẠI QUOTA LỚN HƠN?

### Lý do chính:

1. **Chrome Mobile ưu đãi PWA hơn:**
   - Mobile dùng nhiều PWA nên Google cho quota lớn
   - Desktop có nhiều cách lưu trữ khác (native apps)

2. **Thuật toán khác nhau:**
   - Desktop: `min(33% ổ cứng, 2GB)` → thường bị giới hạn 2GB
   - Mobile: `60% bộ nhớ` → không có giới hạn cứng

3. **Mobile storage thường đắt hơn:**
   - 1GB trên điện thoại quý hơn 1GB trên laptop
   - Google/Apple biết điều này nên thuật toán khác

---

## 🗄️ PWA STORAGE LAYERS TRONG APP

```
┌─────────────────────────────────────────────────────────────────┐
│                     PWA STORAGE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    CACHE API (Service Worker)            │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │    │
│  │  │ Precache    │  │ Runtime     │  │ quiz-media  │      │    │
│  │  │ (Workbox)   │  │ Cache       │  │ -v1         │      │    │
│  │  │ ~5.4MB      │  │ (fonts,i18n)│  │ (images)    │      │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │    │
│  │  → Tổng: ~10-50MB tùy user                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  INDEXEDDB (Dexie QuizAppDB)             │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │    │
│  │  │ Downloaded  │  │ Media Blobs │  │ Pending     │      │    │
│  │  │ Quizzes     │  │ (images,    │  │ Queue       │      │    │
│  │  │ (cold)      │  │  audio)     │  │ (sync)      │      │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │    │
│  │  → Tổng: 0-500MB+ tùy số quiz download                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     LOCALSTORAGE                         │    │
│  │  - Auth tokens, preferences                              │    │
│  │  - Giới hạn: 5-10MB                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   FIREBASE SDK CACHE                     │    │
│  │  - Firestore offline persistence                         │    │
│  │  - Automatic by Firebase SDK                             │    │
│  │  - Giới hạn: 40MB mặc định                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧮 TÍNH TOÁN DUNG LƯỢNG MỖI QUIZ

| Thành phần | Kích thước trung bình |
|------------|----------------------|
| JSON data (title, questions) | 5-50 KB |
| Cover image | 50-500 KB |
| Question images (10 câu) | 500 KB - 5 MB |
| Audio (nếu có) | 1-10 MB |
| **Tổng 1 quiz** | **~0.5-15 MB** |

**Ví dụ với quota 2GB:**
- Quiz nhỏ (0.5MB): Tải được ~4000 quiz
- Quiz trung bình (5MB): Tải được ~400 quiz
- Quiz có audio (15MB): Tải được ~130 quiz

---

## 🔧 CÁCH TĂNG QUOTA TRÊN DESKTOP

### 1. Request Persistent Storage (Đã có trong app)
```javascript
await navigator.storage.persist();
```
Chrome có thể tăng quota từ 2GB lên ~60% ổ cứng

### 2. Cài đặt Chrome flag (Cho developer)
```
chrome://flags/#enable-experimental-web-platform-features
```

### 3. Thêm vào Home Screen / Install PWA
Khi user "Install" app, quota thường tăng đáng kể

---

## 📊 KIỂM TRA STORAGE TRONG APP

App đã có function `getStorageInfo()` trong DownloadManager:

```typescript
const info = await downloadManager.getStorageInfo(userId);
console.log({
  used: (info.used / 1024 / 1024).toFixed(2) + ' MB',
  quota: (info.quota / 1024 / 1024 / 1024).toFixed(2) + ' GB',
  available: (info.available / 1024 / 1024 / 1024).toFixed(2) + ' GB',
  percentUsed: info.percentUsed.toFixed(2) + '%',
  downloadedQuizzes: info.downloadedQuizzes
});
```

---

## ⚠️ EDGE CASES ĐÃ XỬ LÝ

### 1. QuotaExceededError ✅
**File:** `DownloadManager.ts`

Khi bộ nhớ đầy:
```typescript
if (errorName === 'QuotaExceededError' || errorMsg.includes('quota')) {
  friendlyError = 'Bộ nhớ đầy! Vui lòng xóa bớt quiz cũ đã tải để giải phóng dung lượng.';
}
```

### 2. Version Mismatch ✅
**File:** `offlineQueue.ts`

Mỗi action gửi kèm `appVersion`:
```typescript
meta: {
  ...action.meta,
  appVersion: APP_VERSION  // '1.1.0'
}
```

Server có thể kiểm tra và reject nếu version quá cũ.

---

## 📈 SUMMARY

| Thiết bị | Quota thường thấy | Lý do |
|----------|-------------------|-------|
| **Desktop Chrome** | 2GB | Giới hạn cứng mặc định |
| **Desktop Safari** | 1GB | Apple rất hạn chế |
| **Mobile Chrome** | 30-60GB | 60% bộ nhớ, không giới hạn cứng |
| **Mobile Safari** | 50MB-1GB | Tăng khi Add to Home Screen |

**Kết luận:** Điện thoại 36GB quota là BÌNH THƯỜNG vì Chrome Android tính 60% bộ nhớ thiết bị. Máy tính 2GB là do Chrome Desktop có giới hạn cứng (có thể tăng với Persistent Storage permission).
