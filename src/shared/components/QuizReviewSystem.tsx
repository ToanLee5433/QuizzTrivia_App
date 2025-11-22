import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../lib/store';
import { collection, addDoc, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDate } from '../../lib/utils/helpers';

interface QuizReview {
  id: string;
  quizId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: Date;
}

interface QuizReviewSystemProps {
  quizId: string;
  quizTitle?: string;
  showSubmitForm?: boolean;
}

const QuizReviewSystem: React.FC<QuizReviewSystemProps> = ({ 
  quizId, 
  quizTitle = 'Quiz này',
  showSubmitForm = true 
}) => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const { notifyQuizReviewed } = useNotifications();
  const [reviews, setReviews] = useState<QuizReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [hasUserReviewed, setHasUserReviewed] = useState(false);

  // Load reviews function
  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      
      // ✅ FIXED: Added limit to prevent loading thousands of reviews
      const reviewsQuery = query(
        collection(db, 'quizReviews'),
        where('quizId', '==', quizId),
        limit(100) // Only load 100 most recent reviews
      );
      
      const querySnapshot = await getDocs(reviewsQuery);
      const reviewsData: QuizReview[] = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        reviewsData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as QuizReview);
      });
      
      // Sort in memory instead of in Firestore
      reviewsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setReviews(reviewsData);
      
      // Allow multiple reviews - removed check
      setHasUserReviewed(false);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [quizId, user]);

  // Load existing reviews
  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error(t('quiz.reviews.loginRequired'));
      return;
    }

    if (userRating === 0) {
      toast.error(t('quiz.reviews.ratingRequired'));
      return;
    }

    if (userComment.trim().length < 10) {
      toast.error(t('quiz.reviews.commentTooShort'));
      return;
    }

    try {
      setSubmitting(true);
      
      // Fetch fresh user data from Firestore to get latest photoURL
      let userPhotoURL = user.photoURL || '';
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userPhotoURL = userData.photoURL || '';
          console.log('🖼️ Fetched photoURL from Firestore:', userPhotoURL);
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch user photoURL from Firestore, using auth photoURL:', err);
      }
      
      console.log('🎨 Creating review with user data:', {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        authPhotoURL: user.photoURL,
        firestorePhotoURL: userPhotoURL,
        willUsePhotoURL: userPhotoURL,
        hasPhotoURL: !!userPhotoURL
      });
      
      const newReview: Omit<QuizReview, 'id'> = {
        quizId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Người dùng ẩn danh',
        userAvatar: userPhotoURL,
        rating: userRating,
        comment: userComment.trim(),
        createdAt: new Date()
      };
      
      console.log('📝 Review object to save:', {
        userName: newReview.userName,
        userAvatar: newReview.userAvatar,
        hasAvatar: !!newReview.userAvatar
      });

      await addDoc(collection(db, 'quizReviews'), newReview);
      
      // Reload all reviews to show the new one
      await loadReviews();

      // Get quiz creator and send notification
      try {
        const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
        if (quizDoc.exists()) {
          const quizData = quizDoc.data();
          if (quizData.createdBy && quizData.createdBy !== user.uid) {
            await notifyQuizReviewed(
              quizData.createdBy,
              quizId,
              quizTitle,
              newReview.userName,
              userRating,
              userComment.trim()
            );
          }
        }
      } catch (notifError) {
        console.error('Error sending review notification:', notifError);
        // Don't fail the review submission if notification fails
      }

      setUserRating(0);
      setUserComment('');
      
      toast.success(t('quiz.reviews.submitSuccess'));
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(t('quiz.reviews.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating: React.FC<{ rating: number; onRatingChange?: (rating: number) => void; readonly?: boolean }> = ({ 
    rating, 
    onRatingChange, 
    readonly = false 
  }) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onRatingChange?.(star)}
            className={`text-2xl transition-all duration-200 ${
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            }`}
          >
            {star <= rating ? '⭐' : '☆'}
          </button>
        ))}
      </div>
    );
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">💬 {t('quiz.reviews.title')}</h3>
        <div className="flex items-center space-x-2">
          <StarRating rating={Math.round(averageRating)} readonly />
          <span className="text-lg font-semibold text-gray-700">
            {averageRating.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500">
            ({reviews.length} {t('quiz.reviews.reviewsCount')})
          </span>
        </div>
      </div>

      {/* Submit Review Form */}
      {showSubmitForm && user && !hasUserReviewed && (
        <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            {t('quiz.reviews.reviewQuiz', {quizTitle})}
          </h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('quiz.reviews.yourRating')}:
            </label>
            <StarRating 
              rating={userRating} 
              onRatingChange={setUserRating}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('quiz.reviews.comment')}:
            </label>
            <textarea
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              placeholder={t('quiz.reviews.commentPlaceholder')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              maxLength={500}
            />
            <div className="text-right text-sm text-gray-500 mt-1">
              {userComment.length}/500
            </div>
          </div>
          
          <button
            onClick={handleSubmitReview}
            disabled={submitting || userRating === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {submitting ? `⏳ ${t('quiz.reviews.submitting')}` : `📤 ${t('quiz.reviews.submitReview')}`}
          </button>
        </div>
      )}

      {/* Removed block on multiple reviews - users can now submit multiple reviews */}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">💬</div>
            <p>{t('quiz.reviews.noReviews')}</p>
            <p className="text-sm">{t('quiz.reviews.beFirst')}</p>
          </div>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="font-semibold text-gray-900">{review.userName}</h5>
                  <StarRating rating={review.rating} readonly />
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(review.createdAt, 'long')}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed">{review.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuizReviewSystem;
