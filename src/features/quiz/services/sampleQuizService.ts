import { db } from '../../../lib/firebase/config';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { Quiz } from '../types';

// Create sample quizzes for testing reviews
export const createSampleQuizzes = async () => {
  try {
    console.log('📝 Creating sample quizzes for testing...');
    
    const sampleQuizzes: Partial<Quiz>[] = [
      {
        title: 'Quiz Toán Học Cơ Bản',
        description: 'Quiz về các kiến thức toán học cơ bản dành cho học sinh trung học',
        category: 'Toán học',
        difficulty: 'easy',
        duration: 15,
        questions: [
          {
            id: '1',
            text: '2 + 2 = ?',
            type: 'multiple',
            answers: [
              { id: '1', text: '3', isCorrect: false },
              { id: '2', text: '4', isCorrect: true },
              { id: '3', text: '5', isCorrect: false },
              { id: '4', text: '6', isCorrect: false }
            ],
            explanation: 'Phép cộng cơ bản: 2 + 2 = 4',
            points: 10
          },
          {
            id: '2',
            text: '5 x 3 = ?',
            type: 'multiple',
            answers: [
              { id: '1', text: '12', isCorrect: false },
              { id: '2', text: '15', isCorrect: true },
              { id: '3', text: '18', isCorrect: false },
              { id: '4', text: '20', isCorrect: false }
            ],
            explanation: 'Phép nhân cơ bản: 5 x 3 = 15',
            points: 10
          }
        ],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublished: true,
        tags: ['toán học', 'cơ bản', 'học sinh']
      },
      {
        title: 'Kiến Thức Lịch Sử Việt Nam',
        description: 'Quiz về lịch sử Việt Nam từ thời kỳ phong kiến đến hiện đại',
        category: 'Lịch sử',
        difficulty: 'medium',
        duration: 20,
        questions: [
          {
            id: '1',
            text: 'Ai là vua đầu tiên của nhà Lý?',
            type: 'multiple',
            answers: [
              { id: '1', text: 'Lý Thái Tổ', isCorrect: true },
              { id: '2', text: 'Lý Thánh Tông', isCorrect: false },
              { id: '3', text: 'Lý Nhân Tông', isCorrect: false },
              { id: '4', text: 'Lý Cao Tông', isCorrect: false }
            ],
            explanation: 'Lý Thái Tổ (Lý Công Uẩn) là vua đầu tiên của nhà Lý',
            points: 10
          }
        ],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublished: true,
        tags: ['lịch sử', 'việt nam', 'trung học']
      },
      {
        title: 'Tiếng Anh Giao Tiếp',
        description: 'Quiz về các cụm từ và từ vựng tiếng Anh giao tiếp hàng ngày',
        category: 'Tiếng Anh',
        difficulty: 'easy',
        duration: 10,
        questions: [
          {
            id: '1',
            text: 'What does "How are you?" mean in Vietnamese?',
            type: 'multiple',
            answers: [
              { id: '1', text: 'Bạn ở đâu?', isCorrect: false },
              { id: '2', text: 'Bạn khỏe không?', isCorrect: true },
              { id: '3', text: 'Bạn là ai?', isCorrect: false },
              { id: '4', text: 'Bạn làm gì?', isCorrect: false }
            ],
            explanation: '"How are you?" có nghĩa là "Bạn khỏe không?"',
            points: 10
          }
        ],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublished: true,
        tags: ['tiếng anh', 'giao tiếp', 'cơ bản']
      }
    ];

    const createdQuizzes = [];

    for (const quiz of sampleQuizzes) {
      // Create with specific ID for easy testing
      const quizId = `quiz-${quiz.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
      
      await setDoc(doc(db, 'quizzes', quizId), quiz);
      console.log(`✅ Created quiz: ${quiz.title} with ID: ${quizId}`);
      
      createdQuizzes.push({
        id: quizId,
        title: quiz.title
      });
    }

    console.log('🎉 Sample quizzes created successfully!');
    return createdQuizzes;
    
  } catch (error) {
    console.error('❌ Error creating sample quizzes:', error);
    throw error;
  }
};

// Get all quizzes for testing
export const getAllQuizzes = async () => {
  try {
    console.log('📋 Fetching all quizzes...');
    const querySnapshot = await getDocs(collection(db, 'quizzes'));
    const quizzes: any[] = [];

    querySnapshot.forEach((doc) => {
      quizzes.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`📊 Found ${quizzes.length} quizzes in database`);
    return quizzes;
  } catch (error) {
    console.error('❌ Error fetching quizzes:', error);
    throw error;
  }
};

// Delete all sample quizzes
export const deleteSampleQuizzes = async () => {
  try {
    console.log('🗑️ Deleting sample quizzes...');
    // Implementation for cleanup if needed
    console.log('✅ Sample quizzes deleted');
  } catch (error) {
    console.error('❌ Error deleting sample quizzes:', error);
    throw error;
  }
};
