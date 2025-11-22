import { 
  doc, 
  collection, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  limit,
  orderBy,
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp, 
  addDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../../lib/firebase/config';
import { logger } from '../utils/logger';
import realtimeService from './realtimeMultiplayerService';

// Types
export interface Room {
  id: string;
  code: string;
  name: string;
  // Removed hostId - all players are equal
  players: Player[];
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  quizId?: string;
  quiz?: any;
  gameStartAt?: any;
  gameStartDelay?: number;
  settings: {
    timeLimit: number;
    timePerQuestion?: number;
    showLeaderboard: boolean;
    allowLateJoin: boolean;
  };
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface Player {
  id: string;
  username: string;
  photoURL?: string; // Avatar from Firebase Auth
  isReady: boolean;
  isOnline: boolean;
  // Removed isHost - all players are equal
  score: number;
  answers: PlayerAnswer[];
  joinedAt: Date;
}

export interface PlayerAnswer {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpent: number;
  points: number;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'system';
}

export interface GameData {
  currentQuestionIndex: number;
  questions: any[];
  timePerQuestion?: number;
  phase?: 'question' | 'results' | 'finished';
  questionStartAt?: any;
  questionEndAt?: any;
  nextQuestionAt?: any;
  startTime?: Date;
  endTime?: Date;
  results?: {
    [playerId: string]: {
      score: number;
      correctAnswers: number;
      totalAnswers: number;
      averageTime: number;
    };
  };
}

// Service Interface
export interface MultiplayerServiceInterface {
  // Connection
  connect(userId: string, username: string, photoURL?: string): Promise<void>;
  disconnect(): Promise<void>;
  
  // Room Management
  createRoom(roomConfig: Partial<Room>, selectedQuiz?: any): Promise<{ room: Room; player: Player }>;
  joinRoom(roomCode: string, password?: string): Promise<{ room: Room; player: Player }>;
  leaveRoom(roomId: string): Promise<void>;
  
  // Game Control
  startGame(roomId: string): Promise<void>;
  submitAnswer(roomId: string, questionId: string, answer: number, timeSpent: number): Promise<void>;
  
  // Communication
  sendChatMessage(roomId: string, message: string): Promise<void>;
  
  // Player Management
  updatePlayerStatus(roomId: string, isReady: boolean): Promise<void>;
  kickPlayer(roomId: string, playerId: string): Promise<void>;
  
  // Settings
  updateRoomSettings(roomId: string, settings: Partial<Room['settings']>): Promise<void>;
  
  // Event Listeners
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
}

// Simple Event Emitter for browser compatibility
class SimpleEventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(...args));
  }
}

// Firestore Multiplayer Service
export class FirestoreMultiplayerService extends SimpleEventEmitter implements MultiplayerServiceInterface {
  private userId: string = '';
  private username: string = '';
  private userPhotoURL: string = '';
  private currentRoomId: string | null = null;
  private unsubscribeFunctions: (() => void)[] = [];

  // Connection
  async connect(userId: string, username: string, photoURL?: string): Promise<void> {
    console.log('🔍 DEBUG: FirestoreService.connect() called with:', { userId, username, photoURL });
    
    // Check Firebase auth state before connecting
    const auth = getAuth();
    console.log('🔍 DEBUG: Firebase auth state during connect:', {
      currentUser: auth.currentUser,
      uid: auth.currentUser?.uid,
      isNull: !auth.currentUser
    });
    
    this.userId = userId;
    this.username = username;
    this.userPhotoURL = photoURL || '';
    
    console.log('🔍 DEBUG: Service state after connect:', {
      serviceUserId: this.userId,
      serviceUsername: this.username,
      matchesAuth: this.userId === auth.currentUser?.uid
    });
    
    logger.success('Connected to Firestore Multiplayer Service', { userId, username, photoURL });
    this.emit('connected', { userId, username, photoURL });
  }

  async disconnect(): Promise<void> {
    // Unsubscribe from all listeners
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
    
    // Leave current room if any
    if (this.currentRoomId) {
      await this.leaveRoom(this.currentRoomId);
    }
    
    logger.info('Disconnected from Firestore Multiplayer Service');
    this.emit('disconnected');
  }

