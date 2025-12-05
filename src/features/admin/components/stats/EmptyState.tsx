/**
 * EmptyState Component
 * Beautiful empty state with illustration for when there's no data
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileQuestion, Users, BookOpen, BarChart3, RefreshCw } from 'lucide-react';

type EmptyStateType = 'noData' | 'noUsers' | 'noQuizzes' | 'noCompletions' | 'error';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const illustrations = {
  noData: FileQuestion,
  noUsers: Users,
  noQuizzes: BookOpen,
  noCompletions: BarChart3,
  error: RefreshCw
};

const defaultContent = {
  noData: {
    titleKey: 'admin.empty.noData.title',
    titleDefault: 'Chưa có dữ liệu',
    descKey: 'admin.empty.noData.description',
    descDefault: 'Dữ liệu sẽ hiển thị khi có hoạt động trong hệ thống'
  },
  noUsers: {
    titleKey: 'admin.empty.noUsers.title',
    titleDefault: 'Chưa có người dùng',
    descKey: 'admin.empty.noUsers.description',
    descDefault: 'Người dùng mới sẽ xuất hiện tại đây'
  },
  noQuizzes: {
    titleKey: 'admin.empty.noQuizzes.title',
    titleDefault: 'Chưa có quiz',
    descKey: 'admin.empty.noQuizzes.description',
    descDefault: 'Quiz sẽ hiển thị khi được tạo'
  },
  noCompletions: {
    titleKey: 'admin.empty.noCompletions.title',
    titleDefault: 'Chưa có lượt hoàn thành',
    descKey: 'admin.empty.noCompletions.description',
    descDefault: 'Lượt hoàn thành quiz sẽ được hiển thị tại đây'
  },
  error: {
    titleKey: 'admin.empty.error.title',
    titleDefault: 'Đã xảy ra lỗi',
    descKey: 'admin.empty.error.description',
    descDefault: 'Không thể tải dữ liệu. Vui lòng thử lại.'
  }
};

const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'noData',
  title,
  description,
  action,
  className = ''
}) => {
  const { t } = useTranslation();
  const Icon = illustrations[type];
  const content = defaultContent[type];
  
  const displayTitle = title || t(content.titleKey, content.titleDefault);
  const displayDesc = description || t(content.descKey, content.descDefault);
  
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      {/* Illustration Container */}
      <div className="relative mb-6">
        {/* Background circles */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 bg-blue-50 rounded-full" />
          <div className="absolute w-24 h-24 bg-blue-100/50 rounded-full" />
        </div>
        
        {/* Icon */}
        <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Icon className="w-10 h-10 text-white" />
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-200 rounded-full animate-pulse" />
        <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-blue-300 rounded-full animate-pulse delay-150" />
      </div>
      
      {/* Text Content */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        {displayTitle}
      </h3>
      <p className="text-sm text-gray-500 text-center max-w-sm mb-6">
        {displayDesc}
      </p>
      
      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
        >
          {type === 'error' && <RefreshCw className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
