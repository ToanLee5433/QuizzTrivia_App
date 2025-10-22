import { collection, getDocs, doc, getDoc, query, where, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { Quiz } from '../types';
import { QUIZZES_COLLECTION } from '../constants';

// Helper function to convert Firestore Timestamps
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
      ...convertTimestamps(doc.data())
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
    
    const data = docSnap.data();
    const convertedData = convertTimestamps(data);
    
    return {
      id: docSnap.id,
      ...convertedData
    } as Quiz;
  } catch (error) {
    console.error('Error fetching quiz:', error);
    throw error;
  }
};
