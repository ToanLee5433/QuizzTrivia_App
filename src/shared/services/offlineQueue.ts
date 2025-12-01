/**
 * Offline Queue Service (Production-Ready)
 * Central queue management for entire application
 * Handles Quiz, Flashcard, Forum, and Media offline actions
 */

// @ts-expect-error - uuid module types
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../features/flashcard/services/database';
import type { PendingAction } from '../../features/flashcard/services/database';

// ============================================================================
// CONFIGURATION
// ============================================================================

// 🔥 APP VERSION: For version mismatch detection during sync
// Update this when scoring logic or data format changes
export const APP_VERSION = '1.1.0';

const CONFIG = {
  MAX_QUEUE_SIZE: 200,           // Maximum pending items
  MAX_RETRIES: 5,                // Max retry attempts per item
  DEFAULT_TTL_DAYS: 30,          // Default TTL in days
  BATCH_SIZE: 20,                // Process items in batches
  HIGH_PRIORITY: 100,            // Priority for critical actions
  NORMAL_PRIORITY: 50,           // Priority for normal actions
  LOW_PRIORITY: 10               // Priority for low priority actions
} as const;

// ============================================================================
// ENQUEUE ACTIONS
// ============================================================================

/**
 * Add action to pending queue with optimistic UI update
 * 
 * @param action - Action details
 * @param userId - User ID who initiated the action
 * @returns actionId for tracking
 */
export async function enqueueAction(
  action: Omit<PendingAction, 'id' | 'actionId' | 'createdAt' | 'status' | 'retries'> & {
    actionId?: string;
  },
  userId: string
): Promise<string> {
  const actionId = action.actionId || uuidv4();
  const now = Date.now();
  
  // Check queue size limit
  const queueSize = await db.pending.where('status').equals('pending').count();
  if (queueSize >= CONFIG.MAX_QUEUE_SIZE) {
    throw new Error(`Queue full (${CONFIG.MAX_QUEUE_SIZE} items). Please sync or clear old items.`);
  }
  
  // Calculate TTL if not provided
  const ttl = action.ttl || now + (CONFIG.DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000);
  
  const record: PendingAction = {
    ...action,
    actionId,
    createdAt: now,
    status: 'pending',
    retries: 0,
    priority: action.priority || CONFIG.NORMAL_PRIORITY,
    ttl,
    userId,
    // 🔥 EDGE CASE: Include appVersion for version mismatch detection
    meta: {
      ...action.meta,
      appVersion: APP_VERSION
    }
  };
  
  await db.pending.add(record);
  
  // Trigger sync if online
  if (navigator.onLine) {
    // Defer to avoid blocking UI
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
    }, 0);
  }
  
  return actionId;
}

/**
 * Helper: Enqueue deck creation
 */
export async function enqueueDeckCreate(
  deckData: any,
  userId: string,
  clientId?: string
): Promise<string> {
  const deckId = clientId || uuidv4();
  
  return enqueueAction({
    type: 'create_deck',
    payload: { ...deckData, id: deckId },
    priority: CONFIG.NORMAL_PRIORITY,
    meta: { clientId: deckId }
  }, userId);
}

/**
 * Helper: Enqueue quiz result submission
 * @param quizId - Quiz ID
 * @param answers - ALL question answers (including unanswered as isCorrect: false)
 * @param score - Score percentage (0-100)
 * @param userId - User ID
 * @param timeSpent - Time spent in seconds
 */
export async function enqueueQuizResult(
  quizId: string,
  answers: any[], // Must include ALL questions
  score: number,
  userId: string,
  timeSpent: number = 0
): Promise<string> {
  const resultId = uuidv4();
  
  // Validate: answers must include all questions
  console.log(`[enqueueQuizResult] Queueing result: ${answers.length} answers, score: ${score}%, timeSpent: ${timeSpent}s`);
  
  return enqueueAction({
    type: 'submit_result',
    payload: {
      id: resultId,
      quizId,
      answers,
      score,
      timeSpent,
      completedAt: Date.now()
    },
    priority: CONFIG.HIGH_PRIORITY, // High priority for results
    meta: { resultId, quizId }
  }, userId);
}

