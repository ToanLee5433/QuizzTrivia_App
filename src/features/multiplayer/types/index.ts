import { Question } from '../../quiz/types';

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  isReady: boolean;
  score: number;
  joinedAt: number;
}

export interface MultiplayerRoom {
  id: string;
  // Removed hostId - all players are equal
  quiz: {
    id: string;
    title: string;
    questions: Question[];
  };
  players: Player[];
  settings: {
    maxPlayers: number;
    questionTimeLimit: number;
    showLeaderboard: boolean;
    allowSpectators: boolean;
  };
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  currentQuestion?: number;
  questionAnswers?: {
    [questionIndex: number]: {
      [playerId: string]: {
        answer: string;
        timeToAnswer: number;
        pointsEarned: number;
        isCorrect: boolean;
        timestamp: number;
      };
    };
  };
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

export interface GameAnswer {
  playerId: string;
  playerName: string;
  answer: string;
  timeToAnswer: number;
  pointsEarned: number;
  isCorrect: boolean;
  timestamp: number;
}

export interface QuestionResult {
  questionIndex: number;
  question: Question;
  answers: GameAnswer[];
  correctAnswer: string;
  totalAnswers: number;
}

export interface GameStatistics {
  totalPlayers: number;
  totalQuestions: number;
  averageScore: number;
  topScore: number;
  fastestAnswer: number;
  completionRate: number;
}

export interface RoomSettings {
  maxPlayers: number;
  questionTimeLimit: number;
  showLeaderboard: boolean;
  allowSpectators: boolean;
  enableChat?: boolean;
  autoAdvanceTime?: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  type: 'message' | 'system' | 'emoji';
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  totalScore: number;
  correctAnswers: number;
  averageTimePerAnswer: number;
  streak: number;
  rank: number;
}

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  averageTime: number;
  rank: number;
  avatar?: string;
}

// Real-time events
export interface MultiplayerEvent {
  type: 'player_joined' | 'player_left' | 'game_started' | 'question_changed' | 'game_finished' | 'chat_message';
  data: any;
  timestamp: number;
}

// Room creation data
export interface CreateRoomData {
  quizId: string;
  settings: RoomSettings;
  isPrivate?: boolean;
}

// Join room data
export interface JoinRoomData {
  roomId: string;
  playerName: string;
  avatar?: string;
}

export interface MultiplayerError {
  code: string;
  message: string;
  details?: any;
}