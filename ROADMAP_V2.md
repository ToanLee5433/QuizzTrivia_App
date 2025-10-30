# 🚀 QuizTrivia App - Roadmap V2.0

## 📋 TỔNG QUAN ĐỊNH HƯỚNG PHÁT TRIỂN

### ✅ Đã hoàn thiện (V1.0 - Hiện tại)
- ✅ Quiz core system (tạo, chơi, kết quả)
- ✅ Authentication & User management
- ✅ Admin panel với stats
- ✅ AI question generation
- ✅ Multiplayer mode basic (create/join room, real-time sync)
- ✅ Review & Rating system
- ✅ Leaderboard
- ✅ i18n framework (70% coverage)

---

## 🎯 V2.0 - LEARNING-FOCUSED QUIZ PLATFORM

### 1️⃣ **HAI DÒNG SẢN PHẨM NỘI DUNG**

#### 1.1 Quiz kèm tài liệu (Learn→Test) 🎓
**Status**: Backend 80% | UI 20%

**Đã có**:
- ✅ Learning Resources type definitions (`src/features/quiz/types/learning.ts`)
- ✅ Resource types: Video, PDF, Image, Slides, Links
- ✅ Progress tracking service (`src/features/quiz/services/learningService.ts`)
- ✅ Gating logic (3 modes: flexible, recommended, required)
- ✅ Completion validation algorithms
- ✅ Anti-cheating mechanisms

**Cần làm**:
- [ ] **UI Components** (Priority: HIGH)
  - [ ] `LearningMaterialsPage.tsx` - Trang hiển thị tài liệu trước quiz
  - [ ] `VideoViewer.tsx` - Video player với progress tracking
  - [ ] `PDFViewer.tsx` - PDF viewer với page tracking
  - [ ] `ImageSlideshow.tsx` - Carousel ảnh/slides
  - [ ] `LinkResourceViewer.tsx` - Link viewer với confirmation checkbox
  - [ ] `ProgressBar.tsx` - Hiển thị % hoàn thành
  - [ ] `GatingOverlay.tsx` - Lock/Unlock quiz based on completion
  
- [ ] **Integration với Quiz Flow**
  - [ ] Thêm route `/quiz/:id/learn` trước `/quiz/:id/play`
  - [ ] Check gating status trước khi cho phép start quiz
  - [ ] Show required resources nếu chưa đạt ngưỡng
  
- [ ] **Learning Outcomes (LO) System**
  - [ ] Map questions → LO
  - [ ] Map resources → LO
  - [ ] Post-quiz analysis: sai LO nào → gợi ý resource tương ứng
  - [ ] `LOAnalysisPage.tsx` - Phân tích LO sau quiz

**Estimate**: 3-4 days

---

#### 1.2 Quiz-only (Test nhanh) ⚡
**Status**: ✅ Đã hoàn thiện (current quiz system)

**Cần bổ sung**:
- [ ] **Flash Practice Mode** (Priority: MEDIUM)
  - [ ] Bốc ngẫu nhiên 5-10 câu từ quiz pool
  - [ ] Timer tùy chọn (có/không)
  - [ ] Kết quả ngắn gọn
  - [ ] `FlashPracticeModal.tsx`

**Estimate**: 1 day

---

### 2️⃣ **BA CHẾ ĐỘ CHƠI**

#### 2.1 Practice Mode (Solo) 🎯
**Status**: ✅ 90% Complete

**Hiện có**:
- ✅ Solo quiz với timer
- ✅ Kết quả chi tiết
- ✅ Review answers

**Cần cải thiện**:
- [ ] Show explanation ngay sau mỗi câu (toggle option)
- [ ] Offline mode với local storage
- [ ] Practice history với analytics

**Estimate**: 1 day

---

#### 2.2 Live Mode (Đồng bộ real-time) 🔴
**Status**: ✅ 85% Complete

**Hiện có**:
- ✅ Create/Join room
- ✅ Real-time sync với Firebase
- ✅ Live scoreboard
- ✅ Timer đồng bộ

**Cần cải thiện**:
- [ ] **Countdown phase** trước khi bắt đầu câu
- [ ] **Results phase** sau mỗi câu (show correct answer + top 3)
- [ ] **Power-ups** (optional):
  - [ ] 50/50 (eliminate 2 wrong answers)
  - [ ] +5s time extension
  - [ ] Hint (cost points)
- [ ] **Streak system** (x2, x3 multiplier)
- [ ] **Room awards**: Fastest, Most accurate, Comeback player
- [ ] **Chat improvements** (emojis, reactions)

**Estimate**: 2-3 days

