import { 
  doc, 
  collection, 
  collectionGroup,
  setDoc, 
  getDoc, 
  getDocs,
  query, 
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  deleteDoc,
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
  onDisconnect,
  Database,
  getDatabase,
  runTransaction
} from 'firebase/database';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import CryptoJS from 'crypto-js';
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

export interface GameState {
  status: 'waiting' | 'playing' | 'finished';
  currentQuestion: number;
  timeLeft: number;
  questionStartTime: number;
  players: { [playerId: string]: ModernPlayer };
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
      if (obj.hasOwnProperty(key)) {
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
  async getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
    try {
      let questions: QuizQuestion[] = [];
      
      // Try subcollection first
      try {
        const questionsQuery = query(
          collection(this.db, 'quizzes', quizId, 'questions')
        );
        const questionsSnapshot = await getDocs(questionsQuery);
        
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
        console.warn(`⚠️ Could not fetch questions subcollection for ${quizId}`);
      }
      
      // Fallback: Get from document field
      if (questions.length === 0) {
        const quizDoc = await getDoc(doc(this.db, 'quizzes', quizId));
        if (quizDoc.exists()) {
          const data = quizDoc.data();
          if (data.questions && Array.isArray(data.questions)) {
            questions = data.questions.map((q: any, idx: number) => ({
              id: q.id || `q${idx}`,
              question: q.question || q.text || q.title,
              options: q.options || q.answers?.map((a: any) => a.text) || [],
              correctAnswer: q.correctAnswer ?? q.answers?.findIndex((a: any) => a.isCorrect) ?? 0,
              timeLimit: q.timeLimit || 30,
              points: q.points || 100
            }));
          }
        }
      }
      
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
          
          // ✅ Add to Firestore players subcollection (required for permission check)
          const firestorePlayerRef = doc(this.db, 'multiplayer_rooms', roomRef.id, 'players', user.uid);
          await setDoc(firestorePlayerRef, {
            name: playerData.name,
            score: playerData.score,
            isReady: playerData.isReady,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          // ✅ Add to RTDB for real-time sync
          const playerRef = ref(this.rtdb, `rooms/${roomRef.id}/players/${user.uid}`);
          await set(playerRef, playerData);
          
          // Set up presence tracking
          const presenceRef = ref(this.rtdb, `rooms/${roomRef.id}/presence/${user.uid}`);
          await set(presenceRef, {
            isOnline: true,
            lastSeen: Date.now(),
            username: user.displayName || 'Player'
          });
          
          // Set up onDisconnect handlers to auto-cleanup when connection is lost
          const presenceDisconnectRef = onDisconnect(presenceRef);
          const playerDisconnectRef = onDisconnect(playerRef);
          
          // Schedule removal on disconnect
          await presenceDisconnectRef.remove();
          await playerDisconnectRef.remove();
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
        
        // ✅ Check if player already exists in Firestore
        const auth = getAuth();
        const firestorePlayerRef = doc(this.db, 'multiplayer_rooms', roomDoc.id, 'players', this.userId);
        const existingPlayerSnap = await getDoc(firestorePlayerRef);
        
        if (existingPlayerSnap.exists()) {
          console.log('♻️ Player already exists in Firestore, preserving data:', existingPlayerSnap.data());
          // Update only timestamp and online status
          await setDoc(firestorePlayerRef, {
            ...existingPlayerSnap.data(),
            updatedAt: serverTimestamp(),
            isOnline: true
          }, { merge: true });
        } else {
          console.log('➕ Adding new player to Firestore...');
          await setDoc(firestorePlayerRef, {
            name: auth.currentUser?.displayName || 'Player',
            score: 0,
            isReady: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isOnline: true
          });
        }
        console.log('✅ Player Firestore data ready');
        
        // ✅ Setup RTDB and listeners AFTER player is in Firestore
        await this.setupRealtimeRoom(roomDoc.id, actualRoomCode);
        
        // ✅ Add player to RTDB for real-time presence (use Firestore data if exists)
        const playerData = existingPlayerSnap.exists() ? existingPlayerSnap.data() : null;
        await this.addPlayerToRTDB({
          id: this.userId,
          name: playerData?.name || auth.currentUser?.displayName || 'Player',
          avatar: auth.currentUser?.photoURL || undefined,
          photoURL: auth.currentUser?.photoURL || undefined, // ✅ Add photoURL for avatar display
          score: playerData?.score || 0,
          isReady: playerData?.isReady || false,
          isOnline: true,
          role: playerData?.role || 'player' as PlayerRole, // Regular players start as player role
          joinedAt: Date.now(),
          lastActive: Date.now(),
          answers: []
        });
        console.log('✅ Player added to RTDB with score:', playerData?.score || 0);
        
        console.log('✅ Joined room:', { roomId: this.roomId, code: actualRoomCode });
        return { roomId: this.roomId, roomCode: actualRoomCode };
      } catch (error) {
        console.error('❌ Failed to join room:', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
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
    
    // Setup presence tracking
    const presenceRef = ref(this.rtdb, `rooms/${this.roomId}/presence/${player.id}`);
    await set(presenceRef, {
      isOnline: true,
      lastSeen: Date.now(),
      username: player.name
    });
    
    // Set up onDisconnect handlers to auto-cleanup when connection is lost
    this.presenceDisconnectRef = onDisconnect(presenceRef);
    this.playerDisconnectRef = onDisconnect(playerRef);
    
    // Schedule removal on disconnect
    await this.presenceDisconnectRef.remove();
    await this.playerDisconnectRef.remove();
    
    console.log('✅ Set up onDisconnect handlers for presence tracking');
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

  // Submit answer
  async submitAnswer(questionId: string, answer: number, timeSpent: number): Promise<boolean> {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();

        // Rate limiting
        if (!rateLimiter.canPerform(this.userId, 'submitAnswer')) {
          throw new RateLimitError('submit answer', 60);
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
          
          const onlinePlayers = Object.entries(players)
            .filter(([playerId, playerData]: [string, any]) => 
              playerId !== this.userId && 
              playerData?.isOnline === true
            )
            .map(([playerId]) => playerId);
          
          if (onlinePlayers.length > 0) {
            // Transfer to first available online player
            const newHostId = onlinePlayers[0];
            console.log('✅ Transferring host to:', newHostId);
            
            // Update new host in Firestore
            await updateDoc(roomRef, {
              hostId: newHostId,
              lastUpdated: new Date()
            });
            
            // Update roles in RTDB
            const newHostRef = ref(this.rtdb, `rooms/${this.roomId}/players/${newHostId}`);
            await update(newHostRef, {
              role: 'host' as PlayerRole,
              isParticipating: true
            });
            
            // Send system message about host transfer
            const messagesRef = collection(this.db, 'multiplayer_rooms', this.roomId, 'messages');
            const newHostData = players[newHostId];
            await addDoc(messagesRef, {
              type: 'system',
              content: `Host left. ${newHostData?.name || 'Player'} is now the host.`,
              timestamp: new Date(),
              senderId: 'system',
              senderName: 'System'
            });
          } else {
            console.log('⚠️ No other players online, room will be empty');
          }
        }
        
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
        
        // Remove player from RTDB
        const rtdbPlayerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}`);
        await remove(rtdbPlayerRef);
        console.log('✅ Removed player from RTDB');
        
        // Remove presence from RTDB
        const presenceRef = ref(this.rtdb, `rooms/${this.roomId}/presence/${this.userId}`);
        await remove(presenceRef);
        console.log('✅ Removed presence from RTDB');
        
        // Remove player from Firestore (so they can rejoin with fresh data)
        const firestorePlayerRef = doc(this.db, 'multiplayer_rooms', this.roomId, 'players', this.userId);
        await deleteDoc(firestorePlayerRef);
        console.log('✅ Removed player from Firestore');
        
        // Clean up listeners
        this.cleanupListeners();
        
        logger.info('Left room successfully', { roomId: this.roomId, wasHost: isHost });
        this.roomId = '';
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
        
        // Check if current user is host
        const roomRef = doc(this.db, 'multiplayer_rooms', this.roomId);
        const roomSnapshot = await getDoc(roomRef);
        const roomData = roomSnapshot.data() as ModernRoom;
        
        if (roomData.hostId !== this.userId) {
          throw new UnauthorizedError('kick players');
        }

        // Prevent kicking host or self
        if (playerId === roomData.hostId) {
          throw new Error('Cannot kick the host');
        }
        if (playerId === this.userId) {
          throw new Error('Cannot kick yourself');
        }
        
        // Get player data for notification
        const playerRef = doc(this.db, 'multiplayer_rooms', this.roomId, 'players', playerId);
        const playerSnapshot = await getDoc(playerRef);
        const playerData = playerSnapshot.data();
        
        if (!playerData) {
          throw new Error('Player not found in room');
        }

        // Remove from Firestore players subcollection
        await deleteDoc(playerRef);
        
        // Remove player from RTDB
        const rtdbPlayerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${playerId}`);
        await remove(rtdbPlayerRef);
        
        // Send system message about player kick
        const messagesRef = collection(this.db, 'multiplayer_rooms', this.roomId, 'messages');
        await addDoc(messagesRef, {
          type: 'system',
          content: `${playerData.name} was kicked from the room`,
          timestamp: new Date(),
          senderId: 'system',
          senderName: 'System'
        });
        
        // Send notification to kicked player
        const notificationsRef = collection(this.db, 'users', playerId, 'notifications');
        await addDoc(notificationsRef, {
          type: 'kicked',
          title: 'Removed from Room',
          message: `You were kicked from the room "${roomData.name}" by the host.`,
          roomId: this.roomId,
          roomName: roomData.name,
          timestamp: new Date(),
          read: false
        });
        
        // Emit event for UI updates
        this.emit('player:kicked', { playerId, playerName: playerData.name });
        
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
        
        // Check if current user is host
        const roomRef = doc(this.db, 'multiplayer_rooms', this.roomId);
        const roomSnapshot = await getDoc(roomRef);
        const roomData = roomSnapshot.data() as ModernRoom;
        
        if (roomData.hostId !== this.userId) {
          throw new UnauthorizedError('transfer host');
        }

        // Validate target player
        if (newHostId === roomData.hostId) {
          throw new Error('Player is already the host');
        }

        // Get target player data
        const playerRef = doc(this.db, 'multiplayer_rooms', this.roomId, 'players', newHostId);
        const playerSnapshot = await getDoc(playerRef);
        const playerData = playerSnapshot.data();
        
        if (!playerData) {
          throw new Error('Target player not found in room');
        }

        // Check if target player is online
        const rtdbPlayerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${newHostId}`);
        const rtdbSnapshot = await get(rtdbPlayerRef);
        const rtdbPlayerData = rtdbSnapshot.val();
        
        if (!rtdbPlayerData || !rtdbPlayerData.isOnline) {
          throw new Error('Cannot transfer host to offline player');
        }

        // Update roles in RTDB FIRST (while still host), then update room hostId
        const oldHostRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}`);
        const wasParticipating = playerData?.isParticipating ?? true; // Get current participation state
        
        // Debug logging to track the issue
        console.log('🔍 Host Transfer Debug:', {
          oldHostId: this.userId,
          newHostId: newHostId,
          playerDataIsParticipating: playerData?.isParticipating,
          wasParticipating: wasParticipating,
          willBeRole: wasParticipating ? 'player' : 'spectator'
        });
        
        // Update old host role FIRST - with granular error handling
        try {
          console.log('🔄 Updating old host role...');
          await update(oldHostRef, {
            role: wasParticipating ? 'player' as PlayerRole : 'spectator' as PlayerRole,
            isParticipating: wasParticipating
          });
          console.log('✅ Old host role updated successfully');
        } catch (error) {
          console.error('❌ Failed to update old host role:', error);
          throw error;
        }

        // Update new host role - with granular error handling
        try {
          console.log('🔄 Updating new host role...');
          const newHostRef = ref(this.rtdb, `rooms/${this.roomId}/players/${newHostId}`);
          await update(newHostRef, {
            role: 'host' as PlayerRole,
            isParticipating: true
          });
          console.log('✅ New host role updated successfully');
        } catch (error) {
          console.error('❌ Failed to update new host role:', error);
          throw error;
        }

        // Update room hostId - with granular error handling
        try {
          console.log('🔄 Updating room hostId...');
          const rtdbRoomRef = ref(this.rtdb, `rooms/${this.roomId}`);
          await update(rtdbRoomRef, {
            hostId: newHostId
          });
          console.log('✅ Room hostId updated successfully');
        } catch (error) {
          console.error('❌ Failed to update room hostId:', error);
          throw error;
        }

        // Update Firestore room document LAST (after RTDB updates succeed)
        try {
          await updateDoc(roomRef, {
            hostId: newHostId,
            updatedAt: serverTimestamp()
          });
          console.log('✅ Firestore room document updated');
        } catch (firestoreError) {
          console.warn('⚠️ Firestore update failed, but RTDB transfer succeeded:', firestoreError);
          // Don't throw error - RTDB transfer is what matters for functionality
        }

        // Send system message about host transfer
        const messagesRef = collection(this.db, 'multiplayer_rooms', this.roomId, 'messages');
        await addDoc(messagesRef, {
          type: 'system',
          content: `${playerData?.name || 'Unknown player'} is now the host of the room`,
          timestamp: new Date(),
          senderId: 'system',
          senderName: 'System'
        });

        // Send notification to new host
        const notificationsRef = collection(this.db, 'users', newHostId, 'notifications');
        await addDoc(notificationsRef, {
          type: 'host_transfer',
          title: 'You are now the Host',
          message: `You have been made the host of the room "${roomData.name}".`,
          roomId: this.roomId,
          roomName: roomData.name,
          timestamp: new Date(),
          read: false
        });
        
        // Emit event for UI updates
        this.emit('host:transferred', { 
          oldHostId: this.userId, 
          newHostId, 
          newHostName: playerData?.name || 'Unknown player' 
        });
        
        logger.info('Host transferred successfully', { 
          oldHostId: this.userId,
          newHostId,
          newHostName: playerData?.name || 'Unknown player',
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
  async updateSharedScreen(screenData: any) {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        if (!this.roomId) throw new RoomNotFoundError('current');

        console.log('🔍 updateSharedScreen Debug:', {
          roomId: this.roomId,
          userId: this.userId,
          screenData: screenData
        });

        const rtdbRoomRef = ref(this.rtdb, `rooms/${this.roomId}`);
        await update(rtdbRoomRef, {
          sharedScreen: screenData,
          updatedAt: Date.now()
        });
        
        console.log('✅ SharedScreen updated to RTDB successfully');
        logger.info('Shared screen updated', { screenData });
      } catch (error) {
        console.error('❌ Failed to update shared screen:', error);
        logger.error('Failed to update shared screen', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

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
        
        // Create submission document
        const submissionsRef = collection(this.db, 'multiplayer_rooms', this.roomId, 'submissions');
        const submissionId = `${submissionData.playerId}_${Date.now()}`;
        
        await addDoc(submissionsRef, {
          id: submissionId,
          playerId: submissionData.playerId,
          playerName: submissionData.playerName,
          finalScore: submissionData.finalScore,
          rank: submissionData.rank,
          correctAnswers: submissionData.correctAnswers,
          totalQuestions: submissionData.totalQuestions,
          completionTime: submissionData.completionTime,
          accuracy: submissionData.accuracy,
          roomId: this.roomId,
          timestamp: serverTimestamp(),
          submittedAt: new Date().toISOString()
        });
        
        logger.info('Game submission saved', { 
          playerId: submissionData.playerId,
          finalScore: submissionData.finalScore,
          rank: submissionData.rank,
          roomId: this.roomId
        });
        
      } catch (error) {
        logger.error('Failed to save game submission', error);
        this.emit('error', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Get user's game history across all rooms
  async getUserGameHistory(userId: string, limitCount: number = 50) {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        // Query all submissions for the user across all rooms
        const submissionsQuery = query(
          collectionGroup(this.db, 'submissions'),
          where('playerId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
        
        const querySnapshot = await getDocs(submissionsQuery);
        const submissions: any[] = [];
        
        querySnapshot.forEach((doc) => {
          submissions.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        return submissions;
        
      } catch (error) {
        logger.error('Failed to get user game history', error);
        throw error;
      }
    }, retryStrategies.standard);
  }

  // Get game history for a specific room
  async getRoomGameHistory(roomId: string) {
    return this.executeOperation(async () => {
      try {
        this.ensureAuthenticated();
        
        // Query all submissions for the room
        const submissionsQuery = query(
          collection(this.db, 'multiplayer_rooms', roomId, 'submissions'),
          orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(submissionsQuery);
        const submissions: any[] = [];
        
        querySnapshot.forEach((doc) => {
          submissions.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        return submissions;
        
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
        
        // Check if player exists in Firestore
        const firestorePlayerRef = doc(this.db, 'multiplayer_rooms', this.roomId, 'players', this.userId);
        const firestorePlayerSnap = await getDoc(firestorePlayerRef);
        
        if (!firestorePlayerSnap.exists()) {
          console.log('⚠️ Player not in Firestore, adding back...');
          // Add player back to Firestore
          await setDoc(firestorePlayerRef, {
            name: auth.currentUser?.displayName || 'Player',
            score: 0,
            isReady: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log('✅ Player added back to Firestore');
        }
        
        const firestorePlayerData = firestorePlayerSnap.exists() ? firestorePlayerSnap.data() : null;
        
        // Check if player exists in RTDB
        const rtdbPlayerRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}`);
        const rtdbPlayerSnapshot = await get(rtdbPlayerRef);
        
        if (rtdbPlayerSnapshot.exists()) {
          // Player exists in RTDB, just update online status
          console.log('✅ Player found in RTDB, updating online status');
          const presenceRef = ref(this.rtdb, `rooms/${this.roomId}/players/${this.userId}/isOnline`);
          await set(presenceRef, true);
        } else {
          // Player NOT in RTDB, add them back
          console.log('⚠️ Player not found in RTDB, adding back from Firestore...');
          await this.addPlayerToRTDB({
            id: this.userId,
            name: firestorePlayerData?.name || auth.currentUser?.displayName || 'Player',
            avatar: auth.currentUser?.photoURL || undefined,
            photoURL: auth.currentUser?.photoURL || undefined, // ✅ Add photoURL for avatar display
            score: firestorePlayerData?.score || 0,
            isReady: firestorePlayerData?.isReady || false,
            isOnline: true,
            role: firestorePlayerData?.role || 'player' as PlayerRole,
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
