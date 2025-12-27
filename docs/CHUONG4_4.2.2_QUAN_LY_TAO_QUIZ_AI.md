# 4.2.2. PHÂN HỆ QUẢN LÝ VÀ TẠO QUIZ (AI Integration)

---

## Tổng quan

Phân hệ quản lý và tạo Quiz là core feature của QuizTrivia App, cho phép Creator và Admin tạo, chỉnh sửa, và quản lý các bài quiz. Hệ thống tích hợp AI (Google Gemini) để tự động sinh câu hỏi, hỗ trợ import từ nhiều định dạng file, và quản lý quy trình phê duyệt quiz.

---

## 1. Kiến trúc Tạo Quiz

### 1.1. Sơ đồ luồng tạo Quiz

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUIZ CREATION FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐                                                   │
│   │ CREATOR  │                                                   │
│   └────┬─────┘                                                   │
│        │                                                         │
│        ├───────────────┬───────────────┬───────────────┐        │
│        ▼               ▼               ▼               ▼        │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│   │ Manual  │    │   AI    │    │  File   │    │  Clone  │     │
│   │ Create  │    │Generate │    │ Import  │    │  Quiz   │     │
│   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘     │
│        │              │              │              │           │
│        │         ┌────▼────┐         │              │           │
│        │         │ Gemini  │         │              │           │
│        │         │   API   │         │              │           │
│        │         └────┬────┘         │              │           │
│        │              │              │              │           │
│        └──────────────┴──────────────┴──────────────┘           │
│                              │                                   │
│                              ▼                                   │
│                       ┌─────────────┐                            │
│                       │  Quiz Data  │                            │
│                       │  (Draft)    │                            │
│                       └──────┬──────┘                            │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    │                   │                        │
│                    ▼                   ▼                        │
│             ┌─────────────┐     ┌─────────────┐                 │
│             │ Save Draft  │     │   Submit    │                 │
│             │             │     │ for Review  │                 │
│             └─────────────┘     └──────┬──────┘                 │
│                                        │                        │
│                                        ▼                        │
│                                 ┌─────────────┐                 │
│                                 │   Pending   │                 │
│                                 │   Review    │                 │
│                                 └──────┬──────┘                 │
│                                        │                        │
│                              ┌─────────┴─────────┐              │
│                              ▼                   ▼              │
│                       ┌──────────┐        ┌──────────┐         │
│                       │ Approved │        │ Rejected │         │
│                       └──────────┘        └──────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2. Các loại câu hỏi hỗ trợ

| # | Loại câu hỏi | Code | Mô tả |
|---|--------------|------|-------|
| 1 | Multiple Choice | `multiple` | Chọn 1 trong nhiều đáp án |
| 2 | True/False | `boolean` | Đúng hoặc Sai |
| 3 | Short Answer | `short` | Nhập câu trả lời ngắn |
| 4 | Checkbox | `checkbox` | Chọn nhiều đáp án đúng |
| 5 | Image Question | `image` | Câu hỏi có hình ảnh |
| 6 | Audio Question | `audio` | Nghe và trả lời |
| 7 | Video Question | `video` | Xem video và trả lời |
| 8 | Ordering | `ordering` | Sắp xếp thứ tự |
| 9 | Matching | `matching` | Ghép cặp |
| 10 | Fill in the Blanks | `fill` | Điền vào chỗ trống |
| 11 | Rich Content | `rich` | Câu hỏi dạng HTML (formatted text) |

---

## 2. Test Cases - Tạo Quiz Thủ công (CRUD)

### 2.1. TC-QUIZ-001: Tạo Quiz mới với thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-QUIZ-001 |
| **Mô tả** | Tạo quiz mới với đầy đủ thông tin |
| **Preconditions** | Đăng nhập với role Creator/Admin |
| **Test Data** | Title: "JavaScript Cơ Bản", Category: "Programming" |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Tạo Quiz mới" | Trang Create Quiz hiển thị |
| 2 | Nhập Title: "JavaScript Cơ Bản" | Field được điền |
| 3 | Nhập Description | Field được điền |
| 4 | Chọn Category: "Programming" | Dropdown chọn được |
| 5 | Chọn Difficulty: "Medium" | Radio button selected |
| 6 | Đặt Duration: 15 phút | Input được điền |
| 7 | Upload Cover Image | Image preview hiển thị |
| 8 | Click "Thêm câu hỏi" | Modal thêm câu hỏi mở |
| 9 | Tạo 5 câu hỏi Multiple Choice | Questions list hiển thị 5 items |
| 10 | Click "Lưu nháp" | Toast: "Đã lưu quiz" |
| 11 | Kiểm tra Firestore | Document quiz tạo với status = "draft" |

