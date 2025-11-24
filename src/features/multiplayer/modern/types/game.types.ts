/**
 * 🎮 MODERN MULTIPLAYER GAME TYPES
 * Complete type definitions for real-time multiplayer game
 */

import { Question } from '../../../quiz/types';

// ============= PLAYER ROLES =============
export type PlayerRole = 'host' | 'player' | 'spectator';

export type PlayerStatus = 'waiting' | 'ready' | 'playing' | 'finished' | 'disconnected';

// ============= GAME STATE =============
export type GameStatus = 
  | 'lobby'           // Waiting in lobby
  | 'starting'        // Countdown to start
  | 'question'        // Showing question
  | 'answering'       // Players answering
  | 'reviewing'       // Show correct answer + stats
  | 'leaderboard'     // Show leaderboard between questions
  | 'paused'          // Game paused by host
  | 'finished';       // Game ended

// ============= POWER-UPS =============
export type PowerUpType = 
  | 'double_points'   // 2x điểm câu tiếp theo
  | 'time_freeze'     // Dừng thời gian 5s
  | 'fifty_fifty'     // Loại 2 đáp án sai
  | 'reveal_answer'   // Hiện đáp án đúng 3s
  | 'skip_question'   // Bỏ qua câu hỏi (giữ điểm)
  | 'shield'          // Bảo vệ streak nếu sai
  | 'steal_points'    // Lấy 10% điểm người dẫn đầu
  | 'extra_time';     // Thêm 10s

export interface PowerUp {
  type: PowerUpType;
  name: string;
  description: string;
  cost: number;           // Điểm cần để mua
  cooldown: number;       // Thời gian chờ (ms)
  duration?: number;      // Thời gian hiệu lực (ms)
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface PlayerPowerUp {
  type: PowerUpType;
  usedAt: number;
  expiresAt?: number;
  active: boolean;
}

// ============= STREAK SYSTEM =============
export interface StreakBonus {
  streak: number;
  multiplier: number;
  bonusPoints: number;
}

export const STREAK_BONUSES: StreakBonus[] = [
  { streak: 3, multiplier: 1.2, bonusPoints: 50 },
  { streak: 5, multiplier: 1.5, bonusPoints: 100 },
  { streak: 7, multiplier: 1.8, bonusPoints: 200 },
  { streak: 10, multiplier: 2.0, bonusPoints: 500 },
];

// ============= SCORING SYSTEM =============
export interface ScoringConfig {
  basePoints: number;           // Điểm cơ bản mỗi câu
  timeBonus: boolean;            // Có tính điểm thời gian?
  timeBonusMultiplier: number;   // Hệ số điểm thời gian
  streakEnabled: boolean;        // Bật streak?
  difficultyMultiplier: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export const DEFAULT_SCORING: ScoringConfig = {
  basePoints: 100,
  timeBonus: true,
  timeBonusMultiplier: 2,
  streakEnabled: true,
  difficultyMultiplier: {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0,
  },
};

// ============= PLAYER DATA =============
export interface ModernPlayer {
  id: string;
  userId: string;
  name: string;
  photoURL?: string;
  role: PlayerRole;
  status: PlayerStatus;
  
  // Game stats
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  streak: number;                // Current streak
  maxStreak: number;             // Best streak this game
  avgResponseTime: number;       // ms
  
  // Power-ups
  powerUps: PlayerPowerUp[];
  activePowerUps: PowerUpType[];
  powerUpPoints: number;         // Điểm dùng cho power-ups
  
  // State
  isReady: boolean;
  isOnline: boolean;
  currentAnswer?: any;
  hasAnswered: boolean;
  lastAnswerTime?: number;
  
  // Connection
  joinedAt: number;
  lastActiveAt: number;
  ping?: number;
}

// ============= QUESTION STATE =============
export interface QuestionState {
  questionIndex: number;
  question: Question;
  startedAt: number;
  timeLimit: number;             // seconds
  timeRemaining: number;         // seconds
  isPaused: boolean;
  
  // Answer tracking
  answers: Record<string, PlayerAnswer>;  // playerId -> answer
  answerCount: number;
  correctCount: number;
  
  // Statistics for spectators
  answerDistribution: Record<string, string[]>;  // answerId -> playerIds[]
}

export interface PlayerAnswer {
  playerId: string;
  answer: any;                   // Depends on question type
  answeredAt: number;
  responseTime: number;          // ms
  isCorrect: boolean;
  points: number;
  streakBonus?: number;
  powerUpsUsed: PowerUpType[];
}

// ============= GAME STATE (RTDB) =============
export interface GameState {
  // Basic info
  roomId: string;
  gameId: string;
  status: GameStatus;
  