---

#### 2.3 Async Challenge Mode 🏆
**Status**: 🆕 NEW FEATURE

**Mô tả**: 
- Quiz mở cửa 24-72h
- Người chơi vào bất cứ lúc nào
- Leaderboard cộng dồn theo thời gian
- Kết quả finalize sau khi đóng

**Cần làm**:
- [ ] **Challenge data model**
  ```typescript
  interface Challenge {
    id: string;
    quizId: string;
    startTime: Timestamp;
    endTime: Timestamp;
    status: 'upcoming' | 'active' | 'finished';
    participants: string[]; // userIds
    leaderboard: LeaderboardEntry[];
    settings: {
      attemptsAllowed: number; // 1-2
      timeLimit?: number;
    }
  }
  ```
- [ ] `ChallengePage.tsx` - Landing page for challenges
- [ ] `ChallengeList.tsx` - Browse active/upcoming challenges
- [ ] `ChallengeLeaderboard.tsx` - Real-time leaderboard
- [ ] Background job to close challenges (Firebase Functions)

**Estimate**: 3-4 days

---

### 3️⃣ **TRẢI NGHIỆM & NHỊP ĐỘ**

#### 3.1 Timer System
**Status**: ✅ Basic complete

**Cải thiện**:
- [ ] Flexible timer per mode:
  - Live: 20-60s/question (host configurable)
  - Practice: Optional timer or unlimited
  - Async: Overall time limit (e.g., 30 min for 20 questions)
- [ ] Visual timer với color coding (green→yellow→red)
- [ ] Sound alerts (optional, mute-able)

**Estimate**: 1 day

---

#### 3.2 Power-ups (Optional)
**Status**: 🆕 NEW

**Design**:
- Virtual coins/points system
- Purchase power-ups before quiz or during (cost points)
- Types:
  1. **50/50**: Remove 2 wrong answers (-10 points)
  2. **Time Extension**: +5 seconds (-5 points)
  3. **Hint**: Show hint text (-15 points)

**Implementation**:
- [ ] User coins balance in `users` collection
- [ ] Power-up UI buttons during quiz
- [ ] Deduct coins on use
- [ ] Admin: configure power-up availability per quiz

**Estimate**: 2 days

---

#### 3.3 Checkpoint System
**Status**: 🆕 NEW

**Mô tả**:
- Mỗi 5 câu = 1 checkpoint
- Lưu progress tại checkpoint
- Mất mạng → quay lại từ checkpoint gần nhất

**Implementation**:
- [ ] Save progress every 5 questions to Firestore
- [ ] Resume logic trong quiz state
- [ ] UI: "Resume from Question 11" button

**Estimate**: 1 day

---

### 4️⃣ **CHẤM ĐIỂM & XẾP HẠNG**

#### 4.1 Scoring System
**Status**: ✅ Basic (correct = +10)

**Cải thiện**:
- [ ] **Speed bonus** (Live mode):
  - Answer in first 3s: +5 points
  - Answer in 3-6s: +3 points
  - Answer in 6-9s: +1 point
- [ ] **Streak multiplier**:
  - 3 correct in a row: x2
  - 5 correct in a row: x3
- [ ] **Difficulty bonus**:
  - Easy: +10
  - Medium: +15
  - Hard: +20
- [ ] **Negative scoring** (optional, configurable):
  - Wrong answer: -2 points

**Estimate**: 1 day

---

#### 4.2 Awards & Badges
**Status**: ✅ Basic achievements

**Thêm mới**:
- [ ] **Room-specific awards** (Live mode):
  - 🥇 Fastest Player (lowest average time)
  - 🎯 Most Accurate (highest % correct)
  - 🔥 Comeback King (từ bottom 3 → top 3)
- [ ] **Season awards**:
  - Top 10 mỗi tháng
  - Badges: Bronze, Silver, Gold, Platinum
- [ ] Display awards on profile page

**Estimate**: 2 days

---

### 5️⃣ **CHỐNG GIAN LẬN "VỪA ĐỦ"**

#### 5.1 Live Mode Anti-cheat
**Status**: ✅ Basic (submit window)

**Cải thiện**:
- [ ] Answer submission only accepted during question time
- [ ] Randomize answer order per player
- [ ] Hide correct answer until time expires
- [ ] **Tab tracking** (soft):
  - Detect tab switch (Page Visibility API)
  - Warning after 5s out-of-tab
  - No penalty, just warning
- [ ] One submission per question (no retry)

**Estimate**: 1 day

---

#### 5.2 Async Challenge Anti-cheat
**Status**: 🆕 NEW

