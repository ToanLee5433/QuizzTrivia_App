/**
 * Flashcard System Type Definitions
 * Defines all types for the offline-first flashcard system with spaced repetition
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// CORE DATA TYPES
// ============================================================================

/**
 * Flashcard Deck - Collection of cards on a topic
 */
export interface FlashcardDeck {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  tags: string[];
  authorId: string;
  authorName: string;
  cardCount: number;
  public: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  
  // Statistics
  totalStudySessions?: number;
  averageRating?: number;
  
  // Sync metadata
  lastSync?: Date;
  syncStatus?: SyncStatus;
}

/**
 * Flashcard - Individual card with front/back content
 */
export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  
  // Media attachments
  frontMedia?: CardMedia;
  backMedia?: CardMedia;
  
  // Metadata
  difficulty?: CardDifficulty;
  tags?: string[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  
  // Sync metadata
  lastSync?: Date;
  syncStatus?: SyncStatus;
}

/**
 * Card Media - Images or audio attachments
 */
export interface CardMedia {
  type: 'image' | 'audio';
  url: string;
  thumbnailUrl?: string;
  
  // For offline support
  localBlobId?: string;
  cached?: boolean;
}

/**
 * Card Difficulty - Predefined or calculated
 */
export type CardDifficulty = 'easy' | 'medium' | 'hard';

// ============================================================================
// SPACED REPETITION TYPES
// ============================================================================

/**
 * Spaced Repetition Data - SM-2 algorithm data per card
 */
export interface SpacedRepetitionData {
  cardId: string;
  deckId: string;
  userId: string;
  
  // SM-2 algorithm values
  eFactor: number; // Ease factor (default: 2.5)
  interval: number; // Days until next review
  repetitions: number; // Number of consecutive correct answers
  
  // Review scheduling
  lastReview: Date;
  nextReview: Date;
  
  // Performance tracking
  totalReviews: number;
  correctReviews: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User's progress for a specific deck
 */
export interface DeckProgress {
  deckId: string;
  userId: string;
  
  // Queue management
  dueQueue: string[]; // Card IDs due for review today
  newQueue: string[]; // Card IDs not yet studied
  
  // Statistics
  cardsStudiedToday: number;
  totalCardsStudied: number;
  currentStreak: number;
  longestStreak: number;
  
  // Performance
  averageAccuracy: number;
  totalStudyTime: number; // in seconds
  
  // Timestamps
  lastStudy: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Review Quality - User response to a card
 */
export enum ReviewQuality {
  FORGOT = 0,    // Quên - Complete blackout
  HARD = 3,      // Khó - Incorrect but remembered with difficulty
  GOOD = 4,      // Được - Correct with hesitation
  EASY = 5       // Nhớ - Perfect recall
}

/**
 * Review Result - Outcome of a single card review
 */
export interface ReviewResult {
  cardId: string;
  quality: ReviewQuality;
  timeSpent: number; // milliseconds
  timestamp: Date;
}

// ============================================================================
// STUDY SESSION TYPES
// ============================================================================

/**
 * Study Session - Active flashcard study session
 */
export interface StudySession {
  id: string;
  deckId: string;
  userId: string;
  
  // Session cards
  cardQueue: string[]; // Card IDs in order
  currentIndex: number;
  
  // Results
  results: ReviewResult[];
  
  // Timing
  startTime: Date;
  endTime?: Date;
  totalTime: number; // seconds
  
  // State
  isComplete: boolean;
  isPaused: boolean;
}

/**
 * Session Summary - Statistics after completing a session
 */
export interface SessionSummary {
  deckId: string;
  deckTitle: string;
  
  // Performance
  cardsReviewed: number;
  correctCards: number;
  accuracy: number; // percentage
  
  // Quality breakdown
  forgot: number;
  hard: number;
  good: number;
  easy: number;
  
  // Timing
  totalTime: number; // seconds
  averageTimePerCard: number; // seconds
  
  // Progress
  cardsRemaining: number;
  nextReviewDate?: Date;
  
