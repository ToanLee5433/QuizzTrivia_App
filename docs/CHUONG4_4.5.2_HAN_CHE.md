# 4.5.2. CÁC HẠN CHẾ TỒN TẠI

---

## Tổng quan

Phần này phân tích các hạn chế và điểm yếu của QuizTrivia App được phát hiện trong quá trình kiểm thử. Mục đích là nhận diện rõ ràng các vấn đề để có kế hoạch cải thiện trong tương lai.

---

## 1. Hạn chế về Hiệu năng

### 1.1. Mobile Performance

```
┌─────────────────────────────────────────────────────────────────┐
│              MOBILE PERFORMANCE ISSUES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Page              Desktop    Mobile (4G)   Gap                 │
│   ════              ═══════    ═══════════   ═══                 │
│   Landing           94/100     78/100        -16 points         │
│   Quiz List         89/100     72/100        -17 points         │
│   Quiz Player       91/100     80/100        -11 points         │
│   Dashboard         87/100     68/100        -19 points ⚠️      │
│   Admin Panel       82/100     58/100        -24 points ❌      │
│                                                                  │
│   Root Causes:                                                   │
│   • Large JavaScript bundle (450KB uncompressed)                 │
│   • Heavy chart rendering (Recharts)                             │
│   • Multiple Firebase SDK initializations                        │
│   • Non-optimized images                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Impact Level: HIGH**

| Issue | Current | Target | Priority |
|-------|---------|--------|----------|
| LCP on Mobile | 2.4-5.2s | < 2.5s | High |
| TBT on Mobile | 320-680ms | < 200ms | High |
| CLS on Admin | 0.15 | < 0.1 | Medium |

### 1.2. Admin Panel Performance

| Problem | Description | Impact |
|---------|-------------|--------|
| **Large Data Tables** | 1000+ rows load slowly | UX degradation |
| **Real-time Listeners** | Multiple listeners active | Memory leak risk |
| **Chart Rendering** | Recharts heavy on data | TBT spike |
| **No Virtual Scrolling** | All items rendered | Performance hit |

**Recommendation:** Implement virtual scrolling, pagination, debounced listeners

### 1.3. AI Generation Response Time

```
┌─────────────────────────────────────────────────────────────────┐
│              AI GENERATION BOTTLENECK                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Current Flow:                                                  │
│                                                                  │
│   User Request                                                   │
│       │                                                          │
│       ▼ (100ms)                                                  │
│   Cloud Function Cold Start ──▶ 1-3 seconds                     │
│       │                                                          │
│       ▼ (50ms)                                                   │
│   Gemini API Call ──▶ 3-8 seconds                               │
│       │                                                          │
│       ▼ (100ms)                                                  │
│   Response Parsing                                               │
│       │                                                          │
│       ▼                                                          │
│   Total: 4-12 seconds ⚠️                                        │
│                                                                  │
│   Target: < 5 seconds                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Impact Level: MEDIUM**

---

## 2. Hạn chế về Tính năng

### 2.1. Không có Push Notifications

| Feature | Status | Impact |
|---------|--------|--------|
| New Quiz Notification | ❌ Not implemented | User engagement |
| Multiplayer Invite | ❌ Not implemented | Convenience |
| Reminder to Study | ❌ Not implemented | Retention |
| Admin Alerts | ❌ Not implemented | Operations |

**Technical Reason:** Firebase Cloud Messaging requires additional setup and service worker configuration.

### 2.2. Limited Analytics

| Current | Missing | Importance |
|---------|---------|------------|
| Basic page views | User journey tracking | High |
| Quiz attempts | Learning analytics | High |
| Simple stats | A/B testing | Medium |
| | Funnel analysis | Medium |
| | Cohort analysis | Low |

### 2.3. No Export Functionality

| Feature | Status |
|---------|--------|
| Export Quiz to PDF | ❌ |
| Export Results to Excel | ❌ |
| Print Quiz | ❌ |
| Export Analytics Report | ❌ |

**Impact Level: MEDIUM** - Users cannot easily share or archive content

### 2.4. Limited Question Type Customization

| Limitation | Description |
|------------|-------------|
| Fixed scoring | Cannot customize points per question type |
| No partial credit | All-or-nothing for most types |
| Limited feedback | Cannot add custom feedback per answer |
| No branching | Linear question flow only |

