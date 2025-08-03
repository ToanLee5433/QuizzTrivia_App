// AI Services for Question Generation
// Hỗ trợ multiple AI providers: OpenAI, Claude, Gemini, Local models

import { Question } from '../types';

export interface AIConfig {
  provider: 'openai' | 'claude' | 'gemini' | 'local'
  apiKey: string
  model?: string
  baseURL?: string // For local models
}

// Default API key for OpenAI (hardcoded)
export const DEFAULT_OPENAI_API_KEY = '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';

export interface QuestionGenerationOptions {
  content: string;
  customPrompt?: string;
  numQuestions?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  language?: 'vi' | 'en';
  questionTypes?: ('multiple' | 'true-false' | 'fill-in-blank')[];
}

/**
 * OpenAI Service
 */
export class OpenAIService {
  static async generateQuestions(
    config: AIConfig,
    options: QuestionGenerationOptions
  ): Promise<Question[]> {
    const { content, customPrompt, numQuestions = 5, difficulty = 'mixed', language = 'vi' } = options;
    const systemPrompt = customPrompt || this.getDefaultPrompt(numQuestions, difficulty, language);
    // Use hardcoded API key if not provided
    const apiKey = config.apiKey || DEFAULT_OPENAI_API_KEY;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Nội dung để tạo câu hỏi:\n\n${content}` }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.choices[0]?.message?.content;

      return this.parseQuestionsFromText(generatedText);
    } catch (error) {
      console.error('OpenAI Service Error:', error);
      throw error;
    }
  }

  public static getDefaultPrompt(numQuestions: number, difficulty: string, language: string): string {
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
      "difficulty": "medium"
    }
  ]
}

CHỈ trả về JSON, không có text khác.`;
  }

  static parseQuestionsFromText(text: string): Question[] {
    try {
      // Clean up the response text
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid JSON structure');
      }

      return parsed.questions.map((q: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        text: q.text,
        type: 'multiple' as const,
        answers: q.answers.map((a: any, idx: number) => ({
          id: String.fromCharCode(97 + idx), // a, b, c, d
          text: a.text,
          isCorrect: a.isCorrect
        })),
        explanation: q.explanation,
        points: q.points || 10
      }));
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.log('Raw response:', text);
      
      // Fallback: return empty array with error info
      throw new Error('Không thể phân tích câu trả lời từ AI. Vui lòng thử lại.');
    }
  }
}

/**
 * Claude Service (Anthropic)
 */
export class ClaudeService {
  static async generateQuestions(
    config: AIConfig,
    options: QuestionGenerationOptions
  ): Promise<Question[]> {
    const { content, customPrompt, numQuestions = 5, difficulty = 'mixed', language = 'vi' } = options;

    const systemPrompt = customPrompt || OpenAIService.getDefaultPrompt(numQuestions, difficulty, language);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model || 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [
            { role: 'user', content: `Nội dung để tạo câu hỏi:\n\n${content}` }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.content[0]?.text;

      return OpenAIService.parseQuestionsFromText(generatedText);
    } catch (error) {
      console.error('Claude Service Error:', error);
      throw error;
    }
  }

  static getDefaultPrompt(numQuestions: number, difficulty: string, language: string): string {
    // Same as OpenAI for consistency
    return OpenAIService.getDefaultPrompt(numQuestions, difficulty, language);
  }
}

/**
 * Gemini Service (Google)
 */
export class GeminiService {
  static async generateQuestions(
    config: AIConfig,
    options: QuestionGenerationOptions
  ): Promise<Question[]> {
    const { content, customPrompt, numQuestions = 5, difficulty = 'mixed', language = 'vi' } = options;

    const systemPrompt = customPrompt || OpenAIService.getDefaultPrompt(numQuestions, difficulty, language);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-pro'}:generateContent?key=${config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nNội dung để tạo câu hỏi:\n\n${content}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.candidates[0]?.content?.parts[0]?.text;

      return OpenAIService.parseQuestionsFromText(generatedText);
    } catch (error) {
      console.error('Gemini Service Error:', error);
      throw error;
    }
  }

  static getDefaultPrompt(numQuestions: number, difficulty: string, language: string): string {
    return OpenAIService.getDefaultPrompt(numQuestions, difficulty, language);
  }
}

/**
 * Local AI Service (for local models like Ollama)
 */
export class LocalAIService {
  static async generateQuestions(
    config: AIConfig,
    options: QuestionGenerationOptions
  ): Promise<Question[]> {
    const { content, customPrompt, numQuestions = 5, difficulty = 'mixed', language = 'vi' } = options;

    const systemPrompt = customPrompt || OpenAIService.getDefaultPrompt(numQuestions, difficulty, language);
    const baseURL = config.baseURL || 'http://localhost:11434'; // Default Ollama port

    try {
      const response = await fetch(`${baseURL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model || 'llama2',
          prompt: `${systemPrompt}\n\nNội dung để tạo câu hỏi:\n\n${content}`,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 2000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Local AI Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.response;

      return OpenAIService.parseQuestionsFromText(generatedText);
    } catch (error) {
      console.error('Local AI Service Error:', error);
      throw error;
    }
  }

  static getDefaultPrompt(numQuestions: number, difficulty: string, language: string): string {
    return OpenAIService.getDefaultPrompt(numQuestions, difficulty, language);
  }
}

/**
 * Main AI Service - Router cho các providers
 */
export class AIService {
  static async generateQuestions(
    config: AIConfig,
    options: QuestionGenerationOptions
  ): Promise<Question[]> {
    try {
      switch (config.provider) {
        case 'openai':
          return await OpenAIService.generateQuestions(config, options);
        
        case 'claude':
          return await ClaudeService.generateQuestions(config, options);
        
        case 'gemini':
          return await GeminiService.generateQuestions(config, options);
        
        case 'local':
          return await LocalAIService.generateQuestions(config, options);
        
        default:
          throw new Error(`Unsupported AI provider: ${config.provider}`);
      }
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  static getAvailableModels(provider: string): string[] {
    switch (provider) {
      case 'openai':
        return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'];
      
      case 'claude':
        return ['claude-3-sonnet-20240229', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'];
      
      case 'gemini':
        return ['gemini-pro', 'gemini-pro-vision'];
      
      case 'local':
        return ['llama2', 'codellama', 'mistral', 'phi'];
      
      default:
        return [];
    }
  }

  static validateConfig(config: AIConfig): { valid: boolean; error?: string } {
    if (!config.apiKey && config.provider !== 'local') {
      return { valid: false, error: 'API key is required' };
    }

    if (config.provider === 'local' && !config.baseURL) {
      return { valid: false, error: 'Base URL is required for local AI' };
    }

    return { valid: true };
  }
}
