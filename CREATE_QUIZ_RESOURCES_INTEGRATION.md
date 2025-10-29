# 📚 Learning Materials Integration - CreateQuizPage

## 🎯 Tổng quan

Đã tích hợp thành công **Learning Materials** vào **CreateQuizPage**, cho phép creator upload và quản lý tài liệu học tập (video, PDF, ảnh, âm thanh, YouTube link) cho quiz.

---

## ✅ Những gì đã hoàn thành

### 1. **Updated Data Types**

**File:** `src/features/quiz/pages/CreateQuizPage/types.ts`
```typescript
export interface QuizFormData {
  // ... existing fields
  resources?: LearningResource[];  // 🆕 Tài liệu học tập
}
```

### 2. **Updated Constants**

**File:** `src/features/quiz/pages/CreateQuizPage/constants.ts`
```typescript
export const defaultQuiz: QuizFormData = {
  // ... existing fields
  resources: [],  // 🆕 Empty array
};

export const steps = [
  'Thông tin Quiz',
  'Câu hỏi',
  'Tài liệu học tập',  // 🆕 New step
  'Xem lại & Xuất bản',
];
```

### 3. **New ResourcesStep Component**

**File:** `src/features/quiz/pages/CreateQuizPage/components/ResourcesStep.tsx`

**Features:**
- ✅ Upload/add 5 loại tài liệu: Video, PDF, Image, Audio, Link
- ✅ Upload file trực tiếp hoặc nhập URL
- ✅ Set "Bắt buộc" hoặc "Khuyến nghị"
- ✅ Thêm mô tả "Vì sao nên xem?"
- ✅ Ước tính thời gian xem
- ✅ Edit/Delete resources
- ✅ Beautiful modal form UI
- ✅ Real-time validation
- ✅ Upload progress tracking

### 4. **Updated CreateQuizPage**

**File:** `src/features/quiz/pages/CreateQuizPage/index.tsx`

**Changes:**
- ✅ Thêm import `ResourcesStep`
- ✅ Updated validation logic cho 4 steps (0-3)
- ✅ Added step 2: Resources (optional)
- ✅ Render `ResourcesStep` component
- ✅ Pass resources state to ResourcesStep

---

## 🎨 UI/UX Features

### Resources List View

```
┌─────────────────────────────────────────────────┐
│  📚 Tài liệu học tập                [+ Thêm]    │
├─────────────────────────────────────────────────┤
│  🎥 1. Giới thiệu React Hooks  [Bắt buộc]      │
│     Video này giúp bạn hiểu useState...         │
│     🎥 Video  ⏱️ 10 phút  💡 Vì sao...         │
│                                    [✏️] [🗑️]   │
├─────────────────────────────────────────────────┤
│  📄 2. Advanced Patterns  [Khuyến nghị]        │
│     Học các patterns nâng cao...               │
│     📄 PDF  ⏱️ 15 phút                         │
│                                    [✏️] [🗑️]   │
└─────────────────────────────────────────────────┘
```

### Add/Edit Resource Form

```
┌──────────────────────────────────────────────┐
│  Thêm tài liệu mới                      [X]  │
├──────────────────────────────────────────────┤
│                                              │
│  Loại tài liệu *                             │
│  [🎥 Video] [📄 PDF] [🖼️ Ảnh] [🔗 Link]    │
│                                              │
│  Tiêu đề *                                   │
│  [Giới thiệu về React Hooks____________]    │
│                                              │
│  Mô tả                                       │
│  [Video hướng dẫn useState và useEffect...] │
│                                              │
│  Upload file hoặc nhập URL *                 │
│  [Choose File] [No file chosen]              │
│  Hoặc nhập URL:                              │
│  [https://...___________________________]    │
│                                              │
│  ☑️ Bắt buộc xem                             │
│     Học viên phải xem tài liệu này...        │
│                                              │
│  💡 Vì sao nên xem?                          │
│  [Video này giúp bạn hiểu useState...]       │
│                                              │
│  ⏱️ Thời gian ước tính (phút)               │
│  [10]                                        │
│                                              │
│                         [Hủy]  [Thêm]        │
└──────────────────────────────────────────────┘
```

