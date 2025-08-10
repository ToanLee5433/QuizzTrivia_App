import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../lib/store';
import { Question, Quiz } from '../../../types';
import { QuizSession } from '../types';
import { checkShortAnswer } from '../utils';
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

  const updateAnswer = useCallback((questionId: string, answer: any) => {
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
  const isAnswerCorrect = useCallback((question: Question, userAnswer: any): boolean => {
    if (userAnswer === undefined || userAnswer === null) {
      return false;
    }

    switch (question.type) {
      case 'boolean':
      case 'multiple':
      case 'image': {
        const correctAnswerId = question.answers.find(a => a.isCorrect)?.id;
        return userAnswer === correctAnswerId;
      }
      case 'checkbox': {
        const correctIds = question.answers.filter(a => a.isCorrect).map(a => a.id).sort();
        const userIds = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
        return JSON.stringify(correctIds) === JSON.stringify(userIds);
      }
      case 'short_answer': {
        return checkShortAnswer(userAnswer, question);
      }
      default:
        return false;
    }
  }, []);

  const calculateScore = useCallback((questions: Question[], answers: Record<string, any>) => {
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
          const isCorrect = question ? isAnswerCorrect(question, answer) : false;
          
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
  }, [session, quiz, navigate, calculateScore, user]);

  const getAnsweredQuestions = useCallback(() => {
    return Object.keys(session.answers).filter(questionId => {
      const answer = session.answers[questionId];
      return answer !== undefined && 
             answer !== null && 
             answer !== '' && 
             !(Array.isArray(answer) && answer.length === 0);
    });
  }, [session.answers]);

  const getUnansweredQuestions = useCallback(() => {
    return quiz.questions.filter(question => {
      const answer = session.answers[question.id];
      return answer === undefined || 
             answer === null || 
             answer === '' || 
             (Array.isArray(answer) && answer.length === 0);
    });
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