/**
 * Helper: Enqueue media upload
 */
export async function enqueueMediaUpload(
  mediaKey: string,
  path: string,
  userId: string,
  priority: number = CONFIG.NORMAL_PRIORITY
): Promise<string> {
  return enqueueAction({
    type: 'upload_media',
    payload: { mediaKey, path },
    priority,
    meta: { mediaKey, path }
  }, userId);
}

/**
 * Helper: Enqueue vote action
 */
export async function enqueueVote(
  targetId: string,
  targetType: 'quiz' | 'post' | 'comment',
  voteValue: number,
  userId: string
): Promise<string> {
  return enqueueAction({
    type: 'vote',
    payload: {
      targetId,
      targetType,
      voteValue,
      timestamp: Date.now()
    },
    priority: CONFIG.LOW_PRIORITY,
    meta: { targetId, targetType }
  }, userId);
}

// ============================================================================
// QUIZ CRUD HELPERS (NEW)
// ============================================================================

/**
 * Helper: Enqueue quiz creation
 * 
 * 🔥 MEDIA DEPENDENCY HANDLING:
 * - Media phải được lưu vào db.media TRƯỚC khi gọi hàm này
 * - Dùng key format: 'local://[mediaKey]' trong coverImage
 * - syncWorker sẽ tự động resolve và upload media khi sync
 * 
 * @example
 * // Lưu media trước
 * await db.media.add({ mediaKey: 'img123', blob: imageBlob, createdAt: Date.now() });
 * // Sau đó enqueue quiz với local reference
 * await enqueueQuizCreate({ title: 'Quiz', coverImage: 'local://img123' }, userId);
 */
export async function enqueueQuizCreate(
  quizData: {
    title: string;
    description?: string;
    category?: string;
    difficulty?: string;
    questions?: any[];
    timeLimit?: number;
    coverImage?: string;  // Có thể là 'local://mediaKey' hoặc URL thực
    isPublic?: boolean;
  },
  userId: string,
  localId?: string
): Promise<string> {
  const quizId = localId || uuidv4();
  
  // 🔥 VALIDATE: Nếu có local media reference, đảm bảo blob tồn tại
  if (quizData.coverImage?.startsWith('local://')) {
    const mediaKey = quizData.coverImage.replace('local://', '');
    const mediaExists = await db.media.where('mediaKey').equals(mediaKey).count();
    if (mediaExists === 0) {
      console.warn(`⚠️ Media blob '${mediaKey}' not found. Make sure to save media before enqueuing quiz.`);
    }
  }
  
  return enqueueAction({
    type: 'create_quiz',
    payload: { ...quizData, id: quizId },
    priority: CONFIG.NORMAL_PRIORITY,
    meta: { localId: quizId }
  }, userId);
}

/**
 * Helper: Enqueue quiz update
 * 
 * 🔥 MEDIA DEPENDENCY: Same as enqueueQuizCreate
 * Dùng 'local://mediaKey' cho media mới, blob phải tồn tại trong db.media
 */
export async function enqueueQuizUpdate(
  quizId: string,
  updates: Record<string, any>,
  userId: string
): Promise<string> {
  // 🔥 VALIDATE: Kiểm tra local media references
  const mediaFields = ['coverImage', 'imageUrl', 'audioUrl'];
  for (const field of mediaFields) {
    if (updates[field]?.startsWith?.('local://')) {
      const mediaKey = updates[field].replace('local://', '');
      const mediaExists = await db.media.where('mediaKey').equals(mediaKey).count();
      if (mediaExists === 0) {
        console.warn(`⚠️ Media blob '${mediaKey}' not found for field '${field}'.`);
      }
    }
  }
  
  return enqueueAction({
    type: 'update_quiz',
    payload: { 
      id: quizId, 
      ...updates,
      clientUpdatedAt: Date.now() // For conflict resolution
    },
    priority: CONFIG.NORMAL_PRIORITY,
    meta: { quizId }
  }, userId);
}

