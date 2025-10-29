/**
 * 📊 Firestore Data Models
 * Type-safe data structures cho tất cả collections
 */

import { Timestamp } from 'firebase/firestore';

// ============= USER MODELS =============
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'user' | 'admin' | 'creator';
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp | null;
  
  // Preferences
  preferences: {
    language: string;
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
  };
}

export interface UserStats {
  userId: string;
  quizzesCreated: number;
  quizzesCompleted: number;
  totalScore: number;
  totalTimeSpent: number; // seconds
  averageScore: number;
  streak: number;
  lastActivityAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserQuizActivity {
  userId: string;
  quizId: string;
  attempts: number;
  bestScore: number;
  lastAttemptAt: Timestamp;
  totalTimeSpent: number;
  completed: boolean;
}

// ============= QUIZ MODELS =============
export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number; // minutes
  
  // Media
  imageUrl: string | null; // ✅ Storage URL
  
  // Content
  questions: Question[];
  resources: LearningResource[]; // 🆕
  
  // Metadata
  tags: string[];
  language: string;
  
  // Creator
  createdBy: string; // User ID
  creatorName: string; // Denormalized
  creatorAvatar: string | null; // Denormalized
  
  // Status
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  isPublished: boolean;
  isPublic: boolean;
  
  // Settings
  allowRetake: boolean;
  showAnswers: boolean;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  passingScore: number;
  
  // Stats
  attempts: number;
  completions: number;
  averageScore: number;
  totalPlayers: number;
  rating: number;
  reviewCount: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt: Timestamp | null;
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple' | 'boolean' | 'text' | 'image';
  imageUrl: string | null; // ✅ Storage URL
  
  answers: Answer[];
  correctAnswer: string | null;
  acceptedAnswers: string[];
  
  explanation: string;
  points: number;
  timeLimit: number | null; // seconds
  order: number;
}

export interface Answer {
  id: string;
  text: string;
  imageUrl: string | null; // ✅ Storage URL
  isCorrect: boolean;
}

// ============= LEARNING RESOURCE MODELS =============
export interface LearningResource {
  id: string;
  type: 'video' | 'pdf' | 'image' | 'audio' | 'link';
  title: string;
  description: string;
  url: string; // ✅ Storage URL or external URL
  
  // Metadata
  duration: number | null; // seconds (for video/audio)
  size: number | null; // bytes
  mimeType: string | null;
  thumbnailUrl: string | null;
  
  // Requirements
  required: boolean;
  threshold: ResourceThreshold;
  estimatedTime: number; // minutes
  
  // Organization
  order: number;
  category: string | null;
}

export interface ResourceThreshold {
  type: 'percentage' | 'pages' | 'time';
  value: number;
  unit: string;
}

// ============= QUIZ RESULTS =============
export interface QuizResult {
  id: string;
  quizId: string;
  quizTitle: string; // Denormalized
  userId: string;
  userName: string; // Denormalized
  userAvatar: string | null; // Denormalized
  
  // Scores
  score: number;
  percentage: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  
  // Timing
  timeSpent: number; // seconds
  startedAt: Timestamp;
  completedAt: Timestamp;
  
  // Details
  answers: QuestionAnswer[];
  
  // Context
  mode: 'normal' | 'multiplayer' | 'practice';
  multiplayerRoomId: string | null;
}

export interface QuestionAnswer {
  questionId: string;
  selectedAnswerId: string | null;
  selectedAnswer: string | null; // For text answers
  isCorrect: boolean;
  points: number;
  timeSpent: number; // seconds
}

// ============= REVIEW & RATING =============
export interface QuizReview {
  id: string;
  quizId: string;
  userId: string;
  userName: string; // Denormalized
  userAvatar: string | null; // Denormalized
  
  rating: number; // 1-5
  comment: string;
  
  // Moderation
  isApproved: boolean;
  isFlagged: boolean;
  
  // Engagement
  helpfulCount: number;
  reportCount: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============= MULTIPLAYER MODELS =============
export interface MultiplayerRoom {
  id: string;
  code: string;
  quizId: string;
  quizTitle: string; // Denormalized
  
  // Host
  hostId: string;
  hostName: string; // Denormalized
  
  // Settings
  maxPlayers: number;
  isPrivate: boolean;
  allowLateJoin: boolean;
  
  // Status
  status: 'waiting' | 'playing' | 'finished';
  currentQuestionIndex: number;
  
  // Stats
  playerCount: number;
  
  // Timestamps
  createdAt: Timestamp;
  startedAt: Timestamp | null;
  finishedAt: Timestamp | null;
  expiresAt: Timestamp;
}

export interface MultiplayerPlayer {
  userId: string;
  userName: string;
  userAvatar: string | null;
  
  isReady: boolean;
  isHost: boolean;
  isOnline: boolean;
  
  score: number;
  correctAnswers: number;
  
  joinedAt: Timestamp;
  lastActivityAt: Timestamp;
}

export interface MultiplayerMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  
  type: 'chat' | 'system' | 'reaction';
  content: string;
  
