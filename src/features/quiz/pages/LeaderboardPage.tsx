import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { FaCrown, FaUserCircle, FaTrophy, FaMedal, FaAward, FaStar } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { formatDate } from '../../../lib/utils/helpers';
import { toast } from 'react-toastify';
import RecommendedSection from '../components/RecommendedSection';

interface UserStat {
  userId: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  totalScore: number;
  totalAttempts: number;
  averageScore: number;
  perfectScores: number;
  recentActivity: string;
  badge: string;
  rank?: number;
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
  // Safe translation hook with error handling
  const { t, ready } = useTranslation();
  
  const [topUsers, setTopUsers] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');
  const [search, setSearch] = useState('');
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  
  // Pagination states
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Calculate comprehensive leaderboard data - Move before conditional return
  useEffect(() => {
    if (!ready) return; // Skip if i18n not ready
    if (!user) {
      console.warn('⚠️ User not authenticated, redirecting...');
      setLoading(false);
      return;
    }
    
    const fetchLeaderboardData = async () => {
      setLoading(true);
      try {
        console.log('🏆 Fetching leaderboard data for user:', user.uid);
        
        // Get all quiz results
        const resultsQuery = query(collection(db, 'quizResults'), orderBy('completedAt', 'desc'));
        const resultsSnapshot = await getDocs(resultsQuery);
        
        // Get all APPROVED quizzes (matching Firestore rules)
        const quizzesQuery = query(
          collection(db, 'quizzes'), 
          where('status', '==', 'approved')
        );
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
            displayName: userData.displayName || userData.email?.split('@')[0] || t('leaderboard.anonymous'),
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
            title: quizData.title || t('leaderboard.untitledQuiz'),
            description: quizData.description || '',
            category: quizData.category || 'general',
            difficulty: quizData.difficulty || 'medium',
            createdBy: quizData.createdBy,
            isPublished: quizData.isPublished,
            ...quizData
          });
        });

