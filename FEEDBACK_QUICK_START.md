# 🚀 Quick Start Guide - Feedback System

## Sử Dụng Hệ Thống Phản Hồi

### 👤 Dành cho Người Dùng:

1. **Gửi phản hồi mới:**
   ```
   Header → Click Avatar → "Phản hồi" → Điền form → Gửi
   ```

2. **Xem phản hồi của bạn:**
   ```
   Vào trang /feedback → Xem danh sách → Click để xem chi tiết
   ```

3. **Nhận thông báo:**
   ```
   Khi admin phản hồi → Nhận notification → Click để xem
   ```

---

### 👨‍💼 Dành cho Admin:

1. **Truy cập trang quản lý:**
   ```
   Admin Sidebar → 💬 Feedback Management → View dashboard
   ```

2. **Lọc và tìm kiếm:**
   ```
   Search box → Nhập từ khóa
   Filter by Status → Chọn trạng thái
   Filter by Priority → Chọn mức độ
   Date filter → Chọn khoảng thời gian
   ```

3. **Xử lý feedback:**
   ```
   Click "View" → Modal mở
   → Đổi Status: Pending → In Progress → Resolved
   → Đổi Priority nếu cần
   → Nhập Admin Response
   → Click "Save"
   → User tự động nhận notification
   ```

---

## 📂 File Locations

### Frontend Components:
```
src/features/feedback/
├── types.ts
├── services/feedbackService.ts
├── components/
│   ├── FeedbackForm.tsx
│   ├── FeedbackManagement.tsx
│   └── FeedbackDetailModal.tsx
```

### Translations:
```
public/locales/en/feedback.json
public/locales/vi/feedback.json
```

### Routes:
```
User: /feedback
Admin: /admin/feedbacks
```

---

## 🔧 Maintenance

### Deploy Rules:
```bash
firebase deploy --only firestore:rules
```

### Deploy App:
```bash
npm run build
firebase deploy --only hosting
```

### Check Logs:
```bash
firebase functions:log
```

---

## 🐛 Troubleshooting

### Issue: Không thấy feedback
- **Check:** User đã login chưa?
- **Check:** Firestore rules đã deploy chưa?
- **Check:** Network tab có lỗi 403?

### Issue: Upload ảnh thất bại
- **Check:** File size < 5MB?
- **Check:** File type là image?
- **Check:** Storage rules có cho phép?

### Issue: Notification không hiện
- **Check:** NotificationCenter component có mounted?
- **Check:** Subcollection `users/{uid}/notifications` có data?
- **Check:** Listener có được setup?

---

## 📊 Analytics

### Key Metrics:
- Total feedbacks
- Pending vs Resolved ratio
- Average response time
- User satisfaction (5-star rating - future)

### Firestore Queries:
```typescript
// Get pending feedbacks
collection('feedbacks').where('status', '==', 'pending')

// Get by priority
collection('feedbacks').where('priority', '==', 'critical')

// Get user's feedbacks
collection('feedbacks').where('userId', '==', uid)
```

---

## 🎯 Best Practices

### For Users:
- ✅ Mô tả rõ ràng vấn đề
- ✅ Đính kèm screenshot nếu có
- ✅ Chọn đúng loại (Bug/Feature/...)
- ✅ Chọn mức độ ưu tiên phù hợp

### For Admins:
- ✅ Phản hồi trong 24-48h
- ✅ Update status ngay khi bắt đầu xử lý
- ✅ Ghi chú chi tiết trong admin response
- ✅ Đổi priority nếu cần thiết
- ✅ Close feedback khi đã giải quyết

---

## 🔐 Security Notes

- ✅ User chỉ thấy feedback của mình
- ✅ Admin thấy tất cả feedbacks
- ✅ Validate input trên client & server
- ✅ Sanitize HTML với DOMPurify
- ✅ Authentication required cho mọi operation

---

## 📞 Quick Commands

```bash
# Build
npm run build

# Deploy Hosting
firebase deploy --only hosting

# Deploy Rules
firebase deploy --only firestore:rules

# Deploy All
firebase deploy

# Check Status
firebase projects:list
```

---

**🎉 Hệ thống sẵn sàng sử dụng!**
