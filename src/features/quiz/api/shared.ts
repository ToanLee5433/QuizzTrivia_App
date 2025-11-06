import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { Quiz, QuizResult, QuizFilters } from '../types';
import { QUIZZES_COLLECTION, QUIZ_RESULTS_COLLECTION } from './base';

/**
 * Get user's quiz results
 */
export const getUserQuizResults = async (userId: string): Promise<QuizResult[]> => {
  try {
    const q = query(
      collection(db, QUIZ_RESULTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('completedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const results: QuizResult[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('🔍 Raw Firestore data for result:', doc.id, data);
      
      const result = {
        id: doc.id,
        ...data,
        completedAt: data.completedAt?.toDate
          ? data.completedAt.toDate().toISOString()
          : (data.completedAt instanceof Date
              ? data.completedAt.toISOString()
              : typeof data.completedAt === 'string'
                ? data.completedAt
                : ''),
      } as any;

      // Validate and fix score data for legacy results
      const hasValidCorrectAnswers = typeof result.correctAnswers === 'number';
      const hasValidTotalQuestions = typeof result.totalQuestions === 'number' && result.totalQuestions > 0;
      const hasValidScore = typeof result.score === 'number' && !isNaN(result.score);

      // If missing critical fields but has answers, compute them
      if ((!hasValidCorrectAnswers || !hasValidTotalQuestions) && Array.isArray(result.answers) && result.answers.length > 0) {
        const computedCorrect = result.answers.filter((a: any) => a && a.isCorrect === true).length;
        const computedTotal = result.answers.length;
        
        if (!hasValidCorrectAnswers) {
          result.correctAnswers = computedCorrect;
        }
        if (!hasValidTotalQuestions) {
          result.totalQuestions = computedTotal;
        }
        
        // Recompute score if missing or zero
        if (!hasValidScore || result.score === 0) {
          result.score = result.totalQuestions > 0 ? Math.round((result.correctAnswers / result.totalQuestions) * 100) : 0;
        }
        
        console.log('🛠️ Hydrated legacy result:', { 
          id: result.id, 
          correctAnswers: result.correctAnswers, 
          totalQuestions: result.totalQuestions, 
          score: result.score,
          computedFromAnswers: true
        });
      }

      results.push(result as QuizResult);
    });

    return results;
  } catch (error) {
    console.error('Error fetching user quiz results:', error);
    throw new Error('Không thể tải kết quả quiz');
  }
};

/**
 * Get quiz categories (from existing quizzes)
 */
export const getQuizCategories = async (): Promise<string[]> => {
  try {
    const q = query(collection(db, QUIZZES_COLLECTION), where('isPublished', '==', true));
    const querySnapshot = await getDocs(q);
    
    const categories = new Set<string>();
    querySnapshot.forEach((doc) => {
      const quiz = doc.data() as Quiz;
      categories.add(quiz.category);
    });

    return Array.from(categories).sort();
  } catch (error) {
    console.error('Error fetching quiz categories:', error);
    return [];
  }
};

/**
 * Get popular quizzes (most attempts)
 */
export const getPopularQuizzes = async (limitCount = 10): Promise<Quiz[]> => {
  try {
    // This would require aggregation queries or a separate collection
    // For now, we'll get recent quizzes as a placeholder
    const q = query(
      collection(db, QUIZZES_COLLECTION),
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const quizzes: Quiz[] = [];

    querySnapshot.forEach((doc) => {
      quizzes.push({ id: doc.id, ...doc.data() } as Quiz);
    });

    return quizzes;
  } catch (error) {
    console.error('Error fetching popular quizzes:', error);
    throw new Error('Không thể tải quiz phổ biến');
  }
};

/**
 * Search quizzes by title or description
 */
export const searchQuizzes = async (searchTerm: string, limitCount = 20): Promise<Quiz[]> => {
  try {
    // Firestore doesn't support full-text search natively
    // This is a basic implementation - in production, you'd use Algolia or similar
    const q = query(
      collection(db, QUIZZES_COLLECTION),
      where('isPublished', '==', true),
      orderBy('title'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const quizzes: Quiz[] = [];

    querySnapshot.forEach((doc) => {
      const quiz = { id: doc.id, ...doc.data() } as Quiz;
      const term = searchTerm.toLowerCase();
      
      if (
        quiz.title.toLowerCase().includes(term) ||
        quiz.description.toLowerCase().includes(term) ||
        quiz.category.toLowerCase().includes(term)
      ) {
        quizzes.push(quiz);
      }
    });

    return quizzes;
  } catch (error) {
    console.error('Error searching quizzes:', error);
    throw new Error('Không thể tìm kiếm quiz');
  }
};

/**
 * Apply client-side filters to quiz list
 */
export const applyQuizFilters = (quizzes: Quiz[], filters?: QuizFilters): Quiz[] => {
  let filteredQuizzes = [...quizzes];

  if (filters?.category) {
    filteredQuizzes = filteredQuizzes.filter(quiz => quiz.category === filters.category);
  }

  if (filters?.difficulty) {
    filteredQuizzes = filteredQuizzes.filter(quiz => quiz.difficulty === filters.difficulty);
  }

  if (filters?.searchTerm) {
    const searchTerm = filters.searchTerm.toLowerCase();
    filteredQuizzes = filteredQuizzes.filter(
      quiz =>
        quiz.title?.toLowerCase().includes(searchTerm) ||
        quiz.description?.toLowerCase().includes(searchTerm) ||
        quiz.category?.toLowerCase().includes(searchTerm)
    );
  }

  return filteredQuizzes;
};
