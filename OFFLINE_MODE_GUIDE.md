# 📴 Hướng Dẫn Sử Dụng Offline Mode - Quiz Trivia App

## ✅ Vấn Đề Đã Được Khắc Phục

### 1. **Storage Không Giảm Khi Xóa Quiz** ✅ FIXED
**Vấn đề cũ**: Khi xóa quiz, dung lượng không giảm vì media files vẫn nằm trong Cache Storage.

**Giải pháp**: 
- `deleteCachedMedia()` giờ xóa từ **CẢ** IndexedDB VÀ Cache Storage API
- `clearAllDownloads()` cũng xóa toàn bộ Cache Storage
- Storage sẽ giảm NGAY LẬP TỨC sau khi xóa

### 2. **Không Thể Chơi Quiz Offline** ✅ FIXED
**Vấn đề cũ**: Khi tắt mạng và bấm vào quiz → Crash với lỗi `Failed to fetch dynamically imported module: QuizPage-XXX.js`

**Nguyên nhân**: 
- QuizPage được lazy load (chia nhỏ code)
- Service Worker chỉ cache khi fetch → Nếu chưa visit page thì chunk chưa có trong cache
- Offline → Không tìm thấy chunk → Crash

**Giải pháp ĐA LỚP**:

#### Layer 1: Service Worker v1.2.0 (Aggressive Caching)
```javascript
// ✅ CACHE-FIRST strategy cho tất cả static assets
// ✅ Cache MỌI JS chunk ngay khi fetch (kể cả lazy-loaded)
// ✅ Offline fallback với error message rõ ràng
```

#### Layer 2: Chunk Preloader (Background Prefetch)
```typescript
// ✅ Tự động prefetch TẤT CẢ lazy chunks sau 3s app load
// ✅ Chạy trong idle time (không ảnh hưởng UX)
// ✅ Chỉ chạy 1 lần/ngày (tối ưu bandwidth)
```

#### Layer 3: Quiz Download Prefetch
```typescript
// ✅ Khi download quiz → Prefetch QuizPage HTML
// ✅ Trigger load các chunks liên quan
// ✅ Đảm bảo quiz CÓ THỂ chạy offline ngay sau download
```

---

## 🎯 Cách Sử Dụng Offline Mode (HOÀN TOÀN MỚI)

### Bước 1: Chuẩn Bị (KHI ONLINE)

1. **Đảm bảo đã đăng nhập**
2. **Mở app và để ít nhất 5 giây**
   - App sẽ tự động prefetch tất cả chunks cần thiết
   - Kiểm tra Console: `[ChunkPreloader] ✅ Preload complete`

3. **Tải quiz về máy**:
   - Vào trang Quiz List
   - Chọn quiz → Bấm nút "⬇️ Tải về"
   - Đợi progress bar 100%
   - Thông báo "✅ Đã tải thành công"

4. **Verify (Tùy chọn)**:
   - Mở DevTools (F12) → Console
   - Gõ: `await caches.keys()` → Phải thấy `quiz-trivia-v1.2.0`
   - Gõ: `(await caches.open('quiz-trivia-v1.2.0')).keys()` → Phải thấy nhiều file `.js`, `.css`

### Bước 2: Sử Dụng Offline

1. **Tắt mạng**:
   - Bật Airplane Mode
   - HOẶC: DevTools → Network tab → Offline checkbox

2. **Vào trang Downloaded Quizzes** (`/downloaded-quizzes`)

3. **Chọn quiz và bấm "Chơi Ngay"**

4. **Quiz sẽ chạy HOÀN TOÀN OFFLINE**:
   - ✅ Questions load
   - ✅ Images load (từ IndexedDB Blob)
   - ✅ Audio load (nếu có)
   - ✅ Timer chạy
   - ✅ Submit answers
   - ✅ Xem kết quả

### Bước 3: Sync Kết Quả (KHI ONLINE LẠI)

1. **Bật mạng trở lại**
2. **App tự động sync**:
   - Kết quả quiz → Firestore
   - Leaderboard → Cập nhật
   - Thống kê → Sync

---

## 🔧 Khắc Phục Sự Cố

### Lỗi: "Failed to fetch dynamically imported module"

**Nguyên nhân**: Chunks chưa được cache

**Giải pháp**:

#### Option 1: Tự động (Đợi App Preload)
```
1. Bật mạng
2. Mở app
3. Đợi 5 giây (để chunk preloader chạy)
4. Tắt mạng
5. Thử lại
```

#### Option 2: Thủ công (Force Reload)
```
1. Mở DevTools (F12)
2. Application tab → Service Workers
3. Bấm "Unregister" (nếu có)
4. Bấm "Update" (nếu có)
5. Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
6. Đợi app load xong → Đợi 5 giây
```

#### Option 3: Developer (Clear & Rebuild)
```javascript
// Chạy trong Console
await navigator.serviceWorker.getRegistrations().then(regs => 
  Promise.all(regs.map(r => r.unregister()))
);
await caches.keys().then(keys => 
  Promise.all(keys.map(k => caches.delete(k)))
);
location.reload();
```

### Lỗi: Storage Không Giảm Sau Khi Xóa

**Giải pháp**: ✅ ĐÃ FIX (v1.2.0)

Nếu vẫn gặp (cache cũ từ trước v1.2.0):
```javascript
// Clear cache thủ công
await caches.keys().then(keys => 
  Promise.all(keys.map(k => caches.delete(k)))
);
```

