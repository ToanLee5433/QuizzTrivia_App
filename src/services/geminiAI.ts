import { GoogleGenerativeAI } from "@google/generative-ai";

// API Key - sử dụng environment variable nếu có, fallback về hardcoded
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyBSA4zCEsVUROJVJPAElcQ1I1cfii4bFqw";

class GeminiAIService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(API_KEY);
  }

  async generateQuestions(topic: string, difficulty: string, numQuestions: number) {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
Tạo ${numQuestions} câu hỏi trắc nghiệm về chủ đề "${topic}" với độ khó ${difficulty}.

Yêu cầu định dạng JSON chính xác:
{
  "questions": [
    {
      "text": "Câu hỏi...",
      "answers": [
        {"text": "Đáp án A", "isCorrect": false},
        {"text": "Đáp án B", "isCorrect": true},
        {"text": "Đáp án C", "isCorrect": false},
        {"text": "Đáp án D", "isCorrect": false}
      ]
    }
  ]
}

Lưu ý:
- Mỗi câu hỏi phải có đúng 4 đáp án
- Chỉ có 1 đáp án đúng (isCorrect: true)
- Câu hỏi phải rõ ràng, chính xác
- Đáp án phải hợp lý và đa dạng
- Trả về CHÍNH XÁC định dạng JSON, không thêm text khác
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Làm sạch response để chỉ lấy JSON
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse JSON
      const data = JSON.parse(text);
      
      // Validate data structure
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid response structure');
      }

      // Validate each question
      data.questions.forEach((q: any, index: number) => {
        if (!q.text || !q.answers || !Array.isArray(q.answers) || q.answers.length !== 4) {
          throw new Error(`Invalid question structure at index ${index}`);
        }
        
        const correctAnswers = q.answers.filter((a: any) => a.isCorrect);
        if (correctAnswers.length !== 1) {
          throw new Error(`Question ${index + 1} must have exactly 1 correct answer`);
        }
      });

      return {
        success: true,
        questions: data.questions,
        message: `Đã tạo thành công ${data.questions.length} câu hỏi`
      };

    } catch (error) {
      console.error('Gemini AI Error:', error);
      
      if (error instanceof SyntaxError) {
        return {
          success: false,
          error: 'Lỗi định dạng JSON từ AI. Vui lòng thử lại.',
          questions: []
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo câu hỏi',
        questions: []
      };
    }
  }

  async testConnection() {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Chào bạn! Hãy trả lời ngắn gọn bằng tiếng Việt: AI đang hoạt động tốt không?");
      const response = await result.response;
      const text = response.text();
      
      return {
        success: true,
        message: "Kết nối AI thành công!",
        response: text
      };
    } catch (error) {
      console.error('Test connection error:', error);
      return {
        success: false,
        message: "Không thể kết nối đến AI",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const geminiAI = new GeminiAIService();
