# 4.1.2. CÔNG CỤ HỖ TRỢ KIỂM THỬ

---

## Tổng quan

Hệ thống QuizTrivia App sử dụng bộ công cụ kiểm thử hiện đại, bao gồm các framework testing chuyên dụng cho React, công cụ đánh giá hiệu năng, và môi trường giả lập backend. Các công cụ này được lựa chọn dựa trên tính tương thích với stack công nghệ và độ phổ biến trong cộng đồng phát triển.

---

## 1. Jest - Unit Testing Framework

### 1.1. Giới thiệu

**Jest** là framework testing JavaScript được phát triển bởi Facebook (Meta), được sử dụng rộng rãi cho các dự án React. Jest cung cấp giải pháp "all-in-one" với test runner, assertion library, và mocking capabilities.

### 1.2. Phiên bản và Cấu hình

```javascript
// Phiên bản: Jest 29.7.0
// File cấu hình: config/jest.config.cjs

module.exports = {
  // Môi trường test: jsdom (giả lập DOM browser)
  testEnvironment: 'jsdom',
  
  // Transform TypeScript files
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node'
      }
    }]
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Module aliases
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/__tests__/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Test patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}'
  ],
  
  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx'
  ]
};
```

### 1.3. Các loại Test được thực hiện

#### 1.3.1. Unit Tests cho Logic Functions

```typescript
// Ví dụ: Test hàm tính điểm quiz
// src/features/quiz/utils/__tests__/scoring.test.ts

import { calculateScore, calculateComboBonus } from '../scoring';

describe('Quiz Scoring Logic', () => {
  describe('calculateScore', () => {
    it('should return full points for correct answer', () => {
      const result = calculateScore({
        isCorrect: true,
        basePoints: 100,
        timeSpent: 5,
        timeLimit: 30
      });
      expect(result.points).toBeGreaterThan(0);
    });

    it('should return 0 points for incorrect answer', () => {
      const result = calculateScore({
        isCorrect: false,
        basePoints: 100,
        timeSpent: 5,
        timeLimit: 30
      });
      expect(result.points).toBe(0);
    });

    it('should give time bonus for fast answers', () => {
      const fastAnswer = calculateScore({
        isCorrect: true,
        basePoints: 100,
        timeSpent: 2,    // Nhanh
        timeLimit: 30
      });
      
      const slowAnswer = calculateScore({
        isCorrect: true,
        basePoints: 100,
        timeSpent: 25,   // Chậm
        timeLimit: 30
      });
      
      expect(fastAnswer.points).toBeGreaterThan(slowAnswer.points);
    });
  });

  describe('calculateComboBonus', () => {
    it('should return 0 for streak < 2', () => {
      expect(calculateComboBonus(1)).toBe(0);
    });

    it('should return bonus for streak >= 2', () => {
      expect(calculateComboBonus(3)).toBeGreaterThan(0);
    });

    it('should cap bonus at max streak', () => {
      const bonus5 = calculateComboBonus(5);
      const bonus10 = calculateComboBonus(10);
      expect(bonus10).toBeLessThanOrEqual(bonus5 * 3);
    });
  });
});
```

#### 1.3.2. Unit Tests cho Services

```typescript
// Ví dụ: Test AI Question Generator Service
// src/services/__tests__/geminiAI.test.ts

import { geminiAI } from '../geminiAI';

// Mock Firebase Functions
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn()
}));

describe('Gemini AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateQuestions', () => {
    it('should call Cloud Function with correct params', async () => {
      const mockResult = {
        data: {
          success: true,
          questions: [
            { text: 'Question 1?', answers: [] }
          ]
        }
      };
      
      const httpsCallable = require('firebase/functions').httpsCallable;
      httpsCallable.mockReturnValue(jest.fn().mockResolvedValue(mockResult));

      const result = await geminiAI.generateQuestions(
        'JavaScript basics',
        'medium',
        5
      );

      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(1);
    });

    it('should handle timeout errors gracefully', async () => {
      const httpsCallable = require('firebase/functions').httpsCallable;
      httpsCallable.mockReturnValue(
        jest.fn().mockRejectedValue(new Error('timeout'))
      );

      const result = await geminiAI.generateQuestions('topic', 'easy', 3);

      expect(result.success).toBe(false);
      expect(result.error).toContain('quá tải');
    });
  });
});
```

### 1.4. Commands

