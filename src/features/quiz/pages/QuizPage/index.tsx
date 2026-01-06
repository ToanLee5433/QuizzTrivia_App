import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../../lib/store';
import { setQuizTimer } from '../../store';
import { useQuizData, useQuizSession, useQuizTimer, useQuizNavigation, useQuizSettings } from './hooks';
import Timer from './components/Timer';
import QuestionRenderer from './components/QuestionRenderer';
import ConfirmationModals from './components/ConfirmationModals';
import LearningResourcesView from './components/LearningResourcesView';
import { PauseMenu } from './components/PauseMenu';
import QuizPasswordModal from '../../../../shared/components/ui/QuizPasswordModal';
import QuizSettingsModal from '../../components/QuizSettingsModal';
import { unlockQuiz } from '../../../../lib/services/quizAccessService';
import { toast } from 'react-toastify';
import { Quiz, AnswerValue, Question } from '../../types';
import soundService from '../../../../services/soundService';
import musicService from '../../../../services/musicService';
import { quizPresenceService } from '../../../../services/quizPresenceService';
import { useSettings } from '../../../../contexts/SettingsContext';

const QuizPage: React.FC = () => {
  const { t } = useTranslation();
  const { quiz, loading, error, needsPassword, quizMetadata, retryLoad } = useQuizData();
  const user = useSelector((state: RootState) => state.auth.user);
  const location = useLocation();
  const [showResources, setShowResources] = useState(true);
  const [hasViewedResources, setHasViewedResources] = useState(false);
  
  // Get retake timestamp from navigation state to force re-mount
  const retakeKey = (location.state as { retakeTimestamp?: number } | null)?.retakeTimestamp || quiz?.id || 'default';

  // Handle password submission
  const handlePasswordSubmit = async (password: string): Promise<boolean> => {
    if (!quizMetadata || !user) {
      toast.error(t('quizPage.loginRequired'));
      return false;
    }

    try {
      const success = await unlockQuiz(
        quizMetadata.id,
        user.uid,
        password,
        quizMetadata
      );

      if (success) {
        toast.success(`🎉 ${t('quizPage.unlockSuccess')}`);
        // Retry loading questions
        retryLoad();
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error unlocking quiz:', err);
      toast.error(t('quizPage.unlockError'));
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('quizPage.loading')}</p>
        </div>
      </div>
    );
  }

  // Show password modal if needed
  if (needsPassword && quizMetadata) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <QuizPasswordModal
          isOpen={true}
          quizTitle={quizMetadata.title}
          onClose={() => window.history.back()}
          onSubmit={handlePasswordSubmit}
        />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('quizPage.cannotLoad')}</h2>
          <p className="text-gray-600">{error || t('quizPage.quizNotExist')}</p>
        </div>
      </div>
    );
  }

  // Check if quiz has learning resources
  const hasResources = quiz.resources && quiz.resources.length > 0;

  // Show resources view first if available and not viewed yet
  if (hasResources && showResources && !hasViewedResources) {
    return (
      <LearningResourcesView
        resources={quiz.resources || []}
        onComplete={() => {
          setHasViewedResources(true);
          setShowResources(false);
        }}
        onSkip={() => {
          setShowResources(false);
        }}
      />
    );
  }

  // Use key to force re-mount when retaking quiz
  return <QuizPageContent key={retakeKey} quiz={quiz} />;
};

interface QuizPageContentProps {
  quiz: Quiz;
}

