"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualCleanupRooms = exports.onPlayerStatusChange = exports.cleanupAbandonedRooms = exports.archiveCompletedRooms = exports.kickPlayer = exports.checkRateLimit = exports.getPlayerQuestions = exports.validateAnswer = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const rtdb = admin.database();
/**
 * Server-side answer validation and scoring
 * Prevents client-side score manipulation
 */
exports.validateAnswer = functions.https.onCall(async (data, context) => {
    // 1. Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { roomId, questionIndex, answer } = data;
    const userId = context.auth.uid;
    try {
        // 2. Get server timestamp
        const serverTime = Date.now();
        // 3. Get game state from RTDB
        const gameStateRef = rtdb.ref(`rooms/${roomId}/gameState`);
        const gameStateSnap = await gameStateRef.once('value');
        const gameState = gameStateSnap.val();
        if (!gameState) {
            throw new functions.https.HttpsError('not-found', 'Game state not found');
        }
        // 4. Validate time window (reject if > timeLimit + 2s grace period)
        const questionStartTime = gameState.questionStartTime;
        const timeLimit = gameState.timeLimit;
        const timeTaken = serverTime - questionStartTime;
        if (timeTaken > (timeLimit + 2) * 1000) {
            throw new functions.https.HttpsError('deadline-exceeded', 'Answer submitted too late');
        }
        // 5. Prevent duplicate submissions
        const existingAnswerRef = rtdb.ref(`rooms/${roomId}/answers/${questionIndex}/${userId}`);
        const existingAnswer = await existingAnswerRef.once('value');
        if (existingAnswer.exists()) {
            throw new functions.https.HttpsError('already-exists', 'Answer already submitted');
        }
        // 6. Get room data from Firestore to find quizId
        const roomRef = db.collection('multiplayer_rooms').doc(roomId);
        const roomDoc = await roomRef.get();
        if (!roomDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Room not found');
        }
        const roomData = roomDoc.data();
        const quizId = roomData.quizId;
        // 7. Get correct answer from Firestore (not exposed to client)
        const questionRef = db.collection('quizzes').doc(quizId).collection('questions').doc(questionIndex.toString());
        const questionDoc = await questionRef.get();
        if (!questionDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Question not found');
        }
        const questionData = questionDoc.data();
        const correctAnswer = questionData.correctAnswer;
        const isCorrect = answer === correctAnswer;
        // 8. Calculate score server-side (1000 base + speed bonus up to 500)
        const timeToAnswer = timeTaken;
        const speedBonus = Math.floor(500 * Math.max(0, 1 - timeToAnswer / (timeLimit * 1000)));
        const points = isCorrect ? 1000 + speedBonus : 0;
        // 9. Write answer to RTDB
        await existingAnswerRef.set({
            answer,
            isCorrect,
            points,
            timestamp: serverTime,
            timeToAnswer,
            validated: true,
        });
        // 10. Update leaderboard in RTDB
        const leaderboardRef = rtdb.ref(`rooms/${roomId}/leaderboard/${userId}`);
        const leaderboardSnap = await leaderboardRef.once('value');
        const currentData = leaderboardSnap.val() || { score: 0, correctAnswers: 0, streak: 0 };
        await leaderboardRef.update({
            score: currentData.score + points,
            correctAnswers: currentData.correctAnswers + (isCorrect ? 1 : 0),
            streak: isCorrect ? (currentData.streak || 0) + 1 : 0,
            lastAnswerTime: serverTime,
        });
        functions.logger.info('Answer validated', {
            userId,
            roomId,
            questionIndex,
            isCorrect,
            points,
            timeTaken,
        });
        return {
            success: true,
            isCorrect,
            points,
            correctAnswer,
            timeToAnswer: timeTaken,
        };
    }
    catch (error) {
        functions.logger.error('Answer validation error', {
            userId,
            roomId,
            questionIndex,
            error: error.message,
        });
        throw error;
    }
});
/**
 * Generate player-specific question variants with randomized options
 * Prevents cheating by ensuring each player sees options in different order
 */