```bash
# Chạy tất cả tests
npm test

# Chạy tests trong watch mode (development)
npm run test:watch

# Chạy tests với coverage report
npm run test:coverage

# Chạy tests cho CI/CD
npm run test:ci
```

### 1.5. Coverage Targets

| Metric | Target | Hiện tại |
|--------|--------|----------|
| **Statements** | > 70% | ~65% |
| **Branches** | > 60% | ~55% |
| **Functions** | > 70% | ~68% |
| **Lines** | > 70% | ~65% |

---

## 2. React Testing Library - Component Testing

### 2.1. Giới thiệu

**React Testing Library** (RTL) là thư viện testing cho React components, tập trung vào việc test từ góc độ người dùng thay vì implementation details. RTL khuyến khích viết tests dựa trên cách người dùng tương tác với UI.

### 2.2. Phiên bản

```json
{
  "@testing-library/react": "^16.3.0",
  "@testing-library/jest-dom": "^6.6.4",
  "@testing-library/user-event": "^14.6.1"
}
```

### 2.3. Triết lý Testing

> "The more your tests resemble the way your software is used, the more confidence they can give you."
> — Kent C. Dodds (Tác giả RTL)

**Nguyên tắc:**
1. Test behavior, không test implementation
2. Query elements như người dùng thấy (role, label, text)
3. Tránh test internal state hoặc props
4. Prefer `userEvent` over `fireEvent`

### 2.4. Ví dụ Component Tests

#### 2.4.1. Test Login Form

```typescript
// src/features/auth/components/__tests__/LoginForm.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';
import { BrowserRouter } from 'react-router-dom';

// Wrapper với Router (vì component dùng useNavigate)
const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>{ui}</BrowserRouter>
  );
};

describe('LoginForm Component', () => {
  it('should render email and password fields', () => {
    renderWithRouter(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đăng nhập/i })).toBeInTheDocument();
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Blur để trigger validation
    
    await waitFor(() => {
      expect(screen.getByText(/email không hợp lệ/i)).toBeInTheDocument();
    });
  });

  it('should call onSubmit with credentials', async () => {
    const mockSubmit = jest.fn();
    const user = userEvent.setup();
    
    renderWithRouter(<LoginForm onSubmit={mockSubmit} />);
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  it('should show loading state when submitting', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginForm />);
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText(/đang đăng nhập/i)).toBeInTheDocument();
  });
});
```

#### 2.4.2. Test Quiz Card Component

```typescript
// src/features/quiz/components/__tests__/QuizCard.test.tsx

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizCard } from '../QuizCard';
import { BrowserRouter } from 'react-router-dom';

const mockQuiz = {
  id: 'quiz-123',
  title: 'JavaScript Cơ Bản',
  description: 'Bài quiz về JavaScript cho người mới bắt đầu',
  category: 'Programming',
  difficulty: 'easy',
  questionCount: 10,
  duration: 15,
  thumbnail: '/images/js-quiz.png',
  createdBy: { name: 'Admin', avatar: '/avatar.png' },
  attempts: 1234,
  averageScore: 75
};

describe('QuizCard Component', () => {
  it('should display quiz information correctly', () => {
    render(
      <BrowserRouter>
        <QuizCard quiz={mockQuiz} />
      </BrowserRouter>
    );
    
    expect(screen.getByText('JavaScript Cơ Bản')).toBeInTheDocument();
    expect(screen.getByText(/10 câu hỏi/i)).toBeInTheDocument();
    expect(screen.getByText(/15 phút/i)).toBeInTheDocument();
    expect(screen.getByText(/1,234 lượt chơi/i)).toBeInTheDocument();
  });

  it('should show difficulty badge with correct color', () => {
    render(
      <BrowserRouter>
        <QuizCard quiz={mockQuiz} />
      </BrowserRouter>
    );
    
    const badge = screen.getByText(/dễ/i);
    expect(badge).toHaveClass('bg-green-100'); // Easy = green
  });

  it('should navigate to quiz preview on click', async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <QuizCard quiz={mockQuiz} />
      </BrowserRouter>
    );
    
    const card = screen.getByRole('link');
    expect(card).toHaveAttribute('href', '/quizzes/quiz-123');
  });

  it('should show favorite button for logged-in users', async () => {
    const user = userEvent.setup();
    const mockOnFavorite = jest.fn();
    
    render(
      <BrowserRouter>
        <QuizCard quiz={mockQuiz} onFavorite={mockOnFavorite} />
      </BrowserRouter>
    );
    
    const favoriteBtn = screen.getByRole('button', { name: /yêu thích/i });
    await user.click(favoriteBtn);
    
    expect(mockOnFavorite).toHaveBeenCalledWith('quiz-123');
  });
});
```

