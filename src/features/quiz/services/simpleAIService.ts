/**
 * Simplified AI Service - Only using Firebase Cloud Functions with Google Generative AI
 * Replaces complex multi-provider aiQuestionService
 * 🆕 Enhanced with prompt-based generation and multiple question types support
 */

import { Question, QuestionType } from '../types';
import { FirebaseAIService, FirebaseAIConfig, QuestionGenerationOptions } from './firebaseAIService';

export interface SimpleAIConfig {
  numQuestions?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  language?: 'vi' | 'en';
  questionTypes?: QuestionType[]; // 🆕 Support all question types
  temperature?: number;
  includeExplanations?: boolean;
  topic?: string; // 🆕 Specific topic/subject
}

export interface GenerateQuestionsResponse {
  questions: Question[];
  error?: string;
}

/**
 * Simple AI Service - Just wraps Firebase AI Service
 * 🆕 Enhanced for prompt-based generation
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
   * 🆕 Generate questions from prompt (without file upload)
   * Supports: multiple, boolean, short_answer, ordering, matching, fill_blanks, audio
   */
  async generateFromPrompt(
    prompt: string,
    config: SimpleAIConfig = {}
  ): Promise<GenerateQuestionsResponse> {
    try {
      if (!prompt || prompt.trim().length < 10) {
        return {
          questions: [],
          error: 'Prompt must be at least 10 characters long'
        };
      }

      const options: QuestionGenerationOptions = {
        content: prompt,
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

      // 🆕 Filter by question types if specified
      let filteredQuestions = questions;
      if (config.questionTypes && config.questionTypes.length > 0) {
        filteredQuestions = questions.filter(q => 
          config.questionTypes!.includes(q.type)
        );
      }

      return {
        questions: filteredQuestions,
        error: undefined
      };
    } catch (error) {
      console.error('Error generating questions from prompt:', error);
      return {
        questions: [],
        error: error instanceof Error ? error.message : 'Cannot generate questions from prompt'
      };
    }
  }

  /**
   * Generate questions using Firebase Cloud Functions (Google Generative AI)
   * Legacy method - now calls generateFromPrompt
   */
  async generateQuestions(
    content: string,
    config: SimpleAIConfig = {}
  ): Promise<GenerateQuestionsResponse> {
    return this.generateFromPrompt(content, config);
  }

  /**
   * 🆕 Generate questions from uploaded file
   * Supports: Images, PDF, DOCX, TXT
   */
  async generateFromFile(
    file: File,
    config: SimpleAIConfig = {}
  ): Promise<GenerateQuestionsResponse> {
    try {
      // For now, we'll extract text from file and use generateFromPrompt
      // In production, you would upload to Firebase Storage and use Vision API for images
      
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      
      let extractedText = '';
      
      // Handle different file types
      if (fileType.startsWith('image/')) {
        // For images, we'll create a prompt asking AI to analyze
        extractedText = `Analyze this image file: ${fileName}. Create educational quiz questions based on the visual content. If the image contains text, include questions about that text. Focus on important concepts and details visible in the image.`;
      } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        extractedText = `Analyze this PDF document: ${fileName}. Create quiz questions based on the document's content. Cover key concepts, definitions, and important information from the document.`;
      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileType === 'application/msword' ||
        fileName.endsWith('.docx') ||
        fileName.endsWith('.doc')
      ) {
        extractedText = `Analyze this Word document: ${fileName}. Create quiz questions based on the document's content. Focus on main ideas, key points, and important details from the text.`;
      } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        // For text files, we can actually read the content
        try {
          const text = await file.text();
          extractedText = text;
        } catch (error) {
          console.error('Error reading text file:', error);
          extractedText = `Analyze the content of text file: ${fileName}`;
        }
      } else {
        return {
          questions: [],
          error: `Unsupported file type: ${fileType}`
        };
      }

      // Use the extracted text/prompt to generate questions
      return this.generateFromPrompt(extractedText, config);
      
    } catch (error) {
      console.error('Error generating questions from file:', error);
      return {
        questions: [],
        error: error instanceof Error ? error.message : 'Cannot generate questions from file'
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
