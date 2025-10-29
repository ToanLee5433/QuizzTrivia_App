# 📚 Learning Materials System - Documentation

## 🎯 Tổng quan

Hệ thống **Learning Materials** cho phép người học tiếp cận tài liệu (video/PDF/ảnh/link) trước khi làm bài trắc nghiệm, đảm bảo learning outcomes tốt hơn.

---

## 🏗️ Kiến trúc hệ thống

### 1. Data Model

#### **Quiz với Resources**
```typescript
interface Quiz {
  // ... existing fields
  resources?: LearningResource[];  // 🆕 Tài liệu học tập
  learningOutcomes?: LearningOutcome[];  // 🆕 Mục tiêu học tập
  gatingConfig?: GatingConfig;  // 🆕 Cấu hình khóa/mở
}
```

#### **Learning Resource**
```typescript
{
  id: "res_001",
  type: "video",  // video | pdf | image | link | slides
  title: "Giới thiệu React Hooks",
  description: "Video hướng dẫn useState và useEffect",
  url: "https://youtube.com/watch?v=...",
  
  // Yêu cầu
  required: true,  // Bắt buộc xem
  threshold: {
    minWatchPercent: 80,  // Phải xem 80% video
    minWatchSec: 300      // Hoặc tối thiểu 5 phút
  },
  
  // Learning Outcomes
  learningOutcomes: ["LO1", "LO2"],
  
  // Metadata
  duration: 600,  // 10 phút
  estimatedTime: 10,
  whyWatch: "Video này giúp bạn hiểu cách quản lý state trong React"
}
```

#### **Learning Session**
```typescript
userQuizSessions/{quizId}_{userId}: {
  viewedResources: {
    "res_001": {
      completed: true,
      secondsWatched: 480,
      watchPercent: 80,
      completedAt: "2025-10-29T10:30:00Z"
    },
    "res_002": {
      completed: false,
      pagesViewed: [1, 2, 3],
      pageViewTimes: { 1: 2.5, 2: 3.0, 3: 1.8 }
    }
  },
  ready: false,  // Chưa đủ điều kiện làm bài
  completionPercent: 50
}
```

---

## 🎬 User Flow

### Flow 1: Xem tài liệu trước khi làm bài

```
1. User chọn Quiz
   ↓
2. QuizPreviewPage hiển thị nút "📚 Xem tài liệu"
   ├─ Nếu chưa xem required → Button disabled: "🔒 Xem tài liệu để mở khóa"
   └─ Nếu đã xem đủ → Button enabled: "🚀 Bắt đầu làm bài"
   ↓
3. Click "📚 Xem tài liệu" → Navigate to /quiz/{id}/materials
   ↓
4. LearningMaterialsPage
   ├─ Sidebar: Danh sách tài liệu với badges (Bắt buộc/Khuyến nghị)
   ├─ Main: Resource viewer (Video/PDF/Image/Link)
   └─ Progress bar: 2/5 tài liệu bắt buộc ✓
   ↓
5. User xem từng tài liệu
   ├─ Video: Track time, detect tab blur, check speed > 2x
   ├─ PDF: Track pages viewed, time per page ≥ 1.5s
   ├─ Image: Track images viewed, time per image
   └─ Link: Require confirm + mini-check 1-2 MCQ
   ↓
6. Đạt threshold → Resource marked completed ✓
   ↓
7. Tất cả required completed → "🚀 Bắt đầu làm bài" unlocked
   ↓
8. Click "Bắt đầu làm bài" → Navigate to /quiz/{id} (quiz page)
```

### Flow 2: Ôn tập sau khi làm bài

```
1. User hoàn thành quiz → ResultPage
   ↓
2. Phân tích đáp án sai → Match với LOs
   ↓
3. Hiển thị "📖 Ôn tập"
   ├─ "Bạn sai 3/10 câu thuộc LO1 (useState)"
   ├─ "Gợi ý: Xem lại Video 'React Hooks' phút 2:30-5:00"
   └─ Deep link → Jump to specific timestamp
   ↓
4. Click "Xem lại" → Navigate to /quiz/{id}/materials?focus=res_001&t=150
   ↓
5. Video auto-play từ 2:30, highlight phần liên quan
```

---

## 🔧 Implementation Guide

### Step 1: Update Quiz Type

```typescript
// src/features/quiz/types.ts
import { LearningResource, LearningOutcome, GatingConfig } from './types/learning';

export interface Quiz {
  // ... existing fields
  
  // 🆕 Learning Materials
  resources?: LearningResource[];
  learningOutcomes?: LearningOutcome[];
  gatingConfig?: GatingConfig;
}
```

