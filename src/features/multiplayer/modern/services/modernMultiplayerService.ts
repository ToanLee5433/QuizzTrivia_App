import { 
  doc, 
  collection, 
  setDoc, 
  getDoc, 
  getDocs,
  query, 
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  addDoc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { 
  ref, 
  onValue, 
  set, 
  update,
  remove,
  get,
  push,
  onDisconnect,
  Database,
  getDatabase,
  runTransaction
} from 'firebase/database';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import CryptoJS from 'crypto-js';
import i18next from 'i18next';
import { rateLimiter } from '../utils/rateLimiter';
import { logger } from '../utils/logger';
import { networkMonitor } from '../utils/networkMonitor';
import { retryWithBackoff, retryStrategies } from '../utils/retry';
import {
  AuthenticationError,
  PasswordError,
  ValidationError,
  RoomNotFoundError,
  RoomFullError,
  GameInProgressError,
  UnauthorizedError,
  QuestionNotFoundError,
  RoomCodeGenerationError,
  RateLimitError
} from '../errors/MultiplayerErrors';

// Modern Types
export interface ModernQuiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  questionCount: number;
  timeLimit: number;
  thumbnail?: string;
  questions: QuizQuestion[];
  password?: string | null;
  isPrivate: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit?: number;
  points?: number;
}

export interface ModernRoom {
  id: string;
  code: string;
  name: string;
  quizId: string;
  quiz: ModernQuiz;
  hostId: string;
  ownerId?: string; // ✅ NEW: Permanent room creator (never changes)
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
  passwordSalt?: string;
  passwordVersion?: number;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  settings: {
    timePerQuestion: number;
    showLeaderboard: boolean;
    allowLateJoin: boolean;
  };
  createdAt: Timestamp;
  startedAt?: Timestamp;
  currentQuestion?: number;
  questionStartTime?: number;
}

export type PlayerRole = 'host' | 'player' | 'spectator';

export interface ModernPlayer {
  id: string;
  name: string;
  avatar?: string;
  photoURL?: string;
  score: number;
  isReady: boolean;
  isOnline: boolean;
  role: PlayerRole; // host = quản lý phòng, player = người chơi, spectator = người xem
  isParticipating?: boolean; // For host: true = playing, false = spectating (only for role='host')
  joinedAt: number;
  lastActive: number;
  answers: PlayerAnswer[];
}

export interface PlayerAnswer {
  questionId: string;
  answer: number;
  timeSpent: number;
  isCorrect: boolean;
  points: number;
}

export interface PauseRequest {
  playerId: string;
  playerName: string;
  requestedAt: number;
  reason?: string;
}

export interface GameState {
  status: 'waiting' | 'playing' | 'paused' | 'finished';
  currentQuestion: number;
  timeLeft: number;
  questionStartTime: number;
  pausedAt?: number;
  pauseRequests?: { [playerId: string]: PauseRequest };
  players: { [playerId: string]: ModernPlayer };
}

export interface SharedScreenData {
  type: 'youtube' | 'webpage' | 'empty';
  url?: string;
  videoId?: string;
  timestamp?: number;
  isPlaying?: boolean;
  title?: string;
  updatedAt?: number;
  updatedBy?: string;
}

// Modern Multiplayer Service
export class ModernMultiplayerService {
  private auth: Auth;
  public db: Firestore;
  private rtdb: Database;
  public roomId: string = '';
  private userId: string = '';
  private listeners: { [key: string]: () => void } = {};
  private callbacks: Map<string, Map<string, Function>> = new Map();
  private callbackIdCounter = 0;
  private networkMonitor = networkMonitor;
  // ✅ FIX: Store onDisconnect refs to cancel them when leaving properly
  private presenceDisconnectRef: any = null;
  private playerDisconnectRef: any = null;

