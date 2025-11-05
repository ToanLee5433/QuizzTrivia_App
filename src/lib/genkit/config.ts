/**
 * 🤖 Genkit Configuration for RAG Chatbot
 * 
 * Features:
 * - Google AI provider (Gemini 2.5 Flash + text-embedding-004)
 * - Permission-aware retrieval (public + password chunks)
 * - Citation extraction
 * - Vietnamese language support
 */

// API Key from environment or hardcoded (move to env in production)
// Use process.env for Node.js scripts, import.meta.env for browser/Vite
export const GOOGLE_AI_API_KEY = typeof process !== 'undefined' && process.env?.VITE_GOOGLE_AI_API_KEY
  ? process.env.VITE_GOOGLE_AI_API_KEY
  : 'AIzaSyDQT4sxlCRVxm0xqvfzaBIobv-3y8KfV-k';

// Export configuration object
export const GENKIT_CONFIG = {
  // API Key
  apiKey: GOOGLE_AI_API_KEY,
  
  // Model for chat completion
  chatModel: 'gemini-2.0-flash-exp',
  
  // Model for embeddings
  embeddingModel: 'text-embedding-004',
  
  // Generation parameters
  generation: {
    temperature: 0.3, // Lower = more focused, deterministic
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1024, // Control costs
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

