/**
 * 🔄 SYNC LAYER: Enhanced Sync Service with Batching
 * ====================================================
 * Thay thế sync tuần tự bằng Atomic Batching để tối ưu hiệu suất
 * - Batch 450 operations/lần (Firebase limit: 500, để an toàn dùng 450)
 * - Retry logic với exponential backoff
 * - Integration với offlineQueue service
 */

import { writeBatch, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { offlineQueueService } from '../shared/services/offlineQueue';
import type { PendingAction } from '../features/flashcard/services/database';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  BATCH_LIMIT: 450, // Firebase allows 500, we use 450 for safety
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 1000, // 1 second
  MAX_BACKOFF_MS: 30000, // 30 seconds
  SYNC_INTERVAL_MS: 30000, // 30 seconds auto-sync
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
  duration: number; // milliseconds
}

export interface BatchOperation {
  type: 'SET' | 'UPDATE' | 'DELETE';
  collection: string;
  docId: string;
  data?: any;
  merge?: boolean;
}

// ============================================================================
// STATE
// ============================================================================

let isSyncing = false;
let autoSyncInterval: number | null = null;
let onlineEventListener: (() => void) | null = null;
let visibilityChangeListener: (() => void) | null = null;
let lastSyncTime = 0;
const MIN_SYNC_INTERVAL = 5000; // Debounce: min 5s between syncs

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Chuyển đổi PendingAction thành BatchOperation
 */
function convertToBatchOperation(action: PendingAction): BatchOperation | null {
  try {
    switch (action.type) {
      // Flashcard operations
      case 'create_deck':
      case 'create_card':
        return {
          type: 'SET',
          collection: action.type === 'create_deck' ? 'flashcard_decks' : 'flashcard_cards',
          docId: action.payload.id,
          data: action.payload,
          merge: true,
        };

      case 'update_deck':
      case 'update_card':
        const { id, ...updateData } = action.payload;
        return {
          type: 'UPDATE',
          collection: action.type === 'update_deck' ? 'flashcard_decks' : 'flashcard_cards',
          docId: id,
          data: { ...updateData, updatedAt: Date.now() },
        };

      case 'delete_deck':
      case 'delete_card':
        return {
          type: 'DELETE',
          collection: action.type === 'delete_deck' ? 'flashcard_decks' : 'flashcard_cards',
          docId: action.payload.id,
        };

      // Quiz operations
      case 'submit_result':
        return {
          type: 'SET',
          collection: 'quiz_results',
          docId: action.payload.id,
          data: action.payload,
        };

      case 'submit_answer':
        return {
          type: 'SET',
          collection: 'quiz_answers',
          docId: `${action.payload.quizId}_${action.payload.questionId}_${action.userId}`,
          data: {
            ...action.payload,
            userId: action.userId,
            submittedAt: Date.now(),
          },
        };

      // Progress tracking
      case 'update_progress':
        return {
          type: 'SET',
          collection: 'user_progress',
          docId: `${action.userId}_${action.payload.deckId || action.payload.quizId}`,
          data: {
            ...action.payload,
            userId: action.userId,
            updatedAt: Date.now(),
          },
          merge: true,
        };

      // Generic operations
      case 'vote':
        return {
          type: 'SET',
          collection: 'votes',
          docId: `${action.userId}_${action.payload.targetId}`,
          data: {
            userId: action.userId,
            targetId: action.payload.targetId,
            targetType: action.payload.targetType,
            value: action.payload.voteValue,
            timestamp: Date.now(),
          },
          merge: true,
        };

      case 'favorite':
        if (action.payload.action === 'add') {
          return {
            type: 'SET',
            collection: 'favorites',
            docId: `${action.userId}_${action.payload.targetId}`,
            data: {
              userId: action.userId,
              targetId: action.payload.targetId,
              targetType: action.payload.targetType,
              createdAt: Date.now(),
            },
          };
        } else {
          return {
            type: 'DELETE',
            collection: 'favorites',
            docId: `${action.userId}_${action.payload.targetId}`,
          };
        }

      default:
        console.warn(`[SyncService] Unknown action type: ${action.type}`);
        return null;
    }
  } catch (error) {
    console.error('[SyncService] Failed to convert action:', error);
    return null;
  }
}

