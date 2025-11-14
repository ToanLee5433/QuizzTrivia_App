import { LearningResource } from '../../types/learning';
import { Question as GlobalQuestion, QuestionType } from '../../types'; // 🔧 Import from global types

// Re-export for backward compatibility
export type Question = GlobalQuestion;
export type { QuestionType };

// Legacy Answer type (kept for compatibility)
export interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string;
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
