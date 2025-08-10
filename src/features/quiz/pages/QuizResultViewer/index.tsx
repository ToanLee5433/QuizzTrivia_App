import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuizResultById } from '../../api/base';
import { getQuizById } from '../../services/quiz';
import { QuizResult, Quiz } from '../../types';
import { toast } from 'react-toastify';
import QuizReviewSystem from '../../../../shared/components/QuizReviewSystem';
import {
  Confetti,
  LoadingSpinner,
  ResultSummary,
  StatsGrid,
  PerformanceAnalysis,
  AnswerReview,
  ActionButtons
} from '../ResultPage/components';
import { useLeaderboard } from '../ResultPage/hooks';
import { Leaderboard } from '../ResultPage/components';

interface QuizResultViewerProps {}

export const QuizResultViewer: React.FC<QuizResultViewerProps> = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  
  const [result, setResult] = useState<QuizResult | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!resultId) {
        console.error('❌ No resultId provided');
        navigate('/profile');
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 Loading quiz result:', resultId);

        // Fetch quiz result
        const resultData = await getQuizResultById(resultId);
        if (!resultData) {
          console.error('❌ Quiz result not found:', resultId);
          toast.error('Không tìm thấy kết quả quiz!');
          navigate('/profile');
          return;
        }

        console.log('✅ Loaded quiz result:', resultData);
        setResult(resultData as QuizResult);

        // Fetch quiz details
        if (resultData.quizId) {
          console.log('🔍 Loading quiz details:', resultData.quizId);
          const quizData = await getQuizById(resultData.quizId);
          if (quizData) {
            console.log('✅ Loaded quiz details:', quizData.title);
            setQuiz(quizData);
          }
        }
      } catch (error) {
        console.error('❌ Error loading data:', error);
        toast.error('Không thể tải kết quả quiz!');
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [resultId, navigate]);

  // Calculate percentage with unified logic (same as before)
  const getPercentage = () => {
    if (!result) return 0;
    
    // Primary: Use correctAnswers/totalQuestions if available
    if (typeof result.correctAnswers === 'number' && typeof result.totalQuestions === 'number' && result.totalQuestions > 0) {
      return Math.round((result.correctAnswers / result.totalQuestions) * 100);
    } 
    // Fallback: Use score field
    else if (typeof result.score === 'number' && !isNaN(result.score)) {
      return result.score <= 1 ? Math.round(result.score * 100) : Math.round(result.score);
    }
    return 0;
  };

  const percentage = getPercentage();
  const correct = result?.correctAnswers || 0;
  const total = result?.totalQuestions || 0;

  // Transform result to match ResultPage format
  const transformedResult = result ? {
    score: percentage, // Use calculated percentage as score
    correct: correct,
    total: total,
    timeSpent: result.timeSpent,
    answers: result.answers?.reduce((acc, answer) => {
      acc[answer.questionId] = answer.selectedAnswerId || '';
      return acc;
    }, {} as Record<string, string>) || {},
    completedAt: result.completedAt,
    isTimeUp: false, // Can add this field if needed
    quizId: result.quizId
  } : null;

  // Pass current result to leaderboard
  const currentResult = transformedResult ? {
    score: { percentage },
    correct,
    total,
    timeSpent: transformedResult.timeSpent
  } : undefined;
  
  const { leaderboard, userRank, loadingStats } = useLeaderboard(quiz?.id || null, currentResult);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!result || !quiz || !transformedResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy kết quả</h2>
          <button
            onClick={() => navigate('/profile')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại Profile
          </button>
        </div>
      </div>
    );
  }

  const isExcellent = percentage >= 80;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      {isExcellent && <Confetti />}
      
      <div className="max-w-4xl mx-auto px-4">
        {/* Kết quả tổng quan */}
        <ResultSummary 
          result={transformedResult} 
          percentage={percentage} 
          correct={correct} 
          total={total} 
        />

        {/* Stats Grid */}
        <StatsGrid 
          correct={correct} 
          total={total} 
          percentage={percentage} 
        />

        {/* Performance Analysis */}
        <PerformanceAnalysis 
          quiz={quiz} 
          result={transformedResult} 
          percentage={percentage} 
        />

        {/* Review Answers Section */}
        <AnswerReview 
          quiz={quiz} 
          result={transformedResult} 
        />

        {/* Leaderboard */}
        <Leaderboard 
          leaderboard={leaderboard} 
          userRank={userRank} 
          loadingStats={loadingStats} 
        />

        {/* Quiz Review System */}
        <QuizReviewSystem 
          quizId={quiz.id}
          quizTitle={quiz.title}
          showSubmitForm={true}
        />

        {/* Action Buttons */}
        <ActionButtons 
          quiz={quiz} 
          percentage={percentage} 
        />
      </div>
    </div>
  );
};

export default QuizResultViewer;
