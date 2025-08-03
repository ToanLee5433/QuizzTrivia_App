import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase/config';

const testQuizzes = [
  {
    title: "Kiến thức cơ bản về JavaScript",
    description: "Bài quiz kiểm tra kiến thức cơ bản về ngôn ngữ lập trình JavaScript",
    category: "programming",
    difficulty: "easy",
    duration: 15,
    status: "pending",
    isPublic: true,
    isPublished: false,
    questions: [
      {
        id: "q1",
        text: "JavaScript là ngôn ngữ lập trình gì?",
        type: "multiple",
        points: 1,
        answers: [
          { id: "a1", text: "Ngôn ngữ lập trình phía client", isCorrect: true },
          { id: "a2", text: "Chỉ là ngôn ngữ phía server", isCorrect: false },
          { id: "a3", text: "Ngôn ngữ biên dịch", isCorrect: false },
          { id: "a4", text: "Ngôn ngữ assembly", isCorrect: false }
        ]
      },
      {
        id: "q2", 
        text: "Cách khai báo biến trong JavaScript ES6?",
        type: "multiple",
        points: 1,
        answers: [
          { id: "a1", text: "var", isCorrect: false },
          { id: "a2", text: "let và const", isCorrect: true },
          { id: "a3", text: "int", isCorrect: false },
          { id: "a4", text: "string", isCorrect: false }
        ]
      }
    ],
    createdBy: "test-user-admin",
    createdAt: serverTimestamp(),
    tags: ["javascript", "programming", "basic"]
  },
  {
    title: "Toán học cơ bản lớp 10",
    description: "Ôn tập kiến thức toán học cơ bản dành cho học sinh lớp 10",
    category: "math",
    difficulty: "medium", 
    duration: 20,
    status: "pending",
    isPublic: true,
    isPublished: false,
    questions: [
      {
        id: "q1",
        text: "Nghiệm của phương trình x² - 5x + 6 = 0 là?",
        type: "multiple",
        points: 2,
        answers: [
          { id: "a1", text: "x = 2 và x = 3", isCorrect: true },
          { id: "a2", text: "x = 1 và x = 6", isCorrect: false },
          { id: "a3", text: "x = -2 và x = -3", isCorrect: false },
          { id: "a4", text: "Vô nghiệm", isCorrect: false }
        ]
      },
      {
        id: "q2",
        text: "Sin²x + Cos²x = ?",
        type: "multiple", 
        points: 1,
        answers: [
          { id: "a1", text: "0", isCorrect: false },
          { id: "a2", text: "1", isCorrect: true },
          { id: "a3", text: "2", isCorrect: false },
          { id: "a4", text: "Tùy thuộc vào x", isCorrect: false }
        ]
      }
    ],
    createdBy: "test-user-admin",
    createdAt: serverTimestamp(),
    tags: ["math", "algebra", "trigonometry"]
  },
  {
    title: "Lịch sử Việt Nam thời kỳ kháng chiến",
    description: "Kiến thức về lịch sử Việt Nam trong các cuộc kháng chiến chống ngoại xâm",
    category: "history",
    difficulty: "hard",
    duration: 25,
    status: "approved",
    isPublic: true, 
    isPublished: true,
    questions: [
      {
        id: "q1",
        text: "Chiến thắng Điện Biên Phủ diễn ra vào năm nào?",
        type: "multiple",
        points: 2,
        answers: [
          { id: "a1", text: "1953", isCorrect: false },
          { id: "a2", text: "1954", isCorrect: true },
          { id: "a3", text: "1955", isCorrect: false },
          { id: "a4", text: "1956", isCorrect: false }
        ]
      },
      {
        id: "q2",
        text: "Ai là người chỉ huy chiến dịch Điện Biên Phủ?",
        type: "multiple",
        points: 2,
        answers: [
          { id: "a1", text: "Đại tướng Võ Nguyên Giáp", isCorrect: true },
          { id: "a2", text: "Đại tướng Nguyễn Chí Thanh", isCorrect: false },
          { id: "a3", text: "Đại tướng Hoàng Văn Thái", isCorrect: false },
          { id: "a4", text: "Đại tướng Văn Tiến Dũng", isCorrect: false }
        ]
      }
    ],
    createdBy: "test-user-admin",
    createdAt: serverTimestamp(),
    tags: ["history", "vietnam", "war"]
  }
];

export const createTestQuizzes = async () => {
  try {
    console.log('🎯 Bắt đầu tạo quiz test...');
    
    const promises = testQuizzes.map(async (quiz, index) => {
      try {
        const docRef = await addDoc(collection(db, 'quizzes'), quiz);
        console.log(`✅ Đã tạo quiz ${index + 1}: ${quiz.title} với ID: ${docRef.id}`);
        return docRef.id;
      } catch (error) {
        console.error(`❌ Lỗi tạo quiz ${index + 1}:`, error);
        throw error;
      }
    });

    const results = await Promise.all(promises);
    console.log('🎉 Hoàn thành tạo tất cả quiz test!', results);
    return results;
  } catch (error) {
    console.error('❌ Lỗi tạo quiz test:', error);
    throw error;
  }
};

export default createTestQuizzes;
