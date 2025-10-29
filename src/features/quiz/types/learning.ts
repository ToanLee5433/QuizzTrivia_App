/**
 * Learning Materials System Types
 * Hỗ trợ xem tài liệu trước khi làm bài trắc nghiệm
 */

/**
 * Loại tài liệu học tập
 */
export type ResourceType = 'video' | 'pdf' | 'image' | 'audio' | 'link' | 'slides';

/**
 * Learning Outcome - Mục tiêu học tập
 */
export interface LearningOutcome {
  id: string;
  code: string; // LO1, LO2, LO3...
  title: string;
  description: string;
}

/**
 * Ngưỡng hoàn thành cho từng loại tài liệu
 */
export interface ResourceThreshold {
  // Video thresholds
  minWatchSec?: number; // Tối thiểu X giây
  minWatchPercent?: number; // Tối thiểu X% video (0-100)
  
  // PDF thresholds
  minPages?: number; // Tối thiểu X trang
  mustReachLastPage?: boolean; // Phải đọc đến trang cuối
  minTimePerPage?: number; // Tối thiểu X giây/trang (default: 1.5s)
  
  // Image/Slides thresholds
  minViewedCount?: number; // Tối thiểu X ảnh/slide
  minViewTime?: number; // Tối thiểu X giây xem mỗi ảnh
  
  // Link thresholds
  requireConfirm?: boolean; // Yêu cầu tick "đã đọc"
  miniCheck?: MiniCheck; // Câu hỏi kiểm tra nhanh
}

/**
 * Câu hỏi kiểm tra nhanh cho external links
 */
export interface MiniCheck {
  questions: MiniCheckQuestion[];
  passingScore: number; // Điểm tối thiểu để pass (ví dụ: 1/1, 2/3)
}

export interface MiniCheckQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index của đáp án đúng
}

/**
 * Tài liệu học tập
 */
export interface LearningResource {
  id: string;
  type: ResourceType;
  title: string;
  description?: string;
  url: string;
  
  // Cấu hình
  required: boolean; // Bắt buộc phải xem
  threshold: ResourceThreshold;
  learningOutcomes: string[]; // LO IDs liên quan
  
  // Metadata
  duration?: number; // Video duration (seconds)
  totalPages?: number; // PDF total pages
  totalSlides?: number; // Slide count
  estimatedTime?: number; // Thời gian ước tính (phút)
  
  // Display
  order: number; // Thứ tự hiển thị
  thumbnailUrl?: string;
  whyWatch?: string; // "Vì sao xem phần này?" - gợi ý cho learner
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tiến độ xem tài liệu của cá nhân
 */
export interface ResourceViewProgress {
  resourceId: string;
  
  // Completion status
  completed: boolean;
  completedAt?: Date;
  
  // Video tracking
  secondsWatched?: number;
  watchPercent?: number; // 0-100
  lastWatchPosition?: number; // Last video position (seconds)
  playbackSpeeds?: number[]; // Tốc độ phát (để detect >2x)
  
  // PDF tracking
  pagesViewed?: number[]; // Array of page numbers viewed
  pageViewTimes?: Record<number, number>; // Page number → time spent (seconds)
  
  // Image/Slides tracking
  imagesViewed?: number[]; // Array of image indices viewed
  imageViewTimes?: Record<number, number>; // Image index → time spent
  
  // Link tracking
  confirmed?: boolean; // Đã tick "đã đọc"
  miniCheckScore?: number; // Điểm mini-check (0-100)
  miniCheckAnswers?: number[]; // User answers
  
  // Anti-cheating
  tabFocusTime?: number; // Tổng thời gian tab ở foreground
  totalTime?: number; // Tổng thời gian (bao gồm background)
  suspiciousActivity?: string[]; // Log các hành vi đáng ngờ
  
  // Timestamps
  startedAt: Date;
  lastActivityAt: Date;
}

/**
 * Session học tập của user cho một quiz
 */
export interface LearningSession {
  id: string;
  userId: string;
  quizId: string;
  
  // Progress
  viewedResources: Record<string, ResourceViewProgress>; // resourceId → progress
  
  // Gating status
  ready: boolean; // Đủ điều kiện bắt đầu quiz
  readyAt?: Date;
  
  // Stats
  totalResourcesRequired: number;
  completedResourcesRequired: number;
  completionPercent: number; // 0-100
  
  // Timestamps
  startedAt: Date;
  lastActivityAt: Date;
  updatedAt: Date;
}

/**
 * Kết quả phân tích sau khi làm bài
 */
export interface LearningAnalytics {
  userId: string;
  quizId: string;
  
  // Correlation giữa xem tài liệu và điểm
  watchedAllRequired: boolean;
  watchedAllRecommended: boolean;
  quizScore: number;
  
  // LO Performance
  loPerformance: Record<string, {
    loId: string;
    correct: number;
    total: number;
    percentage: number;
    relatedResources: string[]; // Resource IDs
  }>;
  
  // Recommendations
  recommendedReview: string[]; // Resource IDs nên xem lại
  
  // Timestamps
  completedAt: Date;
}

/**
 * Instructor Analytics - Dashboard cho giảng viên
 */
export interface InstructorAnalytics {
  quizId: string;
  
  // Resource completion stats
  resourceStats: Record<string, {
    resourceId: string;
    totalViews: number;
    completionRate: number; // %
    avgTimeSpent: number; // seconds
    avgScore?: number; // Score của users đã xem resource này
  }>;
  
  // LO correlation
  loCorrelation: Record<string, {
    loId: string;
    relatedResources: string[];
    avgScoreWithResources: number;
    avgScoreWithoutResources: number;
    improvement: number; // % improvement
  }>;
  
  // Heatmap data
  heatmap: {
    resourceId: string;
    loId: string;
    errorReduction: number; // % giảm tỷ lệ sai
  }[];
  
  // A/B Testing results
  abTests?: {
    testId: string;
    variants: {
      variant: string;
      threshold: any;
      avgScore: number;
      completionRate: number;
    }[];
  }[];
  
  updatedAt: Date;
}

/**
 * Config cho gating behavior
 */
export interface GatingConfig {
  mode: 'strict' | 'soft' | 'none';
  // strict: Không thể vào bài nếu chưa đạt required
  // soft: Có thể vào nhưng có cảnh báo + điểm trừ nhỏ
  // none: Chỉ khuyến nghị, không ép buộc
  
  softPenalty?: number; // Điểm trừ nếu vào mà chưa đạt (soft mode)
  showWarning?: boolean; // Hiển thị cảnh báo
  warningMessage?: string;
}

/**
 * Event tracking cho analytics
 */
export interface LearningEvent {
  id: string;
  userId: string;
  quizId: string;
  resourceId: string;
  
  eventType: 
    | 'resource_started'
    | 'resource_viewed'
    | 'resource_completed'
    | 'video_play'
    | 'video_pause'
    | 'video_seek'
    | 'video_speed_change'
    | 'pdf_page_view'
    | 'pdf_scroll'
    | 'image_view'
    | 'link_visit'
    | 'link_confirm'
    | 'mini_check_attempt'
    | 'mini_check_pass'
    | 'tab_blur'
    | 'tab_focus';
  
  metadata?: Record<string, any>;
  timestamp: Date;
}
