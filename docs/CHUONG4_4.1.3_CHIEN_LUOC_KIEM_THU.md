# 4.1.3. CHIẾN LƯỢC KIỂM THỬ

---

## Tổng quan

Chiến lược kiểm thử của hệ thống QuizTrivia App được xây dựng dựa trên hai phương pháp chính: **Kiểm thử hộp đen (Black-box Testing)** và **Kiểm thử hộp trắng (White-box Testing)**. Sự kết hợp này đảm bảo ứng dụng được kiểm tra toàn diện từ cả góc độ người dùng cuối và góc độ kỹ thuật.

---

## 1. Kiểm thử Hộp đen (Black-box Testing)

### 1.1. Định nghĩa

**Kiểm thử hộp đen** là phương pháp kiểm thử phần mềm mà không cần biết cấu trúc code bên trong. Tester chỉ tập trung vào đầu vào (input) và đầu ra (output) của hệ thống, giống như cách người dùng thực sự sử dụng ứng dụng.

### 1.2. Đặc điểm

```
┌─────────────────────────────────────────────────────────────┐
│                    BLACK-BOX TESTING                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐      ┌───────────────────┐      ┌─────────┐  │
│   │  INPUT  │ ───▶ │  🔲 BLACK BOX 🔲  │ ───▶ │ OUTPUT  │  │
│   │         │      │  (Unknown Code)   │      │         │  │
│   └─────────┘      └───────────────────┘      └─────────┘  │
│                                                             │
│   Tester KHÔNG biết:                                        │
│   - Cấu trúc code bên trong                                │
│   - Thuật toán được sử dụng                                │
│   - Database schema                                         │
│                                                             │
│   Tester CHỈ quan tâm:                                      │
│   - Chức năng hoạt động đúng không?                        │
│   - UI hiển thị đúng không?                                │
│   - Dữ liệu trả về chính xác không?                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3. Các kỹ thuật Black-box Testing áp dụng

#### 1.3.1. Equivalence Partitioning (Phân vùng tương đương)

Chia miền đầu vào thành các nhóm tương đương, chỉ cần test một giá trị đại diện cho mỗi nhóm.

**Ví dụ: Test trường Email đăng ký**

| Partition | Giá trị đại diện | Kết quả mong đợi |
|-----------|------------------|------------------|
| Valid email format | `user@example.com` | ✅ Chấp nhận |
| Missing @ symbol | `userexample.com` | ❌ Lỗi: "Email không hợp lệ" |
| Missing domain | `user@` | ❌ Lỗi: "Email không hợp lệ" |
| Missing local part | `@example.com` | ❌ Lỗi: "Email không hợp lệ" |
| Empty string | `` | ❌ Lỗi: "Email là bắt buộc" |
| Special characters | `user+tag@example.com` | ✅ Chấp nhận |

**Ví dụ: Test trường số câu hỏi (AI Generator)**

| Partition | Giá trị đại diện | Kết quả mong đợi |
|-----------|------------------|------------------|
| Valid range (1-50) | `10` | ✅ Tạo 10 câu hỏi |
| Below minimum | `0` | ❌ Lỗi: "Tối thiểu 1 câu hỏi" |
| Above maximum | `100` | ❌ Lỗi: "Tối đa 50 câu hỏi" |
| Negative number | `-5` | ❌ Lỗi: "Số không hợp lệ" |
| Non-integer | `5.5` | ❌ Lỗi hoặc làm tròn xuống 5 |
| Non-numeric | `abc` | ❌ Lỗi: "Vui lòng nhập số" |

#### 1.3.2. Boundary Value Analysis (Phân tích giá trị biên)

Test các giá trị ở ranh giới của miền đầu vào - nơi thường xảy ra lỗi nhất.

**Ví dụ: Test Password (6-128 ký tự)**

| Test Case | Giá trị | Độ dài | Kết quả mong đợi |
|-----------|---------|--------|------------------|
| Below minimum | `12345` | 5 | ❌ Lỗi: "Mật khẩu tối thiểu 6 ký tự" |
| At minimum | `123456` | 6 | ✅ Chấp nhận |
| Just above minimum | `1234567` | 7 | ✅ Chấp nhận |
| Just below maximum | `a` × 127 | 127 | ✅ Chấp nhận |
| At maximum | `a` × 128 | 128 | ✅ Chấp nhận |
| Above maximum | `a` × 129 | 129 | ❌ Lỗi: "Mật khẩu tối đa 128 ký tự" |

**Ví dụ: Test Quiz Duration (1-180 phút)**

| Test Case | Giá trị | Kết quả mong đợi |
|-----------|---------|------------------|
| Below minimum | 0 phút | ❌ Lỗi |
| At minimum | 1 phút | ✅ Chấp nhận |
| Normal value | 30 phút | ✅ Chấp nhận |
| At maximum | 180 phút | ✅ Chấp nhận |
| Above maximum | 181 phút | ❌ Lỗi |

#### 1.3.3. Decision Table Testing (Bảng quyết định)

Áp dụng cho các tình huống có nhiều điều kiện kết hợp.

**Ví dụ: Quyền tạo Quiz**

| Điều kiện | R1 | R2 | R3 | R4 | R5 |
|-----------|----|----|----|----|-------|
| Đã đăng nhập? | ❌ | ✅ | ✅ | ✅ | ✅ |
| Role = Creator/Admin? | - | ❌ | ✅ | ✅ | ✅ |
| Email đã verify? | - | - | ❌ | ✅ | ✅ |
| Quiz limit chưa đạt? | - | - | - | ❌ | ✅ |
| **Kết quả** | Redirect Login | Không có nút tạo | Yêu cầu verify | Thông báo limit | ✅ Tạo Quiz |

**Ví dụ: Truy cập Quiz**

| Điều kiện | R1 | R2 | R3 | R4 | R5 |
|-----------|----|----|----|----|-------|
| Quiz tồn tại? | ❌ | ✅ | ✅ | ✅ | ✅ |
| Quiz đã approved? | - | ❌ | ✅ | ✅ | ✅ |
| Quiz có password? | - | - | ❌ | ✅ | ✅ |
| User là owner? | - | - | - | ✅ | ❌ |
| **Kết quả** | 404 Page | Ẩn với user thường | Cho phép | Cho phép | Yêu cầu password |

#### 1.3.4. State Transition Testing (Kiểm thử chuyển trạng thái)

Test các trạng thái của hệ thống và chuyển đổi giữa chúng.

**Ví dụ: Quiz Status Workflow**

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUIZ STATUS WORKFLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐    Submit     ┌──────────┐                       │
│   │  DRAFT   │ ────────────▶ │ PENDING  │                       │
│   └──────────┘               └──────────┘                       │
│        │                          │                              │
│        │ Edit                     │ Admin Review                 │
│        ▼                          ▼                              │
│   ┌──────────┐    Approve   ┌──────────┐                        │
│   │  DRAFT   │ ◀─────────── │ APPROVED │                        │
│   └──────────┘              └──────────┘                        │
│        │                          │                              │
│        │                          │ Unpublish                    │
│        │                          ▼                              │
│        │     Reject         ┌──────────┐                        │
│        └──────────────────▶ │ REJECTED │                        │
│                             └──────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Test Cases cho State Transitions:**

| # | Trạng thái hiện tại | Action | Trạng thái mới | Ai thực hiện |
|---|---------------------|--------|----------------|--------------|
| 1 | Draft | Submit for Review | Pending | Creator |
| 2 | Draft | Edit | Draft | Creator |
| 3 | Draft | Delete | (Xóa) | Creator |
| 4 | Pending | Approve | Approved | Admin |
| 5 | Pending | Reject | Rejected | Admin |
| 6 | Pending | Cancel | Draft | Creator |
| 7 | Approved | Unpublish | Draft | Creator/Admin |
| 8 | Rejected | Edit & Resubmit | Pending | Creator |

**Ví dụ: Multiplayer Room Status**

```
┌─────────────────────────────────────────────────────────────────┐
│                 MULTIPLAYER ROOM STATUS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Create Room                                                    │
│       │                                                          │
│       ▼                                                          │
│   ┌──────────┐   All Ready   ┌──────────┐   Questions Done      │
│   │ WAITING  │ ────────────▶ │ PLAYING  │ ─────────────────▶    │
│   └──────────┘               └──────────┘                        │
│       │                          │                    │          │
│       │ Host Leave               │ Pause              ▼          │
│       ▼                          ▼              ┌──────────┐     │
│   ┌──────────┐              ┌──────────┐        │ FINISHED │     │
│   │ CLOSED   │              │  PAUSED  │        └──────────┘     │
│   └──────────┘              └──────────┘                         │
│                                  │                               │
│                                  │ Resume                        │
│                                  ▼                               │
│                             ┌──────────┐                         │
│                             │ PLAYING  │                         │
│                             └──────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 1.3.5. Use Case Testing

