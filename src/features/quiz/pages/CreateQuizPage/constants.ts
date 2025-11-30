import { QuizFormData } from './types';

export const defaultQuiz: QuizFormData = {
  title: '',
  description: '',
  category: '', // Will be selected from Firestore categories
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

// Categories are now loaded from Firestore via useCategories hook
// No longer hardcoded here to ensure sync with CategoryManagement

export const difficulties = [
  { value: 'easy', labelKey: 'difficulty.easy' },
  { value: 'medium', labelKey: 'difficulty.medium' },
  { value: 'hard', labelKey: 'difficulty.hard' },
] as const;

export const stepKeys = [
  'createQuiz.steps.selectType',
  'createQuiz.steps.info',
  'createQuiz.steps.resources',
  'createQuiz.steps.questions',
  'createQuiz.steps.review',
] as const;
