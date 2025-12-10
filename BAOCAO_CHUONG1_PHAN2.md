# CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI VÀ CƠ SỞ CÔNG NGHỆ (Tiếp theo)

---

## 1.3. Cơ sở công nghệ phía giao diện người dùng (Frontend)

### 1.3.1. Tổng quan thư viện ReactJS và hệ sinh thái hỗ trợ

#### a) Giới thiệu ReactJS

**ReactJS** là một thư viện JavaScript mã nguồn mở được phát triển bởi Facebook (nay là Meta) từ năm 2013, dùng để xây dựng giao diện người dùng (User Interface). React đã trở thành một trong những công nghệ frontend phổ biến nhất thế giới với hơn 220.000 stars trên GitHub và được sử dụng bởi các tập đoàn lớn như Meta, Netflix, Airbnb, Uber.

**Các đặc điểm nổi bật của React:**

**(1) Virtual DOM (Document Object Model ảo):**
React sử dụng Virtual DOM để tối ưu hiệu suất render. Thay vì cập nhật trực tiếp DOM thật (tốn chi phí cao), React tạo một bản sao Virtual DOM trong bộ nhớ, so sánh sự khác biệt (diffing algorithm) và chỉ cập nhật những phần thay đổi (reconciliation).

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   State     │───▶│ Virtual DOM │───▶│  Real DOM   │
│   Change    │    │   Diffing   │    │   Update    │
└─────────────┘    └─────────────┘    └─────────────┘
```

**(2) Component-Based Architecture:**
React xây dựng giao diện theo kiến trúc component, chia nhỏ UI thành các thành phần độc lập, tái sử dụng được. Mỗi component quản lý state và logic riêng, giúp code dễ bảo trì và mở rộng.

**(3) Declarative Programming:**
React sử dụng mô hình lập trình khai báo (declarative), developer mô tả UI nên trông như thế nào với mỗi state, React tự động xử lý việc cập nhật DOM.

**(4) One-way Data Binding:**
Dữ liệu trong React chảy một chiều từ parent component xuống child component thông qua props, giúp dễ dàng theo dõi luồng dữ liệu và debug.

**Phiên bản sử dụng: React 18.2.0**

React 18 (phát hành tháng 3/2022) mang đến nhiều cải tiến quan trọng:

| Tính năng | Mô tả |
|-----------|-------|
| **Concurrent Rendering** | Cho phép React chuẩn bị nhiều phiên bản UI cùng lúc, cải thiện responsiveness |
| **Automatic Batching** | Tự động gom nhiều state updates thành một lần render |
| **Transitions** | Phân biệt updates urgent và non-urgent, tối ưu trải nghiệm người dùng |
| **Suspense** | Cải tiến hỗ trợ data fetching và code splitting |
| **New Hooks** | useId, useTransition, useDeferredValue |

#### b) Hệ sinh thái thư viện hỗ trợ

**React Router v7.6.3 - Routing:**
```typescript
// Cấu hình routing cho ứng dụng
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/quiz/:quizId" element={<QuizPage />} />
  <Route path="/multiplayer/:roomId" element={<MultiplayerPage />} />
