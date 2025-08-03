import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../lib/store';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { toast } from 'react-toastify';

interface QuizReview {
  id: string;
  quizId: string;
  userId: string;
  userName: string;
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
  const user = useSelector((state: RootState) => state.auth.user);
  const [reviews, setReviews] = useState<QuizReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [hasUserReviewed, setHasUserReviewed] = useState(false);

  // Load existing reviews
  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        const reviewsQuery = query(
          collection(db, 'quizReviews'),
          where('quizId', '==', quizId),
          orderBy('createdAt', 'desc')
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
        
        setReviews(reviewsData);
        
        // Check if user has already reviewed
        if (user) {
          const userReview = reviewsData.find(r => r.userId === user.uid);
          setHasUserReviewed(!!userReview);
        }
      } catch (error) {
        console.error('Error loading reviews:', error);
        // Mock reviews for demo
        const mockReviews: QuizReview[] = [
          {
            id: '1',
            quizId,
            userId: 'user1',
            userName: 'Nguyễn Văn A',
            rating: 5,
            comment: 'Quiz rất hay và bổ ích! Câu hỏi được thiết kế tốt.',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          },
          {
            id: '2',
            quizId,
            userId: 'user2',
            userName: 'Trần Thị B',
            rating: 4,
            comment: 'Nội dung tốt nhưng có vài câu hơi khó.',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
          },
          {
            id: '3',
            quizId,
            userId: 'user3',
            userName: 'Lê Văn C',
            rating: 5,
            comment: 'Tuyệt vời! Học được nhiều kiến thức mới.',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        ];
        setReviews(mockReviews);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [quizId, user]);

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error('Bạn cần đăng nhập để đánh giá quiz');
      return;
    }

    if (userRating === 0) {
      toast.error('Vui lòng chọn số sao đánh giá');
      return;
    }

    if (userComment.trim().length < 10) {
      toast.error('Nhận xét cần ít nhất 10 ký tự');
      return;
    }

    try {
      setSubmitting(true);
      
      const newReview: Omit<QuizReview, 'id'> = {
        quizId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Người dùng ẩn danh',
        rating: userRating,
        comment: userComment.trim(),
        createdAt: new Date()
      };

      await addDoc(collection(db, 'quizReviews'), newReview);
      
      // Add to local state
      setReviews(prev => [{ ...newReview, id: Date.now().toString() }, ...prev]);
      setHasUserReviewed(true);
      setUserRating(0);
      setUserComment('');
      
      toast.success('Cảm ơn bạn đã đánh giá quiz!');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Có lỗi xảy ra khi gửi đánh giá');
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
        <h3 className="text-2xl font-bold text-gray-900">💬 Đánh giá Quiz</h3>
        <div className="flex items-center space-x-2">
          <StarRating rating={Math.round(averageRating)} readonly />
          <span className="text-lg font-semibold text-gray-700">
            {averageRating.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500">
            ({reviews.length} đánh giá)
          </span>
        </div>
      </div>

      {/* Submit Review Form */}
      {showSubmitForm && user && !hasUserReviewed && (
        <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Đánh giá {quizTitle}
          </h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Đánh giá của bạn:
            </label>
            <StarRating 
              rating={userRating} 
              onRatingChange={setUserRating}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nhận xét:
            </label>
            <textarea
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              placeholder="Chia sẻ cảm nhận của bạn về quiz này..."
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
            {submitting ? '⏳ Đang gửi...' : '📤 Gửi đánh giá'}
          </button>
        </div>
      )}

      {/* User already reviewed */}
      {hasUserReviewed && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            ✅ Bạn đã đánh giá quiz này. Cảm ơn phản hồi của bạn!
          </p>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">💬</div>
            <p>Chưa có đánh giá nào</p>
            <p className="text-sm">Hãy là người đầu tiên đánh giá quiz này!</p>
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
                  {review.createdAt.toLocaleDateString('vi-VN')}
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
