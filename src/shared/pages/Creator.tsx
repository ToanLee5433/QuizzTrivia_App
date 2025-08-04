import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../lib/store';
import CreateQuizPage from '../../features/quiz/pages/CreateQuizPage';
import MyQuizzesPage from '../../features/quiz/pages/MyQuizzesPage';
import { Plus, BookOpen } from 'lucide-react';

const Creator: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState<'create' | 'my-quizzes'>('my-quizzes');

  // Kiểm tra quyền creator
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cần đăng nhập</h2>
          <p className="text-gray-600">Bạn cần đăng nhập để truy cập trang Creator</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'creator' && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-600">Bạn cần có vai trò Creator hoặc Admin để truy cập trang này</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation - Fixed position */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('my-quizzes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                activeTab === 'my-quizzes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Quiz của tôi</span>
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Quiz mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 pt-4">
        {activeTab === 'my-quizzes' && <MyQuizzesPage />}
        {activeTab === 'create' && <CreateQuizPage />}
      </div>
    </div>
  );
};

export default Creator;
