# 🤖 Firebase ML API Setup Guide

## ⚠️ Lỗi: Firebase ML API Chưa Được Enable

```
Firebase ML API has not been used in project 741975099365 before or it is disabled
```

## 🚀 Cách Enable Firebase ML API

### **Option 1: Qua Link Trực Tiếp (Nhanh Nhất)**

Click link sau để enable ngay:
```
https://console.developers.google.com/apis/api/firebaseml.googleapis.com/overview?project=741975099365
```

**Steps**:
1. Click link trên
2. Đăng nhập Google Cloud Console
3. Click nút **"ENABLE"** (màu xanh)
4. Đợi 30-60 giây để API được kích hoạt
5. Reload trang web và thử lại

---

### **Option 2: Qua Google Cloud Console**

1. Vào [Google Cloud Console](https://console.cloud.google.com)
2. Chọn project **datn-quizapp** (ID: 741975099365)
3. Vào **APIs & Services** → **Library**
4. Tìm kiếm: **"Firebase ML API"**
5. Click vào **Firebase ML API**
6. Click **ENABLE**
7. Đợi 30-60 giây

---

### **Option 3: Qua Firebase Console**

1. Vào [Firebase Console](https://console.firebase.google.com)
2. Chọn project **datn-quizapp**
3. Vào **Project Settings** (⚙️ icon)
4. Tab **Service accounts**
5. Click **Manage service account permissions**
6. Tìm **Firebase ML API** và enable

---

## 🧪 Kiểm Tra API Đã Hoạt Động

### Test 1: Qua Console Log
Reload trang `/quiz-result/:id` và kiểm tra console:
- ✅ Không còn lỗi `SERVICE_DISABLED`
- ✅ Thấy log: `✅ AI analysis generated`

### Test 2: Qua UI
- AI Analysis section sẽ hiển thị
- Có feedback về điểm mạnh/yếu
- Có study tips và next steps

---

## 📋 APIs Cần Enable Cho Project

| API | Status | Required For |
|-----|--------|-------------|
| Firebase ML API | ❌ **CHƯA ENABLE** | AI Quiz Analysis |
| Vertex AI API | ✅ Enabled | AI Generation |
| Firestore API | ✅ Enabled | Database |
| Firebase Authentication | ✅ Enabled | User Auth |
| Cloud Storage | ✅ Enabled | File Storage |

---

## ⏱️ Thời Gian Propagate

Sau khi enable API:
- **Ngay lập tức**: Hầu hết trường hợp
- **Tối đa**: 5 phút nếu có delay

Nếu sau 5 phút vẫn lỗi:
1. Clear browser cache
2. Reload page (Ctrl + Shift + R)
3. Thử Incognito mode

---

## 🔧 Fallback Mode

Nếu không thể enable API ngay:
- AI Analysis vẫn hoạt động với **fallback analysis**
- Hiển thị feedback cơ bản dựa trên điểm số
- Không có insights chi tiết từ Gemini AI

---

## 💰 Chi Phí API

**Firebase ML API**: 
- **Free tier**: 1000 requests/month
- Sau đó: $0.0005/request (~10,000 VNĐ/1000 requests)

**Vertex AI API (Gemini)**:
- Đã included trong Firebase ML quota
- Free tier đủ cho development

---

## 🆘 Troubleshooting

### Lỗi: "API not enabled"
→ Follow Option 1 ở trên

### Lỗi: "Permission denied"  
→ Kiểm tra IAM roles cho service account

### Lỗi: "Quota exceeded"
→ Upgrade Firebase plan hoặc chờ reset quota

### API enabled nhưng vẫn lỗi
→ Clear cache + reload page
