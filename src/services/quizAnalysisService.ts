/**
 * 📊 AI-powered Quiz Result Analysis Service
 * 
 * Secure Cloud Functions Implementation
 * Analyzes quiz performance and generates personalized learning recommendations
 * using Cloud Functions (API keys are securely stored server-side)
 */

import { Quiz, QuizResult } from '../features/quiz/types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../lib/firebase/config';

// Initialize Firebase Functions
const functions = getFunctions(app, 'us-central1');

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

interface AnalyzeQuizResultResponse {
  success: boolean;
  analysis?: {
    performanceLevel: string;
    overallFeedback: string;
    strengths: string[];
    weaknesses: string[];
    studyTips: string[];
    focusAreas: string[];
    nextSteps: string[];
    generatedAt: string;
    confidence: number;
  };
  fallback?: boolean;
  error?: string;
}

class QuizAnalysisService {

  /**
   * Get the text content of an answer option
   */
  private getAnswerText(option: any): string {
    if (typeof option === 'string') return option;
    if (option?.text) return option.text;
    if (option?.content) return option.content;
    return String(option || '');
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
      // Prepare DETAILED incorrect question info for accurate AI analysis
      const incorrectDetails = quiz.questions
        .map((question, index) => {
          const userAnswer = result.answers.find(a => a.questionId === question.id);
          if (userAnswer?.isCorrect === false) {
            // Get the question text (strip HTML tags for cleaner analysis)
            // Use 'text' property (correct field name in Question interface)
            const questionText = (question.text || question.richText || '')
              .replace(/<[^>]*>/g, '').trim();
            
            // Get user's selected answer using selectedAnswerId
            let userSelectedAnswer = '';
            if (question.type === 'boolean') {
              // For boolean type, find the answer by ID
              const selectedAnswer = question.answers.find(a => a.id === userAnswer.selectedAnswerId);
              userSelectedAnswer = selectedAnswer?.text || userAnswer.selectedAnswerId || 'Không rõ';
            } else if (question.answers && userAnswer.selectedAnswerId) {
              // For other types, find answer by selectedAnswerId
              const selectedAnswer = question.answers.find(a => a.id === userAnswer.selectedAnswerId);
              userSelectedAnswer = this.getAnswerText(selectedAnswer);
            }
            
            // Get correct answer - find the answer marked as correct
            let correctAnswerText = '';
            if (question.type === 'boolean') {
              const correctAnswer = question.answers.find(a => a.isCorrect);
              correctAnswerText = correctAnswer?.text || 'Không rõ';
            } else if (question.answers) {
              const correctAnswer = question.answers.find(a => a.isCorrect);
              correctAnswerText = this.getAnswerText(correctAnswer);
            }
            
            return {
              number: index + 1,
              questionText: questionText.substring(0, 200), // Limit for token efficiency
              userAnswer: userSelectedAnswer.substring(0, 100),
              correctAnswer: correctAnswerText.substring(0, 100),
              type: question.type,
              difficulty: question.difficulty || 'medium',
              topic: quiz.category || 'general'
            };
          }
          return null;
        })
        .filter(Boolean);

      console.log('📊 Sending detailed incorrect info to AI:', incorrectDetails);

      // Call Cloud Function
      const analyzeFunc = httpsCallable<{
        quizTitle: string;
        category: string;
        difficulty: string;
        totalQuestions: number;
        correctAnswers: number;
        percentage: number;
        timeSpent: number;
        incorrectDetails: any[];
      }, AnalyzeQuizResultResponse>(functions, 'analyzeQuizResult');

      const response = await analyzeFunc({
        quizTitle: quiz.title,
        category: quiz.category || 'Tổng hợp',
        difficulty: quiz.difficulty || 'medium',
        totalQuestions: result.totalQuestions || quiz.questions.length,
        correctAnswers: result.correctAnswers || 0,
        percentage,
        timeSpent: result.timeSpent || 0,
        incorrectDetails
      });

      if (response.data.success && response.data.analysis) {
        const analysis = response.data.analysis;
        console.log('✅ AI analysis generated:', analysis);
        
        return {
          performanceLevel: analysis.performanceLevel as QuizAnalysis['performanceLevel'],
          overallFeedback: analysis.overallFeedback,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          studyTips: analysis.studyTips,
          focusAreas: analysis.focusAreas,
          nextSteps: analysis.nextSteps,
          generatedAt: new Date(analysis.generatedAt),
          confidence: analysis.confidence
        };
      }
      
      // Fallback from server
      throw new Error('Analysis failed');
      
    } catch (error) {
      console.error('❌ Failed to generate AI analysis:', error);
      // Return fallback analysis
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