---

## 3. Hạn chế về Scalability

### 3.1. Gemini API Rate Limits

```
┌─────────────────────────────────────────────────────────────────┐
│              RATE LIMITING ISSUES                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Tier           Requests/Minute    Daily Limit                  │
│   ════           ═══════════════    ═══════════                  │
│   Free           60 RPM             1,440/day                    │
│   Pay-as-you-go  360 RPM            Unlimited*                   │
│                                                                  │
│   Current Usage (Peak):                                          │
│   • 100 concurrent teachers creating quizzes                     │
│   • ~100 requests in 10 minutes                                  │
│   • Free tier: 40% rate limited ⚠️                              │
│                                                                  │
│   Impact:                                                        │
│   • Users must wait in queue                                     │
│   • 25% requests fail during peak                                │
│   • Poor user experience                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Mitigation:** Upgrade to pay-as-you-go, implement request queuing

### 3.2. Firebase Free Tier Constraints

| Service | Free Limit | Current Usage | Risk |
|---------|------------|---------------|------|
| Firestore Reads | 50k/day | 45k/day | ⚠️ High |
| Firestore Writes | 20k/day | 8k/day | Low |
| Storage | 5 GB | 2 GB | Low |
| Bandwidth | 10 GB/mo | 6 GB/mo | Medium |

**Impact:** Must upgrade to Blaze plan before scaling

### 3.3. Multiplayer Room Limits

| Constraint | Current | Recommended |
|------------|---------|-------------|
| Players per room | 100 max | 50 optimal |
| Concurrent rooms | Unlimited | ~500 tested |
| Message frequency | 10/sec | Debounce needed |

**Issue:** > 50 players per room causes noticeable latency increase

---

## 4. Hạn chế về UX/UI

### 4.1. Quiz Creator Complexity

```
┌─────────────────────────────────────────────────────────────────┐
│              QUIZ CREATOR UX ISSUES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Pain Points:                                                   │
│                                                                  │
│   1. Learning Curve                                              │
│      • 11 question types → overwhelming for new users            │
│      • Many options per question type                            │
│      • No guided tour/onboarding                                 │
│                                                                  │
│   2. Mobile Editing                                              │
│      • Drag-and-drop difficult on touch                          │
│      • Small touch targets                                       │
│      • No mobile-optimized editor                                │
│                                                                  │
│   3. Bulk Operations                                             │
│      • Cannot reorder multiple questions                         │
│      • No bulk delete                                            │
│      • Copy/paste between quizzes missing                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2. Accessibility Gaps

| WCAG Criterion | Status | Issue |
|----------------|--------|-------|
| 2.4.6 Headings | ⚠️ | Some pages missing h1 |
| 1.4.11 Non-text Contrast | ⚠️ | Some icons low contrast |
| 2.5.5 Target Size | ⚠️ | Mobile touch targets < 44px |
| 4.1.3 Status Messages | ❌ | Toast not announced to screen readers |

### 4.3. Error Message Quality

| Current | Ideal |
|---------|-------|
| "Error occurred" | "Unable to save quiz. Please check your internet connection and try again." |
| "Invalid input" | "Email format is invalid. Please enter a valid email address." |
| "Request failed" | "Server is busy. Your request has been queued. Estimated wait: 30 seconds." |

---

## 5. Hạn chế về Bảo mật

### 5.1. Missing Security Features

| Feature | Status | Risk Level |
|---------|--------|------------|
| 2FA/MFA | ❌ Not implemented | Medium |
| Rate limiting (client) | ⚠️ Basic only | Medium |
| IP blocking | ❌ Not implemented | Low |
| Audit logs | ⚠️ Limited | Medium |
| Data encryption at rest | ❌ Firebase default only | Low |

### 5.2. Potential Vulnerabilities

| Area | Issue | Mitigation |
|------|-------|------------|
| Quiz Cheating | Client-side timer | Server-side validation needed |
| Score Manipulation | Client calculates score | Server recalculation |
| API Abuse | No client rate limit | Implement throttling |

---

## 6. Hạn chế về Testing

### 6.1. Test Coverage Gaps

