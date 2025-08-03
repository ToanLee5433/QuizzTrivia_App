import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Quiz } from '../types';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { toast } from 'react-toastify';
import { Star, Eye } from 'lucide-react';
import { reviewService } from '../services/reviewService';
import { QuizReviewStats } from '../types/review';

interface QuizCardProps {
  quiz: Quiz;
  viewMode?: 'grid' | 'list';
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, viewMode = 'grid' }) => {
  // **THÊM MỚI**: Helper functions
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getCompletionStatus = () => {
    if (quiz.isCompleted) {
      return (
        <div className="flex items-center text-green-600 text-sm">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Completed {quiz.score}%
        </div>
      );
    }
    return null;
  };

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
      toast.success(isFavorite ? 'Đã bỏ yêu thích quiz!' : 'Đã thêm vào yêu thích!');
      // Nếu đang ở trang Favorites, refetch lại
      if (window.location.pathname.startsWith('/favorites')) {
        window.location.reload();
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật yêu thích!');
    } finally {
      setFavLoading(false);
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
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                  {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                </span>
                {quiz.isCompleted && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                    ✓ Hoàn thành
                  </span>
                )}
              </div>
            </div>
            
            <p className="text-gray-600 text-sm mb-3 line-clamp-1">{quiz.description}</p>
            
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
                {quiz.questions.length} câu hỏi
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
                  {quiz.totalPlayers} lượt chơi
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
                    +{quiz.tags.length - 4}
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
              className={`p-2 border rounded-lg transition-colors ${isFavorite ? 'bg-yellow-100 border-yellow-400 text-yellow-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              title={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích quiz này'}
            >
              <svg className="w-5 h-5" fill={isFavorite ? 'gold' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
            <Link
              to={`/quiz/${quiz.id}/reviews`}
              className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="Xem đánh giá"
            >
              <Eye className="w-5 h-5" />
            </Link>
            <Link
              to={`/quiz/${quiz.id}/preview`}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
              onClick={() => console.log('Quiz card clicked:', quiz.id, quiz.title)}
            >
              {quiz.isCompleted ? 'Chơi lại' : 'Xem chi tiết'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (existing code)
  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-400 group transform hover:scale-105 cursor-pointer flex flex-col h-full">
      {/* **THÊM MỚI**: Image Header */}
      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
        {quiz.imageUrl ? (
          <img 
            src={quiz.imageUrl} 
            alt={quiz.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-6xl font-bold opacity-20">
              {quiz.category.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
        
        {/* **THÊM MỚI**: Overlay badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(quiz.difficulty)}`}>
            {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
          </span>
          {quiz.isPublic && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
              Public
            </span>
          )}
        </div>

        {/* **THÊM MỚI**: Stats overlay */}
        <div className="absolute bottom-4 right-4 text-white text-sm">
          <div className="flex items-center space-x-4">
            {quiz.attempts && (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {quiz.attempts}
              </div>
            )}
            {quiz.averageScore && (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
                {Math.round(quiz.averageScore)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
            {quiz.title}
          </h3>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {quiz.description}
        </p>

        {/* **THÊM MỚI**: Quiz metadata */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {quiz.category}
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(quiz.duration)}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {quiz.questions.length} questions
            </div>
            {quiz.totalPlayers && (
              <div className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                {quiz.totalPlayers} played
              </div>
            )}
          </div>

          {/* Rating Display */}
          {reviewStats && reviewStats.totalReviews > 0 && (
            <div className="flex justify-center pt-2">
              <RatingDisplay 
                rating={reviewStats.averageRating} 
                reviewCount={reviewStats.totalReviews}
                size="md" 
              />
            </div>
          )}
        </div>

        {/* **THÊM MỚI**: Completion status */}
        {getCompletionStatus()}

        {/* **THÊM MỚI**: Tags */}
        {quiz.tags && quiz.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {quiz.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
              >
                {tag}
              </span>
            ))}
            {quiz.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                +{quiz.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          <Link
            to={`/quiz/${quiz.id}`}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium text-center hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
            onClick={() => console.log('Quiz card clicked:', quiz.id, quiz.title)}
          >
            {quiz.isCompleted ? 'Retake Quiz' : 'Start Quiz'}
          </Link>
          <button
            onClick={handleToggleFavorite}
            disabled={!user || favLoading}
            className={`px-3 py-3 border rounded-lg transition-colors flex items-center ${isFavorite ? 'bg-yellow-100 border-yellow-400 text-yellow-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            title={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích quiz này'}
          >
            <svg className="w-5 h-5" fill={isFavorite ? 'gold' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <Link
            to={`/quiz/${quiz.id}/reviews`}
            className="px-3 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            title="Xem đánh giá"
          >
            <Eye className="w-5 h-5" />
          </Link>
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
