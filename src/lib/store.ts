import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/store';
import quizReducer from '../features/quiz/store';
// import multiplayerReducer from '../features/multiplayer/components/multiplayerStore';
import { toast } from 'react-toastify';

// Custom error handling middleware
const errorHandlingMiddleware = () => (next: any) => (action: any) => {
  try {
    return next(action);
  } catch (error) {
    console.error('Redux Error:', error);
    toast.error('Đã xảy ra lỗi. Vui lòng tải lại trang.');
    return;
  }
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    quiz: quizReducer,
    // multiplayer: multiplayerReducer,
  },
  middleware: (getDefaultMiddleware) => {
    const defaultMiddleware = getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
          'quiz/fetchQuizzes/fulfilled',
          'quiz/fetchQuizById/fulfilled',
          'multiplayer/setCurrentRoom',
          'multiplayer/updatePlayerInRoom'
        ],
        ignoredPaths: [
          'quiz.quizzes',
          'quiz.currentQuiz',
          'quiz.userResults',
          'multiplayer.currentRoom',
          'multiplayer.currentPlayer'
        ],
      },
      immutableCheck: { warnAfter: 128 },
      thunk: {
        extraArgument: {
          timeout: 10000 // 10 seconds timeout for async actions
        }
      }
    });

    return defaultMiddleware.concat(errorHandlingMiddleware);
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
