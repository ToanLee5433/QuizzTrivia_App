import { Question } from '../../types';

// Utility function để kiểm tra đáp án điền từ
export const checkShortAnswer = (userAnswer: string, question: Question): boolean => {
  if (question.type !== 'short_answer') return false;
  
  const normalizeAnswer = (answer: string) => 
    answer.trim().toLowerCase().replace(/\s+/g, ' ');
  
  const normalizedUserAnswer = normalizeAnswer(userAnswer);
  
  // Kiểm tra với correctAnswer
  if (question.correctAnswer && normalizeAnswer(question.correctAnswer) === normalizedUserAnswer) {
    return true;
  }
  
  // Kiểm tra với acceptedAnswers
  if (question.acceptedAnswers) {
    return question.acceptedAnswers.some(accepted => 
      normalizeAnswer(accepted) === normalizedUserAnswer
    );
  }
  
  return false;
};
