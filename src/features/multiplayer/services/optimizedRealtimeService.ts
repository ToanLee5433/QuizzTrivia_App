import { 
  ref, 
  onValue, 
  set, 
  update,
  serverTimestamp,
  onDisconnect,
  get,
  off,
  runTransaction
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
  async joinRoom(roomId: string, userId: string, userName: string, photoURL?: string) {
    try {
      const roomRef = ref(rtdb, `rooms/${roomId}`);
      
      // Use transaction for atomic join
      await runTransaction(roomRef, async (roomData) => {
        if (!roomData) {
          roomData = { players: {}, status: 'waiting' };
        }
        
        if (!roomData.players) roomData.players = {};
        
        // Add player with full info
        roomData.players[userId] = {
          id: userId,
          name: userName,
          photoURL: photoURL || null,
          isHost: Object.keys(roomData.players).length === 0,
          isReady: false,
          score: 0,
          joinedAt: serverTimestamp(),
          isOnline: true
        };
        
        return roomData;
      });

      // Setup presence tracking
      const presenceRef = ref(rtdb, `rooms/${roomId}/presence/${userId}`);
      await set(presenceRef, {
        isOnline: true,
        lastSeen: Date.now()
      });

      onDisconnect(presenceRef).set({
        isOnline: false,
        lastSeen: Date.now()
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
   * ⚡ Submit answer with instant leaderboard update
   */
  async submitAnswer(roomId: string, userId: string, questionId: string, answer: any, timeRemaining: number, score: number) {
    try {
      const updates: any = {};
      
      // Store answer
      updates[`rooms/${roomId}/answers/${questionId}/${userId}`] = {
        answer,
        timeRemaining,
        submittedAt: serverTimestamp(),
        score
      };
      
      // Update player score and stats
      const playerScoreRef = ref(rtdb, `rooms/${roomId}/players/${userId}/score`);
      const currentScore = (await get(playerScoreRef)).val() || 0;
      updates[`rooms/${roomId}/players/${userId}/score`] = currentScore + score;
      updates[`rooms/${roomId}/players/${userId}/lastAnswerAt`] = serverTimestamp();
      updates[`rooms/${roomId}/players/${userId}/questionsAnswered`] = ((await get(ref(rtdb, `rooms/${roomId}/players/${userId}/questionsAnswered`))).val() || 0) + 1;
      
      // Update leaderboard immediately
      const playerNameRef = ref(rtdb, `rooms/${roomId}/players/${userId}/name`);
      const playerPhotoRef = ref(rtdb, `rooms/${roomId}/players/${userId}/photoURL`);
      const playerName = (await get(playerNameRef)).val();
      const playerPhotoURL = (await get(playerPhotoRef)).val();
      
      updates[`rooms/${roomId}/leaderboard/${userId}`] = {
        score: currentScore + score,
        name: playerName,
        photoURL: playerPhotoURL,
        lastUpdated: serverTimestamp()
      };
      
      await update(ref(rtdb), updates);
      
      logger.debug(`⚡ Answer submitted and leaderboard updated for ${userId}`);
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
   * ⚡ Listen to player updates including avatars
   */
  listenToPlayers(roomId: string, callback: (players: any[]) => void) {
    const playersRef = ref(rtdb, `rooms/${roomId}/players`);
    
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const players = snapshot.val() || {};
      const playersList = Object.entries(players).map(([id, data]: any) => ({ id, ...data }));
      
      callback(playersList);
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
   * ⚡ Update player avatar/photoURL
   */
  async updatePlayerAvatar(roomId: string, userId: string, photoURL: string) {
    try {
      const updates: any = {};
      
      // Update in players list
      updates[`rooms/${roomId}/players/${userId}/photoURL`] = photoURL;
      updates[`rooms/${roomId}/players/${userId}/avatarUpdatedAt`] = serverTimestamp();
      
      // Update in leaderboard
      updates[`rooms/${roomId}/leaderboard/${userId}/photoURL`] = photoURL;
      
      // Update global user profile
      updates[`users/${userId}/photoURL`] = photoURL;
      
      await update(ref(rtdb), updates);
      
      logger.debug(`⚡ Avatar updated for ${userId}`);
    } catch (error) {
      logger.error('Failed to update avatar:', error);
      throw error;
    }
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
