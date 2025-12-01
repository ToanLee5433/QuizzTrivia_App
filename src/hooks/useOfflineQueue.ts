import { useState, useEffect, useCallback } from 'react';
import {
  enqueueQuizCreate,
  enqueueQuizUpdate,
  enqueueQuizDelete,
  enqueueMediaUpload,
  enqueueDeckCreate,
  enqueueDeckUpdate,
  enqueueDeckDelete,
  enqueueCardCreate,
  enqueueCardUpdate,
  enqueueCardDelete,
  enqueueCardReview,
  getAllPending,
  retryAction,
  deleteAction,
  cleanupSynced
} from '../shared/services/offlineQueue';
import type { PendingAction } from '../features/flashcard/services/database';

interface UseOfflineQueueReturn {
  isOnline: boolean;
  pendingActions: PendingAction[];
  pendingCount: number;
  mediaCount: number;
  isSyncing: boolean;
  // Quiz operations
  createQuizOffline: (quizData: any, userId: string) => Promise<string>;
  updateQuizOffline: (id: string, updates: any, userId: string) => Promise<string>;
  deleteQuizOffline: (id: string, userId: string) => Promise<string>;
  // Flashcard operations
  createDeckOffline: (deckData: any, userId: string) => Promise<string>;
  updateDeckOffline: (id: string, updates: any, userId: string) => Promise<string>;
  deleteDeckOffline: (id: string, userId: string) => Promise<string>;
  createCardOffline: (cardData: any, userId: string) => Promise<string>;
  updateCardOffline: (id: string, updates: any, userId: string) => Promise<string>;
  deleteCardOffline: (id: string, userId: string) => Promise<string>;
  reviewCardOffline: (cardId: string, deckId: string, quality: number, timeSpent: number, userId: string) => Promise<string>;
  // Media
  uploadMediaOffline: (mediaKey: string, path: string, userId: string) => Promise<string>;
  // Queue management
  retryFailedAction: (id: number) => Promise<void>;
  deleteFailedAction: (id: number) => Promise<void>;
  refreshQueue: () => Promise<void>;
  clearCompleted: () => Promise<void>;
}

/**
 * Hook for managing offline queue operations
 * 🔥 COMPLETE: All CRUD operations for Quiz & Flashcard
 */
export function useOfflineQueue(): UseOfflineQueueReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isSyncing] = useState(false);

  // Update online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending actions
  const refreshQueue = useCallback(async () => {
    try {
      const actions = await getAllPending();
      setPendingActions(actions);
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  }, []);

  // Initial load and listen for changes
  useEffect(() => {
    refreshQueue();

    const handleQueueChange = () => {
      refreshQueue();
    };

    window.addEventListener('offline-queue-changed', handleQueueChange);
    return () => {
      window.removeEventListener('offline-queue-changed', handleQueueChange);
    };
  }, [refreshQueue]);

  // Calculate counts
  const pendingCount = pendingActions.filter(a => a.status === 'pending' || a.status === 'syncing').length;
  const mediaCount = pendingActions.filter(a => a.type === 'upload_media').length;

  // ============================================================================
  // QUIZ OPERATIONS
  // ============================================================================

  const createQuizOffline = useCallback(async (quizData: any, userId: string): Promise<string> => {
    return enqueueQuizCreate(quizData, userId);
  }, []);

  const updateQuizOffline = useCallback(async (id: string, updates: any, userId: string): Promise<string> => {
    return enqueueQuizUpdate(id, updates, userId);
  }, []);

  const deleteQuizOffline = useCallback(async (id: string, userId: string): Promise<string> => {
    return enqueueQuizDelete(id, userId);
  }, []);

  // ============================================================================
  // FLASHCARD OPERATIONS
  // ============================================================================

  const createDeckOffline = useCallback(async (deckData: any, userId: string): Promise<string> => {
    return enqueueDeckCreate(deckData, userId);
  }, []);

  const updateDeckOffline = useCallback(async (id: string, updates: any, userId: string): Promise<string> => {
    return enqueueDeckUpdate(id, updates, userId);
  }, []);

  const deleteDeckOffline = useCallback(async (id: string, userId: string): Promise<string> => {
    return enqueueDeckDelete(id, userId);
  }, []);

  const createCardOffline = useCallback(async (cardData: any, userId: string): Promise<string> => {
    return enqueueCardCreate(cardData, userId);
  }, []);

  const updateCardOffline = useCallback(async (id: string, updates: any, userId: string): Promise<string> => {
    return enqueueCardUpdate(id, updates, userId);
  }, []);

  const deleteCardOffline = useCallback(async (id: string, userId: string): Promise<string> => {
    return enqueueCardDelete(id, userId);
  }, []);

  const reviewCardOffline = useCallback(async (
    cardId: string, 
    deckId: string, 
    quality: number, 
    timeSpent: number, 
    userId: string
  ): Promise<string> => {
    return enqueueCardReview(cardId, deckId, quality, timeSpent, userId);
  }, []);

  // ============================================================================
  // MEDIA OPERATIONS
  // ============================================================================

  const uploadMediaOffline = useCallback(async (mediaKey: string, path: string, userId: string): Promise<string> => {
    return enqueueMediaUpload(mediaKey, path, userId);
  }, []);

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  const retryFailedAction = useCallback(async (id: number) => {
    await retryAction(id);
    await refreshQueue();
  }, [refreshQueue]);

  const deleteFailedAction = useCallback(async (id: number) => {
    await deleteAction(id);
    await refreshQueue();
  }, [refreshQueue]);

  const clearCompleted = useCallback(async () => {
    await cleanupSynced(0); // Remove all synced immediately
    await refreshQueue();
  }, [refreshQueue]);

  return {
    isOnline,
    pendingActions,
    pendingCount,
    mediaCount,
    isSyncing,
    // Quiz
    createQuizOffline,
    updateQuizOffline,
    deleteQuizOffline,
    // Flashcard
    createDeckOffline,
    updateDeckOffline,
    deleteDeckOffline,
    createCardOffline,
    updateCardOffline,
    deleteCardOffline,
    reviewCardOffline,
    // Media
    uploadMediaOffline,
    // Queue management
    retryFailedAction,
    deleteFailedAction,
    refreshQueue,
    clearCompleted
  };
}
