/**
 * Dexie Database Configuration
 * Offline-first IndexedDB for entire application (Flashcard, Quiz, Forum, etc.)
 */

import Dexie, { Table } from 'dexie';
import type {
  FlashcardDeck,
  Flashcard,
  MediaBlob,
  SpacedRepetitionData,
  DeckProgress
} from '../types/flashcard';

// ============================================================================
// ADDITIONAL TYPES FOR QUIZ & FORUM OFFLINE SUPPORT
// ============================================================================

export interface PendingAction {
  id?: number;            // Dexie auto-increment primary key
  actionId: string;       // Client-generated UUID for idempotency
  type: 
    // Flashcard actions
    | 'create_deck' | 'update_deck' | 'delete_deck'
    | 'create_card' | 'update_card' | 'delete_card'
    | 'review_card' | 'update_progress'
    // Quiz actions
    | 'create_quiz' | 'update_quiz' | 'delete_quiz'
    | 'submit_answer' | 'complete_quiz' | 'submit_result'
    // Forum actions
    | 'create_post' | 'update_post' | 'delete_post'
    | 'create_comment' | 'update_comment' | 'delete_comment'
    | 'vote' | 'favorite'
    // Media actions
    | 'upload_media' | 'delete_media'
    // Generic
    | 'custom';
  payload: any;           // Data to send to server
  createdAt: number;      // Timestamp when action was created
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retries: number;        // Number of retry attempts
  lastError?: string;     // Last error message
  priority?: number;      // Higher number = higher priority (default: 0)
  meta?: any;             // Metadata: mediaKeys, related IDs, etc.
  ttl?: number;           // Expiry timestamp (ms since epoch)
  userId?: string;        // User who created this action
}

export interface CachedQuiz {
  id: string;
  title: string;
  description?: string;
  category: string;
  difficulty?: string;
  timeLimit?: number;
  cachedAt: number;
  expiresAt?: number;
  version?: number;       // For cache invalidation
}

export interface CachedQuestion {
  id: string;
  quizId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  cachedAt: number;
}

export interface CachedResult {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  answers: any[];
  completedAt: number;
  synced: boolean;
  quizTitle?: string;
  timeSpent?: number;
}

export interface CachedPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  category: string;
  tags: string[];
  votes: number;
  cachedAt: number;
}

export interface ProcessedAction {
  actionId: string;       // For server-side idempotency check
  processedAt: number;
  userId: string;
}

/**
 * Main Application Database
 * Supports offline-first for Flashcard, Quiz, Forum, and Media
 */
export class AppDatabase extends Dexie {
  // ========================================================================
  // CORE OFFLINE TABLES
  // ========================================================================
  
  /** Pending actions queue - central to offline functionality */
  pending!: Table<PendingAction, number>;
  
  /** Processed actions - for local idempotency check */
  processedActions!: Table<ProcessedAction, string>;
  
  /** Media blobs for offline storage */
  media!: Table<MediaBlob & { mediaKey: string }, number>;
  
  // ========================================================================
  // FLASHCARD TABLES
  // ========================================================================
  
  decks!: Table<FlashcardDeck, string>;
  cards!: Table<Flashcard, string>;
  spacedData!: Table<SpacedRepetitionData, string>;
  deckProgress!: Table<DeckProgress, string>;
  
  // ========================================================================
  // QUIZ TABLES
  // ========================================================================
  
  /** Cached quizzes for offline access */
  quizzes!: Table<CachedQuiz, string>;
  
  /** Cached questions for offline access */
  questions!: Table<CachedQuestion, string>;
  
  /** Quiz results not yet synced */
  results!: Table<CachedResult, string>;
  
  // ========================================================================
  // FORUM TABLES
  // ========================================================================
  
  /** Cached forum posts */
  posts!: Table<CachedPost, string>;

  constructor() {
    super('QuizAppDB');
    
    // ======================================================================
    // VERSION 1: Initial schema
    // ======================================================================
    this.version(1).stores({
      // Core offline tables
      pending: '++id, actionId, status, userId, createdAt, priority, ttl, [status+createdAt], [status+priority]',
      processedActions: 'actionId, userId, processedAt',
      media: '++id, mediaKey, createdAt, size',
      
      // Flashcard tables
      decks: 'id, authorId, public, createdAt, updatedAt, lastSync, syncStatus',
      cards: 'id, deckId, difficulty, createdAt, updatedAt, lastSync, syncStatus',
      spacedData: 'cardId, [deckId+userId], userId, nextReview, lastReview',
      deckProgress: '[deckId+userId], deckId, userId, lastStudy',
      
      // Quiz tables
      quizzes: 'id, category, difficulty, cachedAt, expiresAt',
      questions: 'id, quizId, cachedAt',
      results: 'id, [quizId+userId], userId, quizId, completedAt, synced',
      
      // Forum tables
      posts: 'id, authorId, category, cachedAt'
    });
  }

  /**
   * Clear all data (for logout)
   */
  async clearAllData(): Promise<void> {
    await Promise.all([
      this.pending.clear(),
      this.processedActions.clear(),
      this.media.clear(),
      this.decks.clear(),
      this.cards.clear(),
      this.spacedData.clear(),
      this.deckProgress.clear(),
      this.quizzes.clear(),
      this.questions.clear(),
      this.results.clear(),
      this.posts.clear()
    ]);
  }

  /**
   * Get database size in bytes
   */
  async getDatabaseSize(): Promise<number> {
    // Count rows in each table
    const counts = await Promise.all([
      this.pending.count(),
      this.processedActions.count(),
      this.media.count(),
      this.decks.count(),
      this.cards.count(),
      this.spacedData.count(),
      this.deckProgress.count(),
      this.quizzes.count(),
      this.questions.count(),
      this.results.count(),
      this.posts.count()
    ]);
    
    // Get media blob sizes
    const mediaBlobs = await this.media.toArray();
    const mediaSize = mediaBlobs.reduce((sum: number, blob: any) => sum + (blob.size || 0), 0);
    
    // Rough estimate: 1KB per deck, 500B per card, 200B per other record
    const estimatedSize = 
      counts[0] * 200 + // pending
      counts[1] * 100 + // processedActions
      counts[2] * 0 +   // media (counted separately)
      counts[3] * 1024 + // decks
      counts[4] * 512 + // cards
      counts[5] * 200 + // spacedData
      counts[6] * 200 + // deckProgress
      counts[7] * 1024 + // quizzes
      counts[8] * 512 + // questions
      counts[9] * 512 + // results
      counts[10] * 1024 + // posts
      mediaSize; // actual media size
    
    return estimatedSize;
  }

  /**
   * Check if quota is available
   */
  async hasQuotaAvailable(requiredBytes: number): Promise<boolean> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const available = (estimate.quota || 0) - (estimate.usage || 0);
      return available > requiredBytes;
    }
    return true; // Assume available if API not supported
  }
}

// Create singleton instance
export const db = new AppDatabase();

// Export for testing
export default db;
