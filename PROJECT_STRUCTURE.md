# 📁 QuizTrivia App - Project Structure Documentation

> **Version**: 4.3.2 | **Last Updated**: December 7, 2025  
> **Repository**: https://github.com/ToanLee5433/QuizzTrivia_App  
> **Branch**: 2025-11-05-xyzq-1b7b4

---

## 📋 Architecture Quality Assessment

| Aspect | Score | Status |
|--------|-------|--------|
| **Feature-Based Architecture** | 10/10 | ✅ Excellent |
| **State Management** | 9/10 | ✅ Very Good |
| **RAG Chatbot Design** | 9/10 | ✅ Very Good |
| **Multiplayer (RTDB)** | 8/10 | ✅ Good |
| **i18n Organization** | 6/10 | ⚠️ Needs Improvement |
| **Service Boundaries** | 7/10 | ⚠️ Needs Cleanup |

### 🎯 Key Strengths
1. **Feature-Based Modules**: Mỗi feature hoạt động như "mini-app" độc lập
2. **State Separation**: Zustand (Client) + React Query (Server) - tránh Redux bloat
3. **Hybrid Search RAG**: Vector + BM25 + RRF fusion - chuẩn mực vàng
4. **Multiplayer uses RTDB**: Đã tối ưu với Firebase Realtime Database (low latency)

### ⚠️ Known Issues (Backlog)
1. **i18n file quá lớn**: 5847 lines trong single file → cần namespace splitting
2. **Service boundaries**: Một số quiz services nằm sai vị trí (global vs feature)
3. **Import boundaries**: Chưa có lint rule ngăn cross-feature imports

---

## 📊 Project Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          QuizTrivia Application                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         FRONTEND (React + Vite)                         │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │    │
│  │  │  Pages  │  │Features │  │Components│ │ Hooks   │  │Services │       │    │
│  │  │  /pages │  │/features│  │/components│ │ /hooks  │  │/services│       │    │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │    │
│  │       │            │            │            │            │             │    │
│  │       └────────────┴────────────┴────────────┴────────────┘             │    │
│  │                                  │                                      │    │
│  │                    ┌─────────────┴─────────────┐                        │    │
│  │                    │     State Management      │                        │    │
│  │                    │  (Zustand + React Query)  │                        │    │
│  │                    └─────────────┬─────────────┘                        │    │
│  └──────────────────────────────────│──────────────────────────────────────┘    │
│                                     │                                            │
│  ┌──────────────────────────────────│──────────────────────────────────────┐    │
│  │                         BACKEND (Firebase)                              │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐            │    │
│  │  │ Firestore │  │  Storage  │  │   Auth    │  │ Functions │            │    │
│  │  │  (Data)   │  │  (Files)  │  │  (Users)  │  │  (RAG AI) │            │    │
│  │  └───────────┘  └───────────┘  └───────────┘  └─────┬─────┘            │    │
│  │                                                      │                  │    │
│  │                              ┌───────────────────────┘                  │    │
│  │                              ▼                                          │    │
│  │                    ┌─────────────────────┐                              │    │
│  │                    │  RAG Chatbot System │                              │    │
│  │                    │  (Gemini AI + Orama)│                              │    │
│  │                    └─────────────────────┘                              │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Complete Folder Structure