### Step 2: Create LearningMaterialsPage Component

```tsx
// src/features/quiz/pages/LearningMaterialsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { getLearningSession, checkGatingStatus } from '../services/learningService';
import { ResourceViewer } from '../components/learning/ResourceViewer';
import { ResourceSidebar } from '../components/learning/ResourceSidebar';
import { ProgressHeader } from '../components/learning/ProgressHeader';

const LearningMaterialsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [selectedResource, setSelectedResource] = useState<LearningResource | null>(null);
  const [gatingStatus, setGatingStatus] = useState<any>(null);

  // Load quiz & session
  useEffect(() => {
    loadQuizAndSession();
  }, [id, user]);

  // Check gating status
  useEffect(() => {
    if (quiz && user) {
      updateGatingStatus();
    }
  }, [session, quiz]);

  const loadQuizAndSession = async () => {
    // Load quiz from Firestore
    // Load or initialize session
  };

  const updateGatingStatus = async () => {
    const status = await checkGatingStatus(user!.uid, quiz!.id, quiz!.resources || []);
    setGatingStatus(status);
  };

  const handleResourceComplete = async (resourceId: string) => {
    await updateGatingStatus();
    // Move to next resource
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Header */}
      <ProgressHeader 
        progress={gatingStatus}
        onStartQuiz={() => navigate(`/quiz/${id}`)}
      />

      <div className="flex">
        {/* Sidebar */}
        <ResourceSidebar 
          resources={quiz?.resources || []}
          session={session}
          selectedId={selectedResource?.id}
          onSelect={setSelectedResource}
        />

        {/* Main Content */}
        <div className="flex-1 p-8">
          {selectedResource && (
            <ResourceViewer 
              resource={selectedResource}
              progress={session?.viewedResources[selectedResource.id]}
              onComplete={handleResourceComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
};
```

### Step 3: Create Resource Viewers

#### Video Viewer
```tsx
// src/features/quiz/components/learning/VideoViewer.tsx
import React, { useRef, useEffect, useState } from 'react';
import { updateResourceProgress, logLearningEvent } from '../../services/learningService';

const VideoViewer: React.FC<VideoViewerProps> = ({ resource, progress, onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [watchTime, setWatchTime] = useState(progress?.secondsWatched || 0);
  const [isTabActive, setIsTabActive] = useState(true);

  // Track tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabActive(!document.hidden);
      logLearningEvent({
        userId: user.uid,
        quizId: resource.quizId,
        resourceId: resource.id,
        eventType: document.hidden ? 'tab_blur' : 'tab_focus',
        metadata: { timestamp: Date.now() }
      });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Track watch time (only when tab active)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isTabActive && videoRef.current && !videoRef.current.paused) {
        const playbackRate = videoRef.current.playbackRate;
        
        // Only count if playback speed ≤ 2x
        if (playbackRate <= 2) {
          setWatchTime(prev => {
            const newTime = prev + 1;
            const watchPercent = (newTime / resource.duration!) * 100;

            // Update progress every 5 seconds
            if (newTime % 5 === 0) {
              updateResourceProgress(user.uid, resource.quizId, resource.id, {
                secondsWatched: newTime,
                watchPercent,
                lastWatchPosition: videoRef.current!.currentTime
              });
            }

            // Check completion
            if (watchPercent >= (resource.threshold.minWatchPercent || 0)) {
              onComplete(resource.id);
            }

            return newTime;
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTabActive]);

  return (
    <div className="space-y-4">
      <video 
        ref={videoRef}
        src={resource.url}
        controls
        className="w-full rounded-lg shadow-lg"
        onPlay={() => logLearningEvent({ eventType: 'video_play', ... })}
        onPause={() => logLearningEvent({ eventType: 'video_pause', ... })}
      />
      
      {/* Progress */}
      <div className="bg-white p-4 rounded-lg">
        <div className="flex justify-between mb-2">
          <span>Tiến độ xem</span>
          <span>{Math.round((watchTime / resource.duration!) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${(watchTime / resource.duration!) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
```

