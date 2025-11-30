/**
 * Offline Queue Service (Production-Ready)
 * Central queue management for entire application
 * Handles Quiz, Flashcard, Forum, and Media offline actions
 */

// @ts-ignore - uuid module types
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../features/flashcard/services/database';
import type { PendingAction } from '../../features/flashcard/services/database';

// ============================================================================
// CONFIGURATION
// ============================================================================

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
    userId
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
  // Enqueue
  enqueueAction,
  enqueueDeckCreate,
  enqueueQuizResult,
  enqueueMediaUpload,
  enqueueVote,
  
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
