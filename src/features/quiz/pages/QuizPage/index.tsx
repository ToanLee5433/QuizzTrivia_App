import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../../lib/store';
import { useQuizData, useQuizSession, useQuizTimer, useQuizNavigation, useQuizSettings } from './hooks';
import Timer from './components/Timer';
import ProgressIndicator from './components/ProgressIndicator';
import QuestionRenderer from './components/QuestionRenderer';
import QuickNavigation from './components/QuickNavigation';
import ConfirmationModals from './components/ConfirmationModals';
import LearningResourcesView from './components/LearningResourcesView';
import QuizSettingsIndicator from './components/QuizSettingsIndicator';
import QuizPasswordModal from '../../../../shared/components/ui/QuizPasswordModal';
import { unlockQuiz } from '../../../../lib/services/quizAccessService';
import { toast } from 'react-toastify';
import { Quiz } from '../../types';

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
  const { t } = useTranslation();
  
  // Apply quiz settings (shuffle, time limits, etc.)
  const {
    settings,
    processedQuestions,
    totalDuration,
    shouldAutoSubmit,
    hasTimeLimit
  } = useQuizSettings(quiz);

  // Create quiz with processed questions
  const quizWithSettings = {
    ...quiz,
    questions: processedQuestions
  };

  const {
    session,
    updateAnswer,
    setCurrentQuestion,
    completeQuiz,
    getUnansweredQuestions,
    progress
  } = useQuizSession({ quiz: quizWithSettings });

  const {
    formattedTime,
    isTimeRunningOut,
    isTimeCritical,
    percentage
  } = useQuizTimer({
    onTimeUp: () => {
      if (shouldAutoSubmit) {
        toast.warning('⏰ Hết giờ! Tự động nộp bài...');
        completeQuiz();
      } else {
        toast.warning('⏰ Hết giờ! Nhưng bạn vẫn có thể tiếp tục làm bài.');
      }
    },
    isActive: !session.isCompleted,
    customDuration: hasTimeLimit ? totalDuration : 0
  });

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
    questions: quizWithSettings.questions,
    currentQuestionIndex: session.currentQuestionIndex,
    onQuestionChange: setCurrentQuestion,
    answers: session.answers
  });

  const currentQuestion = quizWithSettings.questions[session.currentQuestionIndex];

  // Safety check: If no questions loaded, show error
  if (!currentQuestion || !quizWithSettings.questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('quiz.errors.noQuestions')}</h2>
          <p className="text-gray-600 mb-6">
            {t('quiz.errors.noQuestionsDescription')}
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('common.goBack')}
          </button>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      {/* Header với Timer và Progress */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExitQuiz}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>{t('quiz.actions.exit')}</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-800">{quiz.title}</h1>
            </div>
            
            <div className="flex items-center space-x-3">

              <ProgressIndicator
                current={session.currentQuestionIndex + 1}
                total={quizWithSettings.questions.length}
                percentage={progress}
              />
              {hasTimeLimit && (
                <Timer
                  timeLeft={formattedTime}
                  isWarning={isTimeRunningOut}
                  isCritical={isTimeCritical}
                  percentage={percentage}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Panel */}
          <div className="lg:col-span-1">
            <QuickNavigation
              questions={quizWithSettings.questions}
              currentQuestionIndex={session.currentQuestionIndex}
              answers={session.answers}
              onQuestionSelect={goToQuestion}
            />
          </div>

          {/* Main Quiz Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <QuestionRenderer
                question={currentQuestion}
                questionNumber={session.currentQuestionIndex + 1}
                value={session.answers[currentQuestion.id]}
                onChange={(answer) => {
                  updateAnswer(currentQuestion.id, answer);
                }}
              />

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <button
                  onClick={goToPreviousQuestion}
                  disabled={isFirstQuestion}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    isFirstQuestion
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-600 text-white hover:bg-gray-700 shadow-sm hover:shadow-md'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>{t('quiz.actions.previous')}</span>
                </button>

                <div className="flex space-x-3">
                  {isLastQuestion ? (
                    <button
                      onClick={handleSubmitQuiz}
                      className="flex items-center space-x-2 px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-sm hover:shadow-md transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{t('quiz.actions.submit')}</span>
                    </button>
                  ) : (
                    <button
                      onClick={goToNextQuestion}
                      className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm hover:shadow-md transition-all"
                    >
                      <span>{t('quiz.actions.next')}</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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

      {/* Settings Indicator */}
      <QuizSettingsIndicator 
        settings={settings} 
        questionsCount={quizWithSettings.questions.length}
      />

      {/* Thêm cảnh báo hết giờ nếu cần thiết - hiện khi còn <= 10% tổng thời gian */}
      {hasTimeLimit && isTimeRunningOut && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div className={`p-4 rounded-lg shadow-xl border-2 ${
            isTimeCritical 
              ? 'bg-red-100 border-red-500 text-red-900' 
              : 'bg-amber-100 border-amber-500 text-amber-900'
          } flex items-center gap-3 animate-pulse`}>
            <span className="text-2xl">⏰</span>
            <div>
              <p className="font-bold">
                {isTimeCritical 
                  ? "Chỉ còn ít hơn 1 phút!" 
                  : "Sắp hết giờ!"}
              </p>
              <p className="text-sm">
                {isTimeCritical
                  ? "Hãy hoàn thành ngay."
                  : `Còn ${formattedTime} - Chỉ còn 10% thời gian.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizPage;
