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
  { value: 'programming', labelKey: 'createQuiz.info.categoryOptions.programming' },
  { value: 'math', labelKey: 'createQuiz.info.categoryOptions.math' },
  { value: 'science', labelKey: 'createQuiz.info.categoryOptions.science' },
  { value: 'history', labelKey: 'createQuiz.info.categoryOptions.history' },
  { value: 'language', labelKey: 'createQuiz.info.categoryOptions.language' },
  { value: 'general', labelKey: 'createQuiz.info.categoryOptions.general' },
] as const;

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
