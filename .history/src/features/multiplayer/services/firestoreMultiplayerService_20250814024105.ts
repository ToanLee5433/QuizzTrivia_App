import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';

// Types
export interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  quizId?: string;
  quiz?: any;
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
  isReady: boolean;
  isHost: boolean;
  isOnline: boolean;
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
  phase: 'waiting' | 'starting' | 'playing' | 'question' | 'results' | 'finished';
  timePerQuestion?: number;
  questionEndAt?: Date;
  questionResults?: any;
  nextQuestionAt?: Date;
  showingResults?: boolean;
  startTime?: Date;
  endTime?: Date;
  lastUpdated?: Date;
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
  connect(userId: string, username: string): Promise<void>;
  disconnect(): Promise<void>;
  resumeRoom(roomId: string): Promise<{ room: Room } | null>;
  setPresence(roomId: string, isOnline: boolean): Promise<void>;
  
  // Room Management
  createRoom(roomConfig: Partial<Room>, selectedQuiz?: any): Promise<{ room: Room; player: Player }>;
  joinRoom(roomCode: string, password?: string): Promise<{ room: Room; player: Player }>;
  leaveRoom(roomId: string): Promise<void>;
  
  // Game Control
  startGame(roomId: string): Promise<void>;
  submitAnswer(roomId: string, questionId: string, answer: number, timeSpent: number): Promise<void>;
  advanceToNextQuestion(roomId: string): Promise<void>;
  
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
  private currentRoomId: string | null = null;
  private unsubscribeFunctions: (() => void)[] = [];

  // Connection
  async connect(userId: string, username: string): Promise<void> {
    this.userId = userId;
    this.username = username;
    console.log('🔗 Connected to Firestore Multiplayer Service:', { userId, username });
    this.emit('connected', { userId, username });
  }

  async disconnect(): Promise<void> {
    // Unsubscribe from all listeners
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
    
    // Do NOT remove player from room on disconnect; just mark offline
    try {
      if (this.currentRoomId && this.userId) {
        const playerDoc = doc(db, 'multiplayer_rooms', this.currentRoomId, 'players', this.userId);
        await updateDoc(playerDoc, { isOnline: false });
      }
    } catch (_) {}
    
    console.log('🔌 Disconnected from Firestore Multiplayer Service');
    this.emit('disconnected');
  }

  async resumeRoom(roomId: string): Promise<{ room: Room } | null> {
    try {
      const roomRef = doc(db, 'multiplayer_rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) return null;

      // Ensure the player doc exists
      if (!this.userId) return null;
      const playerRef = doc(db, 'multiplayer_rooms', roomId, 'players', this.userId);
      const playerSnap = await getDoc(playerRef);
      if (!playerSnap.exists()) return null;

      // Mark presence online
      await updateDoc(playerRef, { isOnline: true });

      this.currentRoomId = roomId;
      this.listenToRoom(roomId);
      this.listenToPlayers(roomId);
      this.listenToMessages(roomId);

      const data = roomSnap.data();
      const room: Room = {
        id: roomSnap.id,
        code: data.code,
        name: data.name,
        hostId: data.hostId,
        players: [],
        maxPlayers: data.maxPlayers,
        isPrivate: data.isPrivate,
        password: data.password,
        status: data.status,
        quizId: data.quizId,
        quiz: data.quiz,
        settings: data.settings,
        createdAt: data.createdAt?.toDate() || new Date(),
        startedAt: data.startedAt?.toDate(),
        finishedAt: data.finishedAt?.toDate(),
      };

      this.emit('room:updated', room);
      if (data.status === 'playing' && data.gameData) {
        this.emit('game:start', data.gameData);
      }

      return { room };
    } catch (e) {
      console.error('Failed to resume room:', e);
      return null;
    }
  }

  async setPresence(roomId: string, isOnline: boolean): Promise<void> {
    try {
      if (!this.userId) return;
      const playerDoc = doc(db, 'multiplayer_rooms', roomId, 'players', this.userId);
      await updateDoc(playerDoc, { isOnline });
    } catch (_) {}
  }

  // Room Management
  async createRoom(roomConfig: Partial<Room>, selectedQuiz?: any): Promise<{ room: Room; player: Player }> {
    try {
      console.log('🏗️ Creating room with config:', {
        roomConfig,
        selectedQuiz,
        hasSelectedQuiz: !!selectedQuiz,
        quizId: selectedQuiz?.id,
        questionsCount: selectedQuiz?.questions?.length || 0,
        selectedQuizKeys: selectedQuiz ? Object.keys(selectedQuiz) : 'No quiz'
      });
      
      // Check if user is connected
      if (!this.userId || !this.username) {
        throw new Error('User not connected. Please ensure you are logged in.');
      }

      // Generate unique room code
      const code = this.generateRoomCode();
      
      // Create room document
      const roomDoc = doc(collection(db, 'multiplayer_rooms'));
      
      // Create host player
      const player: Player = {
        id: this.userId,
        username: this.username,
        isReady: false,
        isHost: true,
        isOnline: true,
        score: 0,
        answers: [],
        joinedAt: new Date()
      };

      // Room data
      const roomData = {
        code,
        name: roomConfig.name || `${this.username}'s Room`,
        hostId: this.userId,
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
          timeLimit: roomConfig.settings?.timeLimit || roomConfig.settings?.timePerQuestion || 30,
          timePerQuestion: roomConfig.settings?.timePerQuestion || roomConfig.settings?.timeLimit || 30,
          showLeaderboard: roomConfig.settings?.showLeaderboard ?? true,
          allowLateJoin: roomConfig.settings?.allowLateJoin ?? true
        },
        createdAt: serverTimestamp()
      };

      console.log('🏗️ Creating room with quiz data:', {
        quizTitle: selectedQuiz?.title,
        questionsInSelectedQuiz: selectedQuiz?.questions?.length || 0,
        questionsInRoomData: roomData.quiz?.questions?.length || 0,
        roomDataQuizKeys: roomData.quiz ? Object.keys(roomData.quiz) : 'No quiz'
      });

      await setDoc(roomDoc, roomData);

      // Add player to room
      const playerDoc = doc(collection(db, 'multiplayer_rooms', roomDoc.id, 'players'), this.userId);
      await setDoc(playerDoc, player);

      // Set current room
      this.currentRoomId = roomDoc.id;

      // Start listening to room updates
      this.listenToRoom(roomDoc.id);
      this.listenToPlayers(roomDoc.id);
      this.listenToMessages(roomDoc.id);

      // Push URL with room identifiers for persistence across reloads
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('roomId', roomDoc.id);
        url.searchParams.set('code', code);
        window.history.replaceState({}, '', url.toString());
      } catch (_) {}

      const room: Room = {
        id: roomDoc.id,
        code,
        name: roomData.name,
        hostId: this.userId,
        players: [player],
        maxPlayers: roomData.maxPlayers,
        isPrivate: roomData.isPrivate,
        password: roomData.password || undefined,
        status: 'waiting',
        quizId: selectedQuiz?.id || undefined,
        quiz: roomData.quiz || undefined,
        settings: {
          timeLimit: roomData.settings.timeLimit,
          timePerQuestion: roomData.settings.timePerQuestion,
          showLeaderboard: roomData.settings.showLeaderboard,
          allowLateJoin: roomData.settings.allowLateJoin
        },
        createdAt: new Date()
      };

      console.log('🏠 Room created:', room);
      this.emit('room:created', room);
      
      return { room, player };
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  async joinRoom(roomCode: string, password?: string): Promise<{ room: Room; player: Player }> {
    try {
      // Find room by code
      const q = query(collection(db, 'multiplayer_rooms'), where('code', '==', roomCode), limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) throw new Error('Không tìm thấy phòng với mã này');
      
      const roomDoc = snapshot.docs[0];
      const roomData = roomDoc.data();
      
      // Check if room requires password
      if (roomData.isPrivate && !password) {
        throw new Error('Phòng này yêu cầu mật khẩu');
      }
      
      if (roomData.isPrivate && roomData.password !== password) {
        throw new Error('Mật khẩu không đúng');
      }
      
      // Check if player already exists in room
      const existingPlayerDoc = doc(db, 'multiplayer_rooms', roomDoc.id, 'players', this.userId);
      const existingPlayerSnap = await getDoc(existingPlayerDoc);
      if (existingPlayerSnap.exists()) {
        throw new Error('Bạn đã tham gia phòng này rồi');
      }
      
      // Check room capacity
      const playersSnapshot = await getDocs(collection(db, 'multiplayer_rooms', roomDoc.id, 'players'));
      if (playersSnapshot.size >= roomData.maxPlayers) {
        throw new Error('Phòng đã đầy');
      }
      
      // Check if game is in progress
      if (roomData.status === 'playing' && !roomData.settings.allowLateJoin) {
        throw new Error('Trò chơi đang diễn ra và không cho phép tham gia muộn');
      }
      
      // Create player
      const player: Player = {
        id: this.userId,
        username: this.username,
        isReady: false,
        isHost: false,
        isOnline: true,
        score: 0,
        answers: [],
        joinedAt: new Date()
      };
      
      // Add player to room
      const playerDoc = doc(collection(db, 'multiplayer_rooms', roomDoc.id, 'players'), this.userId);
      await setDoc(playerDoc, player);
      
      // Set current room
      this.currentRoomId = roomDoc.id;
      
      // Start listening to room updates
      this.listenToRoom(roomDoc.id);
      this.listenToPlayers(roomDoc.id);
      this.listenToMessages(roomDoc.id);
      
      // Send system message
      await this.sendSystemMessage(roomDoc.id, `${this.username} đã tham gia phòng`);
      
      console.log('✅ Player added to room successfully');
      
      const room: Room = {
        id: roomDoc.id,
        code: roomData.code,
        name: roomData.name,
        hostId: roomData.hostId,
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
      
      console.log('🚪 Joined room:', room);
      // Push URL with roomId for persistence across reloads
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('roomId', roomDoc.id);
        window.history.replaceState({}, '', url.toString());
      } catch (_) {}
      this.emit('room:joined', room);
      
      return { room, player };
    } catch (error) {
      console.error('Error joining room:', error);
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
      
      console.log('👋 Left room:', roomId);
      this.emit('room:left', roomId);

      // Clean URL params after leaving
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('roomId');
        url.searchParams.delete('code');
        window.history.replaceState({}, '', url.toString());
      } catch (_) {}
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }

  // Game Control
  async startGame(roomId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'multiplayer_rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }
      
      const roomData = roomSnap.data();
      
      // Prepare questions: prefer embedded quiz data, else fetch from Firestore by quizId, else fallback
      let questions = [] as any[];
      
      console.log('🔍 Loading quiz data:', {
        hasEmbeddedQuiz: !!(roomData.quiz && Array.isArray(roomData.quiz.questions)),
        embeddedQuestionsCount: roomData.quiz?.questions?.length || 0,
        quizId: roomData.quizId,
        quizIdType: typeof roomData.quizId
      });
      
      if (roomData.quiz && Array.isArray(roomData.quiz.questions) && roomData.quiz.questions.length > 0) {
        questions = roomData.quiz.questions;
        console.log('✅ Using embedded quiz questions:', questions.length);
      } else if (roomData.quizId) {
        try {
          console.log('📡 Fetching quiz from Firestore with ID:', roomData.quizId);
          const quizRef = doc(db, 'quizzes', String(roomData.quizId));
          const quizSnap = await getDoc(quizRef);
          
          if (quizSnap.exists()) {
            const quizData = quizSnap.data();
            console.log('📡 Quiz data received:', {
              hasQuestions: Array.isArray(quizData.questions),
              questionsCount: quizData.questions?.length || 0,
              quizDataKeys: Object.keys(quizData)
            });
            
            if (Array.isArray(quizData.questions) && quizData.questions.length > 0) {
              questions = quizData.questions;
              console.log('✅ Loaded quiz questions from Firestore:', questions.length, questions.slice(0, 2));
            } else {
              console.warn('⚠️ Quiz found but no valid questions array');
            }
          } else {
            console.warn('⚠️ Quiz not found in Firestore for ID:', roomData.quizId);
          }
        } catch (e) {
          console.error('❌ Failed to load quiz by quizId:', e);
        }
      }
      
      if (!questions || questions.length === 0) {
        throw new Error('No quiz questions available. Please select a valid quiz before starting the game.');
      }
      
      console.log('🔍 Final questions before storing to gameData:', {
        questionsCount: questions.length,
        questionsStructure: questions.map((q, idx) => ({
          index: idx,
          id: q.id,
          title: q.title,
          optionsCount: q.options?.length,
          hasOptions: Array.isArray(q.options),
          keys: Object.keys(q)
        })),
        fullQuestions: JSON.stringify(questions, null, 2)
      });

      // Create game data with proper structure for client consumption
      const timePerQuestion = roomData.settings?.timePerQuestion || roomData.settings?.timeLimit || 30;
      const gameData: GameData = {
        currentQuestionIndex: 0,
        questions,
        phase: 'question',
        timePerQuestion,
        questionEndAt: new Date(Date.now() + timePerQuestion * 1000),
        startTime: new Date(),
        results: {},
      };
      
      // Update room status with game data
      await updateDoc(roomRef, {
        status: 'playing',
        startedAt: serverTimestamp(),
        gameData,
        // Ensure timePerQuestion is available for clients
        'settings.timePerQuestion': timePerQuestion
      });
      
      console.log('🎮 Game started:', { roomId, questionsCount: questions.length, timePerQuestion });
      
      // Emit game start event with complete data needed by clients
      const emitData = { 
        ...gameData, 
        timePerQuestion, 
        total: questions.length, 
        index: gameData.currentQuestionIndex + 1,
        currentQuestion: questions[0] // Include first question
      };
      
      console.log('🎮 Emitting game:start with data:', {
        emitData,
        emitDataKeys: Object.keys(emitData),
        questionsLength: emitData.questions?.length || 'No questions',
        firstQuestion: emitData.questions?.[0] || 'No first question'
      });
      
      this.emit('game:start', emitData);
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  }

  async submitAnswer(roomId: string, questionId: string, answer: number, timeSpent: number): Promise<void> {
    try {
      const playerDoc = doc(db, 'multiplayer_rooms', roomId, 'players', this.userId);
      const playerSnap = await getDoc(playerDoc);
      
      if (!playerSnap.exists()) return;
      
      const playerData = playerSnap.data();
      const playerAnswer: PlayerAnswer = {
        questionId,
        selectedAnswer: answer,
        isCorrect: false, // Will be calculated
        timeSpent,
        points: 0, // Will be calculated
        timestamp: new Date()
      };
      
      // Update player's answers
      const updatedAnswers = [...(playerData.answers || []), playerAnswer];
      
      await updateDoc(playerDoc, {
        answers: updatedAnswers
      });
      
      console.log('📝 Answer submitted:', { questionId, answer, timeSpent });
      this.emit('answer:submitted', { questionId, answer, timeSpent });
      
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
        console.log('🚀 All players answered, updating room status and advancing...');
        
        // Update room with advancement countdown immediately for real-time sync
        const roomRef = doc(db, 'multiplayer_rooms', roomId);
        await updateDoc(roomRef, {
          'gameData.nextQuestionAt': new Date(Date.now() + 3000), // 3 seconds from now
          'gameData.showingResults': true
        });
        
        // Wait 3 seconds then advance
        setTimeout(() => {
          this.advanceToNextQuestion(roomId).catch(console.error);
        }, 3000);
      }
    } catch (error) {
      console.error('Error checking for question advancement:', error);
    }
  }

  async advanceToNextQuestion(roomId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'multiplayer_rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) return;
      
      const data = roomSnap.data();
      const questions = data.gameData?.questions || [];
      const currentIndex = data.gameData?.currentQuestionIndex || 0;
      const nextIndex = currentIndex + 1;
      const timePerQuestion = data.settings?.timePerQuestion || data.gameData?.timePerQuestion || 30;
      
      if (nextIndex >= questions.length) {
        // Finish game
        console.log('🏁 Game finished - no more questions');
        await updateDoc(roomRef, {
          status: 'finished',
          finishedAt: serverTimestamp(),
          'gameData.phase': 'finished',
          'gameData.endTime': new Date(),
          'gameData.showingResults': false,
          'gameData.nextQuestionAt': null,
        });
        this.emit('game:finish', data.gameData?.results || {});
        return;
      }
      
      // Advance to next question
      console.log(`➡️ Advancing to question ${nextIndex + 1}/${questions.length}`);
      await updateDoc(roomRef, {
        'gameData.currentQuestionIndex': nextIndex,
        'gameData.phase': 'question',
        'gameData.questionEndAt': new Date(Date.now() + timePerQuestion * 1000),
        'gameData.showingResults': false,
        'gameData.nextQuestionAt': null,
        'gameData.lastUpdated': new Date()
      });
      
      const nextQuestion = questions[nextIndex];
      
      // Emit next question event with complete data
      this.emit('game:next-question', {
        currentQuestionIndex: nextIndex,
        questions,
        timePerQuestion,
        total: questions.length,
        index: nextIndex + 1,
        currentQuestion: nextQuestion
      });
      
    } catch (error) {
      console.error('Error advancing to next question:', error);
      throw error;
    }
  }

  // Communication
  async sendChatMessage(roomId: string, message: string): Promise<void> {
    try {
      const messageData = {
        userId: this.userId,
        username: this.username,
        message: message.trim(),
        timestamp: serverTimestamp(),
        type: 'user'
      };
      
      await addDoc(collection(db, 'multiplayer_rooms', roomId, 'messages'), messageData);
      
      console.log('💬 Chat message sent:', message);
      // Don't emit locally - let the listener handle it for consistency
    } catch (error) {
      console.error('Error sending chat message:', error);
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
      console.error('Error sending system message:', error);
    }
  }

  // Player Management
  async updatePlayerStatus(roomId: string, isReady: boolean): Promise<void> {
    try {
      const playerDoc = doc(db, 'multiplayer_rooms', roomId, 'players', this.userId);
      await updateDoc(playerDoc, { isReady });
      
      console.log('👤 Player status updated:', isReady);
      this.emit('player:status_updated', { isReady });
    } catch (error) {
      console.error('Error updating player status:', error);
      throw error;
    }
  }

  async kickPlayer(roomId: string, playerId: string): Promise<void> {
    try {
      const playerDoc = doc(db, 'multiplayer_rooms', roomId, 'players', playerId);
      await deleteDoc(playerDoc);
      
      console.log('👢 Player kicked:', playerId);
      this.emit('player:kicked', playerId);
    } catch (error) {
      console.error('Error kicking player:', error);
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
      
      console.log('⚙️ Room settings updated:', settings);
      this.emit('room:settings_updated', settings);
    } catch (error) {
      console.error('Error updating room settings:', error);
      throw error;
    }
  }

  // Listeners
  private listenToRoom(roomId: string) {
    const roomDoc = doc(db, 'multiplayer_rooms', roomId);
    const unsubscribe = onSnapshot(roomDoc, (doc) => {
      if (doc.exists()) {
        const roomData = doc.data();
        const room: Room = {
          id: doc.id,
          code: roomData.code,
          name: roomData.name,
          hostId: roomData.hostId,
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
          // Always emit complete game data for clients
          const completeGameData = {
            ...roomData.gameData,
            timePerQuestion: roomData.settings?.timePerQuestion || 30,
            total: roomData.gameData.questions?.length || 0,
            index: (roomData.gameData.currentQuestionIndex || 0) + 1,
            currentQuestion: roomData.gameData.questions?.[roomData.gameData.currentQuestionIndex || 0]
          };
          this.emit('game:data_updated', completeGameData);
        }

        // Ensure all clients enter game when status switches to playing
        if (roomData.status === 'playing' && roomData.gameData) {
          const gameStartData = {
            ...roomData.gameData,
            timePerQuestion: roomData.settings?.timePerQuestion || 30,
            total: roomData.gameData.questions?.length || 0,
            index: (roomData.gameData.currentQuestionIndex || 0) + 1,
            currentQuestion: roomData.gameData.questions?.[roomData.gameData.currentQuestionIndex || 0]
          };
          this.emit('game:start', gameStartData);
        }
      }
    });
    
    this.unsubscribeFunctions.push(unsubscribe);
  }

  private listenToPlayers(roomId: string) {
    const playersCollection = collection(db, 'multiplayer_rooms', roomId, 'players');
    const q = query(playersCollection, orderBy('joinedAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const players: Player[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        players.push({
          id: doc.id,
          username: data.username,
          isReady: data.isReady || false,
          isHost: data.isHost || false,
          isOnline: data.isOnline || true,
          score: data.score || 0,
          answers: data.answers || [],
          joinedAt: data.joinedAt?.toDate() || new Date()
        } as Player);
      });
      
      console.log('👥 Players updated:', players);
      this.emit('players:updated', players);
    });
    
    this.unsubscribeFunctions.push(unsubscribe);
  }

  private listenToMessages(roomId: string) {
    const messagesCollection = collection(db, 'multiplayer_rooms', roomId, 'messages');
    const q = query(messagesCollection, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          userId: data.userId,
          username: data.username,
          message: data.message,
          timestamp: data.timestamp?.toDate() || new Date(),
          type: data.type
        });
      });
      
      console.log('💬 Messages updated:', messages.length, 'messages');
      this.emit('messages:updated', messages);
    });
    
    this.unsubscribeFunctions.push(unsubscribe);
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
