# 📊 BÁO CÁO I18N - TEXT HARDCODED CÒN LẠI

## Tổng quan

- **Tổng số warnings**: 459 hardcoded texts
- **Trạng thái**: ✅ ESLint i18next warnings đã được BẬT
- **Config**: Đã cấu hình để phát hiện tất cả literal strings trong JSX

## 🎯 Phân loại theo thư mục

### 1. **Quiz Pages** (nhiều nhất)
- `QuizDetailedStats.tsx`: ~70 warnings
- `ResultPage.tsx` và components: ~80 warnings  
- `QuizPage` components: ~30 warnings
- `EditQuizPage.tsx`, `EditQuizPageAdvanced.tsx`: ~40 warnings
- `CreateQuizPage` components: ~10 warnings

### 2. **Shared Components**
- `NotificationCenter.tsx`: 3 warnings
- `QuickReviewSection.tsx`: 6 warnings
- `PopularQuizzesRanking.tsx`: 8 warnings
- `AchievementSystem.tsx`: 2 warnings
- `ErrorBoundary.tsx`: 3 warnings
- `Header.tsx`: 1 warning
- `LanguageSwitcher.tsx`: 1 warning

### 3. **UI Components**
- `ShareLinkModal.tsx`: ~25 warnings
- `AudioPlayer.tsx`: ~5 warnings
- `ImageViewer.tsx`: ~3 warnings
- `PDFViewer.tsx`: ~5 warnings
- `YouTubePlayer.tsx`: ~5 warnings

### 4. **Resource Viewers**
- `PDFViewer.tsx`: ~15 warnings
- `VideoViewer.tsx`: ~15 warnings
- `EmbedViewer.tsx`: ~10 warnings

### 5. **Review System**
- `ReviewForm.tsx`: ~5 warnings
- `ReviewList.tsx`: ~8 warnings

### 6. **Landing & Home**
- `Home.tsx`: ~2 warnings
- `LandingPage.tsx`: ~5 warnings

## 📝 Các loại text cần fix

### Tiếng Việt
- Các label UI: "Quay lại", "Xem tất cả", "Chưa có dữ liệu"
- Thông báo: "Đã xác nhận hoàn thành", "Còn câu hỏi chưa trả lời"
- Stats labels: "Lượt xem", "Điểm trung bình", "Tỷ lệ đạt"
- Form labels: "Tiêu đề Quiz", "Mô tả quiz"

### Tiếng Anh
- UI text: "Back to Quiz List", "Quiz Completed!", "Review Answers"
- Status: "Password", "With Materials", "Correct Answer"
- Actions: "Add Question", "Retake Quiz", "Share Result"

### Emojis và ký tự đặc biệt
- ⚠️, 📚, 📖, ✏️, 💾, 🎯, 🏆, ⏱️, etc.

## 🔧 Cách fix

### Option 1: Fix từng file một (khuyến nghị)
```bash
# Fix file có nhiều warnings nhất trước
npm run fix:i18n QuizDetailedStats.tsx
npm run fix:i18n ResultPage.tsx
# ... tiếp tục với các files khác
```

### Option 2: Fix hàng loạt (cẩn thận!)
```bash
# Sử dụng script aggressive replacer
node scripts/aggressive-i18n-replacer.mjs src/features/quiz/pages
```

### Option 3: Fix thủ công
Đối với mỗi hardcoded string:

1. **Thêm key vào translation files**:
```json
// public/locales/vi/common.json
{
  "quiz": {
    "backToList": "Quay lại My Quizzes",
    "viewAll": "Xem tất cả"
  }
}

// public/locales/en/common.json
{
  "quiz": {
    "backToList": "Back to My Quizzes",
    "viewAll": "View All"
  }
}
```

2. **Thay trong code**:
```tsx
// Trước
<span>Quay lại My Quizzes</span>

// Sau
const { t } = useTranslation();
<span>{t('quiz.backToList')}</span>
```

## 📋 Top files cần ưu tiên fix

1. **QuizDetailedStats.tsx** - 70 warnings - file quan trọng cho stats
2. **ResultPage components** - 80 warnings - user-facing, cần i18n
3. **ShareLinkModal.tsx** - 25 warnings - UI quan trọng
4. **Resource Viewers** - 45 warnings - learning materials
5. **QuizPage components** - 30 warnings - core quiz experience

## ✅ Files đã tích hợp i18n tốt

- Hầu hết admin pages
- Multiplayer components  
- Quiz list và filter components
- Authentication pages
- Profile pages
- Dashboard pages

## 🎯 Mục tiêu

- [ ] Fix tất cả 459 warnings
- [ ] Đảm bảo app hỗ trợ đầy đủ EN/VI
- [ ] Test switching languages
- [ ] Update translation files với đủ keys

## 📊 Progress Tracker

```
Files fixed: 0 / ~60
Warnings fixed: 0 / 459
Progress: ░░░░░░░░░░ 0%
```

---

**Lưu ý**: Các warnings này KHÔNG ảnh hưởng build hoặc functionality, chỉ là để hoàn thiện i18n cho ứng dụng multilingual.
