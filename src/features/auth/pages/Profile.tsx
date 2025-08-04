import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
  const { user } = useSelector((state: RootState) => state.auth);
  const userResults = useSelector((state: RootState) => state.quiz.userResults);
  const dispatch = useDispatch();
  
  // State management
  const [results, setResults] = useState<QuizResult[]>([]);
  const [quizTitles, setQuizTitles] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
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
            titles[result.quizId] = quiz?.title || 'Quiz không tên';
          } catch (error) {
            console.error('Error fetching quiz:', error);
            titles[result.quizId] = 'Quiz không tên';
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
    if (userResults.length > 0) {
      console.log('🔍 Sample result data:', {
        sampleResult: userResults[0],
        scoreField: userResults[0]?.score,
        correctAnswers: userResults[0]?.correctAnswers,
        totalQuestions: userResults[0]?.totalQuestions
      });
    }
    
    // Calculate comprehensive stats with more accurate scoring
    const totalQuizzes = userResults.length;
    
    // Calculate scores more accurately - prioritize correctAnswers/totalQuestions
    const accurateScores = userResults.map(r => {
      if (r.correctAnswers !== undefined && r.totalQuestions !== undefined && r.totalQuestions > 0) {
        // Calculate percentage from answers (most accurate)
        return (r.correctAnswers / r.totalQuestions) * 100;
      } else if (r.score !== undefined && r.score !== null) {
        // Use provided score, convert if needed
        return r.score <= 1 ? r.score * 100 : r.score;
      }
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
    
    setLoading(false);
  }, [userResults, user]);

  // Filter and sort results
  const filteredResults = results
    .filter(result => {
      // Search filter
      if (searchTerm) {
        const quizTitle = quizTitles[result.quizId] || 'Quiz không tên';
        return quizTitle.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    })
    .filter(result => {
      // Score filter
      const percentage = (result.correctAnswers / result.totalQuestions) * 100;
      switch (filterByScore) {
        case 'high': return percentage >= 80;
        case 'medium': return percentage >= 60 && percentage < 80;
        case 'low': return percentage < 60;
        default: return true;
      }
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
          break;
        case 'score':
          comparison = (a.score || 0) - (b.score || 0);
          break;
        case 'percentage':
          const aPercentage = (a.correctAnswers / a.totalQuestions) * 100;
          const bPercentage = (b.correctAnswers / b.totalQuestions) * 100;
          comparison = aPercentage - bPercentage;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Pagination
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
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
      toast.success('Cập nhật profile thành công!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Có lỗi khi cập nhật profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!auth.currentUser || !currentPassword || !newPassword || !confirmPassword) {
      toast.error('Vui lòng nhập đầy đủ tất cả các trường');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword === currentPassword) {
      toast.error('Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    if (!auth.currentUser.email) {
      toast.error('Không tìm thấy email người dùng');
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
      toast.success('Đổi mật khẩu thành công!');
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Mật khẩu cũ không đúng');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Mật khẩu mới quá yếu. Vui lòng chọn mật khẩu mạnh hơn (ít nhất 6 ký tự)');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng xuất và đăng nhập lại');
      } else {
        toast.error('Có lỗi khi đổi mật khẩu: ' + error.message);
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
    
    // Handle different ways score might be calculated with improved logic
    let percentage = 0;
    let calculationMethod = 'none';
    
    // Prioritize correctAnswers/totalQuestions calculation (most accurate)
    if (result.correctAnswers !== undefined && result.totalQuestions !== undefined && result.totalQuestions > 0) {
      percentage = Math.round((result.correctAnswers / result.totalQuestions) * 100);
      calculationMethod = 'answers_calculation';
    } else if (result.score !== undefined && result.score !== null) {
      // Use score as fallback, check if it's decimal (0-1) or percentage (0-100)
      if (result.score <= 1) {
        percentage = Math.round(result.score * 100);
        calculationMethod = 'score_decimal';
      } else {
        percentage = Math.round(result.score);
        calculationMethod = 'score_percentage';
      }
    } else {
      // No valid data for calculation
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
              to={`/results/${result.id}`}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Xem kết quả"
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
          <p className="text-gray-600">Vui lòng đăng nhập để xem profile</p>
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
              <p className="text-sm text-gray-500 mt-1">Thành viên từ {new Date().toLocaleDateString('vi-VN')}</p>
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
              { id: 'overview', label: 'Tổng quan', icon: TrendingUp },
              { id: 'history', label: 'Lịch sử Quiz', icon: Clock },
              { id: 'achievements', label: 'Thành tích', icon: Trophy },
              { id: 'settings', label: 'Cài đặt', icon: User }
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
                'Quiz đã hoàn thành',
                stats.totalQuizzes,
                undefined,
                'bg-yellow-500'
              )}
              {renderStatCard(
                <Star className="w-6 h-6 text-white" />,
                'Điểm trung bình',
                stats.averageScore.toFixed(1),
                'Trên tổng số quiz',
                'bg-blue-500'
              )}
              {renderStatCard(
                <Target className="w-6 h-6 text-white" />,
                'Độ chính xác',
                `${stats.accuracy.toFixed(1)}%`,
                'Tỷ lệ trả lời đúng',
                'bg-green-500'
              )}
              {renderStatCard(
                <TrendingUp className="w-6 h-6 text-white" />,
                'Điểm cao',
                `${stats.highScores}/${stats.totalQuizzes}`,
                'Quiz đạt trên 80%',
                'bg-purple-500'
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Hoạt động gần đây</h3>
              <div className="space-y-4">
                {stats.recentActivity.map((result: QuizResult) => renderQuizHistoryItem(result))}
              </div>
              {stats.totalQuizzes > 5 && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setTab('history')}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 mx-auto"
                  >
                    <span>Xem tất cả lịch sử</span>
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
                      placeholder="Tìm kiếm quiz..."
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
                    <option value="all">Tất cả điểm</option>
                    <option value="high">Cao (≥80%)</option>
                    <option value="medium">Trung bình (60-79%)</option>
                    <option value="low">{"Thấp (<60%)"}</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Sắp xếp:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="date">Ngày</option>
                      <option value="score">Điểm</option>
                      <option value="percentage">Phần trăm</option>
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
                    <option value={10}>10/trang</option>
                    <option value={25}>25/trang</option>
                    <option value={50}>50/trang</option>
                    <option value={100}>100/trang</option>
                  </select>

                  {filteredResults.length > itemsPerPage && (
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      {showAll ? 'Phân trang' : `Xem tất cả (${filteredResults.length})`}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4 mb-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Đang tải...</p>
                </div>
              ) : paginatedResults.length > 0 ? (
                paginatedResults.map(result => renderQuizHistoryItem(result))
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                  <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có kết quả nào</h3>
                  <p className="text-gray-600 mb-4">Bạn chưa hoàn thành quiz nào. Hãy bắt đầu làm quiz đầu tiên!</p>
                  <Link
                    to="/quizzes"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Khám phá Quiz
                  </Link>
                </div>
              )}
            </div>

            {/* Pagination */}
            {!showAll && totalPages > 1 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Hiển thị {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredResults.length)} trong tổng {filteredResults.length} kết quả
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Trước
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-600">
                      Trang {currentPage}/{totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'achievements' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Thành tích</h3>
              <div className="text-center py-8">
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Hệ thống thành tích</h4>
                <p className="text-gray-600">Tính năng đang được phát triển</p>
              </div>
            </div>
        )}

        {tab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Thông tin cá nhân</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL Avatar</label>
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
                  {saving ? 'Đang cập nhật...' : 'Cập nhật Profile'}
                </button>
              </div>
            </div>

            {/* Password Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Đổi mật khẩu</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập mật khẩu hiện tại để xác thực"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      newPassword && newPassword.length < 6 ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  />
                  {newPassword && newPassword.length < 6 && (
                    <p className="text-xs text-red-500 mt-1">Mật khẩu phải có ít nhất 6 ký tự</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      confirmPassword && newPassword !== confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Nhập lại mật khẩu mới để xác nhận"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Mật khẩu xác nhận không khớp</p>
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
                  {saving ? 'Đang xác thực...' : 'Đổi mật khẩu'}
                </button>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>⚠️ Bạn cần nhập đúng mật khẩu hiện tại để xác thực trước khi đổi mật khẩu mới</p>
                  <p>✓ Mật khẩu mới phải có ít nhất 6 ký tự</p>
                  <p>✓ Mật khẩu mới phải khác mật khẩu hiện tại</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
