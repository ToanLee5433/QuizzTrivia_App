import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Quiz, QuizResult, QuizFilters } from './types';
import * as quizService from './services/quiz';
import { getUserQuizResults } from './api/shared';

// Async thunks
export const fetchQuizzes = createAsyncThunk(
  'quiz/fetchQuizzes',
  async (_: Record<string, never>, { rejectWithValue }) => {
    try {
      const result = await quizService.getQuizzes(undefined, undefined);
      return result.quizzes;
    } catch (error: any) {
      console.error('Failed to fetch quizzes:', error);
      
      if (error.type === 'CONNECTION_ERROR') {
        return rejectWithValue('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.');
      }
      
      if (error.type === 'TIMEOUT_ERROR') {
        return rejectWithValue('Server không phản hồi. Vui lòng thử lại sau.');
      }
      
      return rejectWithValue('Đã có lỗi xảy ra khi tải danh sách quiz. Vui lòng thử lại.');
    }
  }
);

export const fetchQuizById = createAsyncThunk(
  'quiz/fetchQuizById',
  async (quizId: string) => {
    const quiz = await quizService.getQuizById(quizId);
    return quiz;
  }
);

export const fetchUserQuizResults = createAsyncThunk(
  'quiz/fetchUserQuizResults',
  async (userId: string) => {
    const results = await getUserQuizResults(userId);
    return results;
  }
);

// Thêm isTimeWarning và totalTime vào QuizState
interface QuizState {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  userResults: QuizResult[];
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  connectionError: boolean;
  filters: QuizFilters;
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  timeLeft: number;
  quizStartTime: number | null;
  retryCount: number;
  lastError: string | null;
  isTimeWarning: boolean;
  totalTime: number;
}

const initialState: QuizState = {
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

// Fixed Redux store configuration - v2
const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    // Quiz loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Quiz data management
    setQuizzes: (state, action: PayloadAction<Quiz[]>) => {
      state.quizzes = action.payload;
    },
    addQuiz: (state, action: PayloadAction<Quiz>) => {
      state.quizzes.unshift(action.payload);
    },
    updateQuiz: (state, action: PayloadAction<Quiz>) => {
      const index = state.quizzes.findIndex(q => q.id === action.payload.id);
      if (index !== -1) {
        state.quizzes[index] = action.payload;
      }
    },
    removeQuiz: (state, action: PayloadAction<string>) => {
      state.quizzes = state.quizzes.filter(q => q.id !== action.payload);
    },
    
    // Current quiz management
    setCurrentQuiz: (state, action: PayloadAction<Quiz | null>) => {
      state.currentQuiz = action.payload;
      if (action.payload) {
        state.currentQuestionIndex = 0;
        state.userAnswers = {};
        state.totalTime = action.payload.duration * 60; // Tổng thời gian (giây)
        state.timeLeft = state.totalTime;
        state.quizStartTime = Date.now();
        state.isTimeWarning = false;
      } else {
        state.currentQuestionIndex = 0;
        state.userAnswers = {};
        state.timeLeft = 0;
        state.quizStartTime = null;
        state.totalTime = 0;
        state.isTimeWarning = false;
      }
    },

    // Cập nhật timeLeft dựa trên thời gian thực tế đã trôi qua
    updateTimeLeft: (state) => {
      if (state.quizStartTime && state.totalTime > 0) {
        const elapsed = Math.floor((Date.now() - state.quizStartTime) / 1000);
        const newTimeLeft = Math.max(state.totalTime - elapsed, 0);
        state.timeLeft = newTimeLeft;
        // Cảnh báo khi còn <= 10% tổng thời gian
        state.isTimeWarning = newTimeLeft <= Math.ceil(state.totalTime * 0.1);
      }
    },

    // Giữ decrementTime cho trường hợp đặc biệt
    decrementTime: (state) => {
      if (state.timeLeft > 0) {
        state.timeLeft -= 1;
        // Cảnh báo khi còn <= 10% tổng thời gian
        state.isTimeWarning = state.timeLeft <= Math.ceil(state.totalTime * 0.1);
      }
    },
    
    // Answer management
    setUserAnswer: (state, action: PayloadAction<{ questionId: string; answerId: string }>) => {
      state.userAnswers[action.payload.questionId] = action.payload.answerId;
    },
    clearUserAnswers: (state) => {
      state.userAnswers = {};
    },
    
    // Timer management
    setTimeLeft: (state, action: PayloadAction<number>) => {
      state.timeLeft = action.payload;
    },
    
    // Results management
    setUserResults: (state, action: PayloadAction<QuizResult[]>) => {
      state.userResults = action.payload;
    },
    addUserResult: (state, action: PayloadAction<QuizResult>) => {
      state.userResults.unshift(action.payload);
    },
    
    // Filters
    setFilters: (state, action: PayloadAction<QuizFilters>) => {
      state.filters = action.payload;
    },
    updateFilter: (state, action: PayloadAction<Partial<QuizFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    
    // Reset quiz state
    resetQuizState: (state) => {
      state.currentQuiz = null;
      state.currentQuestionIndex = 0;
      state.userAnswers = {};
      state.timeLeft = 0;
      state.quizStartTime = null;
      state.totalTime = 0;
      state.isTimeWarning = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuizzes.pending, (state) => {
        state.loading = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuizzes.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoading = false;
        // Now action.payload is just the quizzes array
        state.quizzes = action.payload;
      })
      .addCase(fetchQuizzes.rejected, (state, action) => {
        state.loading = false;
        state.isLoading = false;
        state.error = action.error.message || 'Lỗi khi tải quiz';
      })
      // Handle single quiz fetch
      .addCase(fetchQuizById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuizById.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.currentQuiz = action.payload;
          // Also add to quizzes array if not exists
          const exists = state.quizzes.find(q => q.id === action.payload!.id);
          if (!exists) {
            state.quizzes.push(action.payload);
          }
        }
      })
      .addCase(fetchQuizById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Lỗi khi tải quiz';
      })
      .addCase(fetchUserQuizResults.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserQuizResults.fulfilled, (state, action) => {
        state.loading = false;
        state.userResults = action.payload;
      })
      .addCase(fetchUserQuizResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Lỗi khi tải kết quả quiz';
      });
  },
});

export const {
  setQuizzes,
  setCurrentQuiz,
  decrementTime,
  updateTimeLeft,
  resetQuizState,
  addUserResult,
  setFilters,
  updateFilter,
  clearFilters,
  setUserResults,
  setUserAnswer,
  clearUserAnswers,
  setTimeLeft,
  setLoading,
  setError,
  addQuiz,
  updateQuiz,
  removeQuiz,
} = quizSlice.actions;

export default quizSlice.reducer;
