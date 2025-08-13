import React from 'react';
import { useQuizData, useQuizSession, useQuizTimer, useQuizNavigation } from './hooks';
import Timer from './components/Timer';
import ProgressIndicator from './components/ProgressIndicator';
import QuestionRenderer from './components/QuestionRenderer';
import QuickNavigation from './components/QuickNavigation';
import ConfirmationModals from './components/ConfirmationModals';
import { useNavigate } from 'react-router-dom';

const QuizPage: React.FC = () => {
  const { quiz, loading, error } = useQuizData();

  // Remove the useEffect that was manually updating timer
  // Timer is now handled by useQuizTimer hook properly

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

  return <QuizPageContent quiz={quiz} />;
};

interface QuizPageContentProps {
  quiz: any;
}

const QuizPageContent: React.FC<QuizPageContentProps> = ({ quiz }) => {
  // const navigate = useNavigate();
  const {
    session,
    updateAnswer,
    setCurrentQuestion,
    completeQuiz,
    getUnansweredQuestions,
    progress
  } = useQuizSession({ quiz });

  const {
    formattedTime,
    isTimeRunningOut,
    isTimeCritical,
    percentage
  } = useQuizTimer({
    onTimeUp: completeQuiz,
    isActive: !session.isCompleted
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
    questions: quiz.questions,
    currentQuestionIndex: session.currentQuestionIndex,
    onQuestionChange: setCurrentQuestion,
    answers: session.answers
  });

  const currentQuestion = quiz.questions[session.currentQuestionIndex];

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
                <span>Thoát</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-800">{quiz.title}</h1>
            </div>
            
            <div className="flex items-center space-x-3">

              <ProgressIndicator
                current={session.currentQuestionIndex + 1}
                total={quiz.questions.length}
                percentage={progress}
              />
              <Timer
                timeLeft={formattedTime}
                isWarning={isTimeRunningOut}
                isCritical={isTimeCritical}
                percentage={percentage}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Panel */}
          <div className="lg:col-span-1">
            <QuickNavigation
              questions={quiz.questions}
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
                onChange={(answer: any) => updateAnswer(currentQuestion.id, answer)}
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
                  <span>Câu trước</span>
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
                      <span>Nộp bài</span>
                    </button>
                  ) : (
                    <button
                      onClick={goToNextQuestion}
                      className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm hover:shadow-md transition-all"
                    >
                      <span>Câu tiếp</span>
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

      {/* Thêm cảnh báo hết giờ nếu cần thiết - hiện khi còn <= 10% tổng thời gian */}
      {isTimeRunningOut && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-600 rounded-lg flex items-center gap-2">
          <span className="text-xl">⏰</span>
          <span className="font-medium">
            {isTimeCritical 
              ? "Chỉ còn ít hơn 1 phút! Hãy hoàn thành ngay." 
              : "Sắp hết giờ! Chỉ còn 10% thời gian."}
          </span>
        </div>
      )}
    </div>
  );
};

export default QuizPage;
