import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { reviewService } from '../services/reviewService';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';
import { Quiz } from '../types';
import { getQuizById } from '../api';
import { Star, Users, TrendingUp, MessageSquare, BarChart3, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';

import { useTranslation } from 'react-i18next';
import SafeHTML from '../../../shared/components/ui/SafeHTML';

const QuizReviewsPage: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const { id: quizId } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const loadQuizAndReviews = useCallback(async () => {
    if (!quizId) {
      console.error('❌ No quizId provided');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log('🔄 Starting to load quiz and reviews for:', quizId);
    
    try {
      // Step 1: Load quiz details (REQUIRED)
      console.log('📝 Loading quiz details...');
      let quizData;
      try {
        quizData = await getQuizById(quizId);
        console.log('🔍 Raw quiz data from API:', quizData);
        
        if (!quizData) {
          console.error('❌ Quiz not found in database for ID:', quizId);
          
          // Create a fallback quiz object for testing
          console.log('🔧 Creating fallback quiz for testing...');
          const fallbackQuiz: Quiz = {
            id: quizId,
            title: `Quiz Sample ${quizId}`,
            description: 'Đây là quiz mẫu để test hệ thống đánh giá',
            category: 'General',
            difficulty: 'easy' as const,
            questions: [
              {
                id: '1',
                text: 'Câu hỏi mẫu?',
                type: 'multiple',
                answers: [
                  { id: '1', text: 'Đáp án A', isCorrect: true },
                  { id: '2', text: 'Đáp án B', isCorrect: false },
                  { id: '3', text: 'Đáp án C', isCorrect: false },
                  { id: '4', text: 'Đáp án D', isCorrect: false }
                ],
                explanation: 'Giải thích mẫu',
                points: 10
              }
            ],
            duration: 300,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            isPublished: true,
            tags: ['sample', 'test']
          };
          setQuiz(fallbackQuiz);
          console.log('✅ Using fallback quiz for testing');
        } else {
          console.log('✅ Quiz data loaded successfully:', quizData.title);
          setQuiz(quizData);
        }
      } catch (quizError) {
        console.error('❌ Failed to load quiz:', quizError);
        toast.error(t('quizReviews.errors.notFound'));
        setLoading(false);
        return;
      }

      // Step 2: Load reviews (OPTIONAL - don't fail if reviews fail)
      console.log('📊 Loading reviews...');
      try {
        // Try simple query first to avoid index issues
        const reviewsData = await reviewService.getQuizReviewsSimple(quizId);
        console.log(`✅ Reviews loaded: ${reviewsData.length} reviews found`);
        setReviews(reviewsData || []);

        // Calculate stats from reviews
        if (reviewsData && reviewsData.length > 0) {
          const totalRating = reviewsData.reduce((sum: number, review: any) => sum + (review.rating || 0), 0);
          const averageRating = totalRating / reviewsData.length;
          
          const ratingDistribution = {
            5: reviewsData.filter((r: any) => r.rating === 5).length,
            4: reviewsData.filter((r: any) => r.rating === 4).length,
            3: reviewsData.filter((r: any) => r.rating === 3).length,
            2: reviewsData.filter((r: any) => r.rating === 2).length,
            1: reviewsData.filter((r: any) => r.rating === 1).length
          };

          setStats({
            totalReviews: reviewsData.length,
            averageRating: Math.round(averageRating * 10) / 10,
            ratingDistribution
          });
          console.log(`📈 Stats calculated: ${reviewsData.length} reviews, ${averageRating.toFixed(1)} avg rating`);
        } else {
          console.log('📊 No reviews found, setting empty stats');
          setStats({
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          });
        }
      } catch (reviewError) {
        console.error('⚠️ Error loading reviews:', reviewError);
        
        // Set empty state on error
        setReviews([]);
        setStats({
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        });
        toast.error(t('quizReviews.errors.loadFailed'));
      }

      console.log('🎉 Page loading completed successfully');
    } catch (error) {
      console.error('❌ Critical error in loadQuizAndReviews:', error);
      toast.error(t('quizReviews.errors.pageLoadFailed'));
    } finally {
      // ALWAYS set loading to false
      setLoading(false);
      console.log('✅ Loading state set to false');
    }
  }, [quizId, t]);

  useEffect(() => {
    if (quizId) {
      console.log('🎯 QuizReviewsPage mounted with quizId:', quizId);
      loadQuizAndReviews();
    } else {
      console.error('❌ No quizId provided in URL params');
      setLoading(false);
    }
  }, [quizId, loadQuizAndReviews]);

  const handleReviewSubmitted = async () => {
    console.log('🔄 Review submitted, refreshing data...');
    setShowReviewForm(false);
    
    // Clear current reviews to show loading state
    setReviews([]);
    setLoading(true);
    
    // Add delay to ensure Firebase has processed the write
    setTimeout(() => {
      console.log('⏰ Delay completed, reloading reviews with cache bypass...');
      loadQuizAndReviews();
    }, 1500); // Increased delay to 1.5 seconds
  };

  const handleHelpfulClick = async (reviewId: string) => {
    if (!currentUser?.uid) {
      toast.error(t('quiz.reviews.loginToMarkHelpful'));
      return;
    }

    try {
      const reviewRef = doc(db, 'quiz_reviews', reviewId);
      const reviewDoc = await getDoc(reviewRef);
      
      if (!reviewDoc.exists()) {
        toast.error(t('quiz.reviews.notFound'));
        return;
      }

      const reviewData = reviewDoc.data();
      const helpfulBy = reviewData.helpfulBy || [];
      
      // Toggle helpful status
      if (helpfulBy.includes(currentUser.uid)) {
        // Remove from helpful
        await updateDoc(reviewRef, {
          helpful: (reviewData.helpful || 1) - 1,
          helpfulBy: arrayRemove(currentUser.uid)
        });
        toast.success(t('quiz.reviews.removedFromHelpful'));
      } else {
        // Add to helpful
        await updateDoc(reviewRef, {
          helpful: (reviewData.helpful || 0) + 1,
          helpfulBy: arrayUnion(currentUser.uid)
        });
        toast.success(t('quiz.reviews.markedAsHelpful'));
      }

      // Reload reviews to show updated count
      setTimeout(() => loadQuizAndReviews(), 500);
    } catch (error) {
      console.error('Error marking review as helpful:', error);
      toast.error(t('quiz.reviews.failedToUpdateHelpful'));
    }
  };

  const handleReportClick = async (reviewId: string) => {
    if (!currentUser?.uid) {
      toast.error(t('quiz.reviews.loginToReport'));
      return;
    }

    const reason = prompt(t('quiz.reviews.reportReasonPrompt'));
    if (!reason || reason.trim() === '') {
      return;
    }

    try {
      const reviewRef = doc(db, 'quiz_reviews', reviewId);
      const reviewDoc = await getDoc(reviewRef);
      
      if (!reviewDoc.exists()) {
        toast.error(t('quiz.reviews.notFound'));
        return;
      }

      const reviewData = reviewDoc.data();
      const reportedBy = reviewData.reportedBy || [];
      
      // Check if user already reported
      if (reportedBy.includes(currentUser.uid)) {
        toast.warning(t('quiz.reviews.alreadyReported'));
        return;
      }

      // Add report
      await updateDoc(reviewRef, {
        reports: (reviewData.reports || 0) + 1,
        reportedBy: arrayUnion(currentUser.uid),
        reportReasons: arrayUnion({
          userId: currentUser.uid,
          reason: reason.trim(),
          reportedAt: new Date().toISOString()
        })
      });

      toast.success(t('quiz.reviews.reportedSuccess'));
    } catch (error) {
      console.error('Error reporting review:', error);
      toast.error(t('quiz.reviews.failedToReport'));
    }
  };

  const renderRatingDistribution = () => {
    if (!stats) return null;

    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />{t("admin.stats.ratingDistribution")}
        </h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map(rating => {
            const count = stats.ratingDistribution[rating] || 0;
            const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
            
            return (
              <div key={rating} className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 w-16">
                  <span className="text-sm font-medium">{rating}</span>
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('quizReviews.loading')}</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('quizReviews.empty.notFound')}</h2>
          <p className="text-gray-600 mb-4">{t('quizReviews.empty.notFoundDesc')}</p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >{t("common.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
              <SafeHTML content={quiz.description} className="text-gray-600 mb-4" />
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{quiz.category}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="capitalize">{quiz.difficulty}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>{quiz.questionCount || quiz.questions?.length || 0} {t('quizReviews.questions')}</span>
                </span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  loadQuizAndReviews();
                }}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                title={t('quizReviews.refreshReviews')}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowReviewForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {t('quizReviews.writeReview')}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.averageRating.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-600">{t("multiplayer.avgScore")}</p>
                  <div className="flex items-center mt-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(stats.averageRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalReviews || 0}
                  </p>
                  <p className="text-sm text-gray-600">{t("admin.stats.totalReviews")}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.totalReviews === 0 ? t('quizReviews.noReviewsYet') : t('quizReviews.peopleReviewed')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalReviews > 0 ? Math.round((stats.ratingDistribution[5] + stats.ratingDistribution[4]) / stats.totalReviews * 100) : 0}%
                  </p>
                  <p className="text-sm text-gray-600">{t('quizReviews.positiveReviews')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rating Distribution */}
          <div className="lg:col-span-1">
            {renderRatingDistribution()}
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('quizReviews.userReviews', { count: reviews.length })}
                  </h3>
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    {t('quizReviews.writeReview')}
                  </button>
                </div>
              </div>
              <div className="p-6">
                {reviews.length === 0 ? (
                  // Empty State - No Reviews
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">💭</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {t('quizReviews.empty.noReviews')}
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      {t('quizReviews.empty.noReviewsDesc')}
                    </p>
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      {t('quizReviews.empty.writeFirstReview')}
                    </button>
                    
                    {/* Decorative Elements */}
                    <div className="mt-8 flex justify-center space-x-4">
                      <div className="w-2 h-2 bg-blue-200 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse delay-75"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-150"></div>
                    </div>
                  </div>
                ) : (
                  // Reviews List
                  <ReviewList 
                    reviews={reviews} 
                    loading={false}
                    onHelpfulClick={handleHelpfulClick}
                    onReportClick={handleReportClick}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Review Form Modal */}
        {showReviewForm && quizId && (
          <ReviewForm
            quizId={quizId}
            onReviewSubmitted={handleReviewSubmitted}
            onClose={() => setShowReviewForm(false)}
          />
        )}
      </div>
    </div>
  );
};

export default QuizReviewsPage;