Test theo các kịch bản sử dụng thực tế của người dùng.

**Use Case: Người dùng làm Quiz**

```
Actor: User (đã đăng nhập)
Precondition: Quiz đã approved và public

Main Flow:
1. User truy cập trang Quiz List
2. User chọn một quiz
3. Hệ thống hiển thị Quiz Preview Page
4. User click "Start Quiz"
5. [Nếu có password] User nhập password
6. Hệ thống bắt đầu đếm ngược
7. User trả lời từng câu hỏi
8. Hệ thống hiển thị kết quả
9. User xem giải thích đáp án (optional)
10. Hệ thống lưu kết quả vào Leaderboard

Alternative Flow:
- 5a. Password sai → Hiển thị lỗi, cho nhập lại
- 7a. Hết thời gian → Auto-submit câu đang làm
- 7b. User reload trang → Khôi phục trạng thái từ localStorage
```

### 1.4. Các loại Black-box Test trong dự án

#### 1.4.1. Functional Testing

Test các chức năng của ứng dụng hoạt động đúng theo yêu cầu.

**Ví dụ Test Cases:**

| ID | Chức năng | Mô tả Test | Expected Result |
|----|-----------|------------|-----------------|
| FT-01 | Đăng ký | Đăng ký với email hợp lệ | Tạo account thành công |
| FT-02 | Đăng nhập | Đăng nhập đúng credentials | Redirect dashboard |
| FT-03 | Tạo Quiz | Tạo quiz với 5 câu hỏi | Quiz được lưu vào Firestore |
| FT-04 | AI Generator | Tạo 10 câu về "JavaScript" | 10 câu hỏi được sinh ra |
| FT-05 | Làm Quiz | Hoàn thành quiz 10 câu | Hiển thị điểm và giải thích |
| FT-06 | Multiplayer | Tạo phòng và mời bạn | 2 người cùng chơi |

