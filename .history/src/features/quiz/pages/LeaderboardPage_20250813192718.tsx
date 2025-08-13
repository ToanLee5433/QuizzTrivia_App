import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { FaCrown, FaUserCircle, FaTrophy, FaMedal, FaAward, FaFire, FaStar, FaGamepad } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';

interface UserStat {
  userId: string;
  displayName: string;
  email?: string;
  totalScore: number;
  totalAttempts: number;
  averageScore: number;
  perfectScores: number;
  recentActivity: string;
  badge: string;
  rank?: number;
}

interface QuizStat {
  id: string;
  title: string;
  description?: string;
  category: string;
  difficulty: string;
  totalAttempts: number;
  averageScore: number;
  totalCompletions: number;
  createdBy?: string;
  isPublished: boolean;
  recentActivity: string;
}

interface OverallStats {
  totalUsers: number;
  totalQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  activeToday: number;
  perfectScoresCount: number;
}

const LeaderboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [topUsers, setTopUsers] = useState<UserStat[]>([]);
  const [topQuizzes, setTopQuizzes] = useState<QuizStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');
  const [search, setSearch] = useState('');
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  
  // Pagination states
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);

  // Calculate comprehensive leaderboard data
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setLoading(true);
      try {
        console.log('🏆 Fetching leaderboard data...');
        
        // Get all quiz results
        const resultsQuery = query(collection(db, 'quizResults'), orderBy('completedAt', 'desc'));
        const resultsSnapshot = await getDocs(resultsQuery);
        
        // Get all quizzes
        const quizzesQuery = query(collection(db, 'quizzes'), where('isPublished', '==', true));
        const quizzesSnapshot = await getDocs(quizzesQuery);
        
        // Get all users
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        
        console.log('📊 Found:', {
          results: resultsSnapshot.size,
          quizzes: quizzesSnapshot.size,
          users: usersSnapshot.size
        });

        // Process users data
        const usersMap = new Map();
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          usersMap.set(doc.id, {
            id: doc.id,
            displayName: userData.displayName || userData.email?.split('@')[0] || 'Anonymous',
            email: userData.email,
            ...userData
          });
        });

        // Process quizzes data
        const quizzesMap = new Map();
        quizzesSnapshot.forEach(doc => {
          const quizData = doc.data();
          quizzesMap.set(doc.id, {
            id: doc.id,
            title: quizData.title || 'Untitled Quiz',
            description: quizData.description || '',
            category: quizData.category || 'general',
            difficulty: quizData.difficulty || 'medium',
            createdBy: quizData.createdBy,
            isPublished: quizData.isPublished,
            ...quizData
          });
        });

        // Calculate user statistics
        const userStats = new Map<string, UserStat>();
        const quizStats = new Map<string, QuizStat>();
        let totalScore = 0;
        let totalAttempts = 0;
        let perfectScoresCount = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        resultsSnapshot.forEach(doc => {
          const result = doc.data();
          const completedAt = result.completedAt?.toDate?.() || new Date(result.completedAt);
          
          // User statistics
          const userId = result.userId;
          if (!userStats.has(userId)) {
            const userData = usersMap.get(userId) || {};
            userStats.set(userId, {
              userId,
              displayName: userData.displayName || result.userName || 'Anonymous',
              email: userData.email || result.userEmail,
              totalScore: 0,
              totalAttempts: 0,
              averageScore: 0,
              perfectScores: 0,
              recentActivity: completedAt.toLocaleDateString('vi-VN'),
              badge: 'beginner'
            });
          }

          const userStat = userStats.get(userId)!;
          userStat.totalAttempts++;
          userStat.totalScore += result.score || 0;
          
          if (result.score === 100) {
            userStat.perfectScores++;
            perfectScoresCount++;
          }
          
          if (completedAt > new Date(userStat.recentActivity)) {
            userStat.recentActivity = completedAt.toLocaleDateString('vi-VN');
          }

          // Quiz statistics
          const quizId = result.quizId;
          if (!quizStats.has(quizId)) {
            const quizData = quizzesMap.get(quizId) || {};
            quizStats.set(quizId, {
              id: quizId,
              title: quizData.title || 'Unknown Quiz',
              description: quizData.description || '',
              category: quizData.category || 'general',
              difficulty: quizData.difficulty || 'medium',
              totalAttempts: 0,
              averageScore: 0,
              totalCompletions: 0,
              createdBy: quizData.createdBy,
              isPublished: quizData.isPublished,
              recentActivity: completedAt.toLocaleDateString('vi-VN')
            });
          }

          const quizStat = quizStats.get(quizId)!;
          quizStat.totalAttempts++;
          quizStat.totalCompletions++;
          quizStat.averageScore = ((quizStat.averageScore * (quizStat.totalAttempts - 1)) + (result.score || 0)) / quizStat.totalAttempts;
          
          if (completedAt > new Date(quizStat.recentActivity)) {
            quizStat.recentActivity = completedAt.toLocaleDateString('vi-VN');
          }

          totalScore += result.score || 0;
          totalAttempts++;
        });

        // Calculate user averages and assign badges
        userStats.forEach(userStat => {
          userStat.averageScore = userStat.totalAttempts > 0 ? userStat.totalScore / userStat.totalAttempts : 0;
          
          // Assign badges based on performance
          if (userStat.averageScore >= 90 && userStat.totalAttempts >= 10) {
            userStat.badge = 'legendary';
          } else if (userStat.averageScore >= 80 && userStat.totalAttempts >= 5) {
            userStat.badge = 'expert';
          } else if (userStat.averageScore >= 70 && userStat.totalAttempts >= 3) {
            userStat.badge = 'advanced';
          } else if (userStat.totalAttempts >= 2) {
            userStat.badge = 'intermediate';
          } else {
            userStat.badge = 'beginner';
          }
        });

        // Sort and rank users - NEW PRIORITY: Quiz count -> Score -> Total time
        const sortedUsers = Array.from(userStats.values())
          .sort((a, b) => {
            // Primary: Total quiz attempts (more quizzes = higher rank)
            if (a.totalAttempts !== b.totalAttempts) {
              return b.totalAttempts - a.totalAttempts;
            }
            // Secondary: Average score 
            if (Math.abs(a.averageScore - b.averageScore) > 1) {
              return b.averageScore - a.averageScore;
            }
            // Tertiary: Perfect scores count
            return b.perfectScores - a.perfectScores;
          })
          .map((user, index) => ({ ...user, rank: index + 1 }));

        // Sort quizzes by popularity
        const sortedQuizzes = Array.from(quizStats.values())
          .sort((a, b) => b.totalAttempts - a.totalAttempts);

        setTopUsers(sortedUsers);
        setTopQuizzes(sortedQuizzes);

        // Find current user rank
        if (user) {
          const userIndex = sortedUsers.findIndex(u => u.userId === user.uid);
          setCurrentUserRank(userIndex >= 0 ? userIndex + 1 : null);
        }

        // Calculate overall statistics
        const activeToday = Array.from(userStats.values()).filter(u => {
          const lastActivity = new Date(u.recentActivity);
          return lastActivity >= today;
        }).length;

        setStats({
          totalUsers: userStats.size,
          totalQuizzes: quizStats.size,
          totalAttempts,
          averageScore: totalAttempts > 0 ? Math.round((totalScore / totalAttempts) * 10) / 10 : 0,
          activeToday,
          perfectScoresCount
        });

        console.log('✅ Leaderboard data processed successfully');
        
      } catch (error) {
        console.error('❌ Error fetching leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [user]);

  // Filter users by search
  const filteredUsers = topUsers.filter(u => {
    const keyword = search.toLowerCase();
    return (
      (u.displayName && u.displayName.toLowerCase().includes(keyword)) ||
      (u.email && u.email.toLowerCase().includes(keyword)) ||
      (u.userId && u.userId.toLowerCase().includes(keyword))
    );
  });

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'legendary': return <FaCrown className="w-5 h-5 text-yellow-500" />;
      case 'expert': return <FaTrophy className="w-5 h-5 text-purple-500" />;
      case 'advanced': return <FaMedal className="w-5 h-5 text-blue-500" />;
      case 'intermediate': return <FaAward className="w-5 h-5 text-green-500" />;
      default: return <FaStar className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'expert': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'advanced': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'intermediate': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center flex items-center justify-center gap-3">
          <FaTrophy className="text-yellow-500" />
          {t('leaderboard.title')}
          <FaTrophy className="text-yellow-500" />
        </h1>
        
        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex gap-4 items-center">
            <label className="font-medium text-gray-700">{t('leaderboard.time')}:</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
              value={timeFilter}
              onChange={e => setTimeFilter(e.target.value as any)}
            >
              <option value="all">{t('leaderboard.filters.allTime')}</option>
              <option value="week">{t('leaderboard.filters.thisWeek')}</option>
              <option value="month">{t('leaderboard.filters.thisMonth')}</option>
            </select>
          </div>
          <input
            className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('leaderboard.searchPlayers')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 text-center shadow-lg">
            <div className="text-2xl font-bold">{stats?.totalUsers || '--'}</div>
            <div className="text-blue-100 text-sm">{t('leaderboard.players')}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 text-center shadow-lg">
            <div className="text-2xl font-bold">{stats?.totalQuizzes || '--'}</div>
            <div className="text-green-100 text-sm">{t('nav.quizzes')}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-xl p-4 text-center shadow-lg">
            <div className="text-2xl font-bold">{stats?.totalAttempts || '--'}</div>
            <div className="text-yellow-100 text-sm">{t('leaderboard.plays')}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 text-center shadow-lg">
            <div className="text-2xl font-bold">{stats?.averageScore || '--'}%</div>
            <div className="text-purple-100 text-sm">{t('leaderboard.avgScore')}</div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-4 text-center shadow-lg">
            <div className="text-2xl font-bold">{stats?.activeToday || '--'}</div>
            <div className="text-red-100 text-sm">{t('leaderboard.activeToday')}</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-4 text-center shadow-lg">
            <div className="text-2xl font-bold">{stats?.perfectScoresCount || '--'}</div>
            <div className="text-indigo-100 text-sm">{t('leaderboard.perfectScores')}</div>
          </div>
        </div>

        {/* Top Users Section */}
        <div className="mb-10">
            <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
            <FaCrown className="text-yellow-500" />
            {t('leaderboard.topPlayers')}
          </h2>
          
          <div className="bg-white rounded-2xl shadow-lg p-6">
            {loading ? (
              <div className="space-y-4">
                {Array.from({length: 5}).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <FaUserCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">{t('leaderboard.noData')}</h3>
                <p className="text-gray-500">{t('leaderboard.playToAppear')}</p>
              </div>
            ) : (
              <>
                {/* Top 5 Winners - Enhanced Display */}
                <div className="mb-8">
                  {/* Top 3 Podium */}
                  <div className="flex justify-center items-end gap-6 mb-6">
                    {filteredUsers.slice(0, 3).map((user, idx) => (
                      <div key={user.userId} className={`text-center ${idx === 0 ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}>
                        <div className={`relative mb-4 ${idx === 0 ? 'transform scale-110' : ''}`}>
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto ${
                            idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                            idx === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                            'bg-gradient-to-br from-orange-400 to-orange-600'
                          }`}>
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="absolute -top-3 -right-2">
                            {getBadgeIcon(user.badge)}
                          </div>
                          {idx === 0 && <FaCrown className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-2xl text-yellow-500" />}
                        </div>
                        <div className="font-bold text-gray-900 truncate max-w-24">{user.displayName}</div>
                        <div className={`text-sm font-semibold ${
                          idx === 0 ? 'text-yellow-600' : idx === 1 ? 'text-gray-600' : 'text-orange-600'
                        }`}>
                          🎯 {user.totalAttempts} {t('nav.quizzes')}
                        </div>
                        <div className="text-xs text-gray-500">{Math.round(user.averageScore)}% {t('leaderboard.avgShort')}</div>
                        <div className={`mt-2 px-2 py-1 rounded-full text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                          idx === 1 ? 'bg-gray-100 text-gray-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Top 4-5 in cards */}
                  {filteredUsers.length >= 4 && (
                    <div className="flex justify-center gap-4">
                      {filteredUsers.slice(3, 5).map((user, idx) => (
                        <div key={user.userId} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 flex items-center gap-3 min-w-64">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              #{idx + 4} {user.displayName}
                              {getBadgeIcon(user.badge)}
                            </div>
                              <div className="text-sm text-blue-600 font-medium">
                              🎯 {user.totalAttempts} {t('nav.quizzes')} • {Math.round(user.averageScore)}% {t('leaderboard.avgShort')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rest of leaderboard - Starting from 6th place */}
                <div className="space-y-2">
                  {(showAllUsers ? filteredUsers.slice(5) : filteredUsers.slice(5, 20)).map((user, idx) => (
                    <div key={user.userId} className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                      currentUserRank === idx + 6 ? 'bg-blue-50 border-2 border-blue-200' : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-3 flex-1">
                        <span className="font-bold text-lg text-blue-600 w-8">#{idx + 6}</span>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {user.displayName}
                            <span className={`px-2 py-1 rounded-full text-xs border ${getBadgeColor(user.badge)}`}>
                              {user.badge}
                            </span>
                          </div>
                            <div className="text-sm text-gray-500">
                              🎯 {user.totalAttempts} {t('nav.quizzes')} • {user.perfectScores} {t('leaderboard.perfect100')} • {t('leaderboard.activity')}: {user.recentActivity}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-blue-600">🎯 {user.totalAttempts}</div>
                        <div className="text-sm text-gray-500">{Math.round(user.averageScore)}% TB</div>
                      </div>
                      <div className="text-gray-400">
                        {getBadgeIcon(user.badge)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Show More Button */}
                {filteredUsers.length > 20 && (
                  <div className="text-center mt-6">
                    <button
                      onClick={() => setShowAllUsers(!showAllUsers)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      {showAllUsers ? t('leaderboard.collapse') : t('leaderboard.viewAllCount')}
                    </button>
                    {user && (
                      <div className="text-sm text-blue-700 mt-2">{user.displayName || user.email}</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Top Quizzes Section */}
        <div>
            <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-center flex items-center gap-2">
              <FaFire className="text-red-500" />
                {t('leaderboard.topQuizzes')}
            </h2>
            {topQuizzes.length > 12 && (
              <button
                onClick={() => setShowAllQuizzes(!showAllQuizzes)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                {showAllQuizzes ? t('leaderboard.collapse') : t('leaderboard.viewAllCount')}
              </button>
            )}
            </div>
            {topQuizzes.length === 0 ? (
              <div className="text-center text-gray-500">
                <p className="text-gray-500">{t('leaderboard.createFirstQuiz')}</p>
              </div>
            ) : (
              (showAllQuizzes ? topQuizzes : topQuizzes.slice(0, 12)).map((quiz, idx) => (
                <div key={quiz.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-l-4 border-blue-500">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{quiz.title}</h3>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">{quiz.description}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                      #{idx + 1}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                      {quiz.difficulty === 'easy' ? t('difficulty.easy') : quiz.difficulty === 'hard' ? t('difficulty.hard') : t('difficulty.medium')}
                    </span>
                    <span className="text-gray-500 text-sm capitalize">{quiz.category}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">{t('leaderboard.plays')}:</span>
                      <span className="font-semibold text-blue-600">{quiz.totalAttempts}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">{t('leaderboard.avgScore')}:</span>
                      <span className="font-semibold text-green-600">{Math.round(quiz.averageScore)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">{t('leaderboard.activity')}:</span>
                      <span className="text-gray-500 text-xs">{quiz.recentActivity}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
  );
};

export default LeaderboardPage;