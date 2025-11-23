# 🔧 Hướng dẫn sửa Quiz "Toán học"

## ⚠️ Vấn đề

Quiz "Toán học" của bạn có 2 câu hỏi THIẾU DATA:
- **Câu 5 (index 4):** ORDERING - Thiếu `orderingItems`
- **Câu 6 (index 5):** MATCHING - Thiếu `matchingPairs`

## ✅ Giải pháp 1: Update qua Firebase Console (NHANH NHẤT)

### Bước 1: Mở Firebase Console
1. Vào https://console.firebase.google.com
2. Chọn project của bạn
3. Click vào **Firestore Database** ở menu bên trái

### Bước 2: Tìm Quiz Document
1. Navigate đến collection `quizzes`
2. Tìm document của quiz "Toán học"
3. Click vào document để mở

### Bước 3: Fix Câu hỏi ORDERING (index 4)

1. Scroll đến field `questions` (array)
2. Click vào questions array
3. Tìm item có index **4** (câu hỏi ordering)
4. Click "Add field" bên cạnh item này
5. Thêm field:
   - Field name: `orderingItems`
   - Field type: **array**

6. Click vào `orderingItems` array vừa tạo
7. Add 4 items với structure sau:

**Item 0:**
```
Type: map
Fields:
  - id: "item_1" (string)
  - text: "Milimét (mm)" (string)
  - correctOrder: 1 (number)
```

**Item 1:**
```
Type: map
Fields:
  - id: "item_2" (string)
  - text: "Centimét (cm)" (string)
  - correctOrder: 2 (number)
```

**Item 2:**
```
Type: map
Fields:
  - id: "item_3" (string)
  - text: "Mét (m)" (string)
  - correctOrder: 3 (number)
```

**Item 3:**
```
Type: map
Fields:
  - id: "item_4" (string)
  - text: "Kilômét (km)" (string)
  - correctOrder: 4 (number)
```

### Bước 4: Fix Câu hỏi MATCHING (index 5)

1. Vẫn trong questions array
2. Tìm item có index **5** (câu hỏi matching)
3. Click "Add field" bên cạnh item này
4. Thêm field:
   - Field name: `matchingPairs`
   - Field type: **array**

5. Click vào `matchingPairs` array vừa tạo
6. Add 4 items với structure sau:

**Item 0:**
```
Type: map
Fields:
  - id: "pair_1" (string)
  - left: "Hình tam giác" (string)
  - right: "3 cạnh" (string)
```

**Item 1:**
```
Type: map
Fields:
  - id: "pair_2" (string)
  - left: "Hình vuông" (string)
  - right: "4 cạnh" (string)
```

**Item 2:**
```
Type: map
Fields:
  - id: "pair_3" (string)
  - left: "Hình ngũ giác" (string)
  - right: "5 cạnh" (string)
```

**Item 3:**
```
Type: map
Fields:
  - id: "pair_4" (string)
  - left: "Hình lục giác" (string)
  - right: "6 cạnh" (string)
```

### Bước 5: Save Changes
1. Click **"Save"** button ở góc phải trên
2. Wait for changes to sync
3. Refresh your quiz page

## ✅ Giải pháp 2: Tạo lại quiz qua UI

Nếu update Firestore quá phức tạp, bạn có thể:

1. **Delete quiz cũ** hoặc để nguyên
2. **Create new quiz** với cùng tên "Toán học - Fixed"
3. Add questions và ensure:
   - Question type = "Ordering Question"
   - Click "Add Item" để thêm items
   - Question type = "Matching Question"  
   - Click "Add Pair" để thêm pairs

## 📊 Cấu trúc data đúng

### ORDERING Question
```json
{
  "type": "ordering",
  "text": "Sắp xếp các đơn vị đo độ dài từ nhỏ đến lớn:",
  "orderingItems": [
    {
      "id": "item_1",
      "text": "Milimét (mm)",
      "correctOrder": 1
    },
    {
      "id": "item_2",
      "text": "Centimét (cm)",
      "correctOrder": 2
    }
    // ... more items
  ],
  "answers": [],
  "correctAnswer": null
}
```

### MATCHING Question
```json
{
  "type": "matching",
  "text": "Ghép các hình học với số cạnh tương ứng:",
  "matchingPairs": [
    {
      "id": "pair_1",
      "left": "Hình tam giác",
      "right": "3 cạnh"
    },
    {
      "id": "pair_2",
      "left": "Hình vuông",
      "right": "4 cạnh"
    }
    // ... more pairs
  ],
  "answers": [],
  "correctAnswer": null
}
```

## ✅ Verify sau khi fix

1. Refresh quiz page
2. Start quiz
3. Navigate đến câu hỏi ordering/matching
4. Kiểm tra xem items/pairs đã hiển thị chưa
5. Test interaction (sắp xếp/ghép cặp)
6. Submit quiz và check results

## 🐛 Troubleshooting

**Vẫn thấy error "Câu hỏi không có các mục để sắp xếp":**
- Check lại Firestore data
- Ensure `orderingItems` array không empty
- Refresh browser cache (Ctrl + F5)

**Vẫn thấy error "Câu hỏi không có các cặp để ghép":**
- Check lại Firestore data
- Ensure `matchingPairs` array không empty
- Refresh browser cache (Ctrl + F5)

## 📞 Next Steps

Sau khi fix:
1. Test quiz hoạt động đúng
2. AI generation tool cần được update để tạo đầy đủ data
3. Consider adding validation khi tạo quiz

---

**TL;DR:** Quiz của bạn thiếu `orderingItems` và `matchingPairs` fields. Update Firestore data theo hướng dẫn trên hoặc tạo lại quiz qua UI.
