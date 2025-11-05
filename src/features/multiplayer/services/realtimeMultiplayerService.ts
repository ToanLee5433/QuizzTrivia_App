import { 
  ref, 
  onValue, 
  set, 
  update, 
  remove,
  serverTimestamp,
  onDisconnect,
  push,
  get,
  off
} from 'firebase/database';
import { rtdb } from '../../../lib/firebase/config';
import { logger } from '../utils/logger';

/**
 * Realtime Database Service for multiplayer
 * Handles instant sync for:
 * - Player presence (online/offline)
 * - Ready status
 * - Game timer
 * - Answer progress
 * - Chat messages
 */
class RealtimeMultiplayerService {
  private listeners: Map<string, any> = new Map();

  /**
   * Setup presence system - auto set offline on disconnect
   */
  async setupPresence(roomId: string, userId: string, userName: string) {
    try {
      const presenceRef = ref(rtdb, `rooms/${roomId}/presence/${userId}`);
      
      // Set online
      await set(presenceRef, {
        online: true,
        userName,
        lastSeen: serverTimestamp(),
      });

      logger.success(`Presence setup for ${userName} in room ${roomId}`);

      // Auto set offline on disconnect
      onDisconnect(presenceRef).set({
        online: false,
        userName,
        lastSeen: serverTimestamp(),
      });
    } catch (error) {
      logger.error('Failed to setup presence:', error);
      throw error;
    }
  }

