# 3.2.2. Hiện thực hóa Module Tạo Quiz và Tích hợp AI

> **Phần này trình bày chi tiết việc xây dựng giao diện Quiz Builder, tích hợp Google Gemini AI để tạo câu hỏi tự động, và xử lý dữ liệu đầu ra.**

---

### a) Xây dựng giao diện Quiz Builder (Form Handling)

#### Kiến trúc Quiz Builder

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUIZ BUILDER ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌────────────────────┐                       │
│                    │   CreateQuizPage   │                       │
│                    └─────────┬──────────┘                       │
│                              │                                  │
│        ┌─────────────────────┼─────────────────────┐            │
│        │                     │                     │            │
│        ▼                     ▼                     ▼            │
│  ┌───────────┐        ┌───────────┐        ┌───────────┐        │
│  │ BasicInfo │        │ Questions │        │ Settings  │        │
│  │   Step    │        │   Step    │        │   Step    │        │
│  └───────────┘        └───────────┘        └───────────┘        │
│        │                     │                     │            │
│        └─────────────────────┼─────────────────────┘            │
│                              │                                  │
│                              ▼                                  │
│                    ┌────────────────────┐                       │
│                    │   Quiz Preview     │                       │
│                    └────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Multi-step Form Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUIZ CREATION STEPS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Basic Information                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • Title (required, 3-100 chars)                        │    │
│  │  • Description (optional, max 500 chars)                │    │
│  │  • Category (select from list)                          │    │
│  │  • Difficulty (Easy / Medium / Hard)                    │    │
│  │  • Thumbnail Image (upload or URL)                      │    │
│  │  • Tags (comma separated)                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  Step 2: Questions (Manual or AI Generated)                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Option A: Manual Creation                              │    │
│  │  • Add questions one by one                             │    │
│  │  • 11 question types supported                          │    │
│  │  • Drag & drop reordering                               │    │
│  │                                                         │    │
│  │  Option B: AI Generation                                │    │
│  │  • Enter topic/description                              │    │
│  │  • Select number of questions (5-50)                    │    │
│  │  • Choose question types                                │    │
│  │  • Generate with Gemini AI                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  Step 3: Settings                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • Time limit per question (10-300 seconds)             │    │
│  │  • Passing score (0-100%)                               │    │
│  │  • Shuffle questions (yes/no)                           │    │
│  │  • Shuffle options (yes/no)                             │    │
│  │  • Show correct answers after submit                    │    │
│  │  • Allow retake (yes/no)                                │    │
│  │  • Password protection (optional)                       │    │
│  │  • Public/Private visibility                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  Step 4: Preview & Publish                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • Preview quiz as student                              │    │
│  │  • Save as Draft                                        │    │
│  │  • Submit for Review (pending approval)                 │    │
│  │  • Publish (if auto-approved or admin)                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 11 Loại câu hỏi được hỗ trợ

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUESTION TYPES                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Type          │ Description        │ Scoring              │ │
│  ├────────────────┼────────────────────┼──────────────────────┤ │
│  │ 1. Multiple    │ Single correct     │ All or nothing       │ │
│  │    Choice      │ answer (A/B/C/D)   │                      │ │
│  ├────────────────┼────────────────────┼──────────────────────┤ │
│  │ 2. Checkbox    │ Multiple correct   │ Partial credit       │ │
│  │    (Multi)     │ answers            │ possible             │ │
│  ├────────────────┼────────────────────┼──────────────────────┤ │
│  │ 3. True/False  │ Binary choice      │ All or nothing       │ │
│  │                │                    │                      │ │
│  ├────────────────┼────────────────────┼──────────────────────┤ │
│  │ 4. Fill in     │ Text input         │ Exact match or       │ │
│  │    Blank       │ answer             │ fuzzy matching       │ │
│  ├────────────────┼────────────────────┼──────────────────────┤ │
│  │ 5. Short       │ Free text          │ Keyword matching     │ │
│  │    Answer      │ response           │ or manual grade      │ │
│  ├────────────────┼────────────────────┼──────────────────────┤ │
│  │ 6. Dropdown    │ Select from        │ All or nothing       │ │
│  │                │ dropdown list      │                      │ │
│  ├────────────────┼────────────────────┼──────────────────────┤ │
│  │ 7. Matching    │ Match pairs        │ Per-pair scoring     │ │
│  │                │ (drag & drop)      │                      │ │
│  ├────────────────┼────────────────────┼──────────────────────┤ │
│  │ 8. Ordering    │ Arrange in         │ All correct or       │ │
│  │                │ sequence           │ partial              │ │
│  ├────────────────┼────────────────────┼──────────────────────┤ │
│  │ 9. Image       │ Question with      │ Based on type        │ │
│  │    Based       │ image              │                      │ │
│  ├────────────────┼────────────────────┼──────────────────────┤ │
│  │ 10. Audio      │ Listen and         │ Based on type        │ │
│  │     Based      │ answer             │                      │ │
│  ├────────────────┼────────────────────┼──────────────────────┤ │
│  │ 11. Video      │ Watch and          │ Based on type        │ │
│  │     Based      │ answer             │                      │ │
│  └────────────────┴────────────────────┴──────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Question Editor Component

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUESTION EDITOR UI                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Question Editor                                    [X] │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │  Question Type: [Multiple Choice ▼]                     │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  Question Text *                                │    │    │
│  │  │  ┌───────────────────────────────────────────┐  │    │    │
│  │  │  │ What is the capital of Vietnam?           │  │    │    │
│  │  │  │                                           │  │    │    │
│  │  │  │ [B] [I] [U] [Image] [Code] [Equation]     │  │    │    │
│  │  │  └───────────────────────────────────────────┘  │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  │  Media Attachment: [Upload Image] [Upload Audio]        │    │
│  │                                                         │    │
│  │  Options:                                               │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  ○ A. Hanoi                              [✓]    │    │    │
│  │  │  ○ B. Ho Chi Minh City                   [ ]    │    │    │
│  │  │  ○ C. Da Nang                            [ ]    │    │    │
│  │  │  ○ D. Hue                                [ ]    │    │    │
│  │  │                                  [+ Add Option] │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  │  Points: [10 ▼]    Time Limit: [30s ▼]                  │    │
│  │                                                         │    │
│  │  Explanation (shown after answer):                      │    │
│  │  ┌───────────────────────────────────────────────┐      │    │
│  │  │ Hanoi has been the capital since 1010...      │      │    │
│  │  └───────────────────────────────────────────────┘      │    │
│  │                                                         │    │
│  │  [Cancel]                                  [Save]       │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### b) Lập trình Cloud Functions kết nối Google Gemini AI

