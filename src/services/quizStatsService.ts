import { db } from '../lib/firebase/config';
import { 
  doc, 
  updateDoc, 
  increment, 
  getDoc, 
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  runTransaction,
  query,
  where,
  getDocs
} from 'firebase/firestore';

export interface QuizStats {
  views: number;
  attempts: number;
  completions: number;
  averageScore: number;
  totalScore: number;
  lastUpdated: Date;
}

export interface UserQuizActivity {
  userId: string;
  quizId: string;
  viewed: boolean;
  attempted: boolean;
  completed: boolean;
  attempts: number;
  bestScore: number;
  lastAttempt: Date;
  firstView: Date;
}

class QuizStatsService {
  // Track when user views a quiz (only for approved quizzes)
  async trackView(quizId: string, userId?: string) {
    try {
      const quizRef = doc(db, 'quizzes', quizId);
      
      // Check if quiz is approved before tracking
      const quizDoc = await getDoc(quizRef);
      if (!quizDoc.exists() || quizDoc.data().status !== 'approved') {
        console.log('Quiz not approved, skipping view tracking');
        return;
      }
      
      // Update quiz stats
      await updateDoc(quizRef, {
        'stats.views': increment(1),
        'stats.lastUpdated': serverTimestamp()
      });

      // Track user activity if logged in
      if (userId) {
        const activityRef = doc(db, 'userQuizActivities', `${userId}_${quizId}`);
        const activityDoc = await getDoc(activityRef);
        
        if (!activityDoc.exists()) {
          await setDoc(activityRef, {
            userId,
            quizId,
            viewed: true,
            attempted: false,
            completed: false,
            attempts: 0,
            bestScore: 0,
            firstView: serverTimestamp(),
            lastView: serverTimestamp()
          });
        } else {
          await updateDoc(activityRef, {
            viewed: true,
            lastView: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  }

  // Track when user starts attempting a quiz (only for approved quizzes)
  async trackAttempt(quizId: string, userId: string) {
    try {
      const quizRef = doc(db, 'quizzes', quizId);
      
      // Check if quiz is approved before tracking
      const quizDoc = await getDoc(quizRef);
      if (!quizDoc.exists() || quizDoc.data().status !== 'approved') {
        console.log('Quiz not approved, skipping attempt tracking');
        return;
      }
      
      // Update quiz stats
      await updateDoc(quizRef, {
        'stats.attempts': increment(1),
        'stats.lastUpdated': serverTimestamp()
      });

      // Track user activity
      const activityRef = doc(db, 'userQuizActivities', `${userId}_${quizId}`);
      const activityDoc = await getDoc(activityRef);
      
      if (!activityDoc.exists()) {
        await setDoc(activityRef, {
          userId,
          quizId,
          viewed: true,
          attempted: true,
          completed: false,
          attempts: 1,
          bestScore: 0,
          firstView: serverTimestamp(),
          lastAttempt: serverTimestamp()
        });
      } else {
        await updateDoc(activityRef, {
          attempted: true,
          attempts: increment(1),
          lastAttempt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error tracking attempt:', error);
    }
  }

  // Track when user completes a quiz with score (only for approved quizzes)
  async trackCompletion(quizId: string, userId: string, score: number, totalQuestions: number) {
    try {
      const percentage = Math.round((score / totalQuestions) * 100);
      
      // Update quiz stats
      const quizRef = doc(db, 'quizzes', quizId);
      const quizDoc = await getDoc(quizRef);
      
      // Check if quiz is approved before tracking stats
      if (!quizDoc.exists() || quizDoc.data().status !== 'approved') {
        console.log('Quiz not approved, skipping completion tracking for stats');
        return;
      }
      
      // ⚠️ CRITICAL: Use Firestore transaction to prevent race conditions
      // When multiple users submit simultaneously, we must ensure atomic read-modify-write
      await runTransaction(db, async (transaction) => {
        const quizSnapshot = await transaction.get(quizRef);
        
        if (!quizSnapshot.exists()) {
          // Initialize stats for new quiz
          const isCompleted = percentage >= 50;
          transaction.set(quizRef, {
            stats: {
              completions: 1,
              completedCount: isCompleted ? 1 : 0,
              totalScore: percentage,
              averageScore: percentage,
              completionRate: isCompleted ? 100 : 0,
              views: 0,
              attempts: 0,
              lastUpdated: serverTimestamp()
            }
          }, { merge: true });
          return;
        }
        
        const currentStats = quizSnapshot.data().stats || {};
        const currentCompletions = currentStats.completions || 0;
        const currentTotalScore = currentStats.totalScore || 0;
        const newTotalScore = currentTotalScore + percentage;
        const newCompletions = currentCompletions + 1;
        
        // ✅ CRITICAL FIX: Validate totalScore is not exceeding theoretical maximum
        // Maximum possible totalScore = completions * 100 (if everyone got 100%)
        const maxPossibleTotal = newCompletions * 100;
        const validatedTotalScore = Math.min(newTotalScore, maxPossibleTotal);
        
        // ✅ FIX: Ensure averageScore is always between 0-100
        const newAverageScore = Math.min(100, Math.max(0, Math.round(validatedTotalScore / newCompletions)));
        
        // ✅ CRITICAL FIX: Completion rate calculation
        const isCompleted = percentage >= 50;
        const currentCompletedCount = currentStats.completedCount || 0;
        const newCompletedCount = isCompleted ? currentCompletedCount + 1 : currentCompletedCount;
        const newCompletionRate = newCompletions > 0 ? Math.min(100, Math.max(0, Math.round((newCompletedCount / newCompletions) * 100))) : 0;

        // Debug logging
        console.log(`📊 Quiz ${quizId} stats update (transaction):`, {
          currentCompletions,
          currentTotalScore,
          newPercentage: percentage,
          newTotalScore,
          validatedTotalScore,
          newAverageScore,
          wasValidationNeeded: newTotalScore !== validatedTotalScore
        });

        transaction.update(quizRef, {
          'stats.completions': newCompletions,
          'stats.completedCount': newCompletedCount,
          'stats.totalScore': validatedTotalScore,
          'stats.averageScore': newAverageScore,
          'stats.completionRate': newCompletionRate,
          'stats.lastUpdated': serverTimestamp()
        });
      });

      // Track user activity
      const activityRef = doc(db, 'userQuizActivities', `${userId}_${quizId}`);
      const activityDoc = await getDoc(activityRef);
      
      if (activityDoc.exists()) {
        const currentBestScore = activityDoc.data().bestScore || 0;
        const newBestScore = Math.max(currentBestScore, percentage);
        
        await updateDoc(activityRef, {
          completed: true,
          bestScore: newBestScore,
          lastCompletion: serverTimestamp()
        });
      } else {
        await setDoc(activityRef, {
          userId,
          quizId,
          viewed: true,
          attempted: true,
          completed: true,
          attempts: 1,
          bestScore: percentage,
          firstView: serverTimestamp(),
          lastAttempt: serverTimestamp(),
          lastCompletion: serverTimestamp()
        });
      }

      // Log completion in global activity log
      await addDoc(collection(db, 'quizCompletions'), {
        userId,
        quizId,
        score: percentage,
        totalQuestions,
        completedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error tracking completion:', error);
    }
  }

  // Get quiz stats
  async getQuizStats(quizId: string): Promise<QuizStats | null> {
    try {
      const quizRef = doc(db, 'quizzes', quizId);
      const quizDoc = await getDoc(quizRef);
      
      if (quizDoc.exists()) {
        const data = quizDoc.data();
        return data.stats || {
          views: 0,
          attempts: 0,
          completions: 0,
          averageScore: 0,
          totalScore: 0,
          lastUpdated: new Date()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting quiz stats:', error);
      return null;
    }
  }

  // Get user activity for a quiz
  async getUserQuizActivity(userId: string, quizId: string): Promise<UserQuizActivity | null> {
    try {
      const activityRef = doc(db, 'userQuizActivities', `${userId}_${quizId}`);
      const activityDoc = await getDoc(activityRef);
      
      if (activityDoc.exists()) {
        return activityDoc.data() as UserQuizActivity;
      }
      return null;
    } catch (error) {
      console.error('Error getting user quiz activity:', error);
      return null;
    }
  }

  // Initialize stats for existing quizzes (one-time migration)
  async initializeStatsForQuiz(quizId: string) {
    try {
      const quizRef = doc(db, 'quizzes', quizId);
      await updateDoc(quizRef, {
        'stats.views': 0,
        'stats.attempts': 0,
        'stats.completions': 0,
        'stats.averageScore': 0,
        'stats.totalScore': 0,
        'stats.lastUpdated': serverTimestamp()
      });
    } catch (error) {
      console.error('Error initializing stats:', error);
    }
  }

  /**
   * Get real average score from quizResults collection
   * This is the most accurate way to calculate average score
   * because it reads directly from actual quiz results
   */
  async getRealAverageScore(quizId: string): Promise<{ averageScore: number; totalAttempts: number; completions: number }> {
    try {
      const resultsQuery = query(
        collection(db, 'quizResults'),
        where('quizId', '==', quizId)
      );
      const resultsSnapshot = await getDocs(resultsQuery);
      
      if (resultsSnapshot.empty) {
        return { averageScore: 0, totalAttempts: 0, completions: 0 };
      }

      let totalScore = 0;
      let completions = 0;

      resultsSnapshot.forEach(doc => {
        const result = doc.data();
        // Normalize score to 0-100 percentage
        const score = result.score || 0;
        totalScore += score;
        completions++;
      });

      const averageScore = completions > 0 ? Math.round(totalScore / completions) : 0;
      
      return {
        averageScore: Math.min(100, Math.max(0, averageScore)), // Ensure 0-100 range
        totalAttempts: completions,
        completions
      };
    } catch (error) {
      console.error('Error getting real average score:', error);
      return { averageScore: 0, totalAttempts: 0, completions: 0 };
    }
  }
}

export const quizStatsService = new QuizStatsService();
