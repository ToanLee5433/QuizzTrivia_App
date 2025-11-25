import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Quiz } from '../../features/quiz/types';
import { Clock, Users, Target, TrendingUp } from 'lucide-react';
import SafeHTML from './ui/SafeHTML';

interface PopularQuiz extends Quiz {
  attempts: number;
  averageScore: number;
  totalPlayers: number;
}

interface PopularQuizzesRankingProps {
  timeFilter?: 'week' | 'month' | 'all';
}

const PopularQuizzesRanking: React.FC<PopularQuizzesRankingProps> = ({ timeFilter = 'week' }) => {
  const { t } = useTranslation();
  const [popularQuizzes, setPopularQuizzes] = useState<PopularQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPopularQuizzes = async () => {
      try {
        setLoading(true);
        
        // TODO: Load real popular quizzes based on attempts/ratings
        // For now, show empty state
        setPopularQuizzes([]);
      } catch (error) {
        console.error('Error loading popular quizzes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPopularQuizzes();
  }, [timeFilter]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDifficulty = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Dễ';
      case 'medium': return 'Trung bình';
      case 'hard': return 'Khó';
      default: return difficulty;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('quiz.popularQuizzesRanking.title')}</h3>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('quiz.popularQuizzesRanking.title')}</h3>
        <span className="text-sm text-gray-500 capitalize">
          {timeFilter === 'week' ? 'Tuần này' : timeFilter === 'month' ? 'Tháng này' : 'Tất cả'}
        </span>
      </div>

      {popularQuizzes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>{t('quiz.popularQuizzesRanking.noData')}</p>
          <p className="text-sm">{t('quiz.popularQuizzesRanking.noDataDesc')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {popularQuizzes.map((quiz, index) => (
            <div key={quiz.id} className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                index === 0 ? 'bg-yellow-100 text-yellow-800' :
                index === 1 ? 'bg-gray-100 text-gray-800' :
                index === 2 ? 'bg-orange-100 text-orange-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {index + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate">{quiz.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                    {formatDifficulty(quiz.difficulty)}
                  </span>
                </div>
                <SafeHTML content={quiz.description} className="text-sm text-gray-600 truncate" plainText />
                
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{t('quiz.popularQuizzesRanking.players', { count: quiz.totalPlayers })}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>{t('quiz.popularQuizzesRanking.attempts', { count: quiz.stats?.attempts ?? quiz.attempts ?? 0 })}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target className="w-3 h-3" />
                    <span>{t('quiz.popularQuizzesRanking.averageScore', { score: (quiz.stats?.averageScore ?? quiz.averageScore ?? 0).toFixed(1) })}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{t('quiz.popularQuizzesRanking.duration', { minutes: quiz.duration })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PopularQuizzesRanking;
