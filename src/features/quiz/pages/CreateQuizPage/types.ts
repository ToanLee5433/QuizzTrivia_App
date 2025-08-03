// Kiểu dữ liệu cho câu hỏi
export interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string; // Cho dạng chọn ảnh
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple' | 'boolean' | 'short_answer' | 'image';
  answers: Answer[];
  explanation?: string;
  points: number;
  imageUrl?: string;
  correctAnswer?: string; // Cho dạng điền từ
  acceptedAnswers?: string[]; // Cho dạng điền từ - các từ được chấp nhận
}

export interface QuizFormData {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  imageUrl?: string;
  questions: Question[];
  tags?: string[];
  isPublic?: boolean;
  allowRetake?: boolean;
}

export interface SortableItemProps {
  id: string;
  index: number;
  question: Question;
  onUpdate: (question: Question) => void;
  onDelete: () => void;
  moveQuestion: (fromIndex: number, toIndex: number) => void;
  totalQuestions: number;
}
