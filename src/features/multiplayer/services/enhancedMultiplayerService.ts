// Simple event emitter for browser (removed - not used in current implementation)

// Types
export interface Player {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  currentQuestion: number;
  isOnline: boolean;
  joinedAt: Date;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
  status: 'waiting' | 'playing' | 'finished';
  quizId?: string;
  quizTitle?: string;
  settings: {
    timePerQuestion: number;
    showAnswers: boolean;
    allowLateJoin: boolean;
    autoStart: boolean;
  };
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export interface GameState {
  roomId: string;
  currentQuestion: number;
  totalQuestions: number;
  timeRemaining: number;
  questionData: any;
  playerAnswers: Record<string, any>;
  leaderboard: Player[];
  phase: 'question' | 'answer' | 'results' | 'finished';
}

export interface ChatMessage {
  id: string;
  roomId: string;
  playerId: string;
  playerName: string;
  message: string;
  type: 'player' | 'system';
  timestamp: Date;
}

export interface MultiplayerServiceInterface {
  connect(userId: string, userName: string): Promise<void>;
  disconnect(): void;
  resumeRoom(roomId: string): Promise<{ room: Room } | null>;
  setPresence(roomId: string, isOnline: boolean): Promise<void>;
  createRoom(roomConfig: Partial<Room>, selectedQuiz?: any): Promise<{ room: Room; player: Player }>;
  joinRoom(roomCode: string, password?: string): Promise<{ room: Room; player: Player }>;
  leaveRoom(roomId: string): Promise<void>;
  startGame(roomId: string): Promise<void>;
  submitAnswer(roomId: string, questionId: string, answer: any, timeRemaining: number): Promise<void>;
  advanceToNextQuestion(roomId: string): Promise<void>;
  sendChatMessage(roomId: string, message: string): Promise<void>;
  kickPlayer(roomId: string, playerId: string): Promise<void>;
  updatePlayerStatus(roomId: string, isReady: boolean): Promise<void>;
  updateRoomSettings(roomId: string, settings: Partial<Room['settings']>): Promise<void>;
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;
}

import { FirestoreMultiplayerService } from './firestoreMultiplayerService';
import realtimeService from './realtimeMultiplayerService';

// Singleton instance
let multiplayerServiceInstance: any = null;

/**
 * Get multiplayer service with hybrid approach
 * - Firestore: Persistent data (rooms, scores, metadata)
 * - Realtime DB: Live state (presence, timer, chat)
 */
export function getMultiplayerService(): MultiplayerServiceInterface {
  if (!multiplayerServiceInstance) {
    // Create Firestore service with Realtime DB integration
    const firestoreService = new FirestoreMultiplayerService() as any;
    
    // Enhance with Realtime DB capabilities
    const originalConnect = firestoreService.connect.bind(firestoreService);
    firestoreService.connect = async (userId: string, userName: string) => {
      await originalConnect(userId, userName);
      console.log('✅ Connected to Firestore + Realtime DB');
    };
    
    const originalDisconnect = firestoreService.disconnect.bind(firestoreService);
    firestoreService.disconnect = () => {
      originalDisconnect();
      realtimeService.cleanupAll();
      console.log('✅ Disconnected from all services');
    };
    
    // Store reference to realtime service
    firestoreService.realtimeService = realtimeService;
    
    multiplayerServiceInstance = firestoreService;
  }
  return multiplayerServiceInstance as any;
}

export function resetMultiplayerService(): void {
  if (multiplayerServiceInstance) {
    multiplayerServiceInstance.disconnect();
    realtimeService.cleanupAll();
    multiplayerServiceInstance = null;
  }
}
