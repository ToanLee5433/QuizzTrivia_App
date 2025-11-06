import { AnswerMap } from '../../types';

export interface QuizSession {
  quizId: string;
  startTime: number;
  endTime?: number;
  currentQuestionIndex: number;
  answers: AnswerMap;
  timeSpent: number;
  isCompleted: boolean;
  score?: {
    correct: number;
    total: number;
    percentage: number;
  };
}