#### 2.4.3. Test Timer Component (Quiz Player)

```typescript
// src/features/quiz/components/__tests__/QuizTimer.test.tsx

import { render, screen, act } from '@testing-library/react';
import { QuizTimer } from '../QuizTimer';

jest.useFakeTimers();

describe('QuizTimer Component', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should display initial time correctly', () => {
    render(<QuizTimer initialTime={30} onTimeUp={jest.fn()} />);
    expect(screen.getByText('00:30')).toBeInTheDocument();
  });

  it('should countdown every second', () => {
    render(<QuizTimer initialTime={30} onTimeUp={jest.fn()} />);
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('00:29')).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText('00:24')).toBeInTheDocument();
  });

  it('should call onTimeUp when timer reaches 0', () => {
    const mockOnTimeUp = jest.fn();
    render(<QuizTimer initialTime={3} onTimeUp={mockOnTimeUp} />);
    
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    expect(mockOnTimeUp).toHaveBeenCalledTimes(1);
  });

  it('should show warning style when time < 10 seconds', () => {
    render(<QuizTimer initialTime={15} onTimeUp={jest.fn()} />);
    
    const timer = screen.getByTestId('quiz-timer');
    expect(timer).not.toHaveClass('text-red-500');
    
    act(() => {
      jest.advanceTimersByTime(6000); // 9 seconds left
    });
    
    expect(timer).toHaveClass('text-red-500', 'animate-pulse');
  });

  it('should pause when isPaused is true', () => {
    const { rerender } = render(
      <QuizTimer initialTime={30} onTimeUp={jest.fn()} isPaused={false} />
    );
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByText('00:28')).toBeInTheDocument();
    
    // Pause
    rerender(
      <QuizTimer initialTime={30} onTimeUp={jest.fn()} isPaused={true} />
    );
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    // Time should not change
    expect(screen.getByText('00:28')).toBeInTheDocument();
  });
});
```

---

## 3. Google Lighthouse - Performance Audit

### 3.1. Giới thiệu

**Google Lighthouse** là công cụ tự động đánh giá chất lượng web pages. Lighthouse audit bao gồm: Performance, Accessibility, Best Practices, SEO, và PWA compliance.

### 3.2. Các chỉ số đánh giá

#### 3.2.1. Performance Metrics

| Metric | Mô tả | Target | Weight |
|--------|-------|--------|--------|
| **FCP** (First Contentful Paint) | Thời gian hiển thị nội dung đầu tiên | < 1.8s | 10% |
| **LCP** (Largest Contentful Paint) | Thời gian hiển thị element lớn nhất | < 2.5s | 25% |
| **TBT** (Total Blocking Time) | Tổng thời gian main thread bị block | < 200ms | 30% |
| **CLS** (Cumulative Layout Shift) | Độ ổn định layout | < 0.1 | 25% |
| **SI** (Speed Index) | Tốc độ hiển thị visual content | < 3.4s | 10% |

#### 3.2.2. PWA Audit Checklist

```
✅ Installable
   ├── Web app manifest meets installability requirements
   ├── Registers a service worker
   └── Has icons with correct sizes (192px, 512px)

✅ PWA Optimized
   ├── Redirects HTTP to HTTPS
   ├── Configured for a custom splash screen
   ├── Sets a theme color for the address bar
   └── Content is sized correctly for the viewport

✅ Offline Support
   ├── Current page responds with a 200 when offline
   ├── start_url responds with a 200 when offline
   └── Page provides alternative content when JavaScript is unavailable
```

### 3.3. Cách chạy Lighthouse Audit

#### 3.3.1. Chrome DevTools

```
1. Mở Chrome DevTools (F12)
2. Tab "Lighthouse"
3. Chọn categories: Performance, PWA, Accessibility, SEO
4. Device: Mobile hoặc Desktop
5. Click "Analyze page load"
```

#### 3.3.2. CLI (Continuous Integration)

```bash
# Cài đặt Lighthouse CLI
npm install -g lighthouse

# Chạy audit
lighthouse https://quiz-trivia-app.web.app \
  --output=html \
  --output-path=./reports/lighthouse.html \
  --chrome-flags="--headless"

# Chạy với budget (fail nếu không đạt target)
lighthouse https://quiz-trivia-app.web.app \
  --budget-path=./lighthouse-budget.json
```

