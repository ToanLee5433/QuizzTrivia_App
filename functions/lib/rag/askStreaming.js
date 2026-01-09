"use strict";
/**
 * 🚀 RAG Streaming Function - Real-time Response via Firestore
 *
 * Uses Firestore to stream AI response in real-time to the client.
 * This approach:
 * - Eliminates timeout errors (client listens to Firestore)
 * - Provides progressive response display (like ChatGPT)
 * - Better UX with immediate feedback
 *
 * Architecture:
 * 1. Client calls askRAGStreaming → creates session in Firestore
 * 2. Function processes request and writes chunks to session
 * 3. Client listens to session document via onSnapshot
 * 4. Response appears progressively as chunks are written
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupStreamingSessions = exports.askRAGStreaming = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Session collection for streaming responses
const STREAMING_COLLECTION = 'ragStreamingSessions';
// Session TTL - auto-delete after 1 hour
const SESSION_TTL_MS = 60 * 60 * 1000;
// Rate limit configuration (reuse from ask.ts)
const rtdb = admin.database();
const RATE_LIMIT_CONFIG = {
    maxRequests: 20,
    windowMs: 60 * 1000,
};
/**
 * Rate limiter (copied from ask.ts for independence)
 */
async function checkRateLimitDistributed(userId) {
    const now = Date.now();
    const userRef = rtdb.ref(`rateLimits/ragStream/${userId}`);
    try {
        const result = await userRef.transaction((currentData) => {
            if (!currentData || now > currentData.resetTime) {
                return {
                    count: 1,
                    resetTime: now + RATE_LIMIT_CONFIG.windowMs,
                    lastRequest: now,
                };
            }
            return Object.assign(Object.assign({}, currentData), { count: currentData.count + 1, lastRequest: now });
        });
        if (!result.committed || !result.snapshot.val()) {
            return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxRequests, resetTime: now + RATE_LIMIT_CONFIG.windowMs };
        }
        const data = result.snapshot.val();
        const allowed = data.count <= RATE_LIMIT_CONFIG.maxRequests;
        const remaining = Math.max(0, RATE_LIMIT_CONFIG.maxRequests - data.count);
        return { allowed, remaining, resetTime: data.resetTime };
    }
    catch (error) {
        functions.logger.warn('Rate limit check failed:', error);
        return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxRequests, resetTime: now + RATE_LIMIT_CONFIG.windowMs };
    }
}
/**
 * Validate question input
 */