  // Streak
  streakIncreased: boolean;
  currentStreak: number;
}

// ============================================================================
// OFFLINE SYNC TYPES
// ============================================================================

/**
 * Sync Status - Status of data synchronization
 */
export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

/**
 * Offline Action - Queued action to sync with Firestore
 */
export interface OfflineAction {
  id: string; // UUID for idempotency
  type: ActionType;
  collection: string;
  documentId: string;
  data: any;
  
  // Metadata
  userId: string;
  createdAt: Date;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  
  // Status
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

/**
 * Action Type - Type of database operation
 */
export type ActionType = 'create' | 'update' | 'delete';

/**
 * Media Blob - Cached media for offline use
 */
export interface MediaBlob {
  id: string;
  cardId: string;
  type: 'image' | 'audio';
  blob: Blob;
  url: string; // Firebase Storage URL
  size: number;
  createdAt: Date;
}

// ============================================================================
// UI COMPONENT PROPS
// ============================================================================

/**
 * Deck Card Props - Props for deck display card
 */
export interface DeckCardProps {
  deck: FlashcardDeck;
  progress?: DeckProgress;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

/**
 * Flash Card Props - Props for 3D flip card
 */
export interface FlashCardProps {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
  showMedia?: boolean;
}

/**
 * Action Bar Props - Props for review action buttons
 */
export interface ActionBarProps {
  onForgot: () => void;
  onHard: () => void;
  onGood: () => void;
  onEasy: () => void;
  disabled?: boolean;
}

/**
 * Progress Strip Props - Props for progress indicator
 */
export interface ProgressStripProps {
  current: number;
  total: number;
  results: ReviewResult[];
}

/**
 * Session Header Props - Props for study session header
 */
export interface SessionHeaderProps {
  deckTitle: string;
  cardsRemaining: number;
  totalCards: number;
  elapsedTime: number;
  onPause: () => void;
  onExit: () => void;
}

// ============================================================================
// SERVICE RETURN TYPES
// ============================================================================

/**
 * Service Result - Generic result wrapper
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Deck List Result - Result of fetching decks
 */
export interface DeckListResult {
  decks: FlashcardDeck[];
  hasMore: boolean;
  cursor?: string;
}

/**
 * Card List Result - Result of fetching cards
 */
export interface CardListResult {
  cards: Flashcard[];
  total: number;
}

// ============================================================================
// HOOKS STATE TYPES
// ============================================================================

/**
 * Study Session State - State managed by useFlashcardSession hook
 */
export interface StudySessionState {
  session: StudySession | null;
  currentCard: Flashcard | null;
  isFlipped: boolean;
  isPaused: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  startSession: (deckId: string) => Promise<void>;
  submitReview: (quality: ReviewQuality) => Promise<void>;
  flipCard: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => Promise<SessionSummary>;
}

/**
 * Offline Sync State - State managed by useOfflineSync hook
 */
export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  lastSync: Date | null;
  error: string | null;
  
  // Actions
  sync: () => Promise<void>;
  clearQueue: () => Promise<void>;
}

// ============================================================================
// FILTER & SORT OPTIONS
// ============================================================================

/**
 * Deck Filter Options
 */
export interface DeckFilterOptions {
  tags?: string[];
  authorId?: string;
  public?: boolean;
  searchQuery?: string;
}

/**
 * Deck Sort Options
 */
export type DeckSortBy = 'title' | 'createdAt' | 'updatedAt' | 'cardCount';
export type SortOrder = 'asc' | 'desc';

export interface DeckSortOptions {
  sortBy: DeckSortBy;
  order: SortOrder;
}

// ============================================================================
// COMPONENT PROPS - Additional
// ============================================================================

/**
 * SyncIndicator Component Props
 */
export interface SyncIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime?: number;
  error?: string;
  onSyncNow?: () => void;
}

/**
 * EmptyState Component Props
 */
export interface EmptyStateProps {
  variant: 'noDecks' | 'noCards' | 'noResults' | 'noDue';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

/**
 * CardEditor Component Props
 */
export interface CardEditorProps {
  card?: Flashcard;
  deckId?: string;
  onSave: (card: Partial<Flashcard>) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  // Add explicit exports if needed for tree-shaking
};
