export interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string; // Cho dạng chọn ảnh
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple' | 'boolean' | 'short_answer' | 'image' | 'checkbox';
  answers: Answer[];
  explanation?: string;
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  correctAnswer?: string; // Cho dạng điền từ
  acceptedAnswers?: string[]; // Cho dạng điền từ - các từ được chấp nhận
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: Question[];
  duration: number; // in minutes
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  tags: string[];
  imageUrl?: string;
  // **THÊM MỚI**: Dashboard và stats properties
  isPublic?: boolean;
  attempts?: number;
  isCompleted?: boolean;
  score?: number;
  averageScore?: number;
  totalPlayers?: number;
  status?: 'pending' | 'approved' | 'rejected'; // Trạng thái kiểm duyệt
  
  // **ADMIN FEATURES**: Enhanced admin properties
  rating?: number; // Average rating from users
  featured?: boolean; // Featured quiz
  archived?: boolean; // Archived status
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  featuredAt?: Date;
  archivedAt?: Date;
  views?: number; // Number of views
  completionRate?: number; // Percentage of users who complete the quiz
}

export interface QuizResult {
  id: string;
  quizId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  answers: UserAnswer[];
  completedAt: Date;
}

export interface UserAnswer {
  questionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
  timeSpent: number; // in seconds
}

export interface QuizStats {
  totalQuizzes: number;
  totalQuestions: number;
  categories: string[];
  averageScore: number;
  totalAttempts: number;
}

export interface QuizFilters {
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  searchTerm?: string;
  tags?: string[];
}
