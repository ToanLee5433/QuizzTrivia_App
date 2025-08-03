import { Question } from './types';

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

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

// Utility để tạo accepted answers tự động
export const generateAcceptedAnswers = (correctAnswer: string): string[] => {
  if (!correctAnswer.trim()) return [];
  
  const answer = correctAnswer.trim();
  const accepted = [
    answer, // Nguyên văn
    answer.toLowerCase(), // Chữ thường
    answer.toUpperCase(), // Chữ hoa
    answer.charAt(0).toUpperCase() + answer.slice(1).toLowerCase(), // Capitalize
    // Loại bỏ dấu (nếu có)
    answer.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    answer.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  ];
  
  // Loại bỏ trùng lặp và rỗng
  return [...new Set(accepted)].filter(v => v.trim() !== '');
};
