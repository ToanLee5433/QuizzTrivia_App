import { 
  ref, 
  onValue, 
  set, 
  update,
  serverTimestamp,
  onDisconnect,
  off
} from 'firebase/database';
import { rtdb } from '../../../lib/firebase/config';
import { logger } from '../utils/logger';

/**
 * Optimized Realtime Database Service for near-zero latency multiplayer
 * Handles instant sync for:
 * - Player presence and avatars
 * - Ready status
 * - Live leaderboard updates
 * - Answer submissions
 * - Game state transitions
 */
class OptimizedRealtimeService {
  private listeners: Map<string, any> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * ⚡ Ultra-fast connection with minimal overhead
   */
  async connect(userId: string, userName: string, photoURL?: string) {
    try {
      // Set user info in root for quick access
      const userRef = ref(rtdb, `users/${userId}`);
      await set(userRef, {
        name: userName,
        photoURL: photoURL || null,
        lastActive: serverTimestamp(),
        isOnline: true
      });

      // Auto disconnect on page close
      onDisconnect(userRef).update({
        isOnline: false,
        lastActive: serverTimestamp()
      });

      logger.success('⚡ Connected to optimized realtime service', { userId, userName });
      return true;
    } catch (error) {
      logger.error('Failed to connect to realtime service:', error);
      throw error;
    }
  }

  /**
   * ⚡ Join room with instant presence update
   */
  async joinRoom(roomId: string, userId: string, userName: string, _photoURL?: string) {
    try {
      // Setup presence tracking (allowed by rules)
      const presenceRef = ref(rtdb, `rooms/${roomId}/presence/${userId}`);
      await set(presenceRef, {
        isOnline: true,
        lastSeen: Date.now(),
        username: userName
      });

      onDisconnect(presenceRef).set({
        isOnline: false,
        lastSeen: Date.now(),
        username: userName
      });

      // Setup initial player status (allowed by rules)
      const statusRef = ref(rtdb, `rooms/${roomId}/playerStatuses/${userId}`);
      await set(statusRef, {
        isReady: false,
        updatedAt: Date.now()
      });

      logger.success('⚡ Joined room with instant sync', { roomId, userId });
      return true;
    } catch (error) {
      logger.error('Failed to join room:', error);
      throw error;
    }
  }

  /**
   * ⚡ Update player ready status (instant)
   */
  async updatePlayerStatus(roomId: string, userId: string, isReady: boolean) {
    try {
      const statusRef = ref(rtdb, `rooms/${roomId}/players/${userId}/isReady`);
      await set(statusRef, isReady);
      
      // Also update timestamp for sorting
      await update(ref(rtdb, `rooms/${roomId}/players/${userId}`), {
        statusUpdatedAt: serverTimestamp()
      });

      logger.debug(`⚡ Player ${userId} ready status: ${isReady}`);
    } catch (error) {
      logger.error('Failed to update player status:', error);
      throw error;
    }
  }

  /**
   * ⚡ Submit answer using allowed database paths
   */
  async submitAnswer(roomId: string, userId: string, questionId: string, answer: any, timeRemaining: number, score: number) {
    try {
      const updates: any = {};
      
      // Store answer in submissions path (allowed by rules)
      updates[`rooms/${roomId}/submissions/${userId}`] = {
        questionId,
        answer,
        timeRemaining,
        submittedAt: serverTimestamp(),
        score
      };
      
      // Update answer progress (allowed by rules)
      updates[`rooms/${roomId}/answerProgress/${userId}`] = {
        hasAnswered: true,
        answeredAt: Date.now()
      };
      
      await update(ref(rtdb), updates);
      
      logger.debug(`⚡ Answer submitted using allowed paths for ${userId}`);
    } catch (error) {
      logger.error('Failed to submit answer:', error);
      throw error;
    }
  }