/**
 * Thực thi một batch operations với fallback khi fail
 */
async function executeBatch(operations: BatchOperation[]): Promise<void> {
  if (operations.length === 0) return;

  const batch = writeBatch(db);

  operations.forEach((op) => {
    const docRef = doc(db, op.collection, op.docId);

    switch (op.type) {
      case 'SET':
        batch.set(docRef, op.data, op.merge ? { merge: true } : {});
        break;

      case 'UPDATE':
        batch.update(docRef, op.data);
        break;

      case 'DELETE':
        batch.delete(docRef);
        break;
    }
  });

  try {
    // Atomic commit - TẤT CẢ thành công hoặc TẤT CẢ thất bại
    await batch.commit();
  } catch (error) {
    const errorCode = (error as any).code;
    
    // 🌐 Network/Server errors: THROW để retry logic xử lý (Exponential Backoff)
    if (isRetryableError(errorCode)) {
      console.warn(`[SyncService] Batch failed with retryable error: ${errorCode}`);
      throw error; // Let exponential backoff handle it
    }
    
    // 🔴 Permanent errors (data validation): FALLBACK sang individual sync
    if (isPermanentError(errorCode)) {
      console.warn(`[SyncService] Batch failed with permanent error: ${errorCode}`);
      console.warn('[SyncService] Falling back to individual sync to isolate bad operations');
      
      // FALLBACK: Sync từng operation để cứu những operation hợp lệ
      await executeBatchIndividually(operations);
    } else {
      // Unknown error - rethrow để safety
      console.error(`[SyncService] Unknown error: ${errorCode}`);
      throw error;
    }
  }
}

/**
 * 🎯 Phân loại lỗi để quyết định retry strategy
 */
function isPermanentError(errorCode: string): boolean {
  const permanentErrors = [
    'permission-denied',      // Security Rules violation
    'invalid-argument',       // Data validation failed
    'already-exists',         // Document ID conflict
    'failed-precondition',    // Business logic violation
    'out-of-range',          // Value out of acceptable range
    'unauthenticated',       // Auth token expired/invalid
  ];
  
  return permanentErrors.includes(errorCode);
}

/**
 * 🌐 Check nếu lỗi là network/server (NÊN retry)
 */
function isRetryableError(errorCode: string): boolean {
  const retryableErrors = [
    'unavailable',           // Server down/overloaded
    'deadline-exceeded',     // Request timeout
    'resource-exhausted',    // Rate limit (should retry with backoff)
    'aborted',              // Transaction conflict
    'cancelled',            // Request cancelled by client
  ];
  
  return retryableErrors.includes(errorCode);
}

/**
 * Fallback: Sync từng operation riêng lẻ
 * Điều này giúp cô lập operation bị lỗi và sync thành công các operation khác
 */
async function executeBatchIndividually(operations: BatchOperation[]): Promise<void> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ index: number; operation: BatchOperation; error: string }>,
  };

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    
    try {
      const docRef = doc(db, op.collection, op.docId);

      switch (op.type) {
        case 'SET':
          await setDoc(docRef, op.data, op.merge ? { merge: true } : {});
          break;

        case 'UPDATE':
          await updateDoc(docRef, op.data);
          break;

        case 'DELETE':
          await deleteDoc(docRef);
          break;
      }

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        index: i,
        operation: op,
        error: (error as Error).message,
      });
      
      console.error(`[SyncService] Operation ${i} failed:`, {
        type: op.type,
        collection: op.collection,
        docId: op.docId,
        error: (error as Error).message,
      });
    }
  }

  console.log(`[SyncService] Individual sync complete: ${results.success} success, ${results.failed} failed`);

  // Log failed operations để debug
  if (results.errors.length > 0) {
    console.error('[SyncService] Failed operations:', results.errors);
  }

  // Nếu TẤT CẢ đều fail, throw error để trigger retry logic
  if (results.success === 0) {
    throw new Error(`All ${results.failed} operations failed in individual sync`);
  }
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Đồng bộ tất cả pending actions với batching
 */