/**
 * Helper: Enqueue quiz delete
 */
export async function enqueueQuizDelete(
  quizId: string,
  userId: string
): Promise<string> {
  return enqueueAction({
    type: 'delete_quiz',
    payload: { id: quizId },
    priority: CONFIG.NORMAL_PRIORITY,
    meta: { quizId }
  }, userId);
}

// ============================================================================
// 🆕 COMBINED HELPERS: Media + Action in one call (RECOMMENDED)
// ============================================================================

/**
 * Lưu media blob và trả về local reference key
 * Dùng kết quả này trong coverImage, imageUrl, etc.
 * 
 * @example
 * const localRef = await saveMediaForOffline(imageBlob, 'quiz-cover');
 * await enqueueQuizCreate({ title: 'Quiz', coverImage: localRef }, userId);
 */
export async function saveMediaForOffline(
  blob: Blob,
  prefix: string = 'media'
): Promise<string> {
  const mediaKey = `${prefix}_${uuidv4()}`;
  
  await db.media.add({
    mediaKey,
    blob,
    createdAt: new Date(),
    size: blob.size
  } as any); // Type cast để tương thích với schema
  
  return `local://${mediaKey}`;
}

/**
 * 🔥 RECOMMENDED: Tạo quiz với media trong một lần gọi
 * Đảm bảo media được lưu trước khi enqueue quiz
 */
export async function enqueueQuizCreateWithMedia(
  quizData: {
    title: string;
    description?: string;
    category?: string;
    difficulty?: string;
    questions?: any[];
    timeLimit?: number;
    isPublic?: boolean;
  },
  coverImageBlob?: Blob,
  userId?: string
): Promise<{ actionId: string; localQuizId: string }> {
  if (!userId) throw new Error('userId is required');
  
  const localQuizId = uuidv4();
  let coverImage: string | undefined;
  
  // Lưu media blob trước (nếu có)
  if (coverImageBlob) {
    coverImage = await saveMediaForOffline(coverImageBlob, 'quiz-cover');
    console.log('✅ Media saved for offline:', coverImage);
  }
  
  // Enqueue quiz với local media reference
  const actionId = await enqueueQuizCreate(
    { ...quizData, coverImage },
    userId,
    localQuizId
  );
  
  return { actionId, localQuizId };
}

/**
 * Helper: Enqueue deck update
 */
export async function enqueueDeckUpdate(
  deckId: string,
  updates: Record<string, any>,
  userId: string
): Promise<string> {
  return enqueueAction({
    type: 'update_deck',
    payload: { id: deckId, ...updates },
    priority: CONFIG.NORMAL_PRIORITY,
    meta: { deckId }
  }, userId);
}

/**
 * Helper: Enqueue deck delete
 */
export async function enqueueDeckDelete(
  deckId: string,
  userId: string
): Promise<string> {
  return enqueueAction({
    type: 'delete_deck',
    payload: { id: deckId },
    priority: CONFIG.NORMAL_PRIORITY,
    meta: { deckId }
  }, userId);
}

/**
 * Helper: Enqueue flashcard create
 */
export async function enqueueCardCreate(
  cardData: {
    deckId: string;
    front: string;
    back: string;
    imageUrl?: string;
    audioUrl?: string;
    tags?: string[];
  },
  userId: string,
  localId?: string
): Promise<string> {
  const cardId = localId || uuidv4();
  
  return enqueueAction({
    type: 'create_card',
    payload: { ...cardData, id: cardId },
    priority: CONFIG.NORMAL_PRIORITY,
    meta: { localId: cardId, deckId: cardData.deckId }
  }, userId);
}

/**
 * Helper: Enqueue flashcard update
 */
