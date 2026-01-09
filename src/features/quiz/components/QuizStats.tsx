import React, { useEffect, useState } from 'react';
import { Quiz } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';

interface RealStats {
  totalCompletions: number;
  totalPlayers: number;
  averageScore: number;
}

interface QuizStatsProps {
  quizzes: Quiz[];
}

const QuizStats: React.FC<QuizStatsProps> = ({ quizzes }) => {
  const [realStats, setRealStats] = useState<RealStats>({
    totalCompletions: 0,
    totalPlayers: 0,
    averageScore: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch real stats from Firebase
  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        setLoading(true);
        
        // Get quiz results to calculate real stats
        const resultsRef = collection(db, 'quizResults');
        const resultsSnapshot = await getDocs(resultsRef);
        
        let totalCompletions = 0;
        let totalScore = 0;
        const uniqueUsers = new Set<string>();
        
        resultsSnapshot.forEach(doc => {
          const data = doc.data();
          totalCompletions++;
          totalScore += data.percentage || data.score || 0;
          if (data.userId) uniqueUsers.add(data.userId);
        });
        
        setRealStats({
          totalCompletions,
          totalPlayers: uniqueUsers.size,
          averageScore: totalCompletions > 0 ? Math.round(totalScore / totalCompletions) : 0
        });
      } catch (error) {
        console.error('Error fetching real stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRealStats();
  }, []);

  // Calculate statistics from quizzes array
  const totalQuizzes = quizzes.length;
  // const completedQuizzes = quizzes.filter(q => q.isCompleted).length;
  
  // Use questionCount if available, fallback to questions array
  const totalQuestions = quizzes.reduce((sum, q) => {
    return sum + (q.questionCount || (q.questions?.length || 0));
  }, 0);
  const averageQuestions = totalQuizzes > 0 ? Math.round(totalQuestions / totalQuizzes) : 0;
  
  const difficultyCount = {
    easy: quizzes.filter(q => q.difficulty === 'easy').length,
    medium: quizzes.filter(q => q.difficulty === 'medium').length,
    hard: quizzes.filter(q => q.difficulty === 'hard').length
  };

  const categoryCount = quizzes.reduce((acc, quiz) => {
    if (quiz.category) {
      acc[quiz.category] = (acc[quiz.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // const progressPercentage = totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Quizzes */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Tổng số Quiz</p>
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

      {/* Unique Players - Real data from Firebase */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm font-medium">Người chơi</p>
            <p className="text-3xl font-bold">
              {loading ? '...' : realStats.totalPlayers.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-white/20 rounded-lg">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-green-100 text-sm mb-1">
            <span>Người chơi duy nhất</span>
          </div>
        </div>
      </div>

      {/* Total Players - Uses real Firebase data */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium">Lượt chơi</p>
            <p className="text-3xl font-bold">
              {loading ? '...' : realStats.totalCompletions.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-white/20 rounded-lg">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-purple-100 text-sm">
          <span>
            {totalQuizzes > 0 && !loading ? Math.round(realStats.totalCompletions / totalQuizzes) : 0} lượt/quiz
          </span>
        </div>
      </div>

      {/* Average Score - Uses real Firebase data */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm font-medium">Điểm trung bình</p>
            <p className="text-3xl font-bold">
              {loading ? '...' : `${realStats.averageScore}%`}
            </p>
          </div>
          <div className="p-3 bg-white/20 rounded-lg">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-orange-100 text-sm">
          <span>{realStats.averageScore >= 70 ? 'Chất lượng tốt' : 'Đang tiến bộ'}</span>
        </div>
      </div>

      {/* Difficulty Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 md:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Phân bố độ khó</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Dễ</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium dark:text-white">{difficultyCount.easy}</span>
              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
              <span className="text-sm text-gray-600 dark:text-gray-400">Trung bình</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium dark:text-white">{difficultyCount.medium}</span>
              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
              <span className="text-sm text-gray-600 dark:text-gray-400">Khó</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium dark:text-white">{difficultyCount.hard}</span>
              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 md:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Danh mục phổ biến</h3>
        <div className="space-y-3">
          {topCategories.map(([category, count], index) => (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                  {index + 1}
                </div>
                <span className="text-sm text-gray-900 dark:text-white font-medium">{category}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">{count} quiz</span>
                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${totalQuizzes > 0 ? (count / totalQuizzes) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {topCategories.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              Chưa có dữ liệu danh mục
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizStats;