export async function syncPendingData(userId: string): Promise<SyncResult> {
  if (isSyncing) {
    console.log('[SyncService] Sync already in progress');
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ['Sync already in progress'],
      duration: 0,
    };
  }

  if (!navigator.onLine) {
    console.log('[SyncService] Device offline, skipping sync');
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ['Device is offline'],
      duration: 0,
    };
  }

  isSyncing = true;
  const startTime = Date.now();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // 1. Get all pending actions
    const pendingActions = await offlineQueueService.getPendingActions(userId, 1000); // Get up to 1000

    if (pendingActions.length === 0) {
      console.log('[SyncService] No pending actions to sync');
      return {
        success: true,
        synced: 0,
        failed: 0,
        errors: [],
        duration: Date.now() - startTime,
      };
    }

    console.log(`[SyncService] Found ${pendingActions.length} pending actions`);

    // 2. Convert to batch operations
    const batchOps: Array<{ action: PendingAction; operation: BatchOperation | null }> = [];

    for (const action of pendingActions) {
      // Check if already processed (idempotency)
      const alreadyProcessed = await offlineQueueService.isActionProcessed(action.actionId);
      if (alreadyProcessed) {
        await offlineQueueService.markSynced(action.id!);
        synced++;
        continue;
      }

      const operation = convertToBatchOperation(action);
      batchOps.push({ action, operation });
    }

    // 3. Split into chunks (450 ops per batch)
    const chunks: Array<typeof batchOps> = [];
    for (let i = 0; i < batchOps.length; i += CONFIG.BATCH_LIMIT) {
      chunks.push(batchOps.slice(i, i + CONFIG.BATCH_LIMIT));
    }

    console.log(`[SyncService] Processing ${chunks.length} batches`);

    // 4. Execute each chunk with retry logic
    for (const [chunkIndex, chunk] of chunks.entries()) {
      const validOps = chunk.filter((item) => item.operation !== null);

      if (validOps.length === 0) continue;

      let retries = 0;
      let success = false;

      while (retries <= CONFIG.MAX_RETRIES && !success) {
        try {
          // Execute batch
          await executeBatch(validOps.map((item) => item.operation!));

          // Mark all as synced
          for (const item of validOps) {
            await offlineQueueService.markSynced(item.action.id!);
            await offlineQueueService.markActionProcessed(item.action.actionId, userId);
          }

          synced += validOps.length;
          success = true;

          console.log(
            `[SyncService] Batch ${chunkIndex + 1}/${chunks.length} synced (${validOps.length} items)`
          );
        } catch (error) {
          retries++;
          const errorMsg = (error as Error).message;

          if (retries > CONFIG.MAX_RETRIES) {
            // Mark all as failed
            for (const item of validOps) {
              await offlineQueueService.markFailed(
                item.action.id!,
                errorMsg,
                item.action.retries + 1
              );
            }

            failed += validOps.length;
            errors.push(`Batch ${chunkIndex + 1} failed: ${errorMsg}`);

            console.error(
              `[SyncService] Batch ${chunkIndex + 1} failed after ${CONFIG.MAX_RETRIES} retries:`,
              error
            );
          } else {
            // Wait before retry (exponential backoff)
            const backoff = Math.min(
              CONFIG.MAX_BACKOFF_MS,
              CONFIG.INITIAL_BACKOFF_MS * Math.pow(2, retries - 1)
            );

            console.warn(
              `[SyncService] Batch ${chunkIndex + 1} failed, retrying in ${backoff}ms...`
            );

            await new Promise((resolve) => setTimeout(resolve, backoff));
          }
        }
      }
    }

    // 5. Cleanup old synced items
    await offlineQueueService.cleanupSynced(7); // Remove items older than 7 days

    const duration = Date.now() - startTime;

    console.log(
      `✅ [SyncService] Sync complete: ${synced} synced, ${failed} failed in ${duration}ms`
    );

    return {
      success: failed === 0,
      synced,
      failed,
      errors,
      duration,
    };
  } catch (error) {
    const errorMsg = (error as Error).message;
    console.error('[SyncService] Fatal sync error:', error);

    return {
      success: false,
      synced,
      failed,
      errors: [errorMsg],
      duration: Date.now() - startTime,
    };
  } finally {
    isSyncing = false;
  }
}