#### PDF Viewer
```tsx
// src/features/quiz/components/learning/PDFViewer.tsx
import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Use existing pdf.worker.js from public/
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

const PDFViewer: React.FC<PDFViewerProps> = ({ resource, progress, onComplete }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagesViewed, setPagesViewed] = useState<Set<number>>(
    new Set(progress?.pagesViewed || [])
  );
  const [pageStartTime, setPageStartTime] = useState<number>(Date.now());

  // Track page view time
  useEffect(() => {
    const timer = setTimeout(() => {
      // Page viewed for 1.5s → count as "viewed"
      setPagesViewed(prev => {
        const newSet = new Set(prev);
        newSet.add(currentPage);
        
        // Update progress
        updateResourceProgress(user.uid, resource.quizId, resource.id, {
          pagesViewed: Array.from(newSet),
          pageViewTimes: {
            ...progress?.pageViewTimes,
            [currentPage]: (Date.now() - pageStartTime) / 1000
          }
        });

        // Check completion
        if (resource.threshold.mustReachLastPage && currentPage === numPages) {
          onComplete(resource.id);
        } else if (resource.threshold.minPages && newSet.size >= resource.threshold.minPages) {
          onComplete(resource.id);
        }

        return newSet;
      });
    }, 1500);  // 1.5 seconds

    return () => clearTimeout(timer);
  }, [currentPage]);

  // Reset timer when page changes
  useEffect(() => {
    setPageStartTime(Date.now());
  }, [currentPage]);

  return (
    <div className="space-y-4">
      <Document
        file={resource.url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      >
        <Page pageNumber={currentPage} />
      </Document>

      {/* Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg">
        <button 
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => prev - 1)}
        >
          ← Trang trước
        </button>
        
        <span>
          Trang {currentPage} / {numPages}
          <br />
          <small>{pagesViewed.size} trang đã xem</small>
        </span>
        
        <button 
          disabled={currentPage === numPages}
          onClick={() => setCurrentPage(prev => prev + 1)}
        >
          Trang sau →
        </button>
      </div>
    </div>
  );
};
```

---

## 🎨 UI Components Hierarchy

```
LearningMaterialsPage/
├── ProgressHeader
│   ├── Progress Bar (2/5 required)
│   ├── Time Estimate (15 phút còn lại)
│   └── Start Quiz Button (locked/unlocked)
│
├── ResourceSidebar
│   └── ResourceItem[]
│       ├── Icon (🎥/📄/🖼️/🔗)
│       ├── Title
│       ├── Badge (Bắt buộc/Khuyến nghị)
│       ├── Status (✓ Hoàn thành / ⏳ Đang xem / 🔒 Chưa xem)
│       └── Progress (80%)
│
└── ResourceViewer (dynamic)
    ├── VideoViewer
    │   ├── Video Player
    │   ├── Progress Bar
    │   ├── Anti-skip Warning
    │   └── LO Tags
    │
    ├── PDFViewer
    │   ├── PDF Document
    │   ├── Page Navigation
    │   ├── Page Counter
    │   └── Scroll Indicator
    │
    ├── ImageSlideViewer
    │   ├── Image Carousel
    │   ├── Thumbnails
    │   └── Timer per Image
    │
    └── LinkViewer
        ├── Iframe/Redirect
        ├── Confirm Checkbox
        └── Mini-Check Quiz
```

---

## 🔒 Gating Logic

### Mode 1: Strict (Mặc định)
- ❌ **Không thể vào bài** nếu chưa đạt required
- Nút "Bắt đầu" bị disabled
- Hiển thị: "🔒 Xem 2 tài liệu còn lại để mở khóa"

### Mode 2: Soft
- ⚠️ **Có thể vào** nhưng có cảnh báo
- Hiển thị modal: "Bạn chưa xem đủ tài liệu. Điểm có thể thấp hơn."
- Option: "Xem tài liệu" hoặc "Vẫn tiếp tục (-5 điểm)"

### Mode 3: None
- ✅ **Tự do vào bài**
- Chỉ hiển thị khuyến nghị: "💡 Gợi ý: Xem tài liệu để đạt điểm cao hơn"

---

## 📊 Analytics & Insights

### Instructor Dashboard
```tsx
// src/features/admin/pages/LearningAnalyticsDashboard.tsx
<div>
  {/* Resource Completion Stats */}
  <ResourceCompletionChart data={analytics.resourceStats} />
  
  {/* LO Correlation */}
  <LOCorrelationTable data={analytics.loCorrelation} />
  
  {/* Heatmap: Resource x LO */}
  <Heatmap data={analytics.heatmap} />
  
  {/* A/B Test Results */}
  {analytics.abTests && (
    <ABTestResults tests={analytics.abTests} />
  )}
</div>
```

