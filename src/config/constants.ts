// App constants và configurations
export const APP_CONFIG = {
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  buildDate: import.meta.env.VITE_BUILD_DATE || new Date().toISOString(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'quiz-app-85db6',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD
} as const;

export const AI_CONFIG = {
  maxRequestsPerMinute: 60,
  maxQuestionsPerRequest: 20,
  supportedDifficulties: ['easy', 'medium', 'hard'] as const,
  defaultDifficulty: 'medium' as const
} as const;

export const QUIZ_CONFIG = {
  maxQuestionsPerQuiz: 50,
  maxAnswersPerQuestion: 6,
  minAnswersPerQuestion: 2,
  defaultTimePerQuestion: 30 // seconds
} as const;