**Rules**:
- [ ] Limit attempts: 1-2 per challenge
- [ ] Record attempt start/end timestamps
- [ ] Flag suspicious patterns (e.g., perfect score in unrealistic time)
- [ ] Manual review for flagged attempts

**Estimate**: 1 day

---

### 6️⃣ **OFFLINE-FIRST**

#### 6.1 Caching Strategy
**Status**: ⚠️ Currently disabled

**Implement**:
- [ ] **Service Worker** với workbox
- [ ] Cache quiz data on "Start" button click:
  - 5-10 questions ahead
  - Small images (compress to <100KB)
  - Question text + options
- [ ] Cache learning materials (PDF/images only)
- [ ] Store in IndexedDB for persistence

**Estimate**: 2-3 days

---

#### 6.2 Offline Quiz Mode (Practice only)
**Status**: 🆕 NEW

**Flow**:
1. User starts Practice quiz while online → cache data
2. User goes offline → can continue quiz
3. Save results to local storage
4. When online → sync results to Firestore
5. Prevent duplicate submissions

**Implementation**:
- [ ] Detect online/offline status
- [ ] Local storage for pending results
- [ ] Background sync API
- [ ] Conflict resolution (timestamp-based)

**Estimate**: 2 days

---

### 7️⃣ **ĐIỀU PHỐI PHÒNG LIVE (Operations)**

#### 7.1 Room Management
**Status**: ✅ 80% Complete

**Cải thiện**:
- [ ] **Room settings** (host configurable):
  - Timer per question (20-60s)
  - Number of questions
  - Pass threshold (e.g., 70%)
  - Power-ups enabled/disabled
- [ ] **Countdown before start**: 5s countdown + sync timestamp
- [ ] **Phase management**:
  - Waiting → Countdown → Question → Results → Next Question → Finished
- [ ] **Partial leaderboard display**:
  - Show top 5 + my position
  - Reduce Firebase reads

**Estimate**: 2 days

---

#### 7.2 Post-game Experience
**Status**: ⚠️ Basic

**Cải thiện**:
- [ ] **Victory screen** with animations
- [ ] **Share results** (generate shareable link/image)
- [ ] **Rematch button**
- [ ] **Invite friends** to next room

**Estimate**: 1 day

---

### 8️⃣ **KHO CÂU HỎI & PHIÊN BẢN HÓA**

#### 8.1 Question Bank
**Status**: ✅ Basic tagging

**Cải thiện**:
- [ ] **Advanced tagging**:
  - Subject (Math, Science, History, etc.)
  - Grade level (K-12, University)
  - Bloom's taxonomy (Remember, Understand, Apply, etc.)
  - Learning Outcomes (LO)
- [ ] **Search & Filter** by tags
- [ ] **Question pool** per quiz:
  - Creator selects 50 questions
  - System randomly picks 20 per attempt
  - Ensures variety

**Estimate**: 2 days

---

#### 8.2 Quiz Versioning
**Status**: 🆕 NEW

**Mục đích**: Ensure fairness in Live/Async modes

**Design**:
- [ ] Create snapshot of quiz when room/challenge opens
- [ ] Lock questions for that session
- [ ] Version field in Room/Challenge document
- [ ] Display version number in results

**Estimate**: 1 day

---

#### 8.3 Anti-repetition
**Status**: 🆕 NEW

**Logic**:
- [ ] Track user's quiz history
- [ ] In Practice mode: prioritize unseen questions
- [ ] Algorithm: shuffle unseen → seen (oldest first)

**Estimate**: 1 day

---

### 9️⃣ **PHÂN TÍCH HỌC TẬP (Analytics)**

#### 9.1 Learning Outcome (LO) Map
**Status**: Backend 50%

**Implement**:
- [ ] **LO mapping UI** (Creator/Teacher):
  - Assign 1-3 LOs per question
  - Assign 1-3 LOs per learning resource
- [ ] **Post-quiz LO analysis**:
  - Display: "You got 60% correct in LO: Algebra"
  - Recommend: "Review Video 2 (Algebra basics)"
- [ ] **LO dashboard** for teachers:
  - Which LOs are weak across class
  - Which resources are most effective

**Estimate**: 3 days

---

#### 9.2 Funnel Analysis
**Status**: 🆕 NEW

**Metrics**:
1. View materials → Start quiz: **X%**
2. Start quiz → Complete quiz: **Y%**
3. Complete quiz → Pass threshold: **Z%**

**Implementation**:
- [ ] Track events:
  - `material_viewed`
  - `quiz_started`
  - `quiz_completed`
  - `quiz_passed`