#### 1.4.2. UI/UX Testing

Test giao diện người dùng và trải nghiệm sử dụng.

**Checklist UI Testing:**

- [ ] Layout responsive trên các breakpoints (sm, md, lg, xl)
- [ ] Buttons có hover/active states
- [ ] Form fields có focus states
- [ ] Error messages hiển thị rõ ràng
- [ ] Loading states khi fetch data
- [ ] Toast notifications xuất hiện đúng vị trí
- [ ] Modal dialogs đóng đúng cách
- [ ] Navigation breadcrumb chính xác
- [ ] Dark mode (nếu có) hiển thị đúng

#### 1.4.3. Usability Testing

Test tính dễ sử dụng của ứng dụng.

**Tiêu chí đánh giá:**

| Tiêu chí | Mô tả | Phương pháp đo |
|----------|-------|----------------|
| **Learnability** | Người dùng mới học sử dụng nhanh không? | Time to first task completion |
| **Efficiency** | Người dùng quen hoàn thành task nhanh không? | Time per task |
| **Memorability** | Quay lại sau thời gian vẫn dùng được? | Error rate after break |
| **Errors** | Người dùng mắc ít lỗi không? | Error frequency |
| **Satisfaction** | Người dùng hài lòng không? | Survey/Rating |

#### 1.4.4. Regression Testing

