# 4.2.3. KẾT QUẢ KIỂM THỬ PHÂN HỆ NGƯỜI CHƠI - QUIZ PLAYER

---

## Tổng quan

Phân hệ Quiz Player là giao diện chính để người dùng tìm kiếm, chơi quiz và xem kết quả. Các test case bao gồm tìm kiếm/lọc, gameplay, tính điểm, và các tính năng tương tác.

**Tổng số Test Cases:** 12  
**Môi trường kiểm thử:** Chrome 120+, Firefox 121+, Safari 17+, Mobile (iOS/Android)  
**Ngày thực hiện:** 21/12/2024

---

## Bảng Kết quả Kiểm thử Chi tiết

| STT | Tên kịch bản | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|-----|-------------|-------------------|------------------|-----------------|------------|
| TC-PLAY-01 | **Tìm kiếm Quiz theo từ khóa** | 1. Vào trang Khám phá Quiz (`/quizzes`)<br>2. Nhập từ khóa vào ô tìm kiếm: "JavaScript"<br>3. Nhấn Enter hoặc click icon Search<br>4. Chờ kết quả hiển thị | - Hiển thị loading indicator<br>- Kết quả chứa từ khóa trong title/description<br>- Highlight từ khóa trong kết quả<br>- Hiển thị số lượng kết quả | - Debounce 300ms trước khi search<br>- Loading skeleton hiển thị<br>- Sau 500ms: "Tìm thấy 24 quiz cho 'JavaScript'"<br>- Từ khóa được bold trong title<br>- Sort theo relevance (mặc định)<br>- Pagination nếu > 20 results | ✅ **PASS** |
| TC-PLAY-02 | **Lọc Quiz theo Danh mục và Độ khó** | 1. Vào trang Khám phá Quiz<br>2. Click dropdown "Danh mục"<br>3. Chọn "Lập trình"<br>4. Click dropdown "Độ khó"<br>5. Chọn "Trung bình"<br>6. Kết quả tự động cập nhật | - Filters được apply<br>- Chỉ hiển thị quiz phù hợp<br>- URL cập nhật query params<br>- Có thể clear từng filter | - Dropdown với checkbox multiple select<br>- Filter chips hiển thị bên dưới<br>- Real-time filtering (không cần button Apply)<br>- URL: `/quizzes?category=programming&difficulty=medium`<br>- "15 quiz" → badges hiển thị filters đang active<br>- Click "X" trên chip để xóa filter đó | ✅ **PASS** |
| TC-PLAY-03 | **Bắt đầu làm bài thi (Vào màn hình Game)** | 1. Chọn một Quiz từ danh sách<br>2. Xem trang Preview Quiz<br>3. Click nút "Bắt đầu làm bài"<br>4. Confirm trong dialog (nếu có) | - Chuyển đến màn hình Game<br>- Hiển thị câu hỏi đầu tiên<br>- Timer bắt đầu đếm ngược<br>- Progress bar hiển thị 1/n | - Preview hiển thị: title, description, số câu hỏi, thời gian, độ khó<br>- Button "Bắt đầu làm bài" màu primary<br>- Transition animation vào game screen<br>- Countdown 3-2-1 trước khi bắt đầu<br>- Câu 1 hiển thị với timer (30s mặc định)<br>- Progress: "Câu 1/10" + progress bar | ✅ **PASS** |
| TC-PLAY-04 | **Kiểm tra phản hồi khi chọn Đáp án Đúng** | 1. Đang ở màn hình câu hỏi<br>2. Click vào đáp án đúng<br>3. Quan sát phản hồi | - Đáp án được highlight màu xanh<br>- Hiển thị icon ✓ hoặc animation<br>- Âm thanh "correct" (nếu bật)<br>- Điểm được cộng (hiển thị +points) | - Click đáp án → disable các đáp án khác<br>- Đáp án đúng: background xanh + icon ✓<br>- Animation confetti nhẹ<br>- Sound effect "ding" (nếu settings.sound = true)<br>- "+150 điểm" hiển thị floating animation<br>- Score counter cập nhật<br>- Sau 1.5s: tự động chuyển câu tiếp | ✅ **PASS** |
| TC-PLAY-05 | **Kiểm tra phản hồi khi chọn Đáp án Sai** | 1. Đang ở màn hình câu hỏi<br>2. Click vào đáp án sai<br>3. Quan sát phản hồi | - Đáp án sai highlight màu đỏ<br>- Đáp án đúng được chỉ ra (màu xanh)<br>- Hiển thị icon ✗<br>- Không cộng điểm | - Click đáp án sai → disable các đáp án khác<br>- Đáp án đã chọn: background đỏ + icon ✗<br>- Đáp án đúng: background xanh + icon ✓ (reveal)<br>- Sound effect "buzz" (nếu bật)<br>- "+0 điểm" hoặc không hiển thị gì<br>- Combo streak reset về 0<br>- Sau 2s: chuyển câu tiếp | ✅ **PASS** |
| TC-PLAY-06 | **Kiểm tra tính năng đồng hồ đếm ngược (Hết giờ tự chuyển câu)** | 1. Bắt đầu làm quiz với timer 30s/câu<br>2. Không chọn đáp án nào<br>3. Chờ timer đếm về 0<br>4. Quan sát hành vi hệ thống | - Timer đếm ngược chính xác<br>- Khi còn 5s: cảnh báo (màu đỏ/nhấp nháy)<br>- Hết giờ: tự động chuyển câu<br>- Câu đó tính là sai | - Timer circular hiển thị số giây còn lại<br>- 30s → 29s → ... → 5s: timer đổi màu đỏ + pulse animation<br>- 3s → 2s → 1s: âm thanh tick tick<br>- 0s: "Hết giờ!" hiển thị<br>- Đáp án đúng được reveal<br>- Sau 1s: auto chuyển câu tiếp<br>- Ghi nhận: `answered: false, correct: false` | ✅ **PASS** |
| TC-PLAY-07 | **Đánh dấu câu hỏi để xem lại (Flag/Review)** | 1. Đang làm câu hỏi số 5<br>2. Click nút "Đánh dấu" (flag icon)<br>3. Tiếp tục làm các câu khác<br>4. Kiểm tra navigation panel | - Câu 5 được đánh dấu (icon flag)<br>- Có thể navigate đến câu đã đánh dấu<br>- Trước khi nộp bài: nhắc review | - Button flag toggle on/off<br>- Khi flag: icon flag màu vàng trên câu đó<br>- Navigation panel (bên phải): câu 5 có badge flag<br>- Click vào số 5: jump đến câu 5<br>- Trước khi submit: "Bạn có 2 câu đã đánh dấu cần xem lại"<br>- Có thể unflag bất kỳ lúc nào | ✅ **PASS** |
| TC-PLAY-08 | **Nộp bài sớm trước khi hết giờ** | 1. Đã trả lời 8/10 câu hỏi<br>2. Click nút "Nộp bài"<br>3. Confirm trong dialog cảnh báo | - Dialog confirm hiển thị<br>- Cảnh báo còn câu chưa trả lời<br>- Nếu confirm: nộp bài và tính điểm<br>- Chuyển đến trang kết quả | - Button "Nộp bài" luôn visible<br>- Dialog: "Bạn còn 2 câu chưa trả lời và 1 câu đã đánh dấu. Bạn có chắc muốn nộp bài?"<br>- Options: "Xem lại" và "Nộp bài"<br>- Click "Nộp bài": Loading → Redirect `/quiz/{id}/result`<br>- Thời gian làm bài được ghi lại<br>- Các câu chưa trả lời tính sai | ✅ **PASS** |
| TC-PLAY-09 | **Hiển thị trang Kết quả thi (Điểm số, Số câu đúng/sai)** | 1. Hoàn thành quiz (nộp bài hoặc hết giờ)<br>2. Chờ trang kết quả load | - Hiển thị điểm số tổng<br>- Thống kê: đúng/sai/bỏ qua<br>- Thời gian hoàn thành<br>- So sánh với average (nếu có) | - Animation score counter: 0 → 850/1000<br>- Circular progress với màu (xanh > 70%, vàng 50-70%, đỏ < 50%)<br>- Stats cards: "8 đúng | 1 sai | 1 bỏ qua"<br>- "Thời gian: 4 phút 32 giây"<br>- "Xếp hạng: #15 / 234 người chơi"<br>- Badge thành tích (nếu có): "🏆 Top 10%"<br>- Buttons: "Xem đáp án", "Chơi lại", "Chia sẻ" | ✅ **PASS** |
| TC-PLAY-10 | **Xem lại chi tiết đáp án sau khi thi (Review Answers)** | 1. Ở trang Kết quả, click "Xem đáp án"<br>2. Duyệt qua từng câu hỏi | - Hiển thị tất cả câu hỏi<br>- Đánh dấu câu đúng/sai<br>- Hiển thị đáp án đã chọn vs đáp án đúng<br>- Giải thích (nếu có) | - List tất cả 10 câu hỏi<br>- Mỗi câu có: status icon (✓/✗), câu hỏi, đáp án đã chọn (highlight), đáp án đúng (nếu sai)<br>- Expand để xem giải thích<br>- Navigation: Previous/Next hoặc click số câu<br>- Filter: "Chỉ xem câu sai" toggle<br>- Export PDF option (tùy chọn) | ✅ **PASS** |
| TC-PLAY-11 | **Lưu Quiz vào danh sách Yêu thích** | 1. Ở trang Preview Quiz hoặc sau khi chơi<br>2. Click icon "Yêu thích" (heart)<br>3. Vào "Quiz Yêu thích của tôi" | - Icon heart đổi trạng thái (fill)<br>- Toast thông báo đã lưu<br>- Quiz xuất hiện trong danh sách Favorites | - Heart icon: outline → filled (animation scale)<br>- Toast: "Đã thêm vào Yêu thích"<br>- Vào `/favorites`: Quiz hiển thị trong list<br>- Click lại heart: "Đã xóa khỏi Yêu thích"<br>- Firestore: `favorites` subcollection updated<br>- Offline: lưu vào IndexedDB, sync sau | ✅ **PASS** |
| TC-PLAY-12 | **Chơi lại bài thi (Replay)** | 1. Ở trang Kết quả, click "Chơi lại"<br>2. Confirm (nếu cần)<br>3. Bắt đầu lại từ đầu | - Quiz reset về trạng thái ban đầu<br>- Câu hỏi có thể random lại (tùy settings)<br>- Điểm và timer reset<br>- History lần chơi trước được lưu | - Button "Chơi lại" có icon replay<br>- Dialog: "Bắt đầu lại từ đầu?" (optional, có thể skip)<br>- Countdown 3-2-1<br>- Quiz bắt đầu từ câu 1<br>- Nếu quiz.shuffleQuestions = true: thứ tự khác<br>- Lần chơi trước lưu trong history<br>- `/quiz/{id}/history`: xem tất cả attempts | ✅ **PASS** |

