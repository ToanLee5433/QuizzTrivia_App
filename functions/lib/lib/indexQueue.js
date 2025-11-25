"use strict";
/**
 * 📋 Index Update Queue Manager
 *
 * Manages sequential processing of index updates to prevent race conditions
 * Ensures data integrity when multiple updates happen concurrently
 *
 * Architecture:
 * - Uses Firestore collection as queue
 * - Scheduled function processes queue every minute
 * - Guarantees sequential, atomic updates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelTask = exports.retryFailedTasks = exports.cleanupQueue = exports.getQueueStats = exports.processQueue = exports.enqueueIndexUpdate = void 0;
const admin = require("firebase-admin");
const indexManager_1 = require("./indexManager");
const QUEUE_COLLECTION = 'index_update_queue';
const MAX_RETRIES = 3;
/**
 * Enqueue an index update task
 */
async function enqueueIndexUpdate(task) {
    const taskData = Object.assign(Object.assign({}, task), { status: 'pending', createdAt: Date.now(), retryCount: 0 });
    const docRef = await admin.firestore().collection(QUEUE_COLLECTION).add(taskData);
    console.log(`✅ Enqueued task ${docRef.id}: ${task.type} quiz ${task.quizId}`);
    return docRef.id;
}
exports.enqueueIndexUpdate = enqueueIndexUpdate;
/**
 * Process a single task
 */
async function processTask(taskId, task) {
    console.log(`🔄 Processing task ${taskId}: ${task.type} quiz ${task.quizId}`);
    try {
        switch (task.type) {
            case 'create':
                if (!task.quizData) {
                    throw new Error('Missing quizData for create task');
                }
                await (0, indexManager_1.addQuizToIndex)(task.quizId, task.quizData);
                break;
            case 'update':
                if (!task.quizData) {
                    throw new Error('Missing quizData for update task');
                }
                await (0, indexManager_1.updateQuizInIndex)(task.quizId, task.oldQuizData, task.quizData);
                break;
            case 'delete':
                await (0, indexManager_1.removeQuizFromIndex)(task.quizId);
                break;
            default:
                throw new Error(`Unknown task type: ${task.type}`);
        }
        console.log(`✅ Task ${taskId} completed successfully`);
    }
    catch (error) {
        console.error(`❌ Task ${taskId} failed:`, error);
        throw error;
    }
}
/**
 * Process all pending tasks in the queue
 * Called by scheduled function
 */
async function processQueue(batchSize = 10) {
    console.log(`📋 Processing index update queue (batch size: ${batchSize})...`);
    const stats = {
        processed: 0,
        succeeded: 0,
        failed: 0,
    };
    try {
        // Get pending tasks (ordered by creation time)
        const querySnapshot = await admin
            .firestore()
            .collection(QUEUE_COLLECTION)
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .limit(batchSize)
            .get();
        if (querySnapshot.empty) {
            console.log('ℹ️ Queue is empty');
            return stats;
        }
        console.log(`📊 Found ${querySnapshot.size} pending tasks`);
        // Process tasks sequentially
        for (const doc of querySnapshot.docs) {
            const taskId = doc.id;
            const task = doc.data();
            stats.processed++;
            try {
                // Mark as processing
                await doc.ref.update({
                    status: 'processing',
                    processedAt: Date.now(),
                });
                // Process the task
                await processTask(taskId, task);
                // Mark as completed
                await doc.ref.update({
                    status: 'completed',
                    processedAt: Date.now(),
                });
                stats.succeeded++;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const retryCount = (task.retryCount || 0) + 1;
                if (retryCount >= MAX_RETRIES) {
                    // Max retries reached, mark as failed
                    await doc.ref.update({
                        status: 'failed',
                        error: errorMessage,
                        retryCount,
                        processedAt: Date.now(),
                    });
                    console.error(`❌ Task ${taskId} failed after ${MAX_RETRIES} retries`);
                    stats.failed++;
                }
                else {
                    // Retry: reset to pending with incremented retry count
                    await doc.ref.update({
                        status: 'pending',
                        error: errorMessage,
                        retryCount,
                    });
                    console.warn(`⚠️ Task ${taskId} will be retried (attempt ${retryCount}/${MAX_RETRIES})`);
                }
            }
        }
        console.log(`✅ Queue processing complete: ${stats.succeeded} succeeded, ${stats.failed} failed`);
        return stats;
    }
    catch (error) {
        console.error('❌ Error processing queue:', error);
        throw error;
    }
}
exports.processQueue = processQueue;
/**
 * Get queue statistics
 */