- [ ] Funnel visualization (Chart.js)
- [ ] Admin dashboard page

**Estimate**: 2 days

---

#### 9.3 Class/Group Reports
**Status**: 🆕 NEW (for Teachers)

**Reports**:
- [ ] **Performance summary**:
  - Average score
  - Completion rate
  - Time spent
- [ ] **Difficult questions**:
  - Top 3 questions with lowest correct rate
  - Suggested actions
- [ ] **Individual progress**:
  - Per-student breakdown
  - Weak LOs per student

**Estimate**: 3 days

---

### 🔟 **TỔ CHỨC NỘI DUNG & QUYỀN**

#### 10.1 Role Management
**Status**: ✅ Basic (User, Creator, Admin)

**Thêm vai trò**:
- [ ] **Teacher** role:
  - Can create quizzes
  - Can approve Creator's quizzes
  - Can view class reports
  - Can manage students (assign quizzes)
- [ ] **Student** role:
  - Default role
  - Can take quizzes
  - Can view own reports

**Estimate**: 2 days

---

#### 10.2 Content Workflow
**Status**: ✅ Basic approval

**Cải thiện**:
- [ ] **Draft → Pending → Approved → Published**
- [ ] **Rejection with feedback**:
  - Teacher adds rejection reason
  - Creator can edit and resubmit
- [ ] **Archive** instead of delete
- [ ] **Version control**: Track edits, show diff

**Estimate**: 2 days

---

#### 10.3 Sharing & Privacy
**Status**: ⚠️ Basic

**Options**:
- [ ] **Public**: Anyone can access
- [ ] **Private**: Only within course/class
- [ ] **Link-only**: Access via invite link
- [ ] **Scheduled publish**: Set start/end date

**Estimate**: 1 day

---

### 1️⃣1️⃣ **GAMIFICATION & RETENTION**

#### 11.1 Season System
**Status**: 🆕 NEW

**Design**:
- [ ] Monthly seasons (auto-reset leaderboard)
- [ ] Season badges: Bronze, Silver, Gold, Platinum, Diamond
- [ ] Thresholds:
  - Bronze: 100 points
  - Silver: 500 points
  - Gold: 1500 points
  - Platinum: 5000 points
  - Diamond: 10000 points
- [ ] Display season badge on profile
- [ ] Hall of Fame page (past season winners)

**Estimate**: 2 days

---

#### 11.2 Daily/Weekly Missions
**Status**: 🆕 NEW

**Examples**:
- Complete 1 Practice quiz → +10 coins
- Win 1 Live match → +20 coins
- Get 80% on Math quiz → +50 coins
- Study for 30 mins → +15 coins

**Implementation**:
- [ ] Mission definitions in Firestore
- [ ] Track mission progress
- [ ] Mission UI (modal or sidebar)
- [ ] Reward distribution on completion

**Estimate**: 3 days

---

#### 11.3 Personalized Learning Path
**Status**: 🆕 NEW

**Logic**:
- [ ] Analyze user's weak LOs
- [ ] Recommend next quiz targeting those LOs
- [ ] Show "Recommended for you" section on dashboard
- [ ] Algorithm: weakest LO + unseen quizzes + appropriate difficulty

**Estimate**: 2-3 days

---

### 1️⃣2️⃣ **KHẢ NĂNG MỞ RỘNG (Media Optimization)**

#### 12.1 Video Strategy
**Status**: ✅ YouTube embed

**Improvements**:
- [ ] Track watch duration với YouTube Player API
- [ ] Events: `onPlay`, `onPause`, `onProgress`
- [ ] Store watch percentage in Firestore
- [ ] Optional: Support Vimeo, custom video hosts

**Estimate**: 1 day

---

#### 12.2 PDF/Image Optimization
**Status**: ✅ Firebase Storage + Resize extension

**Improvements**:
- [ ] **Lazy load PDF pages** (load page N when user scrolls to page N-1)
- [ ] **Image compression**:
  - Max width: 1200px
  - Quality: 85%
  - Format: WebP (fallback to JPEG)
- [ ] **CDN**: Use Firebase Storage CDN (already enabled)

**Estimate**: 1 day

---

#### 12.3 Low Bandwidth Mode
**Status**: 🆕 NEW

**Features**:
- [ ] User setting: "Low bandwidth mode"
- [ ] Effects:
  - Disable background images
  - Use SVG icons instead of PNG
  - Limit image size to 200KB max
  - Reduce image quality to 60%
- [ ] Detect slow connection automatically (Network Information API)

**Estimate**: 1 day

---

### 1️⃣3️⃣ **TESTING & ACCEPTANCE CRITERIA**