#### 3.3.3. Budget Configuration

```json
// lighthouse-budget.json
[
  {
    "path": "/*",
    "timings": [
      { "metric": "first-contentful-paint", "budget": 2000 },
      { "metric": "largest-contentful-paint", "budget": 3000 },
      { "metric": "cumulative-layout-shift", "budget": 0.1 }
    ],
    "resourceCounts": [
      { "resourceType": "script", "budget": 20 },
      { "resourceType": "image", "budget": 30 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "budget": 500 },
      { "resourceType": "total", "budget": 2000 }
    ]
  }
]
```

### 3.4. Kết quả Lighthouse điển hình

```
┌─────────────────────────────────────────────────────┐
│              LIGHTHOUSE REPORT                      │
│            QuizTrivia App - Desktop                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│   Performance:    🟢 92 / 100                       │
│   Accessibility:  🟢 95 / 100                       │
│   Best Practices: 🟢 100 / 100                      │
│   SEO:            🟢 100 / 100                      │
│   PWA:            🟢 Installable                    │
│                                                     │
│   ─────────────────────────────────────────────     │
│                                                     │
│   First Contentful Paint:   1.2s   🟢               │
│   Largest Contentful Paint: 2.1s   🟢               │
│   Total Blocking Time:      150ms  🟢               │
│   Cumulative Layout Shift:  0.02   🟢               │
│   Speed Index:              2.8s   🟢               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 4. Firebase Emulators - Backend Simulation

### 4.1. Giới thiệu

**Firebase Emulators** là bộ công cụ cho phép chạy các dịch vụ Firebase locally. Điều này giúp kiểm thử mà không ảnh hưởng đến production data và không tốn quota.

### 4.2. Các Emulators được sử dụng

| Emulator | Port | Mục đích |
|----------|------|----------|
| **Authentication** | 9099 | Test đăng ký, đăng nhập, OAuth |
| **Firestore** | 8080 | Test CRUD operations, queries |
| **Realtime Database** | 9000 | Test Multiplayer real-time sync |
| **Cloud Storage** | 9199 | Test file upload/download |
| **Cloud Functions** | 5001 | Test serverless functions |
| **Hosting** | 5000 | Test deployed app locally |
| **Emulator UI** | 4000 | Web UI để quản lý emulators |

### 4.3. Cấu hình Emulators

```json
// firebase.json
{
  "emulators": {
    "auth": {
      "port": 9099,
      "host": "127.0.0.1"
    },
    "firestore": {
      "port": 8080,
      "host": "127.0.0.1"
    },
    "database": {
      "port": 9000,
      "host": "127.0.0.1"
    },
    "storage": {
      "port": 9199,
      "host": "127.0.0.1"
    },
    "functions": {
      "port": 5001,
      "host": "127.0.0.1"
    },
    "hosting": {
      "port": 5000,
      "host": "127.0.0.1"
    },
    "ui": {
      "enabled": true,
      "port": 4000
    },
    "singleProjectMode": true
  }
}
```

### 4.4. Kết nối App với Emulators

```typescript
// src/lib/firebase/config.ts

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const app = initializeApp(firebaseConfig);

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const rtdb = getDatabase(app);
  const storage = getStorage(app);
  const functions = getFunctions(app);

  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectDatabaseEmulator(rtdb, '127.0.0.1', 9000);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  
  console.log('🔧 Connected to Firebase Emulators');
}

export default app;
```

### 4.5. Seed Data cho Testing

```typescript
// scripts/seedEmulatorData.ts

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

async function seedTestData() {
  // Tạo test users
  const testUsers = [
    { uid: 'user-1', email: 'user@test.com', role: 'user' },
    { uid: 'admin-1', email: 'admin@test.com', role: 'admin' },
    { uid: 'creator-1', email: 'creator@test.com', role: 'creator' }
  ];

  for (const user of testUsers) {
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      displayName: user.email.split('@')[0],
      role: user.role,
      createdAt: new Date()
    });
  }

  // Tạo test quizzes
  const testQuizzes = [
    {
      id: 'quiz-1',
      title: 'JavaScript Basics',
      category: 'Programming',
      difficulty: 'easy',
      status: 'approved',
      questionCount: 10,
      questions: [
        {
          id: 'q1',
          text: 'What is JavaScript?',
          type: 'multiple',
          answers: [
            { text: 'Programming Language', isCorrect: true },
            { text: 'Coffee Brand', isCorrect: false },
            { text: 'Island', isCorrect: false },
            { text: 'Framework', isCorrect: false }
          ]
        }
        // ... more questions
      ]
    }
  ];

  for (const quiz of testQuizzes) {
    await db.collection('quizzes').doc(quiz.id).set(quiz);
  }

  console.log('✅ Test data seeded successfully');
}

