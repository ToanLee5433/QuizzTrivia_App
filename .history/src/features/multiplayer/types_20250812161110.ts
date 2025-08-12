export type GameMode = 'single' | 'multiplayer';

export interface RoomConfig {
  maxPlayers: number;
  timeLimit: number;
  isPrivate: boolean;
  allowLateJoin: boolean;
  showCorrectAnswers: boolean;
  roomName: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  hostName: string;
  isPrivate: boolean;
  maxPlayers: number;
  currentPlayers: number;
  timePerQuestion: number;
  allowLateJoin: boolean;
  showCorrectAnswers: boolean;
  status: 'waiting' | 'in-progress' | 'finished';
  quizId: string;
  quizTitle: string;
  quizCategory: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  streak: number;
  hasAnswered: boolean;
  isReady: boolean;
  isHost: boolean;
  joinedAt: Date;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  timeLimit?: number;
}

export interface Quiz {
  id: string;
  title: string;
  category: string;
  description?: string;
  questions: Question[];
  createdBy: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
}

export interface PlayerAnswer {
  playerId: string;
  playerName: string;
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeRemaining: number;
  points: number;
  answeredAt: Date;
}

export interface QuestionResult {
  questionId: string;
  correctAnswer: string;
  explanation?: string;
  playerAnswers: PlayerAnswer[];
  questionText: string;
  options: string[];
}

export interface GameSession {
  id: string;
  roomId: string;
  quizId: string;
  currentQuestionIndex: number;
  gamePhase: 'waiting' | 'question' | 'results' | 'finished';
  timeRemaining: number;
  questionResults: QuestionResult[];
  startedAt?: Date;
  finishedAt?: Date;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'system' | 'announcement';
}

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  averageTime: number;
  streak: number;
  rank: number;
}

export interface MultiplayerGameState {
  room: Room | null;
  players: Player[];
  gameSession: GameSession | null;
  currentPlayer: Player | null;
  isHost: boolean;
  isConnected: boolean;
  error: string | null;
  loading: boolean;
}

// WebSocket Events
export interface SocketEvents {
  // System events
  'response': { requestId: string; success: boolean; payload?: any; error?: string };
  'error': { message: string; code?: string };
  'disconnect': void;
  'reconnect': void;
  
  // Room events
  'room:join': { roomId: string; player: Player };
  'room:leave': { roomId: string; playerId: string };
  'room:update': { room: Room };
  'room:deleted': { roomId: string };
  
  // Game events
  'game:start': { gameSession: GameSession };
  'game:next-question': { questionIndex: number; timeRemaining: number };
  'game:answer': { answer: PlayerAnswer };
  'game:question-results': { results: QuestionResult };
  'game:finish': { finalResults: LeaderboardEntry[] };
  
  // Player events
  'player:ready': { playerId: string; isReady: boolean };
  'player:kick': { playerId: string };
  'player:update': { player: Player };
  
  // Chat events
  'chat:message': { message: ChatMessage };
}

// API Response types
export interface CreateRoomResponse {
  room: Room;
  player: Player;
  success: boolean;
}

export interface JoinRoomResponse {
  room: Room;
  players: Player[];
  player: Player;
  success: boolean;
}

export interface RoomListResponse {
  rooms: Room[];
  total: number;
  page: number;
  pageSize: number;
}

// Missing types for legacy components
export interface MultiplayerRoom extends Room {
  players: Player[];
  quiz: Quiz;
  settings: {
    maxPlayers: number;
    questionTimeLimit: number;
    showLeaderboard: boolean;
    allowSpectators: boolean;
    enableChat?: boolean;
    autoAdvanceTime?: number;
  };
  questionAnswers?: Record<string, Record<string, any>>;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  averageTime: number;
  streak: number;
  rank: number;
  avatar?: string;
  totalScore?: number;
  averageTimePerAnswer?: number;
  totalAnswers: number;
}