function validateQuestion(question) {
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
 * Update session with new chunk (for streaming effect)
 */
async function updateSessionChunk(sessionId, chunk, fullText) {
    const sessionRef = db.collection(STREAMING_COLLECTION).doc(sessionId);
    await sessionRef.update({
        chunks: admin.firestore.FieldValue.arrayUnion(chunk),
        currentText: fullText,
        updatedAt: admin.firestore.Timestamp.now(),
    });
}
/**
 * Complete session with final data
 */
async function completeSession(sessionId, result) {
    const sessionRef = db.collection(STREAMING_COLLECTION).doc(sessionId);
    await sessionRef.update({
        status: 'completed',
        currentText: result.answer,
        citations: result.citations || [],
        quizRecommendations: result.quizRecommendations || [],
        usedChunks: result.usedChunks || 0,
        processingTime: result.processingTime || 0,
        updatedAt: admin.firestore.Timestamp.now(),
    });
}
/**
 * Mark session as error
 */
async function errorSession(sessionId, errorMessage) {
    const sessionRef = db.collection(STREAMING_COLLECTION).doc(sessionId);
    await sessionRef.update({
        status: 'error',
        error: errorMessage,
        updatedAt: admin.firestore.Timestamp.now(),
    });
}
/**
 * 🚀 Main Streaming Function
 *
 * Creates a Firestore session and processes the request.
 * Client should listen to the session document for updates.
 */
exports.askRAGStreaming = functions.region('us-central1').runWith({
    memory: '512MB',
    timeoutSeconds: 300,
    maxInstances: 20,
    secrets: ['GOOGLE_AI_API_KEY'],
}).https.onCall(async (data, context) => {
    const startTime = Date.now();
    try {
        // 1. Validate authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const userId = context.auth.uid;
        // 2. Rate limiting
        const rateLimitResult = await checkRateLimitDistributed(userId);
        if (!rateLimitResult.allowed) {
            const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
            throw new functions.https.HttpsError('resource-exhausted', `Too many requests. Please try again in ${resetIn} seconds.`);
        }
        // 3. Validate input
        const { question, topK, targetLang, history } = data;
        const validatedQuestion = validateQuestion(question);
        const validatedTopK = typeof topK === 'number' && topK > 0 && topK <= 10 ? topK : 4;
        const validatedLang = targetLang === 'en' ? 'en' : 'vi';
        // Validate history
        let validatedHistory = Array.isArray(history)
            ? history
                .filter((m) => m &&
                typeof m.role === 'string' &&
                typeof m.content === 'string' &&
                (m.role === 'user' || m.role === 'assistant'))
                .map((m) => ({
                role: m.role,
                content: m.content.substring(0, 500),
            }))
            : [];
        if (validatedHistory.length % 2 !== 0) {
            validatedHistory = validatedHistory.slice(1);
        }
        validatedHistory = validatedHistory.slice(-6);
        // 4. Create streaming session
        const sessionRef = db.collection(STREAMING_COLLECTION).doc();
        const sessionId = sessionRef.id;
        const initialSession = {
            status: 'pending',
            userId,
            question: validatedQuestion,
            chunks: [],
            currentText: '',
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        };
        await sessionRef.set(initialSession);
        functions.logger.info('Streaming session created', { sessionId, userId: userId.substring(0, 8) });
        // 5. Update status to processing
        await sessionRef.update({
            status: 'processing',
            updatedAt: admin.firestore.Timestamp.now(),
        });
        // 6. Process in background (don't await - let client listen to Firestore)
        // NOTE: We still need to await to ensure function doesn't terminate early
        try {
            const { askQuestion } = await Promise.resolve().then(() => require('./optimizedRAG'));
            // Simulate streaming by updating progress messages
            await updateSessionChunk(sessionId, '🔍', '🔍 Đang phân tích câu hỏi...');
            const result = await askQuestion({
                question: validatedQuestion,
                topK: validatedTopK,
                targetLang: validatedLang,
                userId,
                history: validatedHistory,
            });
            // Complete the session
            await completeSession(sessionId, result);
            functions.logger.info('Streaming session completed', {
                sessionId,
                processingTime: Date.now() - startTime,
            });
        }
        catch (processError) {
            const errorMessage = processError instanceof Error
                ? processError.message
                : 'Processing failed';
            await errorSession(sessionId, errorMessage);
            functions.logger.error('Streaming processing failed', {
                sessionId,
                error: errorMessage,
            });
        }
        // 7. Return session ID immediately
        // Client will listen to Firestore for updates
        return {
            success: true,
            sessionId,
            message: 'Session created. Listen to Firestore for updates.',
        };
    }
    catch (error) {
        functions.logger.error('askRAGStreaming error:', error);
        if (error && error.code) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to create streaming session. Please try again.');
    }
});
/**
 * 🧹 Cleanup old streaming sessions (scheduled)
 * Run every hour to delete sessions older than TTL
 */
exports.cleanupStreamingSessions = functions.region('us-central1').runWith({
    memory: '128MB',
    timeoutSeconds: 60,
}).pubsub.schedule('every 1 hours').onRun(async () => {
    const cutoffTime = admin.firestore.Timestamp.fromMillis(Date.now() - SESSION_TTL_MS);
    try {
        const oldSessions = await db
            .collection(STREAMING_COLLECTION)
            .where('createdAt', '<', cutoffTime)
            .limit(500) // Batch delete
            .get();
        if (oldSessions.empty) {
            functions.logger.info('No old streaming sessions to cleanup');
            return null;
        }
        const batch = db.batch();
        oldSessions.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        functions.logger.info(`Cleaned up ${oldSessions.size} old streaming sessions`);
    }
    catch (error) {
        functions.logger.error('Streaming session cleanup failed:', error);
    }
    return null;
});
//# sourceMappingURL=askStreaming.js.map