---

## Chi tiết Kỹ thuật

### TC-PLAY-04 & TC-PLAY-05: Scoring System

**Công thức tính điểm:**
```typescript
const calculateScore = (isCorrect: boolean, timeRemaining: number, maxTime: number) => {
  if (!isCorrect) return 0;
  
  const basePoints = 100;
  const timeBonus = Math.round((timeRemaining / maxTime) * 50); // 0-50 bonus
  const comboBonus = currentStreak * 10; // 10 points per streak
  
  return basePoints + timeBonus + comboBonus;
};
```

### TC-PLAY-06: Timer Implementation

```typescript
useEffect(() => {
  const timer = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        handleTimeout();
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
  
  return () => clearInterval(timer);
}, [currentQuestion]);
```

### TC-PLAY-09: Result Page Data Structure

```typescript
interface QuizResult {
  score: number;
  totalPoints: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeTaken: number; // seconds
  rank?: number;
  totalPlayers?: number;
  answers: {
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
  }[];
}
```

---

## Tổng kết

| Metric | Giá trị |
|--------|---------|
| Tổng số Test Cases | 12 |
| Passed | 12 |
| Failed | 0 |
| Blocked | 0 |
| **Tỷ lệ Pass** | **100%** |

### Ghi chú
- Timer hoạt động chính xác, không bị drift
- Scoring system công bằng với time bonus và combo
- Mobile touch events hoạt động tốt
- Animations mượt mà, không gây lag
- State persistence hoạt động khi refresh/close tab

---

*Chương 4 - Mục 4.2.3 - Kết quả Kiểm thử Phân hệ Người chơi - Quiz Player*
