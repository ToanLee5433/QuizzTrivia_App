/**
 * Application Routes Constants
 * Centralized route definitions to avoid literal strings and improve maintainability
 */

export const ROUTES = {
  // Public routes
  HOME: '/',
  LANDING: '/landing',
  
  // Auth routes
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  
  // Quiz routes
  QUIZ_LIST: '/quizzes',
  QUIZ_DETAIL: '/quiz/:id',
  QUIZ_PREVIEW: '/quiz/:id/preview',
  QUIZ_PLAY: '/quiz/:id/play',
  QUIZ_RESULT: '/quiz/:id/result',
  QUIZ_REVIEWS: '/quiz/:id/reviews',
  QUIZ_STATS: '/quiz/:id/stats',
  FAVORITES: '/favorites',
  
  // Creator routes - NEW STRUCTURE
  CREATOR: '/creator',
  CREATOR_MY_QUIZZES: '/creator/my',
  CREATOR_NEW_QUIZ: '/creator/new',
  CREATOR_EDIT_QUIZ: '/creator/edit/:id',
  
  // Admin routes
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_QUIZZES: '/admin/quizzes',
  ADMIN_USERS: '/admin/users',
  ADMIN_CREATORS: '/admin/creators',
  ADMIN_CATEGORIES: '/admin/categories',
  
  // Multiplayer routes
  MULTIPLAYER: '/multiplayer',
  MULTIPLAYER_LOBBY: '/multiplayer/lobby',
  MULTIPLAYER_ROOM: '/multiplayer/room/:roomId',
} as const;

/**
 * Helper functions to generate dynamic routes
 */
export const getQuizDetailPath = (id: string) => `/quiz/${id}`;
export const getQuizPreviewPath = (id: string) => `/quiz/${id}/preview`;
export const getQuizPlayPath = (id: string) => `/quiz/${id}/play`;
export const getQuizResultPath = (id: string) => `/quiz/${id}/result`;
export const getQuizReviewsPath = (id: string) => `/quiz/${id}/reviews`;
export const getQuizStatsPath = (id: string) => `/quiz/${id}/stats`;
export const getCreatorEditQuizPath = (id: string) => `/creator/edit/${id}`;
export const getMultiplayerRoomPath = (roomId: string) => `/multiplayer/room/${roomId}`;
