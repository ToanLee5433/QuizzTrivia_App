import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../lib/store';
import { Question, Quiz, AnswerMap, AnswerValue } from '../../../types';
import { QuizSession } from '../types';
import { checkShortAnswer, isAnswerProvided } from '../utils';
import { quizStatsService } from '../../../../../services/quizStatsService';
import { toast } from 'react-toastify';

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

    let resultId: string | undefined;
    try {
      // Save result to Firestore for leaderboard
      if (user) {
        console.log('💾 Saving quiz result to Firestore...');
        
        // Convert answers to UserAnswer[] format using the same logic
        const userAnswers = Object.entries(finalSession.answers).map(([questionId, answer]) => {
          const question = quiz.questions.find(q => q.id === questionId);
          const answerValue: AnswerValue = answer as AnswerValue;
          const isCorrect = question ? isAnswerCorrect(question, answerValue) : false;
          
          return {
            questionId,
            selectedAnswerId: typeof answer === 'string' ? answer : JSON.stringify(answer),
            isCorrect,
            timeSpent: 0 // Not tracking per-question time yet
          };
        });
        
  const resultData = {
          userId: user.uid,
          userEmail: user.email || '',
          userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          quizId: quiz.id,
          score: score.percentage, // Always 0-100
          correctAnswers: score.correct,
          totalQuestions: score.total,
          timeSpent: Math.round(finalSession.timeSpent / 1000), // Convert to seconds
          answers: userAnswers,
          completedAt: new Date()
        };
        
        console.log('💾 Submitting quiz result:', resultData);
        
        // Import submitQuizResult function
    const { submitQuizResult } = await import('../../../api/base');
    resultId = await submitQuizResult(resultData);
    console.log('✅ Quiz result saved with ID:', resultId);
    
    // ✅ NEW: Track completion in quiz stats
    try {
      const { quizStatsService } = await import('../../../../../services/quizStatsService');
      await quizStatsService.trackCompletion(
        quiz.id,
        user.uid,
        score.correct,
        score.total
      );
      console.log('✅ Quiz stats updated');
    } catch (statsError) {
      console.error('❌ Failed to update quiz stats:', statsError);
      // Don't block user flow if stats update fails
    }
      }
  } catch (error) {
      console.error('❌ Failed to save quiz result:', error);
      // Continue to results page even if save fails
  }
    
    // Navigate to unified result viewer using the actual result document ID
    // This ensures we always have a valid resultId to fetch data
    if (resultId) {
      console.log('✅ Navigating to result viewer with resultId:', resultId);
      navigate(`/quiz-result/${resultId}`, { 
        state: { 
          // Keep state for immediate display, but component will also fetch from Firestore
          quiz, 
          session: finalSession, 
          score,
          correct: score.correct,
          total: score.total,
          answers: finalSession.answers,
          timeSpent: Math.round(finalSession.timeSpent / 1000),
          quizId: quiz.id,
          resultId: resultId
        } 
      });
    } else {
      console.error('❌ Failed to save quiz result, redirecting to quiz list');
      toast.error('Không thể lưu kết quả quiz. Vui lòng thử lại!');
      navigate('/quizzes');
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
