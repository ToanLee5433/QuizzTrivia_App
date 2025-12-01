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
    
    // 🔥 NEW: Emit sync start event for UI progress
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sync-start', { 
        detail: { total: items.length } 
      }));
    }
    
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
            // 🔥 NEW: Emit progress event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sync-progress', { 
                detail: { synced, total: items.length } 
              }));
            }
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
    
    // 🔥 NEW: Emit sync complete event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sync-complete', { 
        detail: { synced, failed, skipped } 
      }));
    }
    
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
    const errorCode = (error as any).code;
    console.error(`[Sync] Failed to process action ${item.actionId}:`, errorMsg);
    
    // 🔥 ERROR CATEGORIZATION: Determine if error is retryable
    const isRetryable = categorizeError(errorMsg, errorCode);
    
    if (!isRetryable) {
      // Fatal error - mark as failed immediately, don't retry
      console.error(`[Sync] ❌ Fatal error (not retryable): ${errorMsg}`);
      await offlineQueueService.markFailed(item.id!, errorMsg, CONFIG.MAX_RETRIES);
      return { success: false, error: `[FATAL] ${errorMsg}` };
    }
    
    // Increment retries for retryable errors
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
// ERROR CATEGORIZATION
// ============================================================================

/**
 * 🔥 Categorize errors as retryable or fatal
 * Returns true if error is retryable, false if fatal
 */
