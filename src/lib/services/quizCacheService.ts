/**
 * Quiz Cache Service - Offline-First Data Layer
 * Reads from Dexie first, syncs with Firestore when online
 */

import { db } from '../../features/flashcard/services/database';
import { collection, getDocs, getDoc, doc, query, where, limit } from 'firebase/firestore';
import { db as firestore } from '../firebase/config';

interface Quiz {
  id: string;
  title: string;
  description?: string;
  category: string;
  difficulty?: string;
  timeLimit?: number;
  passingScore?: number;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Question {
  id: string;
  quizId: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer: any;
  points: number;
  explanation?: string;
  imageUrl?: string;
}

/**
 * Get quiz from cache first, fetch from Firestore if not cached or online
 */
export async function getQuizOfflineFirst(quizId: string): Promise<Quiz | null> {
  try {
    // 1. Try cache first
    const cached = await db.quizzes.get(quizId);
    
    if (cached && !navigator.onLine) {
      // Offline và có cache → return cache
      console.log('[Cache] Returning cached quiz (offline):', quizId);
      return cached as any;
    }

    // 2. Online → fetch from Firestore
    if (navigator.onLine) {
      try {
        const quizDoc = await getDoc(doc(firestore, 'quizzes', quizId));
        
        if (quizDoc.exists()) {
          const quizData = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
          
          // Update cache
          await db.quizzes.put({
            ...quizData,
            cachedAt: Date.now()
          } as any);
          
          console.log('[Cache] Fetched & cached quiz:', quizId);
          return quizData;
        }
      } catch (firestoreError) {
        console.warn('[Cache] Firestore fetch failed, using cache:', firestoreError);
        // Fallback to cache if Firestore fails
        if (cached) {
          return cached as any;
        }
      }
    }

    // 3. No cache, no online → return null
    return cached ? (cached as any) : null;
  } catch (error) {
    console.error('[Cache] Error getting quiz:', error);
    return null;
  }
}

/**
 * Get questions from cache first, fetch from Firestore if needed
 */
export async function getQuestionsOfflineFirst(quizId: string): Promise<Question[]> {
  try {
    // 1. Try cache first
    const cached = await db.questions.where('quizId').equals(quizId).toArray();
    
    if (cached.length > 0 && !navigator.onLine) {
      console.log('[Cache] Returning cached questions (offline):', quizId);
      return cached as any;
    }

    // 2. Online → fetch from Firestore
    if (navigator.onLine) {
      try {
        // Try subcollection first (new structure)
        const questionsRef = collection(firestore, 'quizzes', quizId, 'questions');
        const snapshot = await getDocs(questionsRef);
        
        let questions: Question[] = [];
        
        if (!snapshot.empty) {
          questions = snapshot.docs.map(doc => ({
            id: doc.id,
            quizId,
            ...doc.data()
          })) as Question[];
        } else {
          // Fallback to old structure (questions field in quiz doc)
          const quizDoc = await getDoc(doc(firestore, 'quizzes', quizId));
          if (quizDoc.exists() && quizDoc.data().questions) {
            questions = quizDoc.data().questions.map((q: any, index: number) => ({
              id: `q_${index}`,
              quizId,
              ...q
            }));
          }
        }

        if (questions.length > 0) {
          // Clear old cache
          await db.questions.where('quizId').equals(quizId).delete();
          
          // Update cache
          await db.questions.bulkAdd(
            questions.map(q => ({ ...q, cachedAt: Date.now() })) as any
          );
          
          console.log('[Cache] Fetched & cached questions:', quizId, questions.length);
          return questions;
        }
      } catch (firestoreError) {
        console.warn('[Cache] Firestore fetch failed, using cache:', firestoreError);
        if (cached.length > 0) {
          return cached as any;
        }
      }
    }

    return cached.length > 0 ? (cached as any) : [];
  } catch (error) {
    console.error('[Cache] Error getting questions:', error);
    return [];
  }
}

/**
 * Prefetch and cache multiple quizzes (when online)
 */
export async function prefetchQuizzes(categoryFilter?: string, limitCount: number = 20): Promise<void> {
  if (!navigator.onLine) {
    console.log('[Cache] Offline, skipping prefetch');
    return;
  }

  try {
    let q = query(collection(firestore, 'quizzes'), limit(limitCount));
    
    if (categoryFilter) {
      q = query(q, where('category', '==', categoryFilter));
    }

    const snapshot = await getDocs(q);
    
    const quizzes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      cachedAt: Date.now()
    }));

    // Bulk update cache
    await db.quizzes.bulkPut(quizzes as any);
    
    console.log('[Cache] Prefetched quizzes:', quizzes.length);

    // Also prefetch questions for each quiz
    for (const quiz of quizzes.slice(0, 5)) { // Only prefetch questions for first 5
      await getQuestionsOfflineFirst(quiz.id);
    }
  } catch (error) {
    console.error('[Cache] Prefetch failed:', error);
  }
}

/**
 * Clear old cached data (older than 7 days)
 */
export async function cleanupOldCache(daysOld: number = 7): Promise<number> {
  const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  
  try {
    const deletedQuizzes = await db.quizzes
      .where('cachedAt')
      .below(cutoff)
      .delete();
    
    const deletedQuestions = await db.questions
      .where('cachedAt')
      .below(cutoff)
      .delete();
    
    const total = deletedQuizzes + deletedQuestions;
    console.log('[Cache] Cleaned up old cache:', total, 'items');
    return total;
  } catch (error) {
    console.error('[Cache] Cleanup failed:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    const quizCount = await db.quizzes.count();
    const questionCount = await db.questions.count();
    const pendingCount = await db.pending.where('status').equals('pending').count();
    
    return {
      cachedQuizzes: quizCount,
      cachedQuestions: questionCount,
      pendingActions: pendingCount,
      isOnline: navigator.onLine
    };
  } catch (error) {
    console.error('[Cache] Stats failed:', error);
    return {
      cachedQuizzes: 0,
      cachedQuestions: 0,
      pendingActions: 0,
      isOnline: navigator.onLine
    };
  }
}
