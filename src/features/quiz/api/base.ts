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
import { db } from '../../../firebase/config';
import { Quiz, QuizResult } from '../types';
import { toast } from 'react-toastify';

const QUIZZES_COLLECTION = 'quizzes';
const QUIZ_RESULTS_COLLECTION = 'quizResults';

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
  // Validate dữ liệu trước khi gửi lên Firestore
  if (!result.userId || !result.quizId || typeof result.score !== 'number' || !Array.isArray(result.answers) || !result.completedAt) {
    console.error('❌ [submitQuizResult] Thiếu trường bắt buộc:', result);
    throw new Error('Thiếu trường bắt buộc khi lưu kết quả quiz');
  }
  if (isNaN(result.score) || result.score < 0 || result.score > 100) {
    console.error('❌ [submitQuizResult] Điểm số không hợp lệ:', result.score);
    throw new Error('Điểm số không hợp lệ');
  }
  try {
    const docRef = await addDoc(collection(db, QUIZ_RESULTS_COLLECTION), result);
    toast.success('Nộp bài thành công!');
    return docRef.id;
  } catch (error) {
    console.error('Error submitting quiz result:', error, result);
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
  const docRef = doc(db, 'quizResults', attemptId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    const convertedData = convertTimestamps(data);
    return { id: docSnap.id, ...convertedData };
  }
  return null;
}

// Export collection names for other modules
export { QUIZZES_COLLECTION, QUIZ_RESULTS_COLLECTION };
