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
  createRoom(roomConfig: Partial<Room>, quizId?: string): Promise<{ room: Room; player: Player }>;
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

// Singleton instance
let multiplayerServiceInstance: any = null;

export function getMultiplayerService(): MultiplayerServiceInterface {
  if (!multiplayerServiceInstance) {
    // Always use Firestore for real-time shared state across tabs
    multiplayerServiceInstance = new FirestoreMultiplayerService() as any;
  }
  return multiplayerServiceInstance as any;
}

export function resetMultiplayerService(): void {
  if (multiplayerServiceInstance) {
    multiplayerServiceInstance.disconnect();
    multiplayerServiceInstance = null;
  }
}
