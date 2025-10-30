import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { RootState } from '../../lib/store';
import CreateQuizPage from '../../features/quiz/pages/CreateQuizPage';
import MyQuizzesPage from '../../features/quiz/pages/MyQuizzesPage';
import { Plus, BookOpen } from 'lucide-react';

const Creator: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'create' | 'my-quizzes'>('my-quizzes');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'create') {
      setActiveTab('create');
    }
  }, [searchParams]);

  // Kiểm tra quyền creator
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.loginRequired')}</h2>
          <p className="text-gray-600">{t('creator.loginMessage')}</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'creator' && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('messages.unauthorized')}</h2>
          <p className="text-gray-600">{t('creator.roleRequired')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation - Sticky below header */}
      <div className="bg-white border-b border-gray-200 sticky top-14 sm:top-16 lg:top-18 z-40 shadow-sm">
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
              <span>{t('quiz.myQuizzes')}</span>
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
              <span>{t('creator.createNewQuiz')}</span>
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
