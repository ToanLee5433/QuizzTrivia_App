/**
 * 🗂️ Firestore Collections Constants
 * Centralized collection names để tránh typo và dễ maintain
 */

// ============= CORE COLLECTIONS =============
export const COLLECTIONS = {
  // User & Auth
  USERS: 'users',
  USER_STATS: 'user_stats',
  USER_FAVORITES: 'user_favorites',
  USER_QUIZ_ACTIVITIES: 'userQuizActivities',
  USER_QUIZ_SESSIONS: 'userQuizSessions',
  
  // Quiz & Content
  QUIZZES: 'quizzes',
  CATEGORIES: 'categories',
  QUIZ_RESULTS: 'quizResults',
  QUIZ_REVIEWS: 'quizReviews',
  QUIZ_COMPLETIONS: 'quizCompletions',
  
  // Multiplayer
  MULTIPLAYER_ROOMS: 'multiplayer_rooms',
  
  // Learning Materials
  LEARNING_EVENTS: 'learningEvents',
  
  // System
  SYSTEM_NOTIFICATIONS: 'system_notifications',
  MAIL: 'mail', // For email triggers
} as const;

// ============= SUBCOLLECTIONS =============
export const SUBCOLLECTIONS = {
  MULTIPLAYER_PLAYERS: 'players',
  MULTIPLAYER_MESSAGES: 'messages',
} as const;

// ============= COMPOSITE KEYS =============
/**
 * Helper functions để tạo composite document IDs
 */
export const compositeKeys = {
  userQuizSession: (quizId: string, userId: string) => `${quizId}_${userId}`,
  userQuizActivity: (userId: string, quizId: string) => `${userId}_${quizId}`,
  userFavorite: (userId: string) => userId,
  userStats: (userId: string) => userId,
};

// ============= INDEXES =============
/**
 * Document các indexes cần thiết
 * (Tham khảo khi tạo firestore.indexes.json)
 */
export const REQUIRED_INDEXES = [
  {
    collection: COLLECTIONS.SYSTEM_NOTIFICATIONS,
    fields: ['isActive', 'createdAt'],
  },
  {
    collection: COLLECTIONS.QUIZ_RESULTS,
    fields: ['userId', 'completedAt'],
  },
  {
    collection: COLLECTIONS.QUIZ_RESULTS,
    fields: ['quizId', 'score'],
  },
  {
    collection: COLLECTIONS.QUIZZES,
    fields: ['isPublished', 'createdAt'],
  },
  {
    collection: COLLECTIONS.QUIZZES,
    fields: ['category', 'createdAt'],
  },
  {
    collection: COLLECTIONS.QUIZ_REVIEWS,
    fields: ['quizId', 'createdAt'],
  },
  {
    collection: COLLECTIONS.MULTIPLAYER_ROOMS,
    fields: ['code', 'status'],
  },
  {
    collection: COLLECTIONS.LEARNING_EVENTS,
    fields: ['userId', 'quizId', 'timestamp'],
  },
];

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
export type SubcollectionName = typeof SUBCOLLECTIONS[keyof typeof SUBCOLLECTIONS];
