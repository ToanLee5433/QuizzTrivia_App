import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  limit,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { QuizReview, CreateReviewData, UpdateReviewData, QuizReviewStats } from '../types/review';

const REVIEWS_COLLECTION = 'quizReviews';

export const reviewService = {
  // Create a new review
  async createReview(reviewData: CreateReviewData, userId: string, userName: string, userAvatar?: string): Promise<string> {
    try {
      console.log('🎨 Creating review with data:', { reviewData, userId, userName, userAvatar });
      
      const reviewDoc = {
        ...reviewData,
        userId,
        userName,
        userAvatar: userAvatar || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        helpful: [],
        reported: []
      };

      console.log('Review document to be saved:', reviewDoc);
      
      const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), reviewDoc);
      console.log('Review saved successfully with ID:', docRef.id);
      
      // Update quiz with new review stats
      try {
        await this.updateQuizReviewStats(reviewData.quizId);
        console.log('Quiz stats updated successfully');
      } catch (statsError) {
        console.warn('Error updating quiz stats (review still saved):', statsError);
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating review:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Không thể tạo đánh giá: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Simple get reviews without ordering (to avoid index requirements)
  async getQuizReviewsSimple(quizId: string): Promise<QuizReview[]> {
    try {
      console.log(`🔍 Getting reviews (simple) for quiz: ${quizId}`);
      
      // Simple query without orderBy
      const q = query(
        collection(db, REVIEWS_COLLECTION),
        where('quizId', '==', quizId)
      );

      const querySnapshot = await getDocs(q);
      
      const reviews = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const review = {
          id: doc.id,
          ...data,
          userAvatar: data.userAvatar || '',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt) || new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt) || new Date()
        } as QuizReview;
        console.log('📸 Review loaded:', { id: doc.id, userName: review.userName, userAvatar: review.userAvatar, hasAvatar: !!review.userAvatar });
        return review;
      });

      // Sort in memory by newest first
      reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log(`✅ Found ${reviews.length} reviews for quiz ${quizId} (simple query)`);
      return reviews;
    } catch (error) {
      console.error('Error getting quiz reviews (simple):', error);
      throw error;
    }
  },

  // Get reviews for a quiz
  async getQuizReviews(quizId: string, sortBy: 'newest' | 'oldest' | 'helpful' = 'newest', limitCount: number = 50): Promise<QuizReview[]> {
    try {
      console.log(`🔍 Getting reviews for quiz: ${quizId}, sortBy: ${sortBy}`);
      
      // Use simple query without complex ordering to avoid index requirements
      const q = query(
        collection(db, REVIEWS_COLLECTION),
        where('quizId', '==', quizId),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      
      let reviews = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt) || new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt) || new Date()
        };
      }) as QuizReview[];

      // Sort in memory to avoid complex Firestore index requirements
      switch (sortBy) {
        case 'newest':
          reviews = reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          break;
        case 'oldest':
          reviews = reviews.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          break;
        case 'helpful':
          reviews = reviews.sort((a, b) => (b.helpful?.length || 0) - (a.helpful?.length || 0));
          break;
      }

      console.log(`✅ Found ${reviews.length} reviews for quiz ${quizId}`);
      return reviews;
    } catch (error) {
      console.error('Error getting quiz reviews:', error);
      throw error;
    }
  },

  // Get review statistics for a quiz
  async getQuizReviewStats(quizId: string): Promise<QuizReviewStats> {
    try {
      const q = query(collection(db, REVIEWS_COLLECTION), where('quizId', '==', quizId));
      const querySnapshot = await getDocs(q);
      
      const reviews = querySnapshot.docs.map(doc => doc.data());
      const totalReviews = reviews.length;
      
      if (totalReviews === 0) {
        return {
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }

      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / totalReviews;
      
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach(review => {
        ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
      });

      return {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution
      };
    } catch (error) {
      console.error('Error getting quiz review stats:', error);
      throw error;
    }
  },

  // Update a review
  async updateReview(reviewId: string, updateData: UpdateReviewData): Promise<void> {
    try {
      const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);
      await updateDoc(reviewRef, {
        ...updateData,
        updatedAt: new Date()
      });
      
      // Get quiz ID to update stats
      const reviewDoc = await getDoc(reviewRef);
      if (reviewDoc.exists()) {
        await this.updateQuizReviewStats(reviewDoc.data().quizId);
      }
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  },

  // Delete a review
  async deleteReview(reviewId: string): Promise<void> {
    try {
      const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);
      const reviewDoc = await getDoc(reviewRef);
      
      if (reviewDoc.exists()) {
        const quizId = reviewDoc.data().quizId;
        await deleteDoc(reviewRef);
        await this.updateQuizReviewStats(quizId);
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  },

  // Mark review as helpful
  async markReviewHelpful(reviewId: string, userId: string): Promise<void> {
    try {
      const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);
      await updateDoc(reviewRef, {
        helpful: arrayUnion(userId)
      });
    } catch (error) {
      console.error('Error marking review as helpful:', error);
      throw error;
    }
  },

  // Remove helpful mark
  async removeHelpfulMark(reviewId: string, userId: string): Promise<void> {
    try {
      const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);
      await updateDoc(reviewRef, {
        helpful: arrayRemove(userId)
      });
    } catch (error) {
      console.error('Error removing helpful mark:', error);
      throw error;
    }
  },

  // Report a review
  async reportReview(reviewId: string, userId: string): Promise<void> {
    try {
      const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);
      await updateDoc(reviewRef, {
        reported: arrayUnion(userId)
      });
    } catch (error) {
      console.error('Error reporting review:', error);
      throw error;
    }
  },

  // Update quiz document with review stats
  async updateQuizReviewStats(quizId: string): Promise<void> {
    try {
      const stats = await this.getQuizReviewStats(quizId);
      const quizRef = doc(db, 'quizzes', quizId);
      
      await updateDoc(quizRef, {
        reviewStats: stats,
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews
      });
    } catch (error) {
      console.error('Error updating quiz review stats:', error);
      throw error;
    }
  },

  // Get user's review for a specific quiz
  async getUserReview(quizId: string, userId: string): Promise<QuizReview | null> {
    try {
      const q = query(
        collection(db, REVIEWS_COLLECTION), 
        where('quizId', '==', quizId),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      } as QuizReview;
    } catch (error) {
      console.error('Error getting user review:', error);
      throw error;
    }
  }
};