  // Room Management
  async createRoom(roomConfig: Partial<Room>, selectedQuiz?: any): Promise<{ room: Room; player: Player }> {
    try {
      console.log('🏗️ Service createRoom: Received config', {
        isPrivate: roomConfig.isPrivate,
        password: roomConfig.password,
        fullConfig: roomConfig
      });
      
      // Generate unique room code
      const code = this.generateRoomCode();
      
      // Create room document
      const roomDoc = doc(collection(db, 'multiplayer_rooms'));
      
      // Create room creator player
      const player: Player = {
        id: this.userId,
        username: this.username,
        ...(this.userPhotoURL && { photoURL: this.userPhotoURL }),
        isReady: false,
        isOnline: true,
        // Removed isHost - all players are equal
        score: 0,
        answers: [],
        joinedAt: new Date()
      };

      // Room data
      const roomData = {
        code,
        name: roomConfig.name || `${this.username}'s Room`,
        // Removed hostId - all players are equal
        maxPlayers: roomConfig.maxPlayers || 4,
        isPrivate: roomConfig.isPrivate || false,
        password: roomConfig.password || null,
        status: 'waiting' as const,
        quizId: selectedQuiz?.id || null,
        quiz: selectedQuiz ? {
          id: selectedQuiz.id,
          title: selectedQuiz.title,
          description: selectedQuiz.description,
          questions: selectedQuiz.questions || []
        } : null,
        settings: {
          timeLimit: roomConfig.settings?.timeLimit || 30,
          showLeaderboard: roomConfig.settings?.showLeaderboard ?? true,
          allowLateJoin: roomConfig.settings?.allowLateJoin ?? true
        },
        createdAt: serverTimestamp()
      };
      
      console.log('💾 Service createRoom: Saving to Firestore', {
        isPrivate: roomData.isPrivate,
        password: roomData.password,
        code: roomData.code
      });

      await setDoc(roomDoc, roomData);

      // Add player to room
      const playerDoc = doc(collection(db, 'multiplayer_rooms', roomDoc.id, 'players'), this.userId);
      await setDoc(playerDoc, player);

      // Setup Realtime Database presence for instant sync
      await realtimeService.setupPresence(roomDoc.id, this.userId, this.username);

      // Set current room
      this.currentRoomId = roomDoc.id;

      // Start listening to room updates
      this.listenToRoom(roomDoc.id);
      this.listenToPlayers(roomDoc.id);
      this.listenToMessages(roomDoc.id);

      const room: Room = {
        id: roomDoc.id,
        code,
        name: roomData.name,
        // Removed hostId - all players are equal
        players: [player],
        maxPlayers: roomData.maxPlayers,
        isPrivate: roomData.isPrivate,
        password: roomData.password || undefined,
        status: 'waiting',
        quizId: selectedQuiz?.id || undefined,
        quiz: roomData.quiz || undefined,
        settings: roomData.settings,
        createdAt: new Date()
      };

      logger.success('Room created', { roomId: room.id, code: room.code });
      this.emit('room:created', room);
      
      return { room, player };
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  async joinRoom(roomCode: string, password?: string): Promise<{ room: Room; player: Player }> {
    try {
      logger.info('🚪 Service: Attempting to join room', { roomCode, hasPassword: !!password });
      
      // ⚡ OPTIMIZATION: Single query with parallel player count check
      const q = query(collection(db, 'multiplayer_rooms'), where('code', '==', roomCode), limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        logger.error('❌ Service: Room not found', { roomCode });
        throw new Error('room_not_found');
      }
      
      const roomDoc = snapshot.docs[0];
      const roomData = roomDoc.data();
      
      logger.debug('🔍 Service: Room found', { 
        roomId: roomDoc.id, 
        isPrivate: roomData.isPrivate,
        hasPassword: !!roomData.password,
        providedPassword: !!password
      });
      
      // ⚡ OPTIMIZATION: Check password BEFORE querying players (fail fast)
      if (roomData.isPrivate && !password) {
        logger.warn('🔒 Service: Room requires password but none provided');
        throw new Error('room_requires_password');
      }
      
      if (roomData.isPrivate && roomData.password !== password) {
        logger.error('❌ Service: Wrong password provided');
        throw new Error('wrong_password');
      }
      
      // ⚡ OPTIMIZATION: Parallel checks for capacity and game status
      const [playersSnapshot] = await Promise.all([
        getDocs(collection(db, 'multiplayer_rooms', roomDoc.id, 'players'))
      ]);
      
      if (playersSnapshot.size >= roomData.maxPlayers) {
        throw new Error('room_full');
      }
      
      // Check if game is in progress
      if (roomData.status === 'playing' && !roomData.settings.allowLateJoin) {
        throw new Error('game_in_progress');
      }
      
      logger.success('✅ Service: All checks passed, creating player');
      
      // Create player
      const player: Player = {
        id: this.userId,
        username: this.username,
        ...(this.userPhotoURL && { photoURL: this.userPhotoURL }),
        isReady: false,
        isOnline: true,
        // Removed isHost - all players are equal
        score: 0,
        answers: [],
        joinedAt: new Date()
      };
      
      // Add player to room - DEBUGGING PERMISSION ERROR
      console.log('🔍 DEBUG: About to create player document');
      console.log('🔍 DEBUG: Service userId:', this.userId);
      console.log('🔍 DEBUG: Service username:', this.username);
      console.log('🔍 DEBUG: Room ID:', roomDoc.id);
      console.log('🔍 DEBUG: Player data:', player);
      
      // Check Firebase auth state
      const auth = getAuth();
      console.log('🔍 DEBUG: Firebase auth.currentUser:', auth.currentUser);
      console.log('🔍 DEBUG: Firebase auth UID:', auth.currentUser?.uid);
      console.log('🔍 DEBUG: UID match check:', this.userId === auth.currentUser?.uid);
      console.log('🔍 DEBUG: Is user authenticated?:', !!auth.currentUser);
      
      if (!auth.currentUser) {
        console.error('❌ CRITICAL: Firebase auth.currentUser is null when trying to create player!');
        throw new Error('Firebase authentication not ready');
      }
      
      if (this.userId !== auth.currentUser?.uid) {
        console.error('❌ CRITICAL: Service userId does not match Firebase auth UID!');
        console.error('❌ Service userId:', this.userId, 'Auth UID:', auth.currentUser?.uid);
        throw new Error('Service userId mismatch with Firebase auth');
      }
      
      const playerDoc = doc(collection(db, 'multiplayer_rooms', roomDoc.id, 'players'), this.userId);
      await setDoc(playerDoc, player);
      
      // Setup Realtime Database presence for instant sync
      await realtimeService.setupPresence(roomDoc.id, this.userId, this.username);
      
      // Set current room
      this.currentRoomId = roomDoc.id;
      
      // Start listening to room updates
      this.listenToRoom(roomDoc.id);
      this.listenToPlayers(roomDoc.id);
      this.listenToMessages(roomDoc.id);
      
      // Send system message
      await this.sendSystemMessage(roomDoc.id, `${this.username} joined the room`);
      
      const room: Room = {
        id: roomDoc.id,
        code: roomData.code,
        name: roomData.name,
        // Removed hostId - all players are equal
        players: [player], // Will be updated by listener
        maxPlayers: roomData.maxPlayers,
        isPrivate: roomData.isPrivate,
        password: roomData.password,
        status: roomData.status,
        quizId: roomData.quizId,
        quiz: roomData.quiz,
        settings: roomData.settings,
        createdAt: roomData.createdAt?.toDate() || new Date()
      };
      
      logger.success('Joined room', { roomId: room.id, code: room.code });
      this.emit('room:joined', room);
      
      return { room, player };
    } catch (error) {
      logger.error('Error joining room', error);
      throw error;
    }
  }

  async leaveRoom(roomId: string): Promise<void> {
    try {
      if (!this.userId) return;
      
      // Remove player from room
      const playerDoc = doc(db, 'multiplayer_rooms', roomId, 'players', this.userId);
      await deleteDoc(playerDoc);
      
      // Send system message
      await this.sendSystemMessage(roomId, `${this.username} left the room`);
      
      // Clean up listeners
      this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      this.unsubscribeFunctions = [];
      
      this.currentRoomId = null;
      
      logger.info('Left room', { roomId });
      this.emit('room:left', roomId);
    } catch (error) {
      logger.error('Error leaving room', error);
      throw error;
    }
  }

  async setPresence(roomId: string, isOnline: boolean): Promise<void> {
    try {
      if (!this.userId) return;
      
      // ✅ Check if player document exists before updating
      const playerDoc = doc(db, 'multiplayer_rooms', roomId, 'players', this.userId);
      const playerSnap = await getDoc(playerDoc);
      
      if (!playerSnap.exists()) {
        logger.warn('Cannot set presence - player not in room', { roomId, userId: this.userId });
        return;
      }
      
      // Update player presence in Firestore
      await updateDoc(playerDoc, {
        isOnline,
        lastSeen: serverTimestamp()
      });
      
      logger.info('Updated presence', { roomId, isOnline });
    } catch (error) {
      logger.error('Error setting presence', error);
      // Don't throw - this is not critical
    }
  }

  async resumeRoom(roomId: string): Promise<{ room: Room } | null> {
    try {
      // Get room data
      const roomDoc = doc(db, 'multiplayer_rooms', roomId);
      const roomSnap = await getDoc(roomDoc);
      
      if (!roomSnap.exists()) {
        logger.warn('Room not found for resume', { roomId });
        return null;
      }
      
      const roomData = roomSnap.data();
      
      // ✅ Check if current user is actually a player in this room
      const playerDoc = doc(db, 'multiplayer_rooms', roomId, 'players', this.userId);
      const playerSnap = await getDoc(playerDoc);
      
      if (!playerSnap.exists()) {
        logger.warn('User is not a player in this room, cannot resume', { roomId, userId: this.userId });
        return null;
      }
      
      // Restart listeners
      this.currentRoomId = roomId;
      this.listenToRoom(roomId);
      this.listenToPlayers(roomId);
      this.listenToMessages(roomId);
      
      // Setup RTDB presence
      await realtimeService.setupPresence(roomId, this.userId, this.username);
      
      // Rebuild room object
      const playersSnapshot = await getDocs(collection(db, 'multiplayer_rooms', roomId, 'players'));
      const players = playersSnapshot.docs.map(doc => doc.data() as Player);
      
      const room: Room = {
        id: roomId,
        code: roomData.code,
        name: roomData.name,
        players,
        maxPlayers: roomData.maxPlayers,
        isPrivate: roomData.isPrivate,
        password: roomData.password,
        status: roomData.status,
        quizId: roomData.quizId,
        quiz: roomData.quiz,
        settings: roomData.settings,
        createdAt: roomData.createdAt?.toDate() || new Date()
      };
      
      logger.success('Resumed room', { roomId });
      this.emit('room:resumed', room);
      
      return { room };
    } catch (error) {
      logger.error('Error resuming room', error);
      return null;
    }
  }

  // Game Control
  async startGame(roomId: string, skipCountdown: boolean = false): Promise<void> {
    try {
      const roomRef = doc(db, 'multiplayer_rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }
      
      const roomData = roomSnap.data();
      
      // If skipCountdown is true, start game immediately
      if (skipCountdown) {
        logger.info('⏩ SKIP COUNTDOWN - Starting game immediately', { roomId });
        await this.actuallyStartGame(roomId);
        logger.success('✅ Game started with skipCountdown', { roomId });
        return;
      }
      
      // If room is already starting, check if countdown expired
      if (roomData.status === 'starting' && roomData.gameStartAt) {
        const startTime = new Date(roomData.gameStartAt.seconds * 1000);
        const elapsed = Date.now() - startTime.getTime();
        
        // If countdown already expired, start game immediately
        if (elapsed >= 5000) {
          logger.info('Countdown already expired - starting game immediately');
          await this.actuallyStartGame(roomId);
          return;
        }
        
        // Otherwise, room is already in countdown - do nothing
        logger.info('Room already in countdown phase');
        return;
      }
      
      // If room is already playing, do nothing
      if (roomData.status === 'playing') {
        logger.info('Game already started');
        return;
      }
      
      logger.info('Starting 5-second game countdown...');
      
      // First, set room status to 'starting' with countdown timer
      await updateDoc(roomRef, {
        status: 'starting',
        gameStartAt: serverTimestamp(),
        gameStartDelay: 5000 // 5 seconds delay
      });
      
      // After 5 seconds, actually start the game
      setTimeout(() => {
        this.actuallyStartGame(roomId).catch(logger.error);
      }, 5000);
      
    } catch (error) {
      logger.error('Error starting game', error);
      throw error;
    }
  }

  private async actuallyStartGame(roomId: string): Promise<void> {
    try {
      logger.debug('Loading quiz data', {
        roomId,
        hasUserId: !!this.userId,
        timestamp: new Date().toISOString()
      });
      
      const roomRef = doc(db, 'multiplayer_rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }
      
      const roomData = roomSnap.data();
      let questions = [];
      
      // Check for embedded quiz questions first
      if (roomData.quiz && roomData.quiz.questions && roomData.quiz.questions.length > 0) {
        questions = roomData.quiz.questions;
        logger.success('Using embedded quiz questions', { count: questions.length });
      } else if (roomData.quizId) {
        try {
          logger.debug('Fetching quiz from Firestore', { quizId: roomData.quizId });
          
          const quizRef = doc(db, 'quizzes', roomData.quizId);
          const quizSnap = await getDoc(quizRef);
          
          if (quizSnap.exists()) {
            logger.debug('Quiz data received', {
              id: quizSnap.id,
              hasData: !!quizSnap.data(),
              hasQuestions: !!quizSnap.data()?.questions
            });
            
            const quizData = quizSnap.data();
            if (quizData?.questions && Array.isArray(quizData.questions)) {
              questions = quizData.questions;
              logger.success('Loaded quiz questions from Firestore', { count: questions.length });
            } else {
              logger.warn('Quiz found but no valid questions array');
            }
          } else {
            logger.warn('Quiz document not found in Firestore');
          }
        } catch (e) {
          logger.error('Failed to load quiz by quizId', e);
        }
      }
      
      // Fallback to mock questions if no real questions available
      if (!questions || questions.length === 0) {
        logger.warn('No quiz questions found, using fallback mock questions');
        questions = [
          {
            id: 'mock-q1',
            text: 'What is 2 + 2?',
            answers: [
              { text: '3', isCorrect: false },
              { text: '4', isCorrect: true },
              { text: '5', isCorrect: false },
              { text: '6', isCorrect: false }
            ]
          },
          {
            id: 'mock-q2',
            text: 'What is the capital of Vietnam?',
            answers: [
              { text: 'Ho Chi Minh City', isCorrect: false },
              { text: 'Hanoi', isCorrect: true },
              { text: 'Da Nang', isCorrect: false },
              { text: 'Hue', isCorrect: false }
            ]
          }
        ];
      }
      
      const timePerQuestion = roomData.settings?.timePerQuestion || 30;
      
      const gameData = {
        currentQuestionIndex: 0,
        questions,
        timePerQuestion,
        phase: 'question',
        questionStartAt: serverTimestamp(),
        questionEndAt: new Date(Date.now() + (timePerQuestion * 1000))
      };
      
      logger.info('🎮 UPDATING ROOM TO PLAYING STATUS', { 
        roomId, 
        questionsCount: questions.length,
        status: 'playing',
        hasGameData: true 
      });
      
      // Update room with game data and playing status
      await updateDoc(roomRef, {
        status: 'playing',
        startedAt: serverTimestamp(),
        gameData,
        // Clear countdown fields
        gameStartAt: null,
        gameStartDelay: null
      });
      
      logger.success('✅ ROOM STATUS UPDATED TO PLAYING', { roomId });
      
      const emitData = {
        ...gameData,
        roomId,
        questionsCount: questions.length
      };
      
      logger.info('📡 EMITTING game:start EVENT', { 
        roomId, 
        questionsCount: questions.length
      });
      
      this.emit('game:start', emitData);
      
      logger.success('✅ Game actually started - event emitted', { roomId, questionsCount: questions.length });
    } catch (error) {
      logger.error('Error starting game', error);
      throw error;
    }
  }

  async submitAnswer(roomId: string, questionId: string, answer: number, timeSpent: number): Promise<void> {
    try {
      const playerDoc = doc(db, 'multiplayer_rooms', roomId, 'players', this.userId);
      const playerSnap = await getDoc(playerDoc);
      
      if (!playerSnap.exists()) return;
      
      const playerData = playerSnap.data();
      
      // Get room data to access questions for correct answer calculation
      const roomRef = doc(db, 'multiplayer_rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) return;
      
      const roomData = roomSnap.data();
      const currentQuestionIndex = roomData.gameData?.currentQuestionIndex || 0;
      const currentQuestion = roomData.gameData?.questions?.[currentQuestionIndex];
      
      // Calculate correct answer and points
      let isCorrect = false;
      let points = 0;
      
      if (currentQuestion) {
        // Find correct answer index
        let correctIndex = 0;
        if (currentQuestion.answers && Array.isArray(currentQuestion.answers)) {
          correctIndex = currentQuestion.answers.findIndex((a: any) => a.isCorrect);
          if (correctIndex === -1) correctIndex = 0;
        }
        
        isCorrect = answer === correctIndex;
        points = isCorrect ? Math.max(10, Math.floor(100 - (timeSpent * 2))) : 0;
      }
      
      const playerAnswer: PlayerAnswer = {
        questionId,
        selectedAnswer: answer,
        isCorrect,
        timeSpent,
        points,
        timestamp: new Date()
      };
      
      // Update player's answers
      const updatedAnswers = [...(playerData.answers || []), playerAnswer];
      
      await updateDoc(playerDoc, {
        answers: updatedAnswers
      });
      
      this.emit('answer:submitted', { questionId, answer, timeSpent, isCorrect, points });
      
      // Check if all players have submitted and auto-advance
      this.checkAndAdvanceQuestion(roomId, questionId);
      
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }

  private async checkAndAdvanceQuestion(roomId: string, questionId: string): Promise<void> {
    try {
      // Get all players
      const playersSnapshot = await getDocs(collection(db, 'multiplayer_rooms', roomId, 'players'));
      const players = playersSnapshot.docs.map(doc => doc.data());
      
      // Check if all players have answered this question
      const allAnswered = players.every(player => 
        player.answers?.some((answer: any) => answer.questionId === questionId)
      );
      
      if (allAnswered && players.length > 0) {
        logger.info('All players answered, advancing to next question...');
        
        // Update room with advancement countdown immediately for real-time sync
        const roomRef = doc(db, 'multiplayer_rooms', roomId);
        await updateDoc(roomRef, {
          'gameData.phase': 'results',
          'gameData.nextQuestionAt': new Date(Date.now() + 3000) // 3 seconds to show results
        });
        
        // After 3 seconds, advance to next question or finish game
        setTimeout(async () => {
          try {
            const roomSnap = await getDoc(roomRef);
            if (!roomSnap.exists()) return;
            
            const roomData = roomSnap.data();
            const currentIndex = roomData.gameData?.currentQuestionIndex || 0;
            const totalQuestions = roomData.gameData?.questions?.length || 0;
            
            if (currentIndex + 1 >= totalQuestions) {
              // Game finished
              await updateDoc(roomRef, {
                status: 'finished',
                finishedAt: serverTimestamp(),
                'gameData.phase': 'finished'
              });
            } else {
              // Next question
              const nextIndex = currentIndex + 1;
              const timePerQuestion = roomData.settings?.timePerQuestion || 30;
              
              await updateDoc(roomRef, {
                'gameData.currentQuestionIndex': nextIndex,
                'gameData.phase': 'question',
                'gameData.questionStartAt': serverTimestamp(),
                'gameData.questionEndAt': new Date(Date.now() + (timePerQuestion * 1000)),
                'gameData.nextQuestionAt': null
              });
            }
          } catch (error) {
            console.error('Error advancing question:', error);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error checking players answers:', error);
    }
  }

  // Communication
  async sendChatMessage(roomId: string, message: string): Promise<void> {
    try {
      // Use Realtime Database for instant chat delivery
      const messageData = {
        userId: this.userId,
        username: this.username,
        message: message.trim(),
        type: 'user'
      };
      
      await realtimeService.sendChatMessage(roomId, messageData);
      
      logger.debug('Chat message sent via Realtime DB');
      // Don't emit locally - let the listener handle it for consistency
    } catch (error) {
      logger.error('Error sending chat message', error);
      throw error;
    }
  }

  private async sendSystemMessage(roomId: string, message: string): Promise<void> {
    try {
      const messageData = {
        userId: 'system',
        username: 'System',
        message,
        timestamp: serverTimestamp(),
        type: 'system'
      };
      
      await addDoc(collection(db, 'multiplayer_rooms', roomId, 'messages'), messageData);
    } catch (error) {
      logger.error('Error sending system message', error);
    }
  }

  // Player Management
  async updatePlayerStatus(roomId: string, isReady: boolean): Promise<void> {
    try {
      const playerDoc = doc(db, 'multiplayer_rooms', roomId, 'players', this.userId);
      await updateDoc(playerDoc, { isReady });
      
      logger.debug('Player status updated', { isReady });
      this.emit('player:status_updated', { isReady });
    } catch (error) {
      logger.error('Error updating player status', error);
      throw error;
    }
  }

  async kickPlayer(roomId: string, playerId: string): Promise<void> {
    try {
      const playerDoc = doc(db, 'multiplayer_rooms', roomId, 'players', playerId);
      await deleteDoc(playerDoc);
      
      logger.info('Player kicked', { playerId });
      this.emit('player:kicked', playerId);
    } catch (error) {
      logger.error('Error kicking player', error);
      throw error;
    }
  }

  // Settings
  async updateRoomSettings(roomId: string, settings: Partial<Room['settings']>): Promise<void> {
    try {
      const roomDoc = doc(db, 'multiplayer_rooms', roomId);
      await updateDoc(roomDoc, { 
        [`settings.${Object.keys(settings)[0]}`]: Object.values(settings)[0] 
      });
      
      logger.debug('Room settings updated', settings);
      this.emit('room:settings_updated', settings);
    } catch (error) {
      logger.error('Error updating room settings', error);
      throw error;
    }
  }

  // Listeners
  private listenToRoom(roomId: string) {
    const roomDoc = doc(db, 'multiplayer_rooms', roomId);
    const unsubscribe = onSnapshot(roomDoc, (doc) => {
      if (doc.exists()) {
        const roomData = doc.data();
        
        logger.debug('Room snapshot received', {
          roomId: doc.id,
          status: roomData.status,
          hasQuiz: !!roomData.quiz,
          questionsCount: roomData.quiz?.questions?.length || 0
        });
        
        const room: Room = {
          id: doc.id,
          code: roomData.code,
          name: roomData.name,
          // Removed hostId - all players are equal
          players: [], // Will be populated by players listener
          maxPlayers: roomData.maxPlayers,
          isPrivate: roomData.isPrivate,
          password: roomData.password,
          status: roomData.status,
          quizId: roomData.quizId,
          quiz: roomData.quiz,
          settings: roomData.settings,
          createdAt: roomData.createdAt?.toDate() || new Date(),
          startedAt: roomData.startedAt?.toDate(),
          finishedAt: roomData.finishedAt?.toDate()
        };
        
        this.emit('room:updated', room);
        
        // Emit game events
        if (roomData.gameData) {
          this.emit('game:data_updated', roomData.gameData);
        }
      } else {
        logger.error('Room document does not exist!', { roomId });
        this.emit('error', new Error('Room not found'));
      }
    }, (error) => {
      logger.error('Error in room snapshot listener', { roomId, error });
      this.emit('error', error);
    });
    
    this.unsubscribeFunctions.push(unsubscribe);
  }

  private listenToPlayers(roomId: string) {
    const playersCollection = collection(db, 'multiplayer_rooms', roomId, 'players');
    const q = query(playersCollection, orderBy('joinedAt', 'asc'));
    
    // Store Firestore players for merging with Realtime DB data
    let firestorePlayers: Player[] = [];
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const players: Player[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        players.push({
          ...data,
          joinedAt: data.joinedAt?.toDate() || new Date()
        } as Player);
      });
      
      firestorePlayers = players;
      
      logger.info('Players snapshot updated', { 
        roomId, 
        count: players.length,
        playerNames: players.map(p => p.username)
      });
      
      this.emit('players:updated', players);
    });
    
    // Listen to Realtime Database presence for instant online/offline updates
    realtimeService.listenToPresence(roomId, (presence) => {
      // Merge Firestore data with Realtime DB presence
      const enhancedPlayers = firestorePlayers.map(player => ({
        ...player,
        isOnline: presence[player.id]?.isOnline ?? player.isOnline
      }));
      
      logger.debug('Merged presence data', { 
        roomId, 
        onlineCount: Object.values(presence).filter(p => p.isOnline).length 
      });
      
      this.emit('players:updated', enhancedPlayers);
    });
    
    this.unsubscribeFunctions.push(unsubscribe);
  }

  private listenToMessages(roomId: string) {
    // Use Realtime Database for instant chat updates
    realtimeService.listenToChatMessages(roomId, (realtimeMessages) => {
      // Convert Realtime DB format to ChatMessage format
      const messages: ChatMessage[] = realtimeMessages.map((msg: any) => ({
        id: msg.id || `${msg.userId}_${msg.timestamp}`,
        userId: msg.userId,
        username: msg.username,
        message: msg.message,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        type: msg.type || 'user'
      }));
      
      logger.debug('Chat messages updated from Realtime DB', { count: messages.length });
      this.emit('messages:updated', messages);
    });
  }

  // Utility
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Export singleton instance
export const firestoreMultiplayerService = new FirestoreMultiplayerService();
