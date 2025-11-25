"use strict";
/**
 * 🎯 Quiz Approval Trigger
 *
 * Automatically adds quiz to RAG index when approved by admin
 * Triggers when quiz.status changes from 'pending' -> 'approved'
 *
 * This implements Event-Driven Architecture for RAG index updates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onQuizCreatedApproved = exports.onQuizApproved = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const indexManager_1 = require("../lib/indexManager");
const optimizedRAG_1 = require("../rag/optimizedRAG");
/**
 * Firestore Trigger: When quiz document is updated
 * Detects status change to 'approved' and adds to RAG index
 */
exports.onQuizApproved = functions
    .region('us-central1')
    .runWith({
    secrets: ['GOOGLE_AI_API_KEY'],
    timeoutSeconds: 120,
    memory: '512MB',
})
    .firestore.document('quizzes/{quizId}')
    .onUpdate(async (change, context) => {
    const quizId = context.params.quizId;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const beforeStatus = beforeData === null || beforeData === void 0 ? void 0 : beforeData.status;
    const afterStatus = afterData === null || afterData === void 0 ? void 0 : afterData.status;
    // Log for debugging
    console.log(`📝 Quiz ${quizId} status change: ${beforeStatus} -> ${afterStatus}`);
    // Case 1: Quiz just got APPROVED (add to index)
    if (beforeStatus !== 'approved' && afterStatus === 'approved') {
        console.log(`✅ Quiz ${quizId} approved! Adding to RAG index...`);
        try {
            await (0, indexManager_1.addQuizToIndex)(quizId, afterData);
            // Invalidate global cache để force reload index mới
            (0, optimizedRAG_1.invalidateGlobalCache)();
            // Log successful indexing
            await admin.firestore().collection('system').doc('rag-logs').collection('events').add({
                type: 'quiz_indexed',
                quizId,
                quizTitle: afterData.title,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                success: true,
            });
            console.log(`🎉 Quiz ${quizId} successfully added to RAG index`);
        }
        catch (error) {
            console.error(`❌ Failed to index quiz ${quizId}:`, error);
            // Log error
            await admin.firestore().collection('system').doc('rag-logs').collection('events').add({
                type: 'quiz_index_failed',
                quizId,
                quizTitle: afterData.title,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return;
    }
    // Case 2: Quiz WAS approved but now is NOT (remove from index)
    if (beforeStatus === 'approved' && afterStatus !== 'approved') {
        console.log(`🚫 Quiz ${quizId} no longer approved (${afterStatus}). Removing from RAG index...`);
        try {
            await (0, indexManager_1.removeQuizFromIndex)(quizId);
            // Invalidate global cache
            (0, optimizedRAG_1.invalidateGlobalCache)();
            // Log removal
            await admin.firestore().collection('system').doc('rag-logs').collection('events').add({
                type: 'quiz_removed',
                quizId,
                quizTitle: beforeData.title,
                reason: `Status changed to ${afterStatus}`,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                success: true,
            });
            console.log(`✅ Quiz ${quizId} removed from RAG index`);
        }
        catch (error) {
            console.error(`❌ Failed to remove quiz ${quizId} from index:`, error);
        }
        return;
    }
    // Case 3: Quiz is still approved, but content might have changed
    if (beforeStatus === 'approved' && afterStatus === 'approved') {
        // Check if important content changed
        const importantFields = ['title', 'description', 'category', 'visibility'];
        const hasContentChange = importantFields.some(field => beforeData[field] !== afterData[field]);
        if (hasContentChange) {
            console.log(`🔄 Quiz ${quizId} content updated. Re-indexing...`);
            try {
                // Re-add will update existing chunks
                await (0, indexManager_1.addQuizToIndex)(quizId, afterData);
                // Invalidate global cache
                (0, optimizedRAG_1.invalidateGlobalCache)();
                // Log update
                await admin.firestore().collection('system').doc('rag-logs').collection('events').add({
                    type: 'quiz_reindexed',
                    quizId,
                    quizTitle: afterData.title,
                    changedFields: importantFields.filter(f => beforeData[f] !== afterData[f]),
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    success: true,
                });
                console.log(`✅ Quiz ${quizId} successfully re-indexed`);
            }
            catch (error) {
                console.error(`❌ Failed to re-index quiz ${quizId}:`, error);
            }
        }
        else {
            console.log(`⏭️ Quiz ${quizId} update has no content changes, skipping re-index`);
        }
        return;
    }
    // Case 4: Other status changes (draft -> pending, etc.) - no action needed
    console.log(`⏭️ Quiz ${quizId} status change (${beforeStatus} -> ${afterStatus}) does not affect RAG index`);
});
/**
 * Firestore Trigger: When a new quiz is created with 'approved' status directly
 * (Rare case, but possible for imported quizzes or admin-created quizzes)
 */
exports.onQuizCreatedApproved = functions
    .region('us-central1')
    .runWith({
    secrets: ['GOOGLE_AI_API_KEY'],
    timeoutSeconds: 120,
    memory: '512MB',
})
    .firestore.document('quizzes/{quizId}')
    .onCreate(async (snapshot, context) => {
    const quizId = context.params.quizId;
    const quizData = snapshot.data();
    // Only process if quiz is created with approved status
    if ((quizData === null || quizData === void 0 ? void 0 : quizData.status) === 'approved') {
        console.log(`🆕 New quiz ${quizId} created with approved status. Adding to RAG index...`);
        try {
            await (0, indexManager_1.addQuizToIndex)(quizId, quizData);
            // Log
            await admin.firestore().collection('system').doc('rag-logs').collection('events').add({
                type: 'new_quiz_indexed',
                quizId,
                quizTitle: quizData.title,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                success: true,
            });
            console.log(`✅ New quiz ${quizId} added to RAG index`);
        }
        catch (error) {
            console.error(`❌ Failed to index new quiz ${quizId}:`, error);
            await admin.firestore().collection('system').doc('rag-logs').collection('events').add({
                type: 'new_quiz_index_failed',
                quizId,
                quizTitle: quizData.title,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    else {
        console.log(`ℹ️ New quiz ${quizId} created with status '${quizData === null || quizData === void 0 ? void 0 : quizData.status}', not indexing`);
    }
});
//# sourceMappingURL=onQuizApproved.js.map