</Routes>
```

Tính năng sử dụng:
- Nested Routes (routes lồng nhau)
- Protected Routes (bảo vệ route bằng authentication)
- Lazy Loading Routes (tải route theo nhu cầu)
- URL Parameters & Query Strings

**Redux Toolkit v1.9.7 - State Management:**

Redux Toolkit là bộ công cụ chính thức để phát triển với Redux, giúp giảm boilerplate code và cung cấp các best practices.

```typescript
// Ví dụ: Auth Slice
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    }
  }
});
```

**React Hook Form - Form Handling:**
Quản lý form hiệu quả với validation, giảm re-renders không cần thiết.

**React Toastify v11.0.5 - Notifications:**
Hiển thị thông báo toast với nhiều tùy chọn vị trí, animation, auto-dismiss.

**Framer Motion v12.23.24 - Animations:**
Thư viện animation mạnh mẽ cho React với declarative API, hỗ trợ gesture animations, page transitions.

**Recharts v3.1.0 - Data Visualization:**
Thư viện biểu đồ được xây dựng trên D3.js, tối ưu cho React với responsive charts.

### 1.3.2. Vai trò của ngôn ngữ TypeScript trong phát triển ứng dụng quy mô lớn

#### a) Giới thiệu TypeScript

**TypeScript** là ngôn ngữ lập trình mã nguồn mở được phát triển bởi Microsoft, là superset của JavaScript với bổ sung hệ thống kiểu tĩnh (static typing). TypeScript được biên dịch (transpile) sang JavaScript để chạy trên mọi môi trường hỗ trợ JavaScript.

**Phiên bản sử dụng: TypeScript 5.2.2**

#### b) Lợi ích của TypeScript trong dự án

**(1) Type Safety - An toàn kiểu dữ liệu:**

```typescript
// Định nghĩa interface cho Question
interface Question {
  id: string;
  text: string;
  type: QuestionType;
  answers: Answer[];
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// TypeScript sẽ báo lỗi nếu thiếu field bắt buộc
const question: Question = {
  id: '1',
  text: 'What is React?',
  type: 'multiple',
  answers: [...],
  points: 10
  // difficulty là optional, không bắt buộc
};
```

**(2) IntelliSense và Auto-completion:**
IDE (VS Code) cung cấp gợi ý code chính xác dựa trên type definitions, giúp tăng năng suất và giảm lỗi typo.

**(3) Refactoring an toàn:**
Khi đổi tên biến, hàm, hoặc thay đổi interface, TypeScript compiler sẽ báo tất cả các vị trí cần cập nhật.

**(4) Documentation tự động:**
Type definitions đóng vai trò như documentation sống (living documentation) cho code.

**(5) Phát hiện lỗi sớm:**
Nhiều lỗi runtime được phát hiện ngay tại compile time:
- Null/undefined access
- Sai kiểu tham số
- Thiếu properties
- Sai return type

#### c) Cấu hình TypeScript trong dự án

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

| Option | Mô tả |
|--------|-------|
| `strict: true` | Bật tất cả strict type-checking options |
| `noUnusedLocals` | Báo lỗi với biến khai báo nhưng không sử dụng |
| `noUnusedParameters` | Báo lỗi với tham số không sử dụng |

### 1.3.3. Công cụ xây dựng và thiết kế giao diện hiện đại

#### a) Vite - Build Tool thế hệ mới

**Vite** (tiếng Pháp: "nhanh") là build tool được tạo bởi Evan You (tác giả Vue.js), ra mắt năm 2020, được thiết kế để giải quyết các vấn đề về hiệu suất của các bundler truyền thống như Webpack.

**Phiên bản sử dụng: Vite 5.4.19**

**Ưu điểm vượt trội của Vite:**

| Tiêu chí | Webpack | Vite |
|----------|---------|------|
| Dev Server Start | 30-60s (dự án lớn) | < 1s |
| Hot Module Replacement | 1-3s | < 100ms |
| Build Production | Tương đương | Nhanh hơn 10-20% |
| Cấu hình | Phức tạp | Đơn giản, zero-config |

**Cơ chế hoạt động:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    VITE ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Development Mode:                                              │
│  ┌──────────┐    ┌─────────────┐    ┌──────────────┐          │
│  │  Source  │───▶│ Native ESM  │───▶│   Browser    │          │
│  │  Files   │    │  (No Bundle)│    │  Dev Server  │          │
│  └──────────┘    └─────────────┘    └──────────────┘          │
│                                                                 │
│  Production Mode:                                               │
│  ┌──────────┐    ┌─────────────┐    ┌──────────────┐          │
│  │  Source  │───▶│   Rollup    │───▶│ Optimized    │          │
│  │  Files   │    │   Bundle    │    │   Bundle     │          │
│  └──────────┘    └─────────────┘    └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Cấu hình Vite trong dự án:**

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore']
        }
      }
    }
  }
});
```

#### b) Tailwind CSS - Utility-First CSS Framework

**Tailwind CSS** là framework CSS theo hướng utility-first, cung cấp các class CSS nhỏ, đơn mục đích (single-purpose) để xây dựng giao diện trực tiếp trong HTML/JSX.

**Phiên bản sử dụng: Tailwind CSS 3.4.17**

**So sánh với CSS truyền thống:**

```jsx
// CSS truyền thống
<button className="submit-button">Submit</button>
// Cần file CSS riêng với .submit-button { ... }

// Tailwind CSS
<button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
  Submit
</button>
```

**Ưu điểm của Tailwind:**

1. **Rapid Development:** Không cần chuyển đổi giữa file HTML và CSS
2. **Consistent Design:** Hệ thống design tokens có sẵn (spacing, colors, typography)
3. **Responsive Design:** Prefix dễ dàng (sm:, md:, lg:, xl:)
4. **PurgeCSS tích hợp:** Loại bỏ CSS không sử dụng, giảm bundle size
5. **Customizable:** Dễ dàng mở rộng qua tailwind.config.js

**Cấu hình Tailwind:**

```javascript
// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        blob: 'blob 7s infinite',
      }
    }
  },
  plugins: []
}
```

#### c) Các thư viện UI/UX bổ sung

| Thư viện | Phiên bản | Mục đích sử dụng |
|----------|-----------|------------------|
| **Lucide React** | 0.536.0 | Icon library với 1000+ icons SVG |
| **DND Kit** | 6.3.1 | Drag and Drop cho ordering questions |
| **React Quill** | 2.0.3 | Rich Text Editor cho question content |
| **Canvas Confetti** | 1.9.4 | Hiệu ứng confetti khi hoàn thành quiz |
| **QRCode** | 1.5.6 | Tạo QR code cho multiplayer room |
| **Howler** | 2.2.4 | Audio playback cho audio questions |
| **React YouTube** | 10.1.0 | Nhúng video YouTube |

#### d) i18next - Internationalization (Đa ngôn ngữ)

**i18next** là framework quốc tế hóa phổ biến nhất cho JavaScript, hỗ trợ React thông qua react-i18next.

**Phiên bản: i18next 25.3.2, react-i18next 15.6.1**

**Cấu trúc file ngôn ngữ:**

```
public/locales/
├── vi/
│   ├── common.json      # Chung
│   ├── auth.json        # Xác thực
│   ├── quiz.json        # Quiz
│   ├── admin.json       # Admin
│   └── multiplayer.json # Multiplayer
└── en/
    ├── common.json
    ├── auth.json
    └── ...
```

**Sử dụng trong component:**

```tsx
import { useTranslation } from 'react-i18next';

const QuizCard: React.FC = () => {
  const { t } = useTranslation('quiz');
  
  return (
    <div>
      <h2>{t('quiz.startQuiz')}</h2>
      <p>{t('quiz.questionsCount', { count: 10 })}</p>
    </div>
  );
};
```

---

## 1.4. Cơ sở nền tảng phía máy chủ và dữ liệu (Backend – Firebase)

### 1.4.1. Mô hình kiến trúc Serverless trong phát triển hệ thống web

#### a) Khái niệm Serverless

**Serverless** là mô hình điện toán đám mây trong đó nhà cung cấp dịch vụ (cloud provider) quản lý hoàn toàn hạ tầng máy chủ. Developer chỉ cần tập trung vào code logic nghiệp vụ mà không cần quan tâm đến việc cung cấp, quản lý, mở rộng server.

**Đặc điểm của Serverless:**

| Đặc điểm | Mô tả |
|----------|-------|
| **No Server Management** | Không cần quản lý, patch, update server |
| **Auto-scaling** | Tự động scale theo lưu lượng |
| **Pay-per-use** | Chỉ trả tiền khi code thực thi |
| **Event-driven** | Kích hoạt bởi events (HTTP request, database change...) |
| **Stateless** | Mỗi function invocation độc lập |

#### b) Firebase - Backend as a Service (BaaS)

**Firebase** là nền tảng phát triển ứng dụng của Google, cung cấp đầy đủ các dịch vụ backend theo mô hình serverless.

**Các dịch vụ Firebase sử dụng trong dự án:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Auth        │  │ Firestore   │  │ Realtime    │            │
│  │             │  │ Database    │  │ Database    │            │
│  │ • Email/Pwd │  │ • NoSQL     │  │ • Real-time │            │
│  │ • Sessions  │  │ • Documents │  │ • JSON Tree │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Cloud       │  │ Cloud       │  │ Firebase    │            │
│  │ Storage     │  │ Functions   │  │ Hosting     │            │
│  │ • Files     │  │ • Serverless│  │ • CDN       │            │
│  │ • Media     │  │ • Node.js   │  │ • SSL       │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4.2. Cơ chế xác thực và quản lý người dùng

**Firebase Authentication** cung cấp dịch vụ xác thực người dùng an toàn, hỗ trợ nhiều phương thức:

**Phương thức sử dụng trong dự án: Email/Password Authentication**

```typescript
// Cấu hình Firebase Auth
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

export const auth = getAuth(app);

// Duy trì session khi đóng trình duyệt
setPersistence(auth, browserLocalPersistence);
```

**Quy trình xác thực:**

```
┌─────────────────────────────────────────────────────────────────┐
│                 AUTHENTICATION FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ĐĂNG KÝ                                                     │
│  ┌──────────┐    ┌─────────────┐    ┌──────────────┐          │
│  │  User    │───▶│ Send OTP   │───▶│ Verify OTP   │          │
│  │  Input   │    │ to Email   │    │ & Create Acc │          │
│  └──────────┘    └─────────────┘    └──────────────┘          │
│                                                                 │
│  2. ĐĂNG NHẬP                                                   │
│  ┌──────────┐    ┌─────────────┐    ┌──────────────┐          │
│  │  Email   │───▶│ Firebase   │───▶│ Return JWT   │          │
│  │  + Pass  │    │ Auth Check │    │ + User Data  │          │
│  └──────────┘    └─────────────┘    └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Hệ thống phân quyền:**

| Role | Quyền hạn |
|------|-----------|
| **User** | Làm quiz, xem kết quả, tham gia multiplayer, chat với AI |
| **Admin** | Tất cả quyền User + Quản lý quiz, users, phê duyệt nội dung |

### 1.4.3. Hệ quản trị cơ sở dữ liệu NoSQL Cloud Firestore

#### a) Giới thiệu Cloud Firestore

**Cloud Firestore** là cơ sở dữ liệu NoSQL hướng document của Firebase, được thiết kế cho ứng dụng mobile và web với khả năng đồng bộ real-time và offline support.

**Đặc điểm:**

| Đặc điểm | Mô tả |
|----------|-------|
| **Document-based** | Dữ liệu lưu trong documents, tổ chức thành collections |
| **Real-time Sync** | Tự động đồng bộ thay đổi đến tất cả clients |
| **Offline Support** | SDK cache dữ liệu, hoạt động khi mất mạng |
| **Scalable** | Tự động scale, hỗ trợ hàng triệu users |
| **Security Rules** | Bảo mật ở tầng database |

#### b) Cấu trúc dữ liệu trong dự án

```
📁 Firestore Database
│
├── 📁 users/{userId}
│   ├── email, displayName, role, photoURL
│   ├── stats: { quizzesCreated, quizzesTaken, totalScore }
│   └── settings: { language, theme }
│
├── 📁 quizzes/{quizId}
│   ├── title, description, category, difficulty
│   ├── status: 'draft' | 'pending' | 'approved' | 'rejected'
│   ├── questions: Question[]
│   ├── resources: LearningResource[]
│   └── stats: { views, attempts, avgScore }
│
├── 📁 quiz_results/{resultId}
│   ├── userId, quizId, score, completedAt
│   └── answers: UserAnswer[]
│
├── 📁 multiplayer_rooms/{roomId}
│   ├── code, hostId, quizId, status
│   └── settings: { maxPlayers, questionTime }
│
└── 📁 match_histories/{matchId}
    ├── roomId, quizId, leaderboard[]
    └── finishedAt, playerCount
```

#### c) Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function signedIn() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return signedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if signedIn();
      allow write: if request.auth.uid == userId || isAdmin();
    }
    
    // Quizzes collection
    match /quizzes/{quizId} {
      allow read: if resource.data.status == 'approved' || 
                    resource.data.createdBy == request.auth.uid ||
                    isAdmin();
      allow create: if signedIn();
      allow update, delete: if resource.data.createdBy == request.auth.uid || isAdmin();
    }
  }
}
```

### 1.4.4. Cơ sở dữ liệu thời gian thực và ứng dụng trong hệ thống tương tác đa người dùng

#### a) Firebase Realtime Database

**Firebase Realtime Database** là cơ sở dữ liệu NoSQL dạng JSON tree, được tối ưu cho đồng bộ real-time với độ trễ cực thấp (< 100ms).

**So sánh Firestore vs Realtime Database:**

| Tiêu chí | Firestore | Realtime Database |
|----------|-----------|-------------------|
| Cấu trúc | Documents & Collections | JSON Tree |
| Queries | Phức tạp, indexing | Đơn giản |
| Offline | Tốt | Rất tốt |
| Real-time latency | ~200-500ms | ~50-100ms |
| Pricing | Per operation | Per bandwidth |
| Use case | Structured data | Live data, presence |

**Ứng dụng trong Multiplayer:**

```
📁 Realtime Database
│
└── 📁 rooms/{roomId}
    ├── 📁 state/
    │   ├── currentQuestionIndex: number
    │   ├── questionStartAt: timestamp
    │   └── gameState: 'lobby' | 'playing' | 'finished'
    │
    ├── 📁 presence/{uid}/
    │   ├── online: boolean
    │   └── lastSeen: timestamp
    │
    ├── 📁 players/{uid}/
    │   ├── name, score, ready
    │   └── answered: boolean
    │
    └── 📁 chat/{messageId}/
        ├── userId, message
        └── timestamp
```

#### b) Kiến trúc Hybrid Storage

Dự án sử dụng **Hybrid Storage Architecture** kết hợp cả Firestore và Realtime Database:

```
┌─────────────────────────────────────────────────────────────────┐
│               HYBRID STORAGE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FIRESTORE (Persistent Data)     RTDB (Live Data)              │
│  ┌─────────────────────────┐    ┌─────────────────────────┐   │
│  │ • Quiz metadata         │    │ • Game state            │   │
│  │ • User profiles         │    │ • Player presence       │   │
│  │ • Quiz results          │    │ • Live scores           │   │
│  │ • Match histories       │    │ • Chat messages         │   │
│  │ • Room configuration    │    │ • Real-time signals     │   │
│  └─────────────────────────┘    └─────────────────────────┘   │
│           │                              │                     │
│           └──────────┬───────────────────┘                     │
│                      ▼                                         │
│              APPLICATION LAYER                                 │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

**Lợi ích:**
- Firestore: Query phức tạp, offline persistence, structured data
- RTDB: Latency thấp cho real-time features, chi phí thấp hơn cho frequent writes

---

*Tiếp theo: BAOCAO_CHUONG1_PHAN3.md - Ứng dụng AI và Phương pháp nghiên cứu*
