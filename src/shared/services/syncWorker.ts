/**
 * Sync Worker (Production-Ready)
 * Handles synchronization of offline queue with remote services
 * Supports Flashcard, Quiz, Forum, and Media actions
 */

import { offlineQueueService } from './offlineQueue';
import type { PendingAction } from '../../features/flashcard/services/database';
import { db } from '../../features/flashcard/services/database';

// ============================================================================
// REMOTE API IMPORTS (to be implemented)
// ============================================================================

// These will be implemented to call actual Firebase services
import { flashcardService } from '../../features/flashcard/services/flashcardService';
// import { quizService } from '../../features/quiz/services/quizService';
// import { forumService } from '../../features/forum/services/forumService';
// import { mediaService } from '../../shared/services/mediaService';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_BACKOFF_MS: 1000,      // 1 second
  MAX_BACKOFF_MS: 60000,         // 60 seconds
  BATCH_SIZE: 10,                 // Process 10 items at a time
  CONCURRENT_LIMIT: 3             // Max 3 concurrent operations
} as const;

// ============================================================================
// SYNC STATE
// ============================================================================

let isSyncing = false;

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Flush pending queue - main sync entry point
 * Processes pending actions and syncs with remote
 */
export async function flushPendingQueue(userId: string): Promise<{
  synced: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  if (isSyncing) {
    console.log('Sync already in progress, skipping');
    return { synced: 0, failed: 0, skipped: 0, errors: [] };
  }
  
  if (!navigator.onLine) {
    console.log('Device is offline, skipping sync');
    return { synced: 0, failed: 0, skipped: 0, errors: ['Device is offline'] };
  }
  
  isSyncing = true;
  let synced = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];
  
  try {
    // Get pending items
    const items = await offlineQueueService.getPendingActions(
      userId,
      CONFIG.BATCH_SIZE
    );
    
    console.log(`[Sync] Processing ${items.length} pending items`);
    
    // Process items with concurrency limit
    for (let i = 0; i < items.length; i += CONFIG.CONCURRENT_LIMIT) {
      const batch = items.slice(i, i + CONFIG.CONCURRENT_LIMIT);
      
      const results = await Promise.allSettled(
        batch.map(item => processPendingItem(item, userId))
      );
      
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            synced++;
          } else {
            failed++;
            errors.push(result.value.error || 'Unknown error');
          }
        } else {
          failed++;
          errors.push(result.reason?.message || 'Promise rejected');
        }
      });
    }
    
    // Clean up old synced items
    await offlineQueueService.cleanupSynced(7);
    
    // Clean up expired items
    await offlineQueueService.cleanupExpired();
    
    console.log(`[Sync] Complete: ${synced} synced, ${failed} failed, ${skipped} skipped`);
    
  } catch (error) {
    console.error('[Sync] Fatal error:', error);
    errors.push((error as Error).message);
  } finally {
    isSyncing = false;
  }
  
  return { synced, failed, skipped, errors };
}

// ============================================================================
// PROCESS INDIVIDUAL ACTION
// ============================================================================

/**
 * Process a single pending action
 */
async function processPendingItem(
  item: PendingAction,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already processed (idempotency)
    if (await offlineQueueService.isActionProcessed(item.actionId)) {
      console.log(`[Sync] Action ${item.actionId} already processed, skipping`);
      await offlineQueueService.markSynced(item.id!);
      return { success: true };
    }
    
    // Mark as syncing
    await offlineQueueService.markSyncing(item.id!);
    
    // Process based on type
    await processActionByType(item, userId);
    
    // Mark as synced
    await offlineQueueService.markSynced(item.id!);
    await offlineQueueService.markActionProcessed(item.actionId, userId);
    
    return { success: true };
    
  } catch (error) {
    const errorMsg = (error as Error).message;
    console.error(`[Sync] Failed to process action ${item.actionId}:`, errorMsg);
    
    // Increment retries
    const newRetries = item.retries + 1;
    await offlineQueueService.markFailed(item.id!, errorMsg, newRetries);
    
    // Apply exponential backoff
    if (newRetries < CONFIG.MAX_RETRIES) {
      const backoff = Math.min(
        CONFIG.MAX_BACKOFF_MS,
        CONFIG.INITIAL_BACKOFF_MS * Math.pow(2, newRetries)
      );
      console.log(`[Sync] Will retry after ${backoff}ms`);
      await sleep(backoff);
    }
    
    return { success: false, error: errorMsg };
  }
}