Test lại các chức năng cũ sau khi có thay đổi code.

**Regression Test Suite:**

```
📁 Regression Tests
├── 🔐 Authentication
│   ├── Login with email
│   ├── Login with Google
│   ├── Logout
│   └── Password reset
├── 📝 Quiz CRUD
│   ├── Create quiz
│   ├── Edit quiz
│   ├── Delete quiz
│   └── View quiz
├── 🎮 Quiz Player
│   ├── Start quiz
│   ├── Answer question
│   ├── Timer countdown
│   └── Submit results
├── 👥 Multiplayer
│   ├── Create room
│   ├── Join room
│   └── Real-time sync
└── 📴 Offline Mode
    ├── Download quiz
    ├── Play offline
    └── Sync when online
```

---

## 2. Kiểm thử Hộp trắng (White-box Testing)

### 2.1. Định nghĩa

**Kiểm thử hộp trắng** là phương pháp kiểm thử dựa trên cấu trúc code bên trong. Tester cần hiểu biết về implementation để thiết kế test cases nhằm đảm bảo tất cả code paths được thực thi.

### 2.2. Đặc điểm

```
┌─────────────────────────────────────────────────────────────┐
│                    WHITE-BOX TESTING                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐      ┌───────────────────┐      ┌─────────┐  │
│   │  INPUT  │ ───▶ │  🔳 WHITE BOX 🔳  │ ───▶ │ OUTPUT  │  │
│   │         │      │  (Visible Code)   │      │         │  │
│   └─────────┘      └───────────────────┘      └─────────┘  │
│                           │                                 │
│                    ┌──────┴──────┐                         │
│                    │             │                         │
│              ┌─────▼─────┐ ┌─────▼─────┐                   │
│              │   if()    │ │  else()   │                   │
│              │  branch   │ │  branch   │                   │
│              └───────────┘ └───────────┘                   │
│                                                             │
│   Tester CẦN biết:                                          │
│   - Cấu trúc code (if/else, loops, functions)              │
│   - Thuật toán và logic                                    │
│   - Database queries                                        │
│   - API contracts                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3. Các kỹ thuật White-box Testing áp dụng

#### 2.3.1. Statement Coverage

Đảm bảo mọi statement (dòng code) đều được thực thi ít nhất 1 lần.

**Ví dụ: Hàm tính điểm Quiz**

```typescript
// src/features/quiz/utils/scoring.ts

export function calculateScore({
  isCorrect,
  basePoints,
  timeSpent,
  timeLimit,
  streak = 0
}: ScoreParams): ScoreResult {
  // Statement 1: Return 0 if incorrect
  if (!isCorrect) {
    return { points: 0, bonus: 0, streak: 0 };  // Line 10
  }

  // Statement 2: Calculate time bonus
  const timeRemaining = timeLimit - timeSpent;  // Line 14
  const timeBonus = Math.floor(              // Line 15
    (timeRemaining / timeLimit) * basePoints * 0.5
  );

  // Statement 3: Calculate streak bonus
  let streakBonus = 0;                       // Line 20
  if (streak >= 2) {                         // Line 21
    streakBonus = Math.min(streak * 10, 50); // Line 22
  }

  // Statement 4: Sum up
  const totalPoints = basePoints + timeBonus + streakBonus; // Line 26
  
  return {                                   // Line 28
    points: totalPoints,
    bonus: timeBonus + streakBonus,
    streak: streak + 1
  };
}
```

**Test Cases cho Statement Coverage:**

| Test | isCorrect | streak | Statements Covered |
|------|-----------|--------|-------------------|
| TC1 | false | 0 | Line 10 |
| TC2 | true | 0 | Lines 14, 15, 20, 21 (false), 26, 28 |
| TC3 | true | 3 | Lines 14, 15, 20, 21 (true), 22, 26, 28 |

**Coverage: 100% statements**

#### 2.3.2. Branch Coverage

Đảm bảo mọi nhánh của các điều kiện (if/else, switch) đều được thực thi.

**Ví dụ: Hàm kiểm tra quyền truy cập Quiz**

```typescript
// src/features/quiz/utils/permissions.ts

