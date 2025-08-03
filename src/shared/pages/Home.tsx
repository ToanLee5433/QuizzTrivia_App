import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../lib/store';
import { fetchQuizzes } from '../../features/quiz/store';
import { Quiz } from '../../features/quiz/types';
import QuizCard from '../../features/quiz/components/QuizCard';
import Button from '../components/ui/Button';
import PopularQuizzesRanking from '../components/PopularQuizzesRanking';
import EmptyState from '../components/EmptyState';
import { seedTestData } from '../../lib/utils/seedTestData';
import { toast } from 'react-toastify';

// **THÊM MỚI**: Dashboard stats interface
interface DashboardStats {
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
  todayQuizzes: number;
}

const Home: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { quizzes, loading } = useSelector((state: RootState) => state.quiz);
  
  // **THÊM MỚI**: Dashboard stats state
  const [stats, setStats] = useState<DashboardStats>({
    totalQuizzes: 0,
    completedQuizzes: 0,
    averageScore: 0,
    todayQuizzes: 0
  });

  const [featuredQuizzes, setFeaturedQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    if (quizzes.length === 0) {
      dispatch(fetchQuizzes({ user }) as any);
    }
  }, [dispatch, user, quizzes.length]);

  useEffect(() => {
    if (quizzes.length > 0) {
      // **THÊM MỚI**: Calculate dashboard stats
      const completed = quizzes.filter(q => q.isCompleted).length;
      const totalScore = quizzes.reduce((sum, q) => sum + (q.score || 0), 0);
      const avgScore = completed > 0 ? totalScore / completed : 0;
      
      setStats({
        totalQuizzes: quizzes.length,
        completedQuizzes: completed,
        averageScore: Math.round(avgScore * 10) / 10,
        todayQuizzes: quizzes.filter(q => {
          const today = new Date().toDateString();
          return new Date(q.createdAt).toDateString() === today;
        }).length
      });

      // **THÊM MỚI**: Set featured quizzes (trending/popular)
      const trending = quizzes
        .filter(q => q.isPublic)
        .sort((a, b) => (b.attempts || 0) - (a.attempts || 0))
        .slice(0, 6);
      setFeaturedQuizzes(trending);
    }
  }, [quizzes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        {Array.from({length: 4}).map((_,i) => (
          <div key={i} className="animate-pulse bg-white rounded-xl shadow-lg h-40 w-80 m-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-bold mb-4">
            Welcome back, {user?.displayName || 'Quiz Master'}! 🎯
          </h1>
          <p className="text-xl text-blue-100 mb-6">
            Ready to challenge your knowledge? Discover new quizzes and test your skills.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/quizzes">
              <Button className="bg-white text-blue-600 hover:bg-blue-50 font-semibold">
                Explore Quizzes
              </Button>
            </Link>
            <Link to="/creator">
              <Button className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold">
                Create Quiz
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* **THÊM MỚI**: Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Quizzes</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalQuizzes}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold text-gray-900">{stats.completedQuizzes}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Average Score</p>
              <p className="text-3xl font-bold text-gray-900">{stats.averageScore}%</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Today's Quizzes</p>
              <p className="text-3xl font-bold text-gray-900">{stats.todayQuizzes}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* **THÊM MỚI**: Featured/Trending Quizzes */}
      {featuredQuizzes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">🔥 Trending Quizzes</h2>
            <Link 
              to="/quizzes" 
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              View All
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {featuredQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredQuizzes.map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} />
              ))}
            </div>
          ) : (
            <EmptyState 
              type="quizzes"
              showTestData={process.env.NODE_ENV === 'development'}
              onCreateTestData={async () => {
                try {
                  await seedTestData();
                  toast.success('Đã tạo dữ liệu mẫu thành công!');
                  dispatch(fetchQuizzes({ user }) as any);
                } catch (error) {
                  toast.error('Có lỗi khi tạo dữ liệu mẫu');
                }
              }}
            />
          )}
        </div>
      )}

      {/* **THÊM MỚI**: Quick Actions */}
      <div className="bg-gray-50 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link 
            to="/creator" 
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-200"
          >
            <div className="text-blue-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Quiz</h3>
            <p className="text-gray-600">Design and share your own quiz with others</p>
          </Link>
          
          <Link 
            to="/quizzes?filter=recent" 
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-green-200"
          >
            <div className="text-green-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Quiz</h3>
            <p className="text-gray-600">Jump into a random quiz and test your knowledge</p>
          </Link>
          
          <Link 
            to="/profile" 
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-200"
          >
            <div className="text-purple-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">View Progress</h3>
            <p className="text-gray-600">Check your achievements and quiz history</p>
          </Link>
        </div>

        {/* Popular Quizzes Section */}
        <div className="mt-16">
          <PopularQuizzesRanking />
        </div>
      </div>
    </div>
  );
};

export default Home;

