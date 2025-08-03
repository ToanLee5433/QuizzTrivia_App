export interface QuizReview {
  id: string;
  quizId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  helpful: string[]; // Array of user IDs who found this review helpful
  reported: string[]; // Array of user IDs who reported this review
}

export interface QuizReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface CreateReviewData {
  quizId: string;
  rating: number;
  comment: string;
}

export interface UpdateReviewData {
  rating?: number;
  comment?: string;
}
