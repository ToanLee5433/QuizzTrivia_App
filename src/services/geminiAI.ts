import { GoogleGenerativeAI } from "@google/generative-ai";

// API Key - sử dụng environment variable nếu có, fallback về hardcoded
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyB7vFdW8BKswDq0TEjKvoLemzWCSk6b5Xg";

class GeminiAIService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(API_KEY);
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRetriableError(error: unknown): boolean {
    const anyErr = error as any;
    const status = anyErr?.status || anyErr?.statusCode || anyErr?.response?.status;
    const code = String(status || '').toLowerCase();
    const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return (
      code === '503' || code === '429' ||
      msg.includes('503') ||
      msg.includes('overloaded') ||
      msg.includes('timeout') ||
      msg.includes('429') ||
      msg.includes('rate') ||
      msg.includes('unavailable')
    );
  }

  private async callWithRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 800): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (e) {
        if (attempt >= retries || !this.isRetriableError(e)) {
          throw e;
        }
        const jitter = Math.floor(Math.random() * 200);
        const delay = Math.min(8000, baseDelayMs * Math.pow(2, attempt)) + jitter;
        await this.sleep(delay);
        attempt++;
      }
    }
  }

  private async generateViaRest(modelName: string, prompt: string): Promise<any[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
      })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Gemini REST ${res.status} ${res.statusText} ${text}`);
    }
    const data = await res.json();
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = (generatedText as string).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const clean = jsonMatch ? jsonMatch[0] : cleaned;
    const parsed = JSON.parse(clean);
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid REST response structure');
    }
    return parsed.questions as any[];
  }

  async generateQuestions(topic: string, difficulty: string, numQuestions: number) {
    try {
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

      const models = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.5-pro',
        'gemini-pro'
      ];

      let lastError: any = null;
      for (const name of models) {
        try {
          const model = this.genAI.getGenerativeModel({ model: name });
          const run = async () => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const data = JSON.parse(text);
            if (!data.questions || !Array.isArray(data.questions)) {
              throw new Error('Invalid response structure');
            }
            data.questions.forEach((q: any, index: number) => {
              if (!q.text || !q.answers || !Array.isArray(q.answers) || q.answers.length !== 4) {
                throw new Error(`Invalid question structure at index ${index}`);
              }
              const correctAnswers = q.answers.filter((a: any) => a.isCorrect);
              if (correctAnswers.length !== 1) {
                throw new Error(`Question ${index + 1} must have exactly 1 correct answer`);
              }
            });
            return data.questions as any[];
          };

          const questions = await this.callWithRetry(run, 2, 800);
          return {
            success: true,
            questions,
            message: `Đã tạo thành công ${questions.length} câu hỏi`
          };
        } catch (err) {
          lastError = err;
          // Luôn thử model kế tiếp khi lỗi, ưu tiên chuyển model khi flash quá tải
          continue;
        }
      }

      // If SDK attempts failed, try REST fallback with a stable model
      try {
        const questions = await this.callWithRetry(() => this.generateViaRest('gemini-pro', prompt), 1, 1000);
        return {
          success: true,
          questions,
          message: `Đã tạo thành công ${questions.length} câu hỏi`
        };
      } catch (e) {
        lastError = e;
      }

      throw lastError || new Error('Gemini unavailable');

    } catch (error) {
      console.error('Gemini AI Error:', error);
      
      if (error instanceof SyntaxError) {
        return {
          success: false,
          error: 'Lỗi định dạng JSON từ AI. Vui lòng thử lại.',
          questions: []
        };
      }
      
      const msg = (error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo câu hỏi');
      const friendly = /503|overloaded|429|rate|unavailable/i.test(msg)
        ? 'Máy chủ AI đang quá tải hoặc tạm thời không phản hồi. Vui lòng thử lại sau một lúc.'
        : msg;
      return {
        success: false,
        error: friendly,
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
