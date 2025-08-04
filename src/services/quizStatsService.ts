import { db } from '../lib/firebase/config';
import { 
  doc, 
  updateDoc, 
  increment, 
  getDoc, 
  setDoc,
  collection,
  addDoc,
  serverTimestamp
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
  // Track when user views a quiz
  async trackView(quizId: string, userId?: string) {
    try {
      // Update quiz stats
      const quizRef = doc(db, 'quizzes', quizId);
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

  // Track when user starts attempting a quiz
  async trackAttempt(quizId: string, userId: string) {
    try {
      // Update quiz stats
      const quizRef = doc(db, 'quizzes', quizId);
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

  // Track when user completes a quiz with score
  async trackCompletion(quizId: string, userId: string, score: number, totalQuestions: number) {
    try {
      const percentage = Math.round((score / totalQuestions) * 100);
      
      // Update quiz stats
      const quizRef = doc(db, 'quizzes', quizId);
      const quizDoc = await getDoc(quizRef);
      
      if (quizDoc.exists()) {
        const currentStats = quizDoc.data().stats || {};
        const currentCompletions = currentStats.completions || 0;
        const currentTotalScore = currentStats.totalScore || 0;
        const newTotalScore = currentTotalScore + percentage;
        const newCompletions = currentCompletions + 1;
        const newAverageScore = Math.round(newTotalScore / newCompletions);

        await updateDoc(quizRef, {
          'stats.completions': increment(1),
          'stats.totalScore': increment(percentage),
          'stats.averageScore': newAverageScore,
          'stats.lastUpdated': serverTimestamp()
        });
      } else {
        // Initialize stats if not exists
        await updateDoc(quizRef, {
          'stats.completions': 1,
          'stats.totalScore': percentage,
          'stats.averageScore': percentage,
          'stats.views': increment(0),
          'stats.attempts': increment(0),
          'stats.lastUpdated': serverTimestamp()
        });
      }

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
}

export const quizStatsService = new QuizStatsService();
