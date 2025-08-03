// Gemini AI Service - Direct API (Firebase Spark Plan - MIỄN PHÍ)
import { GEMINI_CONFIG } from '../../../config/gemini';

const GEMINI_API_KEY = GEMINI_CONFIG.API_KEY;
const GEMINI_API_URL = GEMINI_CONFIG.API_URL;
const VISION_API_URL = GEMINI_CONFIG.VISION_API_URL;

type QuestionType = 'multiple' | 'boolean' | 'short_answer';
type Difficulty = 'easy' | 'medium' | 'hard';

export interface GeminiQuestion {
  question: string;
  answers: string[];
  correctAnswer: number;
  type: QuestionType;
  difficulty: Difficulty;
  explanation?: string;
}

export interface GeminiAIConfig {
  topic: string;
  count: number;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  language: 'vi' | 'en';
}

export class GeminiAIService {
  private async callGeminiAPI(prompt: string, isVision: boolean = false, imageData?: string): Promise<string> {
    try {
      const apiUrl = isVision ? VISION_API_URL : GEMINI_API_URL;
      
      let requestBody: any = {
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      };

      if (isVision && imageData) {
        // Xử lý cho Gemini Vision (hình ảnh)
        requestBody.contents = [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg", // hoặc image/png
                data: imageData.split(',')[1] // loại bỏ data:image/jpeg;base64,
              }
            }
          ]
        }];
      } else {
        // Xử lý cho Gemini Pro (text)
        requestBody.contents = [{
          parts: [{ text: prompt }]
        }];
      }

      const response = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API call failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Không thể kết nối với Gemini AI');
    }
  }

  private createPrompt(config: GeminiAIConfig): string {
    const { topic, count, difficulty, questionTypes, language } = config;
    
    const difficultyText = {
      'easy': language === 'vi' ? 'dễ' : 'easy',
      'medium': language === 'vi' ? 'trung bình' : 'medium',
      'hard': language === 'vi' ? 'khó' : 'hard'
    };

    const typeText = questionTypes.map(type => {
      switch (type) {
        case 'multiple':
          return language === 'vi' ? 'trắc nghiệm' : 'multiple choice';
        case 'boolean':
          return language === 'vi' ? 'đúng/sai' : 'true/false';
        case 'short_answer':
          return language === 'vi' ? 'điền chỗ trống' : 'fill in the blank';
        default:
          return type;
      }
    }).join(', ');

    if (language === 'vi') {
      return `Tạo ${count} câu hỏi ${typeText} về chủ đề "${topic}" với độ khó ${difficultyText[difficulty]} bằng tiếng Việt.

Yêu cầu format JSON chính xác:
{
  "questions": [
    {
      "question": "Câu hỏi?",
      "answers": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctAnswer": 0,
      "type": "multiple",
      "difficulty": "${difficulty}",
      "explanation": "Giải thích ngắn gọn"
    }
  ]
}

Lưu ý:
- Với câu hỏi trắc nghiệm: cung cấp 4 đáp án, type = "multiple"
- Với câu hỏi đúng/sai: cung cấp 2 đáp án ["Đúng", "Sai"], type = "boolean"
- Với câu điền chỗ trống: câu hỏi có dấu _____ và đáp án là từ cần điền, type = "short_answer"
- correctAnswer là chỉ số của đáp án đúng (bắt đầu từ 0)
- Tất cả nội dung phải bằng tiếng Việt
- Chỉ trả về JSON, không có text khác`;
    } else {
      return `Create ${count} ${typeText} questions about "${topic}" with ${difficulty} difficulty in English.

Required JSON format:
{
  "questions": [
    {
      "question": "Question text?",
      "answers": ["Answer A", "Answer B", "Answer C", "Answer D"],
      "correctAnswer": 0,
      "type": "multiple", 
      "difficulty": "${difficulty}",
      "explanation": "Brief explanation"
    }
  ]
}

Notes:
- For multiple choice: provide 4 answers, type = "multiple"
- For true/false: provide 2 answers ["True", "False"], type = "boolean"
- For fill-in-blank: question has _____ and answer is the word to fill, type = "short_answer"
- correctAnswer is the index of correct answer (starting from 0)
- All content must be in English
- Return only JSON, no other text`;
    }
  }

  async generateQuestions(config: GeminiAIConfig): Promise<GeminiQuestion[]> {
    try {
      const prompt = this.createPrompt(config);
      const response = await this.callGeminiAPI(prompt);
      
      // Clean and parse JSON response
      const cleanText = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanText);
      
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid questions format from AI');
      }

      return parsed.questions.map((q: any) => ({
        question: q.question,
        answers: q.answers || [],
        correctAnswer: q.correctAnswer || 0,
        type: q.type || 'multiple',
        difficulty: q.difficulty || config.difficulty,
        explanation: q.explanation || ''
      }));
    } catch (error) {
      console.error('Error generating questions:', error);
      throw new Error('Không thể tạo câu hỏi từ AI');
    }
  }

  async generateQuestionsFromImage(config: GeminiAIConfig, imageData: string): Promise<GeminiQuestion[]> {
    try {
      const basePrompt = this.createPrompt(config);
      const imagePrompt = `Hãy phân tích hình ảnh này và tạo câu hỏi dựa trên nội dung trong ảnh. ${basePrompt}`;
      
      const response = await this.callGeminiAPI(imagePrompt, true, imageData);
      
      // Clean and parse JSON response
      const cleanText = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanText);
      
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid questions format from AI');
      }

      return parsed.questions.map((q: any) => ({
        question: q.question,
        answers: q.answers || [],
        correctAnswer: q.correctAnswer || 0,
        type: q.type || 'multiple',
        difficulty: q.difficulty || config.difficulty,
        explanation: q.explanation || ''
      }));
    } catch (error) {
      console.error('Error generating questions from image:', error);
      throw new Error('Không thể tạo câu hỏi từ hình ảnh');
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.callGeminiAPI('Hello, this is a test. Please respond with "Test successful"');
      return {
        success: true,
        message: `Kết nối thành công với Firebase Gemini API: ${response.substring(0, 100)}...`
      };
    } catch (error) {
      return {
        success: false,
        message: `Lỗi kết nối Firebase API: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const geminiAIService = new GeminiAIService();
