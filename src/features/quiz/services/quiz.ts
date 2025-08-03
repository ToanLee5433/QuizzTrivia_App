import { collection, getDocs, doc, getDoc, query, where, limit } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Quiz } from '../types';
import { QUIZZES_COLLECTION } from '../constants';

export const getQuizzes = async (
  filters?: any,
  pageSize?: number
) => {
  try {
    let q = query(
      collection(db, QUIZZES_COLLECTION),
      limit(pageSize || 10)
    );

    if (filters) {
      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }
      if (filters.difficulty) {
        q = query(q, where('difficulty', '==', filters.difficulty));
      }
    }

    const snapshot = await getDocs(q);
    const quizzes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Quiz[];

    return {
      quizzes,
      lastDoc: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if ((error as any).code) {
        console.error('Error code:', (error as any).code);
      }
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  }
};

export const getQuizById = async (id: string): Promise<Quiz> => {
  try {
    const docRef = doc(db, QUIZZES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Quiz not found');
    }
    
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Quiz;
  } catch (error) {
    console.error('Error fetching quiz:', error);
    throw error;
  }
};
