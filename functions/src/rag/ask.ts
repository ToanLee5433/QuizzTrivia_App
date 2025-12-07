/**
 * 🚀 RAG Cloud Function - Ask Question Endpoint v4.3
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
 * - Distributed Rate limiting via RTDB (v4.3)
 * - AI timeout protection (v4.3)
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

// RTDB reference for distributed rate limiting
const rtdb = admin.database();

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 20,      // Max requests per window
  windowMs: 60 * 1000,  // 1 minute window
  cleanupIntervalMs: 5 * 60 * 1000, // Cleanup old entries every 5 minutes
};

/**
 * 🔥 Distributed Rate Limiter using RTDB (v4.3)
 * 
 * Benefits over in-memory:
 * - Works across multiple Cloud Function instances
 * - Persists across cold starts
 * - Low cost (RTDB is cheaper for high-frequency ops)
 * - Auto-cleanup of old entries
 * 
 * RTDB Structure:
 * /rateLimits/rag/{userId}: { count: number, resetTime: number }
 */
async function checkRateLimitDistributed(
  userId: string, 
  maxRequests: number = RATE_LIMIT_CONFIG.maxRequests, 
  windowMs: number = RATE_LIMIT_CONFIG.windowMs
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const userRef = rtdb.ref(`rateLimits/rag/${userId}`);
  
  try {
    // Use transaction to ensure atomic read-modify-write
    const result = await userRef.transaction((currentData) => {
      // No existing data or window expired
      if (!currentData || now > currentData.resetTime) {
        return {
          count: 1,
          resetTime: now + windowMs,
          lastRequest: now,
        };
      }
      
      // Within window, increment count
      return {
        ...currentData,
        count: currentData.count + 1,
        lastRequest: now,
      };
    });
    
    // Check if transaction was committed
    if (!result.committed) {
      functions.logger.warn('Rate limit transaction not committed, allowing request');
      return { allowed: true, remaining: maxRequests, resetTime: now + windowMs };
    }
    
    const data = result.snapshot.val();
    
    // Safety check for null data
    if (!data || typeof data.count !== 'number') {
      functions.logger.warn('Rate limit data is invalid, allowing request');
      return { allowed: true, remaining: maxRequests, resetTime: now + windowMs };
    }
    
    const allowed = data.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - data.count);
    
    return { allowed, remaining, resetTime: data.resetTime };
  } catch (error) {
    // Fallback: Allow request if RTDB fails (graceful degradation)
    functions.logger.warn('Rate limit check failed, allowing request:', error);
    return { allowed: true, remaining: maxRequests, resetTime: now + windowMs };
  }
}

/**
 * Cleanup old rate limit entries (called periodically)
 * Removes entries older than 2x window time
 */
async function cleanupOldRateLimits(): Promise<void> {
  const cutoffTime = Date.now() - (RATE_LIMIT_CONFIG.windowMs * 2);
  
  try {
    const rateLimitsRef = rtdb.ref('rateLimits/rag');
    const snapshot = await rateLimitsRef.orderByChild('resetTime').endAt(cutoffTime).once('value');
    
    const updates: Record<string, null> = {};
    snapshot.forEach((child) => {
      updates[child.key!] = null;
    });
    
    if (Object.keys(updates).length > 0) {
      await rateLimitsRef.update(updates);
      functions.logger.info(`Cleaned up ${Object.keys(updates).length} old rate limit entries`);
    }
  } catch (error) {
    functions.logger.warn('Rate limit cleanup failed:', error);
  }
}

/**
 * 🕐 Scheduled Cloud Function for RTDB cleanup
 * Run every 5 minutes via Cloud Scheduler
 * Better than probabilistic cleanup (doesn't impact user latency)
 */
export const cleanupRateLimitsScheduled = functions.region('us-central1').runWith({
  memory: '128MB',
  timeoutSeconds: 60,
}).pubsub.schedule('every 5 minutes').onRun(async () => {
  functions.logger.info('Running scheduled rate limit cleanup');
  await cleanupOldRateLimits();
  return null;
});

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

// AI operation timeout (15 seconds for better UX)
// Users typically leave after 8-10s without response
const AI_TIMEOUT_MS = 15000;

/**
 * Main Cloud Function: Ask RAG v4.3
 * 
 * Improvements:
 * - Distributed rate limiting via RTDB
 * - AI timeout protection
 * - Better error handling
 */
export const askRAG = functions.region('us-central1').runWith({
  // v4.3.1: Increased from 256MB to prevent OOM with large indexes
  // 2025 standard: Node.js AI SDKs + JSON loading require more RAM
  memory: '512MB',
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

      // 2. Distributed Rate limiting via RTDB (v4.3)
      const rateLimitResult = await checkRateLimitDistributed(userId);
      if (!rateLimitResult.allowed) {
        const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
        functions.logger.warn(`Rate limit exceeded for user: ${userId.substring(0, 8)}..., reset in ${resetIn}s`);
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Too many requests. Please try again in ${resetIn} seconds. (${rateLimitResult.remaining} remaining)`
        );
      }

      // 3. Validate input
      const { question, topK, targetLang, history } = data;

      const validatedQuestion = validateQuestion(question);
      const validatedTopK = typeof topK === 'number' && topK > 0 && topK <= 10 ? topK : 4;
      const validatedLang = targetLang === 'en' ? 'en' : 'vi';
      
      // Validate history (v4.3 - use pairs for context continuity)
      // Take last 6 messages (3 pairs of user-assistant) to avoid cutting mid-conversation
      let validatedHistory = Array.isArray(history) 
        ? history
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
      
      // Ensure even number of messages (pairs) for context continuity
      // This prevents cutting off user's question without AI's answer
      if (validatedHistory.length % 2 !== 0) {
        validatedHistory = validatedHistory.slice(1); // Remove oldest to make even
      }
      validatedHistory = validatedHistory.slice(-6); // Max 3 pairs

      functions.logger.info('Request validated', {
        questionLength: validatedQuestion.length,
        topK: validatedTopK,
        targetLang: validatedLang,
        historyLength: validatedHistory.length,
      });

      // 4. Call RAG flow with OPTIMIZED implementation
      // Uses: Global Caching, Fast Path, Hybrid Search, AI Reranking, Query Contextualization
      const { askQuestion } = await import('./optimizedRAG');
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new functions.https.HttpsError(
            'deadline-exceeded',
            'Request timed out. Please try a simpler question.'
          ));
        }, AI_TIMEOUT_MS);
      });
      
      // Race between AI call and timeout
      const result = await Promise.race([
        askQuestion({
          question: validatedQuestion,
          topK: validatedTopK,
          targetLang: validatedLang,
          userId,  // Pass userId for analytics
          history: validatedHistory,  // NEW v4.2: Pass conversation history
        }),
        timeoutPromise,
      ]);

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
