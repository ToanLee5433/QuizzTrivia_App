import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { Quiz, QuizResult } from '../types';
import { toast } from 'react-toastify';

const QUIZZES_COLLECTION = 'quizzes';
const QUIZ_RESULTS_COLLECTION = 'quizResults';

/**
 * Convert Firestore Timestamp fields to ISO strings (recursive)
 */
const convertTimestamps = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }

  const converted = { ...data };
  
  // Convert all fields recursively
  Object.keys(converted).forEach(key => {
    const value = converted[key];
    
    if (value && typeof value === 'object') {
      // Check if it's a Firestore Timestamp
      if (value.toDate && typeof value.toDate === 'function') {
        // Firestore Timestamp
        converted[key] = value.toDate().toISOString();
      } else if (value instanceof Date) {
        // JavaScript Date
        converted[key] = value.toISOString();
      } else if (Array.isArray(value)) {
        // Recursively handle arrays
        converted[key] = value.map(item => convertTimestamps(item));
      } else {
        // Recursively handle nested objects
        converted[key] = convertTimestamps(value);
      }
    }
  });
  
  return converted;
};

/**
 * Create a new quiz
 */
export const createQuiz = async (quizData: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const quiz: Omit<Quiz, 'id'> = {
      ...quizData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, QUIZZES_COLLECTION), quiz);
    toast.success('Tạo quiz thành công!');
    return docRef.id;
  } catch (error) {
    console.error('Error creating quiz:', error);
    toast.error('Không thể tạo quiz');
    throw new Error('Không thể tạo quiz');
  }
};

/**
 * Update an existing quiz
 */
export const updateQuiz = async (quizId: string, updates: Partial<Quiz>): Promise<void> => {
  try {
    const quizRef = doc(db, QUIZZES_COLLECTION, quizId);
    await updateDoc(quizRef, {
      ...updates,
      updatedAt: new Date(),
    });
    toast.success('Cập nhật quiz thành công!');
  } catch (error) {
    console.error('Error updating quiz:', error);
    toast.error('Không thể cập nhật quiz');
    throw new Error('Không thể cập nhật quiz');
  }
};

/**
 * Delete a quiz
 */
export const deleteQuiz = async (quizId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, QUIZZES_COLLECTION, quizId));
    toast.success('Xóa quiz thành công!');
  } catch (error) {
    console.error('Error deleting quiz:', error);
    toast.error('Không thể xóa quiz');
    throw new Error('Không thể xóa quiz');
  }
};

/**
 * Get quiz by ID
 */
export const getQuizById = async (quizId: string): Promise<Quiz | null> => {
  try {
    const quizDoc = await getDoc(doc(db, QUIZZES_COLLECTION, quizId));
    if (quizDoc.exists()) {
      const data = quizDoc.data();
      const convertedData = convertTimestamps(data);
      return {
        id: quizDoc.id,
        ...convertedData,
      } as Quiz;
    }
    return null;
  } catch (error) {
    console.error('Error fetching quiz:', error);
    throw new Error('Không thể tải quiz');
  }
};

/**
 * Submit quiz result
 */