  createdAt: Timestamp;
}

// ============= LEARNING SESSION =============
export interface UserQuizSession {
  id: string; // Format: `${quizId}_${userId}`
  userId: string;
  quizId: string;
  
  // Progress
  viewedResources: Record<string, ResourceProgress>;
  completionPercent: number;
  ready: boolean; // Can start quiz
  
  // Timestamps
  startedAt: Timestamp;
  updatedAt: Timestamp;
  lastActivityAt: Timestamp;
}

export interface ResourceProgress {
  resourceId: string;
  completed: boolean;
  
  // Video/Audio tracking
  secondsWatched: number;
  watchPercent: number;
  playbackSpeed: number;
  tabBlurred: boolean;
  
  // PDF tracking
  pagesViewed: number[];
  totalPages: number;
  
  // Image tracking
  viewCount: number;
  timeSpent: number;
  
  // Link tracking
  visited: boolean;
  confirmChecked: boolean;
  miniCheckPassed: boolean;
  
  lastActivityAt: Timestamp;
}

// ============= ANALYTICS =============
export interface LearningEvent {
  id: string;
  userId: string;
  quizId: string;
  resourceId: string;
  
  eventType: 
    | 'video_play' 
    | 'video_pause' 
    | 'video_complete'
    | 'pdf_page_view'
    | 'pdf_complete'
    | 'image_view'
    | 'link_visit'
    | 'resource_completed';
  
  metadata: Record<string, any>;
  
  timestamp: Timestamp;
  sessionId: string;
}

// ============= SYSTEM =============
export interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  
  isActive: boolean;
  priority: number;
  
  targetUsers: string[] | null; // null = all users
  
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp | null;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  iconUrl: string; // ✅ Storage URL
  color: string;
  
  quizCount: number;
  order: number;
  isActive: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============= FAVORITES =============
export interface UserFavorites {
  userId: string;
  quizIds: string[];
  updatedAt: Timestamp;
}

// ============= TYPE GUARDS =============
export const isQuiz = (data: any): data is Quiz =>
  data && typeof data.title === 'string' && Array.isArray(data.questions);

export const isUserProfile = (data: any): data is UserProfile =>
  data && typeof data.uid === 'string' && typeof data.email === 'string';

export const isQuizResult = (data: any): data is QuizResult =>
  data && typeof data.quizId === 'string' && typeof data.userId === 'string' && typeof data.score === 'number';

// ============= DATA CLEANERS =============
/**
 * Clean data before saving to Firestore
 * Removes undefined values and applies defaults
 */
export const cleanQuizData = (quiz: Partial<Quiz>): Partial<Quiz> => ({
  ...quiz,
  title: quiz.title || '',
  description: quiz.description || '',
  category: quiz.category || '',
  difficulty: quiz.difficulty || 'medium',
  duration: quiz.duration || 15,
  imageUrl: quiz.imageUrl || null,
  questions: quiz.questions || [],
  resources: quiz.resources || [],
  tags: quiz.tags || [],
  language: quiz.language || 'vi',
  status: quiz.status || 'draft',
  isPublished: quiz.isPublished ?? false,
  isPublic: quiz.isPublic ?? true,
  allowRetake: quiz.allowRetake ?? true,
  showAnswers: quiz.showAnswers ?? true,
  randomizeQuestions: quiz.randomizeQuestions ?? false,
  randomizeAnswers: quiz.randomizeAnswers ?? false,
  passingScore: quiz.passingScore ?? 60,
  attempts: quiz.attempts ?? 0,
  completions: quiz.completions ?? 0,
  averageScore: quiz.averageScore ?? 0,
  totalPlayers: quiz.totalPlayers ?? 0,
  rating: quiz.rating ?? 0,
  reviewCount: quiz.reviewCount ?? 0,
});

export const cleanQuestionData = (question: Partial<Question>): Partial<Question> => ({
  ...question,
  text: question.text || '',
  type: question.type || 'multiple',
  imageUrl: question.imageUrl || null,
  answers: question.answers || [],
  correctAnswer: question.correctAnswer || null,
  acceptedAnswers: question.acceptedAnswers || [],
  explanation: question.explanation || '',
  points: question.points ?? 1,
  timeLimit: question.timeLimit || null,
  order: question.order ?? 0,
});

export const cleanResourceData = (resource: Partial<LearningResource>): Partial<LearningResource> => ({
  ...resource,
  title: resource.title || '',
  description: resource.description || '',
  url: resource.url || '',
  duration: resource.duration || null,
  size: resource.size || null,
  mimeType: resource.mimeType || null,
  thumbnailUrl: resource.thumbnailUrl || null,
  required: resource.required ?? false,
  threshold: resource.threshold || { type: 'percentage', value: 80, unit: '%' },
  estimatedTime: resource.estimatedTime ?? 5,
  order: resource.order ?? 0,
  category: resource.category || null,
});