  constructor() {
    this.rtdb = getDatabase();
    this.db = getFirestore();
    this.auth = getAuth();
    this.userId = this.auth.currentUser?.uid || '';
    this.userId = getAuth().currentUser?.uid || '';
    
    // Set up network monitoring
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring(): void {
    // Listen to network changes
    const onlineId = this.networkMonitor.on('online', () => {
      this.emit('network:online');
      logger.info('Network connection restored');
      
      // Auto reconnect if was in a room
      if (this.roomId) {
        this.reconnect().catch(error => {
          logger.error('Auto reconnect failed', error);
        });
      }
    });
    
    const offlineId = this.networkMonitor.on('offline', () => {
      this.emit('network:offline');
      logger.warn('Network connection lost');
    });
    
    // Clean up network listeners on service cleanup
    this.on('cleanup', () => {
      this.networkMonitor.off(onlineId);
      this.networkMonitor.off(offlineId);
    });
  }

  // Wrap all operations with network check and retry logic
  private async executeOperation<T>(
    fn: () => Promise<T>,
    retryStrategy = retryStrategies.standard
  ): Promise<T> {
    // Check network connectivity
    this.networkMonitor.ensureOnline();
    
    // Execute with retry logic
    return retryWithBackoff(fn, retryStrategy);
  }

  // Password hashing utilities
  private generateSalt(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  private hashPassword(password: string, salt: string): string {
    return CryptoJS.SHA256(password + salt).toString();
  }

  private verifyPassword(inputPassword: string, storedPassword: string, salt?: string, version?: number): boolean {
    if (version === 1 && salt) {
      // New hashed password
      const hashedInput = this.hashPassword(inputPassword, salt);
      return hashedInput === storedPassword;
    } else {
      // Legacy plaintext password (backward compatibility)
      return inputPassword === storedPassword;
    }
  }

  // Authentication guard
  private ensureAuthenticated(): void {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new AuthenticationError();
    }
    if (this.userId !== auth.currentUser.uid) {
      this.userId = auth.currentUser.uid;
    }
  }

  // Helper function to remove undefined values from objects
  private removeUndefined<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    
    const result: any = Array.isArray(obj) ? [] : {};
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (value !== undefined) {
          result[key] = typeof value === 'object' ? this.removeUndefined(value) : value;
        }
      }
    }
    
    return result;
  }

  // Event Management
  on(event: string, callback: Function): string {
    const id = `cb_${this.callbackIdCounter++}`;
    
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Map());
    }
    
    this.callbacks.get(event)!.set(id, callback);
    return id;
  }

  off(event: string, callbackId: string): void {
    const eventCallbacks = this.callbacks.get(event);
    if (eventCallbacks) {
      eventCallbacks.delete(callbackId);
    }
  }

  private emit(event: string, data?: any): void {
    const eventCallbacks = this.callbacks.get(event);
    if (eventCallbacks) {
      eventCallbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in callback for event ${event}:`, error);
        }
      });
    }
  }

  // Initialize with authenticated user
  async initialize() {
    this.ensureAuthenticated();
    logger.success('Modern Multiplayer Service initialized', { userId: this.userId });
  }

  // Helper function to strip HTML tags
  private stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  }

  // URL validation for shared screen security
  private isUrlSafe(url: string): boolean {
    try {
      const parsed = new URL(url);
      const allowedDomains = [
        'youtube.com',
        'youtu.be',
        'vimeo.com',
        'drive.google.com',
        'docs.google.com',
        'slides.google.com',
        'forms.google.com'
      ];
      
      return allowedDomains.some(domain => 
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
      );
    } catch (error) {
      logger.warn('Invalid URL format', { url });
      return false;
    }
  }

  // ✅ Get quizzes metadata only (no questions) - saves Firebase reads
  async getAvailableQuizzesMetadata(): Promise<ModernQuiz[]> {
    try {
      this.ensureAuthenticated();
      
      const quizzesQuery = query(
        collection(this.db, 'quizzes'),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(quizzesQuery);
      const quizzes: ModernQuiz[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Filter client-side for visibility
        if (data.visibility === 'private' || data.visibility === 'password') {
          continue;
        }
        
        // ✅ Only get question count, NOT the actual questions
        let questionCount = 0;
        if (data.questionCount) {
          // If questionCount is stored in document
          questionCount = data.questionCount;
        } else if (data.questions && Array.isArray(data.questions)) {
          // Count from document field
          questionCount = data.questions.length;
        }
        
        quizzes.push({
          id: doc.id,
          title: data.title,
          description: this.stripHtml(data.description),
          category: data.category || 'General',
          difficulty: data.difficulty || 'Medium',
          questionCount: questionCount,
          timeLimit: data.timeLimit || 30,
          thumbnail: data.thumbnail,
          questions: [], // ✅ Empty - will load later if needed
          password: data.password || null,
          isPrivate: !!data.password
        });
      }
      
      return quizzes;
    } catch (error) {
      console.error('❌ Failed to fetch quizzes metadata:', error);
      this.emit('error', error);
      throw error;
    }
  }

  // Quiz Data from Firestore (with full questions)
  async getAvailableQuizzes(): Promise<ModernQuiz[]> {
    try {
      this.ensureAuthenticated();
      
      // Temporary workaround: Use single field query while index builds
      // This avoids the composite index requirement
      const quizzesQuery = query(
        collection(this.db, 'quizzes'),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(quizzesQuery);
      const quizzes: ModernQuiz[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Filter client-side for visibility to avoid composite index
        if (data.visibility === 'private' || data.visibility === 'password') {
          continue;
        }
        
        // Get questions - try subcollection first, then document field
        console.log(`🔍 Fetching questions for quiz: ${doc.id}`);
        let questions: QuizQuestion[] = [];
        
        try {
          const questionsQuery = query(
            collection(this.db, 'quizzes', doc.id, 'questions')
          );
          const questionsSnapshot = await getDocs(questionsQuery);
          console.log(`📊 Found ${questionsSnapshot.size} questions in subcollection for quiz: ${doc.id}`);
          
          questionsSnapshot.forEach(qDoc => {
            const qData = qDoc.data();
            questions.push({
              id: qDoc.id,
              question: qData.question,
              options: qData.options,
              correctAnswer: qData.correctAnswer,
              timeLimit: qData.timeLimit || 30,
              points: qData.points || 100
            });
          });
        } catch (error) {
          console.warn(`⚠️ Could not fetch questions subcollection for ${doc.id}, trying document field`);
        }
        
        // Fallback: Check if questions are in the document itself
        if (questions.length === 0 && data.questions && Array.isArray(data.questions)) {
          console.log(`📋 Using questions from document field: ${data.questions.length} questions`);
          questions = data.questions.map((q: any, idx: number) => ({
            id: q.id || `q${idx}`,
            question: q.question || q.text || q.title,
            options: q.options || q.answers?.map((a: any) => a.text) || [],
            correctAnswer: q.correctAnswer ?? q.answers?.findIndex((a: any) => a.isCorrect) ?? 0,
            timeLimit: q.timeLimit || 30,
            points: q.points || 100
          }));
        }
        
        console.log(`✅ Processed ${questions.length} questions for quiz: ${data.title}`);
        
        quizzes.push({
          id: doc.id,
          title: data.title,
          description: this.stripHtml(data.description),
          category: data.category || 'General',
          difficulty: data.difficulty || 'Medium',
          questionCount: questions.length,
          timeLimit: data.timeLimit || 30,
          thumbnail: data.thumbnail,
          questions,
          password: data.password || null,
          isPrivate: !!data.password
        });
      }
      
      return quizzes;
    } catch (error) {
      console.error('❌ Failed to fetch quizzes:', error);
      this.emit('error', error);
      throw error;
    }
  }

  // ✅ NEW: Get questions for specific quiz (lazy loading)
  // Returns Question[] format compatible with game engine
  async getQuizQuestions(quizId: string): Promise<any[]> {
    try {
      let questions: any[] = [];
      
      // Try to get from quiz document first (most common format)
      const quizDoc = await getDoc(doc(this.db, 'quizzes', quizId));
      if (quizDoc.exists()) {
        const data = quizDoc.data();
        if (data.questions && Array.isArray(data.questions)) {
          questions = data.questions.map((q: any, idx: number) => {
            // Convert to Question format expected by game engine
            const answers = q.answers || q.options?.map((opt: string, optIdx: number) => ({
              id: `ans_${idx}_${optIdx}`,
              text: opt,
              isCorrect: optIdx === q.correctAnswer
            })) || [];
            
            // Build question object, only including defined fields
            const question: any = {
              id: q.id || `q${idx}`,
              text: q.text || q.question || q.title || '',
              type: q.type || 'multiple', // Default to multiple choice
              answers: answers,
              difficulty: q.difficulty || 'medium',
              points: q.points || q.timeLimit || 30, // timeLimit as fallback for points
            };
            
            // Only add optional fields if they have values (Firebase RTDB doesn't allow undefined)
            if (q.correctAnswer !== undefined) question.correctAnswer = q.correctAnswer;
            if (q.explanation) question.explanation = q.explanation;
            if (q.imageUrl || q.image) question.imageUrl = q.imageUrl || q.image;
            if (q.orderingItems) question.orderingItems = q.orderingItems;
            if (q.matchingPairs) question.matchingPairs = q.matchingPairs;
            if (q.blanks) question.blanks = q.blanks;
            if (q.acceptedAnswers) question.acceptedAnswers = q.acceptedAnswers;
            
            return question;
          });
        }
      }
      
      // Fallback: Try subcollection
      if (questions.length === 0) {
        try {
          const questionsQuery = query(
            collection(this.db, 'quizzes', quizId, 'questions')
          );
          const questionsSnapshot = await getDocs(questionsQuery);
          
          let idx = 0;
          questionsSnapshot.forEach((qDoc) => {
            const q = qDoc.data();
            const currentIdx = idx++;
            const answers = q.answers || q.options?.map((opt: string, optIdx: number) => ({
              id: `ans_${currentIdx}_${optIdx}`,
              text: opt,
              isCorrect: optIdx === q.correctAnswer
            })) || [];
            
            // Build question object, only including defined fields
            const question: any = {
              id: qDoc.id,
              text: q.text || q.question || q.title || '',
              type: q.type || 'multiple',
              answers: answers,
              difficulty: q.difficulty || 'medium',
              points: q.points || q.timeLimit || 30,
            };
            
            // Only add optional fields if they have values
            if (q.correctAnswer !== undefined) question.correctAnswer = q.correctAnswer;
            if (q.explanation) question.explanation = q.explanation;
            if (q.imageUrl || q.image) question.imageUrl = q.imageUrl || q.image;
            
            questions.push(question);
          });
        } catch (error) {
          console.warn(`⚠️ Could not fetch questions subcollection for ${quizId}`);
        }
      }
      
      console.log(`✅ Loaded ${questions.length} questions for quiz ${quizId}`, questions[0]);
      return questions;
    } catch (error) {
      console.error(`❌ Failed to fetch questions for quiz ${quizId}:`, error);
      throw error;
    }
  }

  // Create room
  async createRoom(
    roomName: string,
    quizId: string,
    maxPlayers: number = 4,
    isPrivate: boolean = false,
    password?: string
  ): Promise<{ roomId: string; roomCode: string }> {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();

        // Rate limiting
        if (!rateLimiter.canPerform(this.userId, 'createRoom')) {
          const remaining = rateLimiter.getRemaining(this.userId, 'createRoom');
          throw new RateLimitError('create room', remaining > 0 ? Math.ceil(remaining / 1000) : 60);
        }

        // Validate input
        if (!roomName.trim()) {
          throw new ValidationError('roomName', 'Room name is required');
        }
        if (roomName.length < 3 || roomName.length > 50) {
          throw new ValidationError('roomName', 'Room name must be between 3 and 50 characters');
        }
        if (maxPlayers < 2 || maxPlayers > 20) {
          throw new ValidationError('maxPlayers', 'Max players must be between 2 and 20');
        }
        if (password && password.length < 4) {
          throw new ValidationError('password', 'Password must be at least 4 characters');
        }

        const roomCode = await this.generateRoomCode();
        
        let hashedPassword: string | undefined;
        let passwordSalt: string | undefined;
        
        if (password) {
          passwordSalt = this.generateSalt();
          hashedPassword = this.hashPassword(password, passwordSalt);
        }
        
        // ✅ Fetch full quiz data with questions before creating room
        console.log('🔍 Fetching quiz data for room creation:', quizId);
        const quizDoc = await getDoc(doc(this.db, 'quizzes', quizId));
        
        if (!quizDoc.exists()) {
          throw new Error(`Quiz not found: ${quizId}`);
        }
        
        const quizData = quizDoc.data();
        
        // Fetch questions subcollection
        console.log('🔍 Attempting to fetch questions from subcollection:', `quizzes/${quizId}/questions`);
        const questionsQuery = query(
          collection(this.db, 'quizzes', quizId, 'questions')
        );
        
        let questions: QuizQuestion[] = [];
        let questionsSource = 'none';
        
        try {
          const questionsSnapshot = await getDocs(questionsQuery);
          console.log('📊 Questions snapshot result:', {
            size: questionsSnapshot.size,
            empty: questionsSnapshot.empty,
            docs: questionsSnapshot.docs.length
          });
          
          if (questionsSnapshot.size > 0) {
            questionsSource = 'subcollection';
            questionsSnapshot.forEach(qDoc => {
              const qData = qDoc.data();
              console.log('📄 Question doc:', { id: qDoc.id, hasData: !!qData });
              questions.push({
                id: qDoc.id,
                question: qData.question,
                options: qData.options,
                correctAnswer: qData.correctAnswer,
                timeLimit: qData.timeLimit || 30,
                points: qData.points || 100
              });
            });
          }
        } catch (error) {
          console.error('❌ Error fetching questions subcollection:', error);
        }
        
        // Try alternative: check if questions are stored in quiz document itself
        if (questions.length === 0 && quizData.questions && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
          console.log('✅ Found questions in quiz document directly (legacy format)');
          questionsSource = 'document';
          questions = quizData.questions.map((q: any, idx: number) => ({
            id: q.id || `q${idx}`,
            question: q.question || q.text || q.title,
            options: q.options || q.answers?.map((a: any) => a.text) || [],
            correctAnswer: q.correctAnswer ?? q.answers?.findIndex((a: any) => a.isCorrect) ?? 0,
            timeLimit: q.timeLimit || 30,
            points: q.points || 100
          }));
        }
        
        console.log('✅ Fetched quiz with questions:', {
          quizId,
          title: quizData.title,
          questionsCount: questions.length,
          source: questionsSource
        });
        
        if (questions.length === 0) {
          throw new Error('Quiz has no questions. Cannot create room with empty quiz. Please ensure the quiz has questions before creating a multiplayer room.');
        }
        
        const quizForRoom: ModernQuiz = {
          id: quizId,
          title: quizData.title,
          description: this.stripHtml(quizData.description),
          category: quizData.category || 'General',
          difficulty: quizData.difficulty || 'Medium',
          questionCount: questions.length,
          timeLimit: quizData.timeLimit || 30,
          thumbnail: quizData.thumbnail,
          questions,
          password: null,
          isPrivate: false
        };
        
        const roomData: ModernRoom = {
          id: '', // Will be set by Firestore
          code: roomCode,
          name: roomName,
          quizId: quizId,
          quiz: quizForRoom, // ✅ Now populated with real data
          hostId: this.userId,
          ownerId: this.userId, // ✅ NEW: Permanent owner - never changes
          maxPlayers: maxPlayers,
          isPrivate: isPrivate,
          password: hashedPassword,
          passwordSalt: passwordSalt,
          passwordVersion: password ? 1 : undefined,
          status: 'waiting',
          settings: {
            timePerQuestion: 30,
            showLeaderboard: true,
            allowLateJoin: true
          },
          createdAt: serverTimestamp() as Timestamp
        };

        // Create room document
        const roomRef = doc(collection(this.db, 'multiplayer_rooms'));
        await setDoc(roomRef, this.removeUndefined(roomData));
        
        this.roomId = roomRef.id;

        // Set up real-time listeners
        this.setupListeners(roomRef.id);

        // Add host as first player in BOTH Firestore AND RTDB
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const playerData = {
            id: user.uid,
            name: user.displayName || 'Player',
            avatar: user.photoURL,
            photoURL: user.photoURL,
            score: 0,
            isReady: false,
            isOnline: true,
            role: 'host' as PlayerRole, // Host starts with host role
            isParticipating: true, // Host starts as participating (playing)
            joinedAt: Date.now(),
            lastActive: Date.now(),
            answers: []
          };
          
          // ✅ CRITICAL: Initialize RTDB room structure with hostId FIRST
          // This must be done BEFORE adding players to satisfy Firebase rules
          // Rules require hostId to exist for permission checks
          const rtdbRoomRef = ref(this.rtdb, `rooms/${roomRef.id}`);
          await set(rtdbRoomRef, {
            id: roomRef.id,
            code: roomCode,
            ownerId: user.uid, // ✅ Owner = creator of the room (permanent)
            hostId: user.uid, // ✅ Host = current controller (can change)
            status: 'waiting',
            createdAt: Date.now()
          });
          
          // ✅ OPTIMIZED: Players are ONLY in RTDB (no Firestore subcollection)
          // This saves ~100 writes per game (1 per player join)
          // Final results will be saved to match_histories when game ends
          const playerRef = ref(this.rtdb, `rooms/${roomRef.id}/players/${user.uid}`);
          await set(playerRef, playerData);
          
          // Set up presence tracking
          const presenceRef = ref(this.rtdb, `rooms/${roomRef.id}/presence/${user.uid}`);
          await set(presenceRef, {
            isOnline: true,
            lastSeen: Date.now(),
            username: user.displayName || 'Player'
          });
          
          // Set up onDisconnect handlers to mark player as offline (NOT remove)
          // This allows players to reconnect after page reload
          const presenceDisconnectRef = onDisconnect(presenceRef);
          const playerDisconnectRef = onDisconnect(playerRef);
          
          // ✅ FIX: Mark as offline instead of removing - allows reconnection
          await presenceDisconnectRef.update({
            isOnline: false,
            lastSeen: Date.now()
          });
          await playerDisconnectRef.update({
            isOnline: false,
            lastActive: Date.now()
          });
        }
        
        logger.success('Room created', { roomId: this.roomId, code: roomCode, roomName, maxPlayers });
        return { roomId: this.roomId, roomCode };
      } catch (error) {
        logger.error('Failed to create room', error, { roomName, maxPlayers });
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Join room
  async joinRoom(roomCodeOrId: string, password?: string): Promise<{ roomId: string; roomCode: string }> {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();

        // Rate limiting
        if (!rateLimiter.canPerform(this.userId, 'joinRoom')) {
          throw new RateLimitError('join room', 60);
        }

        // Determine if input is roomCode (6 chars) or roomId (long string)
        let roomDoc: any;
        let roomData: ModernRoom;
        
        if (roomCodeOrId.length === 6) {
          // Short code - search by code field
          console.log('🔍 Searching room by code:', roomCodeOrId);
          const roomsQuery = query(
            collection(this.db, 'multiplayer_rooms'),
            where('code', '==', roomCodeOrId),
            limit(1)
          );
          
          const snapshot = await getDocs(roomsQuery);
          if (snapshot.empty) {
            throw new RoomNotFoundError(roomCodeOrId);
          }
          
          roomDoc = snapshot.docs[0];
          roomData = roomDoc.data() as ModernRoom;
        } else {
          // Long ID - direct document lookup
          console.log('🔍 Looking up room by ID:', roomCodeOrId);
          const roomDocRef = doc(this.db, 'multiplayer_rooms', roomCodeOrId);
          const roomSnapshot = await getDoc(roomDocRef);
          
          if (!roomSnapshot.exists()) {
            throw new RoomNotFoundError(roomCodeOrId);
          }
          
          roomDoc = roomSnapshot;
          roomData = roomSnapshot.data() as ModernRoom;
        }
        
        // Check password if room is private
        if (roomData.isPrivate && !password) {
          throw new PasswordError();
        }
        
        if (roomData.isPrivate && password) {
          const isValidPassword = this.verifyPassword(
            password, 
            roomData.password || '', 
            roomData.passwordSalt, 
            roomData.passwordVersion
          );
          
          if (!isValidPassword) {
            throw new PasswordError();
          }
        }
        
        // Check if room is joinable
        if (roomData.status === 'playing' && !roomData.settings.allowLateJoin) {
          throw new GameInProgressError();
        }
        
        // Check player limit
        const playersRef = ref(this.rtdb, `rooms/${roomDoc.id}/players`);
        const playersSnapshot = await get(playersRef);
        const players = playersSnapshot.val() || {};
        const playerCount = Object.keys(players).length;
        
        if (playerCount >= roomData.maxPlayers) {
          throw new RoomFullError();
        }
        
        this.roomId = roomDoc.id;
        const actualRoomCode = roomData.code;
        
        // ✅ OPTIMIZATION: Skip Firestore player writes during lobby
        // Players will only be synced to Firestore when game ends (for history)
        // This saves Firestore writes/costs during the lobby phase
        const auth = getAuth();
        console.log('⚡ Skipping Firestore player write - using RTDB only during lobby');
        
        // ✅ Setup RTDB and listeners
        await this.setupRealtimeRoom(roomDoc.id, actualRoomCode);
        
        // ✅ Add player to RTDB for real-time presence
        await this.addPlayerToRTDB({
          id: this.userId,
          name: auth.currentUser?.displayName || 'Player',
          avatar: auth.currentUser?.photoURL || undefined,
          photoURL: auth.currentUser?.photoURL || undefined, // ✅ Add photoURL for avatar display
          score: 0,
          isReady: false,
          isOnline: true,
          role: 'player' as PlayerRole, // Regular players start as player role
          joinedAt: Date.now(),
          lastActive: Date.now(),
          answers: []
        });
        console.log('✅ Player added to RTDB');
        
        console.log('✅ Joined room:', { roomId: this.roomId, code: actualRoomCode });
        return { roomId: this.roomId, roomCode: actualRoomCode };
      } catch (error) {
        console.error('❌ Failed to join room:', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  /**
   * Quick rejoin for page reload - optimized for speed
   * Checks if player is already in room and just sets up listeners
   * Falls back to full joinRoom if not in room
   */
  async quickRejoin(roomCodeOrId: string): Promise<{ roomId: string; roomCode: string }> {
    try {
      this.ensureAuthenticated();
      
      console.log('⚡ Quick rejoin attempt:', roomCodeOrId);
      
      // Determine roomId from code or direct ID
      let targetRoomId: string;
      let roomCode: string;
      
      if (roomCodeOrId.length === 6) {
        // Check cache first
        const cachedRoomId = sessionStorage.getItem(`room_${roomCodeOrId}`);
        if (cachedRoomId) {
          targetRoomId = cachedRoomId;
          roomCode = roomCodeOrId;
          console.log('⚡ Using cached roomId:', targetRoomId);
        } else {
          // Search by code
          const roomsQuery = query(
            collection(this.db, 'multiplayer_rooms'),
            where('code', '==', roomCodeOrId),
            limit(1)
          );
          const snapshot = await getDocs(roomsQuery);
          if (snapshot.empty) {
            throw new RoomNotFoundError(roomCodeOrId);
          }
          targetRoomId = snapshot.docs[0].id;
          roomCode = roomCodeOrId;
          // Cache for future use
          sessionStorage.setItem(`room_${roomCodeOrId}`, targetRoomId);
        }
        // ✅ Also store reverse mapping for cleanup when leaving
        sessionStorage.setItem(`roomCode_${targetRoomId}`, roomCode);
      } else {
        targetRoomId = roomCodeOrId;
        // Get room code from RTDB or Firestore
        const rtdbRoomRef = ref(this.rtdb, `rooms/${roomCodeOrId}`);
        const rtdbSnapshot = await get(rtdbRoomRef);
        const rtdbData = rtdbSnapshot.val();
        roomCode = rtdbData?.code || roomCodeOrId.substring(0, 6);
      }
      
      // Check if player already exists in RTDB (fastest check)
      const playerRef = ref(this.rtdb, `rooms/${targetRoomId}/players/${this.userId}`);
      const playerSnapshot = await get(playerRef);
      
      if (playerSnapshot.exists()) {
        // Player already in room - just update online status and setup listeners
        console.log('⚡ Player already in room, quick reconnect!');
        
        this.roomId = targetRoomId;
        
        // Update online status
        await update(playerRef, {
          isOnline: true,
          lastActive: Date.now()
        });
        
        // Setup listeners
        this.setupListeners(targetRoomId);
        
        // Setup presence tracking
        const presenceRef = ref(this.rtdb, `rooms/${targetRoomId}/presence/${this.userId}`);
        await set(presenceRef, {
          isOnline: true,
          lastSeen: Date.now(),
          username: getAuth().currentUser?.displayName || 'Player'
        });
        
        // Setup onDisconnect
        const presenceDisconnectRef = onDisconnect(presenceRef);
        const playerDisconnectRef = onDisconnect(playerRef);
        await presenceDisconnectRef.update({
          isOnline: false,
          lastSeen: Date.now()
        });
        await playerDisconnectRef.update({
          isOnline: false,
          lastActive: Date.now()
        });
        
        console.log('⚡ Quick rejoin successful!');
        return { roomId: targetRoomId, roomCode };
      }
      
      // Player not in room - do full join
      console.log('⚡ Player not in room, doing full join...');
      return this.joinRoom(roomCodeOrId);
      
    } catch (error) {
      console.error('❌ Quick rejoin failed, falling back to full join:', error);
      // Fallback to regular join
      return this.joinRoom(roomCodeOrId);
    }
  }

  // Setup RTDB room for real-time sync
  private async setupRealtimeRoom(roomId: string, roomCode: string) {
    const roomRef = ref(this.rtdb, `rooms/${roomId}`);
    
    // ✅ Check if room already exists in RTDB
    const existingRoomSnapshot = await get(roomRef);
    const existingRoom = existingRoomSnapshot.val();
    
    if (existingRoom) {
      // Room already exists, just setup listeners (DON'T overwrite!)
      console.log('✅ Room already exists in RTDB, setting up listeners only:', {
        roomId,
        existingPlayerCount: existingRoom.players ? Object.keys(existingRoom.players).length : 0
      });
      this.setupListeners(roomId);
      return;
    }
    
    // ✅ Fetch room data from Firestore to get quiz info
    const roomDoc = await getDoc(doc(this.db, 'multiplayer_rooms', roomId));
    const roomData = roomDoc.exists() ? roomDoc.data() : null;
    
    // Initialize room structure in RTDB with quiz data (ONLY if room doesn't exist)
    await set(roomRef, {
      id: roomId,
      code: roomCode,
      hostId: roomData?.hostId || this.userId, // ✅ CRITICAL: Include hostId for host detection
      status: 'waiting',
      players: {},
      quiz: roomData?.quiz ? {
        id: roomData.quiz.id,
        title: roomData.quiz.title,
        questionCount: roomData.quiz.questions?.length || 0
      } : null,
      gameState: {
        status: 'waiting',
        currentQuestion: -1,
        timeLeft: 0,
        questionStartTime: 0
      },
      createdAt: serverTimestamp()
    });
    
    console.log('✅ RTDB room initialized with quiz:', {
      roomId,
      quizTitle: roomData?.quiz?.title,
      questionCount: roomData?.quiz?.questions?.length
    });
    
    // Setup listeners
    this.setupListeners(roomId);
  }

  // Setup real-time listeners
  private setupListeners(roomId: string) {
    // Clean up existing listeners first
    this.cleanupListeners();
    
    // ✅ Firestore room listener for quiz data and status
    const roomDocRef = doc(this.db, 'multiplayer_rooms', roomId);
    const unsubscribeFirestoreRoom = onSnapshot(
      roomDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const roomData = docSnapshot.data() as ModernRoom;
          console.log('📡 Room data updated from Firestore:', {
            roomId,
            status: roomData.status,
            hasQuiz: !!roomData.quiz,
            questionCount: roomData.quiz?.questions?.length
          });
          this.emit('room:updated', { ...roomData, id: docSnapshot.id });
        } else {
          console.error('❌ Room document does not exist:', roomId);
          this.emit('error', new RoomNotFoundError(roomId));
        }
      },
      (error) => {
        console.error('Firestore room listener error:', error);
        this.emit('error', error);
      }
    );
    
    this.listeners[`firestoreRoom_${roomId}`] = unsubscribeFirestoreRoom;
    
    // Players listener (RTDB for real-time presence)
    const playersRef = ref(this.rtdb, `rooms/${roomId}/players`);
    const unsubscribePlayers = onValue(
      playersRef, 
      (snapshot) => {
        const players = snapshot.val() || {};
        const playerCount = Object.keys(players).length;
        console.log('👥 Players updated in RTDB:', {
          roomId,
          playerCount,
          playerIds: Object.keys(players),
          players
        });
        this.emit('players:updated', players);
      },
      (error) => {
        console.error('Players listener error:', error);
        this.emit('error', error);
      }
    );
    
    this.listeners[`players_${roomId}`] = unsubscribePlayers;
    
    // ✅ HOST MANAGEMENT LISTENER: Handle host migration and owner reclaim
    // Logic:
    // 1. Owner (creator) is PERMANENT - stored in ownerId
    // 2. Host (current controller) can change - stored in hostId
    // 3. When host goes offline → migrate to next online player
    // 4. When owner comes back online:
    //    - If ownerTransferredHost=true → owner DOES NOT reclaim (they gave it away voluntarily)
    //    - If ownerTransferredHost=false → owner RECLAIMS host (they lost it due to disconnect)
    let hostMigrationTimeout: NodeJS.Timeout | null = null;
    let lastKnownHostId: string | null = null;
    
    const roomDataRef = ref(this.rtdb, `rooms/${roomId}`);
    const unsubscribeHostMigration = onValue(
      roomDataRef,
      async (snapshot) => {
        try {
          const roomData = snapshot.val();
          if (!roomData || !roomData.players) return;
          
          const currentHostId = roomData.hostId;
          const ownerId = roomData.ownerId || currentHostId; // Fallback for old rooms
          const players = roomData.players;
          
          // Track host changes
          if (lastKnownHostId !== currentHostId) {
            console.log('🔄 Host changed:', { from: lastKnownHostId, to: currentHostId, owner: ownerId });
            lastKnownHostId = currentHostId;
            // Clear any pending migration when host changes
            if (hostMigrationTimeout) {
              clearTimeout(hostMigrationTimeout);
              hostMigrationTimeout = null;
            }
          }
          
          const hostPlayer = players[currentHostId];
          const ownerPlayer = players[ownerId];
          const hostIsOnline = hostPlayer && hostPlayer.isOnline === true;
          const ownerIsOnline = ownerPlayer && ownerPlayer.isOnline === true;
          const ownerVoluntarilyTransferred = roomData.ownerTransferredHost === true;
          
          // ✅ CASE 1: Owner is back online but not host
          // Only reclaim if owner lost host due to disconnect (NOT voluntary transfer)
          if (ownerIsOnline && currentHostId !== ownerId && this.userId === ownerId && !ownerVoluntarilyTransferred) {
            console.log('👑 Owner is back online and lost host due to disconnect! Reclaiming...');
            
            // Cancel any pending migration
            if (hostMigrationTimeout) {
              clearTimeout(hostMigrationTimeout);
              hostMigrationTimeout = null;
            }
            
            // Owner reclaims host (no delay needed)
            const rtdbRoomRef = ref(this.rtdb, `rooms/${roomId}`);
            await update(rtdbRoomRef, { hostId: ownerId });
            
            // Update owner's role
            const ownerPlayerRef = ref(this.rtdb, `rooms/${roomId}/players/${ownerId}`);
            await update(ownerPlayerRef, {
              role: 'host' as PlayerRole,
              isParticipating: true
            });
            
            // Update previous host's role to player
            if (currentHostId !== ownerId) {
              const prevHostRef = ref(this.rtdb, `rooms/${roomId}/players/${currentHostId}`);
              await update(prevHostRef, { role: 'player' as PlayerRole }).catch(() => {});
            }
            
            // Send system message
            const chatMessagesRef = ref(this.rtdb, `rooms/${roomId}/chat/messages`);
            push(chatMessagesRef, {
              type: 'system',
              content: `${ownerPlayer?.name || 'Owner'} đã quay lại và là host.`,
              timestamp: Date.now(),
              senderId: 'system',
              senderName: 'System'
            }).catch(err => console.warn('⚠️ Chat message failed:', err));
            
            // Sync to Firestore
            const firestoreRoomRef = doc(this.db, 'multiplayer_rooms', roomId);
            updateDoc(firestoreRoomRef, {
              hostId: ownerId,
              lastUpdated: new Date()
            }).catch(err => console.warn('⚠️ Firestore sync failed:', err));
            
            console.log('✅ Owner reclaimed host successfully!');
            this.emit('host:migrated', { newHostId: ownerId, reason: 'owner_reclaimed' });
            return;
          }
          
          // ✅ CASE 2: Host is online → nothing to do
          if (hostIsOnline) {
            if (hostMigrationTimeout) {
              console.log('✅ Host is back online, cancelling migration');
              clearTimeout(hostMigrationTimeout);
              hostMigrationTimeout = null;
            }
            return;
          }
          
          // ✅ CASE 3: Host is offline → migrate to another player (with delay)
          if (!hostMigrationTimeout) {
            console.log('⚠️ Host appears offline, waiting 3s before migration...');
            
            hostMigrationTimeout = setTimeout(async () => {
              // Re-check status after delay
              const freshSnapshot = await get(roomDataRef);
              const freshRoomData = freshSnapshot.val();
              if (!freshRoomData || !freshRoomData.players) {
                hostMigrationTimeout = null;
                return;
              }
              
              const freshOwnerId = freshRoomData.ownerId || freshRoomData.hostId;
              const freshOwnerPlayer = freshRoomData.players[freshOwnerId];
              const freshHostPlayer = freshRoomData.players[freshRoomData.hostId];
              
              // If owner came back during grace period, let owner reclaim (handled above)
              if (freshOwnerPlayer?.isOnline && freshRoomData.hostId !== freshOwnerId) {
                console.log('✅ Owner reconnected during grace period');
                hostMigrationTimeout = null;
                return;
              }
              
              // If host came back, no migration needed
              if (freshHostPlayer?.isOnline) {
                console.log('✅ Host reconnected during grace period');
                hostMigrationTimeout = null;
                return;
              }
              
              // --- HOST IS TRULY GONE, NEED TO ELECT NEW HOST ---
              console.log('🚨 Host confirmed offline, starting migration...');
              
              // Find all online players, sorted by joinedAt (oldest first)
              const onlinePlayers = Object.entries(freshRoomData.players)
                .filter(([_, playerData]: [string, any]) => playerData?.isOnline === true)
                .map(([playerId, playerData]: [string, any]) => ({
                  id: playerId,
                  joinedAt: playerData?.joinedAt || Date.now(),
                  name: playerData?.name
                }))
                .sort((a, b) => a.joinedAt - b.joinedAt);
              
              if (onlinePlayers.length === 0) {
                console.log('⚠️ No online players left');
                hostMigrationTimeout = null;
                return;
              }
              
              const newHostCandidate = onlinePlayers[0];
              
              // Only the elected player sends the update
              if (newHostCandidate.id === this.userId) {
                console.log('👑 I am the new host candidate! Taking over...');
                
                try {
                  // Direct update instead of transaction (rules now allow this)
                  const rtdbRoomRef = ref(this.rtdb, `rooms/${roomId}`);
                  
                  // ✅ If owner lost host due to disconnect, reset flag so they can reclaim when back
                  const updateData: Record<string, any> = { hostId: this.userId };
                  if (freshRoomData.hostId === freshOwnerId) {
                    // Owner was host and went offline → reset flag so they can reclaim
                    updateData.ownerTransferredHost = false;
                    console.log('📌 Owner lost host due to disconnect - they can reclaim when back');
                  }
                  
                  await update(rtdbRoomRef, updateData);
                  
                  // Update my role
                  const myPlayerRef = ref(this.rtdb, `rooms/${roomId}/players/${this.userId}`);
                  await update(myPlayerRef, {
                    role: 'host' as PlayerRole,
                    isParticipating: true
                  });
                  
                  // Send system message
                  const chatMessagesRef = ref(this.rtdb, `rooms/${roomId}/chat/messages`);
                  push(chatMessagesRef, {
                    type: 'system',
                    content: i18next.t('multiplayer:isNowTheHost', { name: newHostCandidate.name || 'Player' }),
                    timestamp: Date.now(),
                    senderId: 'system',
                    senderName: 'System'
                  }).catch(err => console.warn('⚠️ Chat message failed:', err));
                  
                  // Sync to Firestore
                  const firestoreRoomRef = doc(this.db, 'multiplayer_rooms', roomId);
                  updateDoc(firestoreRoomRef, {
                    hostId: this.userId,
                    lastUpdated: new Date()
                  }).catch(err => console.warn('⚠️ Firestore sync failed:', err));
                  
                  console.log('✅ Host migration complete!');
                  this.emit('host:migrated', { newHostId: this.userId, reason: 'host_offline' });
                } catch (err) {
                  console.error('❌ Failed to migrate host:', err);
                }
              } else {
                console.log(`👀 Waiting for ${newHostCandidate.name} to become host...`);
              }
              
              hostMigrationTimeout = null;
            }, 3000);
          }
        } catch (error) {
          console.error('❌ Host management error:', error);
        }
      },
      (error) => {
        console.error('Host migration listener error:', error);
      }
    );
    
    this.listeners[`hostMigration_${roomId}`] = unsubscribeHostMigration;
    
    // Game state listener (RTDB for real-time game updates)
    const gameStateRef = ref(this.rtdb, `rooms/${roomId}/gameState`);
    const unsubscribeGameState = onValue(
      gameStateRef, 
      (snapshot) => {
        const gameState = snapshot.val();
        this.emit('game:updated', gameState);
      },
      (error) => {
        console.error('Game state listener error:', error);
        this.emit('error', error);
      }
    );
    
    this.listeners[`gameState_${roomId}`] = unsubscribeGameState;
    
    // Shared screen listener (RTDB for real-time screen sharing)
    const sharedScreenRef = ref(this.rtdb, `rooms/${roomId}/sharedScreen`);
    const unsubscribeSharedScreen = onValue(
      sharedScreenRef,
      (snapshot) => {
        const sharedScreenData = snapshot.val() || { type: 'empty' };
        console.log('📺 Shared screen updated:', sharedScreenData);
        this.emit('sharedScreen:updated', sharedScreenData);
      },
      (error) => {
        console.error('Shared screen listener error:', error);
        this.emit('error', error);
      }
    );
    
    this.listeners[`sharedScreen_${roomId}`] = unsubscribeSharedScreen;
  }

  // Enhanced cleanup method
  private cleanupListeners(): void {
    Object.entries(this.listeners).forEach(([key, unsubscribe]) => {
      try {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      } catch (error) {
        console.error(`Error cleaning up listener ${key}:`, error);
      }
    });
    this.listeners = {};
  }

  // Add player to room (both Firestore and RTDB)
  // private async addPlayerToRoom(player: ModernPlayer) {
  //   // ✅ Add to Firestore players subcollection first (required for permission check)
  //   const firestorePlayerRef = doc(this.db, 'multiplayer_rooms', this.roomId, 'players', player.id);
  //   await setDoc(firestorePlayerRef, {
  //     name: player.name,
  //     score: player.score,
  //     isReady: player.isReady,
  //     createdAt: serverTimestamp(),
  //     updatedAt: serverTimestamp()
  //   });
  //   
  //   // Add to RTDB
  //   await this.addPlayerToRTDB(player);
  // }

  // Add player to RTDB only (for cases where Firestore player already exists)
  private async addPlayerToRTDB(player: ModernPlayer) {
    // Remove undefined values to avoid Firebase RTDB errors
    const cleanPlayer = this.removeUndefined(player);
    const playerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${player.id}`);
    console.log('➕ Adding player to RTDB:', {
      roomId: this.roomId,
      playerId: player.id,
      playerName: player.name,
      path: `rooms/${this.roomId}/players/${player.id}`
    });
    await set(playerRef, cleanPlayer);
    console.log('✅ Player added to RTDB successfully');
    
    // ✅ Clear lastEmptyAt when player joins - reset cleanup countdown
    const lastEmptyAtRef = ref(this.rtdb, `rooms/${this.roomId}/lastEmptyAt`);
    await remove(lastEmptyAtRef);
    console.log('✅ Cleared lastEmptyAt - room is now active');
    
    // Setup presence tracking
    const presenceRef = ref(this.rtdb, `rooms/${this.roomId}/presence/${player.id}`);
    await set(presenceRef, {
      isOnline: true,
      lastSeen: Date.now(),
      username: player.name
    });
    
    // Set up onDisconnect handlers to mark player as offline (NOT remove)
    // This allows players to reconnect after page reload
    this.presenceDisconnectRef = onDisconnect(presenceRef);
    this.playerDisconnectRef = onDisconnect(playerRef);
    
    // ✅ FIX: Mark as offline instead of removing - allows reconnection
    await this.presenceDisconnectRef.update({
      isOnline: false,
      lastSeen: Date.now()
    });
    await this.playerDisconnectRef.update({
      isOnline: false,
      lastActive: Date.now()
    });
    
    console.log('✅ Set up onDisconnect handlers for presence tracking (mark offline, not remove)');
  }

  // Update shared screen (host only)
  async updateSharedScreen(data: SharedScreenData): Promise<void> {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) {
          throw new RoomNotFoundError('No active room');
        }
        
        // Rate limiting
        if (!rateLimiter.canPerform(this.userId, 'updateSharedScreen')) {
          throw new RateLimitError('update shared screen', 10);
        }
        
        // Validate URL if provided
        if (data.type === 'webpage' && data.url) {
          if (!this.isUrlSafe(data.url)) {
            throw new ValidationError('url', 'URL not allowed. Only YouTube, Vimeo, and Google Drive links are supported.');
          }
        }
        
        if (data.type === 'youtube' && data.url) {
          if (!this.isUrlSafe(data.url)) {
            throw new ValidationError('url', 'Invalid YouTube URL');
          }
        }
        
        // Add metadata
        const screenData: SharedScreenData = {
          ...data,
          updatedAt: Date.now(),
          updatedBy: this.userId
        };
        
        // Update RTDB
        const sharedScreenRef = ref(this.rtdb, `rooms/${this.roomId}/sharedScreen`);
        await set(sharedScreenRef, this.removeUndefined(screenData));
        
        logger.success('Shared screen updated', { type: data.type });
        this.emit('sharedScreen:updated', screenData);
      } catch (error) {
        logger.error('Failed to update shared screen', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Update player ready status
  async toggleReady() {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();

        // Rate limiting
        if (!rateLimiter.canPerform(this.userId, 'toggleReady')) {
          throw new RateLimitError('toggle ready', 30);
        }
        
        const playerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}/isReady`);
        const snapshot = await get(playerRef);
        const currentStatus = snapshot.val() || false;
        
        await set(playerRef, !currentStatus);
        
        // Update last active
        await update(ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}`), {
          lastActive: Date.now()
        });
        
        logger.info('Ready status updated', { isReady: !currentStatus });
      } catch (error) {
        logger.error('Failed to update ready status', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Start game
  async startGame() {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        const gameStateRef = ref(this.rtdb, `rooms/${this.roomId}/gameState`);
        await set(gameStateRef, {
          status: 'playing',
          currentQuestion: 0,
          timeLeft: 30,
          questionStartTime: Date.now()
        });
        
        logger.info('Game started', { roomId: this.roomId });
      } catch (error) {
        logger.error('Failed to start game', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Request pause (any player can request)
  async requestPause(reason?: string): Promise<void> {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) {
          throw new RoomNotFoundError('No active room');
        }
        
        // Get player info
        const playerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}`);
        const playerSnapshot = await get(playerRef);
        const playerData = playerSnapshot.val() as ModernPlayer;
        
        if (!playerData) {
          throw new Error('Player not found');
        }
        
        // Only active players can request pause (not spectators)
        if (playerData.role === 'spectator') {
          throw new UnauthorizedError('pause');
        }
        
        // Add pause request
        const pauseRequestRef = ref(this.rtdb, `rooms/${this.roomId}/gameState/pauseRequests/${this.userId}`);
        await set(pauseRequestRef, {
          playerId: this.userId,
          playerName: playerData.name,
          requestedAt: Date.now(),
          reason: reason || 'Player requested pause'
        });
        
        logger.info('Pause requested by player', { playerId: this.userId, playerName: playerData.name });
        this.emit('game:pauseRequested', { playerId: this.userId, playerName: playerData.name });
      } catch (error) {
        logger.error('Failed to request pause', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Cancel pause request
  async cancelPauseRequest(): Promise<void> {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) {
          throw new RoomNotFoundError('No active room');
        }
        
        const pauseRequestRef = ref(this.rtdb, `rooms/${this.roomId}/gameState/pauseRequests/${this.userId}`);
        await remove(pauseRequestRef);
        
        logger.info('Pause request cancelled', { playerId: this.userId });
      } catch (error) {
        logger.error('Failed to cancel pause request', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Submit answer
  async submitAnswer(questionId: string, answer: number, timeSpent: number): Promise<boolean> {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();

        // Rate limiting
        if (!rateLimiter.canPerform(this.userId, 'submitAnswer')) {
          throw new RateLimitError('submit answer', 60);
        }
        
        // Check if player is allowed to submit (not spectator)
        const playerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}`);
        const playerSnapshot = await get(playerRef);
        const playerData = playerSnapshot.val() as ModernPlayer;
        
        if (!playerData) {
          throw new Error('Player not found');
        }
        
        if (playerData.role === 'spectator') {
          throw new UnauthorizedError('submit answer as spectator');
        }
        
        // Get question data to check if answer is correct
        const roomRef = doc(this.db, 'multiplayer_rooms', this.roomId);
        const roomSnapshot = await getDoc(roomRef);
        const roomData = roomSnapshot.data() as ModernRoom;
        
        const question = roomData.quiz.questions.find(q => q.id === questionId);
        if (!question) {
          throw new QuestionNotFoundError(questionId);
        }
        
        const isCorrect = answer === question.correctAnswer;
        const points = isCorrect ? (question.points || 100) : 0;
        
        // Update player's answer in RTDB
        const playerAnswerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}/answers/${questionId}`);
        await set(playerAnswerRef, {
          questionId,
          answer,
          timeSpent,
          isCorrect,
          points,
          submittedAt: Date.now()
        });
        
        // Use transaction for score to prevent race conditions
        if (points > 0) {
          const playerScoreRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}/score`);
          
          await runTransaction(playerScoreRef, (currentScore) => {
            return (currentScore || 0) + points;
          });
        }
        
        // Update last active
        await update(ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}`), {
          lastActive: Date.now()
        });
        
        logger.info('Answer submitted', { questionId, isCorrect, points, timeSpent });
        return isCorrect;
      } catch (error) {
        logger.error('Failed to submit answer', error, { questionId, answer });
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.critical);
  }

  // Move to next question (host only)
  async nextQuestion(): Promise<void> {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) {
          throw new RoomNotFoundError('No active room');
        }
        
        // Get current game state
        const gameStateRef = ref(this.rtdb, `rooms/${this.roomId}/gameState`);
        const gameStateSnapshot = await get(gameStateRef);
        const currentGameState = gameStateSnapshot.val();
        
        if (!currentGameState || currentGameState.status !== 'playing') {
          throw new Error('Game is not in playing state');
        }
        
        // Get room data to check question count
        const roomRef = doc(this.db, 'multiplayer_rooms', this.roomId);
        const roomSnapshot = await getDoc(roomRef);
        const roomData = roomSnapshot.data() as ModernRoom;
        
        const totalQuestions = roomData.quiz?.questions?.length || 0;
        const nextQuestionIndex = (currentGameState.currentQuestion || 0) + 1;
        
        if (nextQuestionIndex >= totalQuestions) {
          // No more questions, end game
          await this.endGame();
          return;
        }
        
        // Update to next question
        await update(gameStateRef, {
          currentQuestion: nextQuestionIndex,
          questionStartTime: Date.now(),
          timeLeft: roomData.settings?.timePerQuestion || 30
        });
        
        logger.info('Moved to next question', { nextQuestionIndex, totalQuestions });
        this.emit('game:nextQuestion', { questionIndex: nextQuestionIndex });
      } catch (error) {
        logger.error('Failed to move to next question', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Pause game (host only)
  async pauseGame(pausedBy?: string, reason?: string): Promise<void> {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) {
          throw new RoomNotFoundError('No active room');
        }
        
        const gameStateRef = ref(this.rtdb, `rooms/${this.roomId}/gameState`);
        const updates: any = {
          status: 'paused',
          pausedAt: Date.now(),
          pausedBy: pausedBy || this.userId,
          pauseReason: reason || 'Host paused the game'
        };
        
        await update(gameStateRef, updates);
        
        // Clear all pause requests after pausing
        const pauseRequestsRef = ref(this.rtdb, `rooms/${this.roomId}/gameState/pauseRequests`);
        await remove(pauseRequestsRef);
        
        logger.info('Game paused', { pausedBy, reason });
        this.emit('game:paused', { pausedBy, reason });
      } catch (error) {
        logger.error('Failed to pause game', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Resume game (host only)
  async resumeGame(): Promise<void> {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) {
          throw new RoomNotFoundError('No active room');
        }
        
        const gameStateRef = ref(this.rtdb, `rooms/${this.roomId}/gameState`);
        const gameStateSnapshot = await get(gameStateRef);
        const currentGameState = gameStateSnapshot.val();
        
        if (currentGameState?.pausedAt) {
          const pauseDuration = Date.now() - currentGameState.pausedAt;
          const adjustedStartTime = (currentGameState.questionStartTime || Date.now()) + pauseDuration;
          
          await update(gameStateRef, {
            status: 'playing',
            questionStartTime: adjustedStartTime,
            pausedAt: null
          });
        } else {
          await update(gameStateRef, {
            status: 'playing'
          });
        }
        
        logger.info('Game resumed');
        this.emit('game:resumed');
      } catch (error) {
        logger.error('Failed to resume game', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Get current player's role
  async getPlayerRole(): Promise<PlayerRole | null> {
    try {
      this.ensureAuthenticated();
      
      if (!this.roomId) {
        return null;
      }
      
      const playerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}`);
      const playerSnapshot = await get(playerRef);
      const playerData = playerSnapshot.val() as ModernPlayer;
      
      return playerData?.role || null;
    } catch (error) {
      logger.error('Failed to get player role', error);
      return null;
    }
  }

  // Check if current player can participate (not spectator)
  async canParticipate(): Promise<boolean> {
    const role = await this.getPlayerRole();
    return role !== 'spectator';
  }

  // Check if current player is host
  async isHost(): Promise<boolean> {
    const role = await this.getPlayerRole();
    return role === 'host';
  }

  // Change player role (host only)
  async changePlayerRole(playerId: string, newRole: PlayerRole): Promise<void> {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) {
          throw new RoomNotFoundError('No active room');
        }
        
        // Verify current user is host
        const isHost = await this.isHost();
        if (!isHost) {
          throw new UnauthorizedError('change player role');
        }
        
        // Cannot change host's own role
        if (playerId === this.userId) {
          throw new ValidationError('role', 'Cannot change your own role');
        }
        
        const playerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${playerId}`);
        await update(playerRef, {
          role: newRole,
          isParticipating: newRole !== 'spectator'
        });
        
        logger.info('Player role changed', { playerId, newRole });
        this.emit('player:roleChanged', { playerId, newRole });
      } catch (error) {
        logger.error('Failed to change player role', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // End game and calculate final results
  async endGame(): Promise<void> {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) {
          throw new RoomNotFoundError('No active room');
        }
        
        // Update game state to finished
        const gameStateRef = ref(this.rtdb, `rooms/${this.roomId}/gameState`);
        await update(gameStateRef, {
          status: 'finished',
          finishedAt: Date.now()
        });
        
        // Update Firestore room status
        const roomRef = doc(this.db, 'multiplayer_rooms', this.roomId);
        await updateDoc(roomRef, {
          status: 'finished',
          finishedAt: new Date()
        });
        
        // Get all players and their scores for leaderboard
        const playersRef = ref(this.rtdb, `rooms/${this.roomId}/players`);
        const playersSnapshot = await get(playersRef);
        const players = playersSnapshot.val() || {};
        
        // Calculate final leaderboard (only include players, not spectators)
        const leaderboard = Object.entries(players)
          .filter(([, playerData]: [string, any]) => playerData.role !== 'spectator')
          .map(([playerId, playerData]: [string, any]) => ({
            userId: playerId,
            name: playerData.name || 'Unknown',
            score: playerData.score || 0,
            correctAnswers: Object.values(playerData.answers || {}).filter((a: any) => a?.isCorrect).length,
            totalAnswers: Object.keys(playerData.answers || {}).length,
            photoURL: playerData.photoURL,
            role: playerData.role
          }))
          .sort((a, b) => b.score - a.score); // Sort by score descending
        
        // Save leaderboard to RTDB
        const leaderboardRef = ref(this.rtdb, `rooms/${this.roomId}/leaderboard`);
        await set(leaderboardRef, leaderboard);
        
        // ✅ OPTIMIZED: Save game history to match_histories collection (ONE document)
        // Instead of writing N documents to players subcollection, we write 1 document
        // This reduces Firestore writes by 90%+ for large games
        console.log('💾 Saving match history to Firestore...');
        
        // Get room data for history
        const rtdbRoomRef = ref(this.rtdb, `rooms/${this.roomId}`);
        const roomSnapshot = await get(rtdbRoomRef);
        const roomData = roomSnapshot.val() || {};
        
        // Get game data for history
        const gameRef = ref(this.rtdb, `games/${this.roomId}`);
        const gameSnapshot = await get(gameRef);
        const gameData = gameSnapshot.val() || {};
        
        // Build match history document (ONE write instead of N writes)
        const matchHistory = {
          roomId: this.roomId,
          roomCode: roomData.code || '',
          roomName: roomData.name || 'Unknown Room',
          hostId: roomData.hostId || this.userId,
          
          // Quiz info
          quizId: gameData.quizId || '',
          quizTitle: gameData.quizTitle || '',
          totalQuestions: gameData.totalQuestions || 0,
          
          // Game settings
          gameMode: gameData.settings?.gameMode || 'synced',
          timePerQuestion: gameData.settings?.timePerQuestion || 30,
          
          // Results - all players in one array
          leaderboard: leaderboard.map((entry, index) => ({
            rank: index + 1,
            oderId: entry.userId, // Use oderId for consistency with other parts of the app
            playerId: entry.userId, // Also include playerId for compatibility
            name: entry.name,
            score: entry.score,
            correctAnswers: entry.correctAnswers,
            totalAnswers: entry.totalAnswers,
            accuracy: entry.totalAnswers > 0 
              ? Math.round((entry.correctAnswers / entry.totalAnswers) * 100) 
              : 0,
            photoURL: entry.photoURL || null,
            role: entry.role || 'player'
          })),
          
          // Timestamps
          startedAt: gameData.startedAt || Date.now(),
          finishedAt: serverTimestamp(),
          duration: Date.now() - (gameData.startedAt || Date.now()),
          
          // Stats
          playerCount: leaderboard.length,
          winner: leaderboard[0] ? {
            playerId: leaderboard[0].userId,
            name: leaderboard[0].name,
            score: leaderboard[0].score
          } : null
        };
        
        // Write to match_histories collection (ONE document per game)
        const matchHistoryRef = doc(this.db, 'match_histories', this.roomId);
        await setDoc(matchHistoryRef, matchHistory);
        console.log('✅ Match history saved to Firestore (1 write)');
        
        // ✅ CLEANUP RTDB: Remove heavy game data (questions) to save storage
        // Keep leaderboard and players for viewing results
        console.log('🧹 Cleaning up RTDB game data...');
        if (gameSnapshot.exists()) {
          // Only remove questions array (heavy data), keep everything else for results display
          const questionsRef = ref(this.rtdb, `games/${this.roomId}/questions`);
          await remove(questionsRef);
          console.log('✅ RTDB questions cleaned up');
        }
        
        logger.success('Game ended', { 
          playerCount: leaderboard.length,
          winner: leaderboard[0]?.name
        });
        
        this.emit('game:ended', { leaderboard });
      } catch (error) {
        logger.error('Failed to end game', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Leave room
  async leaveRoom() {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) throw new RoomNotFoundError('current');
        
        console.log('👋 Leaving room:', { roomId: this.roomId, userId: this.userId });
        
        // Check if leaving player is host
        const roomRef = doc(this.db, 'multiplayer_rooms', this.roomId);
        const roomSnapshot = await getDoc(roomRef);
        const roomData = roomSnapshot.data() as ModernRoom;
        
        const isHost = roomData.hostId === this.userId;
        
        // If host is leaving, transfer host to another online player first
        if (isHost) {
          console.log('🔄 Host is leaving, transferring host privileges...');
          
          // Find all online players (exclude self)
          const playersRef = ref(this.rtdb, `rooms/${this.roomId}/players`);
          const playersSnapshot = await get(playersRef);
          const players = playersSnapshot.val() || {};
          
          // ✅ OPTIMIZED: Sort by joinedAt to find the "oldest" player (most senior)
          // This ensures fairness - whoever joined first becomes the new host
          const onlinePlayers = Object.entries(players)
            .filter(([playerId, playerData]: [string, any]) => 
              playerId !== this.userId && 
              playerData?.isOnline === true
            )
            .map(([playerId, playerData]: [string, any]) => ({
              id: playerId,
              joinedAt: playerData?.joinedAt || Date.now(),
              name: playerData?.name
            }))
            .sort((a, b) => a.joinedAt - b.joinedAt); // Sort by joinedAt ascending (oldest first)
          
          if (onlinePlayers.length > 0) {
            // Transfer to the player who joined earliest
            const newHost = onlinePlayers[0];
            const newHostId = newHost.id;
            const newHostData = players[newHostId];
            console.log('✅ Transferring host to:', { newHostId, name: newHost.name, joinedAt: newHost.joinedAt });
            
            // ✅ FIX: Update new host role FIRST while current user is still host
            // Current host has permission to update any player
            const newHostRef = ref(this.rtdb, `rooms/${this.roomId}/players/${newHostId}`);
            await update(newHostRef, {
              role: 'host' as PlayerRole,
              isParticipating: true
            });
            console.log('✅ Updated new host role in RTDB');
            
            // NOW update hostId - current user loses permission after this
            const rtdbRoomRef = ref(this.rtdb, `rooms/${this.roomId}`);
            await update(rtdbRoomRef, {
              hostId: newHostId
            });
            console.log('✅ Updated RTDB hostId');
            
            // Sync to Firestore (background, non-blocking)
            updateDoc(roomRef, {
              hostId: newHostId,
              lastUpdated: new Date()
            }).catch(err => console.warn('⚠️ Firestore sync failed:', err));
            
            // ✅ OPTIMIZED: Send system message via RTDB (not Firestore)
            const chatMessagesRef = ref(this.rtdb, `rooms/${this.roomId}/chat/messages`);
            push(chatMessagesRef, {
              type: 'system',
              content: i18next.t('multiplayer:hostLeft', { name: newHostData?.name || 'Player' }),
              timestamp: Date.now(),
              senderId: 'system',
              senderName: 'System'
            }).catch(err => console.warn('⚠️ RTDB message send failed:', err));
          } else {
            console.log('⚠️ No other players online, room will be empty');
          }
        }
        
        // ✅ FIX: Clean up listeners FIRST to prevent race condition
        // If we remove player while listeners are active, they will trigger
        // "player removed" callback which causes unwanted navigation
        console.log('🧹 Cleaning up listeners before removing player...');
        this.cleanupListeners();
        
        // ✅ FIX: Cancel onDisconnect handlers before manually removing
        // This prevents race condition where onDisconnect triggers after manual removal
        if (this.presenceDisconnectRef) {
          await this.presenceDisconnectRef.cancel();
          console.log('✅ Cancelled presence onDisconnect handler');
        }
        if (this.playerDisconnectRef) {
          await this.playerDisconnectRef.cancel();
          console.log('✅ Cancelled player onDisconnect handler');
        }
        
        // Save roomId before clearing (needed for remove operations)
        const currentRoomId = this.roomId;
        
        // ✅ FIX: Clear sessionStorage cache to prevent auto-rejoin
        // Get room code from current session and clear its cache
        const roomCode = sessionStorage.getItem(`roomCode_${currentRoomId}`);
        if (roomCode) {
          sessionStorage.removeItem(`room_${roomCode}`);
          console.log('✅ Cleared room code cache:', roomCode);
        }
        // Also clear by iterating through potential room codes
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key?.startsWith('room_') && sessionStorage.getItem(key) === currentRoomId) {
            sessionStorage.removeItem(key);
            console.log('✅ Cleared room cache:', key);
          }
        }
        
        this.roomId = ''; // Clear early to prevent any callback from using it
        
        // Remove player from RTDB
        const rtdbPlayerRef = ref(this.rtdb, `rooms/${currentRoomId}/players/${this.userId}`);
        await remove(rtdbPlayerRef);
        console.log('✅ Removed player from RTDB');
        
        // Remove presence from RTDB
        const presenceRef = ref(this.rtdb, `rooms/${currentRoomId}/presence/${this.userId}`);
        await remove(presenceRef);
        console.log('✅ Removed presence from RTDB');
        
        // ✅ OPTIMIZATION: Skip Firestore player delete - players are only in RTDB during lobby
        // Final player data will be synced to Firestore when game ends
        console.log('⚡ Skipping Firestore player delete - RTDB only');
        
        logger.info('Left room successfully', { roomId: currentRoomId, wasHost: isHost });
      } catch (error) {
        logger.error('Failed to leave room', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Kick player
  async kickPlayer(playerId: string) {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) throw new RoomNotFoundError('current');
        
        // ✅ Check host from RTDB (source of truth) instead of Firestore
        const rtdbRoomRef = ref(this.rtdb, `rooms/${this.roomId}`);
        const rtdbRoomSnapshot = await get(rtdbRoomRef);
        const rtdbRoomData = rtdbRoomSnapshot.val();
        
        if (!rtdbRoomData) {
          throw new RoomNotFoundError(this.roomId);
        }
        
        const currentHostId = rtdbRoomData.hostId;
        
        console.log('🔍 Checking kick authorization (RTDB):', {
          currentHostId,
          userId: this.userId,
          isHost: currentHostId === this.userId
        });
        
        if (currentHostId !== this.userId) {
          throw new UnauthorizedError('kick players');
        }

        // Prevent kicking host or self
        if (playerId === currentHostId) {
          throw new Error('Cannot kick the host');
        }
        if (playerId === this.userId) {
          throw new Error('Cannot kick yourself');
        }
        
        // ✅ Get player data from RTDB
        const rtdbPlayerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${playerId}`);
        const rtdbPlayerSnapshot = await get(rtdbPlayerRef);
        const playerData = rtdbPlayerSnapshot.val();
        
        if (!playerData) {
          throw new Error('Player not found in room');
        }
        
        const playerName = playerData.name || 'Unknown player';
        const roomName = rtdbRoomData.name || 'Unknown Room';

        // ✅ Remove player from RTDB FIRST (source of truth)
        await remove(rtdbPlayerRef);
        console.log('✅ Player removed from RTDB');
        
        // Remove presence
        const presenceRef = ref(this.rtdb, `rooms/${this.roomId}/presence/${playerId}`);
        await remove(presenceRef).catch(() => {});
        
        // ✅ OPTIMIZATION: Skip Firestore player delete - players are only in RTDB during lobby
        // Final player data will be synced to Firestore when game ends
        console.log('⚡ Skipping Firestore player delete - RTDB only');
        
        // ✅ OPTIMIZED: Send system message via RTDB (not Firestore)
        const chatMessagesRef = ref(this.rtdb, `rooms/${this.roomId}/chat/messages`);
        push(chatMessagesRef, {
          type: 'system',
          content: `${playerName} was kicked from the room`,
          timestamp: Date.now(),
          senderId: 'system',
          senderName: 'System'
        }).catch(err => console.warn('⚠️ Failed to send kick message:', err));
        
        // Send notification to kicked player (background)
        const notificationsRef = collection(this.db, 'users', playerId, 'notifications');
        addDoc(notificationsRef, {
          type: 'kicked',
          title: 'Removed from Room',
          message: `You were kicked from the room "${roomName}" by the host.`,
          roomId: this.roomId,
          roomName: roomName,
          timestamp: new Date(),
          read: false
        }).catch(err => console.warn('⚠️ Failed to send kick notification:', err));
        
        // Emit event for UI updates
        this.emit('player:kicked', { playerId, playerName });
        
        logger.info('Player kicked successfully', { 
          playerId, 
          playerName: playerData.name,
          roomId: this.roomId,
          kickedBy: this.userId 
        });
        
      } catch (error) {
        logger.error('Failed to kick player', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Toggle role between player and spectator (host can switch modes)
  async toggleRole() {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) throw new RoomNotFoundError('current');
        
        const playerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}`);
        const snapshot = await get(playerRef);
        const playerData = snapshot.val();
        
        if (!playerData) {
          throw new Error('Player not found in room');
        }
        
        // Toggle between player and spectator (host should not call this)
        let newRole: PlayerRole;
        if (playerData.role === 'host') {
          // Host should use toggleHostParticipation, but don't throw error
          logger.warn('Host tried to toggle role, use toggleHostParticipation instead');
          return;
        } else if (playerData.role === 'player') {
          newRole = 'spectator';
        } else {
          newRole = 'player';
        }
        
        await update(playerRef, {
          role: newRole,
          isReady: false, // Reset ready when changing role
          lastActive: Date.now()
        });
        
        logger.info('Role toggled', { newRole });
      } catch (error) {
        logger.error('Failed to toggle role', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Toggle host participation (play vs spectate) without losing host role
  async toggleHostParticipation() {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) throw new RoomNotFoundError('current');
        
        const playerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}`);
        const snapshot = await get(playerRef);
        const playerData = snapshot.val();
        
        if (!playerData) {
          throw new Error('Player not found in room');
        }

        // Toggle isParticipating for host
        const currentParticipation = playerData.isParticipating ?? true;
        
        await update(playerRef, {
          isParticipating: !currentParticipation,
          isReady: !currentParticipation ? false : playerData.isReady, // Reset ready if becoming spectator
          lastActive: Date.now()
        });
        
        logger.info('Host participation toggled', { isParticipating: !currentParticipation });
      } catch (error) {
        logger.error('Failed to toggle host participation', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

// Transfer host to another player
  async transferHost(newHostId: string) {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) throw new RoomNotFoundError('current');
        
        // ✅ RTDB is the ONLY source of truth for multiplayer state
        // Firestore is NOT used for transfer host - eliminates sync issues
        const rtdbRoomRef = ref(this.rtdb, `rooms/${this.roomId}`);
        const rtdbRoomSnapshot = await get(rtdbRoomRef);
        const rtdbRoomData = rtdbRoomSnapshot.val();
        
        if (!rtdbRoomData) {
          throw new RoomNotFoundError(this.roomId);
        }
        
        const currentHostId = rtdbRoomData.hostId;
        
        console.log('🔍 Checking host authorization (RTDB only):', {
          currentHostId,
          userId: this.userId,
          isHost: currentHostId === this.userId
        });
        
        if (currentHostId !== this.userId) {
          throw new UnauthorizedError('transfer host');
        }

        // Validate target player
        if (newHostId === currentHostId) {
          throw new Error('Player is already the host');
        }

        // ✅ Get target player data from RTDB (not Firestore)
        const rtdbPlayerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${newHostId}`);
        const rtdbSnapshot = await get(rtdbPlayerRef);
        const rtdbPlayerData = rtdbSnapshot.val();
        
        if (!rtdbPlayerData) {
          throw new Error('Target player not found in room');
        }

        // Check if target player is online
        if (!rtdbPlayerData.isOnline) {
          throw new Error('Cannot transfer host to offline player');
        }

        // ✅ Use multi-location update for atomicity - RTDB ONLY
        const wasParticipating = rtdbPlayerData?.isParticipating ?? true;
        
        console.log('🔄 Transferring host atomically (RTDB only)...', {
          oldHostId: this.userId,
          newHostId: newHostId,
          wasParticipating
        });
        
        // Prepare all updates for atomic write
        const updates: Record<string, any> = {};
        
        // Update old host role
        updates[`rooms/${this.roomId}/players/${this.userId}/role`] = wasParticipating ? 'player' : 'spectator';
        updates[`rooms/${this.roomId}/players/${this.userId}/isParticipating`] = wasParticipating;
        
        // Update new host role
        updates[`rooms/${this.roomId}/players/${newHostId}/role`] = 'host';
        updates[`rooms/${this.roomId}/players/${newHostId}/isParticipating`] = true;
        
        // Update room hostId in RTDB
        updates[`rooms/${this.roomId}/hostId`] = newHostId;
        
        // ✅ If owner is transferring host voluntarily, set flag so owner won't auto-reclaim
        const ownerId = rtdbRoomData.ownerId || currentHostId;
        if (this.userId === ownerId) {
          updates[`rooms/${this.roomId}/ownerTransferredHost`] = true;
          console.log('👑 Owner voluntarily transferred host - will NOT auto-reclaim');
        }
        
        // ✅ Execute ALL updates atomically in RTDB - single source of truth
        try {
          await update(ref(this.rtdb), updates);
          console.log('✅ Host transfer completed atomically in RTDB');
        } catch (error) {
          console.error('❌ Atomic host transfer failed:', error);
          throw new Error('Failed to transfer host. Please try again.');
        }

        // ✅ Sync to Firestore in background (non-blocking, for persistence only)
        // This is optional and won't block the transfer
        const roomRef = doc(this.db, 'multiplayer_rooms', this.roomId);
        updateDoc(roomRef, {
          hostId: newHostId,
          updatedAt: serverTimestamp()
        }).catch(err => {
          console.warn('⚠️ Background Firestore sync failed (non-critical):', err);
        });

        // Get room name and player name for notifications
        const roomName = rtdbRoomData.name || 'Unknown Room';
        const newHostName = rtdbPlayerData.name || 'Unknown player';

        // ✅ OPTIMIZED: Send system message via RTDB (not Firestore)
        const chatMessagesRef = ref(this.rtdb, `rooms/${this.roomId}/chat/messages`);
        push(chatMessagesRef, {
          type: 'system',
          content: i18next.t('multiplayer:isNowTheHost', { name: newHostName }),
          timestamp: Date.now(),
          senderId: 'system',
          senderName: 'System'
        }).catch(err => console.warn('⚠️ Failed to send system message:', err));

        // Send notification to new host (background, non-blocking)
        const notificationsRef = collection(this.db, 'users', newHostId, 'notifications');
        addDoc(notificationsRef, {
          type: 'host_transfer',
          title: 'You are now the Host',
          message: `You have been made the host of the room "${roomName}".`,
          roomId: this.roomId,
          roomName: roomName,
          timestamp: new Date(),
          read: false
        }).catch(err => console.warn('⚠️ Failed to send notification:', err));
        
        // Emit event for UI updates
        this.emit('host:transferred', { 
          oldHostId: this.userId, 
          newHostId, 
          newHostName: newHostName 
        });
        
        logger.info('Host transferred successfully (RTDB only)', { 
          oldHostId: this.userId,
          newHostId,
          newHostName: newHostName,
          roomId: this.roomId
        });
        
      } catch (error) {
        logger.error('Failed to transfer host', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Update shared screen content
  // Save game submission for history tracking
  async saveGameSubmission(submissionData: {
    playerId: string;
    playerName: string;
    finalScore: number;
    rank: number;
    correctAnswers: number;
    totalQuestions: number;
    completionTime: number;
    accuracy: number;
  }) {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) throw new RoomNotFoundError('current');
        
        // ✅ OPTIMIZED: Skip individual Firestore writes during game
        // All player submissions are already saved in match_histories by endGame()
        // This function now only logs for debugging - no Firestore costs
        logger.info('📊 Game submission recorded (in-memory)', { 
          playerId: submissionData.playerId,
          playerName: submissionData.playerName,
          finalScore: submissionData.finalScore,
          rank: submissionData.rank,
          correctAnswers: submissionData.correctAnswers,
          totalQuestions: submissionData.totalQuestions,
          roomId: this.roomId
        });
        
        // Submissions are aggregated and saved to match_histories when game ends
        // See endGame() for the actual Firestore write
        
      } catch (error) {
        logger.error('Failed to log game submission', error);
        // Don't throw - this is non-critical
      }
    }, retryStrategies.standard);
  }

  // Get user's game history across all rooms
  // ✅ OPTIMIZED: Read from match_histories (1 collection) instead of submissions (N subcollections)
  async getUserGameHistory(userId: string, limitCount: number = 50) {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        // Query match_histories where user participated
        // We need to search in leaderboard array for user's playerId
        const historyQuery = query(
          collection(this.db, 'match_histories'),
          orderBy('finishedAt', 'desc'),
          limit(limitCount * 2) // Get more since we'll filter
        );
        
        const querySnapshot = await getDocs(historyQuery);
        const userHistory: any[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Find user in leaderboard
          const userEntry = data.leaderboard?.find((p: any) => p.oderId === userId || p.playerId === userId);
          if (userEntry) {
            userHistory.push({
              id: doc.id,
              matchId: doc.id,
              roomName: data.roomName,
              quizTitle: data.quizTitle,
              finishedAt: data.finishedAt,
              duration: data.duration,
              playerCount: data.playerCount,
              // User-specific data
              rank: userEntry.rank,
              score: userEntry.score,
              correctAnswers: userEntry.correctAnswers,
              totalQuestions: data.totalQuestions,
              accuracy: userEntry.accuracy,
              isWinner: userEntry.rank === 1
            });
          }
        });
        
        // Limit to requested count
        return userHistory.slice(0, limitCount);
        
      } catch (error) {
        logger.error('Failed to get user game history', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Get game history for a specific room
  // ✅ OPTIMIZED: Read from match_histories (1 document) instead of submissions (N documents)
  async getRoomGameHistory(roomId: string) {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        // Get match history document for this room
        const matchHistoryRef = doc(this.db, 'match_histories', roomId);
        const historyDoc = await getDoc(matchHistoryRef);
        
        if (!historyDoc.exists()) {
          logger.info('No match history found for room', { roomId });
          return [];
        }
        
        const data = historyDoc.data();
        
        // Return leaderboard as submissions-like array for backward compatibility
        return (data.leaderboard || []).map((entry: any) => ({
          id: `${entry.oderId || entry.playerId}_${data.finishedAt?.seconds || 0}`,
          playerId: entry.oderId || entry.playerId,
          playerName: entry.name,
          finalScore: entry.score,
          rank: entry.rank,
          correctAnswers: entry.correctAnswers,
          totalQuestions: data.totalQuestions,
          accuracy: entry.accuracy,
          roomId: roomId,
          quizTitle: data.quizTitle,
          finishedAt: data.finishedAt
        }));
        
      } catch (error) {
        logger.error('Failed to get room game history', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Get aggregated user statistics
  async getUserStatistics(userId: string) {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        const submissions = await this.getUserGameHistory(userId, 100);
        
        if (submissions.length === 0) {
          return {
            totalGames: 0,
            totalScore: 0,
            averageScore: 0,
            bestScore: 0,
            totalCorrectAnswers: 0,
            totalQuestions: 0,
            averageAccuracy: 0,
            wins: 0,
            averageRank: 0,
            averageCompletionTime: 0
          };
        }
        
        const totalGames = submissions.length;
        const totalScore = submissions.reduce((sum, sub) => sum + sub.finalScore, 0);
        const averageScore = Math.round(totalScore / totalGames);
        const bestScore = Math.max(...submissions.map(sub => sub.finalScore));
        const totalCorrectAnswers = submissions.reduce((sum, sub) => sum + sub.correctAnswers, 0);
        const totalQuestions = submissions.reduce((sum, sub) => sum + sub.totalQuestions, 0);
        const averageAccuracy = Math.round((totalCorrectAnswers / totalQuestions) * 100);
        const wins = submissions.filter(sub => sub.rank === 1).length;
        const averageRank = submissions.reduce((sum, sub) => sum + sub.rank, 0) / totalGames;
        const averageCompletionTime = submissions.reduce((sum, sub) => sum + (sub.completionTime || 0), 0) / totalGames;
        
        return {
          totalGames,
          totalScore,
          averageScore,
          bestScore,
          totalCorrectAnswers,
          totalQuestions,
          averageAccuracy,
          wins,
          averageRank: Math.round(averageRank * 10) / 10,
          averageCompletionTime: Math.round(averageCompletionTime)
        };
        
      } catch (error) {
        logger.error('Failed to get user statistics', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Find room by code (for URL routing)
  async findRoomByCode(roomCode: string): Promise<{ id: string } | null> {
    try {
      const roomsQuery = query(
        collection(this.db, 'multiplayer_rooms'),
        where('code', '==', roomCode),
        limit(1)
      );
      
      const snapshot = await getDocs(roomsQuery);
      if (snapshot.empty) {
        return null;
      }
      
      return { id: snapshot.docs[0].id };
    } catch (error) {
      console.error('❌ Error finding room by code:', error);
      return null;
    }
  }

  // Reconnect to room
  async reconnect() {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) throw new RoomNotFoundError('reconnect');
        
        console.log('🔄 Reconnecting to room:', this.roomId);
        
        const auth = getAuth();
        
        // ✅ OPTIMIZATION: Skip Firestore player check - use RTDB only during lobby
        // Final player data will be synced to Firestore when game ends
        console.log('⚡ Skipping Firestore player check - using RTDB only');
        
        // Check if player exists in RTDB
        const rtdbPlayerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}`);
        const rtdbPlayerSnapshot = await get(rtdbPlayerRef);
        
        if (rtdbPlayerSnapshot.exists()) {
          // Player exists in RTDB, just update online status
          console.log('✅ Player found in RTDB, updating online status');
          const presenceRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}/isOnline`);
          await set(presenceRef, true);
          
          // ✅ Clear lastEmptyAt when player reconnects - reset cleanup countdown
          const lastEmptyAtRef = ref(this.rtdb, `rooms/${this.roomId}/lastEmptyAt`);
          await remove(lastEmptyAtRef);
          console.log('✅ Cleared lastEmptyAt - room is now active');
        } else {
          // Player NOT in RTDB, add them back
          console.log('⚠️ Player not found in RTDB, adding back...');
          await this.addPlayerToRTDB({
            id: this.userId,
            name: auth.currentUser?.displayName || 'Player',
            avatar: auth.currentUser?.photoURL || undefined,
            photoURL: auth.currentUser?.photoURL || undefined, // ✅ Add photoURL for avatar display
            score: 0,
            isReady: false,
            isOnline: true,
            role: 'player' as PlayerRole,
            joinedAt: Date.now(),
            lastActive: Date.now(),
            answers: []
          });
          console.log('✅ Player added back to RTDB');
        }
        
        // Setup listeners
        this.setupListeners(this.roomId);
        
        logger.info('Reconnected to room successfully', { roomId: this.roomId });
      } catch (error) {
        logger.error('Failed to reconnect', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Clear cache method for memory management
  clearCache(): void {
    this.cleanupListeners();
    this.callbacks.clear();
    this.roomId = '';
    logger.info('Service cache cleared');
  }

  // Cleanup all resources
  cleanup(): void {
    this.clearCache();
    this.emit('cleanup');
    logger.info('Service cleaned up');
  }

  // Utility
  private async generateRoomCode(): Promise<string> {
    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    
    while (attempts < MAX_ATTEMPTS) {
      const code = this.randomCode();
      
      // Check if code exists
      const q = query(
        collection(this.db, 'multiplayer_rooms'),
        where('code', '==', code),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return code;
      }
      
      attempts++;
    }
    
    throw new RoomCodeGenerationError();
  }

  private randomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export default ModernMultiplayerService;
export const modernMultiplayerService = new ModernMultiplayerService();