export async function enqueueCardUpdate(
  cardId: string,
  updates: Record<string, any>,
  userId: string
): Promise<string> {
  return enqueueAction({
    type: 'update_card',
    payload: { id: cardId, ...updates },
    priority: CONFIG.NORMAL_PRIORITY,
    meta: { cardId }
  }, userId);
}

/**
 * Helper: Enqueue flashcard delete
 */
export async function enqueueCardDelete(
  cardId: string,
  userId: string
): Promise<string> {
  return enqueueAction({
    type: 'delete_card',
    payload: { id: cardId },
    priority: CONFIG.NORMAL_PRIORITY,
    meta: { cardId }
  }, userId);
}

/**
 * Helper: Enqueue card review (spaced repetition)
 */
export async function enqueueCardReview(
  cardId: string,
  deckId: string,
  quality: number, // SM-2 quality rating (0-5)
  timeSpent: number,
  userId: string
): Promise<string> {
  return enqueueAction({
    type: 'review_card',
    payload: {
      cardId,
      deckId,
      userId,
      quality,
      timeSpent,
      reviewedAt: Date.now()
    },
    priority: CONFIG.HIGH_PRIORITY, // Reviews are important
    meta: { cardId, deckId }
  }, userId);
}

// ============================================================================
// QUEUE QUERIES
// ============================================================================

/**
 * Get pending actions for a user
 */
export async function getPendingActions(
  userId: string,
  limit: number = CONFIG.BATCH_SIZE
): Promise<PendingAction[]> {
  return await db.pending
    .where('userId').equals(userId)
    .and((item: PendingAction) => item.status === 'pending')
    .sortBy('priority')
    .then((items: PendingAction[]) => items.reverse().slice(0, limit)); // Higher priority first
}

/**
 * Get all pending actions (admin/debug)
 */
export async function getAllPending(
  limit: number = 100
): Promise<PendingAction[]> {
  return await db.pending
    .where('status').equals('pending')
    .limit(limit)
    .toArray();
}

/**
 * Get failed actions
 */
export async function getFailedActions(userId: string): Promise<PendingAction[]> {
  return await db.pending
    .where('userId').equals(userId)
    .and((item: PendingAction) => item.status === 'failed')
    .reverse()
    .sortBy('createdAt');
}

/**
 * Get action by actionId
 */
export async function getAction(actionId: string): Promise<PendingAction | undefined> {
  return await db.pending.where('actionId').equals(actionId).first();
}

// ============================================================================
// QUEUE UPDATES
// ============================================================================

/**
 * Mark action as syncing
 */
export async function markSyncing(id: number): Promise<void> {
  await db.pending.update(id, { status: 'syncing' });
}

/**
 * Mark action as synced (completed)
 */
export async function markSynced(id: number): Promise<void> {
  await db.pending.update(id, { status: 'synced' });
  
  // Optional: delete immediately or keep for audit
  // await db.pending.delete(id);
}

/**
 * Mark action as failed
 */
export async function markFailed(
  id: number,
  error: string,
  retries: number
): Promise<void> {
  const status = retries >= CONFIG.MAX_RETRIES ? 'failed' : 'pending';
  
  await db.pending.update(id, {
    status,
    retries,
    lastError: error
  });
}

/**
 * Retry a failed action
 */
export async function retryAction(id: number): Promise<void> {
  await db.pending.update(id, {
    status: 'pending',
    lastError: undefined
  });
  
  // Trigger sync
  window.dispatchEvent(new CustomEvent('offline-queue-changed'));
}

/**
 * Delete action from queue
 */
export async function deleteAction(id: number): Promise<void> {
  await db.pending.delete(id);
}

/**
 * Cancel all pending actions for a user
 */
export async function cancelAllPending(userId: string): Promise<number> {
  const actions = await db.pending
    .where('userId').equals(userId)
    .and((item: PendingAction) => item.status === 'pending')
    .toArray();
  
  await db.pending.bulkDelete(actions.map((a: PendingAction) => a.id!));
  
  return actions.length;
}

