// Multiplayer Type Definitions

export interface Player {
  id: string;
  username: string;
  isReady: boolean;
  isHost: boolean;
  isOnline: boolean;
  score: number;
  currentQuestion: number;
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
  quiz?: QuizData;
  settings: RoomSettings;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface RoomSettings {
  timeLimit: number;
  showLeaderboard: boolean;
  allowLateJoin: boolean;
  autoStart: boolean;
  showAnswers: boolean;
}

export interface QuizData {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export interface Question {
  id: string;
  title: string;
  options: string[] | QuestionOption[];
  correct: number;
  explanation?: string;
  timeLimit?: number;
  points?: number;
}

export interface QuestionOption {
  text: string;
  value: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  playerId: string;
  playerName: string;
  message: string;
  type: 'user' | 'system';
  timestamp: Date;
}

export interface GameData {
  currentQuestionIndex: number;
  questions: Question[];
  startTime?: Date;
  endTime?: Date;
  currentQuestion?: Question;
  timeLeft?: number;
  results?: GameResults;
}

export interface GameResults {
  leaderboard: PlayerResult[];
  totalQuestions: number;
  totalTime: number;
  averageScore: number;
}

export interface PlayerResult {
  id: string;
  name: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  averageTime: number;
  rank: number;
}

export interface ConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastConnected?: Date;
  reconnectAttempts?: number;
}

export interface MultiplayerState {
  currentState: 'mode-selection' | 'create-room' | 'join-room' | 'lobby' | 'game' | 'results';
  isConnecting: boolean;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  roomId?: string;
  roomData?: Room;
  gameData?: GameData;
  results?: GameResults;
  error?: string;
}

// Event types
export type MultiplayerEvent = 
  | 'connected'
  | 'disconnected'
  | 'room:created'
  | 'room:joined'
  | 'room:updated'
  | 'room:left'
  | 'player:joined'
  | 'player:left'
  | 'player:ready'
  | 'player:not_ready'
  | 'game:start'
  | 'game:question_start'
  | 'game:question_end'
  | 'game:finish'
  | 'chat:message'
  | 'connection:lost'
  | 'connection:restored'
  | 'error';

// Service interface
export interface MultiplayerServiceInterface {
  // Connection
  connect(userId: string, username: string): Promise<void>;
  disconnect(): Promise<void>;
  
  // Room Management
  createRoom(roomConfig: Partial<Room>, quizId?: string): Promise<{ room: Room; player: Player }>;
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
  updateRoomSettings(roomId: string, settings: Partial<RoomSettings>): Promise<void>;
  
  // Event Listeners
  on(event: MultiplayerEvent, callback: (...args: any[]) => void): void;
  off(event: MultiplayerEvent, callback: (...args: any[]) => void): void;
}

// Error types
export class MultiplayerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MultiplayerError';
  }
}

export class RoomError extends MultiplayerError {
  constructor(message: string, code: string, details?: any) {
    super(message, code, details);
    this.name = 'RoomError';
  }
}

export class ConnectionError extends MultiplayerError {
  constructor(message: string, code: string, details?: any) {
    super(message, code, details);
    this.name = 'ConnectionError';
  }
}