  /**
   * Listen to player presence (real-time online/offline)
   */
  listenToPresence(roomId: string, callback: (presence: Record<string, any>) => void) {
    const presenceRef = ref(rtdb, `rooms/${roomId}/presence`);
    
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const presence = snapshot.val() || {};
      const onlineCount = Object.values(presence).filter((p: any) => p.online).length;
      
      logger.debug('Presence updated:', { 
        roomId, 
        onlineCount,
        players: Object.keys(presence)
      });
      
      callback(presence);
    }, (error) => {
      logger.error('Presence listener error:', error);
    });

    const listenerKey = `presence_${roomId}`;
    this.listeners.set(listenerKey, { ref: presenceRef, unsubscribe });
    
    return () => {
      off(presenceRef);
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Update player ready status (instant sync)
   */
  async updatePlayerStatus(roomId: string, userId: string, isReady: boolean) {
    try {
      const statusRef = ref(rtdb, `rooms/${roomId}/players/${userId}`);
      
      await set(statusRef, {
        userId,
        ready: isReady,
        updatedAt: serverTimestamp(),
      });

      logger.info(`Player ${userId} ready status: ${isReady}`);
    } catch (error) {
      logger.error('Failed to update player status:', error);
      throw error;
    }
  }

  /**
   * Listen to all players' ready status
   */
  listenToPlayerStatuses(roomId: string, callback: (players: Record<string, any>) => void) {
    const playersRef = ref(rtdb, `rooms/${roomId}/players`);
    
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const players = snapshot.val() || {};
      const readyCount = Object.values(players).filter((p: any) => p.ready).length;
      const totalCount = Object.keys(players).length;
      
      logger.debug('Players status updated:', { 
        roomId, 
        ready: readyCount, 
        total: totalCount,
        playerIds: Object.keys(players)
      });
      
      callback(players);
    }, (error) => {
      logger.error('Players listener error:', error);
    });

    const listenerKey = `players_${roomId}`;
    this.listeners.set(listenerKey, { ref: playersRef, unsubscribe });
    
    return () => {
      off(playersRef);
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Broadcast game timer (sync across all clients)
   */
  async updateGameTimer(roomId: string, timeRemaining: number, questionIndex: number) {
    try {
      const timerRef = ref(rtdb, `rooms/${roomId}/game/timer`);
      
      await set(timerRef, {
        remaining: timeRemaining,
        questionIndex,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error('Failed to update game timer:', error);
    }
  }

  /**
   * Listen to game timer
   */
  listenToGameTimer(roomId: string, callback: (timer: any) => void) {
    const timerRef = ref(rtdb, `rooms/${roomId}/game/timer`);
    
    const unsubscribe = onValue(timerRef, (snapshot) => {
      const timer = snapshot.val();
      if (timer) {
        logger.debug('Timer updated:', timer);
        callback(timer);
      }
    }, (error) => {
      logger.error('Timer listener error:', error);
    });

    const listenerKey = `timer_${roomId}`;
    this.listeners.set(listenerKey, { ref: timerRef, unsubscribe });
    
    return () => {
      off(timerRef);
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Submit answer progress (for tracking who answered)
   */
  async submitAnswerProgress(roomId: string, questionId: string, userId: string) {
    try {
      const answerRef = ref(
        rtdb, 
        `rooms/${roomId}/game/answers/${questionId}/${userId}`
      );
      
      await set(answerRef, {
        submitted: true,
        timestamp: serverTimestamp(),
      });

      logger.debug(`Answer progress: ${userId} answered question ${questionId}`);
    } catch (error) {
      logger.error('Failed to submit answer progress:', error);
    }
  }

  /**
   * Listen to answer progress (how many players answered)
   */
  listenToAnswerProgress(
    roomId: string, 
    questionId: string, 
    callback: (count: number, answers: any) => void
  ) {
    const answersRef = ref(rtdb, `rooms/${roomId}/game/answers/${questionId}`);
    
    const unsubscribe = onValue(answersRef, (snapshot) => {
      const answers = snapshot.val() || {};
      const count = Object.keys(answers).length;
      
      logger.debug(`Answer progress: ${count} players answered question ${questionId}`);
      callback(count, answers);
    }, (error) => {
      logger.error('Answer progress listener error:', error);
    });

    const listenerKey = `answers_${roomId}_${questionId}`;
    this.listeners.set(listenerKey, { ref: answersRef, unsubscribe });
    
    return () => {
      off(answersRef);
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Send chat message (instant delivery)
   */
  async sendChatMessage(roomId: string, message: any) {
    try {
      const messagesRef = ref(rtdb, `rooms/${roomId}/chat`);
      const newMessageRef = push(messagesRef);
      
      await set(newMessageRef, {
        ...message,
        timestamp: serverTimestamp(),
      });

      logger.debug('Chat message sent:', message.message);
    } catch (error) {
      logger.error('Failed to send chat message:', error);
      throw error;
    }
  }

  /**
   * Listen to chat messages
   */
  listenToChatMessages(roomId: string, callback: (messages: any[]) => void) {
    const messagesRef = ref(rtdb, `rooms/${roomId}/chat`);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const messagesObj = snapshot.val() || {};
      const messages = Object.entries(messagesObj).map(([key, value]) => ({
        id: key,
        ...value as any,
      })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      
      logger.debug(`Chat updated: ${messages.length} messages`);
      callback(messages);
    }, (error) => {
      logger.error('Chat listener error:', error);
    });

    const listenerKey = `chat_${roomId}`;
    this.listeners.set(listenerKey, { ref: messagesRef, unsubscribe });
    
    return () => {
      off(messagesRef);
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Update current question index (sync game state)
   */
  async updateCurrentQuestion(roomId: string, questionIndex: number) {
    try {
      const gameRef = ref(rtdb, `rooms/${roomId}/game`);
      
      await update(gameRef, {
        currentQuestion: questionIndex,
        updatedAt: serverTimestamp(),
      });

      logger.info(`Current question updated: ${questionIndex}`);
    } catch (error) {
      logger.error('Failed to update current question:', error);
    }
  }

  /**
   * Listen to current question changes
   */
  listenToCurrentQuestion(roomId: string, callback: (index: number) => void) {
    const questionRef = ref(rtdb, `rooms/${roomId}/game/currentQuestion`);
    
    const unsubscribe = onValue(questionRef, (snapshot) => {
      const index = snapshot.val();
      if (index !== null && index !== undefined) {
        logger.debug(`Question changed to: ${index}`);
        callback(index);
      }
    }, (error) => {
      logger.error('Question listener error:', error);
    });

    const listenerKey = `question_${roomId}`;
    this.listeners.set(listenerKey, { ref: questionRef, unsubscribe });
    
    return () => {
      off(questionRef);
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Set room as active (for cleanup purposes)
   */
  async setRoomActive(roomId: string, isActive: boolean) {
    try {
      const roomRef = ref(rtdb, `rooms/${roomId}/metadata`);
      
      await set(roomRef, {
        active: isActive,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error('Failed to set room active status:', error);
    }
  }

  /**
   * Cleanup all listeners for a room
   */
  cleanupRoom(roomId: string) {
    logger.info(`Cleaning up listeners for room ${roomId}`);
    
    this.listeners.forEach((listener, key) => {
      if (key.includes(roomId)) {
        if (listener.ref) {
          off(listener.ref);
        }
        this.listeners.delete(key);
      }
    });
  }

  /**
   * Delete room data (when game ends)
   */
  async deleteRoom(roomId: string) {
    try {
      const roomRef = ref(rtdb, `rooms/${roomId}`);
      await remove(roomRef);
      
      logger.success(`Room ${roomId} deleted from Realtime DB`);
    } catch (error) {
      logger.error('Failed to delete room:', error);
    }
  }

  /**
   * Check if room exists in Realtime DB
   */
  async roomExists(roomId: string): Promise<boolean> {
    try {
      const roomRef = ref(rtdb, `rooms/${roomId}/metadata`);
      const snapshot = await get(roomRef);
      return snapshot.exists();
    } catch (error) {
      logger.error('Failed to check room existence:', error);
      return false;
    }
  }

  /**
   * Get all active listeners count (for debugging)
   */
  getActiveListenersCount(): number {
    return this.listeners.size;
  }

  /**
   * Cleanup all listeners (call on app unmount)
   */
  cleanupAll() {
    logger.info(`Cleaning up all listeners (${this.listeners.size})`);
    
    this.listeners.forEach((listener) => {
      if (listener.ref) {
        off(listener.ref);
      }
    });
    
    this.listeners.clear();
  }
}

export default new RealtimeMultiplayerService();