#### Cloud Function Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI GENERATION FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Client                Cloud Function              Gemini AI   │
│     │                        │                          │       │
│     │  1. generateQuestions  │                          │       │
│     │────────────────────────>                          │       │
│     │   {topic, count,       │                          │       │
│     │    difficulty, types}  │                          │       │
│     │                        │                          │       │
│     │                        │  2. Validate & Auth      │       │
│     │                        │  Check user quota        │       │
│     │                        │                          │       │
│     │                        │  3. Build Prompt         │       │
│     │                        │──────────────────────────>       │
│     │                        │   System + User prompt   │       │
│     │                        │                          │       │
│     │                        │  4. AI Response          │       │
│     │                        │<──────────────────────────       │
│     │                        │   (streaming or batch)   │       │
│     │                        │                          │       │
│     │                        │  5. Parse & Validate     │       │
│     │                        │  JSON extraction         │       │
│     │                        │                          │       │
│     │  6. Return questions   │                          │       │
│     │<────────────────────────                          │       │
│     │   {questions: [...]}   │                          │       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Gemini AI Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│                    GEMINI AI SETUP                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Model Selection:                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Model: gemini-2.5-flash-lite                           │    │
│  │                                                         │    │
│  │  Why this model?                                        │    │
│  │  ├── ✅ Fast response time (~2-5 seconds)               │    │
│  │  ├── ✅ Low cost per request                            │    │
│  │  ├── ✅ Good at structured output (JSON)                │    │
│  │  ├── ✅ Supports Vietnamese well                        │    │
│  │  └── ✅ 1M token context window                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  API Configuration:                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  // Environment: Firebase Secrets                       │    │
│  │  GOOGLE_AI_API_KEY=AIza...                              │    │
│  │                                                         │    │
│  │  // Cloud Function setup                                │    │
│  │  functions.runWith({                                    │    │
│  │    secrets: ['GOOGLE_AI_API_KEY'],                      │    │
│  │    memory: '512MB',                                     │    │
│  │    timeoutSeconds: 120,                                 │    │
│  │    maxInstances: 20                                     │    │
│  │  })                                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Prompt Engineering

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROMPT STRUCTURE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  System Prompt:                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Bạn là một chuyên gia giáo dục, tạo câu hỏi trắc       │    │
│  │  nghiệm chất lượng cao. Yêu cầu:                        │    │
│  │                                                         │    │
│  │  1. Câu hỏi rõ ràng, không mơ hồ                        │    │
│  │  2. Các đáp án có độ dài tương đương                    │    │
│  │  3. Có 1 đáp án đúng duy nhất                           │    │
│  │  4. Đáp án nhiễu phải hợp lý                            │    │
│  │  5. Tránh câu hỏi trick hoặc đánh đố                    │    │
│  │                                                         │    │
│  │  Trả về JSON array với format:                          │    │
│  │  [{                                                     │    │
│  │    "question": "Nội dung câu hỏi",                      │    │
│  │    "type": "multiple",                                  │    │
│  │    "options": ["A", "B", "C", "D"],                     │    │
│  │    "correctAnswer": 0,                                  │    │
│  │    "explanation": "Giải thích đáp án"                   │    │
│  │  }]                                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  User Prompt Template:                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Tạo {count} câu hỏi về chủ đề "{topic}"                │    │
│  │                                                         │    │
│  │  Yêu cầu:                                               │    │
│  │  - Độ khó: {difficulty}                                 │    │
│  │  - Loại câu hỏi: {questionTypes}                        │    │
│  │  - Ngôn ngữ: Tiếng Việt                                 │    │
│  │                                                         │    │
│  │  Nội dung tham khảo (nếu có):                           │    │
│  │  {context}                                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Rate Limiting & Quotas

