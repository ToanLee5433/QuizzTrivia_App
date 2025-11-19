// Type definitions for modern multiplayer components

// import { ReactNode } from 'react';

// Room Data Types
export interface RoomData {
  code: string;
  hostId: string;
  quizId: string;
  settings: RoomSettings;
  state: 'lobby' | 'countdown' | 'playing' | 'finished';
  currentQuestionIndex?: number;
  startTime?: number;
}

export interface RoomSettings {
  timeLimit: number; // 10-120 seconds
  showLeaderboard: boolean;
  allowLateJoin: boolean;
  showIntermediateLeaderboard: boolean;
  enablePowerUps: boolean;
  musicVolume: number; // 0-100
  musicTrack: 'chill' | 'energetic' | 'intense';
}

// Player Types
export interface Player {
  id: string;
  username: string;
  avatarEmoji?: string;
  avatarColor?: string;
  score: number;
  isReady: boolean;
  isHost: boolean;
  answers: PlayerAnswer[];
  powerUpsUsed: PowerUpUsage;
  streak: number;
}

export interface PlayerAnswer {
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  timeSpent: number; // seconds
  pointsEarned: number;
  timestamp: number;
}

export interface PowerUpUsage {
  '50-50': boolean;
  'x2-score': boolean;
  'freeze-time': boolean;
}

// Question Types
export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  imageUrl?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
}

// Power-Up Types
export type PowerUpType = '50-50' | 'x2-score' | 'freeze-time';

export interface PowerUp {
  type: PowerUpType;
  available: boolean;
  used: boolean;
  description: string;
  icon: string;
}

// Leaderboard Types
export interface LeaderboardEntry extends Player {
  rank: number;
  correctAnswers: number;
  totalAnswers: number;
  accuracy: number; // percentage
  averageTime: number; // seconds
  rankChange?: number; // for intermediate leaderboard
}

// Component Props
export interface ModernLobbyProps {
  roomData: RoomData;
  currentUserId: string;
  isHost: boolean;
  onLeaveRoom: () => void;
  multiplayerService: any; // Replace with actual service type
}

export interface ModernQuizGameProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  timeLimit: number;
  onAnswer: (optionIndex: number, timeSpent: number) => void;
  enablePowerUps: boolean;
  showIntermediateLeaderboard: boolean;
  leaderboard: LeaderboardEntry[];
  currentPlayer: Player;
  powerUps: PowerUp[];
  onUsePowerUp: (type: PowerUpType) => void;
}

export interface FinalPodiumProps {
  players: Player[];
  currentPlayerId: string;
  onPlayAgain: () => void;
  onViewReport: () => void;
  onShareResult: () => void;
  onBackToLobby: () => void;
}

// Animation Types
export interface AnimationConfig {
  duration?: number;
  delay?: number;
  ease?: string | number[];
  repeat?: number;
  repeatType?: 'loop' | 'reverse' | 'mirror';
}

// Game State Types
export interface GameState {
  phase: 'waiting' | 'countdown' | 'question' | 'result' | 'leaderboard' | 'finished';
  currentQuestionIndex: number;
  timeRemaining: number;
  playersAnswered: number;
  totalPlayers: number;
}

// Real-time Update Types
export interface RealtimeUpdate {
  type: 'player-joined' | 'player-left' | 'answer-submitted' | 'game-state-changed' | 'settings-updated';
  data: any;
  timestamp: number;
}

// Result Types
export interface QuestionResult {
  questionIndex: number;
  isCorrect: boolean;
  correctAnswer: number;
  selectedAnswer: number;
  timeSpent: number;
  pointsEarned: number;
  explanation?: string;
}

// Settings Modal Types
export interface AdvancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RoomSettings;
  onSettingsChange: (newSettings: Partial<RoomSettings>) => void;
  isHost: boolean;
}

// Music Types
export type MusicTrack = 'chill' | 'energetic' | 'intense';

export interface MusicConfig {
  track: MusicTrack;
  volume: number;
  isPlaying: boolean;
}

// Avatar Types
export const AVATAR_EMOJIS = [
  '😀', '😎', '🤓', '🥳', '🤩', '😇', '🤠', '🥸',
  '🦁', '🐯', '🐻', '🐼', '🐨', '🐸', '🐵', '🦊',
  '🚀', '⭐', '🔥', '💎', '👑', '🎮', '🎯', '🏆'
] as const;

export const AVATAR_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316'  // Amber
] as const;

export type AvatarEmoji = typeof AVATAR_EMOJIS[number];
export type AvatarColor = typeof AVATAR_COLORS[number];

// Answer Button Types
export const ANSWER_COLORS = ['#EF4444', '#3B82F6', '#FBBF24', '#10B981'] as const; // Red, Blue, Yellow, Green
export const ANSWER_SHAPES = ['△', '◆', '●', '□'] as const; // Triangle, Diamond, Circle, Square

export type AnswerColor = typeof ANSWER_COLORS[number];
export type AnswerShape = typeof ANSWER_SHAPES[number];

// Statistics Types
export interface PlayerStatistics {
  totalGamesPlayed: number;
  totalCorrectAnswers: number;
  totalQuestions: number;
  averageAccuracy: number;
  averageTime: number;
  powerUpsUsedCount: {
    '50-50': number;
    'x2-score': number;
    'freeze-time': number;
  };
  highestScore: number;
  longestStreak: number;
}

// Confetti Configuration
export interface ConfettiConfig {
  particleCount: number;
  spread: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
  angle?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  drift?: number;
  ticks?: number;
  shapes?: ('square' | 'circle')[];
  scalar?: number;
}

// Error Types
export interface GameError {
  code: string;
  message: string;
  timestamp: number;
  context?: any;
}

// Export utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];
