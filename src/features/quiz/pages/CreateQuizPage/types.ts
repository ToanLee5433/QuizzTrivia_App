import { LearningResource } from '../../types/learning';

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
  
  // 🆕 Quiz Type
  quizType?: 'with-materials' | 'standard';
  
  // 🆕 Learning Materials
  resources?: LearningResource[];
  learningResources?: LearningResource[]; // Alias for backward compatibility
  
  // 🔒 Have Password Settings (Simplified)
  havePassword?: 'public' | 'password'; // public: hiện trong list, vào ngay | password: hiện trong list, cần password
  password?: string; // Required for password-protected quizzes
  
  // 📝 Draft System
  status?: 'draft' | 'pending' | 'approved' | 'rejected'; // draft: bản nháp, pending: chờ duyệt, approved: đã duyệt, rejected: bị từ chối
  isDraft?: boolean; // Helper flag for quick checks
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
