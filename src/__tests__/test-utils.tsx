import { configureStore } from '@reduxjs/toolkit';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ReactElement, ReactNode } from 'react';

// Import your reducers
import authReducer from '../features/auth/store';
import quizReducer from '../features/quiz/store';

// Create a test store
export const createTestStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      quiz: quizReducer,
    },
    preloadedState,
  });
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: ReturnType<typeof createTestStore>;
}

export const renderWithProviders = (
  ui: ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  function Wrapper({ children }: { children?: ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

// Mock data generators
export const createMockQuiz = (overrides = {}) => ({
  id: 'mock-quiz-1',
  title: 'Mock Quiz',
  description: 'A mock quiz for testing',
  category: 'Technology',
  difficulty: 'medium' as const,
  questions: [
    {
      id: 'q1',
      text: 'What is React?',
      type: 'multiple' as const,
      answers: [
        { id: 'a1', text: 'Library', isCorrect: true },
        { id: 'a2', text: 'Framework', isCorrect: false },
      ],
      points: 10,
    },
  ],
  duration: 30,
  createdBy: 'test-user',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  isPublished: true,
  tags: ['react', 'javascript'],
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  uid: 'mock-user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
  emailVerified: true,
  role: 'user' as const,
  ...overrides,
});

export const createMockQuizResult = (overrides = {}) => ({
  id: 'mock-result-1',
  quizId: 'mock-quiz-1',
  userId: 'mock-user-1',
  userName: 'Test User',
  userEmail: 'test@example.com',
  score: 80,
  totalQuestions: 10,
  correctAnswers: 8,
  timeSpent: 300,
  answers: [
    {
      questionId: 'q1',
      selectedAnswerId: 'a1',
      isCorrect: true,
      timeSpent: 30,
    },
  ],
  completedAt: new Date('2024-01-01'),
  ...overrides,
});

// Test helpers
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockLocalStorage = () => {
  const store: { [key: string]: string } = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

// Firebase mocks
export const mockFirebaseAuth = {
  currentUser: null,
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
};

export const mockFirestore = {
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
};

// Redux testing utilities
export const createMockAuthState = (overrides = {}) => ({
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  needsRoleSelection: false,
  authChecked: true,
  ...overrides,
});

export const createMockQuizState = (overrides = {}) => ({
  quizzes: [],
  currentQuiz: null,
  userResults: [],
  loading: false,
  isLoading: false,
  error: null,
  connectionError: false,
  filters: {
    category: 'all',
    difficulty: undefined,
    searchTerm: '',
  },
  currentQuestionIndex: 0,
  userAnswers: {},
  timeLeft: 0,
  quizStartTime: null,
  retryCount: 0,
  lastError: null,
  isTimeWarning: false,
  totalTime: 0,
  ...overrides,
});

export * from '@testing-library/react';
export { createTestStore as mockStore };

// Add a simple test to avoid "no tests found" error
describe('Test Utils', () => {
  it('should export test utilities', () => {
    expect(createTestStore).toBeDefined();
    expect(renderWithProviders).toBeDefined();
    expect(createMockQuiz).toBeDefined();
    expect(createMockUser).toBeDefined();
  });
});
