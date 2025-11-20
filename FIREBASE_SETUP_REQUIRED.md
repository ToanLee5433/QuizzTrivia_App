# 🔧 Firebase Setup Required

## ⚠️ Missing Configuration

Ứng dụng cần thêm 2 bước cấu hình trên Firebase Console để hoạt động đầy đủ.

---

## 1. 🗂️ Tạo Firestore Composite Indexes

### Vấn đề:
```
FirebaseError: The query requires an index
```

### Giải pháp:

#### **Index 1: Similar Quizzes Query**
Click vào link này để tạo index tự động:
```
https://console.firebase.google.com/v1/r/project/datn-quizapp/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9kYXRuLXF1aXphcHAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3F1aXp6ZXMvaW5kZXhlcy9fEAEaDAoIY2F0ZWdvcnkQARoKCgZzdGF0dXMQARoRCg10b3RhbEF0dGVtcHRzEAIaDAoIX19uYW1lX18QAg
```

**Hoặc tạo thủ công:**
- Collection: `quizzes`
- Fields:
  1. `category` - Ascending
  2. `status` - Ascending  
  3. `totalAttempts` - Descending
  4. `__name__` - Descending

#### **Index 2: Popular Quizzes Query**
Click vào link này để tạo index tự động:
```
https://console.firebase.google.com/v1/r/project/datn-quizapp/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9kYXRuLXF1aXphcHAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3F1aXp6ZXMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaEQoNdG90YWxBdHRlbXB0cxACGgwKCF9fbmFtZV9fEAI
```

**Hoặc tạo thủ công:**
- Collection: `quizzes`
- Fields:
  1. `status` - Ascending
  2. `totalAttempts` - Descending
  3. `__name__` - Descending

#### **Cách tạo thủ công (nếu link không hoạt động):**

1. Vào Firebase Console: https://console.firebase.google.com
2. Chọn project: **datn-quizapp**
3. Vào **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Nhập các field như mô tả ở trên
6. Click **Create**

⏱️ **Lưu ý**: Indexes có thể mất **5-15 phút** để build xong.

---

## 2. 🤖 Enable Firebase ML API (Vertex AI)

### Vấn đề:
```
Firebase ML API has not been used in project 741975099365 before or it is disabled
```

### Giải pháp:

#### **Bước 1: Enable API**
Click vào link này để enable trực tiếp:
```
https://console.developers.google.com/apis/api/firebaseml.googleapis.com/overview?project=741975099365
```

#### **Bước 2: Xác nhận**
1. Sau khi click link ở trên, bạn sẽ thấy trang Firebase ML API
2. Click nút **ENABLE** (màu xanh)
3. Đợi 1-2 phút để API được kích hoạt

#### **Cách làm thủ công:**
1. Vào Google Cloud Console: https://console.cloud.google.com
2. Chọn project: **datn-quizapp** (ID: 741975099365)
3. Vào **APIs & Services** → **Library**
4. Tìm kiếm: **Firebase ML API** hoặc **Vertex AI API**
5. Click vào kết quả
6. Click **ENABLE**

⏱️ **Lưu ý**: API có thể mất **2-5 phút** để propagate.

---

## 3. ✅ Kiểm tra sau khi setup

### Kiểm tra Indexes:
1. Refresh trang web
2. Vào trang Result của một quiz
3. **Nếu thành công**: Bạn sẽ thấy phần "Quiz tương tự" hiển thị
4. **Nếu vẫn lỗi**: Đợi thêm vài phút và refresh lại

### Kiểm tra AI Analysis:
1. Refresh trang web
2. Vào trang Result của một quiz
3. **Nếu thành công**: Bạn sẽ thấy phần "Phân tích AI" với feedback chi tiết
4. **Nếu vẫn lỗi**: 
   - Kiểm tra xem API đã được enable chưa
   - Đợi 2-5 phút sau khi enable
   - Refresh lại trang

---

## 4. 🐛 Troubleshooting

### Vấn đề: Index build failed
**Giải pháp:**
- Kiểm tra lại field names có đúng không
- Đảm bảo collection name là `quizzes` (không có số nhiều khác)
- Thử xóa index và tạo lại

### Vấn đề: API vẫn báo disabled sau khi enable
**Giải pháp:**
- Clear browser cache và cookies
- Đợi thêm 5 phút
- Kiểm tra billing account có được kích hoạt không (Vertex AI cần billing)

### Vấn đề: AI Analysis không hiển thị
**Giải pháp:**
- Mở DevTools Console (F12)
- Xem có error message gì không
- Đảm bảo Firebase ML API đã được enable
- Kiểm tra project ID có đúng không (741975099365)

---

## 5. 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. ✅ Đã đăng nhập đúng Google Account có quyền truy cập project
2. ✅ Đã chọn đúng project **datn-quizapp**
3. ✅ Có quyền **Owner** hoặc **Editor** trên project
4. ✅ Billing account đã được liên kết (cho Vertex AI)

---

## 📋 Checklist

- [ ] Index 1: Similar Quizzes (category + status + totalAttempts)
- [ ] Index 2: Popular Quizzes (status + totalAttempts)
- [ ] Firebase ML API enabled
- [ ] Đợi 5-15 phút để indexes build
- [ ] Đợi 2-5 phút để API propagate
- [ ] Refresh trang web và kiểm tra
- [ ] AI Analysis hiển thị
- [ ] Similar Quizzes hiển thị

---

**Sau khi hoàn thành setup, tất cả các tính năng sẽ hoạt động đầy đủ! 🎉**