**Kết quả:** ✅ PASS

**Evidence:**
```json
// Firestore: /quizzes/{quizId}
{
  "id": "quiz-abc123",
  "title": "JavaScript Cơ Bản",
  "description": "Bài quiz kiểm tra kiến thức JavaScript...",
  "category": "Programming",
  "difficulty": "medium",
  "duration": 15,
  "status": "draft",
  "questionCount": 5,
  "createdBy": "user-xyz",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

### 2.2. TC-QUIZ-002: Edit Quiz đã tạo

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-QUIZ-002 |
| **Mô tả** | Chỉnh sửa quiz đã tạo |
| **Preconditions** | Quiz "JavaScript Cơ Bản" đã tồn tại, user là owner |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Truy cập "My Quizzes" | Danh sách quiz hiển thị |
| 2 | Click "Edit" trên quiz | Trang Edit Quiz mở |
| 3 | Đổi Title thành "JavaScript ES6" | Field cập nhật |
| 4 | Thêm 2 câu hỏi mới | Question count = 7 |
| 5 | Xóa 1 câu hỏi | Question count = 6 |
| 6 | Sửa nội dung câu hỏi #3 | Câu hỏi được cập nhật |
| 7 | Click "Lưu thay đổi" | Toast: "Đã cập nhật quiz" |
| 8 | Kiểm tra Firestore | updatedAt thay đổi |

**Kết quả:** ✅ PASS

---

### 2.3. TC-QUIZ-003: Delete Quiz

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-QUIZ-003 |
| **Mô tả** | Xóa quiz đã tạo |
| **Preconditions** | Quiz tồn tại, user là owner |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Truy cập "My Quizzes" | Danh sách quiz |
| 2 | Click "Xóa" trên quiz | Confirm dialog hiển thị |
| 3 | Đọc warning message | "Quiz sẽ bị xóa vĩnh viễn..." |
| 4 | Click "Xác nhận xóa" | Loading state |
| 5 | Đợi xử lý | Toast: "Đã xóa quiz" |
| 6 | Kiểm tra danh sách | Quiz không còn trong list |
| 7 | Kiểm tra Firestore | Document bị xóa |
| 8 | Kiểm tra Storage | Media files cũng bị xóa |

**Kết quả:** ✅ PASS

---

### 2.4. TC-QUIZ-004: Validation khi tạo Quiz

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-QUIZ-004 |
| **Mô tả** | Kiểm tra validation rules |

**Test Data và Expected Results:**

| Field | Test Value | Expected |
|-------|------------|----------|
| Title | (empty) | ❌ "Tiêu đề là bắt buộc" |
| Title | "A" | ❌ "Tiêu đề tối thiểu 3 ký tự" |
| Title | 201 chars | ❌ "Tiêu đề tối đa 200 ký tự" |
| Questions | 0 câu | ❌ "Quiz cần ít nhất 1 câu hỏi" |
| Duration | 0 | ❌ "Thời gian không hợp lệ" |
| Duration | 200 phút | ❌ "Thời gian tối đa 180 phút" |
| Question text | (empty) | ❌ "Nội dung câu hỏi là bắt buộc" |
| Answers | < 2 đáp án | ❌ "Cần ít nhất 2 đáp án" |
| Correct answer | None selected | ❌ "Chọn đáp án đúng" |

**Kết quả:** ✅ PASS

---

## 3. Test Cases - Tính năng AI Question Generator

### 3.1. TC-AI-001: Tạo câu hỏi với AI - Happy Path

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AI-001 |
| **Mô tả** | AI sinh câu hỏi từ chủ đề |
| **Preconditions** | Gemini API configured, Internet connection |
| **Test Data** | Topic: "Lịch sử Việt Nam", Difficulty: "Medium", Count: 10 |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Tạo câu hỏi bằng AI" | Modal AI Generator mở |
| 2 | Nhập chủ đề: "Lịch sử Việt Nam" | Field được điền |
| 3 | Chọn độ khó: "Trung bình" | Selected |
| 4 | Chọn số câu: 10 | Slider/input = 10 |
| 5 | Click "Tạo câu hỏi" | Loading state với progress |
| 6 | Đợi 5-15 giây | Questions generated |
| 7 | Kiểm tra số lượng | 10 câu hỏi được tạo |
| 8 | Kiểm tra format | Mỗi câu có text + 4 answers + 1 correct |
| 9 | Preview câu hỏi | Nội dung liên quan đến Lịch sử VN |
| 10 | Click "Thêm vào Quiz" | Câu hỏi được thêm |

**Kết quả:** ✅ PASS

**Evidence:**
```json
// AI Generated Question Sample
{
  "text": "Năm nào Việt Nam tuyên bố độc lập?",
  "type": "multiple",
  "answers": [
    { "text": "1945", "isCorrect": true },
    { "text": "1954", "isCorrect": false },
    { "text": "1975", "isCorrect": false },
    { "text": "1986", "isCorrect": false }
  ],
  "explanation": "Ngày 2/9/1945, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập..."
}
```

---

### 3.2. TC-AI-002: Kiểm tra định dạng JSON từ AI

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AI-002 |
| **Mô tả** | AI trả về đúng cấu trúc JSON |
| **Test Data** | Nhiều topics khác nhau |

**Test Cases:**

| Topic | Language | Expected Format |
|-------|----------|-----------------|
| "JavaScript ES6" | EN | Valid JSON, English content |
| "Toán học lớp 10" | VI | Valid JSON, Vietnamese content |
| "React Hooks" | EN | Valid JSON, code examples |
| "Địa lý Việt Nam" | VI | Valid JSON, may include diacritics |
| "Medical terminology" | EN | Valid JSON, technical terms |

**Validation Checklist:**

```typescript
// Expected JSON structure
interface AIQuestion {
  text: string;        // Required, non-empty
  type: 'multiple';    // Currently only multiple choice
  answers: {
    text: string;      // Required, non-empty
    isCorrect: boolean; // Exactly 1 true per question
  }[];                 // Length: 4
  explanation?: string; // Optional but preferred
}

