import { ref, onValue, set, update, get, off } from 'firebase/database';
import { rtdb } from '../../../lib/firebase/config';
import { logger } from '../utils/logger';

/**
 * Real-time Game State Service
 * Handles synchronization of:
 * - Current question index
 * - Question timer
 * - Game phase (question/results/finished)
 * - Player answers
 * - Leaderboard
 */

export interface GameStateData {
  currentQuestionIndex: number;
  phase: 'question' | 'results' | 'finished';
  questionStartTime: number;
  timeLimit: number;
  totalQuestions: number;
  hostId: string;
}

export interface PlayerAnswerData {
  answer: number;
  timestamp: number;
  timeToAnswer: number;
  isCorrect: boolean;
  points: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  correctAnswers: number;
  rank: number;
  avatar?: string;
  streak: number;
}

class GameStateService {
  private listeners: Map<string, any> = new Map();

  /**
   * Initialize game state when game starts
   */
  async initializeGameState(
    roomId: string,
    hostId: string,
    totalQuestions: number,
    timePerQuestion: number
  ): Promise<void> {
    try {
      const gameStateRef = ref(rtdb, `rooms/${roomId}/gameState`);

      const initialState: GameStateData = {
        currentQuestionIndex: 0,
        phase: 'question',
        questionStartTime: Date.now(),
        timeLimit: timePerQuestion,
        totalQuestions,
        hostId,
      };

      await set(gameStateRef, initialState);
      logger.success('Game state initialized', { roomId, totalQuestions });
    } catch (error) {
      logger.error('Failed to initialize game state:', error);
      throw error;
    }
  }

