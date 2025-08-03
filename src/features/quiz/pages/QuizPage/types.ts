export interface QuizSession {
  quizId: string;
  startTime: number;
  endTime?: number;
  currentQuestionIndex: number;
  answers: Record<string, any>;
  timeSpent: number;
  isCompleted: boolean;
  score?: {
    correct: number;
    total: number;
    percentage: number;
  };
}