```
QuizTrivia-App/
│
├── 📁 src/                          # 🎯 FRONTEND SOURCE CODE
│   ├── 📄 App.tsx                   # Main App component with routing
│   ├── 📄 main.tsx                  # Application entry point
│   ├── 📄 index.css                 # Global styles (Tailwind)
│   │
│   ├── 📁 features/                 # 🏗️ FEATURE-BASED MODULES
│   │   ├── 📁 admin/                # Admin dashboard features
│   │   │   ├── 📁 components/       # Admin-specific UI components
│   │   │   └── 📁 pages/            # Admin pages (Dashboard, Stats, Users)
│   │   │
│   │   ├── 📁 auth/                 # Authentication features
│   │   │   └── 📁 pages/            # Login, Register, Password Reset
│   │   │       └── AuthPageNew.tsx  # Main auth page with validation
│   │   │
│   │   ├── 📁 creator/              # Quiz Creator features
│   │   │   ├── 📁 components/       # Quiz creation components
│   │   │   └── 📁 pages/            # Quiz editor pages
│   │   │
│   │   ├── 📁 quiz/                 # Core Quiz features
│   │   │   ├── 📁 api/              # Quiz API functions
│   │   │   ├── 📁 components/       # Quiz UI components
│   │   │   ├── 📁 hooks/            # Quiz-specific hooks
│   │   │   ├── 📁 pages/            # Quiz pages (Play, Results, Browse)
│   │   │   ├── 📁 services/         # Quiz business logic
│   │   │   ├── 📁 types/            # Quiz TypeScript types
│   │   │   ├── 📄 store.ts          # Quiz Zustand store
│   │   │   └── 📄 constants.ts      # Quiz constants
│   │   │
│   │   ├── 📁 multiplayer/          # Multiplayer Game features
│   │   │   └── 📁 modern/           # Modern multiplayer system
│   │   │       ├── 📁 components/   # Lobby, Room, Scoreboard
│   │   │       ├── 📁 services/     # Real-time sync services
│   │   │       ├── 📁 types/        # Multiplayer types
│   │   │       └── 📁 utils/        # Multiplayer utilities
│   │   │
│   │   ├── 📁 flashcard/            # Flashcard features
│   │   │   ├── 📁 components/       # Flashcard UI
│   │   │   └── 📁 pages/            # Flashcard study pages
│   │   │
│   │   ├── 📁 offline/              # Offline Mode features
│   │   │   ├── 📁 components/       # Offline indicators
│   │   │   └── 📁 services/         # IndexedDB storage
│   │   │
│   │   └── 📁 settings/             # User Settings features
│   │       └── 📁 pages/            # Profile, Preferences
│   │
│   ├── 📁 components/               # 🧩 SHARED COMPONENTS
│   │   ├── 📁 common/               # Buttons, Modals, Forms, etc.
│   │   ├── 📁 quiz/                 # Quiz-related shared components
│   │   ├── 📁 rag/                  # RAG Chatbot components
│   │   │   └── ChatbotModal.tsx     # AI Learning Consultant UI
│   │   ├── 📄 MusicPlayer.tsx       # Background music player
│   │   ├── 📄 ImageUploader.tsx     # Image upload component
│   │   └── 📄 OfflineIndicator.tsx  # Network status indicator
│   │
│   ├── 📁 pages/                    # 📄 STANDALONE PAGES
│   │   ├── 📄 HomePage.tsx          # Landing page
│   │   ├── 📄 ExplorePage.tsx       # Quiz discovery
│   │   ├── 📄 ProfilePage.tsx       # User profile
│   │   └── 📄 NotFoundPage.tsx      # 404 page
│   │
│   ├── 📁 services/                 # 🔧 BUSINESS SERVICES
│   │   ├── 📁 firebase/             # Firebase service wrappers
│   │   ├── 📄 geminiAI.ts           # Gemini AI integration
│   │   ├── 📄 adminStatsService.ts  # Admin statistics
│   │   ├── 📄 quizStatsService.ts   # Quiz analytics
│   │   ├── 📄 notificationService.ts# Push notifications
│   │   ├── 📄 musicService.ts       # Background music
│   │   ├── 📄 soundService.ts       # Sound effects
│   │   └── 📄 imageUploadService.ts # Image processing
│   │
│   ├── 📁 hooks/                    # 🪝 CUSTOM REACT HOOKS
│   │   ├── 📄 useQuizData.ts        # Quiz data fetching
│   │   ├── 📄 useNetwork.ts         # Network status
│   │   ├── 📄 useOfflineQueue.ts    # Offline action queue
│   │   ├── 📄 usePresence.ts        # User online status
│   │   ├── 📄 useNotifications.ts   # Notification handling
│   │   └── 📄 useActivityTracker.ts # User activity tracking
│   │
│   ├── 📁 contexts/                 # 🌐 REACT CONTEXTS
│   │   └── 📄 SettingsContext.tsx   # Global settings context
│   │
│   ├── 📁 lib/                      # 📚 LIBRARIES & UTILITIES
│   │   ├── 📁 firebase/             # Firebase configuration
│   │   │   ├── 📄 config.ts         # Firebase init
│   │   │   └── 📄 auth.ts           # Auth helpers
│   │   │
│   │   ├── 📁 i18n/                 # Internationalization
│   │   │   └── 📄 index.ts          # i18next configuration
│   │   │
│   │   ├── 📁 store/                # Global state stores
│   │   │   └── 📄 authStore.ts      # Auth Zustand store
│   │   │
│   │   ├── 📁 genkit/               # Genkit AI configuration
│   │   │   ├── 📄 config.ts         # Genkit setup
│   │   │   ├── 📄 embeddings.ts     # Embedding generation
│   │   │   └── 📄 types.ts          # AI types
│   │   │
│   │   ├── 📁 utils/                # Utility functions
│   │   │   ├── 📄 helpers.ts        # General helpers (password validation)
│   │   │   └── 📄 formatters.ts     # Date/number formatters
│   │   │
│   │   └── 📁 types/                # Shared TypeScript types
│   │
│   ├── 📁 config/                   # ⚙️ APP CONFIGURATION
│   │   └── 📄 gemini.ts             # Gemini AI config
│   │
│   ├── 📁 assets/                   # 🖼️ STATIC ASSETS
│   │   ├── 📁 images/               # Image files
│   │   └── 📁 icons/                # Icon files
│   │
│   └── 📁 types/                    # 📝 GLOBAL TYPES
│       └── 📄 index.d.ts            # Global type declarations
│
├── 📁 functions/                    # ⚡ FIREBASE CLOUD FUNCTIONS
│   ├── 📄 package.json              # Functions dependencies
│   ├── 📄 tsconfig.json             # TypeScript config
│   │
│   ├── 📁 src/                      # Functions source code
│   │   ├── 📄 index.ts              # Main exports
│   │   │
│   │   ├── 📁 rag/                  # 🤖 RAG CHATBOT SYSTEM (v4.3)
│   │   │   ├── 📄 ask.ts            # askRAG Cloud Function
│   │   │   ├── 📄 optimizedRAG.ts   # Core RAG engine (Multi-Agent)
│   │   │   ├── 📄 oramaEngine.ts    # Orama vector search engine
│   │   │   ├── 📄 autoTagging.ts    # Quiz auto-tagging
│   │   │   └── 📄 rebuildIndex.ts   # Index rebuild function
│   │   │
│   │   ├── 📁 lib/                  # Shared libraries
│   │   │   └── 📄 hybridSearch.ts   # Hybrid search (Vector + BM25)
│   │   │
│   │   ├── 📁 multiplayer/          # Multiplayer functions
│   │   │   └── 📄 roomSync.ts       # Room synchronization
│   │   │
│   │   ├── 📁 scheduled/            # Scheduled functions
│   │   │   └── 📄 cleanup.ts        # Data cleanup jobs
│   │   │
│   │   ├── 📁 monitoring/           # Monitoring functions
│   │   │   └── 📄 healthCheck.ts    # System health checks
│   │   │
│   │   └── 📁 types/                # Functions types
│   │       └── 📄 genkit.ts         # Genkit types
│   │
│   └── 📁 lib/                      # Compiled JavaScript
│
├── 📁 public/                       # 🌐 PUBLIC STATIC FILES
│   ├── 📁 locales/                  # i18n translation files
│   │   ├── 📁 en/                   # English translations
│   │   │   └── 📄 common.json       # ~6000 lines
│   │   └── 📁 vi/                   # Vietnamese translations
│   │       └── 📄 common.json       # ~6000 lines
│   │
│   ├── 📁 images/                   # Public images
│   ├── 📁 sounds/                   # Sound effects
│   ├── 📁 music/                    # Background music
│   └── 📄 sw.js.manual.backup       # Service Worker backup
│
├── 📁 config/                       # 🛠️ BUILD CONFIGURATION
│   └── 📄 vite.config.ts            # Vite configuration
│
├── 📁 docs/                         # 📖 DOCUMENTATION
│
├── 📁 scripts/                      # 📜 BUILD SCRIPTS
│
├── 📁 tests/                        # 🧪 TEST FILES
│
├── 📁 tools/                        # 🔧 DEVELOPMENT TOOLS
│
└── 📁 .storybook/                   # 📚 STORYBOOK CONFIG
```

