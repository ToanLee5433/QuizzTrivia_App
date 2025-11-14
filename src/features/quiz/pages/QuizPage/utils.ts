import { Question, AnswerValue } from '../../types';

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

export const isAnswerProvided = (answer?: AnswerValue): boolean => {
  if (answer === undefined || answer === null) {
    return false;
  }

  if (Array.isArray(answer)) {
    return answer.length > 0;
  }

  if (typeof answer === 'string') {
    return answer.trim().length > 0;
  }

  return true;
};
