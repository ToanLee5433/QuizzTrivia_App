import { useState, useEffect, useCallback } from 'react';
import { ref, set, get, serverTimestamp } from 'firebase/database';
import { rtdb } from '../../../lib/firebase/config';
import { toast } from 'react-toastify';
import { logger } from '../utils/logger';

/**
 * Hook to handle player reconnection after network interruption
 * Restores player state and syncs with current game state
 */
export function useReconnection(
  roomId: string,
  userId: string,
  username: string,
  enabled: boolean = true
) {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const handleReconnect = useCallback(async () => {
    if (!roomId || !userId || !enabled) return;

    setIsReconnecting(true);
    setReconnectAttempts((prev) => prev + 1);

    try {
      logger.info('Attempting to reconnect', { roomId, userId, attempt: reconnectAttempts + 1 });

      // 1. Restore player presence
      const presenceRef = ref(rtdb, `rooms/${roomId}/presence/${userId}`);
      const presenceSnap = await get(presenceRef);
      const lastKnownPresence = presenceSnap.val() || {};

      await set(presenceRef, {
        ...lastKnownPresence,
        username,
        isOnline: true,
        lastSeen: serverTimestamp(),
        reconnectedAt: serverTimestamp(),
        reconnectCount: (lastKnownPresence.reconnectCount || 0) + 1,
      });

      // 2. Re-sync game state
      const gameStateRef = ref(rtdb, `rooms/${roomId}/gameState`);
      const gameStateSnap = await get(gameStateRef);
      const currentGameState = gameStateSnap.val();

      if (!currentGameState) {
        throw new Error('Game state not found');
      }

      // 3. Check if question changed while offline
      const playerStateRef = ref(rtdb, `rooms/${roomId}/answerProgress/${userId}`);
      const playerStateSnap = await get(playerStateRef);
      const lastPlayerState = playerStateSnap.val();

      const currentQuestionIndex = currentGameState.currentQuestionIndex || 0;
      const lastQuestionIndex = lastPlayerState?.lastQuestionIndex || 0;

      if (currentQuestionIndex > lastQuestionIndex) {
        // Missed questions - notify user
        const missedCount = currentQuestionIndex - lastQuestionIndex;
        
        logger.warn('Player missed questions while offline', {
          roomId,
          userId,
          missedCount,
          currentQuestion: currentQuestionIndex,
          lastQuestion: lastQuestionIndex,
        });

        toast.info(
          `Reconnected! You missed ${missedCount} question${missedCount > 1 ? 's' : ''}. ` +
          `Now on question ${currentQuestionIndex + 1}/${currentGameState.totalQuestions}`,
          { autoClose: 5000 }
        );
      } else {
        // Reconnected during same question
        toast.success('Reconnected successfully!', { autoClose: 3000 });
      }

      // 4. Mark as ready if game is in lobby
      if (currentGameState.phase === 'lobby' || currentGameState.phase === 'waiting') {
        const playerStatusRef = ref(rtdb, `rooms/${roomId}/playerStatuses/${userId}`);
        await set(playerStatusRef, {
          isReady: lastPlayerState?.isReady || false,
          updatedAt: serverTimestamp(),
        });
      }

      setIsReconnecting(false);
      logger.info('Reconnection successful', { roomId, userId });

    } catch (error) {
      setIsReconnecting(false);
      
      logger.error('Reconnection failed', {
        roomId,
        userId,
        attempt: reconnectAttempts + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      toast.error(
        reconnectAttempts >= 2
          ? 'Failed to reconnect. Please refresh the page.'
          : 'Reconnection failed. Retrying...',
        { autoClose: 4000 }
      );

      // Retry after delay (exponential backoff)
      if (reconnectAttempts < 3) {
        const retryDelay = Math.min(1000 * Math.pow(2, reconnectAttempts), 8000);
        setTimeout(() => {
          handleReconnect();
        }, retryDelay);
      }
    }
  }, [roomId, userId, username, enabled, reconnectAttempts]);

  useEffect(() => {
    if (!enabled) return;

    // Listen for online event
    const handleOnline = () => {
      logger.info('Network connection restored', { roomId, userId });
      handleReconnect();
    };

    // Listen for offline event
    const handleOffline = () => {
      logger.warn('Network connection lost', { roomId, userId });
      toast.error('Connection lost. Attempting to reconnect...', {
        autoClose: 3000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection status on mount
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [roomId, userId, enabled, handleReconnect]);

  return {
    isReconnecting,
    reconnectAttempts,
    manualReconnect: handleReconnect,
  };
}