---

## 🏛️ Architecture Patterns

### 1. Feature-Based Architecture (Frontend)

```
┌────────────────────────────────────────────────────────────────────┐
│                      Feature Module Pattern                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   src/features/{feature-name}/                                      │
│   │                                                                 │
│   ├── 📁 components/    → Feature-specific UI components            │
│   ├── 📁 pages/         → Route-level page components               │
│   ├── 📁 hooks/         → Feature-specific React hooks              │
│   ├── 📁 services/      → Business logic & API calls                │
│   ├── 📁 types/         → Feature TypeScript interfaces             │
│   ├── 📄 store.ts       → Feature Zustand store                     │
│   ├── 📄 constants.ts   → Feature constants                         │
│   └── 📄 index.ts       → Public API exports                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 2. RAG Chatbot Architecture (Backend)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         RAG Chatbot v4.3 Architecture                           │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   User Input + History                                                          │
│         │                                                                       │
│         ▼                                                                       │
│   ┌─────────────────┐                                                           │
│   │ Query Rewriter  │ → Contextual understanding ("đó" → "môn Toán")            │
│   └────────┬────────┘                                                           │
│            ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          FAST INTENT DETECTION                          │   │
│   │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                │   │
│   │  │Regex Patterns│ OR │ LLM Router  │  →  │Intent Result│                │   │
│   │  │  (O(1))     │     │ (Gemini)    │     │             │                │   │
│   │  └─────────────┘     └─────────────┘     └─────────────┘                │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│            │                                                                    │
│            ▼                                                                    │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │                         INTENT HANDLERS                                │    │
│   │                                                                        │    │
│   │  SEARCH      QUIZ_BROWSE    LEARNING_PATH    HELP    GENERAL_CHAT     │    │
│   │    │              │              │             │           │          │    │
│   │    ▼              ▼              ▼             ▼           ▼          │    │
│   │  Hybrid       Recommend     Plan Agent    Help Text    Chat Reply    │    │
│   │  Search        Quizzes      + Search                                 │    │
│   └───────────────────────────────────┬────────────────────────────────────┘    │
│                                       │                                         │
│                                       ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          HYBRID SEARCH ENGINE                           │   │
│   │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │   │
│   │  │Vector Search │ +  │ BM25 Keyword │ =  │  RRF Fusion  │              │   │
│   │  │(Gemini Embed)│    │   (Orama)    │    │   (k=60)     │              │   │
│   │  └──────────────┘    └──────────────┘    └──────────────┘              │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                       CONFIDENCE-BASED RERANK                           │   │
│   │                                                                         │   │
│   │  topScore >= 0.85  →  SKIP RERANK (Fast Path ⚡)                        │   │
│   │  topScore <  0.85  →  AI RERANK (Gemini Cross-Encoder)                  │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          RESPONSE SYNTHESIZER                           │   │
│   │  Gemini Flash-Lite → Rich Answer + Quiz Cards + Follow-up Questions    │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Key File Descriptions

### Frontend Core Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/App.tsx` | Main router & layout | Route definitions, Protected routes |
| `src/main.tsx` | Entry point | ReactDOM render, Providers setup |
| `src/lib/i18n/index.ts` | i18n config | Multi-language support (vi/en) |
| `src/lib/store.ts` | Global store | Zustand state management |
| `src/config/gemini.ts` | AI config | Gemini API setup |

