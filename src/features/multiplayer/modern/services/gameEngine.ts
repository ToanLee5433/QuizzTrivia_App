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
  
  // ✅ Timer management - stored per room to allow proper cleanup
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();

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
   * 🎮 START GAME - Supports both SYNCED and FREE modes
   * 1. Fetch ALL questions from Firestore ONE TIME
   * 2. Store questions in RTDB at games/{roomId}/questions
   * 3. All clients only listen to RTDB - instant sync
   * 4. Route to appropriate mode based on settings
   */
  async startGame(roomId: string, questions: Question[]): Promise<void> {
    try {
      // Get game settings to check mode
      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      const gameSnap = await get(gameRef);
      const gameState = gameSnap.val() as GameState;
      const gameMode = gameState?.settings?.gameMode || 'synced';

      logger.info('🎬 Starting game', { roomId, questionCount: questions.length, gameMode });

      // 🆓 FREE MODE: Use separate flow
      if (gameMode === 'free') {
        await this.startFreeMode(roomId, questions);
        return;
      }

      // 🔄 SYNCED MODE: Original flow
      logger.info('🔄 Using SYNCED mode', { roomId });

      // ✅ STEP 1: Copy players from rooms/{roomId}/players to games/{roomId}/players
      const roomPlayersRef = ref(this.db, `rooms/${roomId}/players`);
      const roomPlayersSnap = await get(roomPlayersRef);
      const roomPlayers = roomPlayersSnap.val() as Record<string, any> | null;

      const gamePlayers: Record<string, ModernPlayer> = {};
      const playerOrder: string[] = [];

      if (roomPlayers) {
        Object.entries(roomPlayers).forEach(([playerId, player]) => {
          gamePlayers[playerId] = {
            id: playerId,
            userId: player.id || playerId,
            name: player.name || 'Player',
            photoURL: player.photoURL,
            role: player.role || 'player',
            status: 'playing',
            score: 0,
            correctAnswers: 0,
            totalAnswers: 0,
            streak: 0,
            maxStreak: 0,
            avgResponseTime: 0,
            powerUps: [],
            activePowerUps: [],
            powerUpPoints: 100,
            isReady: player.isReady ?? true,
            isOnline: player.isOnline ?? true,
            hasAnswered: false,
            joinedAt: player.joinedAt || Date.now(),
            lastActiveAt: Date.now(),
          };
          playerOrder.push(playerId);
        });

        logger.info('✅ Players prepared', { roomId, playerCount: playerOrder.length });
      }

      // ✅ STEP 2: Clean questions (remove undefined) and store in RTDB
      const cleanedQuestions = questions.map(q => this.removeUndefined(q));
      
      // ✅ STEP 3: Update game state with players AND questions in ONE atomic write
      await update(gameRef, {
        status: 'starting',
        startedAt: Date.now(),
        players: gamePlayers,
        playerOrder,
        // ✅ CRITICAL: Store ALL questions in RTDB for fast client sync
        questions: cleanedQuestions,
        totalQuestions: questions.length,
        currentQuestionIndex: -1, // Will be set to 0 when first question starts
      });

      logger.info('✅ Questions stored in RTDB', { roomId, questionCount: cleanedQuestions.length });

      // Emit event
      await this.emitEvent(roomId, {
        type: 'game_started',
        data: { mode: 'synced' },
        priority: 'high',
        showToast: true,
        sound: 'game_start',
      });

      // ✅ STEP 4: Start first question after 3 second countdown
      // Now we can get question directly from RTDB
      setTimeout(() => {
        this.goToNextQuestion(roomId);
      }, 3000);

      logger.success('✅ SYNCED mode game started', { roomId });
    } catch (error) {
      logger.error('❌ Failed to start game', { error });
      throw error;
    }
  }

  /**
   * 🎯 GO TO NEXT QUESTION - NEW ARCHITECTURE
   * Host chỉ cần tăng currentQuestionIndex
   * Tất cả clients tự động nhận question từ RTDB
   */
  async goToNextQuestion(roomId: string): Promise<void> {
    try {
      // Get current game state
      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      const gameSnap = await get(gameRef);
      const gameState = gameSnap.val() as GameState;

      if (!gameState) {
        throw new Error('Game not found');
      }

      const nextIndex = gameState.currentQuestionIndex + 1;

      // Check if game should end
      if (nextIndex >= gameState.totalQuestions) {
        logger.info('🏁 No more questions, finishing game', { roomId });
        await this.finishGame(roomId);
        return;
      }

      // ✅ Get question directly from RTDB (already stored)
      const question = gameState.questions[nextIndex];
      
      if (!question) {
        throw new Error(`Question not found at index ${nextIndex}`);
      }

      logger.info('➡️ Moving to next question', { roomId, nextIndex, type: question.type });

      // Start the question
      await this.startQuestion(roomId, nextIndex, question);

    } catch (error) {
      logger.error('❌ Failed to go to next question', { error });
      throw error;
    }
  }

  /**
   * Remove undefined values from object recursively (Firebase RTDB doesn't allow undefined)
   */
  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefined(item));
    }
    
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = this.removeUndefined(value);
      }
    }
    return cleaned;
  }

  /**
   * Start a question
   * ✅ OPTIMIZED: Only store questionIndex and metadata
   * Question data is already in questions[] array - clients read from there
   */
  async startQuestion(roomId: string, questionIndex: number, question: Question): Promise<void> {
    try {
      logger.info('❓ Starting question', { roomId, questionIndex, type: question.type });

      // ✅ FIX: Get timePerQuestion from game settings, not question.points
      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      const gameSnap = await get(gameRef);
      const gameState = gameSnap.val() as GameState;
      
      // Use settings timePerQuestion, fallback to 30s
      const timeLimit = gameState?.settings?.timePerQuestion || 30;
      const now = Date.now();

      // ✅ OPTIMIZED: Minimal currentQuestion state
      // Question data is already in games/{roomId}/questions[index]
      // Clients will read question from there using currentQuestionIndex
      const questionState: QuestionState = {
        questionIndex,
        // ✅ Only store essential question metadata, not full question
        // Full question is at: games/{roomId}/questions[questionIndex]
        question: this.removeUndefined(question), // Keep for backwards compat, but clients should use questions[index]
        startedAt: now,
        timeLimit,
        timeRemaining: timeLimit,
        isPaused: false,
        answers: {},
        answerCount: 0,
        correctCount: 0,
        answerDistribution: {},
      };

      // ✅ ATOMIC UPDATE: Update game state + reset player states in ONE call
      const playersRef = ref(this.db, RTDB_PATHS.players(roomId));
      const playersSnap = await get(playersRef);
      const players = playersSnap.val() || {};
      
      // Build player reset updates
      const playerResets: Record<string, any> = {};
      Object.keys(players).forEach(playerId => {
        if (players[playerId].role === 'player') {
          playerResets[`players/${playerId}/hasAnswered`] = false;
          playerResets[`players/${playerId}/currentAnswer`] = null;
        }
      });

      // ✅ SINGLE ATOMIC UPDATE for minimum latency
      await update(gameRef, {
        status: 'answering',
        currentQuestionIndex: questionIndex,
        currentQuestion: questionState,
        ...playerResets, // Include player resets in same update
      });

      // Emit event
      await this.emitEvent(roomId, {
        type: 'question_started',
        data: { questionIndex, questionType: question.type },
        priority: 'high',
        sound: 'question_start',
      });

      // Start timer countdown (with proper cleanup)
      this.startQuestionTimer(roomId, timeLimit);

      logger.success('✅ Question started', { roomId, questionIndex });
    } catch (error) {
      logger.error('❌ Failed to start question', { error });
      throw error;
    }
  }

  /**
   * ⏱️ Timer countdown for question - SERVER AUTHORITATIVE
   * - Uses server timestamp for sync
   * - Stores timer ID for cleanup
   * - Updates RTDB every second for client sync
   */
  private startQuestionTimer(roomId: string, duration: number): void {
    // ✅ Clear any existing timer for this room
    this.clearTimer(roomId);
    
    let remaining = duration;
    
    const timerId = setInterval(async () => {
      remaining--;
      
      if (remaining <= 0) {
        this.clearTimer(roomId);
        await this.endQuestion(roomId);
        return;
      }

      // Update time remaining - clients will sync from this
      try {
        const questionRef = ref(this.db, RTDB_PATHS.currentQuestion(roomId));
        await update(questionRef, { 
          timeRemaining: remaining,
          // ✅ Server timestamp for accurate sync
          lastTickAt: Date.now()
        });
      } catch (error) {
        logger.error('Failed to update timer', { roomId, error });
      }
    }, 1000);
    
    // ✅ Store timer for cleanup
    this.activeTimers.set(roomId, timerId);
  }
  
  /**
   * Clear timer for a room
   */
  private clearTimer(roomId: string): void {
    const existingTimer = this.activeTimers.get(roomId);
    if (existingTimer) {
      clearInterval(existingTimer);
      this.activeTimers.delete(roomId);
      logger.debug('Timer cleared', { roomId });
    }
  }

  // ============= SYNCED MODE HELPERS =============

  /**
   * ✅ SYNCED MODE: Check if all players have answered
   * If yes, immediately end question (don't wait for timer)
   */
  private async checkAllPlayersAnswered(roomId: string): Promise<void> {
    try {
      // Get game settings to check mode
      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      const gameSnap = await get(gameRef);
      const gameState = gameSnap.val() as GameState;

      // Only auto-advance in synced mode
      if (gameState?.settings?.gameMode !== 'synced') {
        return;
      }

      // Get all players
      const playersRef = ref(this.db, RTDB_PATHS.players(roomId));
      const playersSnap = await get(playersRef);
      const players = playersSnap.val() as Record<string, ModernPlayer> | null;

      if (!players) return;

      // Count only active players (not spectators, not disconnected)
      const activePlayers = Object.values(players).filter(
        p => p.role === 'player' && p.status !== 'disconnected' && p.isOnline
      );

      const allAnswered = activePlayers.every(p => p.hasAnswered);
      
      if (allAnswered && activePlayers.length > 0) {
        logger.info('✅ All players answered, ending question early', { 
          roomId, 
          playerCount: activePlayers.length 
        });
        
        // Clear timer and end question immediately
        this.clearTimer(roomId);
        await this.endQuestion(roomId);
      }
    } catch (error) {
      logger.error('❌ Failed to check all players answered', { error });
    }
  }

  // ============= FREE MODE METHODS =============

  /**
   * 🆓 FREE MODE: Start game for all players
   * Each player gets their own timer and progress tracking
   */
  async startFreeMode(roomId: string, questions: Question[]): Promise<void> {
    try {
      logger.info('🆓 Starting FREE MODE game', { roomId, questionCount: questions.length });

      // Copy players from room to game
      const roomPlayersRef = ref(this.db, `rooms/${roomId}/players`);
      const roomPlayersSnap = await get(roomPlayersRef);
      const roomPlayers = roomPlayersSnap.val() as Record<string, any> | null;

      // Get settings
      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      const gameSnap = await get(gameRef);
      const gameState = gameSnap.val() as GameState;
      const totalQuizTime = gameState?.settings?.totalQuizTime || 300; // Default 5 minutes

      const gamePlayers: Record<string, ModernPlayer> = {};
      const playerOrder: string[] = [];

      if (roomPlayers) {
        Object.entries(roomPlayers).forEach(([playerId, player]) => {
          const isPlayer = player.role === 'player';
          gamePlayers[playerId] = {
            id: playerId,
            userId: player.id || playerId,
            name: player.name || 'Player',
            photoURL: player.photoURL,
            role: player.role || 'player',
            status: 'playing',
            score: 0,
            correctAnswers: 0,
            totalAnswers: 0,
            streak: 0,
            maxStreak: 0,
            avgResponseTime: 0,
            powerUps: [],
            activePowerUps: [],
            powerUpPoints: 100,
            isReady: player.isReady ?? true,
            isOnline: player.isOnline ?? true,
            hasAnswered: false,
            joinedAt: player.joinedAt || Date.now(),
            lastActiveAt: Date.now(),
            // 🆓 FREE MODE: Individual progress
            freeMode: isPlayer ? {
              currentQuestionIndex: 0,
              timeRemaining: totalQuizTime,
              startedAt: Date.now(),
              answers: {},
            } : undefined,
          };
          playerOrder.push(playerId);
        });
      }

      // Clean questions
      const cleanedQuestions = questions.map(q => this.removeUndefined(q));

      // Update game state
      await update(gameRef, {
        status: 'answering', // Free mode goes straight to answering
        startedAt: Date.now(),
        players: gamePlayers,
        playerOrder,
        questions: cleanedQuestions,
        totalQuestions: questions.length,
        currentQuestionIndex: 0, // Not used in free mode, but set for consistency
      });

      // Emit event
      await this.emitEvent(roomId, {
        type: 'game_started',
        data: { mode: 'free' },
        priority: 'high',
        showToast: true,
        sound: 'game_start',
      });

      // Start individual timers for all players
      await this.startFreeModeTimers(roomId);

      logger.success('✅ FREE MODE game started', { roomId });
    } catch (error) {
      logger.error('❌ Failed to start free mode', { error });
      throw error;
    }
  }

  /**
   * 🆓 FREE MODE: Start individual timers for all players
   */
  private async startFreeModeTimers(roomId: string): Promise<void> {
    const timerId = setInterval(async () => {
      try {
        const playersRef = ref(this.db, RTDB_PATHS.players(roomId));
        const playersSnap = await get(playersRef);
        const players = playersSnap.val() as Record<string, ModernPlayer> | null;

        if (!players) return;

        const updates: Record<string, any> = {};
        let allFinished = true;

        Object.entries(players).forEach(([playerId, player]) => {
          if (player.role !== 'player' || !player.freeMode) return;
          
          // Skip finished players
          if (player.status === 'finished' || player.freeMode.finishedAt) {
            return;
          }

          allFinished = false;
          const newTime = player.freeMode.timeRemaining - 1;

          if (newTime <= 0) {
            // Player ran out of time - mark as finished
            updates[`${playerId}/freeMode/timeRemaining`] = 0;
            updates[`${playerId}/freeMode/finishedAt`] = Date.now();
            updates[`${playerId}/status`] = 'finished';
          } else {
            updates[`${playerId}/freeMode/timeRemaining`] = newTime;
          }
        });

        // Apply updates
        if (Object.keys(updates).length > 0) {
          await update(playersRef, updates);
        }

        // Check if all players finished
        if (allFinished) {
          this.clearTimer(roomId);
          await this.finishGame(roomId);
        }
      } catch (error) {
        logger.error('Free mode timer error', { roomId, error });
      }
    }, 1000);

    this.activeTimers.set(roomId, timerId);
  }

  /**
   * 🆓 FREE MODE: Submit answer for individual player
   */
  async submitFreeModeAnswer(
    roomId: string,
    playerId: string,
    questionIndex: number,
    answer: any,
    activePowerUps: PowerUpType[] = []
  ): Promise<void> {
    try {
      // Get game state for questions
      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      const gameSnap = await get(gameRef);
      const gameState = gameSnap.val() as GameState;

      const question = gameState.questions[questionIndex];
      if (!question) {
        throw new Error(`Question ${questionIndex} not found`);
      }

      // Get player
      const playerRef = ref(this.db, RTDB_PATHS.player(roomId, playerId));
      const playerSnap = await get(playerRef);
      const player = playerSnap.val() as ModernPlayer;

      if (!player.freeMode) {
        throw new Error('Player not in free mode');
      }

      // Check if already answered this question
      if (player.freeMode.answers[questionIndex]) {
        throw new Error('Already answered this question');
      }

      // Calculate response time from when they started this question
      // In free mode, we track time per question from when player saw it
      const responseTime = 5000; // Simplified - could track actual view time

      const isCorrect = this.checkAnswer(question, answer);
      const points = this.calculatePoints(
        question,
        isCorrect,
        responseTime,
        gameState.settings.timePerQuestion * 1000,
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

      // Update player
      const newStreak = isCorrect ? player.streak + 1 : 0;
      const newMaxStreak = Math.max(player.maxStreak, newStreak);
      const newScore = player.score + points;
      const newCorrectAnswers = player.correctAnswers + (isCorrect ? 1 : 0);
      const newTotalAnswers = player.totalAnswers + 1;
      const nextQuestionIndex = questionIndex + 1;
      const isLastQuestion = nextQuestionIndex >= gameState.totalQuestions;

      const playerUpdates: Record<string, any> = {
        score: newScore,
        correctAnswers: newCorrectAnswers,
        totalAnswers: newTotalAnswers,
        streak: newStreak,
        maxStreak: newMaxStreak,
        'freeMode/currentQuestionIndex': nextQuestionIndex,
        [`freeMode/answers/${questionIndex}`]: playerAnswer,
      };

      // If this was the last question, mark player as finished
      if (isLastQuestion) {
        playerUpdates['freeMode/finishedAt'] = Date.now();
        playerUpdates['status'] = 'finished';
      }

      await update(playerRef, playerUpdates);

      // Update leaderboard immediately (rolling update)
      await this.updateLeaderboard(roomId);

      // Emit events
      if (isLastQuestion) {
        await this.emitEvent(roomId, {
          type: 'player_finished',
          playerId,
          playerName: player.name,
          data: { score: newScore, correctAnswers: newCorrectAnswers },
          priority: 'high',
          showToast: true,
        });

        // Check if all players finished
        await this.checkAllPlayersFinishedFreeMode(roomId);
      }

      logger.info('📝 Free mode answer submitted', { 
        roomId, 
        playerId, 
        questionIndex,
        isCorrect, 
        points,
        isLastQuestion 
      });
    } catch (error) {
      logger.error('❌ Failed to submit free mode answer', { error });
      throw error;
    }
  }

  /**
   * 🆓 FREE MODE: Check if all players have finished
   */
  private async checkAllPlayersFinishedFreeMode(roomId: string): Promise<void> {
    try {
      const playersRef = ref(this.db, RTDB_PATHS.players(roomId));
      const playersSnap = await get(playersRef);
      const players = playersSnap.val() as Record<string, ModernPlayer> | null;

      if (!players) return;

      const activePlayers = Object.values(players).filter(
        p => p.role === 'player' && p.isOnline
      );

      const allFinished = activePlayers.every(
        p => p.status === 'finished' || p.freeMode?.finishedAt
      );

      if (allFinished && activePlayers.length > 0) {
        logger.info('✅ All players finished free mode', { roomId });
        this.clearTimer(roomId);
        await this.finishGame(roomId);
      }
    } catch (error) {
      logger.error('❌ Failed to check free mode completion', { error });
    }
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

      // ✅ SYNCED MODE: Check if all players have answered - auto advance
      await this.checkAllPlayersAnswered(roomId);

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
   * End current question and show results (with delays for review/leaderboard)
   */
  async endQuestion(roomId: string): Promise<void> {
    try {
      logger.info('⏱️ Ending question', { roomId });

      // Clear timer first
      this.clearTimer(roomId);

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

      // Get game state to check settings
      const gameSnap = await get(gameRef);
      const gameState = gameSnap.val() as GameState;

      // Wait for review duration, then show leaderboard, then move to next question
      setTimeout(async () => {
        // Show leaderboard between questions
        await update(gameRef, { status: 'leaderboard' });
        
        setTimeout(async () => {
          // ✅ NEW: Use goToNextQuestion instead of emitting event
          // This automatically handles getting question from RTDB
          await this.goToNextQuestion(roomId);
        }, gameState.settings.leaderboardDuration * 1000);
      }, gameState.settings.reviewDuration * 1000);

      logger.success('✅ Question ended', { roomId });
    } catch (error) {
      logger.error('❌ Failed to end question', { error });
      throw error;
    }
  }

  /**
   * ⏭️ Skip to next question IMMEDIATELY (host control)
   * No review/leaderboard delays - instant skip
   */
  async skipQuestion(roomId: string): Promise<void> {
    try {
      logger.info('⏭️ Host skipping question', { roomId });

      // Clear timer immediately
      this.clearTimer(roomId);

      // Update leaderboard first
      await this.updateLeaderboard(roomId);

      // Emit skip event
      await this.emitEvent(roomId, {
        type: 'question_skipped',
        priority: 'high',
        showToast: true,
      });

      // Go to next question immediately
      await this.goToNextQuestion(roomId);

      logger.success('✅ Question skipped', { roomId });
    } catch (error) {
      logger.error('❌ Failed to skip question', { error });
      throw error;
    }
  }

  /**
   * Finish game
   */
  async finishGame(roomId: string): Promise<void> {
    try {
      logger.info('🏁 Finishing game', { roomId });

      // ✅ Clear timer when game finishes
      this.clearTimer(roomId);

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
   * Pause game - freezes everything including timer
   */
  async pauseGame(roomId: string): Promise<void> {
    try {
      // ✅ Clear timer when paused
      this.clearTimer(roomId);
      
      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      
      // Get current time remaining to save it
      const questionRef = ref(this.db, RTDB_PATHS.currentQuestion(roomId));
      const questionSnap = await get(questionRef);
      const questionState = questionSnap.val();
      const timeRemaining = questionState?.timeRemaining || 0;
      
      // Save pause state with remaining time
      await update(gameRef, {
        status: 'paused',
        pausedAt: Date.now(),
        pausedTimeRemaining: timeRemaining, // Save time remaining when paused
      });
      
      // Also mark question as paused
      await update(questionRef, {
        isPaused: true,
      });

      await this.emitEvent(roomId, {
        type: 'game_paused',
        priority: 'high',
        showToast: true,
      });

      logger.info('⏸️ Game paused', { roomId, timeRemaining });
    } catch (error) {
      logger.error('❌ Failed to pause game', { error });
      throw error;
    }
  }

  /**
   * Resume game - restarts timer from where it was paused
   */
  async resumeGame(roomId: string): Promise<void> {
    try {
      const gameRef = ref(this.db, RTDB_PATHS.games(roomId));
      const gameSnap = await get(gameRef);
      const gameState = gameSnap.val();
      
      // Get saved time remaining
      const timeRemaining = gameState?.pausedTimeRemaining || 0;
      
      // Update game state
      await update(gameRef, {
        status: 'answering',
        pausedAt: null,
        pausedTimeRemaining: null, // Clear saved time
      });
      
      // Update currentQuestion with remaining time and unpause
      const questionRef = ref(this.db, RTDB_PATHS.currentQuestion(roomId));
      await update(questionRef, {
        isPaused: false,
        timeRemaining: timeRemaining, // ✅ Sync time remaining to clients
      });

      await this.emitEvent(roomId, {
        type: 'game_resumed',
        priority: 'high',
        showToast: true,
      });
      
      // ✅ Restart timer with remaining time
      if (timeRemaining > 0) {
        this.startQuestionTimer(roomId, timeRemaining);
        logger.info('▶️ Game resumed, timer restarted', { roomId, timeRemaining });
      } else {
        logger.info('▶️ Game resumed (no time remaining)', { roomId });
      }
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
      const players = playersSnap.val() as Record<string, ModernPlayer> | null;

      // Guard: Skip if no players data
      if (!players) {
        logger.warn('No players data found for leaderboard update', { roomId });
        return;
      }

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
      const questionState = questionSnap.val() as QuestionState | null;

      // Guard: No question state yet
      if (!questionState || !questionState.question) {
        return null;
      }

      const playersRef = ref(this.db, RTDB_PATHS.players(roomId));
      const playersSnap = await get(playersRef);
      const players = playersSnap.val() as Record<string, ModernPlayer> | null;

      // Guard: No players data
      if (!players) {
        return null;
      }

      const playerCount = Object.values(players).filter(p => p.role === 'player').length;
      const answers = questionState.question.answers || [];

      // Build answer distribution for spectators
      const answerDistribution = questionState.answerDistribution || {};
      const distribution = Object.entries(answerDistribution).map(([answerId, playerIds]) => {
        const answer = answers.find((a: any) => a.id === answerId);
        const pIds = Array.isArray(playerIds) ? playerIds : [];
        const playerList = pIds.map(pid => ({
          id: pid,
          name: players[pid]?.name || 'Unknown',
          photoURL: players[pid]?.photoURL,
          answeredAt: questionState.answers?.[pid]?.answeredAt || 0,
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
        totalAnswered: questionState.answerCount || 0,
        totalPlayers: playerCount,
        timeRemaining: questionState.timeRemaining || 0,
      };
    } catch (error) {
      // Only log occasionally to avoid spam
      // logger.error('❌ Failed to get spectator view data', { error });
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
   * Cleanup all listeners and timers for a room
   */
  cleanup(roomId: string): void {
    // ✅ Clear listeners
    this.listeners.get(roomId)?.clear();
    this.listeners.delete(roomId);
    
    // ✅ Clear any active timer for this room
    this.clearTimer(roomId);
    
    logger.info('🧹 Cleaned up game engine resources', { roomId });
  }
  
  /**
   * Cleanup ALL resources (for app shutdown)
   */
  cleanupAll(): void {
    // Clear all timers
    this.activeTimers.forEach((timer, roomId) => {
      clearInterval(timer);
      logger.debug('Cleared timer for room', { roomId });
    });
    this.activeTimers.clear();
    
    // Clear all listeners
    this.listeners.clear();
    
    logger.info('🧹 Cleaned up all game engine resources');
  }
}

export const gameEngine = new GameEngine();