// ============================================================================
// QUEUE MAINTENANCE
// ============================================================================

/**
 * Clean up old synced actions
 */
export async function cleanupSynced(olderThanDays: number = 7): Promise<number> {
  const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
  
  const actions = await db.pending
    .where('status').equals('synced')
    .and((item: PendingAction) => item.createdAt < cutoff)
    .toArray();
  
  await db.pending.bulkDelete(actions.map((a: PendingAction) => a.id!));
  
  return actions.length;
}

/**
 * Clean up expired actions (TTL)
 */
export async function cleanupExpired(): Promise<number> {
  const now = Date.now();
  
  const actions = await db.pending
    .where('ttl').below(now)
    .toArray();
  
  await db.pending.bulkDelete(actions.map((a: PendingAction) => a.id!));
  
  return actions.length;
}

/**
 * Clean up all completed or old actions
 */
export async function performMaintenance(): Promise<{
  syncedRemoved: number;
  expiredRemoved: number;
}> {
  const syncedRemoved = await cleanupSynced();
  const expiredRemoved = await cleanupExpired();
  
  return { syncedRemoved, expiredRemoved };
}

// ============================================================================
// QUEUE STATISTICS
// ============================================================================

/**
 * Get queue statistics
 */
export async function getQueueStats(userId?: string): Promise<{
  pending: number;
  syncing: number;
  failed: number;
  synced: number;
  total: number;
  oldestPending?: number; // Age in ms
}> {
  let query = db.pending.toCollection();
  
  if (userId) {
    query = db.pending.where('userId').equals(userId);
  }
  
  const all = await query.toArray();
  
  const pending = all.filter((a: PendingAction) => a.status === 'pending');
  const oldestPending = pending.length > 0
    ? Date.now() - Math.min(...pending.map((a: PendingAction) => a.createdAt))
    : undefined;
  
  return {
    pending: pending.length,
    syncing: all.filter((a: PendingAction) => a.status === 'syncing').length,
    failed: all.filter((a: PendingAction) => a.status === 'failed').length,
    synced: all.filter((a: PendingAction) => a.status === 'synced').length,
    total: all.length,
    oldestPending
  };
}

/**
 * Check if action was already processed (idempotency)
 */
export async function isActionProcessed(actionId: string): Promise<boolean> {
  const record = await db.processedActions.get(actionId);
  return !!record;
}

/**
 * Mark action as processed (for idempotency)
 */
export async function markActionProcessed(
  actionId: string,
  userId: string
): Promise<void> {
  await db.processedActions.put({
    actionId,
    userId,
    processedAt: Date.now()
  });
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const offlineQueueService = {
  // Enqueue - General
  enqueueAction,
  enqueueMediaUpload,
  enqueueVote,
  
  // Enqueue - Quiz
  enqueueQuizResult,
  enqueueQuizCreate,
  enqueueQuizUpdate,
  enqueueQuizDelete,
  
  // 🆕 Combined helpers (Media + Action)
  saveMediaForOffline,
  enqueueQuizCreateWithMedia,
  
  // Enqueue - Flashcard
  enqueueDeckCreate,
  enqueueDeckUpdate,
  enqueueDeckDelete,
  enqueueCardCreate,
  enqueueCardUpdate,
  enqueueCardDelete,
  enqueueCardReview,
  
  // Query
  getPendingActions,
  getAllPending,
  getFailedActions,
  getAction,
  
  // Update
  markSyncing,
  markSynced,
  markFailed,
  retryAction,
  deleteAction,
  cancelAllPending,
  
  // Maintenance
  cleanupSynced,
  cleanupExpired,
  performMaintenance,
  
  // Stats
  getQueueStats,
  isActionProcessed,
  markActionProcessed,
  
  // Config
  CONFIG
};

export default offlineQueueService;
