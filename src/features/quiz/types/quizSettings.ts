/**
 * 🎮 Quiz Settings Types - DUAL MODE
 * 
 * Centralized type definitions for quiz settings
 * Used by both QuizSettingsModal (UI) and useQuizSettings (Hook)
 */

export type QuizMode = 'exam' | 'practice';

export interface ExamConfig {
  totalTime: number; // Total time in minutes, 0 = no limit
  allowReview: boolean; // Allow reviewing answers at the end
}

export interface PracticeConfig {
  timePerQuestion: number; // seconds, 0 = no limit
  instantFeedback: boolean; // Show correct/incorrect immediately
  showExplanation: boolean; // Show explanation after answering (only practice mode)
  retryOnWrong: boolean; // Allow retry on wrong answer
}

export interface QuizSettings {
  version: number; // Settings version for migration (current: 1)
  mode: QuizMode;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  autoAdvance: boolean; // Auto advance to next question after selecting answer
  autoSubmit: boolean;
  soundEffects: boolean;
  darkMode: boolean;
  // Mode-specific configs
  examConfig: ExamConfig;
  practiceConfig: PracticeConfig;
  // Legacy support
  timePerQuestion: number;
  showExplanations: boolean; // Legacy - use practiceConfig.instantFeedback instead
}

// Current settings version - increment when making breaking changes
// v1: Initial versioning
// v2: Fix default timePerQuestion for practice mode (30s instead of 0)
// v3: Practice mode now uses per-question timer (not total time)
export const SETTINGS_VERSION = 3;

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  version: SETTINGS_VERSION,
  mode: 'exam', // Default to exam mode
  shuffleQuestions: false,
  shuffleAnswers: false,
  autoAdvance: false, // Default: need to click "Next" button
  autoSubmit: true,
  soundEffects: true, // Default: enable sound effects
  darkMode: false,
  examConfig: {
    totalTime: 0, // No limit - will be overridden by Firestore quiz.duration
    allowReview: true
  },
  practiceConfig: {
    timePerQuestion: 0, // No limit - will be overridden to 30s by getDefaultSettings()
    instantFeedback: true,
    showExplanation: true,
    retryOnWrong: false
  },
  timePerQuestion: 0, // Legacy support
  showExplanations: true // Legacy support
};

// Time options for Practice Mode (per question - in seconds)
export const TIME_PER_QUESTION_OPTIONS = [
  { value: 0, labelKey: 'quizSettings.timeOptions.noLimit', fallback: 'No limit' },
  { value: 30, labelKey: 'quizSettings.timeOptions.seconds30', fallback: '30 seconds' },
  { value: 45, labelKey: 'quizSettings.timeOptions.seconds45', fallback: '45 seconds' },
  { value: 60, labelKey: 'quizSettings.timeOptions.minute1', fallback: '1 minute' },
  { value: 90, labelKey: 'quizSettings.timeOptions.minute1_5', fallback: '1.5 minutes' },
  { value: 120, labelKey: 'quizSettings.timeOptions.minutes2', fallback: '2 minutes' },
  { value: 180, labelKey: 'quizSettings.timeOptions.minutes3', fallback: '3 minutes' }
];

// Time options for Exam Mode (total time - in minutes)
export const TOTAL_TIME_OPTIONS = [
  { value: 0, labelKey: 'quizSettings.totalTimeOptions.noLimit', fallback: 'No limit' },
  { value: 15, labelKey: 'quizSettings.totalTimeOptions.minutes15', fallback: '15 minutes' },
  { value: 30, labelKey: 'quizSettings.totalTimeOptions.minutes30', fallback: '30 minutes' },
  { value: 45, labelKey: 'quizSettings.totalTimeOptions.minutes45', fallback: '45 minutes' },
  { value: 60, labelKey: 'quizSettings.totalTimeOptions.minutes60', fallback: '60 minutes' },
  { value: 90, labelKey: 'quizSettings.totalTimeOptions.minutes90', fallback: '90 minutes' },
  { value: 120, labelKey: 'quizSettings.totalTimeOptions.minutes120', fallback: '120 minutes' }
];