  /**
   * Listen to game state changes (real-time sync)
   */
  listenToGameState(
    roomId: string,
    callback: (gameState: GameStateData | null) => void
  ): () => void {
    const gameStateRef = ref(rtdb, `rooms/${roomId}/gameState`);

    const unsubscribe = onValue(
      gameStateRef,
      (snapshot) => {
        const state = snapshot.val();
        if (state) {
          logger.debug('Game state updated:', state);
          callback(state);
        } else {
          callback(null);
        }
      },
      (error) => {
        logger.error('Game state listener error:', error);
      }
    );

    const listenerKey = `gameState_${roomId}`;
    this.listeners.set(listenerKey, { ref: gameStateRef, unsubscribe });

    return () => {
      off(gameStateRef);
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Advance to next question (host only)
   */
  async advanceToNextQuestion(roomId: string, currentIndex: number, timeLimit: number): Promise<void> {
    try {
      const gameStateRef = ref(rtdb, `rooms/${roomId}/gameState`);

      await update(gameStateRef, {
        currentQuestionIndex: currentIndex + 1,
        phase: 'question',
        questionStartTime: Date.now(),
        timeLimit,
      });

      logger.info(`Advanced to question ${currentIndex + 1}`, { roomId });
    } catch (error) {
      logger.error('Failed to advance question:', error);
      throw error;
    }
  }

  /**
   * Show results phase (host only)
   */
  async showResults(roomId: string): Promise<void> {
    try {
      const gameStateRef = ref(rtdb, `rooms/${roomId}/gameState`);

      await update(gameStateRef, {
        phase: 'results',
      });

      logger.info('Showing results', { roomId });
    } catch (error) {
      logger.error('Failed to show results:', error);
      throw error;
    }
  }

  /**
   * End game (host only)
   */
  async endGame(roomId: string): Promise<void> {
    try {
      const gameStateRef = ref(rtdb, `rooms/${roomId}/gameState`);

      await update(gameStateRef, {
        phase: 'finished',
      });

      logger.info('Game ended', { roomId });
    } catch (error) {
      logger.error('Failed to end game:', error);
      throw error;
    }
  }

  /**
   * Submit player answer
   */
  async submitAnswer(
    roomId: string,
    questionIndex: number,
    userId: string,
    answer: number,
    isCorrect: boolean,
    timeToAnswer: number,
    points: number
  ): Promise<void> {
    try {
      const answerRef = ref(
        rtdb,
        `rooms/${roomId}/answers/${questionIndex}/${userId}`
      );

      const answerData: PlayerAnswerData = {
        answer,
        timestamp: Date.now(),
        timeToAnswer,
        isCorrect,
        points,
      };

      await set(answerRef, answerData);
      logger.info('Answer submitted', { roomId, questionIndex, userId, isCorrect, points });
    } catch (error) {
      logger.error('Failed to submit answer:', error);
      throw error;
    }
  }

  /**
   * Listen to answers for current question
   */
  listenToQuestionAnswers(
    roomId: string,
    questionIndex: number,
    callback: (answers: Record<string, PlayerAnswerData>) => void
  ): () => void {
    const answersRef = ref(rtdb, `rooms/${roomId}/answers/${questionIndex}`);

    const unsubscribe = onValue(
      answersRef,
      (snapshot) => {
        const answers = snapshot.val() || {};
        logger.debug('Question answers updated:', {
          questionIndex,
          count: Object.keys(answers).length,
        });
        callback(answers);
      },
      (error) => {
        logger.error('Answers listener error:', error);
      }
    );

    const listenerKey = `answers_${roomId}_${questionIndex}`;
    this.listeners.set(listenerKey, { ref: answersRef, unsubscribe });

    return () => {
      off(answersRef);
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Update leaderboard
   */
  async updateLeaderboard(roomId: string, leaderboard: LeaderboardEntry[]): Promise<void> {
    try {
      const leaderboardRef = ref(rtdb, `rooms/${roomId}/leaderboard`);

      // Convert array to object for Firebase
      // Remove undefined values to avoid Firebase validation errors
      const leaderboardObj: Record<string, any> = {};
      leaderboard.forEach((entry) => {
        const cleanEntry: any = { ...entry };
        // Remove undefined values (Firebase RTDB rejects undefined)
        Object.keys(cleanEntry).forEach(key => {
          if (cleanEntry[key] === undefined) {
            delete cleanEntry[key];
          }
        });
        leaderboardObj[entry.userId] = cleanEntry;
      });

      await set(leaderboardRef, leaderboardObj);
      logger.debug('Leaderboard updated', { roomId, players: leaderboard.length });
    } catch (error) {
      logger.error('Failed to update leaderboard:', error);
      throw error;
    }
  }

  /**
   * Listen to leaderboard changes
   */
  listenToLeaderboard(
    roomId: string,
    callback: (leaderboard: LeaderboardEntry[]) => void
  ): () => void {
    const leaderboardRef = ref(rtdb, `rooms/${roomId}/leaderboard`);

    // ⚡ ZERO-LATENCY: Process updates immediately
    const unsubscribe = onValue(
      leaderboardRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const leaderboard = Object.values(data) as LeaderboardEntry[];
          
          // ⚡ Optimized sort: score > correctAnswers > username
          leaderboard.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
            return a.username.localeCompare(b.username);
          });
          
          // ⚡ Update ranks in single pass
          leaderboard.forEach((entry, index) => {
            entry.rank = index + 1;
          });
          
          // ⚡ Immediate callback - NO DELAY
          callback(leaderboard);
        } else {
          callback([]);
        }
      },
      (error) => {
        logger.error('Leaderboard listener error:', error);
      }
    );

    const listenerKey = `leaderboard_${roomId}`;
    this.listeners.set(listenerKey, { ref: leaderboardRef, unsubscribe });

    return () => {
      off(leaderboardRef);
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Get current game state (one-time read)
   */
  async getGameState(roomId: string): Promise<GameStateData | null> {
    try {
      const gameStateRef = ref(rtdb, `rooms/${roomId}/gameState`);
      const snapshot = await get(gameStateRef);
      return snapshot.val();
    } catch (error) {
      logger.error('Failed to get game state:', error);
      return null;
    }
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    this.listeners.forEach(({ ref, unsubscribe }) => {
      if (unsubscribe) unsubscribe();
      off(ref);
    });
    this.listeners.clear();
    logger.info('Game state service cleaned up');
  }

  /**
   * Calculate score based on correctness and speed (Kahoot-style)
   */
  calculateScore(isCorrect: boolean, timeToAnswer: number, timeLimit: number): number {
    if (!isCorrect) return 0;

    const basePoints = 1000;
    const maxSpeedBonus = 500;

    // Speed bonus: faster = more points
    // timeToAnswer in ms, timeLimit in seconds
    const timeLimitMs = timeLimit * 1000;
    const timeRatio = Math.max(0, 1 - timeToAnswer / timeLimitMs);
    const speedBonus = Math.floor(maxSpeedBonus * timeRatio);

    return basePoints + speedBonus;
  }
}

// Export singleton instance
export const gameStateService = new GameStateService();
export default gameStateService;
