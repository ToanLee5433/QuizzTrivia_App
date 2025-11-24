import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getQuizResultById } from '../../api/base';
import { getQuizById } from '../../services/quiz';
import { QuizResult, Quiz } from '../../types';
import { toast } from 'react-toastify';
import QuizReviewSystem from '../../../../shared/components/QuizReviewSystem';
import { db } from '../../../flashcard/services/database';
import {
  Confetti,
  LoadingSpinner,
  ResultSummary,
  StatsGrid,
  PerformanceAnalysis,
  AnswerReview,
  ActionButtons,
  AIAnalysis,
  SimilarQuizzes
} from '../ResultPage/components';
import { useLeaderboard } from '../ResultPage/hooks';
import { Leaderboard } from '../ResultPage/components';
import { quizAnalysisService, type QuizAnalysis } from '../../../../services/quizAnalysisService';
import { similarQuizService } from '../../../../services/similarQuizService';
import type { QuizRecommendation } from '../../../../lib/genkit/types';

interface QuizResultViewerProps {}

export const QuizResultViewer: React.FC<QuizResultViewerProps> = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [result, setResult] = useState<QuizResult | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  
  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<QuizAnalysis | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  
  // Similar quizzes state
  const [similarQuizzes, setSimilarQuizzes] = useState<QuizRecommendation[]>([]);
  const [similarQuizzesLoading, setSimilarQuizzesLoading] = useState(true);

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

        let resultData: any = null;

        // 🔥 Check if this is an offline result (starts with "local_")
        if (resultId.startsWith('local_')) {
          console.log('📦 Loading offline result from IndexedDB...');
          try {
            resultData = await db.results.get(resultId);
            
            if (resultData) {
              console.log('✅ Loaded offline result from IndexedDB:', resultData);
              // Transform IndexedDB format to QuizResult format
              resultData = {
                id: resultData.id,
                quizId: resultData.quizId,
                userId: resultData.userId,
                score: resultData.score,
                correctAnswers: resultData.correctAnswers,
                totalQuestions: resultData.totalQuestions,
                answers: resultData.answers,
                completedAt: new Date(resultData.completedAt).toISOString(),
                timeSpent: resultData.timeSpent,
                // Additional fields from IndexedDB
                quizTitle: resultData.quizTitle
              };
            }
          } catch (indexedDBError) {
            console.error('❌ Failed to load from IndexedDB:', indexedDBError);
          }
        }

        // If not found in IndexedDB, try Firebase
        if (!resultData) {
          console.log('☁️ Loading result from Firebase...');
          resultData = await getQuizResultById(resultId);
        }

        if (!resultData) {
          console.error('❌ Quiz result not found:', resultId);
          toast.error(t('result.quiz_not_found', 'Không tìm thấy kết quả quiz!'));
          navigate('/profile');
          return;
        }

        console.log('✅ Loaded quiz result:', resultData);
        setResult(resultData as QuizResult);

        // Fetch quiz details
        if (resultData.quizId) {
          console.log('🔍 Loading quiz details:', resultData.quizId);
          
          try {
            const quizData = await getQuizById(resultData.quizId);
            if (quizData) {
              console.log('✅ Loaded quiz details:', quizData.title);
              setQuiz(quizData);
            }
          } catch (quizError) {
            console.warn('⚠️ Could not load quiz details (offline?):', quizError);
            // If offline, try to create a minimal quiz object from cached data
            if (!navigator.onLine && resultData.quizTitle) {
              setQuiz({
                id: resultData.quizId,
                title: resultData.quizTitle,
                description: '',
                category: '',
                difficulty: 'medium',
                duration: 0,
                questions: [],
                createdBy: '',
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'approved',
                visibility: 'public',
                isPublished: true,
                tags: []
              } as Quiz);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading data:', error);
        toast.error(t('result.cannot_load', 'Không thể tải kết quả quiz!'));
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [resultId, navigate, t]);

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

  // Function to generate AI analysis on demand
  const handleAnalyzeWithAI = async () => {
    if (!result || !quiz) return;
    
    try {
      setAiAnalysisLoading(true);
      const analysis = await quizAnalysisService.analyzeResult(quiz, result, percentage);
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Failed to generate AI analysis:', error);
      toast.error(t('result.ai_analysis_failed', 'Failed to generate AI analysis'));
    } finally {
      setAiAnalysisLoading(false);
    }
  };
  
  // Find similar quizzes when quiz is available
  useEffect(() => {
    if (!quiz) return;
    
    const findSimilar = async () => {
      try {
        setSimilarQuizzesLoading(true);
        const similar = await similarQuizService.findSimilarQuizzes(
          quiz.id,
          quiz.category || 'general',
          quiz.difficulty,
          5
        );
        
        if (similar.length < 3) {
          const popular = await similarQuizService.getPopularQuizzes(quiz.id, 5 - similar.length);
          setSimilarQuizzes([...similar, ...popular]);
        } else {
          setSimilarQuizzes(similar);
        }
      } catch (error) {
        console.error('Failed to find similar quizzes:', error);
      } finally {
        setSimilarQuizzesLoading(false);
      }
    };
    
    findSimilar();
  }, [quiz]);

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

        {/* AI Analysis - On Demand */}
        {!aiAnalysis && !aiAnalysisLoading && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl shadow-lg p-8 mb-8 border-2 border-purple-200 dark:border-purple-800">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('result.ai_analysis_title', 'AI Performance Analysis')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('result.ai_analysis_description', 'Get personalized insights and study recommendations powered by AI')}
              </p>
              <button
                onClick={handleAnalyzeWithAI}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                ✨ {t('result.analyze_with_ai', 'Analyze with AI')}
              </button>
            </div>
          </div>
        )}
        
        {(aiAnalysis || aiAnalysisLoading) && (
          <AIAnalysis 
            analysis={aiAnalysis} 
            isLoading={aiAnalysisLoading} 
          />
        )}

        {/* Similar Quizzes Recommendations */}
        <SimilarQuizzes 
          quizzes={similarQuizzes} 
          isLoading={similarQuizzesLoading} 
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