async function getQueueStats() {
    try {
        const [pending, processing, completed, failed] = await Promise.all([
            admin
                .firestore()
                .collection(QUEUE_COLLECTION)
                .where('status', '==', 'pending')
                .count()
                .get(),
            admin
                .firestore()
                .collection(QUEUE_COLLECTION)
                .where('status', '==', 'processing')
                .count()
                .get(),
            admin
                .firestore()
                .collection(QUEUE_COLLECTION)
                .where('status', '==', 'completed')
                .count()
                .get(),
            admin
                .firestore()
                .collection(QUEUE_COLLECTION)
                .where('status', '==', 'failed')
                .count()
                .get(),
        ]);
        return {
            pending: pending.data().count,
            processing: processing.data().count,
            completed: completed.data().count,
            failed: failed.data().count,
            total: pending.data().count +
                processing.data().count +
                completed.data().count +
                failed.data().count,
        };
    }
    catch (error) {
        console.error('Error getting queue stats:', error);
        throw error;
    }
}
exports.getQueueStats = getQueueStats;
/**
 * Clean up old completed tasks (keep last 7 days)
 */
async function cleanupQueue(keepDays = 7) {
    try {
        const cutoffTime = Date.now() - keepDays * 24 * 60 * 60 * 1000;
        const querySnapshot = await admin
            .firestore()
            .collection(QUEUE_COLLECTION)
            .where('status', 'in', ['completed', 'failed'])
            .where('processedAt', '<', cutoffTime)
            .get();
        if (querySnapshot.empty) {
            console.log('ℹ️ No old tasks to clean up');
            return 0;
        }
        const batch = admin.firestore().batch();
        querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`🗑️ Cleaned up ${querySnapshot.size} old tasks`);
        return querySnapshot.size;
    }
    catch (error) {
        console.error('Error cleaning up queue:', error);
        throw error;
    }
}
exports.cleanupQueue = cleanupQueue;
/**
 * Retry all failed tasks
 */
async function retryFailedTasks() {
    try {
        const querySnapshot = await admin
            .firestore()
            .collection(QUEUE_COLLECTION)
            .where('status', '==', 'failed')
            .get();
        if (querySnapshot.empty) {
            console.log('ℹ️ No failed tasks to retry');
            return 0;
        }
        const batch = admin.firestore().batch();
        querySnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                status: 'pending',
                retryCount: 0,
                error: admin.firestore.FieldValue.delete(),
            });
        });
        await batch.commit();
        console.log(`🔄 Retrying ${querySnapshot.size} failed tasks`);
        return querySnapshot.size;
    }
    catch (error) {
        console.error('Error retrying failed tasks:', error);
        throw error;
    }
}
exports.retryFailedTasks = retryFailedTasks;
/**
 * Cancel a pending task
 */
async function cancelTask(taskId) {
    const taskRef = admin.firestore().collection(QUEUE_COLLECTION).doc(taskId);
    const task = await taskRef.get();
    if (!task.exists) {
        throw new Error(`Task ${taskId} not found`);
    }
    const taskData = task.data();
    if (taskData.status !== 'pending') {
        throw new Error(`Cannot cancel task with status: ${taskData.status}`);
    }
    await taskRef.delete();
    console.log(`❌ Cancelled task ${taskId}`);
}
exports.cancelTask = cancelTask;
//# sourceMappingURL=indexQueue.js.map