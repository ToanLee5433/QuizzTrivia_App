import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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
export const validateAnswer = functions.https.onCall(async (data, context) => {
  // 1. Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { roomId, questionIndex, answer, clientTimestamp } = data;
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

    const roomData = roomDoc.data()!;
    const quizId = roomData.quizId;

    // 7. Get correct answer from Firestore (not exposed to client)
    const questionRef = db.collection('quizzes').doc(quizId).collection('questions').doc(questionIndex.toString());
    const questionDoc = await questionRef.get();

    if (!questionDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Question not found');
    }

    const questionData = questionDoc.data()!;
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
  } catch (error: any) {
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
export const getPlayerQuestions = functions.https.onCall(async (data, context) => {
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

    const roomData = roomDoc.data()!;
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
      const indices = originalOptions.map((_: any, i: number) => i);
      
      // Shuffle indices
      const shuffledIndices = shuffleArray(indices, rng);
      
      // Reorder options
      const shuffledOptions = shuffledIndices.map((i: number) => originalOptions[i]);
      
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
  } catch (error: any) {
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
export const checkRateLimit = functions.https.onCall(async (data, context) => {
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
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many requests. Please slow down.'
      );
    }

    // Record this check
    await submissionsRef.push({
      timestamp: Date.now(),
      type: 'rate_check',
    });

    return { allowed: true };
  } catch (error: any) {
    functions.logger.error('Rate limit check error', {
      userId,
      roomId,
      error: error.message,
    });
    throw error;
  }
});

/**
 * Archive completed rooms older than 7 days
 * Scheduled function to clean up old data
 */
export const archiveCompletedRooms = functions.pubsub
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

      const archivePromises: Promise<any>[] = [];
      let archiveCount = 0;

      roomsSnap.forEach((roomSnap) => {
        const roomId = roomSnap.key!;
        const roomData = roomSnap.val();

        // Archive to Firestore (cheaper long-term storage)
        archivePromises.push(
          db.collection('archivedRooms').doc(roomId).set({
            ...roomData,
            archivedAt: admin.firestore.FieldValue.serverTimestamp(),
          })
        );

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
    } catch (error: any) {
      functions.logger.error('Archive rooms error', { error: error.message });
      throw error;
    }
  });

/**
 * Helper: Hash code for deterministic seeding
 */
function hashCode(str: string): number {
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
function createSeededRandom(seed: number) {
  let state = seed;
  return function () {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/**
 * Helper: Shuffle array using seeded random
 */
function shuffleArray<T>(array: T[], rng: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
