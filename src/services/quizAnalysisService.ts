/**
 * AI-powered Quiz Result Analysis Service
 * 
 * Analyzes quiz performance and generates personalized learning recommendations
 * using Gemini AI
 */

import { Quiz, QuizResult } from '../features/quiz/types';
import { getVertexAI, getGenerativeModel } from 'firebase/vertexai-preview';
import app from '../lib/firebase/config';

export interface QuizAnalysis {
  // Overall assessment
  performanceLevel: 'excellent' | 'good' | 'average' | 'needs-improvement';
  overallFeedback: string;
  
  // Detailed insights
  strengths: string[];
  weaknesses: string[];
  
  // Learning recommendations
  studyTips: string[];
  focusAreas: string[];
  nextSteps: string[];
  
  // Metadata
  generatedAt: Date;
  confidence: number; // 0-1
}

class QuizAnalysisService {
  private model: ReturnType<typeof getGenerativeModel>;
  
  constructor() {
    const vertexAI = getVertexAI(app);
    this.model = getGenerativeModel(vertexAI, { 
      model: 'gemini-2.0-flash-exp'
    });
  }

  /**
   * Analyze quiz result and generate personalized feedback
   */
  async analyzeResult(
    quiz: Quiz,
    result: QuizResult,
    percentage: number
  ): Promise<QuizAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(quiz, result, percentage);
      
      const response = await this.model.generateContent(prompt);
      const text = response.response.text();
      
      // Parse AI response
      const analysis = this.parseAnalysisResponse(text, percentage);
      