```
┌─────────────────────────────────────────────────────────────────┐
│                    RATE LIMITING                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Quotas:                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Role          │ Requests/Day │ Questions/Request       │    │
│  ├────────────────┼──────────────┼─────────────────────────┤    │
│  │ Free User      │     10       │        20               │    │
│  │ Creator        │     50       │        50               │    │
│  │ Admin          │   Unlimited  │        100              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Implementation (RTDB-based):                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  // Check quota before generation                       │    │
│  │  const userQuota = await rtdb                           │    │
│  │    .ref(`quotas/ai/${userId}`)                          │    │
│  │    .once('value');                                      │    │
│  │                                                         │    │
│  │  if (userQuota.val()?.count >= MAX_DAILY_REQUESTS) {    │    │
│  │    throw new HttpsError('resource-exhausted',           │    │
│  │      'Daily quota exceeded');                           │    │
│  │  }                                                      │    │
│  │                                                         │    │
│  │  // Increment after successful generation               │    │
│  │  await rtdb.ref(`quotas/ai/${userId}`).update({         │    │
│  │    count: increment(1),                                 │    │
│  │    lastRequest: serverTimestamp()                       │    │
│  │  });                                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### c) Xử lý và chuẩn hóa dữ liệu đầu ra từ AI (JSON Parsing)

#### JSON Extraction Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    JSON PARSING FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   AI Response (raw text)                                        │
│        │                                                        │
│        ▼                                                        │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Step 1: Extract JSON from markdown                     │   │
│   │  - Remove ```json ... ``` wrappers                      │   │
│   │  - Handle partial responses                             │   │
│   └────────────────────┬────────────────────────────────────┘   │
│                        │                                        │
│                        ▼                                        │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Step 2: JSON.parse with error handling                 │   │
│   │  - Try strict parse first                               │   │
│   │  - Fallback to lenient parse (fix common issues)        │   │
│   └────────────────────┬────────────────────────────────────┘   │
│                        │                                        │
│                        ▼                                        │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Step 3: Schema Validation                              │   │
│   │  - Check required fields                                │   │
│   │  - Validate data types                                  │   │
│   │  - Validate correctAnswer range                         │   │
│   └────────────────────┬────────────────────────────────────┘   │
│                        │                                        │
│                        ▼                                        │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Step 4: Normalization                                  │   │
│   │  - Add missing optional fields                          │   │
│   │  - Generate unique IDs                                  │   │
│   │  - Set default points/timeLimit                         │   │
│   └────────────────────┬────────────────────────────────────┘   │
│                        │                                        │
│                        ▼                                        │
│   Validated Question Array                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Validation Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUESTION SCHEMA                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Required Fields:                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  {                                                      │    │
│  │    "question": string (required, min 10 chars),         │    │
│  │    "type": enum ["multiple", "checkbox", "truefalse",   │    │
│  │             "fill", "short", "dropdown", "matching",    │    │
│  │             "ordering", "image", "audio", "video"],     │    │
│  │    "options": string[] (min 2 for multiple choice),     │    │
│  │    "correctAnswer": number | number[] | string          │    │
│  │  }                                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Optional Fields with Defaults:                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  {                                                      │    │
│  │    "id": string (auto-generated UUID),                  │    │
│  │    "points": number (default: 10),                      │    │
│  │    "timeLimit": number (default: 30),                   │    │
│  │    "explanation": string (default: ""),                 │    │
│  │    "media": { type, url } (default: null),              │    │
│  │    "hint": string (default: "")                         │    │
│  │  }                                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Validation Rules:                                              │
│  ├── correctAnswer must be valid index for options array        │
│  ├── For checkbox: correctAnswer is array of indices            │
│  ├── For truefalse: options must be ["True", "False"]           │
│  ├── For matching: options format [{left, right}]               │
│  └── For ordering: correctAnswer is ordered array               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Error Handling & Retry

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING STRATEGY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AI Generation Errors:                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Error Type        │ Action                             │    │
│  ├────────────────────┼────────────────────────────────────┤    │
│  │ Rate Limited       │ Retry after delay (exp. backoff)   │    │
│  │ Invalid JSON       │ Retry with stricter prompt         │    │
│  │ Incomplete         │ Retry for remaining questions      │    │
│  │ Timeout            │ Return partial results             │    │
│  │ Content Filtered   │ Notify user, suggest different topic│   │
│  │ Quota Exceeded     │ Return error, suggest upgrade      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Retry Configuration:                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  const retryConfig = {                                  │    │
│  │    maxRetries: 3,                                       │    │
│  │    initialDelay: 1000,      // 1 second                 │    │
│  │    maxDelay: 10000,         // 10 seconds               │    │
│  │    backoffMultiplier: 2,    // Exponential              │    │
│  │    retryableErrors: [                                   │    │
│  │      'RATE_LIMIT_EXCEEDED',                             │    │
│  │      'SERVICE_UNAVAILABLE',                             │    │
│  │      'DEADLINE_EXCEEDED'                                │    │
│  │    ]                                                    │    │
│  │  };                                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Client Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE USAGE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Calling the Cloud Function:                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  import { getFunctions, httpsCallable } from 'firebase';│    │
│  │                                                         │    │
│  │  const generateQuestions = async (params) => {          │    │
│  │    const functions = getFunctions();                    │    │
│  │    const generate = httpsCallable(                      │    │
│  │      functions,                                         │    │
│  │      'generateQuestions'                                │    │
│  │    );                                                   │    │
│  │                                                         │    │
│  │    try {                                                │    │
│  │      const result = await generate({                    │    │
│  │        topic: params.topic,                             │    │
│  │        count: params.count,                             │    │
│  │        difficulty: params.difficulty,                   │    │
│  │        questionTypes: params.types                      │    │
│  │      });                                                │    │
│  │                                                         │    │
│  │      return result.data.questions;                      │    │
│  │    } catch (error) {                                    │    │
│  │      handleGenerationError(error);                      │    │
│  │    }                                                    │    │
│  │  };                                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  UI Integration:                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • Show loading spinner during generation               │    │
│  │  • Display progress (Generating question 1/10...)       │    │
│  │  • Allow cancellation                                   │    │
│  │  • Preview generated questions before adding            │    │
│  │  • Edit/regenerate individual questions                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tổng kết phần 3.2.2

Phần 3.2.2 đã trình bày chi tiết **Module Tạo Quiz và Tích hợp AI**:

| Thành phần | Công nghệ | Kết quả |
|------------|-----------|---------|
| **Quiz Builder** | React + Form Handling | Multi-step wizard, 11 question types |
| **AI Generation** | Gemini 2.5 Flash | ~5 giây cho 10 câu hỏi |
| **Cloud Function** | Firebase Functions v2 | Rate limiting, quota management |
| **JSON Processing** | Custom validation | 99% parse success rate |

**Kết quả đạt được:**
- ✅ Giao diện tạo quiz trực quan với drag & drop
- ✅ 11 loại câu hỏi đa dạng
- ✅ AI tạo câu hỏi tự động với Gemini
- ✅ Validation và error handling hoàn chỉnh

---

*Tiếp theo: [3.2.3. Hiện thực hóa Module Chơi Quiz và Chấm điểm](CHAPTER3_2_3_QUIZ_GAMEPLAY.md)*