  /**
   * ⚡ Listen to live leaderboard updates
   */
  listenToLeaderboard(roomId: string, callback: (leaderboard: any[]) => void) {
    const leaderboardRef = ref(rtdb, `rooms/${roomId}/leaderboard`);
    
    const unsubscribe = onValue(leaderboardRef, (snapshot) => {
      const leaderboard = snapshot.val() || {};
      const sortedLeaderboard = Object.entries(leaderboard)
        .sort(([,a]: any, [,b]: any) => b.score - a.score)
        .map(([id, data]: any) => ({ id, ...data }));
      
      callback(sortedLeaderboard);
    }, (error) => {
      logger.error('Leaderboard listener error:', error);
    });

    const listenerKey = `leaderboard_${roomId}`;
    this.listeners.set(listenerKey, { ref: leaderboardRef, unsubscribe });
    
    return () => {
      off(leaderboardRef);
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * ⚡ Listen to player updates using existing database structure
   */
  listenToPlayers(roomId: string, callback: (players: any[]) => void) {
    // Listen to presence and playerStatuses separately since we can't write to players path
    const presenceRef = ref(rtdb, `rooms/${roomId}/presence`);
    const statusRef = ref(rtdb, `rooms/${roomId}/playerStatuses`);
    
    let presenceData: any = {};
    let statusData: any = {};
    
    const updatePlayers = () => {
      const players = Object.keys(presenceData).map(userId => ({
        id: userId,
        name: presenceData[userId]?.username || 'Unknown',
        photoURL: null, // Not stored in current structure
        isReady: statusData[userId]?.isReady || false,
        isOnline: presenceData[userId]?.isOnline || false,
        joinedAt: new Date(presenceData[userId]?.lastSeen || Date.now())
      }));
      
      callback(players);
    };
    
    onValue(presenceRef, (snapshot) => {
      presenceData = snapshot.val() || {};
      updatePlayers();
    }, (error) => {
      logger.error('Presence listener error:', error);
    });

    onValue(statusRef, (snapshot) => {
      statusData = snapshot.val() || {};
      updatePlayers();
    }, (error) => {
      logger.error('Player status listener error:', error);
    });

    const listenerKey = `players_${roomId}`;
    this.listeners.set(listenerKey, { 
      ref: presenceRef, 
      unsubscribe: () => {
        off(presenceRef);
        off(statusRef);
        this.listeners.delete(listenerKey);
      }
    });
    
    return () => {
      off(presenceRef);
      off(statusRef);
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * ⚡ Update player avatar/photoURL (not supported by current rules)
   * Note: Current database structure doesn't support avatar storage in RTDB
   */
  async updatePlayerAvatar(_roomId: string, _userId: string, _photoURL: string) {
    logger.warn('Avatar updates not supported by current RTDB rules - skipping');
    // Avatar updates would need database rules changes to store photoURL
    return;
  }

  /**
   * ⚡ Start game with instant state sync
   */
  async startGame(roomId: string, quizData: any) {
    try {
      const gameRef = ref(rtdb, `rooms/${roomId}/game`);
      await set(gameRef, {
        status: 'playing',
        currentQuestion: 0,
        totalQuestions: quizData.questions?.length || 0,
        timePerQuestion: quizData.timePerQuestion || 30,
        startedAt: serverTimestamp(),
        quizTitle: quizData.title
      });

      // Update room status
      await update(ref(rtdb, `rooms/${roomId}`), {
        status: 'playing',
        startedAt: serverTimestamp()
      });

      logger.success('⚡ Game started with instant sync');
    } catch (error) {
      logger.error('Failed to start game:', error);
      throw error;
    }
  }

  /**
   * ⚡ Update game timer (real-time countdown)
   */
  async updateTimer(roomId: string, timeRemaining: number) {
    try {
      await update(ref(rtdb, `rooms/${roomId}/game`), {
        timeRemaining,
        lastTimerUpdate: serverTimestamp()
      });
    } catch (error) {
      logger.error('Failed to update timer:', error);
    }
  }

  /**
   * ⚡ Listen to game state changes
   */
  listenToGameState(roomId: string, callback: (gameState: any) => void) {
    const gameRef = ref(rtdb, `rooms/${roomId}/game`);
    
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const gameState = snapshot.val();
      callback(gameState);
    }, (error) => {
      logger.error('Game state listener error:', error);
    });

    const listenerKey = `game_${roomId}`;
    this.listeners.set(listenerKey, { ref: gameRef, unsubscribe });
    
    return () => {
      off(gameRef);
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * ⚡ Clean up all listeners
   */
  disconnect() {
    this.listeners.forEach(({ unsubscribe }) => {
      unsubscribe();
    });
    this.listeners.clear();
    logger.info('⚡ Disconnected from realtime service');
  }

  /**
   * ⚡ Auto-reconnect with exponential backoff
   */
  async reconnect(userId: string, userName: string, photoURL?: string): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached');
      return false;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    logger.info(`⚡ Reconnecting attempt ${this.reconnectAttempts} in ${delay}ms`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.connect(userId, userName, photoURL);
      this.reconnectAttempts = 0;
      return true;
    } catch (error) {
      logger.error('Reconnect failed:', error);
      return this.reconnect(userId, userName, photoURL);
    }
  }
}

// Singleton instance
const optimizedRealtimeService = new OptimizedRealtimeService();
export default optimizedRealtimeService;