exports.getPlayerQuestions = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { roomId, userId } = data;
    try {
        // Get room data
        const roomRef = db.collection('multiplayer_rooms').doc(roomId);
        const roomDoc = await roomRef.get();
        if (!roomDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Room not found');
        }
        const roomData = roomDoc.data();
        const quizId = roomData.quizId;
        // Get all questions
        const questionsSnap = await db
            .collection('quizzes')
            .doc(quizId)
            .collection('questions')
            .orderBy('order')
            .get();
        // Create deterministic seed from userId + roomId for consistent shuffling
        const seed = hashCode(userId + roomId);
        const rng = createSeededRandom(seed);
        // Shuffle options for each question using seeded random
        const playerQuestions = questionsSnap.docs.map((doc) => {
            const questionData = doc.data();
            const originalOptions = questionData.options || [];
            const correctAnswer = questionData.correctAnswer;
            // Create array of option indices
            const indices = originalOptions.map((_, i) => i);
            // Shuffle indices
            const shuffledIndices = shuffleArray(indices, rng);
            // Reorder options
            const shuffledOptions = shuffledIndices.map((i) => originalOptions[i]);
            // Find new position of correct answer
            const newCorrectAnswer = shuffledIndices.indexOf(correctAnswer);
            return {
                id: doc.id,
                question: questionData.question,
                options: shuffledOptions,
                correctAnswer: newCorrectAnswer,
                explanation: questionData.explanation,
                imageUrl: questionData.imageUrl,
                type: questionData.type,
                order: questionData.order,
            };
        });
        return { questions: playerQuestions };
    }
    catch (error) {
        functions.logger.error('Get player questions error', {
            userId,
            roomId,
            error: error.message,
        });
        throw new functions.https.HttpsError('internal', error.message);
    }
});
/**
 * Rate limiting for answer submissions
 * Prevents spam/brute force attacks
 */
exports.checkRateLimit = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { roomId } = data;
    const userId = context.auth.uid;
    try {
        const submissionsRef = rtdb.ref(`rooms/${roomId}/submissions/${userId}`);
        const recentSubmissions = await submissionsRef
            .orderByChild('timestamp')
            .startAt(Date.now() - 1000) // Last 1 second
            .once('value');
        if (recentSubmissions.numChildren() > 1) {
            throw new functions.https.HttpsError('resource-exhausted', 'Too many requests. Please slow down.');
        }
        // Record this check
        await submissionsRef.push({
            timestamp: Date.now(),
            type: 'rate_check',
        });
        return { allowed: true };
    }
    catch (error) {
        functions.logger.error('Rate limit check error', {
            userId,
            roomId,
            error: error.message,
        });
        throw error;
    }
});
/**
 * Kick a player from a multiplayer room
 * Only the host can kick players
 */
exports.kickPlayer = functions.https.onCall(async (data, context) => {
    // 1. Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { roomId, playerIdToKick } = data;
    const hostId = context.auth.uid;
    if (!roomId || !playerIdToKick) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }
    if (hostId === playerIdToKick) {
        throw new functions.https.HttpsError('invalid-argument', 'Cannot kick yourself');
    }
    try {
        // 2. Verify the requester is the host
        const roomRef = rtdb.ref(`rooms/${roomId}`);
        const roomSnap = await roomRef.once('value');
        const roomData = roomSnap.val();
        if (!roomData) {
            throw new functions.https.HttpsError('not-found', 'Room not found');
        }
        if (roomData.hostId !== hostId) {
            throw new functions.https.HttpsError('permission-denied', 'Only the host can kick players');
        }
        // 3. Remove player from room
        await rtdb.ref(`rooms/${roomId}/players/${playerIdToKick}`).remove();
        // 4. Add system message to chat
        await rtdb.ref(`rooms/${roomId}/chat`).push({
            userId: 'system',
            username: 'System',
            message: `A player has been removed from the room`,
            timestamp: Date.now(),
            type: 'system'
        });
        functions.logger.info('Player kicked', {
            roomId,
            hostId,
            kickedPlayerId: playerIdToKick,
        });
        return {
            success: true,
            message: 'Player kicked successfully',
        };
    }
    catch (error) {
        functions.logger.error('Kick player error', {
            roomId,
            hostId,
            playerIdToKick,
            error: error.message,
        });
        throw error;
    }
});
/**
 * Archive completed rooms older than 7 days
 * Scheduled function to clean up old data
 */