#### 13.1 Live Mode Performance
**Target**:
- [ ] Support 50-200 concurrent players per room
- [ ] Score update latency: <1s after submission
- [ ] Timer sync: ±500ms across devices

**Testing**:
- [ ] Load testing với Firebase Emulator + artillery.io
- [ ] Real device testing (10+ devices)

**Estimate**: 2 days

---

#### 13.2 Offline Mode
**Target**:
- [ ] Disconnect during Practice → continue seamlessly
- [ ] Reconnect → sync results in <5s
- [ ] No duplicate submissions

**Testing**:
- [ ] Network throttling (Chrome DevTools)
- [ ] Airplane mode testing
- [ ] Edge cases: rapid connect/disconnect

**Estimate**: 1 day

---

#### 13.3 Material Gating
**Target**:
- [ ] Not reached threshold → "Start" button disabled
- [ ] Reached threshold → unlock immediately
- [ ] Progress saved persistently

**Testing**:
- [ ] Test all threshold types (video %, PDF pages, link confirm)
- [ ] Cross-device: start on mobile, continue on desktop

**Estimate**: 1 day

---

#### 13.4 Performance (3G)
**Target**:
- [ ] PDF/Image viewer smooth on 3G
- [ ] 95% UI interactions <200ms (except media loading)

**Testing**:
- [ ] Lighthouse performance audit (target: >90)
- [ ] Real 3G device testing

**Estimate**: 1 day

---

## 📊 TỔNG KẾT ESTIMATE

| Module | Estimate | Priority |
|--------|----------|----------|
| Learning Materials UI | 3-4 days | 🔴 HIGH |
| Flash Practice | 1 day | 🟡 MEDIUM |
| Live Mode Improvements | 2-3 days | 🔴 HIGH |
| Async Challenge Mode | 3-4 days | 🔴 HIGH |
| Timer & Power-ups | 3 days | 🟡 MEDIUM |
| Scoring & Awards | 3 days | 🟢 LOW |
| Anti-cheat | 2 days | 🟡 MEDIUM |
| Offline-first | 4-5 days | 🔴 HIGH |
| Room Management | 3 days | 🟡 MEDIUM |
| Question Bank & Versioning | 4 days | 🟢 LOW |
| LO Analytics | 3 days | 🔴 HIGH |
| Funnel & Reports | 5 days | 🟡 MEDIUM |
| Roles & Workflow | 4 days | 🟡 MEDIUM |
| Gamification | 7 days | 🟢 LOW |
| Media Optimization | 3 days | 🟡 MEDIUM |
| Testing | 4 days | 🔴 HIGH |

**Total estimate**: ~55-65 working days (~2.5-3 months)

---

## 🎯 SPRINT PLAN (Recommended)

### Sprint 1 (2 weeks): **Core Learning Features**
- Learning Materials UI ✅
- LO Analytics ✅
- Material Gating ✅
- Testing

### Sprint 2 (2 weeks): **Multiplayer Enhancements**
- Live Mode improvements ✅
- Async Challenge Mode ✅
- Anti-cheat ✅
- Testing

### Sprint 3 (2 weeks): **Performance & UX**
- Offline-first ✅
- Media optimization ✅
- Low bandwidth mode ✅
- Timer & UI polish ✅

### Sprint 4 (2 weeks): **Content & Analytics**
- Question Bank enhancements ✅
- Funnel & Reports ✅
- Teacher dashboard ✅
- Content workflow ✅

### Sprint 5 (2 weeks): **Gamification & Polish**
- Scoring system ✅
- Awards & badges ✅
- Seasons & missions ✅
- Personalized learning path ✅

### Sprint 6 (2 weeks): **Testing & Launch**
- Comprehensive testing ✅
- Bug fixes ✅
- Performance optimization ✅
- Documentation ✅

---

## 🚀 NEXT ACTIONS

### Immediate (This Week):
1. ✅ Fix remaining build errors
2. ✅ Implement multiplayer save results
3. ✅ Implement review helpful/report
4. [ ] Start Learning Materials UI (highest priority)

### Short-term (Next 2 weeks):
1. [ ] Complete Learning Materials system
2. [ ] Implement LO mapping UI
3. [ ] Async Challenge Mode
4. [ ] Live Mode improvements (power-ups, awards)

### Medium-term (Next month):
1. [ ] Offline-first implementation
2. [ ] Teacher dashboard & reports
3. [ ] Advanced scoring & gamification

---

**Last Updated**: 2025-10-30
**Status**: V2.0 Planning Complete ✅
**Next Review**: After Sprint 1 completion
