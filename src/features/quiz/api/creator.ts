import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Quiz, QuizFilters } from '../types';
import { QUIZZES_COLLECTION } from './base';
import { applyQuizFilters } from './shared';

/**
 * Convert Firestore Timestamp fields to ISO strings
 */
const convertTimestamps = (data: any): any => {
  const converted = { ...data };
  
  // Convert common timestamp fields
  const timestampFields = ['createdAt', 'updatedAt', 'submittedAt', 'completedAt', 'approvedAt'];
  
  timestampFields.forEach(field => {
    if (converted[field]) {
      if (converted[field]?.toDate) {
        // Firestore Timestamp
        converted[field] = converted[field].toDate().toISOString();
      } else if (converted[field] instanceof Date) {
        // JavaScript Date
        converted[field] = converted[field].toISOString();
      } else if (typeof converted[field] !== 'string') {
        // Other types, convert to empty string
        converted[field] = '';
      }
    }
  });
  
  return converted;
};

/**
 * Get quizzes for CREATOR role - can see own quizzes + approved published quizzes
 */
export const getCreatorQuizzes = async (
  userId: string,
  filters?: QuizFilters, 
  pageSize = 20, 
  lastDoc?: DocumentSnapshot
): Promise<{
  quizzes: Quiz[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> => {
  try {
    console.log('🔍 [CREATOR] Fetching quizzes for creator:', userId);
    
    let q = query(collection(db, QUIZZES_COLLECTION));
    q = query(q, orderBy('createdAt', 'desc'), limit(pageSize || 50));

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const allQuizzes: Quiz[] = [];
    let lastDocument: DocumentSnapshot | null = null;

    console.log('📝 [CREATOR] Found', querySnapshot.size, 'quiz documents');

    querySnapshot.forEach((doc) => {
      const quizData = doc.data();
      const convertedData = convertTimestamps(quizData);
      allQuizzes.push({ id: doc.id, ...convertedData } as Quiz);
      lastDocument = doc;
    });

    // Filter quizzes for creator:
    // 1. Own quizzes (regardless of status)
    // 2. Other's approved and published quizzes
    const filteredQuizzes = allQuizzes.filter(quiz => {
      // Own quiz - always show
      if (quiz.createdBy === userId) {
        console.log('📝 [CREATOR] Own quiz:', quiz.title, 'Status:', quiz.status);
        return true;
      }
      
      // Other's quiz - must be approved and published
      if (quiz.status === 'approved' && quiz.isPublished === true) {
        console.log('📝 [CREATOR] Approved quiz:', quiz.title);
        return true;
      }
      
      console.log('📝 [CREATOR] Filtered out quiz:', quiz.title, 'Status:', quiz.status, 'Published:', quiz.isPublished);
      return false;
    });

    console.log('✅ [CREATOR] Filtered quizzes:', {
      total: allQuizzes.length,
      creatorVisible: filteredQuizzes.length,
      ownQuizzes: filteredQuizzes.filter(q => q.createdBy === userId).length,
      approvedQuizzes: filteredQuizzes.filter(q => q.createdBy !== userId).length
    });

    // Apply client-side filters
    const finalQuizzes = applyQuizFilters(filteredQuizzes, filters);

    console.log('✅ [CREATOR] Returning', finalQuizzes.length, 'quizzes after filters');

    return {
      quizzes: finalQuizzes,
      lastDoc: lastDocument,
      hasMore: querySnapshot.size === pageSize,
    };
  } catch (error) {
    console.error('❌ [CREATOR] Error fetching quizzes:', error);
    throw new Error('Không thể tải danh sách quiz');
  }
};

/**
 * Get quizzes created by a specific creator
 */
export const getCreatorOwnQuizzes = async (userId: string): Promise<Quiz[]> => {
  try {
    console.log('🔍 [CREATOR] Fetching own quizzes for:', userId);
    
    const q = query(
      collection(db, QUIZZES_COLLECTION),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const quizzes: Quiz[] = [];

    querySnapshot.forEach((doc) => {
      const quizData = doc.data();
      const convertedData = convertTimestamps(quizData);
      console.log('📝 [CREATOR] Own quiz:', doc.id, convertedData.title, 'Status:', convertedData.status);
      quizzes.push({
        id: doc.id,
        ...convertedData,
      } as Quiz);
    });

    console.log('✅ [CREATOR] Found', quizzes.length, 'own quizzes');
    return quizzes;
  } catch (error) {
    console.error('❌ [CREATOR] Error fetching own quizzes:', error);
    throw new Error('Không thể tải quiz của người dùng');
  }
};
