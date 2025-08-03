import { collection, addDoc, serverTimestamp, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase/config';

export const createTestQuizzes = async () => {
  try {
    // Kiểm tra xem đã có quiz nào chưa
    const quizzesQuery = query(collection(db, 'quizzes'));
    const quizzesSnapshot = await getDocs(quizzesQuery);
    
    if (quizzesSnapshot.size > 0) {
      console.log('Đã có quiz trong database');
      return;
    }

    const testQuizzes = [
      {
        title: 'Kiến thức lịch sử Việt Nam',
        description: 'Test quiz về lịch sử Việt Nam từ cổ đại đến hiện đại',
        category: 'history',
        difficulty: 'medium',
        questions: [
          {
            id: 'q1',
            text: 'Ai là vị vua đầu tiên của nhà Lý?',
            type: 'multiple',
            answers: [
              { id: 'a1', text: 'Lý Thái Tổ', isCorrect: true },
              { id: 'a2', text: 'Lý Thái Tông', isCorrect: false },
              { id: 'a3', text: 'Lý Thánh Tông', isCorrect: false },
              { id: 'a4', text: 'Lý Nhân Tông', isCorrect: false }
            ],
            points: 1,
            correctAnswer: '',
            acceptedAnswers: []
          },
          {
            id: 'q2',
            text: 'Trận Bạch Đằng năm 1288 do ai chỉ huy?',
            type: 'multiple',
            answers: [
              { id: 'a1', text: 'Trần Hưng Đạo', isCorrect: true },
              { id: 'a2', text: 'Trần Thái Tông', isCorrect: false },
              { id: 'a3', text: 'Trần Nhân Tông', isCorrect: false },
              { id: 'a4', text: 'Lê Lợi', isCorrect: false }
            ],
            points: 1,
            correctAnswer: '',
            acceptedAnswers: []
          }
        ],
        timeLimit: 300,
        createdBy: 'test-user-id',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublished: true,
        status: 'approved',
        tags: ['history', 'vietnam']
      },
      {
        title: 'JavaScript Cơ bản',
        description: 'Kiểm tra kiến thức JavaScript cho người mới bắt đầu',
        category: 'technology',
        difficulty: 'easy',
        questions: [
          {
            id: 'q1',
            text: 'JavaScript được tạo ra bởi ai?',
            type: 'multiple',
            answers: [
              { id: 'a1', text: 'Brendan Eich', isCorrect: true },
              { id: 'a2', text: 'Tim Berners-Lee', isCorrect: false },
              { id: 'a3', text: 'Douglas Crockford', isCorrect: false },
              { id: 'a4', text: 'John Resig', isCorrect: false }
            ],
            points: 1,
            correctAnswer: '',
            acceptedAnswers: []
          },
          {
            id: 'q2',
            text: 'Từ khóa nào dùng để khai báo biến trong ES6?',
            type: 'multiple',
            answers: [
              { id: 'a1', text: 'let', isCorrect: true },
              { id: 'a2', text: 'var', isCorrect: false },
              { id: 'a3', text: 'const', isCorrect: true },
              { id: 'a4', text: 'def', isCorrect: false }
            ],
            points: 1,
            correctAnswer: '',
            acceptedAnswers: []
          }
        ],
        timeLimit: 180,
        createdBy: 'test-user-id',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublished: true,
        status: 'approved',
        tags: ['javascript', 'programming']
      }
    ];

    console.log('Đang tạo quiz mẫu...');
    
    for (const quiz of testQuizzes) {
      const docRef = await addDoc(collection(db, 'quizzes'), quiz);
      console.log(`Quiz created with ID: ${docRef.id}`);
    }

    console.log('Đã tạo xong quiz mẫu');
  } catch (error) {
    console.error('Lỗi khi tạo quiz mẫu:', error);
  }
};

export const createTestReviews = async () => {
  try {
    // Lấy danh sách quiz
    const quizzesQuery = query(collection(db, 'quizzes'));
    const quizzesSnapshot = await getDocs(quizzesQuery);
    
    if (quizzesSnapshot.size === 0) {
      console.log('Không có quiz nào để tạo review');
      return;
    }

    const testReviews = [
      {
        rating: 5,
        comment: 'Quiz rất hay và bổ ích! Câu hỏi được thiết kế khá tốt.',
        userId: 'test-user-1',
        userName: 'Nguyễn Văn A',
        createdAt: serverTimestamp(),
        helpful: 0,
        helpfulVoters: []
      },
      {
        rating: 4,
        comment: 'Nội dung tốt nhưng có thể thêm nhiều câu hỏi hơn.',
        userId: 'test-user-2',
        userName: 'Trần Thị B',
        createdAt: serverTimestamp(),
        helpful: 2,
        helpfulVoters: ['user1', 'user2']
      },
      {
        rating: 5,
        comment: 'Tuyệt vời! Đã học được nhiều điều mới.',
        userId: 'test-user-3',
        userName: 'Lê Văn C',
        createdAt: serverTimestamp(),
        helpful: 1,
        helpfulVoters: ['user1']
      }
    ];

    console.log('Đang tạo review mẫu...');
    
    // Tạo review cho từng quiz
    for (const doc of quizzesSnapshot.docs) {
      const quizId = doc.id;
      
      for (const review of testReviews) {
        await addDoc(collection(db, 'quizReviews'), {
          ...review,
          quizId
        });
      }
      
      console.log(`Đã tạo review cho quiz ${quizId}`);
    }

    console.log('Đã tạo xong review mẫu');
  } catch (error) {
    console.error('Lỗi khi tạo review mẫu:', error);
  }
};

export const seedTestData = async () => {
  await createTestQuizzes();
  await createTestReviews();
};