---

## 🔧 How to Use

### For Creators

1. **Navigate to Create Quiz** (`/quiz/create`)
2. **Step 1:** Fill quiz info (title, description, category...)
3. **Step 2:** Add questions
4. **Step 3: 📚 Tài liệu học tập** (NEW!)
   - Click "**+ Thêm tài liệu**"
   - Select resource type (Video/PDF/Image/Link)
   - Upload file OR paste URL
   - Fill in title, description, "why watch"
   - Set "Bắt buộc" if mandatory
   - Add estimated time
   - Click "**Thêm**"
5. **Step 4:** Review and publish

### Supported Resource Types

| Type | Upload | URL | Max Size | Use Case |
|------|--------|-----|----------|----------|
| 🎥 Video | ✅ | ✅ | 50MB | Lecture videos, tutorials |
| 📄 PDF | ✅ | ✅ | 10MB | Documents, slides |
| 🖼️ Image | ✅ | ✅ | 5MB | Infographics, diagrams |
| 🎵 Audio | ✅ | ✅ | 5MB | Podcasts, lectures |
| 🔗 Link | ❌ | ✅ | N/A | YouTube, external web pages |

### YouTube Link Format

```
✅ https://www.youtube.com/watch?v=dQw4w9WgXcQ
✅ https://youtu.be/dQw4w9WgXcQ
✅ https://youtube.com/embed/dQw4w9WgXcQ
```

---

## 📊 Data Flow

```
CreateQuizPage (state: quiz)
    ↓
    ├─ Step 0: QuizInfoStep
    ├─ Step 1: QuestionsStep
    ├─ Step 2: ResourcesStep  🆕
    │   ├─ resources: LearningResource[]
    │   ├─ onResourcesChange: (resources) => setQuiz(...)
    │   └─ Upload file → Firebase Storage → URL
    └─ Step 3: ReviewStep
    
When Submit:
    quiz.resources → Firestore /quizzes/{id}
```

---

## 🎯 Next Steps (Optional Enhancements)

### Phase 1: Basic Gating (Week 1)
- [ ] Update `QuizPreviewPage` to show "📚 Xem tài liệu" button
- [ ] Check if resources exist before showing button
- [ ] Simple navigation to `/quiz/{id}/materials`

### Phase 2: Resource Viewer (Week 2-3)
- [ ] Create `LearningMaterialsPage` component
- [ ] Implement `VideoViewer` với HTML5 video player
- [ ] Implement `PDFViewer` với react-pdf
- [ ] Implement `ImageViewer` với carousel
- [ ] Implement `LinkViewer` với iframe

### Phase 3: Progress Tracking (Week 4)
- [ ] Integrate `learningService.ts`
- [ ] Track view progress in Firestore
- [ ] Show progress bar
- [ ] Unlock "Bắt đầu" button when ready

### Phase 4: Advanced Features (Week 5+)
- [ ] Set thresholds (minWatchPercent, minPages...)
- [ ] Anti-cheating (tab blur, playback speed)
- [ ] Learning Outcomes mapping
- [ ] Analytics dashboard for instructors

---

## 🚀 Example Quiz with Resources

