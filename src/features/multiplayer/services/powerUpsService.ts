/**
 * Power-Ups Service
 * Manages 50/50, x2 Score, and Freeze Time power-ups with real-time sync
 */

import { ref, set, get, update, onValue, off } from 'firebase/database';
import { rtdb } from '../../../lib/firebase/config';
import { logger } from '../utils/logger';

export type PowerUpType = '50-50' | 'x2-score' | 'freeze-time';

export interface PowerUpState {
  type: PowerUpType;
  available: boolean;
  used: boolean;
  usedAt?: number; // timestamp
  usedOnQuestion?: number; // question index
}

export interface PlayerPowerUps {
  '50-50': PowerUpState;
  'x2-score': PowerUpState;
  'freeze-time': PowerUpState;
}

class PowerUpsService {
  /**
   * Initialize power-ups for a player in a room
   */
  async initializePowerUps(roomCode: string, playerId: string): Promise<void> {
    try {
      const powerUpsRef = ref(rtdb, `rooms/${roomCode}/players/${playerId}/powerUps`);
      
      const defaultPowerUps: PlayerPowerUps = {
        '50-50': {
          type: '50-50',
          available: true,
          used: false
        },
        'x2-score': {
          type: 'x2-score',
          available: true,
          used: false
        },
        'freeze-time': {
          type: 'freeze-time',
          available: true,
          used: false
        }
      };

      await set(powerUpsRef, defaultPowerUps);
      logger.info('Power-ups initialized', { roomCode, playerId });
    } catch (error) {
      logger.error('Failed to initialize power-ups', { error, roomCode, playerId });
      throw error;
    }
  }

  /**
   * Use a power-up (client-side action)
   */
  async usePowerUp(
    roomCode: string, 
    playerId: string, 
    powerUpType: PowerUpType,
    questionIndex: number
  ): Promise<boolean> {
    try {
      const powerUpRef = ref(rtdb, `rooms/${roomCode}/players/${playerId}/powerUps/${powerUpType}`);
      
      // Check if power-up is available
      const snapshot = await get(powerUpRef);
      const powerUpState = snapshot.val() as PowerUpState;

      if (!powerUpState || !powerUpState.available || powerUpState.used) {
        logger.warn('Power-up not available', { roomCode, playerId, powerUpType });
        return false;
      }

      // Mark as used
      await update(powerUpRef, {
        used: true,
        usedAt: Date.now(),
        usedOnQuestion: questionIndex
      });

      logger.info('Power-up used', { roomCode, playerId, powerUpType, questionIndex });
      return true;
    } catch (error) {
      logger.error('Failed to use power-up', { error, roomCode, playerId, powerUpType });
      return false;
    }
  }

  /**
   * Get player's power-ups state
   */
  async getPowerUps(roomCode: string, playerId: string): Promise<PlayerPowerUps | null> {
    try {
      const powerUpsRef = ref(rtdb, `rooms/${roomCode}/players/${playerId}/powerUps`);
      const snapshot = await get(powerUpsRef);
      return snapshot.val() as PlayerPowerUps | null;
    } catch (error) {
      logger.error('Failed to get power-ups', { error, roomCode, playerId });
      return null;
    }
  }

  /**
   * Listen to power-ups changes
   */
  subscribeToPowerUps(
    roomCode: string, 
    playerId: string, 
    callback: (powerUps: PlayerPowerUps | null) => void
  ): () => void {
    const powerUpsRef = ref(rtdb, `rooms/${roomCode}/players/${playerId}/powerUps`);
    
    onValue(powerUpsRef, (snapshot) => {
      const powerUps = snapshot.val() as PlayerPowerUps | null;
      callback(powerUps);
    });

    return () => {
      off(powerUpsRef);
    };
  }

  /**
   * Reset power-ups for a new game
   */
  async resetPowerUps(roomCode: string, playerId: string): Promise<void> {
    await this.initializePowerUps(roomCode, playerId);
  }