### Feature Modules

| Feature | Path | Description |
|---------|------|-------------|
| **Admin** | `src/features/admin/` | Dashboard, user management, statistics |
| **Auth** | `src/features/auth/` | Login, register, password reset |
| **Quiz** | `src/features/quiz/` | Quiz play, creation, results |
| **Multiplayer** | `src/features/multiplayer/` | Real-time quiz battles |
| **Flashcard** | `src/features/flashcard/` | Study mode with flashcards |
| **Offline** | `src/features/offline/` | Offline quiz support |
| **Settings** | `src/features/settings/` | User preferences |

### RAG Chatbot Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `functions/src/rag/ask.ts` | Cloud Function | `askRAG()` HTTP endpoint |
| `functions/src/rag/optimizedRAG.ts` | Core Engine | Multi-agent RAG system |
| `functions/src/rag/oramaEngine.ts` | Vector Search | Orama DB integration |
| `functions/src/lib/hybridSearch.ts` | Search Utils | BM25 + Vector + RRF fusion |
| `functions/src/rag/autoTagging.ts` | Auto-tagging | Quiz categorization |
| `functions/src/rag/rebuildIndex.ts` | Index Builder | Vector index generation |

### Configuration Files

| File | Purpose |
|------|---------|
| `firebase.json` | Firebase hosting & functions config |
| `firestore.rules` | Firestore security rules |
| `firestore.indexes.json` | Firestore composite indexes |
| `storage.rules` | Cloud Storage security rules |
| `vite.config.ts` | Vite build configuration |
| `tailwind.config.js` | Tailwind CSS configuration |
| `tsconfig.json` | TypeScript configuration |

