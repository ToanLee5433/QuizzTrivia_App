import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../lib/store';
import { Star, MessageSquare, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReviewForm from '../../features/quiz/components/ReviewForm';

interface QuickReviewSectionProps {
  quizId: string;
  quizTitle: string;
}

const QuickReviewSection: React.FC<QuickReviewSectionProps> = ({ quizId, quizTitle }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const handleReviewSubmitted = () => {
    setShowReviewForm(false);
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mt-8">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-white rounded-full p-3 shadow-lg">
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Bạn thấy quiz này như thế nào?
        </h3>
        
        <p className="text-gray-600 mb-6">
          Chia sẻ cảm nhận của bạn để giúp những người khác có trải nghiệm tốt hơn
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {user ? (
            <>
              <button
                onClick={() => setShowReviewForm(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Viết đánh giá
              </button>
              
              <Link
                to={`/quiz/${quizId}/reviews`}
                className="inline-flex items-center px-6 py-3 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors border border-gray-300 shadow-sm"
              >
                <Eye className="w-5 h-5 mr-2" />
                Xem tất cả đánh giá
              </Link>
            </>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">Đăng nhập để đánh giá và xem các đánh giá khác</p>
              <Link
                to="/login"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-auto m-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Đánh giá: {quizTitle}</h3>
              <button
                onClick={() => setShowReviewForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <ReviewForm
                quizId={quizId}
                onReviewSubmitted={handleReviewSubmitted}
                onClose={() => setShowReviewForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickReviewSection;
