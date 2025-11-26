/**
 * 🤖 Genkit Configuration for RAG Chatbot
 * 
 * ⚠️ DEPRECATED: This file is for reference only
 * All AI calls should go through Cloud Functions (askRAG, generateQuestions, etc.)
 * API keys should NOT be stored in frontend code
 * 
 * Features:
 * - Google AI provider (Gemini 2.5 Flash Lite + text-embedding-004)
 * - Permission-aware retrieval (public + password chunks)
 * - Citation extraction
 * - Vietnamese language support
 */

// ⚠️ SECURITY WARNING: API key should NOT be exposed in frontend
// Use Cloud Functions instead for all AI operations
export const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY || '';

// Export configuration object
export const GENKIT_CONFIG = {
  // API Key - DEPRECATED: Use Cloud Functions instead
  apiKey: GOOGLE_AI_API_KEY,
  
  // Model for chat completion - Updated to gemini-2.5-flash-lite
  chatModel: 'gemini-2.5-flash-lite',
  
  // Model for embeddings
  embeddingModel: 'text-embedding-004',
  
  // Generation parameters (optimized for gemini-2.5-flash-lite)
  // Model limits: RPM 4000, TPM 4M, max output 65536 tokens
  generation: {
    temperature: 0.3, // Lower = more focused, deterministic
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192, // Increased for gemini-2.5-flash-lite (supports up to 65536)
  },
  
  // RAG parameters
  rag: {
    topK: 4, // Number of chunks to retrieve
    similarityThreshold: 0.6, // Minimum cosine similarity
    chunkSize: 500, // Tokens per chunk (300-800)
    chunkOverlap: 50, // Overlap between chunks
  },
  
  // Supported languages
  supportedLanguages: ['vi', 'en'] as const,
  defaultLanguage: 'vi' as const,
};

export default GENKIT_CONFIG;