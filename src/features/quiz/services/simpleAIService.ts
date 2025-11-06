/**
 * Simplified AI Service - Only using Firebase Cloud Functions with Google Generative AI
 * Replaces complex multi-provider aiQuestionService
 */

import { Question } from '../types';
import { FirebaseAIService, FirebaseAIConfig, QuestionGenerationOptions } from './firebaseAIService';

export interface SimpleAIConfig {
  numQuestions?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  language?: 'vi' | 'en';
  questionTypes?: ('multiple' | 'boolean' | 'short_answer')[];
  temperature?: number;
}

export interface GenerateQuestionsResponse {
  questions: Question[];
  error?: string;
}

/**
 * Simple AI Service - Just wraps Firebase AI Service
 */
class SimpleAIService {
  private static instance: SimpleAIService;
  
  static getInstance(): SimpleAIService {
    if (!SimpleAIService.instance) {
      SimpleAIService.instance = new SimpleAIService();
    }
    return SimpleAIService.instance;
  }

  /**
   * Generate questions using Firebase Cloud Functions (Google Generative AI)
   */
  async generateQuestions(
    content: string,
    config: SimpleAIConfig = {}
  ): Promise<GenerateQuestionsResponse> {
    try {
      const options: QuestionGenerationOptions = {
        content,
        numQuestions: config.numQuestions || 5,
        difficulty: config.difficulty || 'medium',
        language: config.language || 'vi'
      };

      const firebaseConfig: FirebaseAIConfig = {
        temperature: config.temperature || 0.7,
        model: 'gemini-2.0-flash-exp' as const
      };

      const questions = await FirebaseAIService.generateQuestions(
        firebaseConfig,
        options
      );

      return {
        questions,
        error: undefined
      };
    } catch (error) {
      console.error('Error generating questions:', error);
      return {
        questions: [],
        error: error instanceof Error ? error.message : 'Không thể tạo câu hỏi'
      };
    }
  }

  /**
   * Test AI availability
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const isAvailable = await FirebaseAIService.checkAvailability();
      
      if (isAvailable) {
        return {
          success: true,
          message: 'Firebase AI đã sẵn sàng!'
        };
      } else {
        return {
          success: false,
          message: 'Vui lòng đăng nhập để sử dụng AI'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Không thể kết nối AI'
      };
    }
  }
}

export const simpleAIService = SimpleAIService.getInstance();
export default simpleAIService;
