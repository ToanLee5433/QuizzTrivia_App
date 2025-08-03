import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';

export const getRealQuizData = async () => {
  try {
    console.log('🔍 Fetching real quiz data from Firebase...');
    
    // Get actual quizzes from database
    const quizzesQuery = query(
      collection(db, 'quizzes'), 
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const snapshot = await getDocs(quizzesQuery);
    const quizzes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('📊 Found real quizzes:', quizzes.length);
    console.log('Quiz IDs:', quizzes.map(q => q.id));
    
    return quizzes;
  } catch (error) {
    console.error('❌ Error fetching real quiz data:', error);
    return [];
  }
};

export const getRealUserData = async () => {
  try {
    console.log('👥 Fetching real user data from Firebase...');
    
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(usersQuery);
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('👤 Found real users:', users.length);
    
    return users;
  } catch (error) {
    console.error('❌ Error fetching real user data:', error);
    return [];
  }
};

export const getRealReviewData = async () => {
  try {
    console.log('⭐ Fetching real review data from Firebase...');
    
    const reviewsQuery = query(
      collection(db, 'quizReviews'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    const snapshot = await getDocs(reviewsQuery);
    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('📝 Found real reviews:', reviews.length);
    
    return reviews;
  } catch (error) {
    console.error('❌ Error fetching real review data:', error);
    return [];
  }
};

export const getRealCategoryData = async () => {
  try {
    console.log('📂 Fetching real category data from Firebase...');
    
    const categoriesQuery = query(
      collection(db, 'categories'),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(categoriesQuery);
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('🏷️ Found real categories:', categories.length);
    
    return categories;
  } catch (error) {
    console.error('❌ Error fetching real category data:', error);
    return [];
  }
};
