import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../lib/store';
import { QuizResult } from '../../quiz/types';
import { Link } from 'react-router-dom';
import { fetchUserQuizResults } from '../../quiz/store';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../../../lib/firebase/config';
import { toast } from 'react-toastify';
import { getQuizById } from '../../quiz/api';
import { 
  User, 
  Trophy, 
  Clock, 
  Target, 
  TrendingUp, 
  Calendar,
  Star,
  ChevronRight,
  Search,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit3,
  RotateCcw
} from 'lucide-react';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const userResults = useSelector((state: RootState) => state.quiz.userResults);
  const dispatch = useDispatch();
  
  // State management
  const [results, setResults] = useState<QuizResult[]>([]);
  const [quizTitles, setQuizTitles] = useState<{[key: string]: string}>({});
  // const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState<'overview' | 'history' | 'achievements' | 'settings'>('overview');
  
  // Profile edit states
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState(''); // Mật khẩu cũ
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.photoURL || '');
  const [saving, setSaving] = useState(false);
  
  // Enhanced pagination and filtering
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'percentage'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByScore, setFilterByScore] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Load user data
  useEffect(() => {
    if (!user) return;
    // setLoading(true);
    dispatch(fetchUserQuizResults(user.uid) as any);
  }, [user, dispatch]);

  // Process results and calculate stats
  useEffect(() => {
    if (!user) return;
    
    const loadQuizTitles = async () => {
      const titles: {[key: string]: string} = {};
      
      // Load quiz titles for all results
      for (const result of userResults) {
        if (!titles[result.quizId]) {
          try {
            const quiz = await getQuizById(result.quizId);
            titles[result.quizId] = quiz?.title || t('quiz.untitled');
          } catch (error) {
            console.error('Error fetching quiz:', error);
            titles[result.quizId] = t('quiz.untitled');
          }
        }
      }
      
      setQuizTitles(titles);
      setResults(userResults);
    };
    
    if (userResults.length > 0) {
      loadQuizTitles();
    } else {
      setResults([]);
      setQuizTitles({});
    }
    
    // Debug: Log actual result data to see what we're working with
    console.log('🔍 Profile Debug - User Results:', userResults);
    console.log('🔍 Profile Debug - User Results Length:', userResults.length);
    if (userResults.length > 0) {
      console.log('🔍 Sample result data:', {
        sampleResult: userResults[0],
        scoreField: userResults[0]?.score,
        correctAnswers: userResults[0]?.correctAnswers,
        totalQuestions: userResults[0]?.totalQuestions,
        allFields: Object.keys(userResults[0])
      });
      
      // Debug each result individually
      userResults.forEach((result, index) => {
        console.log(`🔍 Result ${index + 1}:`, {
          id: result.id,
          score: result.score,
          correctAnswers: result.correctAnswers,
          totalQuestions: result.totalQuestions,
          timeSpent: result.timeSpent,
          answersLength: result.answers?.length,
          completedAt: result.completedAt,
          quizId: result.quizId,
          resultId: result.id, // This should be the Firestore document ID
          linkWillBe: `/results/${result.id}` // This is what Profile will link to
        });
      });
    } else {
      console.warn('⚠️ No user results found! This could mean:');
      console.warn('   1. User has not completed any quizzes');
      console.warn('   2. Database query is failing');
      console.warn('   3. User ID mismatch');
      console.warn('   4. Firestore permissions issue');
    }
    
    // Calculate comprehensive stats with more accurate scoring
    const totalQuizzes = userResults.length;
    
    // Calculate scores more accurately - prioritize correctAnswers/totalQuestions
    const accurateScores = userResults.map(r => {
      // Always prioritize correctAnswers/totalQuestions if available
      if (typeof r.correctAnswers === 'number' && typeof r.totalQuestions === 'number' && r.totalQuestions > 0) {
        return Math.round((r.correctAnswers / r.totalQuestions) * 100);
      } 
      // Fallback to score field if it exists and is valid
      else if (typeof r.score === 'number' && !isNaN(r.score)) {
        return r.score <= 1 ? Math.round(r.score * 100) : Math.round(r.score);
      }
      // Last resort: 0
      return 0;
    });
    
    const totalScore = accurateScores.reduce((sum, score) => sum + score, 0);
    const totalCorrect = userResults.reduce((sum, r) => sum + (r.correctAnswers || 0), 0);
    const totalQuestions = userResults.reduce((sum, r) => sum + (r.totalQuestions || 0), 0);
    const totalTime = userResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
    
    const averageScore = totalQuizzes > 0 ? totalScore / totalQuizzes : 0;
    const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    const averageTime = totalQuizzes > 0 ? totalTime / totalQuizzes : 0;
    
    // Performance grades - use accurate scores
    const perfectScores = accurateScores.filter(score => score >= 100).length;
    const highScores = accurateScores.filter(score => score >= 80).length;
    
    console.log('📊 Calculated Stats:', {
      totalQuizzes,
      averageScore: averageScore.toFixed(1),
      accuracy: accuracy.toFixed(1),
      perfectScores,
      highScores,
      accurateScores: accurateScores.slice(0, 3) // Show first 3 for debugging
    });
    
    setStats({
      totalQuizzes,
      totalScore,
      averageScore,
      accuracy,
      averageTime,
      perfectScores,
      highScores,
      recentActivity: userResults.slice(0, 5)
    });
    
    // setLoading(false);
  }, [userResults, user]);

  // Filter and sort results
  const filteredResults = results
    .filter(result => {
      // Search filter
      if (searchTerm) {
        const quizTitle = quizTitles[result.quizId] || t('quiz.untitled');
        return quizTitle.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    })
    .filter(result => {
      // Score filter with guard
      const percentage = result.totalQuestions > 0 ? (result.correctAnswers / result.totalQuestions) * 100 : 0;
      switch (filterByScore) {
        case 'high': return percentage >= 80;
        case 'medium': return percentage >= 60 && percentage < 80;
        case 'low': return percentage < 60;
        default: return true;
      }
    })
    .sort((a, b) => {
      let comparison = 0;
      const percentageA = a.totalQuestions > 0 ? (a.correctAnswers / a.totalQuestions) * 100 : 0;
      const percentageB = b.totalQuestions > 0 ? (b.correctAnswers / b.totalQuestions) * 100 : 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
          break;
        case 'score':
          comparison = percentageB - percentageA; // Sort by percentage for score
          break;
        case 'percentage':
          comparison = percentageB - percentageA;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

  // Pagination
  // const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedResults = showAll ? filteredResults : filteredResults.slice(startIndex, startIndex + itemsPerPage);

  const handleProfileUpdate = async () => {
    if (!user || !auth.currentUser) return;
    
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName,
        photoURL: avatarUrl
      });
      toast.success(t('profile.profileUpdateSuccess'));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('profile.profileUpdateError'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!auth.currentUser || !currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('profile.fillAllFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('profile.passwordTooShort'));
      return;
    }

    if (newPassword === currentPassword) {
      toast.error(t('profile.passwordMustDiffer'));
      return;
    }

    if (!auth.currentUser.email) {
      toast.error(t('profile.emailNotFound'));
      return;
    }
    
    setSaving(true);
    try {
      // Tạo credential để reauthenticate
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      
      // XÁC THỰC LẠI NGƯỜI DÙNG TRƯỚC KHI ĐỔI MẬT KHẨU
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Nếu xác thực thành công, đổi mật khẩu mới
      await updatePassword(auth.currentUser, newPassword);
      
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('profile.passwordChangeSuccess'));
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error(t('profile.wrongPassword'));
      } else if (error.code === 'auth/weak-password') {
        toast.error(t('profile.weakPassword'));
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error(t('profile.requiresRecentLogin'));
      } else {
        toast.error(t('profile.passwordChangeError', {message: error.message}));
      }
    } finally {
      setSaving(false);
    }
  };

  const renderStatCard = (icon: React.ReactNode, title: string, value: string | number, subtitle?: string, color: string = 'bg-blue-500') => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-full ${color}`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-600">{title}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuizHistoryItem = (result: QuizResult) => {
    console.log('🔍 Rendering quiz result (RAW DATA):', {
      id: result.id,
      correctAnswers: result.correctAnswers,
      totalQuestions: result.totalQuestions,
      score: result.score,
      quizId: result.quizId,
      rawResult: result
    });
    
    // Calculate percentage using consistent logic
    let percentage = 0;
    let calculationMethod = 'none';
    
    // Primary: Use correctAnswers/totalQuestions if available
    if (typeof result.correctAnswers === 'number' && typeof result.totalQuestions === 'number' && result.totalQuestions > 0) {
      percentage = Math.round((result.correctAnswers / result.totalQuestions) * 100);
      calculationMethod = 'answers_calculation';
    } 
    // Fallback: Use score field
    else if (typeof result.score === 'number' && !isNaN(result.score)) {
      percentage = result.score <= 1 ? Math.round(result.score * 100) : Math.round(result.score);
      calculationMethod = result.score <= 1 ? 'score_decimal' : 'score_percentage';
    } 
    // Last resort: 0
    else {
      console.warn('⚠️ No valid score data found for result:', result.id);
      calculationMethod = 'fallback_zero';
      percentage = 0;
    }
    
    console.log('💯 Score calculation result:', {
      method: calculationMethod,
      finalPercentage: percentage,
      rawScore: result.score,
      correctAnswers: result.correctAnswers,
      totalQuestions: result.totalQuestions
    });
    
    const getScoreColor = (percent: number) => {
      if (percent >= 90) return 'text-green-600 bg-green-50';
      if (percent >= 70) return 'text-blue-600 bg-blue-50';
      if (percent >= 50) return 'text-yellow-600 bg-yellow-50';
      return 'text-red-600 bg-red-50';
    };

    return (
      <div key={result.id} className="bg-white rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">{quizTitles[result.quizId] || 'Quiz không tên'}</h4>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center space-x-1">
                <Target className="w-4 h-4" />
                <span>{result.correctAnswers}/{result.totalQuestions}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{Math.round((result.timeSpent || 0) / 60)}p</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(result.completedAt).toLocaleDateString('vi-VN')}</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(percentage)}`}>
              {percentage}%
            </div>
            <Link
              to={`/quiz/${result.quizId}/reviews`}
              className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
              title="Xem lại quiz"
            >
              <RotateCcw className="w-4 h-4" />
            </Link>
            <Link
              to={`/quiz-result/${result.id}`}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Xem kết quả chi tiết"
            >
              <Eye className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{t('profile.loginRequired')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{user.displayName || user.email}</h1>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500 mt-1">{t('profile.memberSince')} {new Date().toLocaleDateString('vi-VN')}</p>
            </div>
            <button
              onClick={() => setTab('settings')}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: t('profile.tabs.overview'), icon: TrendingUp },
              { id: 'history', label: t('profile.tabs.history'), icon: Clock },
              { id: 'achievements', label: t('profile.tabs.achievements'), icon: Trophy },
              { id: 'settings', label: t('profile.tabs.settings'), icon: User }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  tab === id 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {tab === 'overview' && stats && (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {renderStatCard(
                <Trophy className="w-6 h-6 text-white" />,
                t('profile.stats.completedQuizzes'),
                stats.totalQuizzes,
                undefined,
                'bg-yellow-500'
              )}
              {renderStatCard(
                <Star className="w-6 h-6 text-white" />,
                t('profile.stats.averageScore'),
                stats.averageScore.toFixed(1),
                t('profile.stats.onTotal'),
                'bg-blue-500'
              )}
              {renderStatCard(
                <Target className="w-6 h-6 text-white" />,
                t('profile.stats.accuracy'),
                `${stats.accuracy.toFixed(1)}%`,
                t('profile.stats.correctRate'),
                'bg-green-500'
              )}
              {renderStatCard(
                <TrendingUp className="w-6 h-6 text-white" />,
                t('profile.stats.highScores'),
                `${stats.highScores}/${stats.totalQuizzes}`,
                t('profile.stats.over80'),
                'bg-purple-500'
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('profile.recentActivity')}</h3>
              <div className="space-y-4">
                {stats.recentActivity.map((result: QuizResult) => renderQuizHistoryItem(result))}
              </div>
              {stats.totalQuizzes > 5 && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setTab('history')}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 mx-auto"
                  >
                    <span>{t('profile.viewAllHistory')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div>
            {/* Filters and Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('profile.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <select
                    value={filterByScore}
                    onChange={(e) => setFilterByScore(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">{t('profile.filters.score.all')}</option>
                    <option value="high">{t('profile.filters.score.high')}</option>
                    <option value="medium">{t('profile.filters.score.medium')}</option>
                    <option value="low">{t('profile.filters.score.low')}</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{t('profile.sort.label')}:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="date">{t('profile.sort.date')}</option>
                      <option value="score">{t('profile.sort.score')}</option>
                      <option value="percentage">{t('profile.sort.percentage')}</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>{t('profile.pagination.perPage10')}</option>
                    <option value={25}>{t('profile.pagination.perPage25')}</option>
                    <option value={50}>{t('profile.pagination.perPage50')}</option>
                    <option value={100}>{t('profile.pagination.perPage100')}</option>
                  </select>

                  {filteredResults.length > itemsPerPage && (
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      {showAll ? t('profile.pagination.paginate') : t('profile.viewAllCount')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {paginatedResults.length > 0 ? (
                paginatedResults.map(result => renderQuizHistoryItem(result))
              ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('profile.noResults')}</h3>
                    <p className="text-gray-600 mb-4">{t('profile.noResultsDesc')}</p>
                    <Link
                      to="/quizzes"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {t('quiz.exploreQuizzes')}
                    </Link>
                  </div>
                )}
            </div>
            
            {/* Pagination */}
            {!showAll && filteredResults.length > itemsPerPage && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing results
                  </p>
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-1 border border-gray-300 rounded text-sm">
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-600">
                      Page info
                    </span>
                  </div>
                </div>
              </div>
            )}
        </div>
        )}

        {tab === 'achievements' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('profile.achievements')}</h3>
              <div className="text-center py-8">
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">{t('profile.achievementSystem')}</h4>
                <p className="text-gray-600">{t('profile.inDevelopment')}</p>
              </div>
            </div>
        )}

        {tab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('profile.settings.title')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.displayName')}</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.avatarUrl')}</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleProfileUpdate}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? t('profile.updating') : t('profile.updateProfile')}
                </button>
              </div>
            </div>

            {/* Password Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('profile.changePassword')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.currentPassword')}</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('profile.currentPasswordRequired')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.newPassword')}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      newPassword && newPassword.length < 6 ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder={t('profile.passwordTooShort')}
                  />
                  {newPassword && newPassword.length < 6 && (
                    <p className="text-xs text-red-500 mt-1">{t('profile.passwordTooShort')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.confirmNewPassword')}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      confirmPassword && newPassword !== confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder={t('profile.passwordMismatch')}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">{t('profile.passwordMismatch')}</p>
                  )}
                </div>
                <button
                  onClick={handlePasswordUpdate}
                  disabled={
                    saving || 
                    !currentPassword || 
                    !newPassword || 
                    !confirmPassword ||
                    newPassword.length < 6 ||
                    newPassword !== confirmPassword ||
                    newPassword === currentPassword
                  }
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? t('profile.authenticating') : t('profile.changePassword')}
                </button>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>⚠️ {t('profile.currentPasswordRequired')}</p>
                    <p>✓ {t('profile.passwordMinLength')}</p>
                    <p>✓ {t('profile.passwordMustDiffer')}</p>
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
