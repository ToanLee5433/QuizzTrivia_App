/**
 * 🏗️ Simple RAG Flow - Direct Implementation
 * 
 * ⚠️ DEPRECATED: Use Cloud Function askRAG instead
 * This file should NOT be used directly from frontend
 * API keys should not be exposed in browser code
 * 
 * For chatbot functionality, use:
 * - Cloud Function: askRAG
 * - Frontend component: ChatMessage -> calls askRAG via httpsCallable
 */

// ⚠️ SECURITY WARNING: This file is deprecated
// DO NOT import this file in production frontend code
// Use Cloud Functions (askRAG) instead

interface RAGResponse {
  answer: string;
  citations: Array<{ title: string; quizId?: string }>;
  usedChunks: number;
  processingTime: number;
  tokensUsed: { input: number; output: number };
}

/**
 * @deprecated Use Cloud Function askRAG instead
 */
export async function askQuestion(_params: {
  question: string;
  topK?: number;
  targetLang?: string;
}): Promise<RAGResponse> {
  console.warn(
    '⚠️ DEPRECATED: askQuestion from simpleRAG.ts is deprecated.',
    'Use Cloud Function askRAG instead.'
  );
  
  throw new Error(
    'This function is deprecated. Use Cloud Function askRAG instead. ' +
    'Import from firebase/functions and call httpsCallable(functions, "askRAG")'
  );
}
