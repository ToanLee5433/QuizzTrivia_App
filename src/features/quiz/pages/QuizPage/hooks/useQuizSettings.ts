/**
 * 🎮 useQuizSettings Hook
 * 
 * Manages quiz settings and applies them to the quiz session:
 * - Load settings from localStorage
 * - Shuffle questions if enabled
 * - Shuffle answers if enabled
 * - Apply time limits
 * - Handle sound effects
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Quiz, Question } from '../../../types';

export interface QuizSettings {
  timePerQuestion: number;      // seconds, 0 = no limit
  shuffleQuestions: boolean;    // Trộn câu hỏi
  shuffleAnswers: boolean;      // Trộn đáp án
  showExplanations: boolean;    // Hiển thị giải thích
  autoSubmit: boolean;          // Tự động nộp bài
  soundEffects: boolean;        // Hiệu ứng âm thanh
  darkMode: boolean;            // Chế độ tối
}

const DEFAULT_SETTINGS: QuizSettings = {
  timePerQuestion: 0,
  shuffleQuestions: false,
  shuffleAnswers: false,
  showExplanations: true,
  autoSubmit: true,
  soundEffects: false,
  darkMode: false
};

/**
 * Fisher-Yates shuffle algorithm
 */
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Play correct/incorrect sound
 */
const playSound = (isCorrect: boolean) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (isCorrect) {
      // Success sound: C5 -> E5 -> G5 (major chord)
      oscillator.frequency.value = 523.25; // C5
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else {
      // Error sound: G4 -> D4 (descending)
      oscillator.frequency.value = 392.00; // G4
      oscillator.frequency.exponentialRampToValueAtTime(293.66, audioContext.currentTime + 0.2); // D4
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  } catch (error) {
    console.warn('Failed to play sound:', error);
  }
};

export const useQuizSettings = (quiz: Quiz) => {
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);
  const [processedQuestions, setProcessedQuestions] = useState<Question[]>([]);

  console.log('🎮 useQuizSettings - Quiz:', quiz.title, 'Questions:', quiz.questions?.length || 0);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(`quiz_settings_${quiz.id}`);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        console.log('⚙️ Loaded quiz settings:', parsed);
      } catch (error) {
        console.error('Failed to parse settings:', error);
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
    }
  }, [quiz.id]);

  // Process questions (shuffle if needed)
  useEffect(() => {
    console.log('🔄 Processing questions - Original count:', quiz.questions?.length || 0);
    
    // ⚠️ Safety check: quiz.questions might be undefined
    if (!quiz.questions || quiz.questions.length === 0) {
      console.warn('⚠️ No questions available in quiz!');
      setProcessedQuestions([]);
      return;
    }
    
    let questions = [...quiz.questions];

    // Shuffle questions if enabled
    if (settings.shuffleQuestions) {
      console.log('🎲 Shuffling questions...');
      questions = shuffleArray(questions);
    }

    // Shuffle answers if enabled
    if (settings.shuffleAnswers) {
      console.log('🔀 Shuffling answers...');
      questions = questions.map(question => {
        // Only shuffle for question types with multiple answers
        if (
          question.type === 'multiple' ||
          question.type === 'checkbox' ||
          question.type === 'boolean' ||
          question.type === 'image'
        ) {
          return {
            ...question,
            answers: shuffleArray([...question.answers])
          };
        }
        return question;
      });
    }

    console.log('✅ Processed questions count:', questions.length);
    setProcessedQuestions(questions);
  }, [quiz.questions, settings.shuffleQuestions, settings.shuffleAnswers]);

  // Calculate total quiz duration based on settings
  const totalDuration = useMemo(() => {
    if (settings.timePerQuestion === 0) {
      // Use quiz's default duration if no per-question limit
      return quiz.duration * 60; // Convert minutes to seconds
    }
    // Calculate based on number of questions * time per question
    return processedQuestions.length * settings.timePerQuestion;
  }, [settings.timePerQuestion, processedQuestions.length, quiz.duration]);

  // Play sound effect
  const playSoundEffect = useCallback((isCorrect: boolean) => {
    if (settings.soundEffects) {
      playSound(isCorrect);
    }
  }, [settings.soundEffects]);

  // Get time limit for current question (if per-question timing is enabled)
  const getQuestionTimeLimit = useCallback(() => {
    return settings.timePerQuestion > 0 ? settings.timePerQuestion : null;
  }, [settings.timePerQuestion]);

  return {
    settings,
    processedQuestions,
    totalDuration,
    playSoundEffect,
    getQuestionTimeLimit,
    // Helper flags
    shouldShowExplanations: settings.showExplanations,
    shouldAutoSubmit: settings.autoSubmit,
    hasTimeLimit: settings.timePerQuestion > 0 || quiz.duration > 0
  };
};
