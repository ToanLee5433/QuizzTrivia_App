import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResultData, useLeaderboard } from './hooks';
import { safeNumber } from './utils';
import { useNotifications } from '../../../../hooks/useNotifications';
import QuizReviewSystem from '../../../../shared/components/QuizReviewSystem';
import {
  Confetti,
  LoadingSpinner,
  ResultSummary,
  StatsGrid,
  PerformanceAnalysis,
  AnswerReview,
  Leaderboard,
  ActionButtons,
  AIAnalysis,
  SimilarQuizzes
} from './components';
import { quizAnalysisService, type QuizAnalysis } from '../../../../services/quizAnalysisService';
import { similarQuizService } from '../../../../services/similarQuizService';
import type { QuizRecommendation } from '../../../../lib/genkit/types';
import type { QuizResult } from '../../types';

export const ResultPage: React.FC = () => {
  const { result, quiz, quizId, isLoading } = useResultData();
  const { notifyAchievement, checkAchievements, notifyQuizCreator } = useNotifications();
  const { t } = useTranslation();
  
  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<QuizAnalysis | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  
  // Similar quizzes state
  const [similarQuizzes, setSimilarQuizzes] = useState<QuizRecommendation[]>([]);
  const [similarQuizzesLoading, setSimilarQuizzesLoading] = useState(true);
  
  // Tính toán điểm số, kiểm tra hợp lệ
  const correct = safeNumber(result?.correct);
  const total = safeNumber(result?.total);
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  // Pass current result to leaderboard
  const currentResult = result ? {
    score: { percentage },
    correct,
    total,
    timeSpent: result.timeSpent
  } : undefined;
  
  const { leaderboard, userRank, loadingStats } = useLeaderboard(quizId, currentResult);

  // Function to generate AI analysis on demand
  const handleAnalyzeWithAI = async () => {
    if (!result || !quiz) return;
    
    try {
      setAiAnalysisLoading(true);
      // Convert ResultState to QuizResult
      const quizResult: QuizResult = {
        id: result.quizId || quiz.id,
        quizId: result.quizId || quiz.id,
        userId: 'user', // Will be available in actual result
        score: result.score,
        totalQuestions: result.total,
        correctAnswers: result.correct,
        timeSpent: result.timeSpent || 0,
        answers: [],
        completedAt: new Date()
      };
      const analysis = await quizAnalysisService.analyzeResult(quiz, quizResult, percentage);
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Failed to generate AI analysis:', error);
    } finally {
      setAiAnalysisLoading(false);
    }
  };
  
  // Find similar quizzes when quiz data is available
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
        
        // If not enough similar quizzes, get popular ones
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

  // Generate notifications based on quiz completion
  useEffect(() => {
    if (!result || !quiz) return;

    const generateNotifications = async () => {
      // Achievement notifications based on score
      if (percentage === 100) {
        await notifyAchievement(
          t('result.perfect_score', 'Perfect Score!'),
          `${t('result.you_got_100', 'You got 100% on')} "${quiz.title}"`,
          '💯'
        );
      } else if (percentage >= 90) {
        await notifyAchievement(
          t('result.excellent_performance', 'Excellent Performance!'),
          `${t('result.you_scored', 'You scored')} ${percentage}% ${t('result.on', 'on')} "${quiz.title}"`,
          '⭐'
        );
      } else if (percentage >= 80) {
        await notifyAchievement(
          t('result.great_job', 'Great Job!'),
          `${t('result.you_scored', 'You scored')} ${percentage}% ${t('result.on', 'on')} "${quiz.title}"`,
          '🎯'
        );
      }

      // First quiz completion
      if (correct === total && total > 0) {
        await notifyAchievement(
          t('result.first_perfect_score', 'First Perfect Score!'),
          t('result.aced_first_quiz', 'You aced your first quiz!'),
          '🏆'
        );
      }

      // Notify quiz creator (if not the same user)
      if (quiz.createdBy && result && 'userId' in result && quiz.createdBy !== result.userId) {
        await notifyQuizCreator(
          quiz.createdBy,
          quiz.id,
          quiz.title
        );
      }

      // Check for other achievements
      await checkAchievements({
        quizzesCompleted: 1, // Increment from user stats
        perfectScores: percentage === 100 ? 1 : 0
      });
    };

    generateNotifications().catch(console.error);
  }, [result, quiz, percentage, correct, total, notifyAchievement, checkAchievements, notifyQuizCreator]);

  // Debug logging
  console.log('🎯 ResultPage render:', {
    quizId,
    isLoading,
    hasResult: !!result,
    hasQuiz: !!quiz,
    leaderboardLength: leaderboard.length,
    loadingStats,
    userRank
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const isExcellent = percentage >= 80;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      {isExcellent && <Confetti />}
      
      <div className="max-w-4xl mx-auto px-4">
        {/* Kết quả tổng quan */}
        <ResultSummary 
          result={result!} 
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
          quiz={quiz!} 
          result={result!} 
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
          quiz={quiz!} 
          result={result!} 
        />

        {/* Leaderboard */}
        <Leaderboard 
          leaderboard={leaderboard} 
          userRank={userRank} 
          loadingStats={loadingStats} 
        />

        {/* Quiz Review System */}
        <QuizReviewSystem 
          quizId={quiz!.id}
          quizTitle={quiz!.title}
          showSubmitForm={true}
        />

        {/* Action Buttons */}
        <ActionButtons 
          quiz={quiz!} 
          percentage={percentage} 
        />
      </div>
    </div>
  );
};
