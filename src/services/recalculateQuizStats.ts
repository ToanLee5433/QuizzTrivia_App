import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

/**
 * Recalculate quiz stats from quizResults collection
 * This fixes stats for quizzes that have old data
 */
export async function recalculateQuizStats(quizId: string): Promise<void> {
  try {
    console.log(`📊 Recalculating stats for quiz: ${quizId}`);
    
    // Get all quiz results
    const resultsQuery = query(
      collection(db, 'quizResults'),
      where('quizId', '==', quizId)
    );
    
    const resultsSnapshot = await getDocs(resultsQuery);
    const results = resultsSnapshot.docs.map(doc => doc.data());
    
    if (results.length === 0) {
      console.log('No results found, initializing with 0 stats');
      const quizRef = doc(db, 'quizzes', quizId);
      await updateDoc(quizRef, {
        'stats.views': 0,
        'stats.attempts': 0,
        'stats.completions': 0,
        'stats.completedCount': 0,
        'stats.averageScore': 0,
        'stats.totalScore': 0,
        'stats.completionRate': 0
      });
      return;
    }
    
    // Calculate stats
    const totalAttempts = results.length;
    let totalScore = 0;
    let completedCount = 0; // Score >= 50%
    
    results.forEach(result => {
      const percentage = Math.round((result.score / result.totalQuestions) * 100);
      totalScore += percentage;
      
      if (percentage >= 50) {
        completedCount++;
      }
    });
    
    const averageScore = Math.round(totalScore / totalAttempts);
    const completionRate = Math.round((completedCount / totalAttempts) * 100);
    
    // Get current views (don't recalculate)
    const quizRef = doc(db, 'quizzes', quizId);
    const quizDoc = await getDoc(quizRef);
    const currentViews = quizDoc.exists() ? (quizDoc.data().stats?.views || 0) : 0;
    
    // Update quiz stats
    await updateDoc(quizRef, {
      'stats.views': currentViews,
      'stats.attempts': totalAttempts,
      'stats.completions': totalAttempts, // Total results
      'stats.completedCount': completedCount, // Results with score >= 50%
      'stats.averageScore': averageScore,
      'stats.totalScore': totalScore,
      'stats.completionRate': completionRate
    });
    
    console.log(`✅ Stats recalculated:`, {
      quizId,
      totalAttempts,
      completedCount,
      averageScore,
      completionRate
    });
    
  } catch (error) {
    console.error(`❌ Error recalculating stats for quiz ${quizId}:`, error);
    throw error;
  }
}

/**
 * Batch recalculate stats for multiple quizzes
 */
export async function batchRecalculateStats(quizIds: string[]): Promise<void> {
  console.log(`📊 Batch recalculating stats for ${quizIds.length} quizzes`);
  
  for (const quizId of quizIds) {
    try {
      await recalculateQuizStats(quizId);
    } catch (error) {
      console.error(`Failed to recalculate for ${quizId}`, error);
    }
  }
  
  console.log('✅ Batch recalculation complete');
}

/**
 * Recalculate stats for ALL quizzes in the system
 */
export async function recalculateAllQuizStats(): Promise<void> {
  console.log('📊 Starting recalculation for ALL quizzes');
  
  try {
    // Get all quizzes
    const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
    const quizIds = quizzesSnapshot.docs.map(doc => doc.id);
    
    console.log(`Found ${quizIds.length} quizzes to recalculate`);
    
    // Batch recalculate
    await batchRecalculateStats(quizIds);
    
    console.log('✅ All quiz stats recalculated successfully');
  } catch (error) {
    console.error('❌ Error recalculating all quiz stats:', error);
    throw error;
  }
}
