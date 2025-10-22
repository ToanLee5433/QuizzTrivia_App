// ...API admin, giữ nguyên vị trí chuẩn hóa...
// ...existing code...
// ...existing code...
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
import { db } from '../../../lib/firebase/config';
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
 * Get quizzes for ADMIN role - can see ALL quizzes
 */
export const getAdminQuizzes = async (
  filters?: QuizFilters, 
  pageSize = 20, 
  lastDoc?: DocumentSnapshot
): Promise<{
  quizzes: Quiz[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> => {
  try {
    console.log('🔍 [ADMIN] Fetching ALL quizzes from Firestore...');
    
    let q = query(collection(db, QUIZZES_COLLECTION));
    q = query(q, orderBy('createdAt', 'desc'), limit(pageSize || 50));

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const quizzes: Quiz[] = [];
    let lastDocument: DocumentSnapshot | null = null;

    console.log('📝 [ADMIN] Found', querySnapshot.size, 'quiz documents');

    querySnapshot.forEach((doc) => {
      const quizData = doc.data();
      const convertedData = convertTimestamps(quizData);
      console.log('📝 [ADMIN] Quiz data:', doc.id, {
        title: convertedData.title,
        status: convertedData.status,
        isPublished: convertedData.isPublished,
        createdBy: convertedData.createdBy
      });
      quizzes.push({
        id: doc.id,
        ...convertedData,
      } as Quiz);
      lastDocument = doc;
    });

    console.log('✅ [ADMIN] Total quizzes before filtering:', quizzes.length);

    // Admin sees ALL quizzes - no role-based filtering
    let filteredQuizzes = quizzes;

    // Apply client-side filters only
    filteredQuizzes = applyQuizFilters(filteredQuizzes, filters);

    console.log('✅ [ADMIN] Returning', filteredQuizzes.length, 'filtered quizzes');

    return {
      quizzes: filteredQuizzes,
      lastDoc: lastDocument,
      hasMore: querySnapshot.size === pageSize,
    };
  } catch (error) {
    console.error('❌ [ADMIN] Error fetching quizzes:', error);
    throw new Error('Không thể tải danh sách quiz');
  }
};

/**
 * Get quizzes created by a specific user (Admin function)
 */
export const getUserQuizzesAdmin = async (userId: string): Promise<Quiz[]> => {
  try {
    console.log('🔍 [ADMIN] Fetching quizzes for user:', userId);
    
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
      quizzes.push({ id: doc.id, ...convertedData } as Quiz);
    });

    console.log('✅ [ADMIN] Found', quizzes.length, 'quizzes for user:', userId);
    return quizzes;
  } catch (error) {
    console.error('❌ [ADMIN] Error fetching user quizzes:', error);
    throw new Error('Không thể tải quiz của người dùng');
  }
};