      console.log('✅ AI analysis generated:', analysis);
      return analysis;
      
    } catch (error) {
      console.error('❌ Failed to generate AI analysis:', error);
      // Return fallback analysis
      return this.getFallbackAnalysis(percentage);
    }
  }

  /**
   * Build comprehensive prompt for AI analysis
   */
  private buildAnalysisPrompt(
    quiz: Quiz,
    result: QuizResult,
    percentage: number
  ): string {
    const correctCount = result.correctAnswers || 0;
    const totalCount = result.totalQuestions || quiz.questions.length;
    const timeSpent = result.timeSpent || 0;
    
    // Calculate question-level performance
    const questionPerformance = quiz.questions.map((question, index) => {
      const userAnswer = result.answers.find(a => a.questionId === question.id);
      return {
        number: index + 1,
        type: question.type,
        difficulty: question.difficulty || 'medium',
        correct: userAnswer?.isCorrect || false,
        topic: quiz.category || 'general'
      };
    });
    
    const incorrectQuestions = questionPerformance.filter(q => !q.correct);
    const weakTopics = this.identifyWeakTopics(incorrectQuestions);
    
    return `Bạn là một chuyên gia giáo dục AI. Phân tích kết quả quiz và đưa ra nhận xét chi tiết, hữu ích.

**THÔNG TIN QUIZ:**
- Tiêu đề: ${quiz.title}
- Chủ đề: ${quiz.category || 'Tổng hợp'}
- Độ khó: ${quiz.difficulty || 'medium'}
- Tổng số câu: ${totalCount}

**KẾT QUẢ:**
- Điểm: ${percentage}% (${correctCount}/${totalCount} câu đúng)
- Thời gian: ${Math.floor(timeSpent / 60)} phút ${timeSpent % 60} giây
- Câu sai: ${incorrectQuestions.length} câu

**PHÂN BỐ LỖI THEO CHỦ ĐỀ:**
${weakTopics.map(t => `- ${t.topic}: ${t.count} câu sai (${t.types.join(', ')})`).join('\n')}

**YÊU CẦU PHÂN TÍCH:**

1. **Đánh giá tổng quan (overall_feedback)**:
   - Nhận xét chung về kết quả (2-3 câu, thân thiện, khích lệ)
   - Đánh giá mức độ: excellent (>=90%), good (70-89%), average (50-69%), needs-improvement (<50%)

2. **Điểm mạnh (strengths)**: 
   - 2-3 điểm mạnh cụ thể (các loại câu hỏi làm tốt, chủ đề nắm vững)
   - Nếu điểm thấp: "Hoàn thành quiz", "Kiên trì làm bài"

3. **Điểm yếu (weaknesses)**:
   - 2-3 điểm cần cải thiện dựa trên các câu sai
   - Phân tích theo chủ đề và loại câu hỏi
   - Nếu 100% đúng: để trống []

4. **Lời khuyên học tập (study_tips)**:
   - 3-4 tips học tập thực tế, dễ áp dụng
   - Phù hợp với điểm yếu đã phân tích
   - Bao gồm phương pháp học, công cụ, thói quen

5. **Khu vực tập trung (focus_areas)**:
   - 2-3 chủ đề/kỹ năng cần ưu tiên ôn tập
   - Dựa trên weak_topics ở trên

6. **Bước tiếp theo (next_steps)**:
   - 3-4 hành động cụ thể người học nên làm ngay
   - Theo thứ tự ưu tiên
   - Bao gồm: ôn tập, làm quiz khác, học thêm

**ĐỊNH DẠNG TRẢ LỜI (JSON):**
\`\`\`json
{
  "performance_level": "excellent|good|average|needs-improvement",
  "overall_feedback": "Nhận xét tổng quan...",
  "strengths": [
    "Điểm mạnh 1",
    "Điểm mạnh 2"
  ],
  "weaknesses": [
    "Điểm yếu 1",
    "Điểm yếu 2"
  ],
  "study_tips": [
    "Tip 1",
    "Tip 2",
    "Tip 3"
  ],
  "focus_areas": [
    "Chủ đề 1",
    "Chủ đề 2"
  ],
  "next_steps": [
    "Bước 1",
    "Bước 2",
    "Bước 3"
  ]
}
\`\`\`

**LƯU Ý:**
- Ngôn ngữ: Tiếng Việt, thân thiện, khích lệ
- Độ dài: Ngắn gọn, súc tích (mỗi mục 1-2 câu)
- Tích cực: Luôn động viên, đưa ra giải pháp cụ thể
- Phù hợp: Dựa trên dữ liệu thực tế, không chung chung

Chỉ trả lời JSON, không giải thích thêm.`;
  }

  /**
   * Identify weak topics from incorrect questions
   */
  private identifyWeakTopics(incorrectQuestions: any[]): Array<{
    topic: string;
    count: number;
    types: string[];
  }> {
    const topicMap = new Map<string, { count: number; types: Set<string> }>();
    
    incorrectQuestions.forEach(q => {
      const topic = q.topic;
      if (!topicMap.has(topic)) {
        topicMap.set(topic, { count: 0, types: new Set() });
      }
      const entry = topicMap.get(topic)!;
      entry.count++;
      entry.types.add(q.type);
    });
    
    return Array.from(topicMap.entries())
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        types: Array.from(data.types)
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Parse AI response into structured analysis
   */
  private parseAnalysisResponse(text: string, percentage: number): QuizAnalysis {
    try {
      // Extract JSON from response (may be wrapped in ```json```)
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);
      
      return {
        performanceLevel: parsed.performance_level || this.getPerformanceLevelFromScore(percentage),
        overallFeedback: parsed.overall_feedback || 'Chúc mừng bạn đã hoàn thành quiz!',
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        studyTips: parsed.study_tips || [],
        focusAreas: parsed.focus_areas || [],
        nextSteps: parsed.next_steps || [],
        generatedAt: new Date(),
        confidence: 0.8
      };
      
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      return this.getFallbackAnalysis(percentage);
    }
  }

  /**
   * Get performance level from score
   */
  private getPerformanceLevelFromScore(percentage: number): QuizAnalysis['performanceLevel'] {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 70) return 'good';
    if (percentage >= 50) return 'average';
    return 'needs-improvement';
  }

  /**
   * Fallback analysis if AI fails
   */
  private getFallbackAnalysis(percentage: number): QuizAnalysis {
    const level = this.getPerformanceLevelFromScore(percentage);
    
    const feedbackMap = {
      excellent: 'Xuất sắc! Bạn đã thể hiện sự hiểu biết sâu sắc về chủ đề này.',
      good: 'Tốt lắm! Bạn đã nắm vững phần lớn kiến thức.',
      average: 'Khá ổn! Còn một số điểm cần cải thiện thêm.',
      'needs-improvement': 'Đừng nản lòng! Hãy xem lại và thử lại nhé.'
    };
    
    return {
      performanceLevel: level,
      overallFeedback: feedbackMap[level],
      strengths: ['Hoàn thành quiz', 'Kiên trì làm bài'],
      weaknesses: percentage < 70 ? ['Cần ôn tập thêm kiến thức cơ bản'] : [],
      studyTips: [
        'Xem lại các câu sai và hiểu tại sao',
        'Làm thêm các quiz tương tự để rèn luyện',
        'Ghi chú lại những điểm quan trọng'
      ],
      focusAreas: percentage < 70 ? ['Kiến thức cơ bản', 'Kỹ năng làm bài'] : [],
      nextSteps: [
        'Xem lại đáp án chi tiết',
        'Làm lại quiz để củng cố',
        'Thử các quiz khác cùng chủ đề'
      ],
      generatedAt: new Date(),
      confidence: 0.5
    };
  }
}

// Singleton instance
export const quizAnalysisService = new QuizAnalysisService();
