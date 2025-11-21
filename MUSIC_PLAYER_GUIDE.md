# 🎵 Music Player - Hướng Dẫn Sử Dụng

## Tổng Quan

Music Player đã được nâng cấp với đầy đủ tính năng để phát nhạc xuyên suốt trong ứng dụng web, hỗ trợ tải lên file, quản lý album và playlist chuyên nghiệp.

## ✨ Tính Năng Chính

### 1. **Phát Nhạc Liên Tục**
- Nhạc chạy xuyên suốt khi điều hướng trong web
- Hỗ trợ chế độ Mini Mode để ẩn player nhưng vẫn phát nhạc
- Tự động phát bài tiếp theo trong queue

### 2. **Tải Lên File Audio** 🎧
- **Tải lên từ máy tính**: Chọn file MP3, WAV, OGG, M4A
- **Giới hạn**: 50MB/file
- **Lưu trữ**: File được lưu trên Firebase Storage
- **Quản lý**: Xem danh sách file đã tải, xóa file không cần thiết
- **Thanh tiến trình**: Hiển thị % upload real-time

**Cách sử dụng:**
1. Click nút Upload (icon ⬆️) trên header
2. Chọn file audio từ máy
3. Đợi upload hoàn tất (xem thanh tiến trình)
4. File tự động thêm vào queue

### 3. **Quản Lý Album** 📀

#### Tạo Album Mới
1. Thêm các bài hát vào Queue
2. Click nút Albums (icon 📁)
3. Nhập tên album và mô tả
4. Click "Lưu Album"
5. Album được lưu vào Firestore

#### Chức Năng Album
- **Tải album**: Click Play để load toàn bộ bài hát
- **Xóa album**: Click Trash để xóa album
- **Xem thông tin**: Số bài hát, mô tả, ngày tạo
- **Sync đa thiết bị**: Album tự động đồng bộ qua Firestore

### 4. **Chỉnh Sửa Thông Tin Bài Hát** ✏️

#### Đổi Tên Bài Hát
1. Trong Queue, click icon Edit (✏️)
2. Nhập tên mới
3. Nhấn Enter hoặc click ✓
4. Tên được lưu vào database

#### Tìm Kiếm Bài Hát
- Ô tìm kiếm trong Queue
- Tìm theo tên bài hát hoặc loại file
- Kết quả hiển thị real-time

### 5. **Sắp Xếp Thứ Tự Phát** 🔀

#### Di Chuyển Bài Hát
- **Move Up (⬆️)**: Di chuyển bài lên trên
- **Move Down (⬇️)**: Di chuyển bài xuống dưới
- Thứ tự được giữ nguyên khi lưu album

#### Shuffle Mode
- Bật/tắt chế độ phát ngẫu nhiên
- Icon Shuffle (🔀) sáng khi bật

### 6. **Chế Độ Lặp Lại** 🔁

#### 3 Chế Độ Repeat
- **Off**: Phát một lần rồi dừng
- **All**: Lặp lại toàn bộ queue
- **One**: Lặp lại 1 bài (hiển thị số "1")

**Cách chuyển đổi:**
- Click icon Repeat trong controls
- Icon sáng màu tím khi bật

### 7. **Nút Pause/Play** ⏯️
- Nút Play/Pause lớn ở giữa controls
- Phím tắt: Space
- Hoạt động với cả audio và YouTube

### 8. **Chuyển Bài & Tua** ⏭️⏮️

#### Chuyển Bài
- **Previous (⏮️)**: Bài trước hoặc restart nếu đã phát >3s
- **Next (⏭️)**: Bài tiếp theo
- Phím tắt: ← và →

#### Thanh Tiến Trình
- Kéo để tua đến vị trí bất kỳ
- Hiển thị thời gian hiện tại / tổng thời gian
- Smooth seeking

### 9. **Điều Chỉnh Tốc Độ Phát** ⚡

#### Tốc Độ Có Sẵn
- 0.5x (chậm)
- 0.75x
- 1x (bình thường)
- 1.25x
- 1.5x
- 2x (nhanh)

**Cách sử dụng:**
1. Click icon Gauge (⚙️) trong controls
2. Chọn tốc độ mong muốn
3. Tốc độ áp dụng ngay lập tức

**Lưu ý:** Tốc độ phát được duy trì khi chuyển bài

### 10. **Điều Chỉnh Âm Lượng** 🔊

- Thanh trượt volume phía dưới controls
- Nút Mute/Unmute
- Hiển thị % âm lượng
- Phím tắt: ↑ (tăng) và ↓ (giảm)

## 🎮 Phím Tắt

| Phím | Chức Năng |
|------|-----------|
| Space | Play/Pause |
| ← | Bài trước / Tua lùi 10s |
| → | Bài tiếp / Tua tới 10s |
| ↑ | Tăng âm lượng |
| ↓ | Giảm âm lượng |