---

## 🔄 Data Flow

### Quiz Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Quiz Data Flow                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CREATION                                                                 │
│     Creator → QuizEditor → Firestore (quizzes collection)                   │
│                    │                                                         │
│                    ▼                                                         │
│              Auto-Tagging → Vector Index Update                              │
│                                                                              │
│  2. DISCOVERY                                                                │
│     User → ExplorePage → Firestore Query OR RAG Chatbot                     │
│                                  │                                           │
│                                  ▼                                           │
│                          Hybrid Search → Filtered Results                    │
│                                                                              │
│  3. GAMEPLAY                                                                 │
│     User → QuizPlayPage → Questions → Submit → Calculate Score              │
│                                                    │                         │
│                                                    ▼                         │
│                                              Save to quizAttempts            │
│                                                                              │
│  4. RESULTS                                                                  │
│     QuizResults → Show Score → Update User Stats → Leaderboard              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RAG Chatbot Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RAG Chatbot Data Flow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. USER INPUT                                                               │
│     ChatbotModal.tsx → Send message + history                               │
│                                                                              │
│  2. CLOUD FUNCTION                                                           │
│     askRAG() → Validate → processUserQuery()                                │
│                                                                              │
│  3. QUERY PROCESSING                                                         │
│     rewriteQuery() → fastIntentDetection() OR classifyIntent()              │
│                                                                              │
│  4. SEARCH (if needed)                                                       │
│     loadVectorIndex() → oramaHybridSearch() → aiRerank()                    │
│                                                                              │
│  5. SYNTHESIS                                                                │
│     synthesizeResponse() → Gemini Flash-Lite → JSON Response                │
│                                                                              │
│  6. RESPONSE                                                                 │
│     { answer, quizCards, followUpQuestions, sources }                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Library | 18.x |
| Vite | Build Tool | 5.x |
| TypeScript | Type Safety | 5.x |
| Tailwind CSS | Styling | 3.x |
| Zustand | State Management | 4.x |
| React Query | Data Fetching | 5.x |
| i18next | Internationalization | 23.x |
| Framer Motion | Animations | 10.x |

### Backend (Firebase)
| Technology | Purpose |
|------------|---------|
| Cloud Functions | Serverless backend |
| Firestore | NoSQL database |
| Storage | File storage |
| Authentication | User management |
| Hosting | Static hosting |

### AI/ML
| Technology | Purpose |
|------------|---------|
| Gemini 2.5 Flash-Lite | Chat/Router LLM |
| Gemini Embedding-001 | Vector embeddings (768-dim) |
| Orama | In-memory vector search |

---

## 📊 Database Schema (Firestore + RTDB)

### Firestore Collections (Persistent Data)
```
firestore/
├── 📁 users/{userId}
│   ├── displayName: string
│   ├── email: string
│   ├── photoURL: string
│   ├── role: 'user' | 'admin' | 'creator'
│   ├── stats: { totalScore, quizzesPlayed, ... }
│   └── preferences: { theme, language, ... }
│
├── 📁 quizzes/{quizId}
│   ├── title: string
│   ├── description: string
│   ├── category: string
│   ├── difficulty: 'easy' | 'medium' | 'hard'
│   ├── questions: Question[]
│   ├── creatorId: string
│   ├── status: 'draft' | 'published' | 'archived'
│   ├── stats: { plays, rating, avgScore }
│   ├── tags: string[]
│   └── embedding: number[] (768-dim)
│
├── 📁 quizAttempts/{attemptId}
│   ├── quizId: string
│   ├── userId: string
│   ├── score: number
│   ├── answers: Answer[]
│   ├── completedAt: Timestamp
│   └── timeSpent: number
│
└── 📁 chatLogs/{logId} (RAG Chatbot)
    ├── userId: string
    ├── question: string
    ├── answer: string
    ├── intent: string
    └── timestamp: Timestamp
```

