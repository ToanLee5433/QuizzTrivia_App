import React, { useState, useEffect } from 'react';
import { Quiz } from '../../features/quiz/types';
import { Link } from 'react-router-dom';

interface PopularQuiz extends Quiz {
  attempts: number;
  averageScore: number;
  totalPlayers: number;
}

const PopularQuizzesRanking: React.FC = () => {
  const [popularQuizzes, setPopularQuizzes] = useState<PopularQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    const loadPopularQuizzes = async () => {
      try {
        setLoading(true);
        
        // In a real app, you'd query based on actual attempts data
        // For demo, we'll use mock data with realistic stats
        const mockPopularQuizzes: PopularQuiz[] = [
          {
            id: '1',
            title: 'JavaScript Fundamentals',
            description: 'Kiến thức cơ bản về JavaScript',
            category: 'Programming',
            difficulty: 'easy' as const,
            questions: [],
            duration: 15,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            isPublished: true,
            tags: ['javascript', 'basic'],
            attempts: 1250,
            averageScore: 78.5,
            totalPlayers: 890,
            status: 'approved'
          },
          {
            id: '2',
            title: 'React Hooks Deep Dive',
            description: 'Tìm hiểu sâu về React Hooks',
            category: 'Programming',
            difficulty: 'medium' as const,
            questions: [],
            duration: 20,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            isPublished: true,
            tags: ['react', 'hooks'],
            attempts: 980,
            averageScore: 72.3,
            totalPlayers: 654,
            status: 'approved'
          },
          {
            id: '3',
            title: 'HTML & CSS Basics',
            description: 'Nền tảng HTML và CSS',
            category: 'Web Development',
            difficulty: 'easy' as const,
            questions: [],
            duration: 12,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            isPublished: true,
            tags: ['html', 'css'],
            attempts: 875,
            averageScore: 82.1,
            totalPlayers: 567,
            status: 'approved'
          },
          {
            id: '4',
            title: 'TypeScript Advanced',
            description: 'TypeScript nâng cao',
            category: 'Programming',
            difficulty: 'hard' as const,
            questions: [],
            duration: 25,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            isPublished: true,
            tags: ['typescript', 'advanced'],
            attempts: 432,
            averageScore: 65.8,
            totalPlayers: 298,
            status: 'approved'
          },
          {
            id: '5',
            title: 'Node.js Backend Development',
            description: 'Phát triển backend với Node.js',
            category: 'Backend',
            difficulty: 'medium' as const,
            questions: [],
            duration: 18,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            isPublished: true,
            tags: ['nodejs', 'backend'],
            attempts: 623,
            averageScore: 70.4,
            totalPlayers: 401,
            status: 'approved'
          }
        ];

        setPopularQuizzes(mockPopularQuizzes);
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

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${index + 1}`;
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 1: return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
      case 2: return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🔥 Quiz Phổ Biến Nhất</h2>
        
        {/* Time Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Thời gian:</span>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tất cả</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {popularQuizzes.map((quiz, index) => (
            <div
              key={quiz.id}
              className={`p-6 rounded-xl border transition-all duration-300 hover:shadow-lg ${
                index < 3 ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Rank Badge */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getRankStyle(index)}`}>
                    {getRankIcon(index)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{quiz.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                        {quiz.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{quiz.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>📂 {quiz.category}</span>
                      <span>⏱️ {quiz.duration} phút</span>
                      <span>👥 {quiz.totalPlayers} người chơi</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {quiz.attempts.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 mb-1">lượt chơi</div>
                  <div className="text-sm font-medium text-green-600">
                    ⭐ {quiz.averageScore.toFixed(1)}% TB
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-2 mt-3">
                    <Link
                      to={`/quiz/${quiz.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      🎯 Chơi ngay
                    </Link>
                    <Link
                      to={`/quiz/${quiz.id}/preview`}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      👁️ Xem trước
                    </Link>
                  </div>
                </div>
              </div>

              {/* Progress Bar for popularity */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Độ phổ biến</span>
                  <span>{Math.round((quiz.attempts / popularQuizzes[0].attempts) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                      index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${(quiz.attempts / popularQuizzes[0].attempts) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-center">
        <Link
          to="/quizzes"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          📚 Xem tất cả Quiz →
        </Link>
      </div>
    </div>
  );
};

export default PopularQuizzesRanking;