export function canAccessQuiz(
  quiz: Quiz,
  user: User | null,
  providedPassword?: string
): AccessResult {
  // Branch 1: Quiz không tồn tại
  if (!quiz) {
    return { allowed: false, reason: 'QUIZ_NOT_FOUND' };
  }

  // Branch 2: Quiz chưa approved
  if (quiz.status !== 'approved') {
    // Sub-branch 2a: User là owner
    if (user?.uid === quiz.createdBy) {
      return { allowed: true, reason: 'OWNER_ACCESS' };
    }
    // Sub-branch 2b: User là admin
    if (user?.role === 'admin') {
      return { allowed: true, reason: 'ADMIN_ACCESS' };
    }
    return { allowed: false, reason: 'QUIZ_NOT_APPROVED' };
  }

  // Branch 3: Quiz có password
  if (quiz.isPasswordProtected) {
    // Sub-branch 3a: User là owner (không cần password)
    if (user?.uid === quiz.createdBy) {
      return { allowed: true, reason: 'OWNER_ACCESS' };
    }
    // Sub-branch 3b: Không có password
    if (!providedPassword) {
      return { allowed: false, reason: 'PASSWORD_REQUIRED' };
    }
    // Sub-branch 3c: Password đúng
    if (verifyPassword(providedPassword, quiz.password)) {
      return { allowed: true, reason: 'PASSWORD_VALID' };
    }
    // Sub-branch 3d: Password sai
    return { allowed: false, reason: 'PASSWORD_INVALID' };
  }

  // Branch 4: Quiz public
  return { allowed: true, reason: 'PUBLIC_ACCESS' };
}
```

**Test Cases cho Branch Coverage:**

| # | quiz | user | password | Expected | Branch |
|---|------|------|----------|----------|--------|
| 1 | null | - | - | NOT_FOUND | B1 |
| 2 | pending | owner | - | OWNER_ACCESS | B2a |
| 3 | pending | admin | - | ADMIN_ACCESS | B2b |
| 4 | pending | other | - | NOT_APPROVED | B2-else |
| 5 | approved+pwd | owner | - | OWNER_ACCESS | B3a |
| 6 | approved+pwd | other | null | PASSWORD_REQUIRED | B3b |
| 7 | approved+pwd | other | correct | PASSWORD_VALID | B3c |
| 8 | approved+pwd | other | wrong | PASSWORD_INVALID | B3d |
| 9 | approved | any | - | PUBLIC_ACCESS | B4 |

**Coverage: 100% branches**

#### 2.3.3. Path Coverage

Đảm bảo mọi đường dẫn có thể của code đều được thực thi.

**Ví dụ: Multiplayer Answer Validation**

```typescript
// src/features/multiplayer/services/gameEngine.ts

export async function validateAnswer(
  roomId: string,
  playerId: string,
  questionId: string,
  answer: number,
  timestamp: number
): Promise<ValidationResult> {
  // Path element 1: Check room exists
  const room = await getRoom(roomId);
  if (!room) {
    return { valid: false, error: 'ROOM_NOT_FOUND' }; // P1
  }

  // Path element 2: Check game in progress
  if (room.status !== 'playing') {
    return { valid: false, error: 'GAME_NOT_ACTIVE' }; // P2
  }

  // Path element 3: Check player in room
  const player = room.players[playerId];
  if (!player) {
    return { valid: false, error: 'PLAYER_NOT_IN_ROOM' }; // P3
  }

  // Path element 4: Check question matches current
  if (questionId !== room.currentQuestion.id) {
    return { valid: false, error: 'WRONG_QUESTION' }; // P4
  }

  // Path element 5: Check not already answered
  if (player.hasAnswered[questionId]) {
    return { valid: false, error: 'ALREADY_ANSWERED' }; // P5
  }

  // Path element 6: Check time limit
  const questionStart = room.questionStartTime;
  const timeLimit = room.settings.timePerQuestion * 1000;
  if (timestamp - questionStart > timeLimit) {
    return { valid: false, error: 'TIME_EXPIRED' }; // P6
  }

  // Path element 7: Success path
  const isCorrect = room.currentQuestion.correctAnswer === answer;
  return { 
    valid: true, 
    isCorrect,
    points: calculatePoints(isCorrect, timestamp - questionStart)
  }; // P7
}
```

**Paths và Test Cases:**

```
Tổng số paths: 7 (có thể nhiều hơn nếu tính combinations)

