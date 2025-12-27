# 4.2.2. KẾT QUẢ KIỂM THỬ PHÂN HỆ QUẢN LÝ QUIZ & TÍCH HỢP AI

---

## Tổng quan

Phân hệ Quản lý Quiz là core feature của QuizTrivia App, bao gồm việc tạo quiz thủ công, tích hợp AI (Gemini) để sinh câu hỏi tự động, import từ file, và quy trình duyệt bài.

**Tổng số Test Cases:** 13  
**Môi trường kiểm thử:** Chrome 120+, Firefox 121+, Safari 17+  
**Ngày thực hiện:** 20/12/2024

---

## Bảng Kết quả Kiểm thử Chi tiết

| STT | Tên kịch bản | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|-----|-------------|-------------------|------------------|-----------------|------------|
| TC-QUIZ-01 | **Tạo Quiz thủ công thành công (chế độ nhập tay)** | 1. Đăng nhập với tài khoản Teacher/User<br>2. Vào menu "Tạo Quiz" (`/quiz/create`)<br>3. Chọn tab "Nhập thủ công"<br>4. Nhập Tiêu đề: "Quiz JavaScript cơ bản"<br>5. Chọn Danh mục: "Lập trình"<br>6. Chọn Độ khó: "Trung bình"<br>7. Thêm mô tả ngắn<br>8. Click "Thêm câu hỏi"<br>9. Chọn loại "Trắc nghiệm"<br>10. Nhập nội dung câu hỏi và 4 đáp án<br>11. Đánh dấu đáp án đúng<br>12. Click "Lưu Quiz" | - Quiz được tạo thành công<br>- Chuyển đến trang Preview Quiz<br>- Dữ liệu lưu vào Firestore<br>- Trạng thái: Draft | - Form validation pass<br>- Loading hiển thị khi lưu<br>- Toast: "Quiz đã được tạo thành công!"<br>- Redirect đến `/quiz/{id}/preview`<br>- Document tạo trong `quizzes` collection với `status: "draft"`<br>- Có đầy đủ: title, category, difficulty, questions array | ✅ **PASS** |
| TC-QUIZ-02 | **Kiểm tra Validate dữ liệu khi để trống tiêu đề Quiz** | 1. Vào trang Tạo Quiz<br>2. Để trống field Tiêu đề<br>3. Điền đầy đủ các thông tin khác<br>4. Click "Lưu Quiz" | - Hiển thị lỗi validation<br>- Form không submit<br>- Field Tiêu đề highlight đỏ<br>- Message: "Tiêu đề không được để trống" | - Validation error inline hiển thị ngay dưới field<br>- Border đỏ + icon warning<br>- Message: "Vui lòng nhập tiêu đề Quiz (tối thiểu 5 ký tự)"<br>- Button "Lưu Quiz" bị disable<br>- Focus tự động vào field Tiêu đề | ✅ **PASS** |
| TC-QUIZ-03 | **Tạo Quiz tự động bằng AI (Nhập chủ đề hợp lệ)** | 1. Vào trang Tạo Quiz<br>2. Chọn tab "Tạo bằng AI"<br>3. Nhập chủ đề: "Lịch sử Việt Nam thế kỷ 20"<br>4. Chọn số lượng câu hỏi: 10<br>5. Chọn độ khó: "Dễ"<br>6. Chọn ngôn ngữ: "Tiếng Việt"<br>7. Click "Tạo câu hỏi" | - Loading indicator hiển thị<br>- Sau 5-15 giây: 10 câu hỏi được sinh ra<br>- Câu hỏi đúng chủ đề<br>- Format JSON đúng chuẩn | - Spinner + text "Đang tạo câu hỏi với AI..."<br>- Progress: "Đang xử lý... (có thể mất 10-30 giây)"<br>- Sau 8 giây: 10 câu hỏi hiển thị trong editor<br>- Mỗi câu có: question, options (4), correctAnswer, explanation<br>- Nội dung liên quan đến Lịch sử VN thế kỷ 20<br>- Có thể edit/xóa từng câu | ✅ **PASS** |
| TC-QUIZ-04 | **Kiểm tra xử lý lỗi khi AI không sinh được nội dung (Chủ đề vi phạm)** | 1. Vào tab "Tạo bằng AI"<br>2. Nhập chủ đề vi phạm: "Cách chế tạo vũ khí"<br>3. Click "Tạo câu hỏi" | - AI từ chối tạo nội dung<br>- Hiển thị thông báo lỗi phù hợp<br>- Không crash ứng dụng<br>- Gợi ý nhập chủ đề khác | - Loading hiển thị 3-5 giây<br>- Toast error: "Không thể tạo nội dung cho chủ đề này. Vui lòng thử chủ đề khác phù hợp hơn."<br>- Field chủ đề được giữ nguyên để user sửa<br>- Gợi ý: "Hãy thử các chủ đề về giáo dục, khoa học, văn hóa..."<br>- Log error được ghi lại (không hiển thị cho user) | ✅ **PASS** |
| TC-QUIZ-05 | **Chỉnh sửa nội dung câu hỏi sau khi AI tạo ra** | 1. Sau khi AI tạo 10 câu hỏi (TC-QUIZ-03)<br>2. Click icon "Edit" trên câu hỏi số 1<br>3. Sửa nội dung câu hỏi<br>4. Sửa đáp án A thành nội dung khác<br>5. Đổi đáp án đúng từ B sang C<br>6. Click "Lưu câu hỏi" | - Modal edit mở ra với data hiện tại<br>- Cho phép sửa tất cả fields<br>- Lưu thành công<br>- Cập nhật trong danh sách | - Modal fullscreen hiển thị với form edit<br>- Tất cả fields editable: question, options[], correctAnswer, explanation, points<br>- Real-time preview bên cạnh<br>- Sau khi lưu: Câu hỏi cập nhật trong list<br>- Indicator "Đã chỉnh sửa" hiển thị<br>- Undo available trong 10 giây | ✅ **PASS** |
| TC-QUIZ-06 | **Thêm câu hỏi mới vào Quiz đã có** | 1. Mở Quiz đã tạo ở chế độ Edit<br>2. Scroll xuống cuối danh sách câu hỏi<br>3. Click nút "+ Thêm câu hỏi"<br>4. Chọn loại "Điền vào chỗ trống"<br>5. Nhập nội dung: "Thủ đô Việt Nam là ___"<br>6. Nhập đáp án đúng: "Hà Nội"<br>7. Click "Thêm" | - Form thêm câu hỏi hiển thị<br>- Hỗ trợ nhiều loại câu hỏi<br>- Câu hỏi mới thêm vào cuối list<br>- Số thứ tự tự động cập nhật | - Dropdown chọn loại câu hỏi: 11 options (Multiple Choice, Fill Blank, True/False, Matching, Ordering, Short Answer, Essay, Image, Audio, Video, Code)<br>- Form thay đổi theo loại câu hỏi<br>- Sau khi thêm: Câu hỏi mới ở cuối với STT = n+1<br>- Toast: "Đã thêm câu hỏi mới"<br>- Total questions counter cập nhật | ✅ **PASS** |
| TC-QUIZ-07 | **Xóa câu hỏi khỏi Quiz** | 1. Mở Quiz ở chế độ Edit<br>2. Hover vào câu hỏi số 3<br>3. Click icon "Xóa" (trash)<br>4. Confirm trong dialog xác nhận | - Dialog confirm hiển thị<br>- Sau khi confirm: Câu hỏi bị xóa<br>- Các câu sau đánh số lại<br>- Có thể Undo trong 10 giây | - Dialog: "Bạn có chắc muốn xóa câu hỏi này?"<br>- Buttons: "Hủy" và "Xóa"<br>- Sau khi xóa: Câu 3 biến mất, câu 4 trở thành câu 3<br>- Toast với nút Undo: "Đã xóa câu hỏi. Hoàn tác?"<br>- Click Undo: Câu hỏi được khôi phục đúng vị trí | ✅ **PASS** |
| TC-QUIZ-08 | **Import câu hỏi từ file CSV đúng định dạng** | 1. Vào tab "Import từ File"<br>2. Click "Chọn file" hoặc kéo thả<br>3. Chọn file `questions.csv` với format chuẩn:<br>`question,optionA,optionB,optionC,optionD,correct`<br>4. Click "Import" | - File được parse thành công<br>- Preview hiển thị các câu hỏi<br>- Cho phép edit trước khi import<br>- Import vào Quiz thành công | - Drag & drop zone highlight khi kéo file<br>- Sau khi chọn: Loading "Đang phân tích file..."<br>- Preview table hiển thị: 15 câu hỏi từ CSV<br>- Checkbox chọn câu muốn import<br>- "Đã import 15 câu hỏi thành công!"<br>- Câu hỏi thêm vào Quiz hiện tại | ✅ **PASS** |
| TC-QUIZ-09 | **Import câu hỏi từ file PDF (AI parse nội dung)** | 1. Vào tab "Import từ File"<br>2. Chọn file `exam_questions.pdf` (file đề thi scan)<br>3. Hệ thống gọi AI để parse<br>4. Review kết quả parse<br>5. Confirm import | - PDF được upload thành công<br>- AI extract text và nhận diện câu hỏi<br>- Hiển thị preview để review<br>- Cho phép sửa trước khi import | - Upload progress bar hiển thị<br>- "Đang sử dụng AI để phân tích PDF..."<br>- Sau 15-30 giây: Kết quả hiển thị<br>- AI nhận diện được 20/22 câu hỏi (90.9% accuracy)<br>- 2 câu cần review thủ công (highlight vàng)<br>- Edit inline available<br>- Import thành công sau khi confirm | ✅ **PASS** |
| TC-QUIZ-10 | **Kiểm tra báo lỗi khi Import file sai định dạng** | 1. Vào tab "Import từ File"<br>2. Chọn file `image.png` (không phải CSV/PDF/DOC)<br>3. Hoặc chọn file CSV với format sai | - Hiển thị lỗi định dạng không hỗ trợ<br>- Không crash ứng dụng<br>- Gợi ý định dạng đúng | - Trường hợp 1 (file type sai): "Định dạng file không được hỗ trợ. Vui lòng chọn file CSV, Excel, PDF hoặc Word."<br>- Trường hợp 2 (CSV sai format): "File CSV không đúng định dạng. Vui lòng kiểm tra lại cấu trúc cột."<br>- Link download template mẫu hiển thị<br>- File bị reject, có thể chọn file khác | ✅ **PASS** |
| TC-QUIZ-11 | **Thêm hình ảnh minh họa cho câu hỏi** | 1. Mở câu hỏi ở chế độ Edit<br>2. Click "Thêm hình ảnh"<br>3. Upload file `diagram.jpg` (1.5MB)<br>4. Crop/resize nếu cần<br>5. Lưu câu hỏi | - Upload progress hiển thị<br>- Ảnh được resize nếu quá lớn<br>- Preview ảnh trong câu hỏi<br>- Ảnh lưu vào Firebase Storage | - Click "Thêm hình ảnh" → File picker mở<br>- Upload progress: 0% → 100%<br>- Ảnh tự động resize còn max 800px width<br>- Crop tool available (optional)<br>- Preview hiển thị trong câu hỏi<br>- URL lưu vào field `imageUrl` của question<br>- Ảnh load nhanh khi play quiz | ✅ **PASS** |
| TC-QUIZ-12 | **Gửi yêu cầu duyệt Quiz (Submit for Review)** | 1. Hoàn thành tạo Quiz (có ít nhất 5 câu hỏi)<br>2. Click nút "Gửi duyệt"<br>3. Nhập ghi chú cho Admin (optional)<br>4. Confirm submit | - Quiz chuyển trạng thái sang "Pending"<br>- Không thể edit khi đang chờ duyệt<br>- Admin nhận thông báo có quiz mới<br>- User thấy status "Đang chờ duyệt" | - Validate: Quiz cần ít nhất 5 câu hỏi → Pass<br>- Modal confirm: "Gửi Quiz để Admin xem xét?"<br>- Textarea ghi chú (optional)<br>- Sau submit: Status badge đổi thành "Pending Review" (màu vàng)<br>- Các nút Edit bị disable<br>- Hiển thị: "Quiz đang chờ duyệt. Bạn sẽ nhận thông báo khi có kết quả."<br>- Firestore: `status: "pending"`, `submittedAt: timestamp` | ✅ **PASS** |
| TC-QUIZ-13 | **Xóa Quiz khỏi danh sách** | 1. Vào "Quản lý Quiz của tôi"<br>2. Tìm Quiz muốn xóa (status: Draft)<br>3. Click menu "..." → "Xóa"<br>4. Confirm trong dialog | - Dialog xác nhận hiển thị<br>- Quiz bị xóa (soft delete)<br>- Không hiển thị trong danh sách<br>- Có thể khôi phục trong 30 ngày | - Menu dropdown hiển thị: Edit, Duplicate, Delete<br>- Dialog: "Xóa Quiz '[Tên quiz]'? Hành động này có thể hoàn tác trong 30 ngày."<br>- Sau confirm: Quiz biến mất khỏi list<br>- Toast: "Quiz đã được xóa. Khôi phục?"<br>- Firestore: `deleted: true`, `deletedAt: timestamp`<br>- Quiz pending/approved: Không cho phép xóa (cần reject trước) | ✅ **PASS** |