seedTestData();
```

### 4.6. Chạy Emulators

```bash
# Khởi động tất cả emulators
firebase emulators:start

# Khởi động với seed data đã lưu
firebase emulators:start --import=./emulator-data

# Export data để dùng lại
firebase emulators:export ./emulator-data

# Chạy với specific emulators
firebase emulators:start --only firestore,auth
```

---

## 5. Storybook - Component Documentation & Visual Testing

### 5.1. Giới thiệu

**Storybook** là công cụ phát triển UI components trong môi trường isolated. Storybook cho phép build và test components độc lập với ứng dụng chính.

### 5.2. Phiên bản và Addons

```json
{
  "storybook": "^10.0.7",
  "@storybook/react-vite": "^10.0.7",
  "@storybook/addon-a11y": "^10.0.7",      // Accessibility testing
  "@storybook/addon-actions": "^9.0.8",    // Log actions
  "@storybook/addon-docs": "^10.0.7",      // Documentation
  "@storybook/addon-viewport": "^9.0.8",   // Responsive testing
  "@storybook/addon-vitest": "^10.0.7"     // Integration tests
}
```

### 5.3. Cấu hình

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-actions',
    '@storybook/addon-docs',
    '@storybook/addon-viewport',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  }
};

export default config;
```

### 5.4. Ví dụ Story

```typescript
// src/shared/components/ui/Button.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  }
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button'
  }
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button'
  }
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    children: 'Loading...',
    isLoading: true
  }
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    children: 'Disabled',
    disabled: true
  }
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  )
};
```

### 5.5. Chạy Storybook

```bash
# Development
npm run storybook  # http://localhost:6006

# Build static
npm run build-storybook

# Visual regression with Chromatic
npm run chromatic
```

---

## 6. ESLint - Code Quality

### 6.1. Cấu hình

```javascript
// .eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:storybook/recommended'
  ],
  plugins: [
    'react-refresh',
    'i18next'
  ],
  rules: {
    // React
    'react-refresh/only-export-components': 'warn',
    
    // TypeScript
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // i18n - Đảm bảo không hardcode strings
    'i18next/no-literal-string': ['warn', {
      markupOnly: true,
      ignoreAttribute: ['className', 'style', 'type', 'id']
    }]
  }
};
```

### 6.2. Commands

```bash
# Check linting errors
npm run lint

# Fix auto-fixable errors
npm run lint:fix

# Check with warnings allowed
npm run lint:warn
```

---

## 7. Bảng Tổng hợp Công cụ

| Công cụ | Phiên bản | Loại Test | Mục đích chính |
|---------|-----------|-----------|----------------|
| **Jest** | 29.7.0 | Unit Test | Test logic, services, utilities |
| **React Testing Library** | 16.3.0 | Component Test | Test UI components |
| **Vitest** | 4.0.9 | Unit/Integration | Alternative test runner (Storybook) |
| **Storybook** | 10.0.7 | Visual Test | Component documentation |
| **Google Lighthouse** | CLI/DevTools | Performance | PWA & Performance audit |
| **Firebase Emulators** | Latest | Integration | Backend simulation |
| **ESLint** | 8.55.0 | Static Analysis | Code quality |
| **Chromatic** | 13.3.3 | Visual Regression | UI change detection |
| **Playwright** | 1.56.1 | E2E Test | Browser automation |

---

## Kết luận

Bộ công cụ kiểm thử của QuizTrivia App được xây dựng toàn diện, bao gồm:

1. **Unit Testing (Jest)**: Kiểm thử các hàm logic, services
2. **Component Testing (RTL)**: Kiểm thử UI từ góc độ người dùng
3. **Performance Testing (Lighthouse)**: Đánh giá tốc độ và PWA
4. **Backend Simulation (Firebase Emulators)**: Test an toàn không ảnh hưởng production
5. **Visual Testing (Storybook)**: Documentation và UI consistency
6. **Code Quality (ESLint)**: Đảm bảo code standards

Sự kết hợp các công cụ này giúp đảm bảo chất lượng code và trải nghiệm người dùng của ứng dụng.

---

*Chương 4 - Mục 4.1.2 - Công cụ Hỗ trợ Kiểm thử*
