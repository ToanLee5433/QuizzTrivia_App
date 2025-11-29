/**
 * 🚀 RAG Cloud Function - Ask Question Endpoint v4.2
 * 
 * Firebase Function for AI-powered question answering
 * with Contextual Query Rewriting support
 * 
 * Endpoint: askRAG
 * Method: Callable Function (Firebase Auth required)
 * 
 * Features:
 * - Firebase Authentication required
 * - Conversation history support (v4.2)
 * - Contextual query rewriting
 * - Permission-aware content retrieval
 * - Rate limiting
 * - Comprehensive logging (no sensitive data)
 * 
 * Usage from client:
 * ```typescript
 * const askRAG = httpsCallable(functions, 'askRAG');
 * const result = await askRAG({ 
 *   question: "Thế còn Toán?",
 *   history: [
 *     { role: 'user', content: 'Học tiếng Anh khó quá' },
 *     { role: 'assistant', content: 'Tôi gợi ý...' }
 *   ],
 *   topK: 4,
 *   targetLang: 'vi'
 * });
 * ```
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Note: The ragFlow module will be available after building the main app
// For now, we'll structure the function to import it
// In production, you'll need to build the main app first and copy the ragFlow to functions

/**
 * Rate limiter helper (simple in-memory implementation)
 * In production, use Redis or Firestore for distributed rate limiting
 */
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, maxRequests: number = 20, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitCache.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // New window
    rateLimitCache.set(userId, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Validate question input
 */
function validateQuestion(question: unknown): string {
  if (typeof question !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Question must be a string');
  }

  const trimmed = question.trim();

  if (trimmed.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Question cannot be empty');
  }

  if (trimmed.length > 500) {
    throw new functions.https.HttpsError('invalid-argument', 'Question too long (max 500 characters)');
  }

  return trimmed;
}

/**
 * Main Cloud Function: Ask RAG
 */
export const askRAG = functions.region('us-central1').runWith({
  memory: '256MB',
  timeoutSeconds: 60,
  maxInstances: 20,
  secrets: ['GOOGLE_AI_API_KEY'],
}).https.onCall(async (data, context) => {
    const startTime = Date.now();

    try {
      // 1. Validate authentication
      if (!context.auth) {
        functions.logger.warn('Unauthenticated request to askRAG');
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
      }

      const userId = context.auth.uid;
      functions.logger.info(`RAG request from user: ${userId.substring(0, 8)}...`);

      // 2. Rate limiting
      if (!checkRateLimit(userId)) {
        functions.logger.warn(`Rate limit exceeded for user: ${userId.substring(0, 8)}...`);
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Too many requests. Please try again later.'
        );
      }

      // 3. Validate input
      const { question, topK, targetLang, history } = data;

      const validatedQuestion = validateQuestion(question);
      const validatedTopK = typeof topK === 'number' && topK > 0 && topK <= 10 ? topK : 4;
      const validatedLang = targetLang === 'en' ? 'en' : 'vi';
      
      // Validate history (v4.2)
      const validatedHistory = Array.isArray(history) 
        ? history
            .slice(-5) // Only last 5 messages
            .filter((m: any) => 
              m && 
              typeof m.role === 'string' && 
              typeof m.content === 'string' &&
              (m.role === 'user' || m.role === 'assistant')
            )
            .map((m: any) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content.substring(0, 500), // Truncate long messages
            }))
        : [];

      functions.logger.info('Request validated', {
        questionLength: validatedQuestion.length,
        topK: validatedTopK,
        targetLang: validatedLang,
        historyLength: validatedHistory.length,
      });

      // 4. Call RAG flow with OPTIMIZED implementation
      // Uses: Global Caching, Fast Path, Hybrid Search, AI Reranking, Query Contextualization
      const { askQuestion } = await import('./optimizedRAG');
      
      const result = await askQuestion({
        question: validatedQuestion,
        topK: validatedTopK,
        targetLang: validatedLang,
        userId,  // Pass userId for analytics
        history: validatedHistory,  // NEW v4.2: Pass conversation history
      });

      // 5. Log metrics (no sensitive data)
      functions.logger.info('RAG request completed', {
        userId: userId.substring(0, 8) + '...',
        questionLength: validatedQuestion.length,
        usedChunks: result.usedChunks,
        citationCount: result.citations.length,
        processingTime: result.processingTime,
        totalTime: Date.now() - startTime,
        tokensUsed: result.tokensUsed,
        // Search metrics for monitoring
        fastPathUsed: result.searchMetrics?.fastPathUsed,
        avgScore: result.searchMetrics?.avgScore?.toFixed(3),
        topScore: result.searchMetrics?.topScore?.toFixed(3),
        confidence: result.searchMetrics?.confidence,
        // NEW v4.2: Query contextualization metrics
        queryRewritten: result.searchMetrics?.queryRewritten,
        historyUsed: validatedHistory.length > 0,
      });

      // 6. Return response
      return {
        success: true,
        data: result,
      };

    } catch (error) {
      // Handle errors
      const processingTime = Date.now() - startTime;

      if (error && (error as any).code) {
        // Known functions.https.HttpsError-like error
        functions.logger.warn('RAG request failed (known error)', {
          code: (error as any).code,
          message: (error as any).message,
          processingTime,
        });
        throw error;
      }

      // Unknown error
      functions.logger.error('RAG request failed (unknown error)', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTime,
      });

      throw new functions.https.HttpsError(
        'internal',
        'Failed to process question. Please try again later.'
      );
    }
  }
);

/**
 * Health check endpoint (for monitoring)
 */
export const askRAGHealth = functions.region('us-central1').runWith({
  memory: '128MB',
  timeoutSeconds: 10,
}).https.onCall(async (data, context) => {
  return {
    status: 'healthy',
    timestamp: Date.now(),
    version: '1.0.0',
  };
});