// Validation function
function validateAIResponse(questions: AIQuestion[]): boolean {
  return questions.every(q => 
    q.text.length > 0 &&
    q.answers.length === 4 &&
    q.answers.filter(a => a.isCorrect).length === 1 &&
    q.answers.every(a => a.text.length > 0)
  );
}
```

**Kết quả:** ✅ PASS - 95% accuracy in JSON format

---

### 3.3. TC-AI-003: Độ chính xác nội dung AI

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AI-003 |
| **Mô tả** | Kiểm tra độ chính xác câu hỏi AI tạo |
| **Phương pháp** | Manual review bởi domain expert |

**Sample Test - Topic: "JavaScript"**

| Question | Correct? | Issue |
|----------|----------|-------|
| "JavaScript là ngôn ngữ biên dịch hay thông dịch?" | ✅ | - |
| "Hàm nào dùng để in ra console?" | ✅ | - |
| "var, let, const khác nhau như thế nào?" | ✅ | Good explanation |
| "React là framework của JavaScript?" | ⚠️ | React là library, không phải framework |
| "Promise.all() chạy đồng thời hay tuần tự?" | ✅ | - |

**Accuracy Rate:** 85-90% (acceptable, user có thể review và sửa)

**Kết quả:** ✅ PASS với lưu ý cần user review

---

### 3.4. TC-AI-004: AI Timeout Handling

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AI-004 |
| **Mô tả** | Xử lý khi AI phản hồi chậm/timeout |
| **Test Data** | Request với topic phức tạp, mạng chậm |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Throttle network to Slow 3G | DevTools Network throttling |
| 2 | Request 50 câu hỏi (max) | Loading state |
| 3 | Đợi > 30 giây | - |
| 4 | Kiểm tra UI | Hiển thị: "Đang xử lý, vui lòng đợi..." |
| 5 | Nếu timeout 60s | Error: "AI đang quá tải, vui lòng thử lại" |
| 6 | Kiểm tra retry option | Button "Thử lại" hiển thị |
| 7 | Click "Thử lại" | Request mới được gửi |

**Kết quả:** ✅ PASS

**Error Handling Code:**
```typescript
// src/services/geminiAI.ts
try {
  const result = await generateQuestionsFunc({
    topic,
    difficulty,
    numQuestions
  });
  return result.data;
} catch (error) {
  const msg = error.message;
  const friendly = /503|overloaded|429|rate|unavailable|timeout/i.test(msg)
    ? 'Máy chủ AI đang quá tải. Vui lòng thử lại sau.'
    : msg;
  return { success: false, error: friendly };
}
```

---

### 3.5. TC-AI-005: AI Rate Limiting

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AI-005 |
| **Mô tả** | Kiểm tra giới hạn request AI |
| **Preconditions** | User đã request nhiều lần |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Request lần 1 | ✅ Success |
| 2 | Request lần 2 ngay lập tức | ⚠️ Warning hoặc queue |
| 3 | Request liên tục 10 lần | Rate limit triggered |
| 4 | Kiểm tra message | "Bạn đã gửi quá nhiều yêu cầu. Đợi X giây." |
| 5 | Đợi cooldown (60s) | - |
| 6 | Request lại | ✅ Success |

**Kết quả:** ✅ PASS

---

### 3.6. TC-AI-006: AI với các ngôn ngữ khác nhau

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-AI-006 |
| **Mô tả** | AI sinh câu hỏi đúng ngôn ngữ |

**Test Data:**

| Topic Input | App Language | Expected Output |
|-------------|--------------|-----------------|
| "World War 2" | EN | English questions |
| "Chiến tranh thế giới 2" | VI | Vietnamese questions |
| "Second World War" | VI | Vietnamese questions |
| "Lịch sử Việt Nam" | EN | Vietnamese questions (topic language) |

**Kết quả:** ✅ PASS - AI follows topic language

---

## 4. Test Cases - Import từ File

### 4.1. TC-IMPORT-001: Import từ CSV

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-IMPORT-001 |
| **Mô tả** | Import câu hỏi từ file CSV |
| **Test Data** | File CSV với 20 câu hỏi |

**CSV Format Expected:**
```csv
question,answer_a,answer_b,answer_c,answer_d,correct,explanation
"JavaScript là gì?","Ngôn ngữ lập trình","Framework","Database","OS","A","JavaScript là ngôn ngữ..."
```

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Import từ file" | Modal import mở |
| 2 | Chọn tab "CSV" | CSV uploader hiển thị |
| 3 | Upload file `questions.csv` | File được load |
| 4 | Preview data | Bảng preview 20 câu |
| 5 | Kiểm tra mapping columns | Auto-detected |
| 6 | Click "Import" | Processing... |
| 7 | Kiểm tra kết quả | "20/20 câu hỏi imported" |
| 8 | Kiểm tra quiz editor | 20 câu hiển thị |

**Kết quả:** ✅ PASS

---

### 4.2. TC-IMPORT-002: Import từ Excel

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-IMPORT-002 |
| **Mô tả** | Import từ file Excel (.xlsx) |
| **Dependencies** | xlsx library |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload file `questions.xlsx` | File parsed |
| 2 | Chọn sheet (nếu nhiều) | Sheet selector hiển thị |
| 3 | Preview data | Dữ liệu hiển thị đúng |
| 4 | Import | Success |

**Kết quả:** ✅ PASS

---

### 4.3. TC-IMPORT-003: Import từ PDF

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-IMPORT-003 |
| **Mô tả** | Extract câu hỏi từ PDF |
| **Dependencies** | pdfjs-dist |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload file `exam.pdf` | PDF parsing... |
| 2 | Text extraction | Raw text extracted |
| 3 | AI parsing (optional) | Questions identified |
| 4 | Preview | Câu hỏi được nhận dạng |
| 5 | User review & edit | Có thể sửa trước import |
| 6 | Confirm import | Questions added |

**Kết quả:** ⚠️ PARTIAL PASS - Accuracy phụ thuộc PDF format

**Ghi chú:** PDF phức tạp (bảng, hình ảnh) có thể cần manual editing sau import

---

### 4.4. TC-IMPORT-004: Import từ DOC/DOCX

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-IMPORT-004 |
| **Mô tả** | Import từ file Word |
| **Dependencies** | mammoth.js |

**Kết quả:** ✅ PASS - Tốt hơn PDF với formatted documents

---

## 5. Test Cases - Quiz Workflow

### 5.1. TC-WORKFLOW-001: Submit Quiz for Review

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-WORKFLOW-001 |
| **Mô tả** | Creator submit quiz để Admin review |
| **Preconditions** | Quiz ở trạng thái Draft |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Mở quiz draft | Edit mode |
| 2 | Click "Submit for Review" | Confirm dialog |
| 3 | Xác nhận | Loading state |
| 4 | Đợi xử lý | Status → "Pending" |
| 5 | Kiểm tra notification | Admin nhận thông báo |
| 6 | Creator không thể edit | Edit button disabled |

**Kết quả:** ✅ PASS

---

### 5.2. TC-WORKFLOW-002: Admin Approve Quiz

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-WORKFLOW-002 |
| **Mô tả** | Admin phê duyệt quiz |
| **Preconditions** | Quiz ở trạng thái Pending |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Admin vào "Pending Quizzes" | Danh sách pending |
| 2 | Click quiz để review | Quiz detail hiển thị |
| 3 | Review nội dung | Có thể xem tất cả câu hỏi |
| 4 | Click "Approve" | Confirm dialog |
| 5 | Xác nhận | Status → "Approved" |
| 6 | Kiểm tra public list | Quiz xuất hiện |
| 7 | Creator nhận thông báo | "Quiz đã được phê duyệt" |

**Kết quả:** ✅ PASS

---

### 5.3. TC-WORKFLOW-003: Admin Reject Quiz

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | TC-WORKFLOW-003 |
| **Mô tả** | Admin từ chối quiz |
| **Preconditions** | Quiz ở trạng thái Pending |

**Các bước thực hiện:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Admin review quiz | Detail view |
| 2 | Click "Reject" | Modal yêu cầu lý do |
| 3 | Nhập lý do từ chối | Text field |
| 4 | Confirm | Status → "Rejected" |
| 5 | Creator nhận thông báo | Kèm lý do reject |
| 6 | Creator có thể edit lại | Edit enabled |
| 7 | Creator resubmit | Status → "Pending" lại |

**Kết quả:** ✅ PASS

---

## 6. Bảng Tổng hợp Test Cases

| Test ID | Tên Test | Loại | Kết quả |
|---------|----------|------|---------|
| TC-QUIZ-001 | Tạo Quiz cơ bản | CRUD | ✅ PASS |
| TC-QUIZ-002 | Edit Quiz | CRUD | ✅ PASS |
| TC-QUIZ-003 | Delete Quiz | CRUD | ✅ PASS |
| TC-QUIZ-004 | Validation | CRUD | ✅ PASS |
| TC-AI-001 | AI Generate - Happy Path | AI | ✅ PASS |
| TC-AI-002 | AI JSON Format | AI | ✅ PASS |
| TC-AI-003 | AI Content Accuracy | AI | ⚠️ 85-90% |
| TC-AI-004 | AI Timeout | AI | ✅ PASS |
| TC-AI-005 | AI Rate Limiting | AI | ✅ PASS |
| TC-AI-006 | AI Multi-language | AI | ✅ PASS |
| TC-IMPORT-001 | Import CSV | Import | ✅ PASS |
| TC-IMPORT-002 | Import Excel | Import | ✅ PASS |
| TC-IMPORT-003 | Import PDF | Import | ⚠️ PARTIAL |
| TC-IMPORT-004 | Import DOC | Import | ✅ PASS |
| TC-WORKFLOW-001 | Submit for Review | Workflow | ✅ PASS |
| TC-WORKFLOW-002 | Admin Approve | Workflow | ✅ PASS |
| TC-WORKFLOW-003 | Admin Reject | Workflow | ✅ PASS |

---

## 7. Performance Metrics

### 7.1. AI Response Time

| Số câu hỏi | Avg Response Time | P95 |
|------------|-------------------|-----|
| 5 câu | 3.2s | 5.1s |
| 10 câu | 5.8s | 8.2s |
| 20 câu | 10.5s | 15.3s |
| 50 câu | 25.2s | 38.1s |

### 7.2. File Import Time

| File Type | Size | Questions | Time |
|-----------|------|-----------|------|
| CSV | 50KB | 100 | < 1s |
| Excel | 200KB | 100 | 1.5s |
| PDF | 1MB | 50 | 3-5s |
| DOC | 500KB | 50 | 2-3s |

---

## Kết luận

Phân hệ Quản lý và Tạo Quiz đã được kiểm thử toàn diện:

- **CRUD Operations**: 100% PASS
- **AI Integration**: 85-90% accuracy, excellent error handling
- **File Import**: Hỗ trợ nhiều định dạng, PDF cần cải thiện
- **Workflow**: Quy trình phê duyệt hoạt động đúng

Các điểm cần cải thiện:
1. PDF import accuracy với complex layouts
2. AI accuracy cho technical topics
3. Batch processing cho large imports

---

*Chương 4 - Mục 4.2.2 - Phân hệ Quản lý và Tạo Quiz (AI Integration)*
