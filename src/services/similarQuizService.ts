/**
 * Service to find similar quizzes based on category, difficulty, and tags
 */

import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import type { QuizRecommendation } from '../lib/genkit/types';

export class SimilarQuizService {
  /**
   * Find similar quizzes based on quiz attributes
   */
  async findSimilarQuizzes(
    currentQuizId: string,
    category: string,
    difficulty?: string,
    maxResults: number = 5
  ): Promise<QuizRecommendation[]> {
    try {
      console.log('🔍 Finding similar quizzes:', { currentQuizId, category, difficulty });
      
      const quizzesRef = collection(db, 'quizzes');
      
      // Build query - find published quizzes in same category
      let q = query(
        quizzesRef,
        where('status', '==', 'published'),
        where('category', '==', category),
        orderBy('totalAttempts', 'desc'),
        limit(maxResults + 1) // +1 to account for current quiz
      );
      
      const snapshot = await getDocs(q);
      
      const quizzes: QuizRecommendation[] = [];
      
      snapshot.forEach(doc => {
        // Skip current quiz
        if (doc.id === currentQuizId) return;
        
        const data = doc.data();
        
        // Optional: filter by difficulty if provided
        if (difficulty && data.difficulty && data.difficulty !== difficulty) {
          return;
        }
        
        quizzes.push({
          quizId: doc.id,
          title: data.title || 'Untitled Quiz',
          description: data.description || '',
          imageUrl: data.imageUrl || data.bannerUrl || '',
          difficulty: data.difficulty || 'medium',
          category: data.category || category,
          questionCount: data.questionCount || 0,
          averageRating: data.averageRating || 0,
          totalAttempts: data.totalAttempts || 0
        });
      });
      
      console.log(`✅ Found ${quizzes.length} similar quizzes`);
      
      // Limit to maxResults
      return quizzes.slice(0, maxResults);
      
    } catch (error) {
      console.error('❌ Failed to find similar quizzes:', error);
      return [];
    }
  }

  /**
   * Find quizzes by multiple categories (for broader search)
   */
  async findByCategories(
    currentQuizId: string,
    categories: string[],
    maxResults: number = 5
  ): Promise<QuizRecommendation[]> {
    try {
      const allQuizzes: QuizRecommendation[] = [];
      
      for (const category of categories) {
        const quizzes = await this.findSimilarQuizzes(currentQuizId, category, undefined, 3);
        allQuizzes.push(...quizzes);
      }
      
      // Remove duplicates and limit
      const uniqueQuizzes = Array.from(
        new Map(allQuizzes.map(q => [q.quizId, q])).values()
      );
      
      return uniqueQuizzes.slice(0, maxResults);
      
    } catch (error) {
      console.error('❌ Failed to find quizzes by categories:', error);
      return [];
    }
  }

  /**
   * Get popular quizzes as fallback
   */
  async getPopularQuizzes(
    currentQuizId: string,
    maxResults: number = 5
  ): Promise<QuizRecommendation[]> {
    try {
      const quizzesRef = collection(db, 'quizzes');
      
      const q = query(
        quizzesRef,
        where('status', '==', 'published'),
        orderBy('totalAttempts', 'desc'),
        limit(maxResults + 1)
      );
      
      const snapshot = await getDocs(q);
      const quizzes: QuizRecommendation[] = [];
      
      snapshot.forEach(doc => {
        if (doc.id === currentQuizId) return;
        
        const data = doc.data();
        quizzes.push({
          quizId: doc.id,
          title: data.title || 'Untitled Quiz',
          description: data.description || '',
          imageUrl: data.imageUrl || data.bannerUrl || '',
          difficulty: data.difficulty || 'medium',
          category: data.category || 'general',
          questionCount: data.questionCount || 0,
          averageRating: data.averageRating || 0,
          totalAttempts: data.totalAttempts || 0
        });
      });
      
      return quizzes.slice(0, maxResults);
      
    } catch (error) {
      console.error('❌ Failed to get popular quizzes:', error);
      return [];
    }
  }
}

// Singleton instance
export const similarQuizService = new SimilarQuizService();
