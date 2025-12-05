import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Question } from '../../../types';

// Import types from centralized location
import {
  QuizSettings,
  QuizMode,
  ExamConfig,
  PracticeConfig,
  DEFAULT_QUIZ_SETTINGS,
  SETTINGS_VERSION
} from '../../../types/quizSettings';

// Re-export types for backward compatibility
export type { QuizSettings, QuizMode, ExamConfig, PracticeConfig };

// Re-export DEFAULT_SETTINGS for backward compatibility (alias)
export const DEFAULT_SETTINGS = DEFAULT_QUIZ_SETTINGS;

/**
 * Hook to load and manage quiz settings
 */
export const useQuizSettings = () => {
  const { id: quizId } = useParams<{ id: string }>();
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_QUIZ_SETTINGS);

  // Load settings from localStorage on mount with VERSION CHECK
  useEffect(() => {
    if (!quizId) return;

    try {
      const savedSettings = localStorage.getItem(`quiz_settings_${quizId}`);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        
        // VERSION CHECK - Only trust settings with current version
        if (parsed.version === SETTINGS_VERSION) {
          console.log('✅ Loaded quiz settings (v' + SETTINGS_VERSION + '):', parsed);
          setSettings({ ...DEFAULT_QUIZ_SETTINGS, ...parsed });
        } else {
          // Old version - use defaults (will be migrated when modal opens)
          console.log(`🔄 Found old settings v${parsed.version || 0}, using defaults`);
          setSettings(DEFAULT_QUIZ_SETTINGS);
        }
      } else {
        console.log('📋 Using default quiz settings');
        setSettings(DEFAULT_QUIZ_SETTINGS);
      }
    } catch (error) {
      console.error('❌ Failed to load quiz settings:', error);
      setSettings(DEFAULT_QUIZ_SETTINGS);
    }
  }, [quizId]);

  /**
   * Apply shuffle to questions array
   */
  const shuffleQuestionsArray = useCallback((questions: Question[]): Question[] => {
    if (!settings.shuffleQuestions) return questions;
    
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    console.log('🔀 Questions shuffled');
    return shuffled;
  }, [settings.shuffleQuestions]);

  /**
   * Apply shuffle to a single question's answers
   */
  const shuffleQuestionAnswers = useCallback((question: Question): Question => {
    if (!settings.shuffleAnswers || !question.answers) return question;

    const shuffledAnswers = [...question.answers];
    for (let i = shuffledAnswers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledAnswers[i], shuffledAnswers[j]] = [shuffledAnswers[j], shuffledAnswers[i]];
    }

    return {
      ...question,
      answers: shuffledAnswers
    };
  }, [settings.shuffleAnswers]);

  /**
   * Calculate total time based on mode and settings
   * - Exam Mode: Use totalTime from examConfig (in minutes, convert to seconds)
   * - Practice Mode: Use timePerQuestion * questionCount (already in seconds)
   */
  const calculateTotalTime = useCallback((questionCount: number): number => {
    if (settings.mode === 'exam') {
      // Exam mode: totalTime is in minutes, convert to seconds
      if (settings.examConfig.totalTime === 0) {
        return 0; // No time limit
      }
      return settings.examConfig.totalTime * 60; // minutes to seconds
    } else {
      // Practice mode: timePerQuestion is in seconds
      const timePerQ = settings.practiceConfig.timePerQuestion || settings.timePerQuestion;
      if (timePerQ === 0) {
        return 0; // No time limit
      }
      return timePerQ * questionCount;
    }
  }, [settings.mode, settings.examConfig.totalTime, settings.practiceConfig.timePerQuestion, settings.timePerQuestion]);

  /**
   * Check if instant feedback should be shown (Practice mode only)
   */
  const shouldShowInstantFeedback = useCallback((): boolean => {
    return settings.mode === 'practice' && settings.practiceConfig.instantFeedback;
  }, [settings.mode, settings.practiceConfig.instantFeedback]);

  /**
   * Check if retry on wrong is enabled (Practice mode only)
   */
  const canRetryOnWrong = useCallback((): boolean => {
    return settings.mode === 'practice' && settings.practiceConfig.retryOnWrong;
  }, [settings.mode, settings.practiceConfig.retryOnWrong]);

  /**
   * Check if review is allowed before submit (Exam mode)
   */
  const canReviewBeforeSubmit = useCallback((): boolean => {
    return settings.mode === 'exam' && settings.examConfig.allowReview;
  }, [settings.mode, settings.examConfig.allowReview]);

  /**
   * Check if quiz is in exam mode
   */
  const isExamMode = useCallback((): boolean => {
    return settings.mode === 'exam';
  }, [settings.mode]);

  /**
   * Check if quiz is in practice mode
   */
  const isPracticeMode = useCallback((): boolean => {
    return settings.mode === 'practice';
  }, [settings.mode]);

  /**
   * Check if auto advance is enabled
   * Note: Auto advance is disabled when Practice mode + Instant Feedback is ON
   */
  const shouldAutoAdvance = useCallback((): boolean => {
    // If Practice mode with Instant Feedback, auto advance is disabled
    if (settings.mode === 'practice' && settings.practiceConfig.instantFeedback) {
      return false;
    }
    return settings.autoAdvance;
  }, [settings.mode, settings.practiceConfig.instantFeedback, settings.autoAdvance]);

  /**
   * Check if explanation should be shown (Practice mode only)
   */
  const shouldShowExplanation = useCallback((): boolean => {
    return settings.mode === 'practice' && (settings.practiceConfig.showExplanation ?? settings.showExplanations ?? true);
  }, [settings.mode, settings.practiceConfig.showExplanation, settings.showExplanations]);

  /**
   * Reload settings from localStorage (call after settings modal saves)
   */
  const reloadSettings = useCallback(() => {
    if (!quizId) return;

    try {
      const savedSettings = localStorage.getItem(`quiz_settings_${quizId}`);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        
        if (parsed.version === SETTINGS_VERSION) {
          console.log('🔄 Reloaded quiz settings (v' + SETTINGS_VERSION + '):', parsed);
          setSettings({ ...DEFAULT_QUIZ_SETTINGS, ...parsed });
        }
      }
    } catch (error) {
      console.error('❌ Failed to reload quiz settings:', error);
    }
  }, [quizId]);

  return {
    settings,
    reloadSettings,
    shuffleQuestionsArray,
    shuffleQuestionAnswers,
    calculateTotalTime,
    shouldShowInstantFeedback,
    canRetryOnWrong,
    canReviewBeforeSubmit,
    isExamMode,
    isPracticeMode,
    shouldAutoAdvance,
    shouldShowExplanation
  };
};
