import {
  DocumentSnapshot,
} from 'firebase/firestore';
import { Quiz, QuizFilters } from '../types';

// Import role-based quiz services
import { getAdminQuizzes, getUserQuizzesAdmin } from '../api/admin';
import { getCreatorQuizzes, getCreatorOwnQuizzes } from '../api/creator';
import { getUserQuizzes as getUserRoleQuizzes, getAnonymousQuizzes } from '../api/user';

// Export all base functions
export * from '../api/base';
export * from '../api/shared';

/**
 * Main function to get quizzes based on user role
 */
export const getQuizzes = async (
  filters?: QuizFilters, 
  pageSize = 20, 
  lastDoc?: DocumentSnapshot, 
  user?: any
): Promise<{
  quizzes: Quiz[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> => {
  try {
    console.log('🔍 [MAIN] getQuizzes called with user:', {
      uid: user?.uid,
      role: user?.role,
      email: user?.email
    });

    if (!user) {
      // Anonymous user
      console.log('� [MAIN] Routing to anonymous quiz service');
      return await getAnonymousQuizzes(filters, pageSize, lastDoc);
    }

    switch (user.role) {
      case 'admin':
        console.log('🔍 [MAIN] Routing to admin quiz service');
        return await getAdminQuizzes(filters, pageSize, lastDoc);
        
      case 'creator':
        console.log('🔍 [MAIN] Routing to creator quiz service');
        return await getCreatorQuizzes(user.uid, filters, pageSize, lastDoc);
        
      case 'user':
      default:
        console.log('🔍 [MAIN] Routing to user quiz service');
        return await getUserRoleQuizzes(filters, pageSize, lastDoc);
    }
  } catch (error) {
    console.error('❌ [MAIN] Error in getQuizzes:', error);
    throw error;
  }
};

/**
 * Get quizzes created by a specific user (role-aware)
 */
export const getUserQuizzes = async (userId: string, userRole?: string): Promise<Quiz[]> => {
  try {
    if (userRole === 'admin') {
      return await getUserQuizzesAdmin(userId);
    } else {
      return await getCreatorOwnQuizzes(userId);
    }
  } catch (error) {
    console.error('Error fetching user quizzes:', error);
    throw error;
  }
};

export { 
  getQuizById, 
  createQuiz, 
  updateQuiz, 
  deleteQuiz, 
  getQuizResults, 
  getQuizResultById 
} from '../api/base';
export { 
  getQuizCategories, 
  getPopularQuizzes, 
  searchQuizzes, 
  applyQuizFilters, 
  getUserQuizResults 
} from '../api/shared';