Path 1: room=null → ROOM_NOT_FOUND
Path 2: room.status≠playing → GAME_NOT_ACTIVE
Path 3: player not found → PLAYER_NOT_IN_ROOM
Path 4: wrong questionId → WRONG_QUESTION
Path 5: already answered → ALREADY_ANSWERED
Path 6: time exceeded → TIME_EXPIRED
Path 7: all valid → Success with points
```

#### 2.3.4. Code Review

Review code thủ công để phát hiện vấn đề về:

**Checklist Code Review:**

```markdown
## Security
- [ ] Input validation đầy đủ
- [ ] SQL/NoSQL injection prevention
- [ ] XSS protection (DOMPurify)
- [ ] Authentication/Authorization checks
- [ ] Sensitive data không log ra console

## Performance
- [ ] Không có N+1 query problems
- [ ] Proper indexing cho Firestore queries
- [ ] Memoization cho expensive computations
- [ ] Lazy loading cho components
- [ ] Image/asset optimization

## Code Quality
- [ ] No unused imports/variables
- [ ] Proper TypeScript types (no `any`)
- [ ] Error handling đầy đủ
- [ ] Async/await handled correctly
- [ ] No memory leaks (cleanup effects)

## Architecture
- [ ] Single Responsibility Principle
- [ ] Components không quá lớn (< 300 lines)
- [ ] Proper separation of concerns
- [ ] Reusable hooks for shared logic
```

#### 2.3.5. Algorithm Review

Review các thuật toán quan trọng trong hệ thống.

**Thuật toán 1: RAG Search (Chatbot)**

```typescript
// Review: Hybrid Search Algorithm
async function hybridSearch(query: string): Promise<SearchResult[]> {
  // Vector Search (Semantic)
  const vectorResults = await vectorSearch(query, { topK: 10 });
  
  // BM25 Search (Keyword)
  const bm25Results = await bm25Search(query, { topK: 10 });
  
  // Reciprocal Rank Fusion
  const combined = reciprocalRankFusion(vectorResults, bm25Results, {
    vectorWeight: 0.6,
    bm25Weight: 0.4,
    k: 60  // Smoothing constant
  });
  
  // AI Reranking
  const reranked = await aiRerank(combined.slice(0, 10), query);
  
  return reranked;
}

/* Review Points:
 * 1. vectorWeight + bm25Weight = 1.0 ✅
 * 2. topK reasonable (10) ✅
 * 3. k=60 standard for RRF ✅
 * 4. Rerank only top 10 (cost efficient) ✅
 */
```

**Thuật toán 2: Real-time Leaderboard**

```typescript
// Review: Leaderboard Update Algorithm
function updateLeaderboard(
  players: Player[],
  newScore: { playerId: string; points: number }
): Player[] {
  // O(n) update
  const updated = players.map(p => 
    p.id === newScore.playerId 
      ? { ...p, score: p.score + newScore.points }
      : p
  );
  
  // O(n log n) sort
  updated.sort((a, b) => b.score - a.score);
  
  // O(n) rank assignment
  return updated.map((p, index) => ({
    ...p,
    rank: index + 1
  }));
}

/* Review Points:
 * 1. Total complexity: O(n log n) - acceptable for n < 100 ✅
 * 2. For larger rooms, consider incremental sort
 * 3. Rank ties not handled (same score = different rank) ⚠️
 */
