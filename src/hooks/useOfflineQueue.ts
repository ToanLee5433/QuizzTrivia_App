import { useState, useEffect, useCallback } from 'react';
import {
  enqueueAction,
  getAllPending,
  retryAction,
  deleteAction
} from '../shared/services/offlineQueue';
import type { PendingAction } from '../features/flashcard/services/database';

interface UseOfflineQueueReturn {
  isOnline: boolean;
  pendingActions: PendingAction[];
  pendingCount: number;
  mediaCount: number;
  isSyncing: boolean;
  createQuizOffline: (quizData: any) => Promise<string>;
  updateQuizOffline: (id: string, quizData: any) => Promise<string>;
  deleteQuizOffline: (id: string) => Promise<string>;
  uploadMediaOffline: (file: File, path: string) => Promise<string>;
  retryFailedAction: (id: number) => Promise<void>;
  deleteFailedAction: (id: number) => Promise<void>;
  refreshQueue: () => Promise<void>;
  clearCompleted: () => Promise<void>;
}

/**
 * Hook for managing offline queue operations
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

  // Create quiz offline
  const createQuizOffline = useCallback(async (quizData: any): Promise<string> => {
    const userId = quizData.createdBy || 'anonymous';
    return enqueueAction({ type: 'create_quiz', payload: quizData }, userId);
  }, []);

  // Update quiz offline
  const updateQuizOffline = useCallback(async (id: string, quizData: any): Promise<string> => {
    const userId = quizData.updatedBy || 'anonymous';
    return enqueueAction({ type: 'update_quiz', payload: { id, ...quizData } }, userId);
  }, []);

  // Delete quiz offline
  const deleteQuizOffline = useCallback(async (id: string): Promise<string> => {
    return enqueueAction({ type: 'delete_quiz', payload: { id } }, 'current-user');
  }, []);

  // Upload media offline
  const uploadMediaOffline = useCallback(async (file: File, path: string): Promise<string> => {
    return enqueueAction({ 
      type: 'upload_media', 
      payload: { file, path } 
    }, 'current-user');
  }, []);

  // Retry failed action
  const retryFailedAction = useCallback(async (id: number) => {
    await retryAction(id);
    await refreshQueue();
  }, [refreshQueue]);

  // Delete failed action
  const deleteFailedAction = useCallback(async (id: number) => {
    await deleteAction(id);
    await refreshQueue();
  }, [refreshQueue]);

  // Clear completed actions
  const clearCompleted = useCallback(async () => {
    // Implementation would filter and delete completed actions
    await refreshQueue();
  }, [refreshQueue]);

  return {
    isOnline,
    pendingActions,
    pendingCount,
    mediaCount,
    isSyncing,
    createQuizOffline,
    updateQuizOffline,
    deleteQuizOffline,
    uploadMediaOffline,
    retryFailedAction,
    deleteFailedAction,
    refreshQueue,
    clearCompleted
  };
}
