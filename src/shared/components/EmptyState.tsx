import React from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  type: 'quizzes' | 'reviews' | 'favorites';
  title?: string;
  description?: string;
  actionLabel?: string;
  actionUrl?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionLabel,
  actionUrl
}) => {
  const getDefaultContent = () => {
    switch (type) {
      case 'quizzes':
        return {
          icon: <BookOpen className="w-16 h-16 text-gray-400" />,
          title: 'Chưa có quiz nào',
          description: 'Hãy tạo quiz đầu tiên của bạn để bắt đầu!',
          actionLabel: 'Tạo Quiz Mới',
          actionUrl: '/create-quiz'
        };
      case 'reviews':
        return {
          icon: <BookOpen className="w-16 h-16 text-gray-400" />,
          title: 'Chưa có đánh giá nào',
          description: 'Hãy là người đầu tiên đánh giá quiz này!',
          actionLabel: 'Viết đánh giá',
          actionUrl: null
        };
      case 'favorites':
        return {
          icon: <BookOpen className="w-16 h-16 text-gray-400" />,
          title: 'Chưa có quiz yêu thích',
          description: 'Hãy thêm quiz vào danh sách yêu thích để dễ dàng truy cập!',
          actionLabel: 'Khám phá Quiz',
          actionUrl: '/quiz'
        };
      default:
        return {
          icon: <BookOpen className="w-16 h-16 text-gray-400" />,
          title: 'Không có dữ liệu',
          description: 'Hiện tại chưa có nội dung nào.',
          actionLabel: null,
          actionUrl: null
        };
    }
  };

  const defaultContent = getDefaultContent();
  const finalTitle = title || defaultContent.title;
  const finalDescription = description || defaultContent.description;
  const finalActionLabel = actionLabel || defaultContent.actionLabel;
  const finalActionUrl = actionUrl || defaultContent.actionUrl;

  return (
    <div className="text-center py-16">
      <div className="flex justify-center mb-6">
        {defaultContent.icon}
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {finalTitle}
      </h3>
      
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        {finalDescription}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        {finalActionUrl && finalActionLabel && (
          <Link
            to={finalActionUrl}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            {finalActionLabel}
          </Link>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
