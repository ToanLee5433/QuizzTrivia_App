import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../lib/store';
import { ROUTES } from '../../config/routes';
import { fetchQuizzes } from '../../features/quiz/store';
import { Quiz } from '../../features/quiz/types';
import QuizCard from '../../features/quiz/components/QuizCard';
import Button from '../components/ui/Button';
import PopularQuizzesRanking from '../components/PopularQuizzesRanking';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';

import { useTranslation } from 'react-i18next';
// **THÊM MỚI**: Dashboard stats interface
interface DashboardStats {
  totalQuizzes: number;
  totalUsers: number;
  completedQuizzes: number;
  totalCreators: number;
}

const Home: React.FC = () => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { quizzes, loading } = useSelector((state: RootState) => state.quiz);
  
  // **THÊM MỚI**: Dashboard stats state với dữ liệu thật
  const [stats, setStats] = useState<DashboardStats>({
    totalQuizzes: 0,
    totalUsers: 0,
    completedQuizzes: 0,
    totalCreators: 0
  });

  const [featuredQuizzes, setFeaturedQuizzes] = useState<Quiz[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (quizzes.length === 0) {
      dispatch(fetchQuizzes({}) as any);
    }
    loadRealStats();
  }, [dispatch, user, quizzes.length]);

  const loadRealStats = async () => {
    try {
      setStatsLoading(true);
      
      // Lấy dữ liệu thực từ Firebase - CHỈ QUIZ APPROVED
      const [quizzesSnapshot, usersSnapshot, quizResultsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'quizzes'), where('status', '==', 'approved'))),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'quizResults'))
      ]);
      
      // Đếm chỉ users ACTIVE (không bị xoá và isActive = true)
      const users = usersSnapshot.docs.map(doc => doc.data());
      const activeUsers = users.filter(user => 
        user.isActive !== false && 
        user.isDeleted !== true
      );
      
      // Đếm creators trong số users ACTIVE
      const creators = activeUsers.filter(user => 
        user.role === 'creator' || user.role === 'admin'
      );
      
      // Đếm số quiz đã hoàn thành từ quizResults collection
      const completedQuizzes = quizResultsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.completed === true || data.score !== undefined;
      }).length;
      
      setStats({
        totalQuizzes: quizzesSnapshot.size,
        totalUsers: activeUsers.length, // CHỈ ĐẾM USERS HOẠT ĐỘNG
        completedQuizzes: completedQuizzes,
        totalCreators: creators.length // CHỈ ĐẾM CREATORS HOẠT ĐỘNG
      });
      
    } catch (error) {
      console.error('Error loading real stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (quizzes.length > 0) {
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
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 lg:p-8 text-white shadow-2xl relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24"></div>
        
        <div className="relative max-w-5xl">
          <div className="flex items-center mb-6">
            <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center ring-4 ring-white/30 shadow-2xl mr-4">
              <span className="text-2xl lg:text-3xl">🎯</span>
            </div>
            <div>
              <h1 className="text-2xl lg:text-4xl font-bold mb-2 drop-shadow-lg">
                {t('home.hero.welcome', { name: user?.displayName?.split(' ')[0] || 'Quiz Master' })}
              </h1>
              <p className="text-blue-100 text-base lg:text-lg">
                {t('home.hero.subtitle')}
              </p>
            </div>
          </div>
          
          <p className="text-lg lg:text-xl text-blue-100 mb-8 leading-relaxed">
            {t('home.hero.description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
            <Link to="/quizzes">
              <Button className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 font-bold px-6 py-3 text-base rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <span className="mr-2">📚</span>{t("quizList.exploreQuizzes")}
              </Button>
            </Link>
            <Link to="/multiplayer">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 font-bold px-6 py-3 text-base rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 ring-2 ring-white/50">
                <span className="mr-2">🎮</span>Chơi Multiplayer
              </Button>
            </Link>
            <Link to={ROUTES.CREATOR}>
              <Button className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-blue-600 font-bold px-6 py-3 text-base rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <span className="mr-2">✨</span>{t("creator.createNewQuiz")}
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
              <p className="text-gray-600 text-sm font-medium mb-2">{t("dashboard.totalQuizzes")}</p>
              <p className="text-3xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.totalQuizzes}
              </p>
              <p className="text-xs text-green-600 font-medium mt-1">{t('home.stats.realData')}</p>
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
              <p className="text-gray-600 text-sm font-medium mb-2">{t("admin.tabs.users")}</p>
              <p className="text-3xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.totalUsers}
              </p>
              <p className="text-xs text-green-600 font-medium mt-1">{t('home.stats.registered')}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 group hover:border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">{t("dashboard.completedQuizzes")}</p>
              <p className="text-3xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.completedQuizzes}
              </p>
              <p className="text-xs text-purple-600 font-medium mt-1">{t('home.stats.pending')}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 group hover:border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">{t("admin.quizManagement.table.creator")}</p>
              <p className="text-3xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.totalCreators}
              </p>
              <p className="text-xs text-yellow-600 font-medium mt-1">{t('home.stats.creatorsAndAdmins')}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* **THÊM MỚI**: Featured/Trending Quizzes */}
      {featuredQuizzes.length > 0 && (
        <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                <span className="text-2xl">🔥</span>
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">{t('home.trending.title')}</h2>
                <p className="text-gray-600">{t('home.trending.subtitle')}</p>
              </div>
            </div>
            <Link 
              to="/quizzes" 
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-2xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span>{t('home.trending.viewAll')}</span>
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
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('home.trending.noQuizzes')}</h3>
              <p className="text-gray-600 mb-6">{t('home.trending.createFirst')}</p>
              <Link to={ROUTES.CREATOR}>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300">
                  {t('home.trending.createNow')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* **THÊM MỚI**: Quick Actions */}
      <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">{t('home.quickActions.title')}</h2>
            <p className="text-gray-600">{t('home.quickActions.subtitle')}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link 
            to={ROUTES.CREATOR}
            className="group bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-blue-200"
          >
            <div className="text-blue-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{t("creator.createNewQuiz")}</h3>
            <p className="text-gray-600 leading-relaxed">{t('home.quickActions.createDescription')}</p>
            <div className="mt-4 text-blue-600 font-semibold group-hover:translate-x-1 transition-transform duration-300 flex items-center">
              {t('home.quickActions.startCreating')} <span className="ml-2">→</span>
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
            <h3 className="text-xl font-bold text-gray-900 mb-3">{t('home.quickActions.randomQuiz')}</h3>
            <p className="text-gray-600 leading-relaxed">{t('home.quickActions.randomDescription')}</p>
            <div className="mt-4 text-green-600 font-semibold group-hover:translate-x-1 transition-transform duration-300 flex items-center">
              {t('home.quickActions.playNow')} <span className="ml-2">→</span>
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
            <h3 className="text-xl font-bold text-gray-900 mb-3">{t('home.quickActions.viewProgress')}</h3>
            <p className="text-gray-600 leading-relaxed">{t('home.quickActions.progressDescription')}</p>
            <div className="mt-4 text-purple-600 font-semibold group-hover:translate-x-1 transition-transform duration-300 flex items-center">
              {t("viewDetails")} <span className="ml-2">→</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Popular Quizzes Section */}
      <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
            <span className="text-2xl">🏆</span>
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">{t('home.popular.title')}</h2>
            <p className="text-gray-600">{t('home.popular.subtitle')}</p>
          </div>
        </div>
        <PopularQuizzesRanking />
      </div>
    </div>
  );
};

export default Home;