```typescript
const exampleQuiz: Quiz = {
  id: 'quiz_001',
  title: 'React Hooks Advanced',
  description: 'Master useState, useEffect, and custom hooks',
  category: 'programming',
  difficulty: 'medium',
  duration: 30,
  questions: [...],  // 10 questions
  
  // 🆕 Learning Materials
  resources: [
    {
      id: 'res_001',
      type: 'video',
      title: 'Giới thiệu React Hooks',
      description: 'Video hướng dẫn useState và useEffect cơ bản',
      url: 'https://storage.googleapis.com/.../video.mp4',
      required: true,
      threshold: { minWatchPercent: 80 },
      learningOutcomes: ['LO1', 'LO2'],
      estimatedTime: 10,
      whyWatch: 'Video này giúp bạn hiểu cách quản lý state trong React',
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'res_002',
      type: 'pdf',
      title: 'React Hooks Cheat Sheet',
      description: 'Tài liệu tham khảo nhanh',
      url: 'https://storage.googleapis.com/.../cheatsheet.pdf',
      required: false,
      threshold: { minPages: 3 },
      learningOutcomes: ['LO1', 'LO3'],
      estimatedTime: 5,
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'res_003',
      type: 'link',
      title: 'React Hooks Tutorial (YouTube)',
      description: 'Video tutorial từ React team',
      url: 'https://youtube.com/watch?v=abc123',
      required: false,
      threshold: { requireConfirm: true },
      learningOutcomes: ['LO1'],
      estimatedTime: 15,
      order: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  
  createdBy: 'user_123',
  createdAt: new Date(),
  updatedAt: new Date(),
  isPublished: true
};
```

---

## 💡 Best Practices

### For Creators

1. **Keep resources short** (< 15 minutes each)
   - Users prefer bite-sized content
   - Easier to track completion

2. **Use "Bắt buộc" sparingly**
   - Only for essential materials
   - Too many requirements → user frustration

3. **Add "Why watch" explanation**
   - Motivates learners
   - Increases completion rate

4. **Mix resource types**
   - Video for concepts
   - PDF for reference
   - Images for visual learning

5. **Order resources logically**
   - Foundation → Advanced
   - Theory → Practice

### For Developers

1. **File Upload Limits**
   - Video: 50MB (consider compression)
   - PDF: 10MB (optimize PDFs)
   - Images: 5MB (use WebP format)

2. **Storage Organization**
   ```
   Firebase Storage:
   ├─ videos/
   ├─ pdfs/
   ├─ images/
   └─ audios/
   ```

3. **Error Handling**
   - Validate file types
   - Check file sizes
   - Handle upload failures
   - Show user-friendly errors

4. **Performance**
   - Lazy load resources
   - Compress files before upload
   - Use CDN for delivery
   - Cache thumbnails

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **No progress tracking yet**
   - Users can skip resources
   - No gating logic implemented
   - Next phase will add tracking

2. **No thumbnail preview**
   - Videos show icon only
   - Consider adding thumbnails

3. **Limited file type validation**
   - Only basic MIME type check
   - Could be more strict

4. **No batch upload**
   - One file at a time
   - Could add drag-drop multiple

### Workarounds

- For now, resources are **optional**
- Creators can add but users not required to view
- Full gating will come in Phase 2-3

---

## 📝 Code Changes Summary

| File | Changes | Lines Added |
|------|---------|-------------|
| `CreateQuizPage/types.ts` | Added `resources?: LearningResource[]` | +2 |
| `CreateQuizPage/constants.ts` | Added resources step, default value | +3 |
| `CreateQuizPage/index.tsx` | Import ResourcesStep, render step 2, update validation | +15 |
| `ResourcesStep.tsx` | **New component** - Full resource management UI | +450 |
| **TOTAL** | | **~470 lines** |

---

## 🎉 Success Metrics

- ✅ **Build Status:** OK (no errors)
- ✅ **TypeScript:** Fully typed
- ✅ **UI/UX:** Beautiful modal form
- ✅ **Upload:** Firebase Storage integration
- ✅ **Validation:** Real-time feedback
- ✅ **Mobile:** Responsive design

---

## 🔗 Related Documentation

- `LEARNING_MATERIALS_GUIDE.md` - Complete system overview
- `src/features/quiz/types/learning.ts` - Type definitions
- `src/features/quiz/services/learningService.ts` - Service layer

---

## 🚀 Ready to Use!

Creators can now:
1. ✅ Add videos, PDFs, images, audio, YouTube links
2. ✅ Upload files directly or paste URLs
3. ✅ Mark resources as required/recommended
4. ✅ Add descriptions and "why watch"
5. ✅ Edit and delete resources
6. ✅ Reorder resources

**Next:** Implement viewing experience and progress tracking! 🎯
