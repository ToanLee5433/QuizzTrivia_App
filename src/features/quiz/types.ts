export interface Answer {
  id: string;
  text: string;
  richText?: string; // Rich text content with HTML
  isCorrect: boolean;
  imageUrl?: string; // Cho dạng chọn ảnh
  audioUrl?: string; // For audio answers
  videoUrl?: string; // For video answers
}

export interface Question {
  id: string;
  text: string;
  richText?: string; // Rich text content with HTML for question
  type: 'multiple' | 'boolean' | 'short_answer' | 'image' | 'checkbox' | 'rich_content';
  answers: Answer[];
  explanation?: string;
  richExplanation?: string; // Rich text explanation
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  correctAnswer?: string; // Cho dạng điền từ
  acceptedAnswers?: string[]; // Cho dạng điền từ - các từ được chấp nhận
  imageUrl?: string; // Question image
  audioUrl?: string; // Question audio
  videoUrl?: string; // Question video
  attachments?: Array<{ // Multiple attachments
    type: 'image' | 'audio' | 'video';
    url: string;
    name?: string;
    description?: string;
  }>;
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
