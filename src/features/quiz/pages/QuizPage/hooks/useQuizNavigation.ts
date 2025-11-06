import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Question, AnswerMap } from '../../../types';
import { isAnswerProvided } from '../utils';

interface UseQuizNavigationProps {
  questions: Question[];
  currentQuestionIndex: number;
  onQuestionChange: (index: number) => void;
  answers: AnswerMap;
}

export const useQuizNavigation = ({
  questions,
  currentQuestionIndex,
  onQuestionChange,
  answers
}: UseQuizNavigationProps) => {
  const navigate = useNavigate();
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showUnansweredModal, setShowUnansweredModal] = useState(false);

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      onQuestionChange(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, questions.length, onQuestionChange]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      onQuestionChange(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex, onQuestionChange]);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      onQuestionChange(index);
    }
  }, [questions.length, onQuestionChange]);

  const handleExitQuiz = useCallback(() => {
    setShowExitModal(true);
  }, []);

  const confirmExitQuiz = useCallback(() => {
    navigate('/quiz-list');
  }, [navigate]);

  const handleSubmitQuiz = useCallback(() => {
    // Check for unanswered questions
    const unansweredQuestions = questions.filter(question => !isAnswerProvided(answers[question.id]));

    if (unansweredQuestions.length > 0) {
      setShowUnansweredModal(true);
    } else {
      setShowSubmitModal(true);
    }
  }, [questions, answers]);

  const getUnansweredQuestions = useCallback(() => {
    return questions.filter(question => !isAnswerProvided(answers[question.id]));
  }, [questions, answers]);

  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const modalControls = {
    showExitModal,
    setShowExitModal,
    showSubmitModal,
    setShowSubmitModal,
    showUnansweredModal,
    setShowUnansweredModal
  };

  return {
    goToNextQuestion,
    goToPreviousQuestion,
    goToQuestion,
    handleExitQuiz,
    confirmExitQuiz,
    handleSubmitQuiz,
    getUnansweredQuestions,
    isFirstQuestion,
    isLastQuestion,
    modalControls
  };
};