```
┌─────────────────────────────────────────────────────────────────┐
│              TEST COVERAGE ANALYSIS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Area                    Coverage    Status                     │
│   ════                    ════════    ══════                     │
│   Unit Tests              ~75%        Good                       │
│   Integration Tests       ~40%        ⚠️ Needs improvement       │
│   E2E Tests               ~30%        ⚠️ Needs improvement       │
│   Visual Regression       ~20%        ❌ Insufficient            │
│   Load Testing            ~10%        ❌ Insufficient            │
│   Security Testing        ~15%        ❌ Insufficient            │
│                                                                  │
│   Missing Test Scenarios:                                        │
│   • Edge cases in multiplayer                                    │
│   • Offline sync conflicts                                       │
│   • Concurrent user scenarios                                    │
│   • Browser compatibility                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2. No Automated Visual Testing

| Issue | Impact |
|-------|--------|
| No Chromatic/Percy | UI regressions undetected |
| Manual visual review | Time-consuming |
| Cross-browser gaps | Inconsistent rendering |

---

## 7. Hạn chế về Infrastructure

### 7.1. Single Region Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│              LATENCY BY REGION                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Region                  Latency to US-Central                  │
│   ══════                  ═════════════════════                  │
│   Vietnam (target)        ~180-250ms                             │
│   Singapore               ~150-200ms                             │
│   Japan                   ~120-170ms                             │
│   Europe                  ~100-150ms                             │
│   US East                 ~30-50ms                               │
│   US West                 ~20-40ms                               │
│                                                                  │
│   Issue: Firestore in US-Central                                 │
│   Impact: Higher latency for APAC users                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2. No CDN for Dynamic Content

| Content Type | Current | Optimal |
|--------------|---------|---------|
| Static assets | ✅ CDN (Firebase Hosting) | ✅ |
| API responses | ❌ Direct to origin | Should cache |
| Images | ✅ Firebase Storage CDN | ✅ |
| Real-time | ❌ Single region | Multi-region |

---

## 8. Bảng Tổng hợp Hạn chế

### 8.1. Summary by Severity

| Severity | Count | Examples |
|----------|-------|----------|
| **Critical** | 0 | - |
| **High** | 4 | Mobile performance, AI rate limit, Free tier limits, Test coverage |
| **Medium** | 8 | No push notifications, Limited analytics, Single region, Security gaps |
| **Low** | 5 | Export features, Visual testing, MFA, Audit logs |

### 8.2. Impact Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│              LIMITATION IMPACT MATRIX                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                        Business Impact                           │
│                    Low    Medium    High                         │
│                     │       │        │                           │
│   Technical    High ┼───────┼────────┼                           │
│   Effort            │       │   1    │ 1. Mobile Performance     │
│                     │       │        │                           │
│              Medium ┼───────┼────────┼                           │
│                     │   4   │   2    │ 2. AI Rate Limit          │
│                     │       │   3    │ 3. Free Tier              │
│   Technical    Low  ┼───────┼────────┼ 4. Push Notifications     │
│   Effort            │   5   │        │ 5. Export Features        │
│                     │       │        │                           │
│                                                                  │
│   Priority: Focus on quadrant [High Impact, Medium Effort]       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Mitigation Summary

| Limitation | Short-term Fix | Long-term Solution |
|------------|----------------|-------------------|
| Mobile Performance | Lazy load, image compress | Code splitting, virtual lists |
| AI Rate Limit | Queue system | Upgrade tier, cache responses |
| Free Tier | Monitor closely | Upgrade to Blaze |
| Push Notifications | - | Implement FCM |
| Single Region | - | Multi-region deployment |
| Test Coverage | Prioritize critical paths | Full test automation |

---

## Kết luận

### Tóm tắt Hạn chế Chính

1. **Performance trên Mobile** cần cải thiện (68/100 → 80/100 target)
2. **AI Generation** bị giới hạn bởi rate limits
3. **Free Tier Firebase** sắp đạt ngưỡng
4. **Testing Coverage** chưa đủ cho production scale
5. **Single Region** gây latency cho users Việt Nam

### Đánh giá Tổng thể

Các hạn chế đều có giải pháp khả thi và không ảnh hưởng đến core functionality. Hệ thống vẫn hoạt động ổn định cho quy mô hiện tại (~500 concurrent users). Cần ưu tiên giải quyết các vấn đề HIGH severity trước khi scale lên.

---

*Chương 4 - Mục 4.5.2 - Các Hạn chế Tồn tại*
