import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Quiz } from '../types';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
// import { toast } from 'react-toastify';
import { Heart, Star, Eye, Play, HardDrive } from 'lucide-react';
import { reviewService } from '../services/reviewService';
import { QuizReviewStats } from '../types/review';
import SafeHTML from '../../../shared/components/ui/SafeHTML';
import { useTranslation } from 'react-i18next';
import { downloadManager } from '../../offline/DownloadManager';
import { toast } from 'react-toastify';


interface QuizCardProps {
  quiz: Quiz;
  viewMode?: 'grid' | 'list';
  onStartQuiz?: (quiz: Quiz) => void;
}

  const QuizCard: React.FC<QuizCardProps> = ({ quiz, viewMode = 'grid', onStartQuiz }) => {
  const { t } = useTranslation();

  const translate = useCallback(
    (key: string, fallback: string, options?: Record<string, unknown>): string => {
      const value = t(key, options as any);
      if (typeof value === 'string') {
        return value === key ? fallback : value;
      }
      return fallback;
    },
    [t]
  );

  const resources = Array.isArray(quiz.resources) ? quiz.resources : [];
  const hasResources = resources.length > 0;
  const resourceCount = resources.length;

  const isPasswordProtected = useMemo(() => {
    const extended = quiz as Partial<{ havePassword?: string; visibility?: string }>;
    return extended.havePassword === 'password' || extended.visibility === 'password';
  }, [quiz]);

  // **THÊM MỚI**: Helper functions
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = useCallback(
    (minutes: number) => {
      if (!Number.isFinite(minutes)) {
        return '';
      }

      if (minutes < 60) {
        return translate('quiz.card.duration.minutes', `${minutes} phút`, { count: minutes });
      }

      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      if (remainingMinutes > 0) {
        return translate('quiz.card.duration.hoursAndMinutes', `${hours} giờ ${remainingMinutes} phút`, {
          hours,
          minutes: remainingMinutes,
        });
      }

      return translate('quiz.card.duration.hours', `${hours} giờ`, { count: hours });
    },
    [translate]
  );

  const getDifficultyLabel = useCallback(
    (difficulty: Quiz['difficulty']) =>
      translate(`quiz.difficulty.${difficulty}`, difficulty.charAt(0).toUpperCase() + difficulty.slice(1)),
    [translate]
  );

  const getDifficultyBadgeLabel = useCallback(
    (difficulty: Quiz['difficulty']) =>
      translate(`quiz.card.difficultyBadge.${difficulty}`, difficulty.charAt(0).toUpperCase() + difficulty.slice(1)),
    [translate]
  );

  const getResourceLabel = useCallback(
    (count: number) => translate('quiz.card.resources', `📚 ${count} tài liệu học tập`, { count }),
    [translate]
  );

  const getQuestionsLabel = useCallback(
    (count: number) => translate('quiz.card.questions', `${count} câu hỏi`, { count }),
    [translate]
  );

  const getPlayersLabel = useCallback(
    (count: number) => translate('quiz.card.players', `${count} lượt chơi`, { count }),
    [translate]
  );

  const getTagsRemainingLabel = useCallback(
    (count: number) => translate('quiz.card.tagsRemaining', `+${count}`, { count }),
    [translate]
  );

  const getCompletedWithScore = useCallback(
    (score?: number) => translate('quiz.card.completedWithScore', `Đã hoàn thành: ${score ?? 0}%`, { score: score ?? 0 }),
    [translate]
  );

  const getRatingSummary = useCallback(
    (rating: number, count: number) =>
      translate('quiz.card.ratingSummary', `${rating.toFixed(1)} (${count})`, {
        rating: rating.toFixed(1),
        count
      }),
    [translate]
  );

  const favoriteTooltipAdd = useMemo(
    () => translate('quiz.card.favoriteTooltipAdd', 'Yêu thích quiz này'),
    [translate]
  );

  const favoriteTooltipRemove = useMemo(
    () => translate('quiz.card.favoriteTooltipRemove', 'Bỏ yêu thích'),
    [translate]
  );

  const viewReviewsLabel = useMemo(
    () => translate('quiz.card.viewReviews', 'Xem đánh giá'),
    [translate]
  );

  const retakeLabel = useMemo(
    () => translate('quiz.card.retake', '🔄 Chơi lại'),
    [translate]
  );

  const startLabel = useMemo(
    () => translate('quiz.card.start', '🚀 Bắt đầu Quiz'),
    [translate]
  );

  const completedBadgeLabel = useMemo(
    () => translate('quiz.card.completed', '✓ Hoàn thành'),
    [translate]
  );

  const passwordBadgeLabel = useMemo(
    () => translate('quiz.card.passwordRequired', '🔒 Cần mật khẩu'),
    [translate]
  );

  const resourcesHint = useMemo(
    () => translate('quiz.card.resourcesHint', '💡 Xem tài liệu để hiểu sâu hơn trước khi làm bài!'),
    [translate]
  );

  const downloadedLabel = useMemo(
    () => translate('quiz.card.downloaded', 'Đã tải'),
    [translate]
  );

  const downloadLabel = useMemo(
    () => translate('quiz.card.download', 'Tải về'),
    [translate]
  );

  const downloadForOfflineLabel = useMemo(
    () => translate('quiz.card.downloadForOffline', 'Tải về để chơi offline'),
    [translate]
  );

  const downloadSuccessMsg = useMemo(
    () => translate('quiz.card.downloadSuccess', '✅ Đã tải quiz thành công! Bạn có thể chơi offline.'),
    [translate]
  );

  // Helper component for rating display
  const RatingDisplay = ({ rating, reviewCount, size = 'sm' }: { rating: number; reviewCount: number; size?: 'sm' | 'md' }) => {
    const starSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    const textSize = size === 'sm' ? 'text-sm' : 'text-base';
    
    return (
      <div className={`flex items-center gap-1 ${textSize}`}>
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`${starSize} ${
                star <= Math.round(rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="text-gray-600 font-medium">
          {rating.toFixed(1)}
        </span>
        <span className="text-gray-500">
          ({reviewCount})
        </span>
      </div>
    );
  };

  const user = useSelector((state: RootState) => state.auth.user);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [reviewStats, setReviewStats] = useState<QuizReviewStats | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  // Fetch review stats
  useEffect(() => {
    const fetchReviewStats = async () => {
      try {
        const stats = await reviewService.getQuizReviewStats(quiz.id);
        setReviewStats(stats);
      } catch (error) {
        console.error('Error fetching review stats:', error);
      }
    };
    
    fetchReviewStats();
  }, [quiz.id]);

  useEffect(() => {
    if (!user) return;
    const checkFavorite = async () => {
      const favRef = doc(db, 'user_favorites', user.uid);
      const favSnap = await getDoc(favRef);
      if (favSnap.exists()) {
        const data = favSnap.data();
        setIsFavorite(Array.isArray(data.quizIds) && data.quizIds.includes(quiz.id));
      } else {
        setIsFavorite(false);
      }
    };
    checkFavorite();

    // Check if quiz is already downloaded
    const checkDownloaded = async () => {
      try {
        const downloaded = await downloadManager.isQuizDownloaded(quiz.id, user.uid);
        setIsDownloaded(downloaded);
      } catch (error) {
        console.error('Error checking download status:', error);
      }
    };
    checkDownloaded();
  }, [user, quiz.id]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    setFavLoading(true);
    const favRef = doc(db, 'user_favorites', user.uid);
    try {
      const favSnap = await getDoc(favRef);
      if (favSnap.exists()) {
        await updateDoc(favRef, {
          quizIds: isFavorite ? arrayRemove(quiz.id) : arrayUnion(quiz.id)
        });
      } else {
        await setDoc(favRef, {
          quizIds: [quiz.id]
        });
      }
      setIsFavorite(!isFavorite);
      // toast.success(isFavorite ? 'Đã bỏ yêu thích quiz!' : 'Đã thêm vào yêu thích!');
      // Nếu đang ở trang Favorites, refetch lại
      if (window.location.pathname.startsWith('/favorites')) {
        window.location.reload();
      }
    } catch (err) {
      // toast.error('Lỗi khi cập nhật yêu thích!');
    } finally {
      setFavLoading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || isDownloading || isDownloaded) return;

    setIsDownloading(true);
    toast.info('Đang tải quiz...', { autoClose: 2000 });

    try {
      const result = await downloadManager.downloadQuizForOffline(quiz.id, user.uid, (progress) => {
        // Optionally update UI with progress
        console.log(`Download progress: ${progress.progress}%`);
      });
      
      if (result.success) {
        setIsDownloaded(true);
        toast.success(downloadSuccessMsg);
      } else {
        toast.error(`❌ ${result.error || 'Không thể tải quiz. Vui lòng thử lại.'}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('❌ Lỗi khi tải quiz');
    } finally {
      setIsDownloading(false);
    }
  };

  // **THÊM MỚI**: Render list view
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-6">
          {/* Image/Icon */}
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 relative">
            {quiz.imageUrl ? (
              <img src={quiz.imageUrl} alt={quiz.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                {quiz.category.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">{quiz.title}</h3>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                  {getDifficultyLabel(quiz.difficulty)}
                </span>
                {quiz.isCompleted && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                    {completedBadgeLabel}
                  </span>
                )}
                {/* 🔒 Password Badge - Support both old (havePassword) and new (visibility) format */}
                {isPasswordProtected && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 border border-purple-300 text-xs rounded-full font-bold flex items-center gap-1">
                    {passwordBadgeLabel}
                  </span>
                )}
                {/* 🆕 Resource Badge */}
                {hasResources && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs rounded-full font-bold flex items-center gap-1">
                    {getResourceLabel(resourceCount)}
                  </span>
                )}
              </div>
            </div>
            
            <SafeHTML content={quiz.description} className="text-gray-600 text-sm mb-3 line-clamp-1" plainText />
            
            <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {quiz.category}
              </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {getQuestionsLabel(quiz.questionCount || quiz.questions?.length || 0)}
            </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDuration(quiz.duration)}
              </div>
              {quiz.totalPlayers && (
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  {getPlayersLabel(quiz.totalPlayers)}
                </div>
              )}
              {reviewStats && reviewStats.totalReviews > 0 && (
                <RatingDisplay 
                  rating={reviewStats.averageRating} 
                  reviewCount={reviewStats.totalReviews} 
                />
              )}
            </div>

            {/* Tags */}
            {quiz.tags && quiz.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {quiz.tags.slice(0, 4).map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    {tag}
                  </span>
                ))}
                {quiz.tags.length > 4 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    {getTagsRemainingLabel(quiz.tags.length - 4)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleToggleFavorite}
              disabled={!user || favLoading}
              className={`p-2 border rounded-lg transition-colors ${isFavorite ? 'bg-red-100 border-red-400 text-red-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              title={isFavorite ? favoriteTooltipRemove : favoriteTooltipAdd}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <Link
              to={`/quiz/${quiz.id}/reviews`}
              className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title={viewReviewsLabel}
            >
              <Eye className="w-5 h-5" />
            </Link>
            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={!user || isDownloading || isDownloaded}
              className={`p-2 border rounded-lg transition-colors ${
                isDownloaded 
                  ? 'bg-green-100 border-green-400 text-green-600 cursor-not-allowed' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title={isDownloaded ? downloadedLabel : downloadForOfflineLabel}
            >
              {isDownloading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              ) : (
                <HardDrive className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => onStartQuiz?.(quiz)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
            >
              {quiz.isCompleted ? retakeLabel : startLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (existing code)
  return (
    <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-blue-300 group transform hover:scale-105 cursor-pointer flex flex-col h-full">
      {/* **THÊM MỚI**: Image Header */}
      <div className="relative h-48 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 overflow-hidden">
        {quiz.imageUrl ? (
          <img 
            src={quiz.imageUrl} 
            alt={quiz.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-600/20 backdrop-blur-3xl"></div>
            <div className="relative text-white text-6xl font-bold opacity-30 drop-shadow-lg">
              {quiz.category.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-4 left-4 text-white/90 font-semibold text-sm px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              {quiz.category}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent z-10" />
        
        {/* **THÊM MỚI**: Overlay badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-20">
          <span className={`px-3 py-1.5 rounded-2xl text-xs font-semibold backdrop-blur-sm shadow-lg ${getDifficultyColor(quiz.difficulty)}`}>
            {getDifficultyBadgeLabel(quiz.difficulty)}
          </span>
          {/* 🔒 Password Badge - Support both old (havePassword) and new (visibility) format */}
          {isPasswordProtected && (
            <span className="px-3 py-1.5 rounded-2xl text-xs font-semibold bg-purple-500/90 text-white backdrop-blur-sm shadow-lg border border-purple-400">
              {passwordBadgeLabel}
            </span>
          )}
        </div>

        {/* **THÊM MỚI**: Favorite button in overlay */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={handleToggleFavorite}
            disabled={!user || favLoading}
            className={`p-2.5 backdrop-blur-sm rounded-2xl shadow-lg transition-all duration-300 ${isFavorite ? 'bg-red-400/90 border border-red-300 text-red-900' : 'bg-white/20 border border-white/30 text-white hover:bg-white/30'}`}
            title={isFavorite ? favoriteTooltipRemove : favoriteTooltipAdd}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Quiz stats in bottom */}
        <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {quiz.totalPlayers && (
              <div className="flex items-center text-white/90 text-sm bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-2xl">
                <Eye className="w-4 h-4 mr-1.5" />
                {getPlayersLabel(quiz.totalPlayers)}
              </div>
            )}
          </div>
          {reviewStats && reviewStats.totalReviews > 0 && (
            <div className="flex items-center text-white text-sm bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-2xl">
              <Star className="w-4 h-4 mr-1.5 fill-current text-yellow-400" />
              {getRatingSummary(reviewStats.averageRating, reviewStats.totalReviews)}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 flex-1">
            {quiz.title}
          </h3>
        </div>
        
        <SafeHTML content={quiz.description} className="text-gray-600 text-sm mb-6 line-clamp-2 leading-relaxed" plainText />

        {/* **THÊM MỚI**: Quiz metadata */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="font-medium">{quiz.category}</span>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{formatDuration(quiz.duration)}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{getQuestionsLabel(quiz.questionCount || quiz.questions?.length || 0)}</span>
            </div>
            {reviewStats && reviewStats.totalReviews > 0 && (
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
                <span className="font-medium">{getRatingSummary(reviewStats.averageRating, reviewStats.totalReviews)}</span>
              </div>
            )}
          </div>
        </div>

        {/* **THÊM MỚI**: Completion status */}
        {quiz.isCompleted && (
          <div className="flex items-center text-green-600 text-sm mb-4 bg-green-50 px-3 py-2 rounded-2xl border border-green-200">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">{getCompletedWithScore(quiz.score)}</span>
          </div>
        )}

        {/* **THÊM MỚI**: Tags */}
        {quiz.tags && quiz.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {quiz.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-2xl font-medium transition-colors"
              >
                #{tag}
              </span>
            ))}
            {quiz.tags.length > 3 && (
              <span className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-2xl font-medium">
                {getTagsRemainingLabel(quiz.tags.length - 3)}
              </span>
            )}
          </div>
        )}

        {/* 🆕 Learning Resources Badge */}
        {hasResources && (
          <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-800">
              <span className="text-lg">📚</span>
              <span className="font-bold text-sm">
                {getResourceLabel(resourceCount)}
              </span>
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              {resourcesHint}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={() => onStartQuiz?.(quiz)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-semibold text-center transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <Play className="w-5 h-5" />
            <span>{quiz.isCompleted ? retakeLabel : startLabel}</span>
          </button>
          
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Link
              to={`/quiz/${quiz.id}/reviews`}
              className="px-2 py-2 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-600 rounded-lg transition-all duration-300 hover:bg-blue-50 text-xs text-center flex items-center justify-center"
              title={viewReviewsLabel}
            >
              <Eye className="w-4 h-4" />
            </Link>
            
            <button
              onClick={handleDownload}
              disabled={!user || isDownloading || isDownloaded}
              className={`px-2 py-2 rounded-lg text-xs transition-all duration-300 flex items-center justify-center ${
                isDownloaded
                  ? 'bg-green-100 text-green-700 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={isDownloaded ? downloadedLabel : downloadLabel}
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              ) : (
                <HardDrive className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={handleToggleFavorite}
              disabled={favLoading}
              className={`px-2 py-2 rounded-lg text-xs transition-all duration-300 flex items-center justify-center ${
                isFavorite
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={isFavorite ? favoriteTooltipRemove : favoriteTooltipAdd}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const QuizCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-lg animate-pulse h-96 flex flex-col">
    <div className="h-48 bg-gray-200 w-full" />
    <div className="p-6 flex-1 flex flex-col">
      <div className="h-6 bg-gray-200 rounded w-2/3 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-6" />
      <div className="flex gap-2 mt-auto">
        <div className="h-10 w-24 bg-gray-200 rounded" />
        <div className="h-10 w-10 bg-gray-200 rounded" />
      </div>
    </div>
  </div>
);

export default QuizCard;
