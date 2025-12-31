/**
 * Simplified AI Service - Only using Firebase Cloud Functions with Google Generative AI
 * Replaces complex multi-provider aiQuestionService
 * 🆕 Enhanced with prompt-based generation and multiple question types support
 * 🆕 Now supports direct file upload to Gemini (PDF, images) - multimodal
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
        language: config.language || 'vi',
        questionTypes: config.questionTypes // ⚡ Pass question types to AI
      };

      const firebaseConfig: FirebaseAIConfig = {
        temperature: config.temperature || 0.7,
        model: 'gemini-2.5-flash-lite' as const,
        maxTokens: Math.max(8000, (config.numQuestions || 5) * 800) // ⚡ ~800 tokens/question (Q + answers + explanation)
      };

      const questions = await FirebaseAIService.generateQuestions(
        firebaseConfig,
        options
      );

      // AI now generates correct question types directly
      return {
        questions: questions,
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
   * Gemini 2.5 Flash Lite supports: Text, Image, Video, Audio, PDF (multimodal)
   * File is converted to base64 and sent directly to Gemini API
   */
  async generateFromFile(
    file: File,
    config: SimpleAIConfig = {}
  ): Promise<GenerateQuestionsResponse> {
    try {
      const fileName = file.name.toLowerCase();
      const fileType = file.type;
      
      // Supported file types for Gemini 2.5 Flash Lite multimodal
      const supportedTypes = {
        pdf: ['application/pdf'],
        image: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
        // text files will be read as text
        text: ['text/plain']
      };
      
      const isPDF = supportedTypes.pdf.includes(fileType) || fileName.endsWith('.pdf');
      const isImage = supportedTypes.image.some(t => fileType.startsWith(t.split('/')[0])) || 
                      ['.png', '.jpg', '.jpeg', '.gif', '.webp'].some(ext => fileName.endsWith(ext));
      const isText = supportedTypes.text.includes(fileType) || fileName.endsWith('.txt');
      
      // Check file size (limit 20MB for Gemini)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSize) {
        return {
          questions: [],
          error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Giới hạn tối đa 20MB.`
        };
      }

      console.log('📁 Processing file:', fileName, 'Type:', fileType, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      
      if (isPDF || isImage) {
        // Convert file to base64 for Gemini multimodal
        console.log('🔄 Converting file to base64 for Gemini multimodal...');
        
        const base64Data = await this.fileToBase64(file);
        const mimeType = isPDF ? 'application/pdf' : fileType;
        
        console.log('✅ File converted. Sending to Gemini API...');
        
        // Call Firebase Function with file data
        return await this.generateFromFileData(base64Data, mimeType, fileName, config);
        
      } else if (isText) {
        // For text files, read content and use prompt-based generation
        const text = await file.text();
        if (text.trim().length < 50) {
          return {
            questions: [],
            error: 'Nội dung file quá ngắn. Vui lòng chọn file có nhiều nội dung hơn.'
          };
        }
        
        const contextPrompt = `Dựa trên nội dung tài liệu sau đây, hãy tạo các câu hỏi quiz:

=== NỘI DUNG TÀI LIỆU (${fileName}) ===
${text.substring(0, 100000)}
=== HẾT NỘI DUNG ===

Yêu cầu: Tạo câu hỏi bám sát nội dung tài liệu trên.`;
        
        return this.generateFromPrompt(contextPrompt, config);
        
      } else {
        return {
          questions: [],
          error: `Định dạng file không được hỗ trợ (${fileType}). Gemini hỗ trợ: PDF, PNG, JPG, GIF, WEBP, TXT`
        };
      }
      
    } catch (error) {
      console.error('Error generating questions from file:', error);
      return {
        questions: [],
        error: error instanceof Error ? error.message : 'Không thể xử lý file. Vui lòng thử lại.'
      };
    }
  }

  /**
   * Convert File to base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generate questions from file data (base64) using Gemini multimodal
   */
  private async generateFromFileData(
    base64Data: string,
    mimeType: string,
    fileName: string,
    config: SimpleAIConfig = {}
  ): Promise<GenerateQuestionsResponse> {
    try {
      // 🆕 Build content with user's additional instructions if provided
      let contentPrompt = `Phân tích file "${fileName}" và tạo câu hỏi quiz dựa trên nội dung.`;
      
      if (config.topic) {
        contentPrompt += `\n\nYÊU CẦU BỔ SUNG TỪ NGƯỜI DÙNG: ${config.topic}`;
      }

      const options: QuestionGenerationOptions = {
        content: contentPrompt,
        numQuestions: config.numQuestions || 5,
        difficulty: config.difficulty || 'medium',
        language: config.language || 'vi',
        questionTypes: config.questionTypes,
        // 🆕 Pass file data for multimodal
        fileData: {
          base64: base64Data,
          mimeType: mimeType,
          fileName: fileName
        }
      };

      const firebaseConfig: FirebaseAIConfig = {
        temperature: config.temperature || 0.7,
        model: 'gemini-2.5-flash-lite' as const,
        maxTokens: Math.max(16000, (config.numQuestions || 5) * 1000) // More tokens for file analysis
      };

      const questions = await FirebaseAIService.generateQuestions(
        firebaseConfig,
        options
      );

      return {
        questions: questions,
        error: undefined
      };
    } catch (error) {
      console.error('Error generating questions from file data:', error);
      return {
        questions: [],
        error: error instanceof Error ? error.message : 'Không thể tạo câu hỏi từ file'
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