---

## Chi tiết Kỹ thuật

### TC-QUIZ-03: AI Generation Flow

**API Call to Gemini:**
```typescript
const prompt = `
Tạo ${count} câu hỏi trắc nghiệm về chủ đề "${topic}" 
với độ khó "${difficulty}" bằng ${language}.
Format JSON: [{ question, options: [A,B,C,D], correctAnswer, explanation }]
`;

const response = await generateWithGemini(prompt);
```

**Response Parsing:**
- Validate JSON format
- Check required fields
- Sanitize content
- Map to Question model

### TC-QUIZ-08: CSV Format Template

```csv
question,optionA,optionB,optionC,optionD,correct,explanation
"1+1=?","1","2","3","4","B","1+1=2 là phép cộng cơ bản"
"Thủ đô VN?","HCM","Hà Nội","Đà Nẵng","Huế","B","Hà Nội là thủ đô"
```

---

## Tổng kết

| Metric | Giá trị |
|--------|---------|
| Tổng số Test Cases | 13 |
| Passed | 13 |
| Failed | 0 |
| Blocked | 0 |
| **Tỷ lệ Pass** | **100%** |

### Ghi chú
- AI Generation hoạt động tốt với các chủ đề giáo dục
- PDF parsing accuracy: ~90% (cần review thủ công một số câu)
- Import CSV/Excel hoạt động ổn định với file < 10MB
- Image upload resize tự động, không cần config thêm

---

*Chương 4 - Mục 4.2.2 - Kết quả Kiểm thử Phân hệ Quản lý Quiz & Tích hợp AI*
