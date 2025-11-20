# 🔥 Firebase Firestore Indexes Guide

## ⚠️ Indexes Cần Tạo

### 1. **Similar Quizzes Index**
**Collection**: `quizzes`
**Fields**:
- `status` (Ascending)
- `category` (Ascending)  
- `totalAttempts` (Descending)

**Link tạo index**:
```
https://console.firebase.google.com/v1/r/project/datn-quizapp/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9kYXRuLXF1aXphcHAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3F1aXp6ZXMvaW5kZXhlcy9fEAEaDAoIY2F0ZWdvcnkQARoKCgZzdGF0dXMQARoRCg10b3RhbEF0dGVtcHRzEAIaDAoIX19uYW1lX18QAg
```

### 2. **Popular Quizzes Index**
**Collection**: `quizzes`
**Fields**:
- `status` (Ascending)
- `totalAttempts` (Descending)

**Link tạo index**:
```
https://console.firebase.google.com/v1/r/project/datn-quizapp/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9kYXRuLXF1aXphcHAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3F1aXp6ZXMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaEQoNdG90YWxBdHRlbXB0cxACGgwKCF9fbmFtZV9fEAI
```

## 🚀 Cách Tạo Indexes

### Option 1: Qua Console Link (Nhanh nhất)
1. Click vào link tạo index ở trên
2. Đăng nhập Firebase Console
3. Click "Create Index"
4. Đợi 2-5 phút để index được tạo

### Option 2: Qua Firebase Console
1. Vào [Firebase Console](https://console.firebase.google.com)
2. Chọn project **datn-quizapp**
3. Vào **Firestore Database** → **Indexes**
4. Click **Create Index**
5. Điền thông tin:
   - Collection: `quizzes`
   - Fields theo bảng trên
   - Query scope: **Collection**

### Option 3: Qua CLI
Chạy lệnh:
```bash
firebase deploy --only firestore:indexes
```

## 📝 Thêm vào firestore.indexes.json

```json
{
  "indexes": [
    {
      "collectionGroup": "quizzes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "totalAttempts", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "quizzes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "totalAttempts", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## ✅ Kiểm Tra Index Đã Hoạt Động

1. Sau khi tạo, reload trang
2. Kiểm tra console không còn lỗi "requires an index"
3. Similar quizzes và AI analysis sẽ hoạt động bình thường

## ⏱️ Thời Gian Chờ

- Index nhỏ (< 1000 docs): **2-5 phút**
- Index trung bình: **5-15 phút**
- Index lớn (> 10000 docs): **30-60 phút**

## 🔄 Auto-Index trong Development

Firebase sẽ tự gợi ý tạo index khi bạn chạy query cần index. Click vào link trong console error để tạo nhanh.
