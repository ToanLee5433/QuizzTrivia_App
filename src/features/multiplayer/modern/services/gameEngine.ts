/**
 * 🎮 MODERN MULTIPLAYER GAME ENGINE
 * Real-time game logic with RTDB sync
 */

import { getDatabase, ref, set, update, onValue, push, serverTimestamp, get } from 'firebase/database';
import { 
  GameState, 
  ModernPlayer, 
  PlayerAnswer, 
  QuestionState,
  PowerUpType,
  GameEvent,
  LeaderboardEntry,
  RTDB_PATHS,
  DEFAULT_SCORING,
  STREAK_BONUSES,
  PlayerRole,
  SpectatorViewData,
  DEFAULT_GAME_SETTINGS
} from '../types/game.types';
import { Question } from '../../../quiz/types';
import { logger } from '../utils/logger';

type EventCallback = (data: any) => void;

class GameEngine {
  private db = getDatabase();
  private listeners: Map<string, Map<string, EventCallback>> = new Map();

  // ============= INITIALIZATION =============
  
  /**
   * Initialize game state in RTDB
   */
  async initializeGame(
    roomId: string,
    quizId: string,
    quizTitle: string,
    questions: Question[],
    hostId: string,
    settings = DEFAULT_GAME_SETTINGS
  ): Promise<void> {
    try {
      logger.info('🎮 Initializing game', { roomId, quizId, questionCount: questions.length });

      const gameState: Partial<GameState> = {
        roomId,
        gameId: `${roomId}_${Date.now()}`,
        status: 'lobby',
        quizId,
        quizTitle,
        totalQuestions: questions.length,
        currentQuestionIndex: -1,
        players: {},
        playerOrder: [],
        hostId,
        hostControls: {
          canPause: true,
          canSkip: true,
          canKick: true,
        },
        settings,
        leaderboard: [],
        events: [],
      };

      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      await set(gameRef, {
        ...gameState,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      logger.success('✅ Game initialized', { roomId, gameId: gameState.gameId });
    } catch (error) {
      logger.error('❌ Failed to initialize game', { error });
      throw error;
    }
  }

  // ============= PLAYER MANAGEMENT =============

  /**
   * Add player to game
   */
  async addPlayer(
    roomId: string,
    playerId: string,
    userId: string,
    name: string,
    photoURL: string | undefined,
    role: PlayerRole
  ): Promise<void> {
    try {
      const player: ModernPlayer = {
        id: playerId,
        userId,
        name,
        photoURL,
        role,
        status: 'waiting',
        score: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        streak: 0,
        maxStreak: 0,
        avgResponseTime: 0,
        powerUps: [],
        activePowerUps: [],
        powerUpPoints: 100, // Starting power-up points
        isReady: false,
        isOnline: true,
        hasAnswered: false,
        joinedAt: Date.now(),
        lastActiveAt: Date.now(),
      };

      const playerRef = ref(this.db, RTDB_PATHS.player(roomId, playerId));
      await set(playerRef, player);

      // Add to player order
      const orderRef = ref(this.db, `${RTDB_PATHS.games(roomId)}/playerOrder`);
      const orderSnap = await get(orderRef);
      const currentOrder = orderSnap.val() || [];
      await set(orderRef, [...currentOrder, playerId]);

      // Emit event
      await this.emitEvent(roomId, {
        type: 'player_joined',
        playerId,
        playerName: name,
        data: { role },
        priority: 'medium',
        showToast: true,
      });

      logger.info('👤 Player added', { roomId, playerId, name, role });
    } catch (error) {
      logger.error('❌ Failed to add player', { error });
      throw error;
    }
  }

  /**
   * Remove player from game
   */
  async removePlayer(roomId: string, playerId: string): Promise<void> {
    try {
      const playerRef = ref(this.db, RTDB_PATHS.player(roomId, playerId));
      await set(playerRef, null);

      // Remove from player order
      const orderRef = ref(this.db, `${RTDB_PATHS.games(roomId)}/playerOrder`);
      const orderSnap = await get(orderRef);
      const currentOrder = (orderSnap.val() || []).filter((id: string) => id !== playerId);
      await set(orderRef, currentOrder);

      logger.info('👋 Player removed', { roomId, playerId });
    } catch (error) {
      logger.error('❌ Failed to remove player', { error });
      throw error;
    }
  }

  /**
   * Set player ready status
   */
  async setPlayerReady(roomId: string, playerId: string, ready: boolean): Promise<void> {
    try {
      const playerRef = ref(this.db, RTDB_PATHS.player(roomId, playerId));
      await update(playerRef, { isReady: ready });

      if (ready) {
        await this.emitEvent(roomId, {
          type: 'player_ready',
          playerId,
          priority: 'low',
        });
      }

      logger.info('✅ Player ready status updated', { roomId, playerId, ready });
    } catch (error) {
      logger.error('❌ Failed to update ready status', { error });
      throw error;
    }
  }

  // ============= GAME FLOW =============

  /**
   * Start game
   */
  async startGame(roomId: string, questions: Question[]): Promise<void> {
    try {
      logger.info('🎬 Starting game', { roomId, questionCount: questions.length });

      // Update game status
      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      await update(gameRef, {
        status: 'starting',
        startedAt: Date.now(),
      });

      // Emit event
      await this.emitEvent(roomId, {
        type: 'game_started',
        priority: 'high',
        showToast: true,
        sound: 'game_start',
      });

      // Start first question after 3 second countdown
      setTimeout(() => {
        this.startQuestion(roomId, 0, questions[0]);
      }, 3000);

      logger.success('✅ Game started', { roomId });
    } catch (error) {
      logger.error('❌ Failed to start game', { error });
      throw error;
    }
  }

  /**
   * Start a question
   */
  async startQuestion(roomId: string, questionIndex: number, question: Question): Promise<void> {
    try {
      logger.info('❓ Starting question', { roomId, questionIndex, type: question.type });

      const timeLimit = question.points || 30; // Default 30s

      const questionState: QuestionState = {
        questionIndex,
        question,
        startedAt: Date.now(),
        timeLimit,
        timeRemaining: timeLimit,
        isPaused: false,
        answers: {},
        answerCount: 0,
        correctCount: 0,
        answerDistribution: {},
      };

      // Update game state
      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      await update(gameRef, {
        status: 'answering',
        currentQuestionIndex: questionIndex,
        currentQuestion: questionState,
      });

      // Reset player states
      const playersRef = ref(this.db, RTDB_PATHS.players(roomId));
      const playersSnap = await get(playersRef);
      const players = playersSnap.val() || {};
      
      const updates: any = {};
      Object.keys(players).forEach(playerId => {
        if (players[playerId].role === 'player') {
          updates[`${playerId}/hasAnswered`] = false;
          updates[`${playerId}/currentAnswer`] = null;
        }
      });
      await update(playersRef, updates);

      // Emit event
      await this.emitEvent(roomId, {
        type: 'question_started',
        data: { questionIndex, questionType: question.type },
        priority: 'high',
        sound: 'question_start',
      });

      // Start timer countdown
      this.startQuestionTimer(roomId, timeLimit);

      logger.success('✅ Question started', { roomId, questionIndex });
    } catch (error) {
      logger.error('❌ Failed to start question', { error });
      throw error;
    }
  }

  /**
   * Timer countdown for question
   */
  private async startQuestionTimer(roomId: string, duration: number): Promise<void> {
    let remaining = duration;
    
    const timerId = setInterval(async () => {
      remaining--;
      
      if (remaining <= 0) {
        clearInterval(timerId);
        await this.endQuestion(roomId);
        return;
      }

      // Update time remaining every second
      const questionRef = ref(this.db, RTDB_PATHS.currentQuestion(roomId));
      await update(questionRef, { timeRemaining: remaining });
    }, 1000);
  }

  /**
   * Submit answer
   */
  async submitAnswer(
    roomId: string,
    playerId: string,
    answer: any,
    activePowerUps: PowerUpType[] = []
  ): Promise<void> {
    try {
      // Get current question
      const questionRef = ref(this.db, RTDB_PATHS.currentQuestion(roomId));
      const questionSnap = await get(questionRef);
      const questionState = questionSnap.val() as QuestionState;

      if (!questionState) {
        throw new Error('No active question');
      }

      // Get player
      const playerRef = ref(this.db, RTDB_PATHS.player(roomId, playerId));
      const playerSnap = await get(playerRef);
      const player = playerSnap.val() as ModernPlayer;

      if (player.hasAnswered) {
        throw new Error('Already answered');
      }

      // Check answer correctness
      const responseTime = Date.now() - questionState.startedAt;
      const isCorrect = this.checkAnswer(questionState.question, answer);

      // Calculate points
      const points = this.calculatePoints(
        questionState.question,
        isCorrect,
        responseTime,
        questionState.timeLimit * 1000,
        player.streak,
        activePowerUps
      );

      // Create answer object
      const playerAnswer: PlayerAnswer = {
        playerId,
        answer,
        answeredAt: Date.now(),
        responseTime,
        isCorrect,
        points,
        powerUpsUsed: activePowerUps,
      };

      // Add streak bonus if applicable
      if (isCorrect && player.streak >= 3) {
        const streakBonus = STREAK_BONUSES.find(b => b.streak === player.streak);
        if (streakBonus) {
          playerAnswer.streakBonus = streakBonus.bonusPoints;
        }
      }

      // Update answer in RTDB
      const answerRef = ref(this.db, RTDB_PATHS.playerAnswer(roomId, playerId));
      await set(answerRef, playerAnswer);

      // Update player stats
      const newStreak = isCorrect ? player.streak + 1 : 0;
      const newMaxStreak = Math.max(player.maxStreak, newStreak);
      const newScore = player.score + points + (playerAnswer.streakBonus || 0);
      const newCorrectAnswers = player.correctAnswers + (isCorrect ? 1 : 0);
      const newTotalAnswers = player.totalAnswers + 1;
      const newAvgResponseTime = ((player.avgResponseTime * player.totalAnswers) + responseTime) / newTotalAnswers;

      await update(playerRef, {
        hasAnswered: true,
        currentAnswer: answer,
        lastAnswerTime: Date.now(),
        score: newScore,
        correctAnswers: newCorrectAnswers,
        totalAnswers: newTotalAnswers,
        streak: newStreak,
        maxStreak: newMaxStreak,
        avgResponseTime: Math.round(newAvgResponseTime),
      });

      // Update answer distribution for spectators
      const answerId = this.getAnswerId(answer);
      const distributionRef = ref(this.db, `${RTDB_PATHS.currentQuestion(roomId)}/answerDistribution/${answerId}`);
      const distSnap = await get(distributionRef);
      const currentPlayers = distSnap.val() || [];
      await set(distributionRef, [...currentPlayers, playerId]);

      // Update answer count
      await update(questionRef, {
        answerCount: questionState.answerCount + 1,
        correctCount: questionState.correctCount + (isCorrect ? 1 : 0),
      });

      // Emit events
      await this.emitEvent(roomId, {
        type: 'player_answered',
        playerId,
        priority: 'low',
      });

      if (newStreak >= 3 && newStreak > player.streak) {
        await this.emitEvent(roomId, {
          type: 'streak_achieved',
          playerId,
          playerName: player.name,
          data: { streak: newStreak },
          priority: 'high',
          showToast: true,
          sound: 'streak',
        });
      }

      logger.info('📝 Answer submitted', { 
        roomId, 
        playerId, 
        isCorrect, 
        points, 
        streak: newStreak 
      });
    } catch (error) {
      logger.error('❌ Failed to submit answer', { error });
      throw error;
    }
  }

  /**
   * End current question and show results
   */
  async endQuestion(roomId: string): Promise<void> {
    try {
      logger.info('⏱️ Ending question', { roomId });

      // Update status to reviewing
      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      await update(gameRef, { status: 'reviewing' });

      // Update leaderboard
      await this.updateLeaderboard(roomId);

      // Emit event
      await this.emitEvent(roomId, {
        type: 'question_ended',
        priority: 'high',
      });

      // Get game state to check if there are more questions
      const gameSnap = await get(gameRef);
      const gameState = gameSnap.val() as GameState;

      // Wait for review duration, then move to next question or end game
      setTimeout(async () => {
        if (gameState.currentQuestionIndex + 1 < gameState.totalQuestions) {
          // Show leaderboard between questions
          await update(gameRef, { status: 'leaderboard' });
          
          setTimeout(async () => {
            // Get next question from Firestore
            // This needs to be implemented in modernMultiplayerService
            // For now, we emit an event that the service will listen to
            await this.emitEvent(roomId, {
              type: 'next_question_requested',
              data: { nextIndex: gameState.currentQuestionIndex + 1 },
              priority: 'high',
            });
          }, gameState.settings.leaderboardDuration * 1000);
        } else {
          // Game finished
          await this.finishGame(roomId);
        }
      }, gameState.settings.reviewDuration * 1000);

      logger.success('✅ Question ended', { roomId });
    } catch (error) {
      logger.error('❌ Failed to end question', { error });
      throw error;
    }
  }

  /**
   * Finish game
   */
  async finishGame(roomId: string): Promise<void> {
    try {
      logger.info('🏁 Finishing game', { roomId });

      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      await update(gameRef, {
        status: 'finished',
        finishedAt: Date.now(),
      });

      // Final leaderboard update
      await this.updateLeaderboard(roomId);

      // Emit event
      await this.emitEvent(roomId, {
        type: 'game_finished',
        priority: 'high',
        showToast: true,
        sound: 'game_end',
      });

      logger.success('✅ Game finished', { roomId });
    } catch (error) {
      logger.error('❌ Failed to finish game', { error });
      throw error;
    }
  }

  // ============= POWER-UPS =============

  /**
   * Use power-up
   */
  async usePowerUp(roomId: string, playerId: string, powerUpType: PowerUpType): Promise<void> {
    try {
      const playerRef = ref(this.db, RTDB_PATHS.player(roomId, playerId));
      const playerSnap = await get(playerRef);
      const player = playerSnap.val() as ModernPlayer;

      // Check if player has enough points (implement cost checking)
      // Add power-up to active list
      const activePowerUps = [...player.activePowerUps, powerUpType];
      await update(playerRef, { activePowerUps });

      // Emit event
      await this.emitEvent(roomId, {
        type: 'powerup_used',
        playerId,
        playerName: player.name,
        data: { powerUpType },
        priority: 'medium',
        showToast: true,
        sound: 'powerup',
      });

      logger.info('⚡ Power-up used', { roomId, playerId, powerUpType });
    } catch (error) {
      logger.error('❌ Failed to use power-up', { error });
      throw error;
    }
  }

  // ============= HOST CONTROLS =============

  /**
   * Pause game
   */
  async pauseGame(roomId: string): Promise<void> {
    try {
      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      await update(gameRef, {
        status: 'paused',
        pausedAt: Date.now(),
      });

      await this.emitEvent(roomId, {
        type: 'game_paused',
        priority: 'high',
        showToast: true,
      });

      logger.info('⏸️ Game paused', { roomId });
    } catch (error) {
      logger.error('❌ Failed to pause game', { error });
      throw error;
    }
  }

  /**
   * Resume game
   */
  async resumeGame(roomId: string): Promise<void> {
    try {
      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      
      await update(gameRef, {
        status: 'answering',
        pausedAt: null,
      });

      await this.emitEvent(roomId, {
        type: 'game_resumed',
        priority: 'high',
        showToast: true,
      });

      logger.info('▶️ Game resumed', { roomId });
    } catch (error) {
      logger.error('❌ Failed to resume game', { error });
      throw error;
    }
  }

  // ============= UTILITIES =============

  /**
   * Check if answer is correct based on question type
   */
  private checkAnswer(question: Question, answer: any): boolean {
    switch (question.type) {
      case 'multiple':
      case 'boolean':
        return question.answers.some(a => a.id === answer && a.isCorrect);
      
      case 'checkbox':
        const correctIds = question.answers.filter(a => a.isCorrect).map(a => a.id);
        return Array.isArray(answer) && 
               answer.length === correctIds.length &&
               answer.every(id => correctIds.includes(id));
      
      case 'short_answer':
        const correctAnswer = question.correctAnswer?.toLowerCase().trim();
        const userAnswer = answer?.toLowerCase().trim();
        return correctAnswer === userAnswer || 
               (question.acceptedAnswers?.some(a => a.toLowerCase().trim() === userAnswer) ?? false);
      
      case 'ordering':
        return Array.isArray(answer) && 
               (question.orderingItems?.every((item, index) => answer[index] === item.id) ?? false);
      
      case 'matching':
        return question.matchingPairs?.every(pair => answer[pair.id] === pair.right) ?? false;
      
      case 'fill_blanks':
        return question.blanks?.every(blank => {
          const userAnswer = answer[blank.id]?.toLowerCase().trim();
          const correctAnswer = blank.correctAnswer.toLowerCase().trim();
          return blank.caseSensitive 
            ? answer[blank.id] === blank.correctAnswer
            : userAnswer === correctAnswer ||
              (blank.acceptedAnswers?.some(a => a.toLowerCase().trim() === userAnswer) ?? false);
        }) ?? false;
      
      default:
        return false;
    }
  }

  /**
   * Get answer ID for distribution tracking
   */
  private getAnswerId(answer: any): string {
    if (typeof answer === 'string') return answer;
    if (Array.isArray(answer)) return answer.sort().join('_');
    if (typeof answer === 'object') return JSON.stringify(answer);
    return String(answer);
  }

  /**
   * Calculate points based on various factors
   */
  private calculatePoints(
    question: Question,
    isCorrect: boolean,
    responseTime: number,
    totalTime: number,
    currentStreak: number,
    activePowerUps: PowerUpType[]
  ): number {
    if (!isCorrect) return 0;

    let points = DEFAULT_SCORING.basePoints;

    // Difficulty multiplier
    const difficulty = question.difficulty || 'medium';
    points *= DEFAULT_SCORING.difficultyMultiplier[difficulty];

    // Time bonus
    if (DEFAULT_SCORING.timeBonus) {
      const timeRatio = 1 - (responseTime / totalTime);
      const timeBonus = points * DEFAULT_SCORING.timeBonusMultiplier * timeRatio;
      points += timeBonus;
    }

    // Streak multiplier
    if (DEFAULT_SCORING.streakEnabled && currentStreak >= 3) {
      const streakBonus = STREAK_BONUSES.find(b => b.streak === currentStreak);
      if (streakBonus) {
        points *= streakBonus.multiplier;
      }
    }

    // Power-up multipliers
    if (activePowerUps.includes('double_points')) {
      points *= 2;
    }

    return Math.round(points);
  }

  /**
   * Update leaderboard
   */
  private async updateLeaderboard(roomId: string): Promise<void> {
    try {
      const playersRef = ref(this.db, RTDB_PATHS.players(roomId));
      const playersSnap = await get(playersRef);
      const players = playersSnap.val() as Record<string, ModernPlayer>;

      // Get previous leaderboard for rank changes
      const leaderboardRef = ref(this.db, RTDB_PATHS.leaderboard(roomId));
      const prevLeaderboardSnap = await get(leaderboardRef);
      const prevLeaderboard = prevLeaderboardSnap.val() as LeaderboardEntry[] || [];
      
      const prevRanks = new Map(prevLeaderboard.map(entry => [entry.playerId, entry.rank]));
      const prevScores = new Map(prevLeaderboard.map(entry => [entry.playerId, entry.score]));

      // Create new leaderboard (only for players, not spectators)
      const entries: LeaderboardEntry[] = Object.values(players)
        .filter(p => p.role === 'player')
        .map(player => ({
          rank: 0, // Will be set after sorting
          playerId: player.id,
          playerName: player.name,
          photoURL: player.photoURL,
          score: player.score,
          correctAnswers: player.correctAnswers,
          totalAnswers: player.totalAnswers,
          accuracy: player.totalAnswers > 0 
            ? Math.round((player.correctAnswers / player.totalAnswers) * 100) 
            : 0,
          avgResponseTime: player.avgResponseTime,
          streak: player.streak,
          maxStreak: player.maxStreak,
          rankChange: 0,
          scoreChange: player.score - (prevScores.get(player.id) || 0),
        }))
        .sort((a, b) => {
          // Sort by score, then by avg response time
          if (b.score !== a.score) return b.score - a.score;
          return a.avgResponseTime - b.avgResponseTime;
        })
        .map((entry, index) => {
          const prevRank = prevRanks.get(entry.playerId) || index + 1;
          return {
            ...entry,
            rank: index + 1,
            rankChange: prevRank - (index + 1), // Positive = moved up
          };
        });

      await set(leaderboardRef, entries);

      // Check for leader changes
      if (entries.length > 0 && prevLeaderboard.length > 0) {
        if (entries[0].playerId !== prevLeaderboard[0].playerId) {
          await this.emitEvent(roomId, {
            type: 'leader_changed',
            playerId: entries[0].playerId,
            playerName: entries[0].playerName,
            priority: 'high',
            showToast: true,
            sound: 'leader_change',
          });
        }
      }

      logger.info('📊 Leaderboard updated', { roomId, playerCount: entries.length });
    } catch (error) {
      logger.error('❌ Failed to update leaderboard', { error });
      throw error;
    }
  }

  /**
   * Emit game event
   */
  private async emitEvent(
    roomId: string,
    event: Omit<GameEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      const eventsRef = ref(this.db, RTDB_PATHS.events(roomId));
      const eventData: GameEvent = {
        ...event,
        id: push(eventsRef).key!,
        timestamp: Date.now(),
      };
      
      await push(eventsRef, eventData);
    } catch (error) {
      logger.error('❌ Failed to emit event', { error });
    }
  }

  /**
   * Get spectator view data
   */
  async getSpectatorViewData(roomId: string): Promise<SpectatorViewData | null> {
    try {
      const questionRef = ref(this.db, RTDB_PATHS.currentQuestion(roomId));
      const questionSnap = await get(questionRef);
      const questionState = questionSnap.val() as QuestionState;

      if (!questionState) return null;

      const playersRef = ref(this.db, RTDB_PATHS.players(roomId));
      const playersSnap = await get(playersRef);
      const players = playersSnap.val() as Record<string, ModernPlayer>;

      const playerCount = Object.values(players).filter(p => p.role === 'player').length;

      // Build answer distribution for spectators
      const distribution = Object.entries(questionState.answerDistribution).map(([answerId, playerIds]) => {
        const answer = questionState.question.answers.find(a => a.id === answerId);
        const playerList = (playerIds as string[]).map(pid => ({
          id: pid,
          name: players[pid]?.name || 'Unknown',
          photoURL: players[pid]?.photoURL,
          answeredAt: questionState.answers[pid]?.answeredAt || 0,
        }));

        return {
          answerId,
          answerText: answer?.text || answerId,
          count: playerList.length,
          percentage: playerCount > 0 ? Math.round((playerList.length / playerCount) * 100) : 0,
          players: playerList,
        };
      });

      return {
        question: questionState.question,
        answerDistribution: distribution,
        totalAnswered: questionState.answerCount,
        totalPlayers: playerCount,
        timeRemaining: questionState.timeRemaining,
      };
    } catch (error) {
      logger.error('❌ Failed to get spectator view data', { error });
      return null;
    }
  }

  /**
   * Subscribe to game state changes
   */
  on(roomId: string, event: string, callback: EventCallback): string {
    const callbackId = `${event}_${Date.now()}_${Math.random()}`;
    
    if (!this.listeners.has(roomId)) {
      this.listeners.set(roomId, new Map());
    }
    
    this.listeners.get(roomId)!.set(callbackId, callback);

    // Set up RTDB listener based on event type
    const eventRef = this.getEventRef(roomId, event);
    onValue(eventRef, (snapshot) => {
      callback(snapshot.val());
    });

    return callbackId;
  }

  /**
   * Unsubscribe from game state changes
   */
  off(roomId: string, callbackId: string): void {
    this.listeners.get(roomId)?.delete(callbackId);
  }

  /**
   * Get RTDB reference for event type
   */
  private getEventRef(roomId: string, event: string) {
    const path = event.startsWith('game/') 
      ? `${RTDB_PATHS.games(roomId)}/${event.substring(5)}`
      : RTDB_PATHS.games(roomId);
    return ref(this.db, path);
  }

  /**
   * Cleanup all listeners
   */
  cleanup(roomId: string): void {
    this.listeners.get(roomId)?.clear();
    this.listeners.delete(roomId);
  }
}

export const gameEngine = new GameEngine();
