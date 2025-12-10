// Feedback Types
export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other';
export type FeedbackStatus = 'pending' | 'in-progress' | 'resolved' | 'closed';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: FeedbackType;
  subject: string;
  description: string;
  richDescription?: string; // Rich text HTML content
  screenshots?: string[]; // URLs to uploaded images
  status: FeedbackStatus;
  priority: FeedbackPriority;
  adminResponse?: string;
  adminResponseBy?: string;
  adminResponseAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface CreateFeedbackInput {
  type: FeedbackType;
  subject: string;
  description: string;
  richDescription?: string;
  screenshots?: File[];
}

export interface UpdateFeedbackInput {
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  adminResponse?: string;
}

export interface FeedbackStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  closed: number;
  byType: Record<FeedbackType, number>;
  byPriority: Record<FeedbackPriority, number>;
}
