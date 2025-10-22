// Temporary test data creator - delete after testing
import { db } from '../lib/firebase/config';
import { collection, addDoc } from 'firebase/firestore';

export const createTestQuizResults = async (userId: string) => {
  const testResults = [
    {
      userId: userId,
      userEmail: 'test@example.com',
      userName: 'Test User',
      quizId: 'test-quiz-1',
      score: 85,
      correctAnswers: 17,
      totalQuestions: 20,
      timeSpent: 300,
      answers: [
        { questionId: 'q1', selectedAnswerId: 'a1', isCorrect: true, timeSpent: 15 },
        { questionId: 'q2', selectedAnswerId: 'a2', isCorrect: false, timeSpent: 20 },
        { questionId: 'q3', selectedAnswerId: 'a3', isCorrect: true, timeSpent: 18 }
      ],
      completedAt: new Date()
    },
    {
      userId: userId,
      userEmail: 'test@example.com',
      userName: 'Test User',
      quizId: 'test-quiz-2',
      score: 92,
      correctAnswers: 9,
      totalQuestions: 10,
      timeSpent: 180,
      answers: [
        { questionId: 'q1', selectedAnswerId: 'a1', isCorrect: true, timeSpent: 12 },
        { questionId: 'q2', selectedAnswerId: 'a2', isCorrect: true, timeSpent: 15 },
        { questionId: 'q3', selectedAnswerId: 'a3', isCorrect: false, timeSpent: 25 }
      ],
      completedAt: new Date()
    },
    {
      userId: userId,
      userEmail: 'test@example.com',
      userName: 'Test User',
      quizId: 'test-quiz-3',
      score: 70,
      correctAnswers: 7,
      totalQuestions: 10,
      timeSpent: 240,
      answers: [
        { questionId: 'q1', selectedAnswerId: 'a1', isCorrect: true, timeSpent: 20 },
        { questionId: 'q2', selectedAnswerId: 'a2', isCorrect: false, timeSpent: 30 },
        { questionId: 'q3', selectedAnswerId: 'a3', isCorrect: true, timeSpent: 22 }
      ],
      completedAt: new Date()
    }
  ];

  try {
    console.log('🔧 Creating test quiz results...');
    for (const result of testResults) {
      const docRef = await addDoc(collection(db, 'quizResults'), result);
      console.log('✅ Created test result with ID:', docRef.id);
    }
    console.log('✅ All test results created successfully!');
  } catch (error) {
    console.error('❌ Error creating test results:', error);
  }
};