### Firebase Realtime Database (Real-time Data)
```
rtdb/
├── 📁 rooms/{roomId}/              # ⚡ Multiplayer (Low Latency)
│   ├── status: 'waiting' | 'playing' | 'finished'
│   ├── hostId: string
│   ├── quizId: string
│   ├── currentQuestion: number
│   ├── countdown: number
│   ├── sharedScreen: boolean
│   │
│   ├── 📁 players/{oderId}/
│   │   ├── oderId: string
│   │   ├── odeName: string
│   │   ├── odeAvatar: string
│   │   ├── score: number
│   │   └── isReady: boolean
│   │
│   ├── 📁 chat/{messageId}/
│   │   ├── senderId: string
│   │   ├── message: string
│   │   └── timestamp: number
│   │
│   └── 📁 settings/
│       ├── gameMode: 'synced' | 'free'
│       ├── timePerQuestion: number
│       └── autoStart: boolean
│
└── 📁 rateLimits/rag/{userId}/     # ⚡ RAG Rate Limiting
    ├── count: number
    ├── lastRequest: number
    └── windowStart: number
```

> **💡 Why RTDB for Multiplayer?**
> - Firestore latency: 200ms-1s per write
> - RTDB latency: 10-50ms per write
> - 4 players × 1 update/sec = 4 writes/sec
> - RTDB: Flat rate pricing, optimized for real-time

---

## 🚀 Performance Optimizations

### 1. RAG Chatbot Optimizations
- **Threshold Skip Rerank**: Skip AI rerank when topScore ≥ 0.85
- **Regex Heuristic Router**: Fast pattern matching before LLM call
- **Vietnamese Tokenization**: Bi-gram/Tri-gram for better BM25 matching
- **Global Cache**: 5-minute TTL for vector index

### 2. Frontend Optimizations
- **Code Splitting**: Lazy load feature modules
- **React Query**: Automatic caching & background refetch
- **Zustand**: Minimal re-renders with selective subscriptions
- **i18n Lazy Load**: Load translations on demand

### 3. Firebase Optimizations
- **Composite Indexes**: Optimized Firestore queries
- **Storage Rules**: CDN caching for static files
- **Functions Warm-up**: Keep instances warm
- **RTDB for Multiplayer**: Low-latency real-time sync

---

## 🔧 Improvement Backlog

### Priority 1: i18n Namespace Splitting (High Impact)

**Current Problem:**
```
public/locales/vi/common.json  # 5847 lines - QUÁT LỚN!
```
- Tải toàn bộ 5847 dòng JSON khi mở app
- Chậm Time to Interactive (TTI)
- User chỉ ở màn Login vẫn phải load translations cho Admin

**Proposed Solution:**
```
public/locales/vi/
├── common.json      # ~500 lines (Shared: buttons, errors, dates)
├── auth.json        # ~300 lines (Login, Register, Password)
├── quiz.json        # ~1500 lines (Play, Create, Results)
├── admin.json       # ~800 lines (Dashboard, Stats)
├── multiplayer.json # ~600 lines (Rooms, Lobby)
├── rag.json         # ~200 lines (Chatbot)
└── settings.json    # ~300 lines (Preferences)
```

**Benefits:**
- Initial load: ~500 lines (common) vs 5847 lines
- Route-based lazy loading
- ~90% reduction in initial bundle

### Priority 2: Service Boundary Cleanup (Medium Impact)

**Current Problem:**
```
src/services/                    # Global services
├── quizStatsService.ts          # ❓ Quiz-specific, should be in features
├── similarQuizService.ts        # ❓ Quiz-specific, should be in features
├── quizAnalysisService.ts       # ❓ Quiz-specific, should be in features
└── adminStatsService.ts         # ✅ OK - Admin-specific, but used globally

src/features/quiz/services/      # Feature services
├── quizService.ts               # ✅ OK
└── learningService.ts           # ✅ OK
```

**Proposed Rule:**
```
src/services/                    # ONLY 3rd-party wrappers
├── firebase/                    # Firebase SDK wrapper
├── geminiAI.ts                  # Gemini API wrapper
├── soundService.ts              # Audio API wrapper
└── notificationService.ts       # Push notification wrapper

src/features/{name}/services/    # ALL business logic
```

