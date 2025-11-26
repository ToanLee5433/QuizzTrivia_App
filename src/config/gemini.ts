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
  
  // Rate limits for gemini-2.5-flash-lite (Updated 2025-11)
  // RPM: 4000, TPM: 4M, RPD: Unlimited
  FREE_TIER: {
    MAX_REQUESTS_PER_MINUTE: 4000,
    MAX_TOKENS_PER_MINUTE: 4000000, // 4M TPM
    MAX_TOKENS_PER_REQUEST: 65536, // Model supports up to 1M tokens
    SUPPORTED_MODELS: ['gemini-2.5-flash-lite']
  }
};