```

### 2.4. Unit Test Coverage Analysis

```typescript
// Jest Coverage Report Example

File                        | % Stmts | % Branch | % Funcs | % Lines |
----------------------------|---------|----------|---------|---------|
src/features/quiz/          |         |          |         |         |
  utils/scoring.ts          |   95.2  |   88.5   |  100.0  |   94.7  |
  utils/permissions.ts      |   89.3  |   82.1   |   90.0  |   88.9  |
  services/quizService.ts   |   78.4  |   71.2   |   85.0  |   77.8  |
src/features/multiplayer/   |         |          |         |         |
  services/gameEngine.ts    |   82.1  |   75.3   |   88.9  |   81.5  |
  utils/rateLimiter.ts      |   91.7  |   87.5   |   95.0  |   91.2  |
src/features/auth/          |         |          |         |         |
  services/authService.ts   |   85.6  |   79.8   |   91.7  |   84.9  |
----------------------------|---------|----------|---------|---------|
All files                   |   82.3  |   76.4   |   88.5  |   81.7  |
```

---

## 3. Kết hợp Black-box và White-box Testing

### 3.1. Ma trận Test Coverage

| Chức năng | Black-box | White-box | Tổng hợp |
|-----------|-----------|-----------|----------|
| Authentication | Functional Test | Unit Test + Code Review | ✅ Đầy đủ |
| Quiz CRUD | UI Test + Usability | Unit Test + DB Review | ✅ Đầy đủ |
| AI Generator | Functional Test | Algorithm Review | ✅ Đầy đủ |
| Quiz Player | Functional + State | Unit Test + Path Coverage | ✅ Đầy đủ |
| Multiplayer | E2E Test + State | Unit Test + Race Condition Review | ✅ Đầy đủ |
| Offline/PWA | Network Throttle Test | Service Worker Review | ✅ Đầy đủ |

### 3.2. Test Pyramid

```
                    ┌───────────────┐
                    │    E2E Tests  │  ← Black-box (ít nhất)
                    │   (Cypress)   │     ~10% effort
                    ├───────────────┤
                    │               │
                    │  Integration  │  ← Hybrid
                    │    Tests      │     ~30% effort
                    │   (RTL)       │
                    ├───────────────┤
                    │               │
                    │               │
                    │  Unit Tests   │  ← White-box (nhiều nhất)
                    │    (Jest)     │     ~60% effort
                    │               │
                    │               │
                    └───────────────┘
```

---

## 4. Bảng Tổng hợp Chiến lược

| Phương pháp | Kỹ thuật | Công cụ | Đối tượng test |
|-------------|----------|---------|----------------|
| **Black-box** | Equivalence Partitioning | Manual Testing | Input validation |
| **Black-box** | Boundary Value Analysis | Manual Testing | Limits, ranges |
| **Black-box** | Decision Table | Manual Testing | Business rules |
| **Black-box** | State Transition | Manual + RTL | Workflows |
| **Black-box** | Use Case Testing | E2E Tools | User scenarios |
| **White-box** | Statement Coverage | Jest | All code lines |
| **White-box** | Branch Coverage | Jest | If/else branches |
| **White-box** | Path Coverage | Jest | Execution paths |
| **White-box** | Code Review | Manual | Security, quality |
| **White-box** | Algorithm Review | Manual | Core algorithms |

---

## Kết luận

Chiến lược kiểm thử của QuizTrivia App kết hợp hai phương pháp:

1. **Black-box Testing**: Đảm bảo ứng dụng hoạt động đúng từ góc nhìn người dùng, không cần quan tâm implementation
2. **White-box Testing**: Đảm bảo code quality, coverage, và xử lý edge cases đầy đủ

Sự kết hợp này giúp phát hiện lỗi ở nhiều tầng khác nhau, từ UI/UX đến business logic và database operations, đảm bảo chất lượng tổng thể của hệ thống.

---

*Chương 4 - Mục 4.1.3 - Chiến lược Kiểm thử*
