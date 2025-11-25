/**
 * ⚠️ DEPRECATED: Direct Gemini API calls from frontend are deprecated
 * 
 * All AI operations should now go through Cloud Functions:
 * - generateQuestions: Creates quiz questions
 * - processFile: Processes images/PDFs/docs with OCR
 * - analyzeQuizResult: Analyzes quiz performance
 * - askRAG: RAG-based chatbot
 * 
 * API keys are securely stored in Cloud Functions environment variables
 */

// Environment configuration for Gemini AI - DEPRECATED
export const GEMINI_CONFIG = {
  // ⚠️ DO NOT use direct API calls - use Cloud Functions instead
  // This config is kept for backwards compatibility only
  API_KEY: '', // Removed - use Cloud Functions
  API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
  VISION_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
  
  // Model configuration
  MODEL: {
    DEFAULT: 'gemini-2.5-flash-lite',
    EMBEDDING: 'text-embedding-004'
  },
  
  // Rate limits
  FREE_TIER: {
    MAX_REQUESTS_PER_MINUTE: 15,
    MAX_TOKENS_PER_REQUEST: 8192,
    SUPPORTED_MODELS: ['gemini-2.5-flash-lite', 'gemini-pro']
  }
};
