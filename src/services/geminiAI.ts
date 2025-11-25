/**
 * 🤖 Gemini AI Service - Secure Cloud Functions Implementation
 * 
 * This service calls Cloud Functions instead of directly calling Google AI APIs
 * to keep API keys secure and prevent exposure in the browser bundle.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../lib/firebase/config';

// Initialize Firebase Functions
const functions = getFunctions(app, 'us-central1');

interface GenerateQuestionsResponse {
  success: boolean;
  questions?: Array<{
    text: string;
    answers: Array<{ text: string; isCorrect: boolean }>;
  }>;
  message?: string;
  error?: string;
}

class GeminiAIService {

  async generateQuestions(topic: string, difficulty: string, numQuestions: number) {
    try {
      // Call Cloud Function instead of direct API
      const generateQuestionsFunc = httpsCallable<
        { topic: string; difficulty: string; numQuestions: number },
        GenerateQuestionsResponse
      >(functions, 'generateQuestions');

      const result = await generateQuestionsFunc({
        topic,
        difficulty,
        numQuestions
      });

      if (result.data.success && result.data.questions) {
        return {
          success: true,
          questions: result.data.questions,
          message: result.data.message || `Đã tạo thành công ${result.data.questions.length} câu hỏi`
        };
      } else {
        return {
          success: false,
          error: result.data.error || 'Không thể tạo câu hỏi',
          questions: []
        };
      }

    } catch (error) {
      console.error('Gemini AI Error:', error);
      
      const msg = error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo câu hỏi';
      const friendly = /503|overloaded|429|rate|unavailable|timeout/i.test(msg)
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
      // Call test function in Cloud Functions
      const testAIFunc = httpsCallable<void, { success: boolean; message: string; response?: string }>(
        functions,
        'testAI'
      );

      const result = await testAIFunc();
      
      return {
        success: result.data.success,
        message: result.data.message,
        response: result.data.response || ''
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
