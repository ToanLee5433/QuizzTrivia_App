export interface Answer {
  id: string;
  text: string;
  richText?: string; // Rich text content with HTML
  isCorrect: boolean;
  imageUrl?: string; // Cho dạng chọn ảnh
  audioUrl?: string; // For audio answers
  videoUrl?: string; // For video answers
}

export type AnswerValue = string | string[] | number | boolean | null;

export type AnswerMap = Record<string, AnswerValue>;

// 🎯 Extended Question Types
export type QuestionType = 
  | 'multiple'      // Multiple choice (single answer)
  | 'boolean'       // True/False
  | 'short_answer'  // Short text answer
  | 'image'         // Image-based multiple choice
  | 'checkbox'      // Multiple choice (multiple answers)
  | 'rich_content'  // Rich text content question
  | 'audio'         // Audio listening comprehension
  | 'video'         // Video watching comprehension
  | 'ordering'      // Order items in correct sequence
  | 'matching'      // Match pairs (drag & drop)
  | 'fill_blanks';  // Fill in the blanks (cloze test / Essay)

// For ordering questions
export interface OrderingItem {
  id: string;
  text: string;
  correctOrder: number; // 0-based index
  imageUrl?: string;
}

// For matching questions
export interface MatchingPair {
  id: string;
  left: string;      // Left side item
  right: string;     // Right side item (correct match)
  leftImageUrl?: string;
  rightImageUrl?: string;
}

// For fill in the blanks
export interface BlankItem {
  id: string;
  position: number;  // Position in text (0-based)
  correctAnswer: string;
  acceptedAnswers?: string[]; // Alternative correct answers
  caseSensitive?: boolean;
}

export interface Question {
  id: string;
  text: string;
  richText?: string; // Rich text content with HTML for question
  type: QuestionType;
  answers: Answer[];
  explanation?: string;
  richExplanation?: string; // Rich text explanation
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  
  // For short_answer & fill_blanks
  correctAnswer?: string;
  acceptedAnswers?: string[];
  
  // Media attachments
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  attachments?: Array<{
    type: 'image' | 'audio' | 'video';
    url: string;
    name?: string;
    description?: string;
  }>;
  
  // 🆕 For advanced question types
  orderingItems?: OrderingItem[];      // For 'ordering' type
  matchingPairs?: MatchingPair[];      // For 'matching' type
  blanks?: BlankItem[];                // For 'fill_blanks' type
  textWithBlanks?: string;             // Template text with {blank} markers
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  author?: string;
  authorId?: string;
  coverImage?: string;
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
  
  // **QUIZ TYPE**: Type of quiz
  quizType?: 'with-materials' | 'standard';
  
  // **LEARNING RESOURCES**: Tài liệu học tập
  resources?: Array<{
    id: string;
    type: 'video' | 'pdf' | 'image' | 'link' | 'slides';
    title: string;
    description?: string;
    url: string;
    required: boolean;
    thumbnailUrl?: string;
    whyWatch?: string;
    estimatedTime?: number;
    order?: number;
  }>;
  
  // **THÊM MỚI**: Dashboard và stats properties
  isPublic?: boolean;
  allowRetake?: boolean;
  attempts?: number;
  isCompleted?: boolean;
  score?: number;
  averageScore?: number;
  totalPlayers?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'draft'; // Trạng thái kiểm duyệt
  visibility?: 'public' | 'private' | 'unlisted' | 'password';
  havePassword?: boolean | 'password';
  
  // **PRIVACY SETTINGS**: Advanced privacy controls
  privacy?: 'public' | 'unlisted' | 'private' | 'password-protected';
  password?: string; // Encrypted password for password-protected quizzes
  
  // 🔒 Password Protection Data
  pwd?: {
    enabled: boolean;
    algo: string;
    salt: string;
    hash: string;
  };
  
  allowedUsers?: string[]; // User IDs who can access private quiz
  shareToken?: string; // Unique token for sharing unlisted/private quizzes
  expiresAt?: Date; // Expiration date for shared links
  
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
  
  // **EDIT WORKFLOW**: Quiz edit approval workflow
  canEdit?: boolean; // Whether creator can edit this quiz
  needsReApproval?: boolean; // Whether quiz needs re-approval after edit
  isApproved?: boolean; // Quick approval status check
  resubmittedAt?: Date; // When quiz was resubmitted after edit
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
