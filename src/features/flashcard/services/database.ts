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

// ============================================================================
// DOWNLOADED QUIZ TYPES (Migrated from DownloadManager - Single Source of Truth)
// ============================================================================

export interface DownloadedQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  image?: string;
  audio?: string;
  timeLimit?: number;
}

export interface DownloadedQuiz {
  id: string;
  userId: string;                    // 🔐 SECURITY: Owner of this download
  title: string;
  description?: string;
  category?: string;
  difficulty?: string;
  questions: DownloadedQuizQuestion[];
  coverImage?: string;
  downloadedAt: number;
  updatedAt?: number;                // Track server update time
  version: number;
  size: number;                      // Bytes
  schemaVersion: number;             // Schema migration support
  mediaUrls?: string[];              // Track media for cleanup
  searchKeywords?: string[];         // Tokenized keywords for fast search
  isDownloaded?: boolean;            // 🔥 Flag to distinguish from cache
}

export interface MediaBlobEntry {
  url: string;                       // Primary key - original URL
  quizId: string;
  blob: Blob;
  type: 'image' | 'audio';
  contentType: string;
  savedAt: number;
  size?: number;
}

/**
 * Main Application Database
 * Supports offline-first for Flashcard, Quiz, Forum, and Media
 * 🔥 UNIFIED: Single Source of Truth for ALL offline data
 */
export class AppDatabase extends Dexie {
  // ========================================================================
  // CORE OFFLINE TABLES
  // ========================================================================
  
  /** Pending actions queue - central to offline functionality */
  pending!: Table<PendingAction, number>;
  
  /** Processed actions - for local idempotency check */
  processedActions!: Table<ProcessedAction, string>;
  
  /** Media blobs for offline storage (general) */
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
  // DOWNLOADED QUIZZES (Cold Storage - Migrated from DownloadManager)
  // ========================================================================
  
  /** Downloaded quizzes for TRUE offline playback */
  downloadedQuizzes!: Table<DownloadedQuiz, string>;
  
  /** Media blobs for downloaded quizzes (images, audio as Blob) */
  mediaBlobs!: Table<MediaBlobEntry, string>;
  
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

    // ======================================================================
    // VERSION 2: Add Downloaded Quizzes & Media Blobs (Migration from DownloadManager)
    // 🔥 UNIFIED: Single Source of Truth for ALL offline data
    // ======================================================================
    this.version(2).stores({
      // Core offline tables (unchanged)
      pending: '++id, actionId, status, userId, createdAt, priority, ttl, [status+createdAt], [status+priority]',
      processedActions: 'actionId, userId, processedAt',
      media: '++id, mediaKey, createdAt, size',
      
      // Flashcard tables (unchanged)
      decks: 'id, authorId, public, createdAt, updatedAt, lastSync, syncStatus',
      cards: 'id, deckId, difficulty, createdAt, updatedAt, lastSync, syncStatus',
      spacedData: 'cardId, [deckId+userId], userId, nextReview, lastReview',
      deckProgress: '[deckId+userId], deckId, userId, lastStudy',
      
      // Quiz tables (unchanged)
      quizzes: 'id, category, difficulty, cachedAt, expiresAt',
      questions: 'id, quizId, cachedAt',
      results: 'id, [quizId+userId], userId, quizId, completedAt, synced',
      
      // Forum tables (unchanged)
      posts: 'id, authorId, category, cachedAt',

      // 🔥 NEW: Downloaded Quizzes (Cold Storage - from DownloadManager)
      downloadedQuizzes: 'id, userId, category, downloadedAt, *searchKeywords',
      
      // 🔥 NEW: Media Blobs for downloaded quizzes
      mediaBlobs: 'url, quizId, type, savedAt'
    });

    // ======================================================================
    // VERSION 3: Optimize indexes + Add conflict resolution support
    // ======================================================================
    this.version(3).stores({
      // Core offline tables - ADD compound index [userId+status] for faster queries
      pending: '++id, actionId, status, userId, createdAt, priority, ttl, [status+createdAt], [status+priority], [userId+status]',
      processedActions: 'actionId, userId, processedAt',
      media: '++id, mediaKey, createdAt, size',
      
      // Flashcard tables - ADD serverUpdatedAt for conflict resolution
      decks: 'id, authorId, public, createdAt, updatedAt, lastSync, syncStatus, serverUpdatedAt',
      cards: 'id, deckId, difficulty, createdAt, updatedAt, lastSync, syncStatus, serverUpdatedAt',
      spacedData: 'cardId, [deckId+userId], userId, nextReview, lastReview',
      deckProgress: '[deckId+userId], deckId, userId, lastStudy',
      
      // Quiz tables - unchanged
      quizzes: 'id, category, difficulty, cachedAt, expiresAt',
      questions: 'id, quizId, cachedAt',
      results: 'id, [quizId+userId], userId, quizId, completedAt, synced',
      
      // Forum tables - unchanged  
      posts: 'id, authorId, category, cachedAt',

      // Downloaded Quizzes - ADD userId+category compound index
      downloadedQuizzes: 'id, userId, category, downloadedAt, *searchKeywords, [userId+category]',
      
      // Media Blobs - unchanged
      mediaBlobs: 'url, quizId, type, savedAt'
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
      this.posts.clear(),
      this.downloadedQuizzes.clear(),
      this.mediaBlobs.clear()
    ]);
  }

  /**
   * Clear downloaded quizzes for a specific user
   */
  async clearDownloadsForUser(userId: string): Promise<number> {
    // Get all downloaded quizzes for this user
    const quizzes = await this.downloadedQuizzes.where('userId').equals(userId).toArray();
    const quizIds = quizzes.map(q => q.id);
    
    // Delete media blobs for these quizzes
    let deletedMedia = 0;
    for (const quizId of quizIds) {
      deletedMedia += await this.mediaBlobs.where('quizId').equals(quizId).delete();
    }
    
    // Delete the quizzes
    const deletedQuizzes = await this.downloadedQuizzes.where('userId').equals(userId).delete();
    
    console.log(`[DB] Cleared ${deletedQuizzes} quizzes and ${deletedMedia} media blobs for user ${userId}`);
    return deletedQuizzes;
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
      this.posts.count(),
      this.downloadedQuizzes.count(),
      this.mediaBlobs.count()
    ]);
    
    // Get media blob sizes
    const mediaBlobs = await this.media.toArray();
    const mediaSize = mediaBlobs.reduce((sum: number, blob: any) => sum + (blob.size || 0), 0);
    
    // Get downloaded media blob sizes
    const downloadedBlobs = await this.mediaBlobs.toArray();
    const downloadedMediaSize = downloadedBlobs.reduce((sum: number, entry: any) => {
      return sum + (entry.blob?.size || entry.size || 0);
    }, 0);
    
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
      counts[11] * 2048 + // downloadedQuizzes (larger)
      mediaSize +
      downloadedMediaSize;
    
    return estimatedSize;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    downloadedQuizzes: number;
    mediaBlobs: number;
    totalSizeBytes: number;
    pendingActions: number;
  }> {
    const [quizCount, blobCount, pendingCount] = await Promise.all([
      this.downloadedQuizzes.count(),
      this.mediaBlobs.count(),
      this.pending.where('status').equals('pending').count()
    ]);
    
    const totalSize = await this.getDatabaseSize();
    
    return {
      downloadedQuizzes: quizCount,
      mediaBlobs: blobCount,
      totalSizeBytes: totalSize,
      pendingActions: pendingCount
    };
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
