import { QuizFormData } from './types';

export const defaultQuiz: QuizFormData = {
  title: '',
  description: '',
  category: 'programming',
  difficulty: 'easy',
  duration: 15,
  imageUrl: '',
  questions: [],
  tags: [],
  allowRetake: true, // Mặc định cho phép làm lại
  isPublic: true, // Mặc định là Public
  quizType: undefined, // 🆕 Will be selected in step 0
  resources: [], // 🆕 Learning Materials
  havePassword: 'public', // 🔒 Default is public (no password required)
  password: '', // 🔒 Password for password-protected quiz
};

export const categories = [
  { value: 'programming', label: 'Lập trình' },
  { value: 'math', label: 'Toán học' },
  { value: 'science', label: 'Khoa học' },
  { value: 'history', label: 'Lịch sử' },
  { value: 'language', label: 'Ngôn ngữ' },
  { value: 'general', label: 'Tổng hợp' },
];

export const difficulties = [
  { value: 'easy', label: 'Dễ' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'hard', label: 'Khó' },
];

export const steps = [
  'Chọn Loại Quiz', // Step 0: Quiz Type Selection
  'Thông tin Quiz', // Step 1: Quiz Info (includes password now)
  'Tài liệu học tập', // Step 2: Resources (conditional - only for with-materials)
  'Câu hỏi', // Step 3: Questions
  'Xem lại & Xuất bản', // Step 4: Review
];
