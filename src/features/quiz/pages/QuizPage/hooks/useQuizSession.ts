import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../lib/store';
import { Question, Quiz, AnswerMap, AnswerValue } from '../../../types';
import { QuizSession } from '../types';
import { checkShortAnswer, isAnswerProvided } from '../utils';
import { quizStatsService } from '../../../../../services/quizStatsService';
import { toast } from 'react-toastify';
import { db } from '../../../../flashcard/services/database';
import { enqueueQuizResult } from '../../../../../shared/services/offlineQueue';

interface UseQuizSessionProps {
  quiz: Quiz;
}

export const useQuizSession = ({ quiz }: UseQuizSessionProps) => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [session, setSession] = useState<QuizSession>({
    quizId: quiz.id,
    startTime: Date.now(),
    currentQuestionIndex: 0,
    answers: {},
    isCompleted: false,
    timeSpent: 0
  });

  // Reset session when quiz changes (for retake functionality)
  useEffect(() => {
    console.log('🔄 Resetting quiz session for quiz:', quiz.id);
    setSession({
      quizId: quiz.id,
      startTime: Date.now(),
      currentQuestionIndex: 0,
      answers: {},
      isCompleted: false,
      timeSpent: 0
    });
  }, [quiz.id]);

  // Track attempt when session starts
  useEffect(() => {
    if (user) {
      console.log('📊 Tracking quiz attempt for user:', user.uid);
      quizStatsService.trackAttempt(quiz.id, user.uid);
    }
  }, [quiz.id, user]);

  // Update time spent every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSession(prev => ({
        ...prev,
        timeSpent: Date.now() - prev.startTime
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const updateAnswer = useCallback((questionId: string, answer: AnswerValue) => {
    setSession(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: answer
      }
    }));
  }, []);

  const setCurrentQuestion = useCallback((index: number) => {
    setSession(prev => ({
      ...prev,
      currentQuestionIndex: index
    }));
  }, []);

  // Unified function to check if an answer is correct for any question type
  const isAnswerCorrect = useCallback((question: Question, userAnswer: AnswerValue): boolean => {
    if (userAnswer === undefined || userAnswer === null) {
      return false;
    }

    switch (question.type) {
      case 'boolean':
      case 'multiple':
      case 'image':
      case 'audio':
      case 'video':
      case 'multimedia': {
        const correctAnswerId = question.answers.find(a => a.isCorrect)?.id;
        return userAnswer === correctAnswerId;
      }
      case 'checkbox': {
        const correctIds = question.answers.filter(a => a.isCorrect).map(a => a.id).sort();
        const userIds = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
        return JSON.stringify(correctIds) === JSON.stringify(userIds);
      }
      case 'short_answer': {
        if (typeof userAnswer === 'string') {
          return checkShortAnswer(userAnswer, question);
        }
        return false;
      }
      case 'ordering': {
        // User answer is array of item IDs in their order
        const userOrder = Array.isArray(userAnswer) ? userAnswer : [];
        const items = question.orderingItems || [];
        
        // Check if length matches
        if (userOrder.length !== items.length) return false;
        
        // Create correct order array
        const correctOrder = [...items]
          .sort((a, b) => a.correctOrder - b.correctOrder)
          .map(item => item.id);
        
        // Compare arrays
        return JSON.stringify(userOrder) === JSON.stringify(correctOrder);
      }
      case 'matching': {
        // User answer is object: { leftItem: rightItem }
        const userMatches = typeof userAnswer === 'object' && !Array.isArray(userAnswer) 
          ? userAnswer as Record<string, string>
          : {};
        const pairs = question.matchingPairs || [];
        
        // Check if all pairs are matched correctly
        if (Object.keys(userMatches).length !== pairs.length) return false;
        
        return pairs.every(pair => userMatches[pair.left] === pair.right);
      }
      case 'fill_blanks': {
        // User answer is object: { blankId: userText }
        const userAnswers = typeof userAnswer === 'object' && !Array.isArray(userAnswer)
          ? userAnswer as Record<string, string>
          : {};
        const blanks = question.blanks || [];
        
        // Check all blanks
        return blanks.every(blank => {
          const userText = (userAnswers[blank.id] || '').trim();
          const correctText = blank.correctAnswer.trim();
          
          // Check case sensitivity
          const matches = blank.caseSensitive
            ? userText === correctText
            : userText.toLowerCase() === correctText.toLowerCase();
          
          if (matches) return true;
          
          // Check accepted answers
          if (blank.acceptedAnswers && blank.acceptedAnswers.length > 0) {
            return blank.acceptedAnswers.some(accepted => 
              blank.caseSensitive
                ? userText === accepted.trim()
                : userText.toLowerCase() === accepted.trim().toLowerCase()
            );
          }
          
          return false;
        });
      }
      default:
        console.warn(`⚠️ Unknown question type: ${question.type}`);
        return false;
    }
  }, []);

  const calculateScore = useCallback((questions: Question[], answers: AnswerMap) => {
    let correctAnswers = 0;
    const totalQuestions = questions.length;

    questions.forEach(question => {
      const userAnswer = answers[question.id];
      if (isAnswerCorrect(question, userAnswer)) {
        correctAnswers++;
      }
    });

    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    const result = {
      correct: correctAnswers,
      total: totalQuestions,
      percentage
    };

    console.log('📊 Score calculation:', result);
    return result;
  }, [isAnswerCorrect]);

  const completeQuiz = useCallback(async () => {
    const finalSession = {
      ...session,
      isCompleted: true,
      endTime: Date.now(),
      timeSpent: Date.now() - session.startTime
    };

    setSession(finalSession);

    // Calculate score
    const score = calculateScore(quiz.questions, finalSession.answers);

    // 🔥 CRITICAL FIX: Convert answers to UserAnswer[] format
    // Must include ALL questions (even unanswered ones) to calculate correct percentage
    const userAnswers = quiz.questions.map((question) => {
      const answer = finalSession.answers[question.id];
      const hasAnswer = isAnswerProvided(answer as AnswerValue);
      const isCorrect = hasAnswer ? isAnswerCorrect(question, answer as AnswerValue) : false;
      
      return {
        questionId: question.id,
        selectedAnswerId: hasAnswer 
          ? (typeof answer === 'string' ? answer : JSON.stringify(answer))
          : '', // Empty string for unanswered questions
        isCorrect,
        timeSpent: 0 // Not tracking per-question time yet
      };
    });

    // Generate local ID for offline mode
    const localResultId = `local_${quiz.id}_${user?.uid || 'anonymous'}_${Date.now()}`;

    // 🔥 STEP 1: Save to IndexedDB FIRST (Offline-First)
    try {
      const offlineResult = {
        id: localResultId,
        quizId: quiz.id,
        userId: user?.uid || 'anonymous',
        score: score.percentage,
        correctAnswers: score.correct,
        totalQuestions: score.total,
        answers: userAnswers,
        completedAt: Date.now(),
        synced: false, // Mark as not synced yet
        // Store full data for offline display
        quizTitle: quiz.title,
        timeSpent: Math.round(finalSession.timeSpent / 1000)
      };

      await db.results.add(offlineResult);
      console.log('✅ Quiz result saved to IndexedDB:', localResultId);
    } catch (indexedDBError) {
      console.error('❌ Failed to save to IndexedDB:', indexedDBError);
      // Continue anyway
    }

    // 🔥 STEP 2: Navigate immediately with local data (don't wait for Firebase)
    console.log('✅ Navigating to result viewer with local ID:', localResultId);
    navigate(`/quiz-result/${localResultId}`, { 
      state: { 
        quiz, 
        session: finalSession, 
        score,
        correct: score.correct,
        total: score.total,
        answers: finalSession.answers,
        timeSpent: Math.round(finalSession.timeSpent / 1000),
        quizId: quiz.id,
        resultId: localResultId,
        isOffline: true // Flag to indicate offline result
      } 
    });

    // 🔥 STEP 3: Enqueue for sync using offline queue system
    if (user) {
      try {
        // Use existing offlineQueue system for automatic sync
        await enqueueQuizResult(
          quiz.id,
          userAnswers,
          score.percentage,
          user.uid,
          Math.round(finalSession.timeSpent / 1000) // Pass timeSpent in seconds
        );
        console.log('✅ Quiz result enqueued for sync');

        // If online, trigger immediate sync (handled by autoSync)
        // Note: Notification will be shown by App.tsx sync-completed listener
        if (navigator.onLine) {
          // Dispatch event to trigger sync worker
          window.dispatchEvent(new CustomEvent('offline-queue-changed'));
          console.log('🔄 Triggered immediate sync (device online)');
        } else {
          // Only show offline info if sync notifications are enabled
          const showSyncNotif = localStorage.getItem('showSyncNotifications') === 'true';
          if (showSyncNotif) {
            toast.info('Đang offline. Kết quả sẽ được đồng bộ khi có mạng.', { autoClose: 3000 });
          }
        }

        // ✅ REMOVED: trackCompletion is now handled in submitQuizResult (base.ts) only
        // This prevents duplicate counting when the same completion is tracked multiple times
      } catch (enqueueError) {
        console.error('❌ Failed to enqueue quiz result:', enqueueError);
        toast.error('Lỗi lưu kết quả. Vui lòng thử lại.', { autoClose: 3000 });
      }
    }
  }, [session, quiz, navigate, calculateScore, user, isAnswerCorrect]);

  const getAnsweredQuestions = useCallback(() => {
    return Object.entries(session.answers)
      .filter(([, answer]) => isAnswerProvided(answer as AnswerValue))
      .map(([questionId]) => questionId);
  }, [session.answers]);

  const getUnansweredQuestions = useCallback(() => {
    return quiz.questions.filter(question => !isAnswerProvided(session.answers[question.id]));
  }, [quiz.questions, session.answers]);

  const progress = (getAnsweredQuestions().length / quiz.questions.length) * 100;

  return {
    session,
    updateAnswer,
    setCurrentQuestion,
    completeQuiz,
    calculateScore,
    getAnsweredQuestions,
    getUnansweredQuestions,
    progress
  };
};