### Lỗi: Firebase "transport errored" (Chấm Đỏ Console)

**Đây KHÔNG PHẢI LỖI**

- Firebase SDK cố kết nối server (nhưng offline)
- Firestore tự động chuyển sang dùng cache offline (IndexedDB)
- App vẫn hoạt động bình thường
- **→ BỎ QUA những dòng này**

---

## 📊 Kiểm Tra Storage

### Xem Dung Lượng Đã Dùng

```javascript
// Console
const storage = await navigator.storage.estimate();
console.log(`Đã dùng: ${(storage.usage / 1024 / 1024).toFixed(2)} MB`);
console.log(`Tổng quota: ${(storage.quota / 1024 / 1024).toFixed(2)} MB`);
console.log(`Phần trăm: ${((storage.usage / storage.quota) * 100).toFixed(2)}%`);
```

### Xem Cache Storage

```javascript
// Xem tất cả cache names
await caches.keys();

// Xem files trong cache
const cache = await caches.open('quiz-trivia-v1.2.0');
const requests = await cache.keys();
console.log(`Cached ${requests.length} files`);
requests.forEach(req => console.log(req.url));
```

### Xem IndexedDB

```
1. DevTools → Application tab
2. IndexedDB → QuizOfflineDB
3. downloaded_quizzes → Xem quiz data
4. media_blobs → Xem cached images/audio
```

---

## 🚀 Best Practices

### 1. **Tải Quiz Khi Online Tốt**
- Đảm bảo kết nối mạng ổn định khi tải
- Tránh tải nhiều quiz cùng lúc (tải tuần tự)

### 2. **Kiểm Tra Dung Lượng**
- Vào `/downloaded-quizzes` để xem storage usage
- Xóa quiz cũ nếu gần hết quota (>80%)

### 3. **Cập Nhật Quiz Định Kỳ**
- App tự động check updates khi online
- Nếu có update → Bấm "Cập nhật ngay"

### 4. **Không Xóa Browser Data**
- Clear cache/site data → Mất TẤT CẢ quiz đã tải
- Nếu cần clear → Tải lại quiz

---

## 🔍 Technical Details (Cho Developer)

### Architecture

```
┌─────────────────────────────────────────────┐
│           USER DOWNLOADS QUIZ               │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│       DownloadManager.downloadQuiz()        │
│  1. Fetch quiz from Firestore               │
│  2. Extract media URLs                      │
│  3. Cache media → IndexedDB Blobs           │
│  4. Save quiz → IndexedDB                   │
│  5. Prefetch QuizPage HTML                  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         Service Worker (v1.2.0)             │
│  - Cache-First for static assets            │
│  - Network-First for HTML/API               │
│  - Aggressive caching of ALL chunks         │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│          Chunk Preloader                    │
│  - Runs 3s after app load                   │
│  - Prefetches all lazy chunks               │
│  - Once per day (cached flag)               │
└─────────────────────────────────────────────┘
```

### Data Flow (Offline Playback)

```
User clicks "Play Quiz" (OFFLINE)
          │
          ▼
1. Load quiz data from IndexedDB ✅
          │
          ▼
2. Router → Navigate to /quiz/:id
          │
          ▼
3. React.lazy() → Load QuizPage chunk
          │
          ▼
4. Service Worker intercepts fetch
          │
          ▼
5. SW finds QuizPage chunk in Cache Storage ✅
          │
          ▼
6. Return cached chunk → QuizPage renders ✅
          │
          ▼
7. QuizPage loads questions (already in memory)
          │
          ▼
8. OfflineImage loads images from IndexedDB Blobs ✅
          │
          ▼
9. User plays quiz completely offline ✅
```

### Cache Layers

1. **Service Worker Cache Storage** (Vite chunks, static assets)
2. **IndexedDB - QuizOfflineDB**:
   - `downloaded_quizzes` store (quiz data + metadata)
   - `media_blobs` store (images, audio as Blobs)
3. **Firestore Persistent Cache** (Firebase SDK automatic)

---

## 📝 Changelog

### v1.2.0 (2024-11-24)
- ✅ **FIXED**: Storage không giảm khi xóa quiz
  - `deleteCachedMedia()` giờ xóa từ cả IndexedDB VÀ Cache Storage
  - `clearAllDownloads()` giờ clear toàn bộ Cache Storage
  
- ✅ **FIXED**: Không thể chơi quiz offline
  - Service Worker v1.2.0 với aggressive chunk caching
  - Chunk Preloader tự động prefetch lazy chunks
  - Quiz download prefetch QuizPage HTML
  
- ✅ **IMPROVED**: Better error handling
  - Clear error messages khi offline fetch fail
  - Console logs rõ ràng hơn
  
- ✅ **IMPROVED**: Performance
  - Background preload không block UI
  - Once-per-day preload (tiết kiệm bandwidth)

---

## 🆘 Support

Nếu gặp vấn đề:

1. **Check Console** (F12) để xem error logs
2. **Clear Site Data**:
   - DevTools → Application → Clear Storage → Clear site data
   - Hard reload (Ctrl+Shift+R)
3. **Verify Service Worker**:
   - DevTools → Application → Service Workers
   - Phải thấy `quiz-trivia-v1.2.0` status "activated"
4. **Re-download Quiz**:
   - Xóa quiz cũ
   - Tải lại từ server

---

**🎉 Enjoy Offline Quiz Playing!**