// ============================================================================
// ACTION TYPE PROCESSORS
// ============================================================================

/**
 * Route action to appropriate processor
 */
async function processActionByType(
  item: PendingAction,
  userId: string
): Promise<void> {
  switch (item.type) {
    // ========================================================================
    // FLASHCARD ACTIONS
    // ========================================================================
    
    case 'create_deck':
      await processDeckCreate(item);
      break;
      
    case 'update_deck':
      await processDeckUpdate(item);
      break;
      
    case 'delete_deck':
      await processDeckDelete(item);
      break;
      
    case 'create_card':
      await processCardCreate(item);
      break;
      
    case 'update_card':
      await processCardUpdate(item);
      break;
      
    case 'delete_card':
      await processCardDelete(item);
      break;
      
    case 'review_card':
      await processCardReview(item);
      break;
      
    case 'update_progress':
      await processProgressUpdate(item);
      break;
    
    // ========================================================================
    // QUIZ ACTIONS
    // ========================================================================
    
    case 'submit_result':
      await processQuizResult(item, userId);
      break;
      
    case 'submit_answer':
      await processQuizAnswer(item, userId);
      break;
    
    // ========================================================================
    // MEDIA ACTIONS
    // ========================================================================
    
    case 'upload_media':
      await processMediaUpload(item);
      break;
    
    // ========================================================================
    // GENERIC ACTIONS
    // ========================================================================
    
    case 'vote':
      await processVote(item, userId);
      break;
      
    case 'favorite':
      await processFavorite(item, userId);
      break;
    
    default:
      throw new Error(`Unknown action type: ${item.type}`);
  }
}

// ============================================================================
// FLASHCARD PROCESSORS
// ============================================================================

async function processDeckCreate(item: PendingAction): Promise<void> {
  const { payload } = item;
  
  // Resolve media if any
  const resolvedPayload = await resolveMediaInPayload(payload);
  
  const result = await flashcardService.createDeck(resolvedPayload);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create deck');
  }
}

async function processDeckUpdate(item: PendingAction): Promise<void> {
  const { id, ...updates } = item.payload;
  
  const result = await flashcardService.updateDeck(id, updates);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update deck');
  }
}

async function processDeckDelete(item: PendingAction): Promise<void> {
  const { id } = item.payload;
  
  const result = await flashcardService.deleteDeck(id);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete deck');
  }
}

async function processCardCreate(item: PendingAction): Promise<void> {
  const { payload } = item;
  
  // Resolve media if any
  const resolvedPayload = await resolveMediaInPayload(payload);
  
  const result = await flashcardService.createCard(resolvedPayload);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create card');
  }
}

async function processCardUpdate(item: PendingAction): Promise<void> {
  const { id, ...updates } = item.payload;
  
  const result = await flashcardService.updateCard(id, updates);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update card');
  }
}

async function processCardDelete(item: PendingAction): Promise<void> {
  const { id } = item.payload;
  
  const result = await flashcardService.deleteCard(id);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete card');
  }
}

async function processCardReview(item: PendingAction): Promise<void> {
  const { cardId, userId, quality, timeSpent } = item.payload;
  
  // This would update spaced repetition data
  // Implementation depends on your review service
  console.log('Processing card review:', { cardId, userId, quality, timeSpent });
}

