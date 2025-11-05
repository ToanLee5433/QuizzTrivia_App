// Firebase AI Service using Google Generative AI (Gemini)
// Service để tạo câu hỏi tự động bằng AI

import { Question } from '../types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

export interface FirebaseAIConfig {
  model?: 'gemini-2.0-flash-exp' | 'gemini-pro' | 'gemini-pro-vision';
  temperature?: number;
  maxTokens?: number;
}

export interface QuestionGenerationOptions {
  content: string;
  customPrompt?: string;
  numQuestions?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  language?: 'vi' | 'en';
  questionTypes?: ('multiple' | 'true-false' | 'fill-in-blank')[];
}

/**
 * Firebase AI Service using Google Generative AI (Gemini)
 */
export class FirebaseAIService {
  private static functions = getFunctions();
  
  static async generateQuestions(
    config: FirebaseAIConfig = {},
    options: QuestionGenerationOptions
  ): Promise<Question[]> {
    const { 
      content, 
      customPrompt, 
      numQuestions = 5, 
      difficulty = 'mixed', 
      language = 'vi' 
    } = options;

    // Kiểm tra xác thực
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('Vui lòng đăng nhập để sử dụng tính năng AI');
    }

    try {
      // Tạo system prompt
      const systemPrompt = customPrompt || this.getDefaultPrompt(numQuestions, difficulty, language);
      
      // Gọi Firebase Function
      const generateQuestions = httpsCallable(this.functions, 'generateQuestions');
      
      const result = await generateQuestions({
        prompt: systemPrompt,
        content: content,
        config: {
          model: config.model || 'gemini-2.0-flash-exp',
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 2000
        }
      });

      const data = result.data as any;
      
      if (!data.success) {
        throw new Error(data.error || 'AI generation failed');
      }

      return this.parseQuestionsFromResponse(data.questions);
    } catch (error) {
      console.error('Firebase AI Service Error:', error);
      throw new Error(`Không thể tạo câu hỏi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Tạo prompt mặc định cho việc generate câu hỏi
   */
  private static getDefaultPrompt(numQuestions: number, difficulty: string, language: string): string {
    const lang = language === 'vi' ? 'tiếng Việt' : 'English';
    
    return `
Bạn là một chuyên gia tạo câu hỏi trắc nghiệm chất lượng cao. Hãy tạo ${numQuestions} câu hỏi trắc nghiệm bằng ${lang} dựa trên nội dung được cung cấp.

Yêu cầu:
- Mỗi câu hỏi có 4 đáp án (A, B, C, D)
- Chỉ có 1 đáp án đúng
- Câu hỏi phải liên quan trực tiếp đến nội dung
- Độ khó: ${difficulty}
- Bao gồm giải thích cho đáp án đúng
- Đảm bảo câu hỏi có tính phân biệt cao

Trả về định dạng JSON chính xác như sau:
{
  "questions": [
    {
      "text": "Câu hỏi ở đây",
      "answers": [
        {"text": "Đáp án A", "isCorrect": true},
        {"text": "Đáp án B", "isCorrect": false},
        {"text": "Đáp án C", "isCorrect": false},
        {"text": "Đáp án D", "isCorrect": false}
      ],
      "explanation": "Giải thích tại sao đáp án A đúng",
      "points": 10,
      "difficulty": "${difficulty}"
    }
  ]
}

QUAN TRỌNG: Chỉ trả về JSON thuần túy, không thêm text hoặc markdown nào khác.
`;
  }

  /**
   * Parse questions từ Firebase Function response
   */
  private static parseQuestionsFromResponse(questionsData: any[]): Question[] {
    try {
      const questions: Question[] = [];
      
      for (const questionData of questionsData) {
        const question: Question = {
          id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: questionData.text || '',
          type: 'multiple',
          answers: questionData.answers?.map((answer: any, index: number) => ({
            id: `a_${index + 1}`,
            text: answer.text || '',
            isCorrect: answer.isCorrect === true
          })) || [],
          explanation: questionData.explanation || '',
          points: questionData.points || 10,
          difficulty: questionData.difficulty || 'medium'
        };

        // Validate question
        if (question.text && question.answers.length >= 2) {
          questions.push(question);
        }
      }

      return questions;
    } catch (error) {
      console.error('Error parsing questions from response:', error);
      throw new Error('Không thể phân tích câu hỏi từ AI');
    }
  }

  /**
   * Parse questions từ raw text response
   */
  private static parseQuestionsFromText(text: string): Question[] {
    try {
      // Remove markdown code blocks if present
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Try to parse JSON
      const parsed = JSON.parse(cleanText);
      const questionsData = parsed.questions || [];

      return this.parseQuestionsFromResponse(questionsData);
    } catch (error) {
      console.error('Error parsing questions from text:', error);
      throw new Error('Không thể phân tích câu hỏi từ phản hồi AI');
    }
  }

  /**
   * Kiểm tra availability của Firebase AI
   */
  static async checkAvailability(): Promise<boolean> {
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        return false;
      }

      // Test với một request đơn giản
      const testGenerate = httpsCallable(this.functions, 'testAI');
      const result = await testGenerate({ test: true });
      
      return result.data ? true : false;
    } catch (error) {
      console.error('Firebase AI not available:', error);
      return false;
    }
  }
}

export default FirebaseAIService;
