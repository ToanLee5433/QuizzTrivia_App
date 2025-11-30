import React, { useState } from 'react';
import { Star, ThumbsUp, Flag, Calendar, MoreVertical } from 'lucide-react';
import { QuizReview } from '../types/review';
import { useTranslation } from 'react-i18next';

interface ReviewListProps {
  reviews: QuizReview[];
  loading: boolean;
  onHelpfulClick?: (reviewId: string) => void;
  onReportClick?: (reviewId: string) => void;
}

const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  loading,
  onHelpfulClick,
  onReportClick
}) => {
  const { t } = useTranslation();
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  const toggleExpanded = (reviewId: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingText = (rating: number) => {
    return t(`reviews.ratingTexts.${rating}`, '');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-1/4 mb-1"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded w-full"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('reviews.noReviews')}</h3>
        <p className="text-gray-600">{t('reviews.beFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const isExpanded = expandedReviews.has(review.id);
        const shouldShowExpand = review.comment && review.comment.length > 200;
        const displayComment = shouldShowExpand && !isExpanded 
          ? review.comment.substring(0, 200) + '...'
          : review.comment;

        return (
          <div key={review.id} className="bg-white rounded-lg border border-gray-100 p-6 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {review.userAvatar && review.userAvatar.trim() ? (
                  <img
                    src={review.userAvatar}
                    alt={review.userName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {(review.userName || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-gray-900">{review.userName || t('reviews.anonymous')}</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(review.createdAt)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-3 mb-4">
              {renderStars(review.rating)}
              <span className="text-sm font-medium text-gray-700">
                {getRatingText(review.rating)}
              </span>
              <span className="text-sm text-gray-500">
                {t('reviews.stars', { rating: review.rating })}
              </span>
            </div>

            {/* Comment */}
            {review.comment && (
              <div className="mb-4">
                <p className="text-gray-700 leading-relaxed">
                  {displayComment}
                </p>
                {shouldShowExpand && (
                  <button
                    onClick={() => toggleExpanded(review.id)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {isExpanded ? t('reviews.collapse') : t('reviews.expand')}
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => onHelpfulClick?.(review.id)}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-green-600 transition-colors"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{t('reviews.helpfulCount', { count: review.helpful?.length || 0 })}</span>
                </button>
                
                <button
                  onClick={() => onReportClick?.(review.id)}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  <span>{t('reviews.report')}</span>
                </button>
              </div>

              {review.updatedAt && review.updatedAt !== review.createdAt && (
                <span className="text-xs text-gray-500">
                  {t('reviews.edited', { date: formatDate(review.updatedAt) })}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReviewList;
