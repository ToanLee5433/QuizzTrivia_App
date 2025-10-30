# 🛠️ FIX HTML RENDERING GUIDE

## Vấn Đề

Hiện tượng `<p><p>` (thẻ HTML hiện nguyên dạng) do:
1. **HTML bị escape**: `&lt;p&gt;` hiện ra màn hình
2. **Bọc thẻ lặp**: `<p>{description}</p>` khi description đã là HTML
3. **Format không nhất quán**: DB lưu HTML nhưng render như text

## Giải Pháp Đã Implement

### 1. ✅ Tạo Utility Functions
**File**: `src/utils/htmlUtils.ts`

```typescript
import { sanitizeHTML, renderSafeHTML, htmlToPlainText } from '@/utils/htmlUtils';

// Render HTML safely
const html = renderSafeHTML(description); 
// → { __html: sanitized_content }

// Convert HTML to plain text (for CSV export)
const text = htmlToPlainText(description);

// Check if content is HTML
const isHtmlContent = isHTML(description);
```

### 2. ✅ Tạo SafeHTML Component
**File**: `src/shared/components/ui/SafeHTML.tsx`

```tsx
import SafeHTML from '@/shared/components/ui/SafeHTML';

// Usage
<SafeHTML content={quiz.description} className="text-gray-600" />
<SafeHTML content={question.explanation} as="span" />
<SafeHTML content={resource.description} as="p" className="mb-4" />
```

### 3. ✅ Update RichTextViewer
**File**: `src/shared/components/ui/RichTextViewer.tsx`

Đã update để dùng `renderSafeHTML()` internally.

## Cách Fix Code

### ❌ SAI - Render trực tiếp (HTML bị escape hoặc lặp thẻ)

```tsx
// SAI: Escape HTML
<p>{quiz.description}</p>

// SAI: Bọc thẻ lặp nếu description đã là HTML
<p className="text-gray-600">{quiz.description}</p>

// SAI: Không sanitize, nguy hiểm XSS
<div dangerouslySetInnerHTML={{ __html: description }} />
```

### ✅ ĐÚNG - Dùng SafeHTML hoặc RichTextViewer

```tsx
// ĐÚNG: Dùng SafeHTML
<SafeHTML content={quiz.description} className="text-gray-600" />

// ĐÚNG: Dùng RichTextViewer cho content dài
<RichTextViewer content={quiz.description} />

// ĐÚNG: Render safe với custom element
<SafeHTML content={question.explanation} as="span" className="text-blue-700" />
```

## Checklist Fix

### Files Cần Fix (Priority)

#### High Priority - Quiz Display
- [ ] `src/features/quiz/components/QuizCard.tsx`
  - Line 171: `<p>{quiz.description}</p>`
  - Line 332: `{quiz.description}`
  
- [ ] `src/features/quiz/pages/QuizPreviewPage.tsx`
  - Line 295: `<p>{resource.description}</p>`
  
- [ ] `src/features/quiz/pages/LeaderboardPage.tsx`
  - Line 540: `<p>{quiz.description}</p>`

#### High Priority - Question Explanations
- [ ] `src/features/quiz/pages/ResultPage.tsx`
  - Line 480: `<span>{question.explanation}</span>`
  
- [ ] `src/features/quiz/pages/ResultPage/components/AnswerReview.tsx`
  - Line 189: `<span>{question.explanation}</span>`
  
- [ ] `src/features/multiplayer/components/MultiplayerQuiz.tsx`
  - Line 583: `<p>{questionResults.explanation}</p>`
  - Line 1062: `{questionResults.explanation}`

#### Medium Priority - Admin & Create
- [ ] `src/features/admin/pages/AdminDashboard.tsx`
  - Line 502: `{quiz.description}`
  - Line 638: `{category.description}`
  
- [ ] `src/features/admin/pages/AdminQuizManagement.tsx`
  - Line 786: `<p>{quiz.description}</p>`
  - Line 994: `<p>{previewQuiz.description}</p>`
  - Line 1041: `<p>{resource.description}</p>`
  