// ============================================================================
// AUTO-SYNC
// ============================================================================

/**
 * 🔧 OPTIMIZED: Event-driven sync với debounce
 * - Sync ngay khi online (online event)
 * - Sync khi user quay lại tab (visibilitychange)
 * - Fallback periodic sync (60s thay vì 30s để tiết kiệm pin)
 * - Debounce để tránh spam (min 5s giữa các sync)
 */
export function startAutoSync(userId: string, intervalMs: number = 60000): void {
  if (autoSyncInterval) {
    stopAutoSync();
  }

  // Helper: Debounced sync
  const debouncedSync = async () => {
    const now = Date.now();
    if (now - lastSyncTime < MIN_SYNC_INTERVAL) {
      console.log('[SyncService] ⏸️ Debounced: Too soon since last sync');
      return;
    }
    
    if (navigator.onLine && !isSyncing) {
      lastSyncTime = now;
      await syncPendingData(userId).catch(console.error);
    }
  };

  // 1. Initial sync
  if (navigator.onLine) {
    debouncedSync();
  }

  // 2. 🔥 Periodic sync (fallback, tăng lên 60s)
  autoSyncInterval = window.setInterval(() => {
    debouncedSync();
  }, intervalMs);

  // 3. 🔥 Online event (sync ngay khi có mạng)
  onlineEventListener = () => {
    console.log('[SyncService] 🌐 Device online, triggering immediate sync');
    debouncedSync();
  };
  window.addEventListener('online', onlineEventListener);

  // 4. 🔥 Visibility change (sync khi user quay lại tab)
  visibilityChangeListener = () => {
    if (!document.hidden && navigator.onLine) {
      console.log('[SyncService] 👁️ Tab visible, triggering sync');
      debouncedSync();
    }
  };
  document.addEventListener('visibilitychange', visibilityChangeListener);

  console.log(`[SyncService] ✅ Auto-sync started (interval: ${intervalMs}ms, events: online + visibility)`);
}

/**
 * Dừng auto-sync và cleanup event listeners
 */
export function stopAutoSync(): void {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }

  // 🧹 Cleanup event listeners
  if (onlineEventListener) {
    window.removeEventListener('online', onlineEventListener);
    onlineEventListener = null;
  }

  if (visibilityChangeListener) {
    document.removeEventListener('visibilitychange', visibilityChangeListener);
    visibilityChangeListener = null;
  }

  console.log('[SyncService] Auto-sync stopped + events cleaned up');
}

// ============================================================================
// MANUAL SYNC
// ============================================================================

/**
 * Trigger sync thủ công
 */
export async function triggerManualSync(userId: string): Promise<SyncResult> {
  if (!navigator.onLine) {
    throw new Error('Device is offline. Please connect to the internet to sync.');
  }

  if (isSyncing) {
    throw new Error('Sync already in progress. Please wait.');
  }

  return syncPendingData(userId);
}

/**
 * 🔥 NEW: Trigger immediate sync (không debounce)
 * Dùng khi user submit quiz, bấm nộp bài, etc.
 */
export async function triggerImmediateSync(userId: string): Promise<SyncResult> {
  if (!navigator.onLine) {
    console.log('[SyncService] Offline, queueing for later sync');
    throw new Error('Device is offline. Data will sync when online.');
  }

  if (isSyncing) {
    console.log('[SyncService] Sync in progress, will retry shortly');
    throw new Error('Sync already in progress.');
  }

  console.log('[SyncService] ⚡ Immediate sync triggered');
  lastSyncTime = Date.now();
  return syncPendingData(userId);
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const enhancedSyncService = {
  // Sync
  syncPendingData,
  triggerManualSync,
  triggerImmediateSync, // 🔥 NEW: Immediate sync

  // Auto-sync
  startAutoSync,
  stopAutoSync,

  // Status
  isSyncing: () => isSyncing,
  isOnline: () => navigator.onLine,

  // Config
  CONFIG,
};

export default enhancedSyncService;
