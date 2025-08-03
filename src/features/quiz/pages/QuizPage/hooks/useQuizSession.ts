import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../lib/store';
import { Question, Quiz } from '../../../types';
import { QuizSession } from '../types';
import { checkShortAnswer } from '../utils';

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

  const calculateScore = useCallback((questions: Question[], answers: Record<string, any>) => {
    let correctAnswers = 0;
    let totalQuestions = questions.length;

    questions.forEach(question => {
      const userAnswer = answers[question.id];

      if (userAnswer === undefined || userAnswer === null) {
        return;
      }

      let isCorrect = false;

      switch (question.type) {
        case 'boolean':
        case 'multiple':
        case 'image': {
          // Đáp án là id đáp án đúng
          const correct = question.answers.find(a => a.isCorrect)?.id;
          isCorrect = userAnswer === correct;
          if (isCorrect) correctAnswers++;
          break;
        }
        case 'checkbox': {
          // Đáp án là mảng id đáp án đúng
          const correctIds = question.answers.filter(a => a.isCorrect).map(a => a.id).sort();
          const userIds = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
          isCorrect = JSON.stringify(correctIds) === JSON.stringify(userIds);
          if (isCorrect) correctAnswers++;
          break;
        }
        case 'short_answer': {
          isCorrect = checkShortAnswer(userAnswer, question);
          if (isCorrect) correctAnswers++;
          break;
        }
        default:
          break;
      }
    });

    const result = {
      correct: correctAnswers,
      total: totalQuestions,
      percentage: Math.round((correctAnswers / totalQuestions) * 100)
    };

    return result;
  }, []);

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
    
    try {
      // Save result to Firestore for leaderboard
      if (user) {
        console.log('💾 Saving quiz result to Firestore...');
        
        // Convert answers to UserAnswer[] format
        const userAnswers = Object.entries(finalSession.answers).map(([questionId, answer]) => ({
          questionId,
          selectedAnswerId: typeof answer === 'string' ? answer : JSON.stringify(answer),
          isCorrect: false, // Will be calculated in the service
          timeSpent: 0 // Not tracking per-question time yet
        }));
        
        const resultData = {
          userId: user.uid,
          userEmail: user.email || '',
          userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          quizId: quiz.id,
          score: score.percentage,
          correctAnswers: score.correct,
          totalQuestions: score.total,
          timeSpent: Math.round(finalSession.timeSpent / 1000), // Convert to seconds
          answers: userAnswers,
          completedAt: new Date()
        };
        
        // Import submitQuizResult function
        const { submitQuizResult } = await import('../../../api/base');
        const resultId = await submitQuizResult(resultData);
        console.log('✅ Quiz result saved with ID:', resultId);
      }
    } catch (error) {
      console.error('❌ Failed to save quiz result:', error);
      // Continue to results page even if save fails
    }
    
    // Navigate to results page with session data and quiz ID as attemptId
    navigate(`/results/${quiz.id}`, { 
      state: { 
        quiz, 
        session: finalSession, 
        score,
        correct: score.correct,
        total: score.total,
        answers: finalSession.answers,
        timeSpent: Math.round(finalSession.timeSpent / 1000), // Convert to seconds for consistency
        quizId: quiz.id
      } 
    });
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
