import { screen } from '@testing-library/react';
import { renderWithProviders, createMockQuiz, createMockUser } from '../../../__tests__/test-utils';
import QuizCard from '../components/QuizCard';

// Mock Firebase completely to prevent worker issues
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({
    exists: () => false,
    data: () => null
  })),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getFirestore: jest.fn(),
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

jest.mock('../../../lib/firebase/config', () => ({
  db: jest.fn(),
  auth: jest.fn(),
}));

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('QuizCard', () => {
  const mockQuiz = createMockQuiz({
    id: '1',
    title: 'Test Quiz',
    description: 'Test Description',
    category: 'Technology',
    difficulty: 'medium',
    duration: 30,
    tags: ['react', 'javascript'],
    isPublished: true,
  });

  const mockUser = createMockUser();

  const defaultProps = {
    quiz: mockQuiz,
  };

  const defaultState = {
    auth: {
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      needsRoleSelection: false,
      authChecked: true,
    },
    quiz: {
      quizzes: [mockQuiz],
      loading: false,
      error: null,
      currentQuiz: null,
      userResults: [],
      isLoading: false,
      connectionError: false,
      filters: {},
      currentQuestionIndex: 0,
      userAnswers: {},
      timeLeft: 0,
      quizStartTime: null,
      retryCount: 0,
      lastError: null,
      isTimeWarning: false,
      totalTime: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render quiz information correctly', () => {
    renderWithProviders(<QuizCard {...defaultProps} />, {
      preloadedState: defaultState,
    });

    expect(screen.getByText('Test Quiz')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('30m')).toBeInTheDocument(); // Changed from "30 minutes" to "30m"
  });

  it('should display difficulty badge', () => {
    renderWithProviders(<QuizCard {...defaultProps} />, {
      preloadedState: defaultState,
    });

    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('should display tags', () => {
    renderWithProviders(<QuizCard {...defaultProps} />, {
      preloadedState: defaultState,
    });

    // Tags appear without # prefix in the component
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('should display favorite button', () => {
    renderWithProviders(<QuizCard {...defaultProps} />, {
      preloadedState: defaultState,
    });

    const favoriteButton = screen.getByTitle('Yêu thích quiz này');
    expect(favoriteButton).toBeInTheDocument();
  });

  it('should have start quiz link', () => {
    renderWithProviders(<QuizCard {...defaultProps} />, {
      preloadedState: defaultState,
    });

    const startLink = screen.getByText(/Start Quiz/i);
    expect(startLink).toBeInTheDocument();
    expect(startLink.closest('a')).toHaveAttribute('href', '/quiz/1');
  });

  it('should display question count', () => {
    renderWithProviders(<QuizCard {...defaultProps} />, {
      preloadedState: defaultState,
    });

    expect(screen.getByText(/1 question/i)).toBeInTheDocument();
  });

  it('should handle quiz without image', () => {
    const quizWithoutImage = {
      ...mockQuiz,
      imageUrl: undefined,
    };

    const props = {
      quiz: quizWithoutImage,
    };

    renderWithProviders(<QuizCard {...props} />, {
      preloadedState: defaultState,
    });

    // Should render without errors
    expect(screen.getByText('Test Quiz')).toBeInTheDocument();
  });

  it('should display published status', () => {
    renderWithProviders(<QuizCard {...defaultProps} />, {
      preloadedState: defaultState,
    });

    // Should show published quiz without "Draft" indicator
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });
});