exports.archiveCompletedRooms = functions.pubsub
    .schedule('every 24 hours')
    .timeZone('Asia/Ho_Chi_Minh')
    .onRun(async (context) => {
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
    try {
        // Find completed rooms older than 7 days
        const roomsSnap = await rtdb
            .ref('rooms')
            .orderByChild('endedAt')
            .endBefore(cutoffTime)
            .once('value');
        const archivePromises = [];
        let archiveCount = 0;
        roomsSnap.forEach((roomSnap) => {
            const roomId = roomSnap.key;
            const roomData = roomSnap.val();
            // Archive to Firestore (cheaper long-term storage)
            archivePromises.push(db.collection('archivedRooms').doc(roomId).set(Object.assign(Object.assign({}, roomData), { archivedAt: admin.firestore.FieldValue.serverTimestamp() })));
            // Delete from RTDB
            archivePromises.push(rtdb.ref(`rooms/${roomId}`).remove());
            archiveCount++;
        });
        await Promise.all(archivePromises);
        functions.logger.info('Archived completed rooms', {
            count: archiveCount,
            cutoffTime: new Date(cutoffTime).toISOString(),
        });
        return { success: true, archived: archiveCount };
    }
    catch (error) {
        functions.logger.error('Archive rooms error', { error: error.message });
        throw error;
    }
});
/**
 * Helper: Hash code for deterministic seeding
 */
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}
/**
 * Helper: Create seeded random number generator
 */
function createSeededRandom(seed) {
    let state = seed;
    return function () {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
    };
}
/**
 * Helper: Shuffle array using seeded random
 */
function shuffleArray(array, rng) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
/**
 * Auto-cleanup abandoned rooms after 30 minutes of inactivity
 * A room is considered abandoned when NO players are online for 30 minutes
 * This runs every 5 minutes to check and clean up
 */
exports.cleanupAbandonedRooms = functions.pubsub
    .schedule('every 5 minutes')
    .timeZone('Asia/Ho_Chi_Minh')
    .onRun(async () => {
    const CLEANUP_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    try {
        functions.logger.info('Starting abandoned room cleanup check...');
        // Get all rooms from RTDB
        const roomsSnap = await rtdb.ref('rooms').once('value');
        const rooms = roomsSnap.val() || {};
        let deletedCount = 0;
        const deletePromises = [];
        for (const [roomId, roomData] of Object.entries(rooms)) {
            const room = roomData;
            const players = room.players || {};
            // Check if any player is online
            const hasOnlinePlayers = Object.values(players).some((player) => (player === null || player === void 0 ? void 0 : player.isOnline) === true);
            if (hasOnlinePlayers) {
                // Room is active - reset or clear lastEmptyAt
                if (room.lastEmptyAt) {
                    deletePromises.push(rtdb.ref(`rooms/${roomId}/lastEmptyAt`).remove());
                }
                continue;
            }
            // No online players - check lastEmptyAt
            const lastEmptyAt = room.lastEmptyAt;
            if (!lastEmptyAt) {
                // First time detecting empty room - set timestamp
                functions.logger.info(`Room ${roomId} is now empty, starting 30min countdown`);
                deletePromises.push(rtdb.ref(`rooms/${roomId}/lastEmptyAt`).set(now));
                continue;
            }
            // Check if 30 minutes have passed since room became empty
            const emptyDuration = now - lastEmptyAt;
            if (emptyDuration >= CLEANUP_THRESHOLD_MS) {
                functions.logger.info(`Deleting abandoned room ${roomId} (empty for ${Math.round(emptyDuration / 60000)} minutes)`);
                // Delete from RTDB
                deletePromises.push(rtdb.ref(`rooms/${roomId}`).remove());
                // Delete from Firestore (multiplayer_rooms collection)
                deletePromises.push(deleteFirestoreRoom(roomId));
                deletedCount++;
            }
            else {
                functions.logger.debug(`Room ${roomId} empty for ${Math.round(emptyDuration / 60000)} minutes, waiting...`);
            }
        }
        await Promise.all(deletePromises);
        functions.logger.info('Abandoned room cleanup completed', {
            totalRooms: Object.keys(rooms).length,
            deletedRooms: deletedCount,
        });
        return { success: true, deleted: deletedCount };
    }
    catch (error) {
        functions.logger.error('Cleanup abandoned rooms error', { error: error.message });
        throw error;
    }
});
/**
 * Helper: Delete Firestore room and all subcollections
 */