export const submitQuizResult = async (result: Omit<QuizResult, 'id'>): Promise<string> => {
  console.log('🔍 [submitQuizResult] Input data:', result);
  
  // Enhanced validation for all required fields
  const requiredFields = ['userId', 'quizId', 'score', 'correctAnswers', 'totalQuestions', 'answers', 'completedAt'];
  const missingFields = requiredFields.filter(field => {
    const value = (result as any)[field];
    if (field === 'answers') return !Array.isArray(value);
    if (field === 'completedAt') return !value;
    if (['score', 'correctAnswers', 'totalQuestions'].includes(field)) {
      return typeof value !== 'number' || isNaN(value);
    }
    return !value;
  });

  if (missingFields.length > 0) {
    console.error('❌ [submitQuizResult] Missing required fields:', missingFields, result);
    throw new Error(`Thiếu trường bắt buộc: ${missingFields.join(', ')}`);
  }

  // Validate score range
  if (result.score < 0 || result.score > 100) {
    console.error('❌ [submitQuizResult] Invalid score range:', result.score);
    throw new Error('Điểm số phải trong khoảng 0-100');
  }

  // Validate correctAnswers vs totalQuestions
  if (result.correctAnswers > result.totalQuestions) {
    console.error('❌ [submitQuizResult] correctAnswers > totalQuestions:', { 
      correctAnswers: result.correctAnswers, 
      totalQuestions: result.totalQuestions 
    });
    throw new Error('Số câu đúng không thể lớn hơn tổng số câu');
  }

  // Validate answers array has isCorrect field
  const answersWithoutCorrect = result.answers.filter(a => typeof a.isCorrect !== 'boolean');
  if (answersWithoutCorrect.length > 0) {
    console.warn('⚠️ [submitQuizResult] Some answers missing isCorrect field:', answersWithoutCorrect.length);
  }
  
  console.log('✅ [submitQuizResult] All validations passed, saving to Firestore...');
  console.log('📊 [submitQuizResult] Final data to save:', {
    userId: result.userId,
    quizId: result.quizId,
    score: result.score,
    correctAnswers: result.correctAnswers,
    totalQuestions: result.totalQuestions,
    answersCount: result.answers.length,
    answersWithCorrect: result.answers.filter(a => a.isCorrect).length
  });
  
  try {
    const docRef = await addDoc(collection(db, QUIZ_RESULTS_COLLECTION), result);
    console.log('✅ [submitQuizResult] Successfully saved with ID:', docRef.id);
    toast.success('Nộp bài thành công!');
    return docRef.id;
  } catch (error) {
    console.error('❌ [submitQuizResult] Firestore error:', error);
    console.error('❌ [submitQuizResult] Data that failed to save:', result);
    toast.error('Không thể lưu kết quả quiz');
    throw new Error('Không thể lưu kết quả quiz');
  }
};

/**
 * Get quiz results for a specific quiz
 */
export const getQuizResults = async (quizId: string): Promise<QuizResult[]> => {
  try {
    console.log('🔍 getQuizResults called for quizId:', quizId);
    console.log('🔍 Collection name:', QUIZ_RESULTS_COLLECTION);
    
    const q = query(
      collection(db, QUIZ_RESULTS_COLLECTION),
      where('quizId', '==', quizId),
      orderBy('completedAt', 'desc')
    );

    console.log('🔍 Executing Firestore query...');
    const querySnapshot = await getDocs(q);
    const results: QuizResult[] = [];
    
    console.log('📊 Found', querySnapshot.size, 'quiz results');

    if (querySnapshot.empty) {
      console.log('📊 No quiz results found for quizId:', quizId);
      console.log('📊 This could mean:');
      console.log('   - No one has completed this quiz yet');
      console.log('   - The quizId is incorrect');
      console.log('   - There are Firestore permission issues');
      return [];
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('📊 Raw document data:', { id: doc.id, ...data });
      const convertedData = convertTimestamps(data);
      const result = { id: doc.id, ...convertedData } as QuizResult;
      console.log('📊 Converted quiz result:', result);
      results.push(result);
    });
    
    console.log('📊 Returning', results.length, 'quiz results');
    return results;
  } catch (error) {
    console.error('❌ Error fetching quiz results:', error);
    console.error('❌ Error details:', {
      message: (error as any)?.message,
      code: (error as any)?.code,
      name: (error as any)?.name
    });
    throw new Error('Không thể tải kết quả quiz');
  }
};

/**
 * Get quiz result by ID
 */
export async function getQuizResultById(attemptId: string) {
  console.log('🔍 [getQuizResultById] Fetching result for ID:', attemptId);
  
  try {
    const docRef = doc(db, QUIZ_RESULTS_COLLECTION, attemptId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('✅ [getQuizResultById] Raw Firestore data:', data);
      
      const convertedData = convertTimestamps(data);
      const result = { id: docSnap.id, ...convertedData };
      
      console.log('✅ [getQuizResultById] Converted data:', result);
      console.log('📊 [getQuizResultById] Key fields:', {
        score: result.score,
        correctAnswers: result.correctAnswers,
        totalQuestions: result.totalQuestions,
        answersCount: result.answers?.length,
        userId: result.userId,
        quizId: result.quizId
      });
      
      return result;
    } else {
      console.warn('❌ [getQuizResultById] No document found for ID:', attemptId);
      return null;
    }
  } catch (error) {
    console.error('❌ [getQuizResultById] Error fetching document:', error);
    throw error;
  }
}

// Export collection names for other modules
export { QUIZZES_COLLECTION, QUIZ_RESULTS_COLLECTION };