- [ ] `src/features/quiz/pages/CreateQuizPage/components/ReviewStep.tsx`
  - Line 133: `<p>{resource.description}</p>`
  - Line 251: `<p>{q.explanation}</p>`

#### Low Priority - Other Components
- [ ] `src/features/quiz/pages/LearningMaterialsPage.tsx`
- [ ] `src/features/quiz/pages/MyQuizzesPage.tsx`
- [ ] `src/shared/components/PopularQuizzesRanking.tsx`
- [ ] `src/features/quiz/components/QuestionEditor.tsx`

## Quy Trình Fix 1 File

### Bước 1: Thêm Import
```tsx
import SafeHTML from '../../../shared/components/ui/SafeHTML';
// hoặc
import SafeHTML from '@/shared/components/ui/SafeHTML';
```

### Bước 2: Tìm & Thay Thế
```tsx
// TÌM:
<p className="text-gray-600">{quiz.description}</p>

// THAY BẰNG:
<SafeHTML content={quiz.description} className="text-gray-600" as="p" />
```

### Bước 3: Test
```bash
npm run build    # Check compile errors
npm run dev      # Visual test
```

## Best Practices

### 1. **Lưu DB Đúng Định Dạng**
```typescript
// ✅ ĐÚNG: Lưu HTML thô
await updateDoc(quizRef, {
  description: '<p>Mô tả quiz</p><p>Đoạn 2</p>'
});

// ❌ SAI: Double stringify
await updateDoc(quizRef, {
  description: JSON.stringify('<p>...</p>') // → Escape thừa
});
```

### 2. **Export Plain Text**
```typescript
import { htmlToPlainText } from '@/utils/htmlUtils';

// For CSV/PDF export
const plainDesc = htmlToPlainText(quiz.description);
```

### 3. **Không Bọc Thẻ Thừa**
```tsx
// ❌ SAI: Bọc lặp
<div>
  <p><SafeHTML content={description} /></p>  <!-- Double <p> -->
</div>

// ✅ ĐÚNG: SafeHTML tự xử lý
<div>
  <SafeHTML content={description} />
</div>
```

### 4. **CSS cho Rich Text**
```css
/* Đã có sẵn trong RichTextViewer */
.prose p { margin-bottom: 0.5em; }
.prose ul { margin-left: 1.5em; }
.prose strong { font-weight: 600; }
```

## Testing Checklist

- [ ] HTML content hiển thị đúng format (bold, lists, etc.)
- [ ] Không thấy `<p>`, `&lt;p&gt;` literal
- [ ] Không có thẻ bị bọc lặp
- [ ] XSS protection hoạt động (test với `<script>alert('xss')</script>`)
- [ ] Line breaks đúng
- [ ] Export CSV/PDF ra plain text (không có HTML tags)

## Migration Plan

### Phase 1: Core Components (1 hour)
1. QuizCard
2. ResultPage
3. MultiplayerQuiz

### Phase 2: Admin & Create (1 hour)
4. AdminQuizManagement
5. CreateQuizPage components
6. QuizPreviewPage

### Phase 3: Others (30 mins)
7. Remaining files

### Phase 4: Validation (30 mins)
8. Full app test
9. XSS test
10. Export test

## Sau Khi Hoàn Thành

### Checklist
- [ ] All files use SafeHTML or RichTextViewer
- [ ] No raw `{description}` or `{explanation}`
- [ ] Build success
- [ ] Visual test pass
- [ ] XSS test pass

### Documentation
Update README.md:
```md
## Rich Text Handling

This app uses SafeHTML component for all user-generated HTML content:
- Automatic sanitization (XSS protection)
- Consistent rendering across app
- Plain text export support

See `FIX_HTML_RENDERING.md` for details.
```

---

**Created**: 2025-10-30
**Status**: ✅ Utils & Components Ready, Awaiting Migration
**Next**: Start fixing files according to priority list
