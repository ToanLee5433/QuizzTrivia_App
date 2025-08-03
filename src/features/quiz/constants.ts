// Collection names
export const QUIZZES_COLLECTION = 'quizzes';
export const QUIZ_RESULTS_COLLECTION = 'quiz-results';
export const QUIZ_CATEGORIES_COLLECTION = 'quiz-categories';
export const QUIZ_LEADERBOARD_COLLECTION = 'quiz-leaderboard';

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

// Timeouts and delays
export const REQUEST_TIMEOUT = 15000; // 15 seconds
export const RETRY_DELAY = 1000; // 1 second
export const MAX_RETRIES = 3;

// Cache durations
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Quiz statuses
export const QUIZ_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
} as const;

// Quiz types
export const QUIZ_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  OPEN_ENDED: 'open_ended'
} as const;

// Quiz difficulties
export const QUIZ_DIFFICULTIES = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
} as const;
