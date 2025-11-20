import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Question } from '../../../types';

export interface QuizSettings {
  timePerQuestion: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showExplanations: boolean;
  autoSubmit: boolean;
  soundEffects: boolean;
  darkMode: boolean;
}

export const DEFAULT_SETTINGS: QuizSettings = {
  timePerQuestion: 0, // 0 = no time limit
  shuffleQuestions: false,
  shuffleAnswers: false,
  showExplanations: true,
  autoSubmit: false,
  soundEffects: true,
  darkMode: false
};

/**
 * Hook to load and manage quiz settings
 */
export const useQuizSettings = () => {
  const { id: quizId } = useParams<{ id: string }>();
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (!quizId) return;

    try {
      const savedSettings = localStorage.getItem(`quiz_settings_${quizId}`);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        console.log('✅ Loaded quiz settings:', parsed);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } else {
        console.log('📋 Using default quiz settings');
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('❌ Failed to load quiz settings:', error);
      setSettings(DEFAULT_SETTINGS);
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
   * Calculate total time based on timePerQuestion setting
   */
  const calculateTotalTime = useCallback((questionCount: number): number => {
    if (settings.timePerQuestion === 0) {
      return 0; // No time limit
    }
    return settings.timePerQuestion * questionCount;
  }, [settings.timePerQuestion]);

  return {
    settings,
    shuffleQuestionsArray,
    shuffleQuestionAnswers,
    calculateTotalTime
  };
};