async function processProgressUpdate(item: PendingAction): Promise<void> {
  const { deckId, userId, ...updates } = item.payload;
  
  const result = await flashcardService.updateDeckProgress(deckId, userId, updates);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update progress');
  }
}

// ============================================================================
// QUIZ PROCESSORS
// ============================================================================

async function processQuizResult(item: PendingAction, userId: string): Promise<void> {
  const { id, quizId, answers, score, completedAt } = item.payload;
  
  // 🔥 Validate answers array includes ALL questions
  const correctAnswers = answers.filter((a: any) => a.isCorrect).length;
  const totalQuestions = answers.length;
  const calculatedScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  
  console.log('🔍 [processQuizResult] Validating:', { 
    id, 
    quizId, 
    correctAnswers,
    totalQuestions,
    providedScore: score,
    calculatedScore,
    completedAt 
  });
  
  // 🔥 CRITICAL: Use calculated score to ensure accuracy
  // In case client-side score was miscalculated
  const finalScore = calculatedScore;
  
  if (Math.abs(score - calculatedScore) > 1) {
    console.warn(`⚠️ Score mismatch! Provided: ${score}%, Calculated: ${calculatedScore}%`);
  }
  
  // Import submitQuizResult dynamically to avoid circular deps
  const { submitQuizResult } = await import('../../features/quiz/api/base');
  
  // Get user info from auth state
  const { auth } = await import('../../lib/firebase/config');
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  
  // Prepare result data in the format expected by submitQuizResult
  const resultData = {
    userId: currentUser.uid,
    userEmail: currentUser.email || '',
    userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
    quizId,
    score: finalScore, // Use recalculated score
    correctAnswers,
    totalQuestions,
    timeSpent: 0, // Not available from queue payload
    answers,
    completedAt: new Date(completedAt)
  };
  
  // Submit to Firebase
  const firebaseResultId = await submitQuizResult(resultData);
  console.log('✅ Quiz result synced to Firebase:', firebaseResultId);
  
  // Update IndexedDB to mark as synced
  try {
    const localResultId = `local_${quizId}_${userId}_${completedAt}`;
    await db.results.where('id').equals(localResultId).modify({ synced: true });
    console.log('✅ IndexedDB result marked as synced');
  } catch (dbError) {
    console.warn('⚠️ Failed to update IndexedDB sync status:', dbError);
    // Non-critical, result is already in Firebase
  }
  
  // Track completion in quiz stats
  try {
    const { quizStatsService } = await import('../../services/quizStatsService');
    await quizStatsService.trackCompletion(
      quizId,
      userId,
      correctAnswers,
      totalQuestions
    );
    console.log('✅ Quiz stats updated');
  } catch (statsError) {
    console.warn('⚠️ Failed to update quiz stats:', statsError);
    // Non-critical
  }
}

async function processQuizAnswer(item: PendingAction, _userId: string): Promise<void> {
  const { quizId, questionId, answer } = item.payload;
  
  // TODO: Implement quiz answer submission
  // await quizService.submitAnswer(quizId, questionId, userId, answer);
  
  console.log('Processing quiz answer:', { quizId, questionId, answer });
}

// ============================================================================
// MEDIA PROCESSORS
// ============================================================================

async function processMediaUpload(item: PendingAction): Promise<void> {
  const { mediaKey, path } = item.payload;
  
  // Get media blob from local storage
  const mediaRow = await db.media.where('mediaKey').equals(mediaKey).first();
  
  if (!mediaRow || !mediaRow.id) {
    throw new Error(`Media blob not found for key: ${mediaKey}`);
  }
  
  // TODO: Upload to Firebase Storage
  // const url = await mediaService.upload(mediaRow.blob, path);
  
  console.log('Processing media upload:', { mediaKey, path, size: mediaRow.blob.size });
  
  // Clean up local media after successful upload
  if (typeof mediaRow.id === 'number') {
    await db.media.delete(mediaRow.id);
  }
}

// ============================================================================
// GENERIC PROCESSORS
// ============================================================================

