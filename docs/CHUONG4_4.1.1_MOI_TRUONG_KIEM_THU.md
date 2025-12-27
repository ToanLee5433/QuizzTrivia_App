# 4.1.1. MÔI TRƯỜNG KIỂM THỬ

---

## Tổng quan

Môi trường kiểm thử của hệ thống QuizTrivia App được thiết lập nhằm đảm bảo tính tương thích đa nền tảng, độ ổn định và khả năng hoạt động trong các điều kiện mạng khác nhau. Môi trường này mô phỏng chính xác các tình huống sử dụng thực tế của người dùng cuối.

---

## 1. Phần cứng máy Tester

### 1.1. Máy tính Desktop/Laptop

| Thành phần | Cấu hình tối thiểu | Cấu hình khuyến nghị |
|------------|-------------------|---------------------|
| **CPU** | Intel Core i3 / AMD Ryzen 3 | Intel Core i5 / AMD Ryzen 5 trở lên |
| **RAM** | 4 GB | 8 GB trở lên |
| **Ổ cứng** | 128 GB SSD (còn trống > 5 GB) | 256 GB SSD (còn trống > 20 GB) |
| **Màn hình** | 1366 x 768 (HD) | 1920 x 1080 (Full HD) trở lên |
| **Kết nối mạng** | WiFi 802.11n | WiFi 802.11ac hoặc Ethernet Gigabit |

### 1.2. Thiết bị di động

| Loại thiết bị | Model tham chiếu | Cấu hình |
|---------------|------------------|----------|
| **Android Phone** | Samsung Galaxy A51 / Xiaomi Redmi Note 10 | RAM 4GB+, Android 10+ |
| **Android Tablet** | Samsung Galaxy Tab A7 | RAM 3GB+, màn hình 10.4" |
| **iPhone** | iPhone 11 / iPhone SE (2020) | iOS 14+ |
| **iPad** | iPad (9th generation) | iPadOS 15+, màn hình 10.2" |

### 1.3. Lý do lựa chọn cấu hình

- **Cấu hình tối thiểu**: Phản ánh thiết bị của đa số người dùng tại Việt Nam, đặc biệt học sinh và sinh viên
- **Cấu hình khuyến nghị**: Đảm bảo trải nghiệm mượt mà, đặc biệt với tính năng Multiplayer real-time
- **Đa dạng thiết bị di động**: Kiểm tra khả năng responsive và PWA trên nhiều kích thước màn hình

---

## 2. Phần mềm và Công cụ Phát triển

### 2.1. Môi trường phát triển

| Công cụ | Phiên bản | Mục đích |
|---------|-----------|----------|
| **Node.js** | 18.x LTS | Runtime JavaScript server-side |
| **npm** | 9.x | Package manager |
| **Visual Studio Code** | 1.85+ | IDE chính |
| **Git** | 2.40+ | Version control |

### 2.2. Build Tools & Framework

| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| **Vite** | 5.4.19 | Build tool, dev server |
| **TypeScript** | 5.2.2 | Type-safe JavaScript |
| **React** | 18.2.0 | UI Framework |
| **Tailwind CSS** | 3.4.17 | CSS Framework |

### 2.3. Firebase Services

| Dịch vụ | Mục đích sử dụng |
|---------|------------------|
| **Firebase Authentication** | Xác thực người dùng (Email/Password, Google Sign-in) |
| **Cloud Firestore** | Database NoSQL cho dữ liệu cấu trúc |
| **Realtime Database** | Đồng bộ real-time cho Multiplayer |
| **Cloud Storage** | Lưu trữ media (hình ảnh, video, audio, PDF) |
| **Cloud Functions** | Serverless backend logic |
| **Firebase Hosting** | Hosting web app |

---

## 3. Trình duyệt Kiểm thử

### 3.1. Desktop Browsers

| Trình duyệt | Phiên bản | Engine | Độ ưu tiên |
|-------------|-----------|--------|------------|
| **Google Chrome** | 120+ | Blink (Chromium) | ⭐⭐⭐ Cao nhất |
| **Microsoft Edge** | 120+ | Blink (Chromium) | ⭐⭐⭐ Cao |
| **Mozilla Firefox** | 120+ | Gecko | ⭐⭐ Trung bình |
| **Safari** | 17+ | WebKit | ⭐⭐ Trung bình |

### 3.2. Mobile Browsers

| Trình duyệt | Nền tảng | Độ ưu tiên |
|-------------|----------|------------|
| **Chrome Mobile** | Android | ⭐⭐⭐ Cao nhất |
| **Safari Mobile** | iOS | ⭐⭐⭐ Cao |
| **Samsung Internet** | Android | ⭐⭐ Trung bình |
| **Firefox Mobile** | Android/iOS | ⭐ Thấp |

### 3.3. Responsive Breakpoints

Ứng dụng được kiểm thử với các breakpoints của Tailwind CSS:

| Breakpoint | Kích thước | Thiết bị tương ứng |
|------------|------------|-------------------|
| **sm** | 640px | Mobile landscape |
| **md** | 768px | Tablet portrait |
| **lg** | 1024px | Tablet landscape / Small laptop |
| **xl** | 1280px | Desktop |
| **2xl** | 1536px | Large desktop |

### 3.4. Device Mode Testing (Chrome DevTools)

Sử dụng Chrome DevTools Device Mode để mô phỏng các thiết bị:

