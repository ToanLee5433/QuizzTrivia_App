import React from 'react';
import { Quiz } from '../types';

import { useTranslation } from 'react-i18next';
interface QuizStatsProps {
  quizzes: Quiz[];
}

const QuizStats: React.FC<QuizStatsProps> = ({ quizzes }) => {
  const { t } = useTranslation();

  // Calculate statistics
  const totalQuizzes = quizzes.length;
  const completedQuizzes = quizzes.filter(q => q.isCompleted).length;
  const totalQuestions = quizzes.reduce((sum, q) => sum + q.questions.length, 0);
  const averageQuestions = totalQuizzes > 0 ? Math.round(totalQuestions / totalQuizzes) : 0;
  
  const difficultyCount = {
    easy: quizzes.filter(q => q.difficulty === 'easy').length,
    medium: quizzes.filter(q => q.difficulty === 'medium').length,
    hard: quizzes.filter(q => q.difficulty === 'hard').length
  };

  const categoryCount = quizzes.reduce((acc, quiz) => {
    acc[quiz.category] = (acc[quiz.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const totalPlayers = quizzes.reduce((sum, q) => sum + (q.totalPlayers || 0), 0);
  const averageScore = quizzes.filter(q => q.averageScore).reduce((sum, q) => sum + (q.averageScore || 0), 0) / quizzes.filter(q => q.averageScore).length || 0;

  const progressPercentage = totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Quizzes */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">{t("admin.quizManagement.cards.totalQuizzes")}</p>
            <p className="text-3xl font-bold">{totalQuizzes}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-lg">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-blue-100 text-sm">
          <span>{averageQuestions} câu hỏi trung bình</span>
        </div>
      </div>

      {/* Completed Progress */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm font-medium">{t("admin.quickActions.stats.completions")}</p>
            <p className="text-3xl font-bold">{completedQuizzes}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-lg">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-green-100 text-sm mb-1">
            <span>Tiến độ</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Total Players */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium">{t("leaderboard.plays")}</p>
            <p className="text-3xl font-bold">{totalPlayers.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-lg">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-purple-100 text-sm">
          <span>
            {totalQuizzes > 0 ? Math.round(totalPlayers / totalQuizzes) : 0} trung bình/quiz
          </span>
        </div>
      </div>

      {/* Average Score */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm font-medium">{t("leaderboard.avgScore")}</p>
            <p className="text-3xl font-bold">{Math.round(averageScore)}%</p>
          </div>
          <div className="p-3 bg-white/20 rounded-lg">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-orange-100 text-sm">
          <span>Chất lượng tốt</span>
        </div>
      </div>

      {/* Difficulty Distribution */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 md:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố độ khó</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">{t("difficulty.easy")}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{difficultyCount.easy}</span>
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${totalQuizzes > 0 ? (difficultyCount.easy / totalQuizzes) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-600">{t("difficulty.medium")}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{difficultyCount.medium}</span>
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${totalQuizzes > 0 ? (difficultyCount.medium / totalQuizzes) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600">{t("difficulty.hard")}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{difficultyCount.hard}</span>
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${totalQuizzes > 0 ? (difficultyCount.hard / totalQuizzes) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 md:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Danh mục phổ biến</h3>
        <div className="space-y-3">
          {topCategories.map(([category, count], index) => (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                  {index + 1}
                </div>
                <span className="text-sm text-gray-900 font-medium">{category}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{count} quiz</span>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${totalQuizzes > 0 ? (count / totalQuizzes) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {topCategories.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              Chưa có dữ liệu danh mục
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizStats;
