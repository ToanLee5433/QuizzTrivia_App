import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../../../lib/store';
import { useQuizData, useQuizSession, useQuizTimer, useQuizNavigation, useQuizSettings } from './hooks';
import Timer from './components/Timer';
import QuestionRenderer from './components/QuestionRenderer';
import QuickNavigation from './components/QuickNavigation';
import ConfirmationModals from './components/ConfirmationModals';
import LearningResourcesView from './components/LearningResourcesView';
import { PauseMenu } from './components/PauseMenu';
import QuizPasswordModal from '../../../../shared/components/ui/QuizPasswordModal';
import QuizSettingsModal from '../../components/QuizSettingsModal';
import { unlockQuiz } from '../../../../lib/services/quizAccessService';
import { toast } from 'react-toastify';
import { Quiz, AnswerValue } from '../../types';
import soundService from '../../../../services/soundService';
import { quizPresenceService } from '../../../../services/quizPresenceService';

const QuizPage: React.FC = () => {
  const { quiz, loading, error, needsPassword, quizMetadata, retryLoad } = useQuizData();
  const user = useSelector((state: RootState) => state.auth.user);
  const [showResources, setShowResources] = useState(true);
  const [hasViewedResources, setHasViewedResources] = useState(false);

  // Handle password submission
  const handlePasswordSubmit = async (password: string): Promise<boolean> => {
    if (!quizMetadata || !user) {
      toast.error('Vui lòng đăng nhập để truy cập quiz');
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
        toast.success('🎉 Đã mở khóa quiz thành công!');
        // Retry loading questions
        retryLoad();
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error unlocking quiz:', err);
      toast.error('Có lỗi xảy ra khi mở khóa quiz');
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải quiz...</p>
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Không thể tải quiz</h2>
          <p className="text-gray-600">{error || 'Quiz không tồn tại'}</p>
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

  return <QuizPageContent quiz={quiz} />;
};

interface QuizPageContentProps {
  quiz: Quiz;
}

const QuizPageContent: React.FC<QuizPageContentProps> = ({ quiz }) => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Load quiz settings
  const { settings, shuffleQuestionsArray, shuffleQuestionAnswers } = useQuizSettings();
  
  // State for pause and settings modal
  const [isPaused, setIsPaused] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
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
  
  // Initialize sound service on mount
  useEffect(() => {
    soundService.unlock();
    soundService.setEnabled(settings.soundEffects);
    if (settings.soundEffects) {
      soundService.play('gameStart');
    }
  }, [settings.soundEffects]);
  
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
    soundService.setEnabled(settings.soundEffects);
  }, [settings.soundEffects]);
  
  // Keyboard shortcuts for pause
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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
    // Settings are automatically reloaded from localStorage by useQuizSettings
  };
  const handleExitFromPause = () => {
    setIsPaused(false);
    handleExitQuiz();
  };
  
  // Play sound on answer selection
  const handleAnswerChange = (questionId: string, answer: AnswerValue) => {
    updateAnswer(questionId, answer);
    if (settings.soundEffects) {
      soundService.play('click');
    }
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz chưa sẵn sàng</h2>
          <p className="text-gray-600 mb-6">
            Quiz này đang chờ phê duyệt hoặc chưa có câu hỏi. Vui lòng quay lại sau!
          </p>
          <button
            onClick={() => navigate('/creator/my-quizzes')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quay lại danh sách
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
          <p className="mt-4 text-gray-600">Đang xử lý kết quả...</p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            
            {/* Left: Exit & Title */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <button
                onClick={handleExitQuiz}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-all group"
                title="Thoát bài thi"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
                <span className="font-semibold hidden sm:inline">Thoát</span>
              </button>
              
              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
              
              <h1 className="text-lg font-bold text-slate-800 truncate" title={shuffledQuiz.title}>
                {shuffledQuiz.title}
              </h1>
            </div>
            
            {/* Right: Stats & Controls */}
            <div className="flex items-center gap-3 sm:gap-6">
              {/* Timer Widget */}
              <div className={`flex items-center gap-3 px-4 py-2 rounded-full border ${
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

              {/* Pause Button */}
              <button
                onClick={handlePause}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Tạm dừng (P)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sidebar: Quick Nav (Sticky) */}
          <div className="lg:col-span-3 lg:sticky lg:top-24 order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700">Câu hỏi</h3>
                <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                  {session.currentQuestionIndex + 1}/{shuffledQuiz.questions.length}
                </span>
              </div>
              <QuickNavigation
                questions={shuffledQuiz.questions}
                currentQuestionIndex={session.currentQuestionIndex}
                answers={session.answers}
                onQuestionSelect={goToQuestion}
              />
              
              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span>Hiện tại</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Đã làm</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                  <span>Chưa làm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Quiz Content */}
          <div className="lg:col-span-9 order-1 lg:order-2">
            <div className="bg-white rounded-3xl shadow-xl border-0 p-8 md:p-10 relative overflow-hidden">
              {/* Decorative top accent */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
              
              <div className="relative z-10">
                <QuestionRenderer
                  question={currentQuestion}
                  questionNumber={session.currentQuestionIndex + 1}
                  value={session.answers[currentQuestion.id]}
                  onChange={(answer: AnswerValue) => handleAnswerChange(currentQuestion.id, answer)}
                />
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-10 pt-8 border-t border-gray-100">
                <button
                  onClick={goToPreviousQuestion}
                  disabled={isFirstQuestion}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all duration-200 ${
                    isFirstQuestion
                      ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400 hover:text-blue-600 hover:shadow-md'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Câu trước</span>
                </button>

                <div className="flex space-x-3">
                  {isLastQuestion ? (
                    <button
                      onClick={handleSubmitQuiz}
                      className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Nộp bài</span>
                    </button>
                  ) : (
                    <button
                      onClick={goToNextQuestion}
                      className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <span>Câu tiếp</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
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

      {/* Time Warning Alert */}
      {isTimeRunningOut && !isPaused && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-lg border ${
            isTimeCritical 
              ? 'bg-red-600 text-white border-red-700' 
              : 'bg-yellow-500 text-white border-yellow-600'
          }`}>
            <span className="text-2xl">⏰</span>
            <span className="font-bold">
              {isTimeCritical 
                ? "Sắp hết giờ! Nộp bài ngay!" 
                : "Chú ý: Thời gian sắp hết"}
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
      />
    </div>
  );
};

export default QuizPage;
