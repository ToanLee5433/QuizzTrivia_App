import React, { useState } from 'react';
import { Star, Send, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { reviewService } from '../services/reviewService';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';

import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  const { user } = useSelector((state: RootState) => state.auth);
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error(t('reviews.loginRequired'));
      return;
    }

    if (rating === 0) {
      toast.error(t('reviews.ratingRequired'));
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
        toast.success(t('reviews.updateSuccess'));
      } else {
        // Fetch fresh user data from Firestore to get latest photoURL
        let userPhotoURL = user.photoURL || '';
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../../../lib/firebase/config');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userPhotoURL = userData.photoURL || '';
            console.log('🖼️ [ReviewForm] Fetched photoURL from Firestore:', userPhotoURL);
          }
        } catch (err) {
          console.warn('⚠️ [ReviewForm] Could not fetch photoURL, using auth photoURL:', err);
        }
        
        console.log('🎨 [ReviewForm] Creating review with photoURL:', userPhotoURL);
        
        // Create new review
        await reviewService.createReview({
          quizId,
          rating,
          comment
        }, user.uid, user.displayName || user.email || '', userPhotoURL);
        toast.success(t('reviews.submitSuccess'));
      }
      
      onReviewSubmitted();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(t('reviews.submitError'));
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
              {existingReview ? t('reviews.editReview') : t('reviews.writeReview')}
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
                {t('reviews.yourRating')}
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
                  {t(`reviews.ratingDescriptions.${rating}`)}
                </p>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('reviews.commentOptional')}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={t('placeholders.shareExperience')}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('reviews.characterCount', { count: comment.length, max: 500 })}
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >{t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{t("admin.quickActions.modal.sending")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{existingReview ? t('reviews.update') : t('reviews.submitReview')}</span>
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
