import React from 'react';
import { useResultData, useLeaderboard } from './hooks';
import { safeNumber } from './utils';
import QuizReviewSystem from '../../../../shared/components/QuizReviewSystem';
import {
  Confetti,
  LoadingSpinner,
  ResultSummary,
  StatsGrid,
  PerformanceAnalysis,
  AnswerReview,
  Leaderboard,
  ActionButtons
} from './components';

export const ResultPage: React.FC = () => {
  const { result, quiz, quizId, isLoading } = useResultData();
  
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
