import { 
  collection, 
  getDocs, 
  query, 
  where
} from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';

const REVIEWS_COLLECTION = 'quizReviews';

// Simple test function to check reviews without complex queries
export const testGetReviews = async (quizId: string) => {
  try {
    console.log(`🔍 Testing simple query for quiz: ${quizId}`);
    
    // Simple query without orderBy to avoid index requirements
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('quizId', '==', quizId)
    );

    const querySnapshot = await getDocs(q);
    
    const reviews = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Review data:', data);
      return {
        id: doc.id,
        ...data
      };
    });

    console.log(`✅ Found ${reviews.length} reviews for quiz ${quizId}`);
    return reviews;
  } catch (error) {
    console.error('❌ Error in simple query:', error);
    throw error;
  }
};

export default testGetReviews;
