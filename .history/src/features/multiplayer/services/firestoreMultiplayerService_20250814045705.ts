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
  isReady: boolean;
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
  connect(userId: string, username: string): Promise<void>;
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
    
    // Leave current room if any
    if (this.currentRoomId) {
      await this.leaveRoom(this.currentRoomId);
    }
    
    console.log('🔌 Disconnected from Firestore Multiplayer Service');
    this.emit('disconnected');
  }

  // Room Management
  async createRoom(roomConfig: Partial<Room>, selectedQuiz?: any): Promise<{ room: Room; player: Player }> {
    try {
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
          timeLimit: roomConfig.settings?.timeLimit || 30,
          showLeaderboard: roomConfig.settings?.showLeaderboard ?? true,
          allowLateJoin: roomConfig.settings?.allowLateJoin ?? true
        },
        createdAt: serverTimestamp()
      };

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
        settings: roomData.settings,
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
      
      if (snapshot.empty) throw new Error('room_not_found');
      
      const roomDoc = snapshot.docs[0];
      const roomData = roomDoc.data();
      
      // Check if room requires password
      if (roomData.isPrivate && !password) {
        throw new Error('room_requires_password');
      }
      
      if (roomData.isPrivate && roomData.password !== password) {
        throw new Error('wrong_password');
      }
      
      // Check room capacity
      const playersSnapshot = await getDocs(collection(db, 'multiplayer_rooms', roomDoc.id, 'players'));
      if (playersSnapshot.size >= roomData.maxPlayers) {
        throw new Error('room_full');
      }
      
      // Check if game is in progress
      if (roomData.status === 'playing' && !roomData.settings.allowLateJoin) {
        throw new Error('game_in_progress');
      }
      
      // Create player
      const player: Player = {
        id: this.userId,
        username: this.username,
        isReady: false,
        isHost: false,
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
      await this.sendSystemMessage(roomDoc.id, `${this.username} joined the room`);
      
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
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }

  // Game Control
  async startGame(roomId: string): Promise<void> {
    try {
      console.log('🚀 Starting 5-second game countdown...');
      
      // First, set room status to 'starting' with countdown timer
      const roomRef = doc(db, 'multiplayer_rooms', roomId);
      await updateDoc(roomRef, {
        status: 'starting',
        gameStartAt: serverTimestamp(),
        gameStartDelay: 5000 // 5 seconds delay
      });
      
      // After 5 seconds, actually start the game
      setTimeout(() => {
        this.actuallyStartGame(roomId).catch(console.error);
      }, 5000);
      
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  }

  private async actuallyStartGame(roomId: string): Promise<void> {
    try {
      console.log('🔍 Loading quiz data:', {
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
      
      if (roomData.quiz && roomData.quiz.questions && roomData.quiz.questions.length > 0) {
        console.log('✅ Using embedded quiz questions:', questions.length);
        questions = roomData.quiz.questions;
      } else if (roomData.quizId) {
        try {
          console.log('📡 Fetching quiz from Firestore with ID:', roomData.quizId);
          
          const quizRef = doc(db, 'quizzes', roomData.quizId);
          const quizSnap = await getDoc(quizRef);
          
          if (quizSnap.exists()) {
            console.log('📡 Quiz data received:', {
              id: quizSnap.id,
              hasData: !!quizSnap.data(),
              hasQuestions: !!quizSnap.data()?.questions
            });
            
            const quizData = quizSnap.data();
            if (quizData?.questions && Array.isArray(quizData.questions)) {
              questions = quizData.questions;
              console.log('✅ Loaded quiz questions from Firestore:', questions.length, questions.slice(0, 2));
            } else {
              console.warn('⚠️ Quiz found but no valid questions array');
            }
          } else {
            console.warn('⚠️ Quiz document not found in Firestore');
          }
        } catch (e) {
          console.error('❌ Failed to load quiz by quizId:', e);
        }
      }
      
      // Fallback to mock questions if no real questions available
      if (!questions || questions.length === 0) {
        console.warn('⚠️ No quiz questions found, using fallback mock questions');
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
      
      // Update room with game data and playing status
      await updateDoc(roomRef, {
        status: 'playing',
        startedAt: serverTimestamp(),
        gameData,
        // Clear countdown fields
        gameStartAt: null,
        gameStartDelay: null
      });
      
      const emitData = {
        ...gameData,
        roomId,
        questionsCount: questions.length
      };
      
      console.log('🎮 Game actually started with data:', emitData);
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
        console.log('🚀 All players answered, updating room status and advancing...');
        
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
          this.emit('game:data_updated', roomData.gameData);
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
          ...data,
          joinedAt: data.joinedAt?.toDate() || new Date()
        } as Player);
      });
      
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