**Insights:**
- 📈 "Video 'React Hooks' có correlation +15% với điểm LO1"
- 📉 "PDF 'Advanced Patterns' completion rate chỉ 40% → Quá dài, nên chia nhỏ"
- 🎯 "Users xem đủ tài liệu có điểm trung bình 85 vs 68 (chưa xem)"

---

## ✅ Testing Checklist

### Video Viewer
- [ ] Track time chính xác (±1s)
- [ ] Tab blur → Dừng track
- [ ] Playback speed > 2x → Không tính
- [ ] Seek back không reset progress
- [ ] Đạt 80% → Mark completed

### PDF Viewer
- [ ] Page view đếm đúng
- [ ] Lướt nhanh < 1.5s → Không tính
- [ ] Tới trang cuối → Completed (nếu mustReachLastPage)
- [ ] Reload page → Giữ progress

### Image Viewer
- [ ] Xem đủ M ảnh → Completed
- [ ] Time per image ≥ threshold
- [ ] Swipe qua lại không duplicate count

### Link Viewer
- [ ] Checkbox "đã đọc" required
- [ ] Mini-check 1-2 MCQ
- [ ] Pass threshold → Completed

### Gating
- [ ] Strict mode: Button disabled
- [ ] Soft mode: Warning modal
- [ ] None mode: Always enabled
- [ ] Reload page → Giữ ready status

### Edge Cases
- [ ] Mất mạng → Cache progress locally
- [ ] Video bị xóa → Fallback message
- [ ] 10 tabs cùng lúc → Chỉ active tab track
- [ ] Mobile → Desktop → Sync progress

---

## 🚀 Deployment Steps

1. **Update Firestore Schema**
```bash
# Add to firestore.rules
match /userQuizSessions/{sessionId} {
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
  allow write: if request.auth != null && request.auth.uid == resource.data.userId;
}

match /learningEvents/{eventId} {
  allow write: if request.auth != null;
  allow read: if request.auth != null;
}
```

2. **Create Firestore Indexes**
```json
{
  "indexes": [
    {
      "collectionGroup": "learningEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

3. **Deploy Frontend**
```bash
npm run build
firebase deploy --only hosting
```

4. **Monitor Performance**
- Firestore reads/writes
- Video bandwidth usage
- PDF loading time
- Session sync latency

---

## 📝 Next Steps

### Phase 1: MVP (Week 1-2)
- ✅ Types & Service (Done)
- [ ] LearningMaterialsPage component
- [ ] Video Viewer với basic tracking
- [ ] Simple gating (strict mode)
- [ ] Integration với QuizPreviewPage

### Phase 2: Full Features (Week 3-4)
- [ ] PDF Viewer với page tracking
- [ ] Image Viewer với carousel
- [ ] Link Viewer với mini-check
- [ ] All gating modes (strict/soft/none)
- [ ] Progress persistence

### Phase 3: Analytics (Week 5-6)
- [ ] Instructor Dashboard
- [ ] LO correlation analysis
- [ ] Heatmap visualization
- [ ] A/B testing framework

### Phase 4: Polish (Week 7-8)
- [ ] Offline support (PWA)
- [ ] Accessibility (A11y)
- [ ] i18n (Internationalization)
- [ ] Performance optimization

---

## 💡 Best Practices

1. **Anti-Cheating (nhẹ nhàng)**
   - Track tab visibility
   - Detect playback speed > 2x
   - Require minimum time per page
   - ❌ Không quá strict → Tôn trọng learner

2. **UX First**
   - Show "Vì sao xem phần này?"
   - Display time estimate
   - Allow skip recommended resources
   - Soft warnings thay vì hard blocks

3. **Performance**
   - Lazy load resources
   - Preload next resource
   - Cache progress locally
   - Debounce Firestore writes

4. **Privacy**
   - Only log necessary events
   - Allow user to download their data
   - Audit log for config changes
   - No sensitive content in logs

---

## 🎉 Summary

**Đã hoàn thành:**
- ✅ Complete type definitions (learning.ts)
- ✅ Full service layer (learningService.ts)
- ✅ Gating logic với 3 modes
- ✅ Progress tracking algorithms
- ✅ Anti-cheating mechanisms
- ✅ Analytics foundation

**Cần implement:**
- 🔨 UI Components (viewers, pages)
- 🔨 Integration với Quiz flow
- 🔨 Admin resource management
- 🔨 Instructor analytics dashboard

**Tài liệu đầy đủ tại:** `LEARNING_MATERIALS_GUIDE.md`

💪 **Ready for development!** Foundation đã vững, bạn có thể bắt đầu build UI components dựa trên service layer này.