  // Quiz
  quizId: string;
  quizTitle: string;
  totalQuestions: number;
  
  // Current state
  currentQuestionIndex: number;
  currentQuestion?: QuestionState;
  
  // Players
  players: Record<string, ModernPlayer>;  // playerId -> player
  playerOrder: string[];                   // For consistent ordering
  
  // Host
  hostId: string;
  hostControls: {
    canPause: boolean;
    canSkip: boolean;
    canKick: boolean;
  };
  
  // Timing
  startedAt?: number;
  pausedAt?: number;
  finishedAt?: number;
  
  // Settings
  settings: GameSettings;
  
  // Leaderboard
  leaderboard: LeaderboardEntry[];
  
  // Events (for animations/announcements)
  events: GameEvent[];
}

export interface GameSettings {
  timePerQuestion: number;       // seconds
  showAnswerReview: boolean;     // Show review after each question
  reviewDuration: number;        // seconds
  leaderboardDuration: number;   // seconds between questions
  powerUpsEnabled: boolean;
  streakEnabled: boolean;
  spectatorMode: boolean;        // Allow spectators to join
  autoStart: boolean;            // Auto start when all ready
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  timePerQuestion: 30,
  showAnswerReview: true,
  reviewDuration: 5,
  leaderboardDuration: 3,
  powerUpsEnabled: true,
  streakEnabled: true,
  spectatorMode: true,
  autoStart: false,
};

// ============= LEADERBOARD =============
export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  photoURL?: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  accuracy: number;              // percentage
  avgResponseTime: number;       // ms
  streak: number;
  maxStreak: number;
  
  // Change indicators
  rankChange: number;            // +1, -1, 0
  scoreChange: number;           // Points gained this round
}

// ============= GAME EVENTS =============
export type GameEventType =
  | 'player_joined'
  | 'player_left'
  | 'player_ready'
  | 'game_started'
  | 'question_started'
  | 'player_answered'
  | 'question_ended'
  | 'next_question_requested'
  | 'streak_achieved'
  | 'powerup_used'
  | 'powerup_activated'
  | 'leader_changed'
  | 'game_paused'
  | 'game_resumed'
  | 'game_finished';

export interface GameEvent {
  id: string;
  type: GameEventType;
  timestamp: number;
  playerId?: string;
  playerName?: string;
  data?: any;
  
  // For UI
  priority: 'low' | 'medium' | 'high';
  showToast?: boolean;
  sound?: string;
}

// ============= RTDB PATHS =============
export const RTDB_PATHS = {
  games: (roomId: string) => `games/${roomId}`,
  gameState: (roomId: string) => `games/${roomId}/state`,
  players: (roomId: string) => `games/${roomId}/players`,
  player: (roomId: string, playerId: string) => `games/${roomId}/players/${playerId}`,
  currentQuestion: (roomId: string) => `games/${roomId}/currentQuestion`,
  answers: (roomId: string) => `games/${roomId}/currentQuestion/answers`,
  playerAnswer: (roomId: string, playerId: string) => `games/${roomId}/currentQuestion/answers/${playerId}`,
  leaderboard: (roomId: string) => `games/${roomId}/leaderboard`,
  events: (roomId: string) => `games/${roomId}/events`,
  settings: (roomId: string) => `games/${roomId}/settings`,
} as const;

// ============= ANSWER TYPES BY QUESTION TYPE =============
export type AnswerByType = {
  multiple: string;                          // answerId
  boolean: string;                           // answerId
  checkbox: string[];                        // answerIds[]
  short_answer: string;                      // text
  fill_blanks: Record<string, string>;       // blankId -> answer
  ordering: string[];                        // answerIds in order
  matching: Record<string, string>;          // leftId -> rightId
  multimedia: string;                        // answerId
};

// ============= GAME ACTIONS =============
export interface GameAction {
  type: string;
  payload?: any;
  timestamp: number;
  playerId?: string;
}

// ============= SPECTATOR VIEW DATA =============
export interface SpectatorViewData {
  question: Question;
  answerDistribution: {
    answerId: string;
    answerText: string;
    count: number;
    percentage: number;
    players: Array<{
      id: string;
      name: string;
      photoURL?: string;
      answeredAt: number;
    }>;
  }[];
  totalAnswered: number;
  totalPlayers: number;
  timeRemaining: number;
}