function categorizeError(errorMsg: string, errorCode?: string): boolean {
  // FATAL ERRORS - Don't retry
  const fatalPatterns = [
    'permission-denied',
    'unauthorized',
    'unauthenticated', 
    'not-found',
    'already-exists',
    'invalid-argument',
    'failed-precondition',
    'out-of-range',
    'unimplemented',
    'Cannot delete',
    'Cannot update',
    'User not authenticated',
    'Validation failed',
  ];
  
  // Check error code first
  if (errorCode && fatalPatterns.some(p => errorCode.includes(p))) {
    return false;
  }
  
  // Check error message
  const lowerMsg = errorMsg.toLowerCase();
  if (fatalPatterns.some(p => lowerMsg.includes(p.toLowerCase()))) {
    return false;
  }
  
  // RETRYABLE ERRORS - Retry with backoff
  const retryablePatterns = [
    'network',
    'timeout',
    'unavailable',
    'internal',
    'resource-exhausted',
    'deadline-exceeded',
    'aborted',
    'cancelled',
    'fetch failed',
    'Failed to fetch',
    'Network request failed',
    'ECONNRESET',
    'ETIMEDOUT',
  ];
  
  // If matches retryable pattern, retry
  if (retryablePatterns.some(p => lowerMsg.includes(p.toLowerCase()))) {
    return true;
  }
  
  // Default: retry (unknown errors might be temporary)
  return true;
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
    
    case 'create_quiz':
      await processQuizCreate(item, userId);
      break;
      
    case 'update_quiz':
      await processQuizUpdate(item, userId);
      break;
      
    case 'delete_quiz':
      await processQuizDelete(item, userId);
      break;
    
    // ========================================================================
    // FORUM ACTIONS
    // ========================================================================
    
    case 'create_post':
      await processPostCreate(item, userId);
      break;
      
    case 'update_post':
      await processPostUpdate(item, userId);
      break;
      
    case 'delete_post':
      await processPostDelete(item, userId);
      break;
      
    case 'create_comment':
      await processCommentCreate(item, userId);
      break;
      
    case 'update_comment':
      await processCommentUpdate(item, userId);
      break;
      
    case 'delete_comment':
      await processCommentDelete(item, userId);
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
  const { cardId, deckId, userId, quality, timeSpent, reviewedAt } = item.payload;
  
  try {
    // Import Firestore dynamically
    const { db: firebaseDb } = await import('../../lib/firebase/config');
    const { doc, setDoc, serverTimestamp, increment, updateDoc } = await import('firebase/firestore');
    
    // Create review record
    const reviewId = `${cardId}_${userId}_${reviewedAt || Date.now()}`;
    const reviewRef = doc(firebaseDb, 'flashcard_reviews', reviewId);
    
    await setDoc(reviewRef, {
      cardId,
      deckId,
      userId,
      quality, // SM-2 quality rating (0-5)
      timeSpent,
      reviewedAt: serverTimestamp()
    });
    
    // Update card stats
    const cardRef = doc(firebaseDb, 'flashcard_cards', cardId);
    await updateDoc(cardRef, {
      reviewCount: increment(1),
      lastReviewed: serverTimestamp()
    });
    
    console.log('✅ Card review synced:', { cardId, quality, timeSpent });
  } catch (reviewError) {
    console.error('❌ Card review sync failed:', reviewError);
    throw reviewError;
  }
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
  const { id, quizId, answers, score, completedAt, timeSpent } = item.payload;
  
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
    timeSpent,
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
    timeSpent: timeSpent || 0, // Use timeSpent from payload
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

async function processQuizAnswer(item: PendingAction, userId: string): Promise<void> {
  const { quizId, questionId, answer, isCorrect, answeredAt, timeSpent } = item.payload;
  
  try {
    // Import Firestore dynamically
    const { db: firebaseDb } = await import('../../lib/firebase/config');
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    
    // Create answer record
    const answerId = `${quizId}_${questionId}_${userId}_${answeredAt || Date.now()}`;
    const answerRef = doc(firebaseDb, 'quiz_answers', answerId);
    
    await setDoc(answerRef, {
      quizId,
      questionId,
      userId,
      answer,
      isCorrect: isCorrect ?? false,
      timeSpent: timeSpent || 0,
      answeredAt: serverTimestamp()
    });
    
    console.log('✅ Quiz answer synced:', { quizId, questionId, isCorrect });
  } catch (answerError) {
    console.error('❌ Quiz answer sync failed:', answerError);
    throw answerError;
  }
}

// ============================================================================
// QUIZ CRUD PROCESSORS
// ============================================================================

async function processQuizCreate(item: PendingAction, userId: string): Promise<void> {
  const { title, description, category, difficulty, questions, timeLimit, coverImage, isPublic } = item.payload;
  
  try {
    const { db: firebaseDb } = await import('../../lib/firebase/config');
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    
    // Resolve media URLs if any local blobs
    const resolvedPayload = await resolveMediaInPayload({ coverImage });
    
    const quizData = {
      title,
      description: description || '',
      category: category || 'general',
      difficulty: difficulty || 'medium',
      questions: questions || [],
      timeLimit: timeLimit || null,
      coverImage: resolvedPayload.coverImage || null,
      isPublic: isPublic ?? true,
      authorId: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      playCount: 0,
      avgScore: 0,
      status: 'published'
    };
    
    const docRef = await addDoc(collection(firebaseDb, 'quizzes'), quizData);
    console.log('✅ Quiz created:', docRef.id);
    
    // Update local cache with server ID if needed
    if (item.meta?.localId) {
      await db.quizzes.where('id').equals(item.meta.localId).modify({ 
        id: docRef.id 
      });
    }
  } catch (error) {
    console.error('❌ Quiz create failed:', error);
    throw error;
  }
}

async function processQuizUpdate(item: PendingAction, _userId: string): Promise<void> {
  const { id, ...updates } = item.payload;
  
  try {
    const { db: firebaseDb } = await import('../../lib/firebase/config');
    const { doc, getDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    
    const quizRef = doc(firebaseDb, 'quizzes', id);
    
    // 🔥 CONFLICT RESOLUTION: Check server updatedAt
    const serverDoc = await getDoc(quizRef);
    if (serverDoc.exists()) {
      const serverData = serverDoc.data();
      const serverUpdatedAt = serverData.updatedAt?.toMillis?.() || 0;
      const clientUpdatedAt = item.payload.clientUpdatedAt || 0;
      
      if (serverUpdatedAt > clientUpdatedAt) {
        console.warn('⚠️ Server has newer version, skipping update (Server wins)');
        return; // Skip - server wins
      }
    }
    
    // Resolve media if any
    const resolvedPayload = await resolveMediaInPayload(updates);
    
    await updateDoc(quizRef, {
      ...resolvedPayload,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Quiz updated:', id);
  } catch (error) {
    console.error('❌ Quiz update failed:', error);
    throw error;
  }
}

async function processQuizDelete(item: PendingAction, userId: string): Promise<void> {
  const { id } = item.payload;
  
  try {
    const { db: firebaseDb } = await import('../../lib/firebase/config');
    const { doc, deleteDoc, getDoc } = await import('firebase/firestore');
    
    const quizRef = doc(firebaseDb, 'quizzes', id);
    
    // Verify ownership before delete
    const quizDoc = await getDoc(quizRef);
    if (quizDoc.exists()) {
      const quizData = quizDoc.data();
      if (quizData.authorId !== userId) {
        throw new Error('Unauthorized: Cannot delete quiz you do not own');
      }
    }
    
    await deleteDoc(quizRef);
    console.log('✅ Quiz deleted:', id);
    
    // Clean up local cache
    await db.quizzes.delete(id);
    await db.questions.where('quizId').equals(id).delete();
  } catch (error) {
    console.error('❌ Quiz delete failed:', error);
    throw error;
  }
}

// ============================================================================
// FORUM PROCESSORS
// ============================================================================

async function processPostCreate(item: PendingAction, userId: string): Promise<void> {
  const { title, content, category, tags } = item.payload;
  
  try {
    const { db: firebaseDb, auth } = await import('../../lib/firebase/config');
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    
    const user = auth.currentUser;
    
    const postData = {
      title,
      content,
      category: category || 'general',
      tags: tags || [],
      authorId: userId,
      authorName: user?.displayName || user?.email?.split('@')[0] || 'Anonymous',
      authorAvatar: user?.photoURL || null,
      upvotes: 0,
      downvotes: 0,
      commentCount: 0,
      viewCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'published'
    };
    
    const docRef = await addDoc(collection(firebaseDb, 'forumPosts'), postData);
    console.log('✅ Forum post created:', docRef.id);
    
    // Update local cache
    if (item.meta?.localId) {
      await db.posts.where('id').equals(item.meta.localId).modify({
        id: docRef.id
      });
    }
  } catch (error) {
    console.error('❌ Post create failed:', error);
    throw error;
  }
}

async function processPostUpdate(item: PendingAction, userId: string): Promise<void> {
  const { id, ...updates } = item.payload;
  
  try {
    const { db: firebaseDb } = await import('../../lib/firebase/config');
    const { doc, getDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    
    const postRef = doc(firebaseDb, 'forumPosts', id);
    
    // Verify ownership
    const postDoc = await getDoc(postRef);
    if (postDoc.exists() && postDoc.data().authorId !== userId) {
      throw new Error('Unauthorized: Cannot update post you do not own');
    }
    
    // 🔥 CONFLICT RESOLUTION
    const serverData = postDoc.data();
    const serverUpdatedAt = serverData?.updatedAt?.toMillis?.() || 0;
    const clientUpdatedAt = item.payload.clientUpdatedAt || 0;
    
    if (serverUpdatedAt > clientUpdatedAt) {
      console.warn('⚠️ Server has newer version, skipping post update');
      return;
    }
    
    await updateDoc(postRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Forum post updated:', id);
  } catch (error) {
    console.error('❌ Post update failed:', error);
    throw error;
  }
}

async function processPostDelete(item: PendingAction, userId: string): Promise<void> {
  const { id } = item.payload;
  
  try {
    const { db: firebaseDb } = await import('../../lib/firebase/config');
    const { doc, deleteDoc, getDoc } = await import('firebase/firestore');
    
    const postRef = doc(firebaseDb, 'forumPosts', id);
    
    // Verify ownership
    const postDoc = await getDoc(postRef);
    if (postDoc.exists() && postDoc.data().authorId !== userId) {
      throw new Error('Unauthorized: Cannot delete post you do not own');
    }
    
    await deleteDoc(postRef);
    console.log('✅ Forum post deleted:', id);
    
    // Clean up local cache
    await db.posts.delete(id);
  } catch (error) {
    console.error('❌ Post delete failed:', error);
    throw error;
  }
}

async function processCommentCreate(item: PendingAction, userId: string): Promise<void> {
  const { postId, content, parentCommentId } = item.payload;
  
  try {
    const { db: firebaseDb, auth } = await import('../../lib/firebase/config');
    const { collection, addDoc, doc, updateDoc, increment, serverTimestamp } = await import('firebase/firestore');
    
    const user = auth.currentUser;
    
    const commentData = {
      postId,
      content,
      parentCommentId: parentCommentId || null,
      authorId: userId,
      authorName: user?.displayName || user?.email?.split('@')[0] || 'Anonymous',
      authorAvatar: user?.photoURL || null,
      upvotes: 0,
      downvotes: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(firebaseDb, 'forumComments'), commentData);
    console.log('✅ Comment created:', docRef.id);
    
    // Update post comment count
    const postRef = doc(firebaseDb, 'forumPosts', postId);
    await updateDoc(postRef, {
      commentCount: increment(1)
    });
  } catch (error) {
    console.error('❌ Comment create failed:', error);
    throw error;
  }
}

async function processCommentUpdate(item: PendingAction, userId: string): Promise<void> {
  const { id, content } = item.payload;
  
  try {
    const { db: firebaseDb } = await import('../../lib/firebase/config');
    const { doc, getDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    
    const commentRef = doc(firebaseDb, 'forumComments', id);
    
    // Verify ownership
    const commentDoc = await getDoc(commentRef);
    if (commentDoc.exists() && commentDoc.data().authorId !== userId) {
      throw new Error('Unauthorized: Cannot update comment you do not own');
    }
    
    await updateDoc(commentRef, {
      content,
      updatedAt: serverTimestamp(),
      edited: true
    });
    
    console.log('✅ Comment updated:', id);
  } catch (error) {
    console.error('❌ Comment update failed:', error);
    throw error;
  }
}

async function processCommentDelete(item: PendingAction, userId: string): Promise<void> {
  const { id, postId } = item.payload;
  
  try {
    const { db: firebaseDb } = await import('../../lib/firebase/config');
    const { doc, deleteDoc, getDoc, updateDoc, increment } = await import('firebase/firestore');
    
    const commentRef = doc(firebaseDb, 'forumComments', id);
    
    // Verify ownership
    const commentDoc = await getDoc(commentRef);
    if (commentDoc.exists() && commentDoc.data().authorId !== userId) {
      throw new Error('Unauthorized: Cannot delete comment you do not own');
    }
    
    await deleteDoc(commentRef);
    console.log('✅ Comment deleted:', id);
    
    // Update post comment count
    if (postId) {
      const postRef = doc(firebaseDb, 'forumPosts', postId);
      await updateDoc(postRef, {
        commentCount: increment(-1)
      });
    }
  } catch (error) {
    console.error('❌ Comment delete failed:', error);
    throw error;
  }
}

// ============================================================================
// MEDIA PROCESSORS
// ============================================================================

async function processMediaUpload(item: PendingAction): Promise<void> {
  const { mediaKey, path, contentType } = item.payload;
  
  // Get media blob from local storage
  const mediaRow = await db.media.where('mediaKey').equals(mediaKey).first();
  
  if (!mediaRow || !mediaRow.id) {
    throw new Error(`Media blob not found for key: ${mediaKey}`);
  }
  
  try {
    // Import Firebase Storage dynamically
    const { storage } = await import('../../lib/firebase/config');
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, path || `media/${mediaKey}`);
    const metadata = contentType ? { contentType } : undefined;
    
    await uploadBytes(storageRef, mediaRow.blob, metadata);
    const url = await getDownloadURL(storageRef);
    
    console.log('✅ Media uploaded:', { mediaKey, url });
    
    // Clean up local media after successful upload
    if (typeof mediaRow.id === 'number') {
      await db.media.delete(mediaRow.id);
    }
    
    // Store URL mapping for future reference
    // This can be used to update references in other documents
    return;
  } catch (uploadError) {
    console.error('❌ Media upload failed:', uploadError);
    throw uploadError;
  }
}

// ============================================================================
// GENERIC PROCESSORS
// ============================================================================

async function processVote(item: PendingAction, userId: string): Promise<void> {
  const { targetId, targetType, voteValue } = item.payload;
  
  try {
    // Import Firestore dynamically
    const { db: firebaseDb } = await import('../../lib/firebase/config');
    const { doc, updateDoc, increment, arrayUnion, arrayRemove } = await import('firebase/firestore');
    
    // Determine collection based on targetType
    let collection: string;
    switch (targetType) {
      case 'quiz':
        collection = 'quizzes';
        break;
      case 'post':
        collection = 'forumPosts';
        break;
      case 'comment':
        collection = 'forumComments';
        break;
      case 'flashcard':
        collection = 'flashcard_decks';
        break;
      default:
        throw new Error(`Unknown vote target type: ${targetType}`);
    }
    
    const docRef = doc(firebaseDb, collection, targetId);
    
    // Update vote count and voter lists
    if (voteValue > 0) {
      await updateDoc(docRef, {
        upvotes: increment(1),
        upvoters: arrayUnion(userId),
        downvoters: arrayRemove(userId)
      });
    } else if (voteValue < 0) {
      await updateDoc(docRef, {
        downvotes: increment(1),
        downvoters: arrayUnion(userId),
        upvoters: arrayRemove(userId)
      });
    } else {
      // Remove vote
      await updateDoc(docRef, {
        upvoters: arrayRemove(userId),
        downvoters: arrayRemove(userId)
      });
    }
    
    console.log('✅ Vote synced:', { targetId, targetType, voteValue });
  } catch (voteError) {
    console.error('❌ Vote sync failed:', voteError);
    throw voteError;
  }
}

async function processFavorite(item: PendingAction, userId: string): Promise<void> {
  const { targetId, targetType, action } = item.payload;
  
  try {
    // Import Firestore dynamically
    const { db: firebaseDb } = await import('../../lib/firebase/config');
    const { doc, setDoc, deleteDoc, serverTimestamp } = await import('firebase/firestore');
    
    // Create favorite document ID
    const favoriteId = `${userId}_${targetType}_${targetId}`;
    const favoriteRef = doc(firebaseDb, 'favorites', favoriteId);
    
    if (action === 'add') {
      // Add to favorites
      await setDoc(favoriteRef, {
        userId,
        targetId,
        targetType,
        createdAt: serverTimestamp()
      });
      console.log('✅ Favorite added:', { targetId, targetType });
    } else {
      // Remove from favorites
      await deleteDoc(favoriteRef);
      console.log('✅ Favorite removed:', { targetId, targetType });
    }
  } catch (favoriteError) {
    console.error('❌ Favorite sync failed:', favoriteError);
    throw favoriteError;
  }
}

// ============================================================================
// MEDIA RESOLUTION
// ============================================================================

/**
 * Resolve media references in payload
 * Uploads any local media blobs and replaces keys with URLs
 * 
 * 🔥 MEDIA DEPENDENCY SOLUTION:
 * - Media phải được lưu vào db.media TRƯỚC khi sync
 * - Hàm này tự động upload và thay thế local://key bằng URL thực
 * - Nếu media không tìm thấy, giữ nguyên reference (sẽ fail khi save)
 */
async function resolveMediaInPayload(payload: any): Promise<any> {
  if (!payload) return payload;
  
  const resolved = { ...payload };
  
  // Check for media keys in common fields
  // 🔥 Added 'coverImage' to support Quiz cover images
  const mediaFields = ['coverUrl', 'coverImage', 'imageUrl', 'audioUrl', 'frontMedia', 'backMedia'];
  
  for (const field of mediaFields) {
    if (resolved[field] && typeof resolved[field] === 'string' && resolved[field].startsWith('local://')) {
      const mediaKey = resolved[field].replace('local://', '');
      
      // Get from local storage
      const mediaRow = await db.media.where('mediaKey').equals(mediaKey).first();
      
      if (mediaRow) {
        try {
          // Import Firebase Storage
          const { storage } = await import('../../lib/firebase/config');
          const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
          
          // Upload to Firebase Storage
          const path = `media/${Date.now()}_${mediaKey}`;
          const storageRef = ref(storage, path);
          
          await uploadBytes(storageRef, mediaRow.blob);
          const url = await getDownloadURL(storageRef);
          
          resolved[field] = url;
          console.log(`✅ Media uploaded for ${field}:`, url);
          
          // Clean up local storage
          if (typeof mediaRow.id === 'number') {
            await db.media.delete(mediaRow.id);
          }
        } catch (uploadError) {
          console.error(`❌ Failed to upload media for ${field}:`, uploadError);
          // Keep local reference if upload fails - action will fail
          throw new Error(`Media upload failed for ${field}: ${uploadError}`);
        }
      } else {
        // 🔥 Media not found - this is a critical error
        console.error(`❌ Media blob not found for key: ${mediaKey}`);
        throw new Error(`Media blob not found: ${mediaKey}. Ensure media is saved before enqueuing action.`);
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