async function deleteFirestoreRoom(roomId) {
    try {
        const roomRef = db.collection('multiplayer_rooms').doc(roomId);
        // Check if room exists
        const roomDoc = await roomRef.get();
        if (!roomDoc.exists) {
            functions.logger.debug(`Firestore room ${roomId} doesn't exist, skipping`);
            return;
        }
        // Delete players subcollection
        const playersSnap = await roomRef.collection('players').get();
        const playerDeletes = playersSnap.docs.map(doc => doc.ref.delete());
        await Promise.all(playerDeletes);
        // Delete messages subcollection
        const messagesSnap = await roomRef.collection('messages').get();
        const messageDeletes = messagesSnap.docs.map(doc => doc.ref.delete());
        await Promise.all(messageDeletes);
        // Delete submissions subcollection
        const submissionsSnap = await roomRef.collection('submissions').get();
        const submissionDeletes = submissionsSnap.docs.map(doc => doc.ref.delete());
        await Promise.all(submissionDeletes);
        // Finally delete the room document itself
        await roomRef.delete();
        functions.logger.info(`Deleted Firestore room ${roomId} and all subcollections`);
    }
    catch (error) {
        functions.logger.error(`Failed to delete Firestore room ${roomId}`, { error: error.message });
    }
}
/**
 * Trigger: When a player's online status changes
 * If all players go offline, set lastEmptyAt timestamp
 * If a player comes online, clear lastEmptyAt (reset countdown)
 */
exports.onPlayerStatusChange = functions.database
    .ref('rooms/{roomId}/players/{playerId}/isOnline')
    .onWrite(async (change, context) => {
    const { roomId, playerId } = context.params;
    const isOnline = change.after.val();
    const wasOnline = change.before.val();
    // Skip if no actual change
    if (isOnline === wasOnline)
        return null;
    try {
        const roomRef = rtdb.ref(`rooms/${roomId}`);
        const roomSnap = await roomRef.once('value');
        const roomData = roomSnap.val();
        if (!roomData) {
            functions.logger.warn(`Room ${roomId} not found during status change`);
            return null;
        }
        const players = roomData.players || {};
        // Check if any player is online
        const hasOnlinePlayers = Object.values(players).some((player) => (player === null || player === void 0 ? void 0 : player.isOnline) === true);
        if (hasOnlinePlayers) {
            // Someone is online - clear lastEmptyAt if exists
            if (roomData.lastEmptyAt) {
                await roomRef.child('lastEmptyAt').remove();
                functions.logger.info(`Room ${roomId}: Player came online, reset cleanup countdown`);
            }
        }
        else {
            // No one online - set lastEmptyAt if not already set
            if (!roomData.lastEmptyAt) {
                await roomRef.child('lastEmptyAt').set(Date.now());
                functions.logger.info(`Room ${roomId}: All players offline, starting 30min cleanup countdown`);
            }
        }
        return null;
    }
    catch (error) {
        functions.logger.error(`Error handling player status change for room ${roomId}`, {
            error: error.message,
            playerId,
            isOnline
        });
        return null;
    }
});
/**
 * HTTP endpoint to manually trigger cleanup (for admin use)
 * Can be called to immediately check and clean up abandoned rooms
 */
exports.manualCleanupRooms = functions.https.onCall(async (data, context) => {
    // Only allow authenticated admins
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    // Check if user is admin (optional: implement admin check)
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    const forceDelete = (data === null || data === void 0 ? void 0 : data.forceDelete) === true;
    const CLEANUP_THRESHOLD_MS = forceDelete ? 0 : 30 * 60 * 1000;
    const now = Date.now();
    try {
        const roomsSnap = await rtdb.ref('rooms').once('value');
        const rooms = roomsSnap.val() || {};
        let deletedCount = 0;
        const roomsInfo = [];
        for (const [roomId, roomData] of Object.entries(rooms)) {
            const room = roomData;
            const players = room.players || {};
            const hasOnlinePlayers = Object.values(players).some((player) => (player === null || player === void 0 ? void 0 : player.isOnline) === true);
            const playerCount = Object.keys(players).length;
            const onlineCount = Object.values(players).filter((player) => (player === null || player === void 0 ? void 0 : player.isOnline) === true).length;
            roomsInfo.push({
                roomId,
                playerCount,
                onlineCount,
                lastEmptyAt: room.lastEmptyAt,
                createdAt: room.createdAt,
                hasOnlinePlayers
            });
            // Delete if no online players and (forceDelete or past threshold)
            if (!hasOnlinePlayers) {
                const lastEmptyAt = room.lastEmptyAt || now;
                const emptyDuration = now - lastEmptyAt;
                if (forceDelete || emptyDuration >= CLEANUP_THRESHOLD_MS) {
                    await rtdb.ref(`rooms/${roomId}`).remove();
                    await deleteFirestoreRoom(roomId);
                    deletedCount++;
                }
            }
        }
        return {
            success: true,
            totalRooms: Object.keys(rooms).length,
            deletedRooms: deletedCount,
            roomsInfo
        };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});
//# sourceMappingURL=index.js.map