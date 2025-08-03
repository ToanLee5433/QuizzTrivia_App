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
 * Check if Firestore is accessible
 */
const checkFirestoreConnection = async (): Promise<boolean> => {
  try {
    // Simple test query
    const testQuery = query(
      collection(db, QUIZZES_COLLECTION),
      limit(1)
    );
    await getDocs(testQuery);
    console.log('✅ Firestore connection successful');
    return true;
  } catch (error: any) {
    console.error('❌ Firestore connection failed:', error);
    
    if (error.code === 'unavailable' || error.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
      console.error('🚫 Firestore bị chặn bởi ad blocker hoặc network. Vui lòng:');
      console.error('   1. Tắt ad blocker cho localhost');
      console.error('   2. Thêm *.googleapis.com vào whitelist');
      console.error('   3. Thử chế độ Incognito');
    }
    
    return false;
  }
};

/**
 * Get quizzes for USER role - can see published quizzes only
 */
export const getUserQuizzes = async (
  filters?: QuizFilters, 
  pageSize = 20, 
  lastDoc?: DocumentSnapshot
): Promise<{
  quizzes: Quiz[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> => {
  try {
    // Check Firestore connection first
    const isConnected = await checkFirestoreConnection();
    if (!isConnected) {
      throw new Error('Không thể kết nối Firestore. Vui lòng tắt ad blocker hoặc thử chế độ Incognito.');
    }

    console.log('🔍 [USER] Fetching published quizzes for regular user');
    
    let q = query(collection(db, QUIZZES_COLLECTION));
    q = query(q, orderBy('createdAt', 'desc'), limit(pageSize || 50));

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const allQuizzes: Quiz[] = [];
    let lastDocument: DocumentSnapshot | null = null;

    console.log('📝 [USER] Found', querySnapshot.size, 'quiz documents');

    querySnapshot.forEach((doc) => {
      const quizData = doc.data();
      const convertedData = convertTimestamps(quizData);
      allQuizzes.push({
        id: doc.id,
        ...convertedData,
      } as Quiz);
      lastDocument = doc;
    });

    // Filter quizzes for regular user:
    // Only approved AND published quizzes
    const filteredQuizzes = allQuizzes.filter(quiz => {
      const isApproved = quiz.status === 'approved';
      const isPublished = quiz.isPublished === true;
      
      if (isApproved && isPublished) {
        return true;
      } else {
        return false;
      }
    });

    console.log('✅ [USER] Filtered quizzes:', {
      total: allQuizzes.length,
      userVisible: filteredQuizzes.length,
      publishedQuizzes: filteredQuizzes.length
    });

    // Apply client-side filters
    const finalQuizzes = applyQuizFilters(filteredQuizzes, filters);

    console.log('✅ [USER] Returning', finalQuizzes.length, 'quizzes after filters');

    return {
      quizzes: finalQuizzes,
      lastDoc: lastDocument,
      hasMore: querySnapshot.size === pageSize,
    };
  } catch (error) {
    console.error('❌ [USER] Error fetching quizzes:', error);
    throw new Error('Không thể tải danh sách quiz');
  }
};

/**
 * Get quizzes for anonymous (not logged in) users
 */
export const getAnonymousQuizzes = async (
  filters?: QuizFilters, 
  pageSize = 20, 
  lastDoc?: DocumentSnapshot
): Promise<{
  quizzes: Quiz[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> => {
  try {
    // Check Firestore connection first
    const isConnected = await checkFirestoreConnection();
    if (!isConnected) {
      throw new Error('Không thể kết nối Firestore. Vui lòng tắt ad blocker hoặc thử chế độ Incognito.');
    }

    console.log('🔍 [ANONYMOUS] Fetching published quizzes for anonymous user');
    
    // For anonymous users, only show published quizzes (filter by status client-side)
    let q = query(
      collection(db, QUIZZES_COLLECTION),
      where('isPublished', '==', true)
    );
    q = query(q, orderBy('createdAt', 'desc'), limit(pageSize || 50));

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const quizzes: Quiz[] = [];
    let lastDocument: DocumentSnapshot | null = null;

    console.log('📝 [ANONYMOUS] Found', querySnapshot.size, 'published quiz documents');

    querySnapshot.forEach((doc) => {
      const quizData = doc.data();
      const convertedData = convertTimestamps(quizData);
      console.log('📝 [ANONYMOUS] Published quiz:', doc.id, convertedData.title, 'status:', convertedData.status);
      quizzes.push({ id: doc.id, ...convertedData } as Quiz);
      lastDocument = doc;
    });

    // Filter for anonymous users: only approved quizzes
    const approvedQuizzes = quizzes.filter(quiz => {
      const isApproved = quiz.status === 'approved';
      if (!isApproved) {
        console.log('🚫 [ANONYMOUS] Filtering out quiz:', quiz.id, quiz.title, 'status:', quiz.status);
      }
      return isApproved;
    });

    console.log('✅ [ANONYMOUS] Approved quizzes:', {
      total: quizzes.length,
      approved: approvedQuizzes.length
    });

    // Apply client-side filters
    const finalQuizzes = applyQuizFilters(approvedQuizzes, filters);

    console.log('✅ [ANONYMOUS] Returning', finalQuizzes.length, 'quizzes after filters');

    return {
      quizzes: finalQuizzes,
      lastDoc: lastDocument,
      hasMore: querySnapshot.size === pageSize,
    };
  } catch (error) {
    console.error('❌ [ANONYMOUS] Error fetching quizzes:', error);
    throw new Error('Không thể tải danh sách quiz');
  }
};
