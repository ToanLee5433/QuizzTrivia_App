import React, { useState } from 'react';
import { Star, Send, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { reviewService } from '../services/reviewService';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';

interface ReviewFormProps {
  quizId: string;
  onReviewSubmitted: () => void;
  onClose: () => void;
  existingReview?: {
    id: string;
    rating: number;
    comment: string;
  };
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  quizId,
  onReviewSubmitted,
  onClose,
  existingReview
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Bạn cần đăng nhập để đánh giá');
      return;
    }

    if (rating === 0) {
      toast.error('Vui lòng chọn số sao');
      return;
    }

    setSubmitting(true);
    try {
      if (existingReview) {
        // Update existing review
        await reviewService.updateReview(existingReview.id, {
          rating,
          comment
        });
        toast.success('Cập nhật đánh giá thành công!');
      } else {
        // Create new review
        await reviewService.createReview({
          quizId,
          rating,
          comment
        }, user.uid, user.displayName || user.email || '');
        toast.success('Gửi đánh giá thành công!');
      }
      
      onReviewSubmitted();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Có lỗi khi gửi đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {existingReview ? 'Chỉnh sửa đánh giá' : 'Viết đánh giá'}
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đánh giá của bạn
              </label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-1 transition-colors ${
                      star <= rating
                        ? 'text-yellow-400 hover:text-yellow-500'
                        : 'text-gray-300 hover:text-gray-400'
                    }`}
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating ? 'fill-current' : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {rating === 1 && 'Rất không hài lòng'}
                  {rating === 2 && 'Không hài lòng'}
                  {rating === 3 && 'Bình thường'}
                  {rating === 4 && 'Hài lòng'}
                  {rating === 5 && 'Rất hài lòng'}
                </p>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nhận xét (tùy chọn)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Chia sẻ trải nghiệm của bạn về quiz này..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {comment.length}/500 ký tự
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{existingReview ? 'Cập nhật' : 'Gửi đánh giá'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewForm;