  /**
   * Apply 50/50 power-up effect: Eliminate 2 wrong answers
   * Returns indices of answers to eliminate
   */
  apply5050(correctAnswerIndex: number, totalOptions: number): number[] {
    const wrongIndices = Array.from({ length: totalOptions }, (_, i) => i)
      .filter(i => i !== correctAnswerIndex);
    
    // Randomly select 2 wrong answers to eliminate
    const shuffled = wrongIndices.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }

  /**
   * Validate power-up usage (server-side validation)
   * This should be called from Cloud Function to prevent cheating
   */
  async validatePowerUpUsage(
    roomCode: string,
    playerId: string,
    powerUpType: PowerUpType,
    questionIndex: number
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const powerUpRef = ref(rtdb, `rooms/${roomCode}/players/${playerId}/powerUps/${powerUpType}`);
      const snapshot = await get(powerUpRef);
      const powerUpState = snapshot.val() as PowerUpState;

      if (!powerUpState) {
        return { valid: false, reason: 'Power-up not found' };
      }

      if (powerUpState.used) {
        return { valid: false, reason: 'Power-up already used' };
      }

      if (!powerUpState.available) {
        return { valid: false, reason: 'Power-up not available' };
      }

      // Check if used on correct question (not retroactively)
      const currentQuestionRef = ref(rtdb, `rooms/${roomCode}/currentQuestionIndex`);
      const currentQuestionSnapshot = await get(currentQuestionRef);
      const currentQuestionIndex = currentQuestionSnapshot.val();

      if (questionIndex !== currentQuestionIndex) {
        return { valid: false, reason: 'Power-up can only be used on current question' };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Failed to validate power-up', { error, roomCode, playerId, powerUpType });
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Get all players' power-up usage statistics
   */
  async getRoomPowerUpStats(roomCode: string): Promise<Record<string, PlayerPowerUps>> {
    try {
      const playersRef = ref(rtdb, `rooms/${roomCode}/players`);
      const snapshot = await get(playersRef);
      const players = snapshot.val();

      const stats: Record<string, PlayerPowerUps> = {};

      if (players) {
        Object.entries(players).forEach(([playerId, playerData]: [string, any]) => {
          if (playerData.powerUps) {
            stats[playerId] = playerData.powerUps;
          }
        });
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get room power-up stats', { error, roomCode });
      return {};
    }
  }

  /**
   * Disable all power-ups for a room (when disabled in settings)
   */
  async disablePowerUpsForRoom(roomCode: string): Promise<void> {
    try {
      const playersRef = ref(rtdb, `rooms/${roomCode}/players`);
      const snapshot = await get(playersRef);
      const players = snapshot.val();

      if (players) {
        const updates: Record<string, any> = {};
        
        Object.keys(players).forEach((playerId) => {
          updates[`${playerId}/powerUps/50-50/available`] = false;
          updates[`${playerId}/powerUps/x2-score/available`] = false;
          updates[`${playerId}/powerUps/freeze-time/available`] = false;
        });

        await update(playersRef, updates);
        logger.info('Power-ups disabled for room', { roomCode });
      }
    } catch (error) {
      logger.error('Failed to disable power-ups for room', { error, roomCode });
    }
  }

  /**
   * Enable all power-ups for a room
   */
  async enablePowerUpsForRoom(roomCode: string): Promise<void> {
    try {
      const playersRef = ref(rtdb, `rooms/${roomCode}/players`);
      const snapshot = await get(playersRef);
      const players = snapshot.val();

      if (players) {
        const updates: Record<string, any> = {};
        
        Object.keys(players).forEach((playerId) => {
          // Only enable if not already used
          if (!players[playerId].powerUps?.['50-50']?.used) {
            updates[`${playerId}/powerUps/50-50/available`] = true;
          }
          if (!players[playerId].powerUps?.['x2-score']?.used) {
            updates[`${playerId}/powerUps/x2-score/available`] = true;
          }
          if (!players[playerId].powerUps?.['freeze-time']?.used) {
            updates[`${playerId}/powerUps/freeze-time/available`] = true;
          }
        });

        await update(playersRef, updates);
        logger.info('Power-ups enabled for room', { roomCode });
      }
    } catch (error) {
      logger.error('Failed to enable power-ups for room', { error, roomCode });
    }
  }
}

export const powerUpsService = new PowerUpsService();
export default powerUpsService;
