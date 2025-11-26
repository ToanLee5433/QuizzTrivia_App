/**
 * 📊 Data Models for RAG Chatbot
 */

// Chunk metadata stored in index
export interface ChunkMetadata {
  chunkId: string;
  text: string;
  title: string;
  
  // Source information
  sourceType: 'pdf' | 'web' | 'quiz' | 'note';
  url?: string;
  page?: number;
  
  // Permission control
  visibility: 'public' | 'password';
  quizId?: string; // For password-protected quiz content
  
  // Timestamps
  createdAt: number;
  updatedAt?: number;
  
  // Hash for change detection
  contentHash: string;
}

// Chunk with vector embedding
export interface IndexedChunk extends ChunkMetadata {
  embedding: number[]; // 768-dimensional vector for text-embedding-004
}

// Citation in response
export interface Citation {
  title: string;
  page?: number;
  url?: string;
  quizId?: string;
  snippet?: string; // Short excerpt from chunk
}

// Quiz recommendation with full details
export interface QuizRecommendation {
  quizId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  difficulty?: string;
  category?: string;
  questionCount?: number;
  averageRating?: number;      // Số sao đánh giá trung bình (0-5)
  totalAttempts?: number;      // Số lượt làm quiz
  viewCount?: number;          // Số lượt xem quiz
  averageScore?: number;       // Điểm trung bình của người làm (0-100)
  hasPassword?: boolean;       // Quiz requires password to access
}

// RAG request
export interface RAGRequest {
  userId: string;
  question: string;
  topK?: number; // Default: 4
  targetLang?: 'vi' | 'en'; // Default: 'vi'
  includeHistory?: boolean; // Multi-turn conversation (future)
}

// RAG response
export interface RAGResponse {
  answer: string;
  citations: Citation[];
  usedChunks: number; // Number of chunks used in response
  confidence?: number; // 0-1, based on similarity scores
  quizRecommendations?: QuizRecommendation[]; // Recommended quizzes based on question
  
  // Metadata
  processingTime: number; // milliseconds
  tokensUsed?: {
    input: number;
    output: number;
  };
  
  // Search metrics (NEW in v3.0)
  searchMetrics?: {
    fastPathUsed: boolean;
    avgScore: number;
    topScore: number;
    confidence: 'high' | 'medium' | 'low' | 'none';
    rewriteQueries?: string[];
    intent?: 'fact_retrieval' | 'learning_path' | 'quiz_search' | 'general_chat';
    learningPath?: {
      enabled: boolean;
      topic: string;
      subTopics: string[];
      learningOrder?: string[];
    };
  };
}

// Index file structure
export interface VectorIndex {
  version: string;
  createdAt: number;
  totalChunks: number;
  chunks: IndexedChunk[];
  
  // Metadata
  sources: {
    [sourceType: string]: number; // Count by type
  };
}

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string; // Why denied
  missingQuizId?: string;
}
