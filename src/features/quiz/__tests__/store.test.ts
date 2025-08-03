import quizReducer, {
  setQuizzes,
  setCurrentQuiz,
  decrementTime,
  updateTimeLeft,
  resetQuizState,
  addUserResult,
  setFilters,
  updateFilter,
  clearFilters,
  fetchQuizzes,
  fetchQuizById,
} from '../store';
import { Quiz, QuizResult, QuizFilters } from '../types';

// Mock data
const mockQuiz: Quiz = {
  id: 'quiz-1',
  title: 'Test Quiz',
  description: 'A test quiz',
  category: 'Technology',
  difficulty: 'medium',
  questions: [
    {
      id: 'q1',
      text: 'What is React?',
      type: 'multiple',
      answers: [
        { id: 'a1', text: 'Library', isCorrect: true },
        { id: 'a2', text: 'Framework', isCorrect: false },
      ],
      points: 10,
    },
  ],
  duration: 30,
  createdBy: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  isPublished: true,
  tags: ['react', 'javascript'],
};

const mockQuizResult: QuizResult = {
  id: 'result-1',
  quizId: 'quiz-1',
  userId: 'user-1',
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
};

describe('Quiz Reducer', () => {
  const initialState = {
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
  };

  it('should return the initial state', () => {
    expect(quizReducer(undefined, { type: undefined })).toEqual(initialState);
  });

  describe('setQuizzes', () => {
    it('should set quizzes array', () => {
      const quizzes = [mockQuiz];
      const result = quizReducer(initialState, setQuizzes(quizzes));

      expect(result.quizzes).toEqual(quizzes);
    });

    it('should replace existing quizzes', () => {
      const existingState = { ...initialState, quizzes: [mockQuiz] };
      const newQuizzes = [{ ...mockQuiz, id: 'quiz-2', title: 'New Quiz' }];
      
      const result = quizReducer(existingState, setQuizzes(newQuizzes));

      expect(result.quizzes).toEqual(newQuizzes);
      expect(result.quizzes).toHaveLength(1);
    });
  });

  describe('setCurrentQuiz', () => {
    it('should set current quiz and initialize timer state', () => {
      const result = quizReducer(initialState, setCurrentQuiz(mockQuiz));

      expect(result.currentQuiz).toEqual(mockQuiz);
      expect(result.currentQuestionIndex).toBe(0);
      expect(result.userAnswers).toEqual({});
      expect(result.totalTime).toBe(mockQuiz.duration * 60); // 30 minutes * 60 seconds
      expect(result.timeLeft).toBe(mockQuiz.duration * 60);
      expect(result.quizStartTime).toBeGreaterThan(Date.now() - 1000); // Recent timestamp
      expect(result.isTimeWarning).toBe(false);
    });

    it('should clear quiz state when setting null', () => {
      const stateWithQuiz = {
        ...initialState,
        currentQuiz: mockQuiz,
        currentQuestionIndex: 5,
        userAnswers: { q1: 'a1' },
        timeLeft: 500,
        quizStartTime: Date.now(),
        totalTime: 1800,
        isTimeWarning: true,
      };

      const result = quizReducer(stateWithQuiz, setCurrentQuiz(null));

      expect(result.currentQuiz).toBe(null);
      expect(result.currentQuestionIndex).toBe(0);
      expect(result.userAnswers).toEqual({});
      expect(result.timeLeft).toBe(0);
      expect(result.quizStartTime).toBe(null);
      expect(result.totalTime).toBe(0);
      expect(result.isTimeWarning).toBe(false);
    });
  });

  describe('decrementTime', () => {
    it('should decrement time by 1 when time left > 0', () => {
      const stateWithTime = {
        ...initialState,
        timeLeft: 100,
        totalTime: 1000,
      };

      const result = quizReducer(stateWithTime, decrementTime());

      expect(result.timeLeft).toBe(99);
    });

    it('should not go below 0', () => {
      const stateWithTime = {
        ...initialState,
        timeLeft: 0,
        totalTime: 1000,
      };

      const result = quizReducer(stateWithTime, decrementTime());

      expect(result.timeLeft).toBe(0);
    });

    it('should set time warning when time left <= 10% of total time', () => {
      const stateWithTime = {
        ...initialState,
        timeLeft: 101, // Just above 10% of 1000
        totalTime: 1000,
        isTimeWarning: false,
      };

      const result = quizReducer(stateWithTime, decrementTime());

      expect(result.timeLeft).toBe(100); // Exactly 10%
      expect(result.isTimeWarning).toBe(true);
    });
  });

  describe('updateTimeLeft', () => {
    it('should calculate time left based on elapsed time', () => {
      const startTime = Date.now() - 5000; // 5 seconds ago
      const stateWithTimer = {
        ...initialState,
        quizStartTime: startTime,
        totalTime: 100, // 100 seconds total
        timeLeft: 100, // Initial value
      };

      const result = quizReducer(stateWithTimer, updateTimeLeft());

      expect(result.timeLeft).toBe(95); // 100 - 5 seconds elapsed
    });

    it('should not go below 0 even if elapsed time exceeds total time', () => {
      const startTime = Date.now() - 150000; // 150 seconds ago
      const stateWithTimer = {
        ...initialState,
        quizStartTime: startTime,
        totalTime: 100, // 100 seconds total
        timeLeft: 50,
      };

      const result = quizReducer(stateWithTimer, updateTimeLeft());

      expect(result.timeLeft).toBe(0);
    });

    it('should not update if no quiz start time', () => {
      const stateWithoutTimer = {
        ...initialState,
        quizStartTime: null,
        totalTime: 100,
        timeLeft: 50,
      };

      const result = quizReducer(stateWithoutTimer, updateTimeLeft());

      expect(result.timeLeft).toBe(50); // Unchanged
    });
  });

  describe('addUserResult', () => {
    it('should add user result to the beginning of results array', () => {
      const existingResult = { ...mockQuizResult, id: 'result-2' };
      const stateWithResults = {
        ...initialState,
        userResults: [existingResult],
      };

      const result = quizReducer(stateWithResults, addUserResult(mockQuizResult));

      expect(result.userResults).toHaveLength(2);
      expect(result.userResults[0]).toEqual(mockQuizResult); // New result at beginning
      expect(result.userResults[1]).toEqual(existingResult);
    });
  });

  describe('Filter actions', () => {
    describe('setFilters', () => {
      it('should set filters', () => {
        const filters: QuizFilters = {
          category: 'Technology',
          difficulty: 'hard',
          searchTerm: 'React',
        };

        const result = quizReducer(initialState, setFilters(filters));

        expect(result.filters).toEqual(filters);
      });
    });

    describe('updateFilter', () => {
      it('should update specific filter properties', () => {
        const stateWithFilters = {
          ...initialState,
          filters: {
            category: 'Science',
            difficulty: 'easy' as const,
            searchTerm: 'old search',
          },
        };

        const result = quizReducer(
          stateWithFilters,
          updateFilter({ searchTerm: 'new search', difficulty: 'hard' })
        );

        expect(result.filters).toEqual({
          category: 'Science', // Unchanged
          difficulty: 'hard', // Updated
          searchTerm: 'new search', // Updated
        });
      });
    });

    describe('clearFilters', () => {
      it('should clear all filters', () => {
        const stateWithFilters = {
          ...initialState,
          filters: {
            category: 'Technology',
            difficulty: 'hard' as const,
            searchTerm: 'React',
          },
        };

        const result = quizReducer(stateWithFilters, clearFilters());

        expect(result.filters).toEqual({});
      });
    });
  });

  describe('resetQuizState', () => {
    it('should reset all quiz-related state', () => {
      const stateWithQuizData = {
        ...initialState,
        currentQuiz: mockQuiz,
        currentQuestionIndex: 5,
        userAnswers: { q1: 'a1', q2: 'a2' },
        timeLeft: 500,
        quizStartTime: Date.now(),
        totalTime: 1800,
        isTimeWarning: true,
      };

      const result = quizReducer(stateWithQuizData, resetQuizState());

      expect(result.currentQuiz).toBe(null);
      expect(result.currentQuestionIndex).toBe(0);
      expect(result.userAnswers).toEqual({});
      expect(result.timeLeft).toBe(0);
      expect(result.quizStartTime).toBe(null);
      expect(result.totalTime).toBe(0);
      expect(result.isTimeWarning).toBe(false);
    });
  });
});

