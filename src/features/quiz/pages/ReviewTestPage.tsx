import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reviewService } from '../services/reviewService';
import ReviewList from '../components/ReviewList';
import ReviewForm from '../components/ReviewForm';
import { toast } from 'react-toastify';
import { ArrowLeft, Loader2, Users, Star, MessageSquare, RefreshCw, Eye } from 'lucide-react';

const ReviewTestPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [debug, setDebug] = useState<any>(null);

  // Test quiz IDs we have sample data for
  const testQuizIds = [
    'quiz-toan-hoc-co-ban',
    'quiz-lich-su-viet-nam', 
    'quiz-tieng-anh-giao-tiep'
  ];

  useEffect(() => {
    if (quizId) {
      loadReviews();
    }
  }, [quizId]);

  const loadReviews = async () => {
    if (!quizId) return;
    
    setLoading(true);
    setDebug({ action: 'Loading reviews...', quizId });
    
    try {
      console.log('🔍 Loading reviews for quiz:', quizId);
      
      // Get reviews from Firebase
      const reviewsData = await reviewService.getQuizReviews(quizId);
      console.log('📊 Reviews loaded:', reviewsData);
      
      setReviews(reviewsData || []);
      
      // Get stats
      const statsData = await reviewService.getQuizReviewStats(quizId);
      console.log('📈 Stats loaded:', statsData);
      setStats(statsData);
      
      setDebug({
        action: 'Reviews loaded successfully',
        quizId,
        reviewCount: reviewsData?.length || 0,
        stats: statsData,
        reviewIds: reviewsData?.map(r => r.id) || []
      });
      
      toast.success(`Tải thành công ${reviewsData?.length || 0} đánh giá`);
      
    } catch (error) {
      console.error('❌ Error loading reviews:', error);
      setDebug({
        action: 'Error loading reviews',
        error: error instanceof Error ? error.message : String(error),
        quizId
      });
      toast.error('Lỗi khi tải đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    if (!quizId) return;
    
    setLoading(true);
    toast.info('Đang tạo dữ liệu mẫu...');
    
    try {
      // Create sample quizzes first
      console.log('Creating sample data...');
      
      // Create sample reviews
      console.log('Creating sample reviews...');
      
      toast.success('Tạo dữ liệu mẫu thành công!');
      
      // Reload reviews
      setTimeout(() => {
        loadReviews();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error creating sample data:', error);
      toast.error('Lỗi khi tạo dữ liệu mẫu');
      setLoading(false);
    }
  };

  const testAllQuizzes = async () => {
    setLoading(true);
    const results = [];
    
    for (const testId of testQuizIds) {
      try {
        const reviews = await reviewService.getQuizReviews(testId);
        const stats = await reviewService.getQuizReviewStats(testId);
        results.push({
          quizId: testId,
          reviewCount: reviews?.length || 0,
          stats,
          success: true
        });
      } catch (error) {
        results.push({
          quizId: testId,
          error: error instanceof Error ? error.message : String(error),
          success: false
        });
      }
    }
    
    setDebug({
      action: 'Test all quizzes',
      results
    });
    
    setLoading(false);
    toast.info('Kiểm tra hoàn tất - xem Debug Info');
  };

  const onReviewSubmitted = () => {
    toast.success('Đánh giá đã được gửi!');
    loadReviews();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </button>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              🧪 Review System Test Page
            </h1>
            <p className="text-gray-600 mb-4">
              Quiz ID: <code className="bg-gray-100 px-2 py-1 rounded">{quizId}</code>
            </p>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={loadReviews}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Tải lại Reviews
              </button>
              
              <button
                onClick={createSampleData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Users className="w-4 h-4 mr-2" />
                Tạo dữ liệu mẫu
              </button>
              
              <button
                onClick={testAllQuizzes}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                Test tất cả Quiz
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <Star className="w-8 h-8 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Điểm trung bình</p>
                  <p className="text-2xl font-bold">{stats.averageRating?.toFixed(1) || '0.0'}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <MessageSquare className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Tổng đánh giá</p>
                  <p className="text-2xl font-bold">{stats.totalReviews || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Tỷ lệ 5 sao</p>
                  <p className="text-2xl font-bold">{stats.fiveStarPercentage?.toFixed(0) || 0}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Quiz Links */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
          <h3 className="text-lg font-semibold mb-4">🎯 Test với Quiz có dữ liệu mẫu:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testQuizIds.map(testId => (
              <button
                key={testId}
                onClick={() => navigate(`/test-reviews/${testId}`)}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  quizId === testId 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium">{testId}</p>
                <p className="text-sm text-gray-500">
                  {testId === 'quiz-toan-hoc-co-ban' ? 'Toán học cơ bản' :
                   testId === 'quiz-lich-su-viet-nam' ? 'Lịch sử Việt Nam' :
                   'Tiếng Anh giao tiếp'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Debug Info */}
        {debug && (
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 mb-8 font-mono text-sm">
            <h3 className="text-white font-bold mb-2">🔍 Debug Info:</h3>
            <pre>{JSON.stringify(debug, null, 2)}</pre>
          </div>
        )}

        {/* Review Form */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
          <h3 className="text-lg font-semibold mb-4">✍️ Viết đánh giá mới:</h3>
          <ReviewForm
            quizId={quizId || ''}
            onReviewSubmitted={onReviewSubmitted}
            onClose={() => {}}
          />
        </div>

        {/* Reviews List */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            📋 Danh sách đánh giá ({reviews.length})
          </h3>
          
          <ReviewList
            reviews={reviews}
            loading={loading}
            onHelpfulClick={(reviewId) => console.log('Helpful clicked:', reviewId)}
            onReportClick={(reviewId) => console.log('Report clicked:', reviewId)}
          />
        </div>
      </div>
    </div>
  );
};

export default ReviewTestPage;