## 📦 Cấu Trúc Dữ Liệu

### Track Interface
```typescript
interface Track {
  id: string;
  url: string;
  title: string;
  type: 'youtube' | 'audio' | 'uploaded';
  duration?: number;
  storagePath?: string; // Đường dẫn Firebase Storage
  uploadedAt?: Date;
  fileSize?: number;
}
```

### Album Interface
```typescript
interface Album {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  tracks: Track[];
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔥 Firebase Integration

### Firestore Collections

#### `userTracks`
- Lưu thông tin các track đã upload
- Fields: userId, trackId, url, title, type, storagePath, uploadedAt, fileSize

#### `userAlbums`
- Lưu thông tin albums
- Fields: userId, name, description, tracks[], createdAt, updatedAt

### Firebase Storage
- Path: `music/{userId}/{timestamp}_{filename}`
- Hỗ trợ xóa file khi không cần thiết
- Upload với progress tracking

## 💡 Tips & Tricks

### 1. Quản Lý Storage
- Xóa các file không dùng nữa để tiết kiệm storage
- Mỗi file có icon Trash riêng
- Xóa khỏi queue ≠ xóa khỏi storage

### 2. Tổ Chức Album
- Tạo album theo thể loại: Workout, Study, Relax
- Đặt tên mô tả rõ ràng
- Sử dụng description để ghi chú

### 3. Tìm Kiếm Nhanh
- Tìm theo tên bài hát
- Tìm theo loại: "uploaded", "youtube", "audio"
- Filter real-time

### 4. Chế Độ Mini
- Mini Mode: Ẩn player, giữ nút điều khiển nhỏ
- Minimize: Thu nhỏ thành thanh ngang
- Cả 2 đều tiếp tục phát nhạc

### 5. URL Support
- **YouTube**: youtube.com/watch?v=, youtu.be/
- **Audio trực tiếp**: .mp3, .wav, .ogg URLs
- **Uploaded files**: Tự động từ Firebase Storage

## 🎨 UI Components

### Header Controls
- Upload (⬆️): Mở section upload
- Mini Mode (−): Ẩn player, giữ controls
- Queue (☰): Hiện/ẩn hàng đợi
- Albums (📁): Quản lý albums
- History (🕐): Xem lịch sử phát
- Minimize (−): Thu nhỏ player

### Main Controls
- Skip Back (⏮️): Bài trước
- Play/Pause (▶️/⏸️): Phát/dừng
- Skip Forward (⏭️): Bài sau
- Speed (⚙️): Chọn tốc độ
- Repeat (🔁): Chế độ lặp

### Queue Controls
- Search (🔍): Tìm kiếm
- Edit (✏️): Đổi tên
- Move Up/Down (⬆️⬇️): Sắp xếp
- Delete (🗑️): Xóa khỏi queue/storage

## 🚀 Tính Năng Nâng Cao

### History Tracking
- Lưu 50 bài hát phát gần nhất
- Click để phát lại
- Hiển thị loại file và tên

### Auto-play Next
- Tự động phát bài tiếp theo
- Respect repeat mode
- Shuffle mode support

### Cross-session Sync
- Albums đồng bộ qua Firestore
- Tracks được lưu persistent
- Load tự động khi đăng nhập

### Drag & Drop (Coming Soon)
- Kéo thả file vào player
- Reorder bằng drag & drop
- Drop to create album

## 🐛 Troubleshooting

### Upload Thất Bại
- Kiểm tra kết nối internet
- Đảm bảo file < 50MB
- Đăng nhập tài khoản

### Không Phát Được
- Kiểm tra URL có hợp lệ
- Thử tải lại trang
- Xóa cache browser

### YouTube Không Load
- YouTube có thể bị chặn CORS
- Thử link YouTube khác
- Sử dụng audio trực tiếp thay thế

## 📱 Responsive Design

- **Desktop**: Full player với tất cả tính năng
- **Tablet**: Player có thể resize
- **Mobile**: Mini mode mặc định

## 🔒 Security

- Chỉ user đã đăng nhập mới upload được
- Files lưu theo userId riêng biệt
- Firestore rules bảo vệ data

## 📈 Performance

- Lazy load tracks từ Firestore
- Cleanup khi unmount
- Efficient seeking
- Smooth animations

## 🎯 Future Enhancements

- [ ] Drag & drop files
- [ ] Album cover upload
- [ ] Playlist sharing
- [ ] Equalizer
- [ ] Lyrics display
- [ ] Crossfade between tracks
- [ ] Sleep timer
- [ ] Export playlist

---

**Version:** 2.0.0  
**Last Updated:** 2024-11-21  
**Author:** QuizTrivia Team
