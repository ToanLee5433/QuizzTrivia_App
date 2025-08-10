// API Routes
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  QUIZ: {
    LIST: '/quiz',
    CREATE: '/quiz',
    UPDATE: '/quiz/:id',
    DELETE: '/quiz/:id',
    GET_BY_ID: '/quiz/:id',
  },
  USER: {
    PROFILE: '/user/profile',
    STATS: '/user/stats',
    UPDATE: '/user/update',
  },
} as const;

// Quiz Categories
export const QUIZ_CATEGORIES = [
  'Công nghệ',
  'Khoa học',
  'Lịch sử',
  'Địa lý',
  'Thể thao',
  'Giải trí',
  'Âm nhạc',
  'Phim ảnh',
  'Văn học',
  'Toán học',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Tiếng Anh',
  'Kinh tế',
  'Chính trị',
] as const;

// Quiz Difficulties
export const QUIZ_DIFFICULTIES = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  DRAFT_QUIZ: 'draft_quiz',
  RECENT_SEARCHES: 'recent_searches',
} as const;

// Default Values
export const DEFAULTS = {
  QUIZ_DURATION: 5, // minutes - set to 5 minutes for easy testing of timer
  QUESTIONS_PER_QUIZ: 10,
  POINTS_PER_QUESTION: 10,
  THEME: 'light',
  LANGUAGE: 'vi',
} as const;

// Validation Rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  QUIZ_TITLE_MIN_LENGTH: 5,
  QUIZ_TITLE_MAX_LENGTH: 100,
  QUIZ_DESCRIPTION_MAX_LENGTH: 500,
  QUESTION_TEXT_MAX_LENGTH: 300,
  ANSWER_TEXT_MAX_LENGTH: 200,
  MAX_ANSWERS_PER_QUESTION: 4,
  MIN_ANSWERS_PER_QUESTION: 2,
} as const;

// Error Messages - These should be replaced with i18n keys in components
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'messages.networkError',
  UNAUTHORIZED: 'messages.unauthorized',
  QUIZ_NOT_FOUND: 'messages.notFound',
  INVALID_CREDENTIALS: 'auth.errors.invalidCredential',
  EMAIL_ALREADY_EXISTS: 'auth.errors.emailExists',
  WEAK_PASSWORD: 'auth.errors.weakPassword',
} as const;

// Success Messages - These should be replaced with i18n keys in components
export const SUCCESS_MESSAGES = {
  QUIZ_CREATED: 'quiz.createSuccess',
  QUIZ_UPDATED: 'quiz.updateSuccess',
  QUIZ_DELETED: 'quiz.deleteSuccess',
  PROFILE_UPDATED: 'profile.profileUpdateSuccess',
  LOGIN_SUCCESS: 'auth.loginSuccess',
  REGISTER_SUCCESS: 'auth.registerSuccess',
} as const;

// Animation Durations (in milliseconds)
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Breakpoints for responsive design
export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  '2XL': '1536px',
} as const;