        // Calculate user statistics
        const userStats = new Map<string, UserStat & { lastActivityDate: Date }>();
        let totalScore = 0;
        let totalAttempts = 0;
        let perfectScoresCount = 0;
        let skippedDeletedQuizResults = 0; // Track skipped results for deleted quizzes
        const skippedQuizIds = new Set<string>(); // Track unique deleted quiz IDs
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
              displayName: userData.displayName || result.userName || t('leaderboard.anonymous'),
              email: userData.email || result.userEmail,
              photoURL: userData.photoURL || '',
              totalScore: 0,
              totalAttempts: 0,
              averageScore: 0,
              perfectScores: 0,
              recentActivity: formatDate(completedAt, 'short'),
              lastActivityDate: completedAt, // Track actual Date for activeToday calculation
              badge: 'beginner'
            });
          }

          const userStat = userStats.get(userId)!;
          userStat.totalAttempts++;
          
          // Normalize score to 0-100 percentage BEFORE adding to totalScore
          // Multiplayer: use percentage field (0-100), Single-player: use score field (0-100)
          const normalizedScore = (result as any).mode === 'multiplayer' 
            ? ((result as any).percentage || 0)
            : (result.score || 0);
          
          userStat.totalScore += normalizedScore;
          
          if (normalizedScore === 100) {
            userStat.perfectScores++;
            perfectScoresCount++;
          }
          
          // Update most recent activity
          if (completedAt > userStat.lastActivityDate) {
            userStat.recentActivity = formatDate(completedAt, 'short');
            userStat.lastActivityDate = completedAt;
          }

          // Check if quiz exists - skip results for deleted quizzes
          const quizId = result.quizId;
          const quizData = quizzesMap.get(quizId);
          
          // Skip this result if the quiz no longer exists (deleted)
          if (!quizData) {
            skippedDeletedQuizResults++;
            skippedQuizIds.add(quizId);
            return; // Skip this iteration - don't count results for deleted quizzes
          }

          totalScore += normalizedScore;
          totalAttempts++;
        });

        // Add all users to leaderboard (including those without quiz results)
        usersMap.forEach((userData, userId) => {
          if (!userStats.has(userId)) {
            const longAgo = new Date(2020, 0, 1); // Users without activity won't count as activeToday
            userStats.set(userId, {
              userId,
              displayName: userData.displayName || userData.email?.split('@')[0] || t('leaderboard.anonymous'),
              email: userData.email,
              photoURL: userData.photoURL || '',
              totalScore: 0,
              totalAttempts: 0,
              averageScore: 0,
              perfectScores: 0,
              recentActivity: formatDate(longAgo, 'short'),
              lastActivityDate: longAgo,
              badge: 'beginner'
            });
          }
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

        setTopUsers(sortedUsers);

        // Find current user rank
        if (user) {
          const userIndex = sortedUsers.findIndex(u => u.userId === user.uid);
          setCurrentUserRank(userIndex >= 0 ? userIndex + 1 : null);
        }

        // Calculate overall statistics - count users who completed quizzes today
        const activeToday = Array.from(userStats.values()).filter(u => {
          return u.lastActivityDate >= today;
        }).length;

        setStats({
          totalUsers: userStats.size,
          totalQuizzes: quizzesSnapshot.size, // ✅ Count ALL approved quizzes (matching Admin Dashboard logic)
          totalAttempts,
          averageScore: totalAttempts > 0 ? Math.round((totalScore / totalAttempts) * 10) / 10 : 0,
          activeToday,
          perfectScoresCount
        });

        // Log summary of skipped results (only once, not per result)
        if (skippedDeletedQuizResults > 0) {
          console.warn(`⚠️ Skipped ${skippedDeletedQuizResults} quiz results from ${skippedQuizIds.size} deleted quizzes`);
        }
        
        console.log('✅ Leaderboard data processed successfully');
        
      } catch (error: any) {
        console.error('❌ Error fetching leaderboard data:', error);
        console.error('❌ Error code:', error?.code);
        console.error('❌ Error message:', error?.message);
        
        // Set empty data to prevent UI crash
        setTopUsers([]);
        setStats({
          totalUsers: 0,
          totalQuizzes: 0,
          totalAttempts: 0,
          averageScore: 0,
          activeToday: 0,
          perfectScoresCount: 0
        });
        
        // Show user-friendly error message
        toast.error(t('leaderboard.loadError') || 'Cannot load leaderboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [user, ready, t]);

  // Don't render until i18n is ready - Moved after hooks
  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('leaderboard.loading')}</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-8 text-center flex items-center justify-center gap-2 sm:gap-3">
          <FaTrophy className="text-yellow-500 text-xl sm:text-2xl md:text-3xl" />
          <span className="truncate">{t('leaderboard.title')}</span>
          <FaTrophy className="text-yellow-500 text-xl sm:text-2xl md:text-3xl" />
        </h1>
        
        {/* Filters and Search - Mobile Optimized */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center sm:justify-between">
            <div className="flex gap-2 sm:gap-4 items-center">
              <label className="font-medium text-gray-700 text-sm sm:text-base whitespace-nowrap">{t('leaderboard.time')}:</label>
              <select
                className="border border-gray-300 rounded-lg px-2 sm:px-3 py-2 bg-white text-sm sm:text-base flex-1 sm:flex-none"
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value as any)}
              >
                <option value="all">{t('leaderboard.filters.allTime')}</option>
                <option value="week">{t('leaderboard.filters.thisWeek')}</option>
                <option value="month">{t('leaderboard.filters.thisMonth')}</option>
              </select>
            </div>
            <input
              className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full sm:w-80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              placeholder={t('leaderboard.searchPlayers')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Overall Statistics - Mobile Grid: 3 cols on mobile, 6 on desktop */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-2 sm:p-4 text-center shadow-lg">
            <div className="text-base sm:text-2xl font-bold">{stats?.totalUsers || '--'}</div>
            <div className="text-blue-100 text-[9px] sm:text-sm truncate">{t('leaderboard.players')}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-2 sm:p-4 text-center shadow-lg">
            <div className="text-base sm:text-2xl font-bold">{stats?.totalQuizzes || '--'}</div>
            <div className="text-green-100 text-[9px] sm:text-sm truncate">{t('nav.quizzes')}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-xl p-2 sm:p-4 text-center shadow-lg">
            <div className="text-base sm:text-2xl font-bold">{stats?.totalAttempts || '--'}</div>
            <div className="text-yellow-100 text-[9px] sm:text-sm truncate">{t('leaderboard.plays')}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-2 sm:p-4 text-center shadow-lg">
            <div className="text-base sm:text-2xl font-bold">{stats?.averageScore || '--'}%</div>
            <div className="text-purple-100 text-[9px] sm:text-sm truncate">{t('leaderboard.avgScore')}</div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-2 sm:p-4 text-center shadow-lg">
            <div className="text-base sm:text-2xl font-bold">{stats?.activeToday || '--'}</div>
            <div className="text-red-100 text-[9px] sm:text-sm truncate">{t('leaderboard.activeToday')}</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-2 sm:p-4 text-center shadow-lg">
            <div className="text-base sm:text-2xl font-bold">{stats?.perfectScoresCount || '--'}</div>
            <div className="text-indigo-100 text-[9px] sm:text-sm truncate">{t('leaderboard.perfectScores')}</div>
          </div>
        </div>

        {/* Top Users Section */}
        <div className="mb-6 sm:mb-10">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center flex items-center justify-center gap-2">
            <FaCrown className="text-yellow-500" />
            {t('leaderboard.topPlayers')}
          </h2>
          
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-6">
            {loading ? (
              <div className="space-y-3 sm:space-y-4">
                {Array.from({length: 5}).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3 sm:gap-4">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gray-300 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 sm:h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-2 sm:h-3 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <FaUserCircle className="w-12 sm:w-16 h-12 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">{t('leaderboard.noData')}</h3>
                <p className="text-gray-500 text-sm sm:text-base">{t('leaderboard.playToAppear')}</p>
              </div>
            ) : (
              <>
                {/* Top 3 Podium - Mobile Optimized */}
                <div className="mb-6 sm:mb-8">
                  <div className="flex justify-center items-end gap-2 sm:gap-6 mb-4 sm:mb-6">
                    {filteredUsers.slice(0, 3).map((user, idx) => (
                      <div key={user.userId} className={`text-center ${idx === 0 ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}>
                        <div className={`relative mb-2 sm:mb-4 ${idx === 0 ? 'transform scale-105 sm:scale-110' : ''}`}>
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.displayName}
                              className="w-12 sm:w-16 h-12 sm:h-16 rounded-full object-cover border-2 sm:border-4 border-white shadow-lg mx-auto"
                            />
                          ) : (
                            <div className={`w-12 sm:w-16 h-12 sm:h-16 rounded-full flex items-center justify-center text-lg sm:text-2xl font-bold text-white mx-auto ${
                              idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                              idx === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                              'bg-gradient-to-br from-orange-400 to-orange-600'
                            }`}>
                              {user.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute -top-2 sm:-top-3 -right-1 sm:-right-2">
                            {getBadgeIcon(user.badge)}
                          </div>
                          {idx === 0 && <FaCrown className="absolute -top-4 sm:-top-6 left-1/2 transform -translate-x-1/2 text-lg sm:text-2xl text-yellow-500" />}
                        </div>
                        <div className="font-bold text-gray-900 truncate max-w-16 sm:max-w-24 text-xs sm:text-base mx-auto">{user.displayName}</div>
                        <div className={`text-[10px] sm:text-sm font-semibold ${
                          idx === 0 ? 'text-yellow-600' : idx === 1 ? 'text-gray-600' : 'text-orange-600'
                        }`}>
                          🎯 {user.totalAttempts}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">{Math.round(user.averageScore)}% {t('leaderboard.avgShort')}</div>
                        <div className={`mt-1 sm:mt-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                          idx === 1 ? 'bg-gray-100 text-gray-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Top 4-5 in cards - Stack on Mobile */}
                  {filteredUsers.length >= 4 && (
                    <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                      {filteredUsers.slice(3, 5).map((user, idx) => (
                        <div key={user.userId} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 sm:min-w-64">
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.displayName}
                              className="w-8 sm:w-10 h-8 sm:h-10 rounded-full object-cover border-2 border-blue-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
                              {user.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                              <span className="text-blue-600">#{idx + 4}</span>
                              <span className="truncate">{user.displayName}</span>
                              <span className="flex-shrink-0">{getBadgeIcon(user.badge)}</span>
                            </div>
                            <div className="text-xs sm:text-sm text-blue-600 font-medium truncate">
                              🎯 {user.totalAttempts} • {Math.round(user.averageScore)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rest of leaderboard - Starting from 6th place - Mobile Optimized */}
                <div className="space-y-2">
                  {(showAllUsers ? filteredUsers.slice(5) : filteredUsers.slice(5, 20)).map((user, idx) => (
                    <div key={user.userId} className={`flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg transition-colors ${
                      currentUserRank === idx + 6 ? 'bg-blue-50 border-2 border-blue-200' : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <span className="font-bold text-sm sm:text-lg text-blue-600 w-6 sm:w-8 flex-shrink-0">#{idx + 6}</span>
                        <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                            <span className="truncate">{user.displayName}</span>
                            <span className={`hidden sm:inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs border ${getBadgeColor(user.badge)}`}>
                              {t(`leaderboard.badges.${user.badge}`)}
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500 truncate">
                            🎯 {user.totalAttempts} • {user.perfectScores} {t('leaderboard.perfect100')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-sm sm:text-lg text-blue-600">🎯 {user.totalAttempts}</div>
                        <div className="text-[10px] sm:text-sm text-gray-500">{Math.round(user.averageScore)}%</div>
                      </div>
                      <div className="text-gray-400 hidden sm:block">
                        {getBadgeIcon(user.badge)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Show More Button */}
                {filteredUsers.length > 20 && (
                  <div className="text-center mt-4 sm:mt-6">
                    <button
                      onClick={() => setShowAllUsers(!showAllUsers)}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base"
                    >
                      {showAllUsers ? t('leaderboard.collapse') : t('leaderboard.viewAllCount')}
                    </button>
                    {user && (
                      <div className="text-xs sm:text-sm text-blue-700 mt-2 truncate">{user.displayName || user.email}</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Recommended Quizzes Section */}
        {user && (
          <RecommendedSection userId={user.uid} />
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;