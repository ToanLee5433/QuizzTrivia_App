import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../lib/store';
import { fetchQuizzes } from '../../features/quiz/store';
import { Quiz } from '../../features/quiz/types';
import QuizCard from '../../features/quiz/components/QuizCard';
import Button from '../components/ui/Button';
import PopularQuizzesRanking from '../components/PopularQuizzesRanking';

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
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24"></div>
        
        <div className="relative max-w-5xl">
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center ring-4 ring-white/30 shadow-2xl mr-6">
              <span className="text-3xl lg:text-4xl">🎯</span>
            </div>
            <div>
              <h1 className="text-3xl lg:text-5xl font-bold mb-2 drop-shadow-lg">
                Chào mừng trở lại, {user?.displayName?.split(' ')[0] || 'Quiz Master'}!
              </h1>
              <p className="text-blue-100 text-lg lg:text-xl">
                Sẵn sàng thử thách kiến thức của bạn chưa?
              </p>
            </div>
          </div>
          
          <p className="text-xl lg:text-2xl text-blue-100 mb-8 leading-relaxed">
            Khám phá hàng nghìn quiz thú vị, thử thách bản thân và leo lên bảng xếp hạng! 🚀
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
            <Link to="/quizzes">
              <Button className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 py-4 text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <span className="mr-2">📚</span>
                Khám phá Quiz
              </Button>
            </Link>
            <Link to="/creator">
              <Button className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-blue-600 font-bold px-8 py-4 text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <span className="mr-2">✨</span>
                Tạo Quiz mới
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* **THÊM MỚI**: Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 group hover:border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Tổng Quiz</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalQuizzes}</p>
              <p className="text-xs text-green-600 font-medium mt-1">📈 +12% tháng này</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 group hover:border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Đã hoàn thành</p>
              <p className="text-3xl font-bold text-gray-900">{stats.completedQuizzes}</p>
              <p className="text-xs text-green-600 font-medium mt-1">🎉 +5 quiz tuần này</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 group hover:border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Điểm trung bình</p>
              <p className="text-3xl font-bold text-gray-900">{stats.averageScore}%</p>
              <p className="text-xs text-yellow-600 font-medium mt-1">⭐ Tuyệt vời!</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 group hover:border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Quiz hôm nay</p>
              <p className="text-3xl font-bold text-gray-900">{stats.todayQuizzes}</p>
              <p className="text-xs text-purple-600 font-medium mt-1">🔥 Đang hot!</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* **THÊM MỚI**: Featured/Trending Quizzes */}
      {featuredQuizzes.length > 0 && (
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                <span className="text-2xl">🔥</span>
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Quiz Trending</h2>
                <p className="text-gray-600">Những quiz được yêu thích nhất</p>
              </div>
            </div>
            <Link 
              to="/quizzes" 
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-2xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span>Xem tất cả</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          
          {featuredQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
              {featuredQuizzes.map((quiz) => (
                <div key={quiz.id} className="transform hover:scale-105 transition-all duration-300">
                  <QuizCard quiz={quiz} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Chưa có quiz trending</h3>
              <p className="text-gray-600 mb-6">Hãy bắt đầu tạo quiz đầu tiên của bạn!</p>
              <Link to="/creator">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300">
                  Tạo Quiz ngay
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* **THÊM MỚI**: Quick Actions */}
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Hành động nhanh</h2>
            <p className="text-gray-600">Những thao tác thường dùng để bắt đầu</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link 
            to="/creator" 
            className="group bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-blue-200"
          >
            <div className="text-blue-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Tạo Quiz mới</h3>
            <p className="text-gray-600 leading-relaxed">Thiết kế và chia sẻ quiz của riêng bạn với mọi người</p>
            <div className="mt-4 text-blue-600 font-semibold group-hover:translate-x-1 transition-transform duration-300 flex items-center">
              Bắt đầu tạo <span className="ml-2">→</span>
            </div>
          </Link>
          
          <Link 
            to="/quizzes?filter=random" 
            className="group bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-green-200"
          >
            <div className="text-green-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Quiz ngẫu nhiên</h3>
            <p className="text-gray-600 leading-relaxed">Nhảy vào một quiz bất kỳ và thử thách kiến thức của bạn</p>
            <div className="mt-4 text-green-600 font-semibold group-hover:translate-x-1 transition-transform duration-300 flex items-center">
              Chơi ngay <span className="ml-2">→</span>
            </div>
          </Link>
          
          <Link 
            to="/profile" 
            className="group bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-purple-200"
          >
            <div className="text-purple-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Xem tiến độ</h3>
            <p className="text-gray-600 leading-relaxed">Kiểm tra thành tích và lịch sử làm quiz của bạn</p>
            <div className="mt-4 text-purple-600 font-semibold group-hover:translate-x-1 transition-transform duration-300 flex items-center">
              Xem chi tiết <span className="ml-2">→</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Popular Quizzes Section */}
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
            <span className="text-2xl">🏆</span>
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Quiz phổ biến</h2>
            <p className="text-gray-600">Những quiz được yêu thích nhất tuần này</p>
          </div>
        </div>
        <PopularQuizzesRanking />
      </div>
    </div>
  );
};

export default Home;