### Priority 3: Import Boundary Lint Rule (Low Impact)

**Problem:** Code trong `features/auth` có thể import từ `features/quiz`
**Solution:** ESLint rule với `eslint-plugin-boundaries`

```javascript
// .eslintrc.js
{
  "plugins": ["boundaries"],
  "rules": {
    "boundaries/element-types": [2, {
      "default": "disallow",
      "rules": [
        // features can only import from shared
        { "from": "features", "allow": ["shared", "lib"] },
        // features cannot import from other features
        { "from": "features/*", "disallow": ["features/*"] }
      ]
    }]
  }
}
```

---

## 📝 Development Commands

```bash
# Frontend Development
npm run dev           # Start Vite dev server
npm run build         # Build for production
npm run lint          # Run ESLint
npm run test          # Run tests

# Firebase Functions
cd functions
npm run build         # Compile TypeScript
npm run serve         # Local emulator
firebase deploy --only functions

# Full Deployment
firebase deploy       # Deploy all (hosting + functions + rules)
```

---

## 📌 Key Design Decisions

1. **Feature-Based Architecture**: Each feature is self-contained with its own components, hooks, services, and store.

2. **Multi-Agent RAG**: Specialized agents for different intents improve accuracy and reduce hallucination.

3. **Hybrid Search**: Combining vector + keyword search provides both semantic understanding and exact matching.

4. **Confidence-Based Processing**: Skip expensive operations when confidence is high, reducing latency.

5. **Vietnamese NLP Support**: Custom tokenization and compound word handling for Vietnamese language.

6. **Offline-First**: IndexedDB support for offline quiz play with sync queue.

7. **Real-time Multiplayer**: Firebase Realtime Database (RTDB) for low-latency game synchronization.

---

## 📊 Architecture Diagrams

### Service Layer Organization (Current vs Proposed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CURRENT SERVICE ORGANIZATION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  src/services/                          src/features/quiz/services/          │
│  ├── quizStatsService.ts    ❌          ├── quizService.ts        ✅        │
│  ├── similarQuizService.ts  ❌          ├── learningService.ts    ✅        │
│  ├── quizAnalysisService.ts ❌          └── reviewService.ts      ✅        │
│  ├── adminStatsService.ts   ⚠️                                               │
│  ├── geminiAI.ts            ✅                                               │
│  └── firebase/              ✅                                               │
│                                                                              │
│  ❌ = Should move to features    ⚠️ = Acceptable    ✅ = Correct location   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                     PROPOSED SERVICE ORGANIZATION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  src/shared/lib/                        src/features/quiz/services/          │
│  ├── firebase/              # SDK       ├── quizService.ts                   │
│  ├── geminiAI.ts            # API       ├── quizStatsService.ts    ← moved  │
│  ├── soundService.ts        # Audio     ├── similarQuizService.ts  ← moved  │
│  └── notificationService.ts # Push      ├── quizAnalysisService.ts ← moved  │
│                                         └── learningService.ts               │
│                                                                              │
│  src/features/admin/services/                                                │
│  └── adminStatsService.ts   ← moved                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### i18n Namespace Architecture (Proposed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     i18n NAMESPACE SPLITTING                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CURRENT (Single File)                  PROPOSED (Namespaces)               │
│  ══════════════════════                 ═══════════════════════              │
│                                                                              │
│  public/locales/vi/                     public/locales/vi/                   │
│  └── common.json (5847 lines)  →        ├── common.json (~500)  ← Always   │
│                                         ├── auth.json (~300)    ← /login    │
│                                         ├── quiz.json (~1500)   ← /quiz/*   │
│                                         ├── admin.json (~800)   ← /admin/*  │
│                                         ├── multiplayer.json (~600) ← /room │
│                                         ├── rag.json (~200)     ← Chatbot   │
│                                         └── settings.json (~300) ← /settings│
│                                                                              │
│  LOADING STRATEGY:                                                           │
│  ═════════════════                                                           │
│  1. App Start: Load 'common' namespace                                       │
│  2. Route Change: Lazy load relevant namespace                               │
│  3. Cache: Store in browser HTTP cache (no localStorage)                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

> **Document Generated**: December 7, 2025  
> **Author**: GitHub Copilot  
> **For**: QuizTrivia App Development Team
