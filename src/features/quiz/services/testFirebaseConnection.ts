import { collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';

// Test Firebase connection and create sample review data
export const testFirebaseConnection = async () => {
  try {
    console.log('🔥 Testing Firebase connection...');

    // Test 1: Check if we can read from a collection
    const testCollection = collection(db, 'quizReviews');
    const snapshot = await getDocs(testCollection);
    console.log('✅ Firebase connection successful!');
    console.log('📊 Current reviews in database:', snapshot.size);

    // Test 2: If no reviews exist, create sample data
    if (snapshot.size === 0) {
      console.log('📝 Creating sample review data...');
      await createSampleReviews();
    }

    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return false;
  }
};

// Create sample review data for testing
export const createSampleReviews = async () => {
  const sampleReviews = [
    // Reviews for Quiz Toán Học Cơ Bản
    {
      quizId: 'quiz-toan-hoc-co-ban',
      userId: 'user-1',
      userName: 'Nguyễn Văn A',
      userAvatar: null,
      rating: 5,
      comment: 'Quiz toán rất hay và bổ ích! Tôi đã học được nhiều kiến thức mới từ quiz này.',
      createdAt: new Date(),
      updatedAt: new Date(),
      helpful: [],
      reported: []
    },
    {
      quizId: 'quiz-toan-hoc-co-ban',
      userId: 'user-2',
      userName: 'Trần Thị B',
      userAvatar: null,
      rating: 4,
      comment: 'Câu hỏi toán khá thú vị, tuy nhiên một số câu hỏi hơi khó hiểu.',
      createdAt: new Date(),
      updatedAt: new Date(),
      helpful: [],
      reported: []
    },
    {
      quizId: 'quiz-toan-hoc-co-ban',
      userId: 'user-3',
      userName: 'Lê Văn C',
      userAvatar: null,
      rating: 5,
      comment: 'Tuyệt vời! Quiz giúp tôi ôn tập lại kiến thức toán học cơ bản một cách hiệu quả.',
      createdAt: new Date(),
      updatedAt: new Date(),
      helpful: [],
      reported: []
    },
    // Reviews for Quiz Lịch Sử Việt Nam
    {
      quizId: 'quiz-lich-su-viet-nam',
      userId: 'user-4',
      userName: 'Phạm Thị D',
      userAvatar: null,
      rating: 4,
      comment: 'Quiz lịch sử rất thú vị, giúp tôi nhớ lại những kiến thức về lịch sử Việt Nam.',
      createdAt: new Date(),
      updatedAt: new Date(),
      helpful: [],
      reported: []
    },
    {
      quizId: 'quiz-lich-su-viet-nam',
      userId: 'user-5',
      userName: 'Hoàng Văn E',
      userAvatar: null,
      rating: 5,
      comment: 'Rất tuyệt! Câu hỏi về lịch sử được đặt rất hay và có tính giáo dục cao.',
      createdAt: new Date(),
      updatedAt: new Date(),
      helpful: [],
      reported: []
    },
    // Reviews for Quiz Tiếng Anh
    {
      quizId: 'quiz-tieng-anh-giao-tiep',
      userId: 'user-6',
      userName: 'Vũ Thị F',
      userAvatar: null,
      rating: 4,
      comment: 'Quiz tiếng Anh giao tiếp rất hữu ích cho việc học từ vựng hàng ngày.',
      createdAt: new Date(),
      updatedAt: new Date(),
      helpful: [],
      reported: []
    },
    // Fallback reviews for any quiz
    {
      quizId: 'sample-quiz-1',
      userId: 'user-7',
      userName: 'Demo User',
      userAvatar: null,
      rating: 5,
      comment: 'Quiz demo rất tốt để test hệ thống đánh giá.',
      createdAt: new Date(),
      updatedAt: new Date(),
      helpful: [],
      reported: []
    },
    {
      quizId: 'sample-quiz-1',
      userId: 'user-3',
      userName: 'Lê Văn C',
      userAvatar: null,
      rating: 5,
      comment: 'Tuyệt vời! Quiz được thiết kế rất chuyên nghiệp và dễ hiểu.',
      createdAt: new Date(),
      updatedAt: new Date(),
      helpful: [],
      reported: []
    }
  ];

  try {
    const reviewsCollection = collection(db, 'quizReviews');
    
    for (const review of sampleReviews) {
      const docRef = await addDoc(reviewsCollection, review);
      console.log('✅ Created sample review with ID:', docRef.id);
    }
    
    console.log('🎉 Sample review data created successfully!');
  } catch (error) {
    console.error('❌ Error creating sample reviews:', error);
    throw error;
  }
};

// Test if specific quiz exists
export const testQuizExists = async (quizId: string) => {
  try {
    const quizDoc = doc(db, 'quizzes', quizId);
    const quizSnapshot = await getDoc(quizDoc);
    
    if (quizSnapshot.exists()) {
      console.log('✅ Quiz exists:', quizSnapshot.data());
      return true;
    } else {
      console.log('❌ Quiz not found:', quizId);
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking quiz:', error);
    return false;
  }
};

// Get all reviews from Firebase
export const getAllReviews = async () => {
  try {
    const reviewsCollection = collection(db, 'quizReviews');
    const snapshot = await getDocs(reviewsCollection);
    
    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
    }));
    
    console.log('📋 All reviews:', reviews);
    return reviews;
  } catch (error) {
    console.error('❌ Error getting reviews:', error);
    return [];
  }
};
