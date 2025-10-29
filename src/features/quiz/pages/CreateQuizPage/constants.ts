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
  resources: [], // 🆕 Learning Materials
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
  'Thông tin Quiz',
  'Tài liệu học tập', // 🆕 Resources step (moved to step 2)
  'Câu hỏi',
  'Xem lại & Xuất bản',
];
