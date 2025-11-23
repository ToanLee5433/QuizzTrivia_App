export interface ResultState {
  score: number;
  correct: number;
  total: number;
  answers: Record<string, string>;
  isTimeUp?: boolean;
  timeSpent?: number;
  quizId?: string;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhotoURL?: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  completedAt: Date | string;
  isCurrentAttempt?: boolean; // Flag to mark the current/latest attempt
}