```
📱 Mobile Devices:
├── iPhone SE (375 x 667)
├── iPhone 12 Pro (390 x 844)
├── iPhone 14 Pro Max (430 x 932)
├── Samsung Galaxy S20 (412 x 915)
├── Pixel 7 (412 x 915)
└── Galaxy Fold (280 x 653) - Folded

📟 Tablet Devices:
├── iPad Air (820 x 1180)
├── iPad Pro 12.9" (1024 x 1366)
├── Galaxy Tab S7 (800 x 1280)
└── Surface Pro 7 (912 x 1368)
```

---

## 4. Môi trường Mạng

### 4.1. Điều kiện mạng tiêu chuẩn

| Loại kết nối | Tốc độ Download | Tốc độ Upload | Latency |
|--------------|-----------------|---------------|---------|
| **WiFi (Fiber/FTTH)** | 50-100 Mbps | 20-50 Mbps | < 20ms |
| **WiFi (ADSL)** | 10-20 Mbps | 1-5 Mbps | 20-50ms |
| **4G LTE** | 20-50 Mbps | 5-10 Mbps | 30-50ms |
| **3G** | 1-5 Mbps | 0.5-1 Mbps | 100-300ms |

### 4.2. Giả lập mạng yếu (Network Throttling)

Sử dụng Chrome DevTools Network Throttling để kiểm thử:

| Profile | Download | Upload | Latency | Use Case |
|---------|----------|--------|---------|----------|
| **Fast 3G** | 1.5 Mbps | 750 Kbps | 40ms | Mạng di động thông thường |
| **Slow 3G** | 500 Kbps | 250 Kbps | 200ms | Mạng yếu, vùng sâu vùng xa |
| **Offline** | 0 | 0 | ∞ | Kiểm thử PWA Offline |

### 4.3. Kiểm thử PWA/Offline Mode

#### Quy trình kiểm thử Offline:

```
1. [ONLINE] Tải ứng dụng lần đầu
   └── Service Worker đăng ký và cache assets

2. [ONLINE] Tải Quiz về máy
   └── Quiz data + Media → IndexedDB + Cache Storage

3. [OFFLINE] Bật Airplane Mode / Disable Network
   └── Kiểm tra app có load từ cache không

4. [OFFLINE] Làm Quiz offline
   └── Kiểm tra timer, tính điểm, lưu kết quả

5. [ONLINE] Kết nối lại mạng
   └── Kiểm tra Background Sync đồng bộ kết quả
```

#### Storage APIs được kiểm thử:

| API | Mục đích | Dung lượng |
|-----|----------|------------|
| **Cache Storage** | Workbox precache (JS, CSS, HTML, fonts) | ~10-50 MB |
| **IndexedDB (Dexie)** | Quiz data, Media blobs | 0-500+ MB |
| **LocalStorage** | Auth tokens, Preferences | < 5 MB |
| **Firebase Offline Persistence** | Firestore cache | Auto-managed |

---

## 5. Cấu hình Firebase Emulators

### 5.1. Các Emulator được sử dụng

```json
// firebase.json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "database": { "port": 9000 },
    "storage": { "port": 9199 },
    "functions": { "port": 5001 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

### 5.2. Khởi động Emulator

```bash
# Khởi động tất cả emulators
firebase emulators:start

# Khởi động với seed data
firebase emulators:start --import=./emulator-data

# Export data sau khi test
firebase emulators:export ./emulator-data
```

### 5.3. Lợi ích của Firebase Emulators

- **An toàn**: Không ảnh hưởng production data
- **Nhanh**: Không có network latency
- **Miễn phí**: Không tốn quota Firebase
- **Reproducible**: Có thể import/export data

---

## 6. Cấu hình CI/CD Testing

### 6.1. GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:ci
```

### 6.2. Test Environment Variables

```env
# .env.test
VITE_FIREBASE_PROJECT_ID=test-project
VITE_USE_EMULATOR=true
VITE_EMULATOR_AUTH_URL=http://localhost:9099
VITE_EMULATOR_FIRESTORE_URL=http://localhost:8080
```

---

## 7. Checklist Môi trường Kiểm thử

### 7.1. Trước khi kiểm thử

- [ ] Node.js 18+ đã cài đặt
- [ ] Dependencies đã install (`npm install`)
- [ ] Firebase Emulators đã cài (`firebase init emulators`)
- [ ] Chrome DevTools mở sẵn
- [ ] Network throttling profiles đã cấu hình

### 7.2. Kiểm thử Desktop

- [ ] Chrome (Windows)
- [ ] Chrome (macOS)
- [ ] Edge (Windows)
- [ ] Firefox (Windows)
- [ ] Safari (macOS)

### 7.3. Kiểm thử Mobile

- [ ] Chrome Android (Physical device)
- [ ] Chrome Android (DevTools simulation)
- [ ] Safari iOS (Physical device)
- [ ] Safari iOS (Simulator - macOS only)

### 7.4. Kiểm thử PWA/Offline

- [ ] Service Worker registration
- [ ] Cache Storage populated
- [ ] Offline page loads
- [ ] Quiz offline playback
- [ ] Background Sync on reconnect

---

## Kết luận

Môi trường kiểm thử của QuizTrivia App được thiết kế toàn diện, bao gồm:

1. **Đa dạng phần cứng**: Từ thiết bị cấu hình thấp đến cao
2. **Đa trình duyệt**: Chromium-based, Firefox, Safari
3. **Responsive testing**: Mobile, Tablet, Desktop
4. **Network conditions**: WiFi, 4G, 3G, Offline
5. **Firebase Emulators**: Môi trường backend an toàn

Việc thiết lập môi trường kiểm thử đầy đủ giúp đảm bảo ứng dụng hoạt động ổn định trên nhiều điều kiện sử dụng khác nhau của người dùng thực tế.

---

*Chương 4 - Mục 4.1.1 - Môi trường Kiểm thử*
