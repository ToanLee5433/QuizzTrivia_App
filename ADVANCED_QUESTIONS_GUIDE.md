# 📚 Hướng dẫn sử dụng 11 loại câu hỏi

## ✅ Trạng thái hỗ trợ

Hệ thống ĐÃ HỖ TRỢ ĐẦY ĐỦ 11 loại câu hỏi:

1. ✅ **multiple** - Trắc nghiệm 1 đáp án
2. ✅ **boolean** - Đúng/Sai
3. ✅ **short_answer** - Trả lời ngắn
4. ✅ **image** - Chọn ảnh
5. ✅ **checkbox** - Chọn nhiều đáp án
6. ✅ **rich_content** - Nội dung HTML rich text
7. ✅ **audio** - Nghe audio và trả lời
8. ✅ **video** - Xem video và trả lời
9. ✅ **ordering** - Sắp xếp thứ tự
10. ✅ **matching** - Ghép cặp
11. ✅ **fill_blanks** - Điền chỗ trống

## 🎯 Cách tạo quiz với các loại câu hỏi mới

### 1. ORDERING (Sắp xếp thứ tự)

**Bước 1:** Vào Create Quiz page
**Bước 2:** Add question và chọn type = "Ordering Question"
**Bước 3:** Click "Add Item" để thêm items (tối thiểu 2 items)
**Bước 4:** Nhập text cho mỗi item. Thứ tự hiện tại là thứ tự đúng
**Bước 5:** Save quiz

**Cấu trúc data:**
```json
{
  "type": "ordering",
  "orderingItems": [
    {
      "id": "item1",
      "text": "Bước 1",
      "correctOrder": 1
    },
    {
      "id": "item2", 
      "text": "Bước 2",
      "correctOrder": 2
    }
  ]
}
```

**UI khi làm quiz:**
- User thấy các items xáo trộn
- Dùng nút ↑ ↓ để sắp xếp lại
- Thứ tự cuối cùng sẽ được submit

### 2. MATCHING (Ghép cặp)

**Bước 1:** Vào Create Quiz page
**Bước 2:** Add question và chọn type = "Matching Question"  
**Bước 3:** Click "Add Pair" để thêm cặp (tối thiểu 2 cặp)
**Bước 4:** Nhập text cho cột trái và cột phải
**Bước 5:** Save quiz

**Cấu trúc data:**
```json
{
  "type": "matching",
  "matchingPairs": [
    {
      "id": "pair1",
      "left": "Python",
      "right": "Data Science"
    },
    {
      "id": "pair2",
      "left": "JavaScript", 
      "right": "Web Dev"
    }
  ]
}
```

**UI khi làm quiz:**
- User thấy 2 cột
- Click vào items ở cột phải để ghép với cột trái
- Các cặp đã ghép đúng sẽ highlight xanh

### 3. FILL_BLANKS (Điền chỗ trống)

**Bước 1:** Vào Create Quiz page
**Bước 2:** Add question và chọn type = "Essay Question"
**Bước 3:** Nhập câu văn với markers `{blank}` ở vị trí cần điền
**Bước 4:** Add blanks và nhập đáp án đúng cho mỗi chỗ trống
**Bước 5:** Save quiz

**Cấu trúc data:**
```json
{
  "type": "fill_blanks",
  "textWithBlanks": "HTML là {blank} và CSS là {blank}",
  "blanks": [
    {
      "id": "blank1",
      "position": 0,
      "correctAnswer": "HyperText Markup Language",
      "acceptedAnswers": ["html"],
      "caseSensitive": false
    }
  ]
}
```

**UI khi làm quiz:**
- User thấy câu văn với input fields inline
- Điền vào các ô trống
- Hệ thống check chính xác với đáp án

## ⚠️ Troubleshooting

### Vấn đề: "Câu hỏi không có các mục để sắp xếp"

**Nguyên nhân:** Quiz question thiếu `orderingItems` data

**Giải pháp:**
1. Edit quiz trong Create Quiz page
2. Ensure question type = "ordering"  
3. Add items bằng button "Add Item"
4. Mỗi item phải có text
5. Save lại quiz

### Vấn đề: "Câu hỏi không có các cặp để ghép"

**Nguyên nhân:** Quiz question thiếu `matchingPairs` data

**Giải pháp:**
1. Edit quiz trong Create Quiz page
2. Ensure question type = "matching"
3. Add pairs bằng button "Add Pair"
4. Cả left và right phải có text
5. Save lại quiz

### Vấn đề: Không thể tương tác với ordering/matching

**Nguyên nhân:** Items không được render vì thiếu data

**Giải pháp:**
1. Mở Browser Console (F12)
2. Tìm messages có 🔍 emoji
3. Check xem `itemsCount` hoặc `pairsCount` = 0 không
4. Nếu = 0, quiz cần được edit lại

## 🧪 Testing

### Test với sample data

File `test-advanced-questions.json` chứa sample data đầy đủ.

**Cách import:**
1. Copy nội dung từ file
2. Paste vào Create Quiz form
3. Hoặc manually create quiz theo cấu trúc

### Debug steps

1. **Check Console Logs:**
```javascript
// Tìm logs này trong Console:
🔍 Ordering Question: { itemsCount: 5, ... }
🔍 Matching Question: { pairsCount: 4, ... }
```

2. **Verify Data Structure:**
- ordering: Phải có `orderingItems` array
- matching: Phải có `matchingPairs` array  
- fill_blanks: Phải có `textWithBlanks` và `blanks`

3. **Test Flow:**
- Create quiz → Add questions → Save
- Start quiz → Answer questions → Submit
- Result page → Review answers

## 📊 Data Requirements

| Question Type | Required Fields | Min Items |
|--------------|----------------|-----------|
| ordering | orderingItems | 2 |
| matching | matchingPairs | 2 |
| fill_blanks | textWithBlanks, blanks | 1 |
| audio | audioUrl, answers | 1 |
| video | videoUrl, answers | 1 |

## 🎓 Best Practices

1. **Ordering Questions:**
   - Use 3-7 items for best UX
   - Clear, concise text for each item
   - Logical sequence

2. **Matching Questions:**
   - 3-6 pairs work best
   - Left and right should be clearly related
   - Avoid ambiguous matches

3. **Fill Blanks:**
   - Use `{blank}` markers in text
   - Provide accepted answers for flexibility
   - Consider case sensitivity

## 🚀 Quick Start

**Tạo quiz test nhanh:**

```bash
# 1. Vào Create Quiz
# 2. Add 3 questions:
#    - Question 1: type = "ordering", add 4 items
#    - Question 2: type = "matching", add 3 pairs
#    - Question 3: type = "fill_blanks", add 2 blanks
# 3. Save quiz
# 4. Start quiz và test
```

## 📞 Support

Nếu vẫn gặp vấn đề:
1. Check browser console để xem error messages
2. Verify quiz data structure trong Firestore
3. Ensure all required fields are filled
4. Test với sample data provided

---

**Note:** Code ĐÃ HỖ TRỢ đầy đủ. Nếu thấy error messages, đó là vì quiz THIẾU DATA, không phải lỗi code.
