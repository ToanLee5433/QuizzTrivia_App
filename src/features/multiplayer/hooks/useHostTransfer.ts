import { useEffect } from 'react';
import { ref, onValue, update, get, serverTimestamp, off } from 'firebase/database';
import { rtdb } from '../../../lib/firebase/config';
import { toast } from 'react-toastify';
import { logger } from '../utils/logger';
import { gameStateService } from '../services/gameStateService';

/**
 * Hook to handle host disconnection and transfer host role
 * Monitors host presence and transfers host to next available player
 */
export function useHostTransfer(roomId: string, currentHostId: string, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !roomId || !currentHostId) return;

    const hostPresenceRef = ref(rtdb, `rooms/${roomId}/presence/${currentHostId}`);

    // Monitor host presence
    const unsubscribe = onValue(hostPresenceRef, async (snapshot) => {
      const presenceData = snapshot.val();
      const isOnline = presenceData?.isOnline === true;

      if (!isOnline) {
        logger.warn('Host disconnected, initiating transfer', { roomId, currentHostId });

        try {
          // Get all players
          const playersRef = ref(rtdb, `rooms/${roomId}/presence`);
          const playersSnap = await get(playersRef);
          const players = playersSnap.val() || {};

          // Find online players (excluding current host)
          const playerEntries = Object.entries(players) as [string, any][];
          const onlinePlayers = playerEntries
            .filter(([id, data]) => 
              id !== currentHostId && 
              data.isOnline === true
            )
            .sort((a, b) => {
              // Sort by joinedAt or lastSeen
              const aTime = a[1]?.joinedAt || a[1]?.lastSeen || 0;
              const bTime = b[1]?.joinedAt || b[1]?.lastSeen || 0;
              return (aTime as number) - (bTime as number);
            });

          if (onlinePlayers.length > 0) {
            const [newHostId, newHostData] = onlinePlayers[0];
            const username = (newHostData as any)?.username || 'Next player';

            // Transfer host in RTDB
            await update(ref(rtdb, `rooms/${roomId}/gameState`), {
              hostId: newHostId,
              hostTransferredAt: serverTimestamp(),
              previousHostId: currentHostId,
            });

            logger.info('Host transferred successfully', {
              roomId,
              oldHost: currentHostId,
              newHost: newHostId,
            });

            // Notify all players
            toast.success(
              `Host disconnected. ${username} is now the host.`,
              { autoClose: 5000 }
            );
          } else {
            // No players left - end game
            logger.warn('No players left, ending game', { roomId });
            
            await gameStateService.endGame(roomId);
            
            toast.error('All players disconnected. Game ended.', {
              autoClose: 5000,
            });
          }
        } catch (error) {
          logger.error('Host transfer failed', {
            roomId,
            currentHostId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          toast.error('Failed to transfer host. Please refresh the page.');
        }
      }
    });

    return () => {
      off(hostPresenceRef);
      unsubscribe();
    };
  }, [roomId, currentHostId, enabled]);
}