// Async thunk tests
describe('Quiz Async Thunks', () => {

  describe('fetchQuizzes', () => {
    it('should handle pending state', () => {
      const action = { type: fetchQuizzes.pending.type };
      const result = quizReducer(undefined, action);

      expect(result.loading).toBe(true);
      expect(result.isLoading).toBe(true);
      expect(result.error).toBe(null);
    });

    it('should handle fulfilled state', () => {
      const quizzes = [mockQuiz];
      const action = {
        type: fetchQuizzes.fulfilled.type,
        payload: quizzes,
      };
      const result = quizReducer(undefined, action);

      expect(result.loading).toBe(false);
      expect(result.isLoading).toBe(false);
      expect(result.quizzes).toEqual(quizzes);
    });

    it('should handle rejected state', () => {
      const action = {
        type: fetchQuizzes.rejected.type,
        error: { message: 'Network error' },
      };
      const result = quizReducer(undefined, action);

      expect(result.loading).toBe(false);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should use default error message if none provided', () => {
      const action = {
        type: fetchQuizzes.rejected.type,
        error: {},
      };
      const result = quizReducer(undefined, action);

      expect(result.error).toBe('Lỗi khi tải quiz');
    });
  });

  describe('fetchQuizById', () => {
    it('should handle pending state', () => {
      const action = { type: fetchQuizById.pending.type };
      const result = quizReducer(undefined, action);

      expect(result.loading).toBe(true);
      expect(result.error).toBe(null);
    });

    it('should handle fulfilled state', () => {
      const action = {
        type: fetchQuizById.fulfilled.type,
        payload: mockQuiz,
      };
      const result = quizReducer(undefined, action);

      expect(result.loading).toBe(false);
      expect(result.currentQuiz).toEqual(mockQuiz);
      expect(result.quizzes).toContain(mockQuiz); // Should also add to quizzes array
    });

    it('should not duplicate quiz in quizzes array if already exists', () => {
      const initialStateWithQuiz = {
        ...quizReducer(undefined, { type: undefined }),
        quizzes: [mockQuiz],
      };

      const action = {
        type: fetchQuizById.fulfilled.type,
        payload: mockQuiz,
      };
      const result = quizReducer(initialStateWithQuiz, action);

      expect(result.quizzes).toHaveLength(1); // Should not duplicate
      expect(result.currentQuiz).toEqual(mockQuiz);
    });

    it('should handle rejected state', () => {
      const action = {
        type: fetchQuizById.rejected.type,
        error: { message: 'Quiz not found' },
      };
      const result = quizReducer(undefined, action);

      expect(result.loading).toBe(false);
      expect(result.error).toBe('Quiz not found');
    });
  });

  describe('Edge cases and state consistency', () => {
    it('should maintain state immutability', () => {
      const state = quizReducer(undefined, { type: undefined });
      const originalState = JSON.parse(JSON.stringify(state));

      quizReducer(state, setQuizzes([mockQuiz]));

      // Original state should remain unchanged
      expect(state).toEqual(originalState);
    });

    it('should handle rapid state changes correctly', () => {
      let state = quizReducer(undefined, { type: undefined });

      state = quizReducer(state, setQuizzes([mockQuiz]));
      expect(state.quizzes).toHaveLength(1);

      state = quizReducer(state, setCurrentQuiz(mockQuiz));
      expect(state.currentQuiz).toEqual(mockQuiz);

      state = quizReducer(state, resetQuizState());
      expect(state.currentQuiz).toBe(null);
      expect(state.quizzes).toHaveLength(1); // Quizzes should remain
    });
  });
});