const QuizPageContent: React.FC<QuizPageContentProps> = ({ quiz }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const { soundEffectsEnabled, isMusicPlayerEnabled } = useSettings();
  
  // Load quiz settings with helper functions
  const { 
    settings, 
    reloadSettings,
    shuffleQuestionsArray, 
    shuffleQuestionAnswers, 
    calculateTotalTime,
    shouldShowInstantFeedback,
    shouldAutoAdvance,
    shouldShowExplanation
  } = useQuizSettings();
  
  // State for pause and settings modal
  const [isPaused, setIsPaused] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // State for Practice Mode feedback
  const [feedbackState, setFeedbackState] = useState<{
    [questionId: string]: {
      isAnswered: boolean;
      isCorrect: boolean | null;
      correctAnswer: string | string[] | Record<string, string> | null;
    }
  }>({});
  
  // State for Practice Mode per-question timer
  // Initialize to -1 to distinguish "not started" from "time up" (0)
  const [practiceTimeLeft, setPracticeTimeLeft] = useState<number>(-1);
  const [isPracticeTimerPaused, setIsPracticeTimerPaused] = useState(false);
  
  // Reset all states when quiz changes (for retake functionality)
  useEffect(() => {
    console.log('🔄 Resetting QuizPage states for quiz:', quiz.id);
    setFeedbackState({});
    setIsPaused(false);
    setShowSettingsModal(false);
    setIsPracticeTimerPaused(false);
  }, [quiz.id]);
  
  // Get per-question time for practice mode
  const practiceTimePerQuestion = useMemo(() => {
    const timePerQ = settings.practiceConfig.timePerQuestion || settings.timePerQuestion || 30;
    return timePerQ;
  }, [settings.practiceConfig.timePerQuestion, settings.timePerQuestion]);
  
  // Apply user settings for timer (with fallback to quiz defaults)
  useEffect(() => {
    // For Practice mode, we use per-question timer (not total timer)
    if (settings.mode === 'practice') {
      // Set total time to 0 to disable the global timer
      dispatch(setQuizTimer(0));
      // Initialize per-question timer
      const timePerQ = practiceTimePerQuestion > 0 ? practiceTimePerQuestion : 30;
      setPracticeTimeLeft(timePerQ);
      console.log('⏱️ Practice mode: using per-question timer:', timePerQ, 'seconds');
      return;
    }
    
    // Exam mode: use total time
    let totalTimeInSeconds = calculateTotalTime(quiz.questions.length);
    
    // Fallback to quiz defaults if user hasn't set time (time = 0)
    if (totalTimeInSeconds === 0) {
      if (quiz.duration > 0) {
        // Exam mode: use quiz.duration (minutes) -> convert to seconds
        totalTimeInSeconds = quiz.duration * 60;
        console.log('⏱️ Using Firestore quiz.duration as fallback:', quiz.duration, 'minutes');
      }
    }
    
    console.log('⏱️ Exam mode: total time:', totalTimeInSeconds, 'seconds');
    dispatch(setQuizTimer(totalTimeInSeconds));
  }, [dispatch, calculateTotalTime, quiz.questions.length, quiz.duration, settings.mode, practiceTimePerQuestion]);
  
  // Apply shuffling to questions (memoized to prevent re-shuffling)
  const shuffledQuiz = useMemo(() => {
    const shuffledQuestions = shuffleQuestionsArray(quiz.questions);
    const questionsWithShuffledAnswers = shuffledQuestions.map(q => shuffleQuestionAnswers(q));
    return {
      ...quiz,
      questions: questionsWithShuffledAnswers
    };
  }, [quiz, shuffleQuestionsArray, shuffleQuestionAnswers]);
  
  const {
    session,
    updateAnswer,
    setCurrentQuestion,
    completeQuiz,
    getUnansweredQuestions,
    progress
  } = useQuizSession({ quiz: shuffledQuiz });

  const {
    formattedTime,
    isTimeRunningOut,
    isTimeCritical,
    percentage
  } = useQuizTimer({
    onTimeUp: completeQuiz,
    isActive: !session.isCompleted && !isPaused
  });
  
  // Practice mode: per-question timer countdown (moved after session is defined)
  useEffect(() => {
    if (settings.mode !== 'practice' || practiceTimePerQuestion === 0) return;
    if (isPaused || isPracticeTimerPaused || session.isCompleted) return;
    // Don't start countdown if timer hasn't been initialized yet
    if (practiceTimeLeft <= 0) return;
    
    const interval = setInterval(() => {
      setPracticeTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up for this question - auto advance or complete
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [settings.mode, practiceTimePerQuestion, isPaused, isPracticeTimerPaused, session.isCompleted, practiceTimeLeft]);
  
  // 🔊 Play tick sound during last 5 seconds of practice mode
  useEffect(() => {
    if (settings.mode !== 'practice' || practiceTimePerQuestion === 0) return;
    if (isPaused || isPracticeTimerPaused || session.isCompleted) return;
    
    // Play tick sound when timer is between 1-5 seconds (not -1 which means not initialized)
    if (practiceTimeLeft >= 1 && practiceTimeLeft <= 5 && settings.soundEffects) {
      console.log('🔔 Practice mode tick sound at:', practiceTimeLeft, 'seconds');
      soundService.play('tick');
    }
  }, [practiceTimeLeft, settings.mode, practiceTimePerQuestion, isPaused, isPracticeTimerPaused, session.isCompleted, settings.soundEffects]);
  
  // Reset practice timer when question changes
  useEffect(() => {
    if (settings.mode === 'practice' && practiceTimePerQuestion > 0) {
      setPracticeTimeLeft(practiceTimePerQuestion);
      setIsPracticeTimerPaused(false);
      console.log('⏱️ Practice timer reset for question:', session.currentQuestionIndex + 1);
    }
  }, [session.currentQuestionIndex, settings.mode, practiceTimePerQuestion]);

  // Handle practice mode time up - mark question as wrong when timer reaches 0
  // Note: practiceTimeLeft === -1 means "not initialized", 0 means "time actually ran out"
  useEffect(() => {
    if (settings.mode !== 'practice' || practiceTimePerQuestion === 0) return;
    // Only trigger when timer ACTUALLY reaches 0 (not when initialized as -1)
    if (practiceTimeLeft !== 0 || isPracticeTimerPaused || session.isCompleted) return;
    
    const question = shuffledQuiz.questions?.[session.currentQuestionIndex];
    if (!question) return;
    
    // Skip if already answered
    if (feedbackState[question.id]?.isAnswered) return;
    
    console.log('⏱️ Practice mode TIME UP for question:', question.id, '- marking as wrong');
    
    // Play time up sound
    soundService.unlock();
    soundService.setEnabled(true);
    soundService.play('timeup');
    
    // Get correct answer for this question type
    let correctAnswer: string | string[] | Record<string, string> | null = null;
    if (question.type === 'multiple' || question.type === 'boolean') {
      const correct = question.answers?.find(a => a.isCorrect);
      correctAnswer = correct?.id || null;
    } else if (question.type === 'checkbox') {
      correctAnswer = question.answers?.filter(a => a.isCorrect).map(a => a.id) || [];
    }
    
    // Mark as wrong (unanswered due to time up)
    setFeedbackState(prev => ({
      ...prev,
      [question.id]: {
        isAnswered: true,
        isCorrect: false,
        correctAnswer
      }
    }));
    
    // Pause timer to prevent re-triggering
    setIsPracticeTimerPaused(true);
  }, [practiceTimeLeft, settings.mode, practiceTimePerQuestion, isPracticeTimerPaused, session.currentQuestionIndex, session.isCompleted, shuffledQuiz.questions, feedbackState]);
  
  // Initialize sound service on mount - use global settings
  useEffect(() => {
    // 🔊 Sound effects - use global setting OR local quiz setting
    const shouldEnableSound = soundEffectsEnabled || settings.soundEffects;
    
    soundService.unlock();
    soundService.setEnabled(shouldEnableSound);
    
    console.log('[QuizPage] Sound enabled:', shouldEnableSound, '(global:', soundEffectsEnabled, ', local:', settings.soundEffects, ')');
    
    if (shouldEnableSound) {
      soundService.play('gameStart');
    }
    
    // 🎵 Start game music - use global setting
    musicService.unlock();
    musicService.setEnabled(isMusicPlayerEnabled); // Explicitly set enabled state
    if (isMusicPlayerEnabled) {
      console.log('[QuizPage] Starting game music');
      musicService.play('game', 1000); // Fade in 1 second
    } else {
      console.log('[QuizPage] Music disabled in settings');
    }
    
    return () => {
      // Stop music when leaving quiz (will be replaced by victory music on results)
      musicService.stop(500);
    };
  }, [settings.soundEffects, soundEffectsEnabled, isMusicPlayerEnabled]);
  
  // Track presence when user starts playing
  useEffect(() => {
    if (!user) return;
    
    // Join quiz as active player
    const joinPresence = async () => {
      try {
        await quizPresenceService.joinQuiz(
          quiz.id,
          user.uid,
          user.displayName || user.email || 'Anonymous',
          true // isPlaying = true
        );
        console.log('✅ Joined quiz presence as active player');
      } catch (error) {
        console.error('❌ Failed to join quiz presence:', error);
      }
    };
    
    joinPresence();
    
    // Leave quiz on unmount
    return () => {
      quizPresenceService.leaveQuiz(quiz.id, user.uid).catch(console.error);
    };
  }, [quiz.id, user]);
  
  // Update sound enabled state when settings change
  useEffect(() => {
    const shouldEnableSound = soundEffectsEnabled || settings.soundEffects;
    soundService.setEnabled(shouldEnableSound);
  }, [settings.soundEffects, soundEffectsEnabled]);
  
  // Keyboard shortcuts for pause - with focus check
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Skip shortcuts when user is editing text
      const activeElement = document.activeElement;
      const isEditingText = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true' ||
        activeElement.classList.contains('ql-editor') ||
        activeElement.closest('.ql-container') !== null
      );
      
      if (isEditingText) return;
      
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (!showSettingsModal && !session.isCompleted) {
          setIsPaused(prev => !prev);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showSettingsModal, session.isCompleted]);

  const {
    goToNextQuestion,
    goToPreviousQuestion,
    goToQuestion,
    handleExitQuiz,
    confirmExitQuiz,
    handleSubmitQuiz,
    isFirstQuestion,
    isLastQuestion,
    modalControls
  } = useQuizNavigation({
    questions: shuffledQuiz.questions,
    currentQuestionIndex: session.currentQuestionIndex,
    onQuestionChange: setCurrentQuestion,
    answers: session.answers
  });
  
  // Pause menu handlers
  const handlePause = () => setIsPaused(true);
  const handleResume = () => {
    setIsPaused(false);
    if (settings.soundEffects) {
      soundService.play('click');
    }
  };
  const handleOpenSettings = () => {
    setIsPaused(false);
    setShowSettingsModal(true);
  };
  const handleCloseSettings = () => {
    setShowSettingsModal(false);
    // Reload settings from localStorage after modal saves
    reloadSettings();
  };
  const handleExitFromPause = () => {
    setIsPaused(false);
    handleExitQuiz();
  };
  
  // Get correct answer for a question
  const getCorrectAnswer = (question: Question): string | string[] | Record<string, string> | null => {
    if (!question) return null;
    
    // For multiple choice / boolean
    if (question.type === 'multiple' || question.type === 'boolean') {
      const correctAnswer = question.answers?.find(a => a.isCorrect);
      return correctAnswer?.id || null;
    }
    
    // For checkbox (multiple correct)
    if (question.type === 'checkbox') {
      return question.answers?.filter(a => a.isCorrect).map(a => a.id) || [];
    }
    
    // For short_answer
    if (question.type === 'short_answer') {
      return question.correctAnswer || null;
    }
    
    // For fill_blanks - return object with blankId -> correctAnswer
    if (question.type === 'fill_blanks' && question.blanks) {
      const blanksAnswer: Record<string, string> = {};
      question.blanks.forEach(blank => {
        blanksAnswer[blank.id] = blank.correctAnswer;
      });
      return blanksAnswer;
    }
    
    // For matching - return object with left -> right
    if (question.type === 'matching' && question.matchingPairs) {
      const matchingAnswer: Record<string, string> = {};
      question.matchingPairs.forEach(pair => {
        matchingAnswer[pair.left] = pair.right;
      });
      return matchingAnswer;
    }
    
    // For ordering - return array of IDs in correct order
    if (question.type === 'ordering' && question.orderingItems) {
      return [...question.orderingItems]
        .sort((a, b) => a.correctOrder - b.correctOrder)
        .map(item => item.id);
    }
    
    // For other types, return null (no instant feedback support yet)
    return null;
  };
  
  // Check if answer is correct
  const checkAnswer = (question: Question, answer: AnswerValue): boolean => {
    const correctAnswer = getCorrectAnswer(question);
    if (correctAnswer === null || answer === null || answer === undefined) return false;
    
    // For ordering type - compare array order
    if (question.type === 'ordering' && Array.isArray(correctAnswer)) {
      if (!Array.isArray(answer)) return false;
      return correctAnswer.length === answer.length && 
        correctAnswer.every((id, index) => id === answer[index]);
    }
    
    // For checkbox type - unordered array comparison
    if (question.type === 'checkbox' && Array.isArray(correctAnswer)) {
      if (!Array.isArray(answer)) return false;
      return correctAnswer.length === answer.length && 
        correctAnswer.every(id => answer.includes(id));
    }
    
    // For short_answer - case insensitive comparison with trim
    if (question.type === 'short_answer' && typeof correctAnswer === 'string') {
      if (typeof answer !== 'string') return false;
      const userAnswer = answer.trim().toLowerCase();
      const correct = correctAnswer.trim().toLowerCase();
      
      // Also check acceptedAnswers if available
      if (userAnswer === correct) return true;
      if (question.acceptedAnswers) {
        return question.acceptedAnswers.some(
          acc => acc.trim().toLowerCase() === userAnswer
        );
      }
      return false;
    }
    
    // For fill_blanks - check each blank
    if (question.type === 'fill_blanks' && typeof correctAnswer === 'object' && !Array.isArray(correctAnswer)) {
      if (typeof answer !== 'object' || Array.isArray(answer) || answer === null) return false;
      const userAnswers = answer as Record<string, string>;
      const correctAnswers = correctAnswer as Record<string, string>;
      
      // Check each blank
      for (const [blankId, correctValue] of Object.entries(correctAnswers)) {
        const userValue = userAnswers[blankId]?.trim().toLowerCase() || '';
        const correctLower = correctValue.trim().toLowerCase();
        
        // Find the blank to check acceptedAnswers
        const blank = question.blanks?.find(b => b.id === blankId);
        
        if (userValue !== correctLower) {
          // Check accepted answers for this blank
          if (blank?.acceptedAnswers) {
            const isAccepted = blank.acceptedAnswers.some(
              acc => acc.trim().toLowerCase() === userValue
            );
            if (!isAccepted) return false;
          } else {
            return false;
          }
        }
      }
      return true;
    }
    
    // For matching - check each pair
    if (question.type === 'matching' && typeof correctAnswer === 'object' && !Array.isArray(correctAnswer)) {
      if (typeof answer !== 'object' || Array.isArray(answer) || answer === null) return false;
      const userMatches = answer as Record<string, string>;
      const correctMatches = correctAnswer as Record<string, string>;
      
      // Check all pairs are matched and correct
      const correctEntries = Object.entries(correctMatches);
      if (Object.keys(userMatches).length !== correctEntries.length) return false;
      
      for (const [left, right] of correctEntries) {
        if (userMatches[left] !== right) return false;
      }
      return true;
    }
    
    // Default: simple equality check (multiple, boolean)
    return answer === correctAnswer;
  };
  
  // Handle answer selection with Practice Mode logic
  const handleAnswerChange = (questionId: string, answer: AnswerValue) => {
    const question = shuffledQuiz.questions.find(q => q.id === questionId);
    if (!question) return;
    
    // If already answered in instant feedback mode, don't allow change
    if (shouldShowInstantFeedback() && feedbackState[questionId]?.isAnswered) {
      return;
    }
    
    updateAnswer(questionId, answer);
    
    if (settings.soundEffects) {
      soundService.play('click');
    }
    
    // Practice Mode: Instant Feedback
    // Only auto-trigger for simple question types (multiple choice, boolean)
    // Complex types (checkbox, short_answer, fill_blanks, matching, ordering) need manual "Check" button
    const simpleQuestionTypes = ['multiple', 'boolean'];
    const isSimpleQuestion = simpleQuestionTypes.includes(question.type);
    
    if (shouldShowInstantFeedback() && isSimpleQuestion) {
      const isCorrect = checkAnswer(question, answer);
      const correctAnswer = getCorrectAnswer(question);
      
      // Pause practice timer when answer is checked
      setIsPracticeTimerPaused(true);
      
      setFeedbackState(prev => ({
        ...prev,
        [questionId]: {
          isAnswered: true,
          isCorrect,
          correctAnswer
        }
      }));
      
      // Play sound based on result
      if (settings.soundEffects) {
        soundService.play(isCorrect ? 'correct' : 'wrong');
      }
      
      // Auto advance after delay (if enabled and not in instant feedback mode)
      // Note: In instant feedback mode, user should see feedback before advancing
      if (shouldAutoAdvance() && !shouldShowInstantFeedback()) {
        setTimeout(() => {
          if (!isLastQuestion) {
            goToNextQuestion();
          }
        }, 300);
      }
    } else if (shouldAutoAdvance()) {
      // Exam mode with auto advance - go to next question immediately
      setTimeout(() => {
        if (!isLastQuestion) {
          goToNextQuestion();
        }
      }, 300);
    }
  };
  
  // Manual check answer for complex question types
  const handleCheckAnswer = () => {
    if (!currentQuestion) return;
    const answer = session.answers[currentQuestion.id];
    if (!answer) return;
    
    const isCorrect = checkAnswer(currentQuestion, answer);
    const correctAnswer = getCorrectAnswer(currentQuestion);
    
    // Pause practice timer when answer is checked
    setIsPracticeTimerPaused(true);
    
    setFeedbackState(prev => ({
      ...prev,
      [currentQuestion.id]: {
        isAnswered: true,
        isCorrect,
        correctAnswer
      }
    }));
    
    if (settings.soundEffects) {
      soundService.play(isCorrect ? 'correct' : 'wrong');
    }
  };
  
  // Check if current question is complex type (needs manual check button)
  const isComplexQuestionType = (type: string) => {
    return ['checkbox', 'short_answer', 'fill_blanks', 'matching', 'ordering'].includes(type);
  };

  const currentQuestion = shuffledQuiz.questions?.[session.currentQuestionIndex];

  // If no questions available (draft/pending quiz), show message
  if (!shuffledQuiz.questions || shuffledQuiz.questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-yellow-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('quizPage.notReady')}</h2>
          <p className="text-gray-600 mb-6">
            {t('quizPage.notReadyMessage')}
          </p>
          <button
            onClick={() => navigate('/creator/my-quizzes')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('quizPage.backToList')}
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (session.isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('quizPage.processingResult')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative selection:bg-blue-100 selection:text-blue-700">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-40 pointer-events-none" style={{ 
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
        backgroundSize: '24px 24px' 
      }}></div>

      {/* Header - Sticky & Glassmorphism */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            
            {/* Left: Exit & Title */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={handleExitQuiz}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-all group"
                title={t('quizPage.exitQuiz')}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
                <span className="font-semibold hidden md:inline text-sm">{t('quizPage.exit')}</span>
              </button>
              
              <div className="h-6 sm:h-8 w-px bg-slate-200 hidden sm:block"></div>
              
              <h1 className="text-sm sm:text-lg font-bold text-slate-800 truncate max-w-[100px] sm:max-w-[200px] md:max-w-none" title={shuffledQuiz.title}>
                {shuffledQuiz.title}
              </h1>
            </div>
            
            {/* Right: Stats & Controls */}
            <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
              {/* Timer Widget - Show practice timer or exam timer */}
              {settings.mode === 'practice' && practiceTimePerQuestion > 0 ? (
                <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border ${
                  practiceTimeLeft <= 5 
                    ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' 
                    : practiceTimeLeft <= 10
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-600'
                      : isPracticeTimerPaused
                        ? 'bg-green-50 border-green-200 text-green-600'
                        : 'bg-blue-50 border-blue-100 text-blue-700'
                }`}>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-bold text-sm sm:text-base tabular-nums">
                    {isPracticeTimerPaused ? '✓' : `${Math.floor(practiceTimeLeft / 60).toString().padStart(2, '0')}:${(practiceTimeLeft % 60).toString().padStart(2, '0')}`}
                  </span>
                </div>
              ) : (
                <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border ${
                  isTimeRunningOut 
                    ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' 
                    : 'bg-blue-50 border-blue-100 text-blue-700'
                }`}>
                  <Timer
                    timeLeft={formattedTime}
                    isWarning={isTimeRunningOut}
                    isCritical={isTimeCritical}
                    percentage={percentage}
                  />
                </div>
              )}

              {/* Pause Button */}
              <button
                onClick={handlePause}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Tạm dừng (P)"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress Bar as Bottom Border */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-4 relative z-10">
        {/* Mobile Quick Nav - Compact horizontal scroll */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 sm:p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">Câu hỏi</span>
            <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {session.currentQuestionIndex + 1}/{shuffledQuiz.questions.length}
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300">
            {shuffledQuiz.questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => goToQuestion(index)}
                className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs font-bold transition-all ${index === session.currentQuestionIndex
                    ? 'bg-blue-600 text-white shadow-md scale-110'
                    : session.answers[q.id]
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Main Quiz Content - Compact */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-md border-0 p-3 sm:p-5 relative overflow-hidden">
          {/* Decorative top accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          <div className="relative z-10">
            <QuestionRenderer
              question={currentQuestion}
              questionNumber={session.currentQuestionIndex + 1}
              value={session.answers[currentQuestion.id]}
              onChange={(answer: AnswerValue) => handleAnswerChange(currentQuestion.id, answer)}
              onCheckAnswer={shouldShowInstantFeedback() && isComplexQuestionType(currentQuestion.type) ? handleCheckAnswer : undefined}
              feedback={shouldShowInstantFeedback() ? {
                isAnswered: feedbackState[currentQuestion.id]?.isAnswered || false,
                isCorrect: feedbackState[currentQuestion.id]?.isCorrect ?? null,
                // Hide correct answer when retry is enabled AND answer is wrong (let them try again)
                correctAnswer: (settings.practiceConfig.retryOnWrong && !feedbackState[currentQuestion.id]?.isCorrect) 
                  ? null 
                  : feedbackState[currentQuestion.id]?.correctAnswer ?? null,
                // Hide explanation when retry is enabled AND answer is wrong (don't reveal answer)
                showExplanation: shouldShowExplanation() && 
                  (feedbackState[currentQuestion.id]?.isAnswered || false) &&
                  (!settings.practiceConfig.retryOnWrong || feedbackState[currentQuestion.id]?.isCorrect === true)
              } : undefined}
              disabled={shouldShowInstantFeedback() && feedbackState[currentQuestion.id]?.isAnswered}
              isPracticeMode={shouldShowInstantFeedback()}
            />
          </div>

          {/* Navigation Buttons - Centered */}
          <div className="flex flex-col items-center mt-4 sm:mt-6 pt-4 border-t border-gray-100 gap-3">
            {/* Action Buttons Row */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {/* Check Answer Button - For complex question types in Practice Mode */}
              {shouldShowInstantFeedback() && 
               isComplexQuestionType(currentQuestion.type) &&
               !feedbackState[currentQuestion.id]?.isAnswered &&
               session.answers[currentQuestion.id] && (
                <button
                  onClick={handleCheckAnswer}
                  className="flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-indigo-500 text-white rounded-full text-sm font-semibold hover:bg-indigo-600 shadow-md transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Kiểm tra</span>
                </button>
              )}
              
              {/* Retry Button */}
              {shouldShowInstantFeedback() && 
               feedbackState[currentQuestion.id]?.isAnswered && 
               !feedbackState[currentQuestion.id]?.isCorrect && 
               settings.practiceConfig.retryOnWrong && (
                <button
                  onClick={() => {
                    setFeedbackState(prev => {
                      const newState = { ...prev };
                      delete newState[currentQuestion.id];
                      return newState;
                    });
                    updateAnswer(currentQuestion.id, '');
                    setIsPracticeTimerPaused(false);
                    setPracticeTimeLeft(practiceTimePerQuestion);
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-amber-500 text-white rounded-full text-sm font-semibold hover:bg-amber-600 shadow-md transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Thử lại</span>
                </button>
              )}
            </div>

            {/* Navigation Row - Centered */}
            <div className="flex items-center justify-center gap-3 w-full">
              <button
                onClick={goToPreviousQuestion}
                disabled={isFirstQuestion}
                className={`flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-semibold transition-all ${isFirstQuestion
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400 hover:text-blue-600 shadow-sm hover:shadow-md'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Trước</span>
              </button>

              {isLastQuestion ? (
                <button
                  onClick={handleSubmitQuiz}
                  className="flex items-center justify-center gap-1.5 px-5 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-sm font-bold hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Nộp bài</span>
                </button>
              ) : (
                <button
                  onClick={goToNextQuestion}
                  className={`flex items-center justify-center gap-1.5 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm font-semibold shadow-md hover:shadow-lg transition-all ${shouldShowInstantFeedback() && feedbackState[currentQuestion.id]?.isAnswered
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <span>{shouldShowInstantFeedback() && feedbackState[currentQuestion.id]?.isAnswered ? 'Tiếp tục' : 'Tiếp'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmationModals
        modalControls={modalControls}
        onConfirmExit={confirmExitQuiz}
        onConfirmSubmit={completeQuiz}
        unansweredQuestions={getUnansweredQuestions()}
        onGoToQuestion={goToQuestion}
      />

      {/* Time Warning Alert - Different logic for Practice vs Exam mode */}
      {/* Practice mode: only show when <= 5 seconds */}
      {settings.mode === 'practice' && practiceTimeLeft <= 5 && practiceTimeLeft > 0 && !isPracticeTimerPaused && !isPaused && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg bg-red-600 text-white border border-red-700 text-sm">
            <span>⏰</span>
            <span className="font-bold">Còn {practiceTimeLeft}s!</span>
          </div>
        </div>
      )}
      
      {/* Exam mode: show when time is running out */}
      {settings.mode === 'exam' && isTimeRunningOut && !isPaused && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border text-sm ${
            isTimeCritical 
              ? 'bg-red-600 text-white border-red-700' 
              : 'bg-yellow-500 text-white border-yellow-600'
          }`}>
            <span>⏰</span>
            <span className="font-bold">
              {isTimeCritical 
                ? "Sắp hết giờ! Nộp bài ngay!" 
                : "Thời gian sắp hết"}
            </span>
          </div>
        </div>
      )}
      
      {/* Pause Menu */}
      <PauseMenu
        isOpen={isPaused}
        onResume={handleResume}
        onSettings={handleOpenSettings}
        onExit={handleExitFromPause}
      />
      
      {/* Settings Modal */}
      <QuizSettingsModal
        isOpen={showSettingsModal}
        onClose={handleCloseSettings}
        onSave={handleCloseSettings}
        quizId={shuffledQuiz.id}
        quiz={{
          duration: quiz.duration || 0,
          questions: quiz.questions || []
        }}
        isQuizInProgress={true}
      />
    </div>
  );
};

export default QuizPage;