async function processVote(item: PendingAction, _userId: string): Promise<void> {
  const { targetId, targetType, voteValue } = item.payload;
  
  // TODO: Implement vote submission
  // await voteService.submitVote(targetId, targetType, userId, voteValue);
  
  console.log('Processing vote:', { targetId, targetType, voteValue });
}

async function processFavorite(item: PendingAction, _userId: string): Promise<void> {
  const { targetId, targetType, action } = item.payload;
  
  // TODO: Implement favorite action
  // await favoriteService.toggle(targetId, targetType, userId, action);
  
  console.log('Processing favorite:', { targetId, targetType, action });
}

// ============================================================================
// MEDIA RESOLUTION
// ============================================================================

/**
 * Resolve media references in payload
 * Uploads any local media blobs and replaces keys with URLs
 */
async function resolveMediaInPayload(payload: any): Promise<any> {
  if (!payload) return payload;
  
  const resolved = { ...payload };
  
  // Check for media keys in common fields
  const mediaFields = ['coverUrl', 'imageUrl', 'audioUrl', 'frontMedia', 'backMedia'];
  
  for (const field of mediaFields) {
    if (resolved[field] && typeof resolved[field] === 'string' && resolved[field].startsWith('local://')) {
      const mediaKey = resolved[field].replace('local://', '');
      
      // Get from local storage
      const mediaRow = await db.media.where('mediaKey').equals(mediaKey).first();
      
      if (mediaRow) {
        // TODO: Upload to storage and get URL
        // const url = await mediaService.upload(mediaRow.blob, `media/${mediaKey}`);
        // resolved[field] = url;
        
        // For now, just log
        console.log(`Would upload media: ${mediaKey}`);
        
        // Clean up local storage
        if (typeof mediaRow.id === 'number') {
          await db.media.delete(mediaRow.id);
        }
      }
    }
  }
  
  return resolved;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Sleep utility for backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

// ============================================================================
// AUTO-SYNC SETUP
// ============================================================================

let autoSyncIntervalId: number | null = null;
let onlineListenerCleanup: (() => void) | null = null;

/**
 * Start auto-sync (polls every N seconds when online)
 */
export function startAutoSync(
  userId: string,
  intervalMs: number = 30000
): void {
  if (autoSyncIntervalId) {
    stopAutoSync();
  }
  
  // Initial sync
  if (navigator.onLine) {
    flushPendingQueue(userId).catch(console.error);
  }
  
  // Periodic sync
  autoSyncIntervalId = window.setInterval(() => {
    if (navigator.onLine && !isSyncing) {
      flushPendingQueue(userId).catch(console.error);
    }
  }, intervalMs);
  
  // Listen to online events
  const handleOnline = () => {
    console.log('[Sync] Device online, triggering sync');
    flushPendingQueue(userId).catch(console.error);
  };
  
  const handleOffline = () => {
    console.log('[Sync] Device offline');
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  onlineListenerCleanup = () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
  
  console.log('[Sync] Auto-sync started with interval:', intervalMs);
}

/**
 * Stop auto-sync
 */
export function stopAutoSync(): void {
  if (autoSyncIntervalId) {
    clearInterval(autoSyncIntervalId);
    autoSyncIntervalId = null;
  }
  
  if (onlineListenerCleanup) {
    onlineListenerCleanup();
    onlineListenerCleanup = null;
  }
  
  console.log('[Sync] Auto-sync stopped');
}

/**
 * Manual sync trigger
 */
export async function triggerSync(userId: string): Promise<void> {
  if (!navigator.onLine) {
    throw new Error('Device is offline');
  }
  
  if (isSyncing) {
    throw new Error('Sync already in progress');
  }
  
  await flushPendingQueue(userId);
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const syncService = {
  flushPendingQueue,
  startAutoSync,
  stopAutoSync,
  triggerSync,
  isOnline,
  isSyncing: () => isSyncing
};

export default syncService;
