import React, { useState, useEffect } from 'react';
import { getRealQuizData } from '../services/realDataService';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Eye, MessageSquare } from 'lucide-react';

import { useTranslation } from 'react-i18next';
const RealQuizListPage: React.FC = () => {
  const { t } = useTranslation();

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRealQuizzes();
  }, []);

  const loadRealQuizzes = async () => {
    setLoading(true);
    try {
      const realQuizzes = await getRealQuizData();
      setQuizzes(realQuizzes);
      console.log('Loaded real quizzes:', realQuizzes);
    } catch (error) {
      console.error('Error loading real quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mr-3" />
            <span className="text-lg text-gray-600">{t('quiz.loadingRealQuizzes')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/admin"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Link>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  📚 {t('quizList.title')}
                </h1>
                <p className="text-gray-600">
                  {quizzes.length} {t('quizList.results.quizzes')}
                </p>
              </div>
              
              <button
                onClick={loadRealQuizzes}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />{t('refresh')}
              </button>
            </div>
          </div>
        </div>

        {/* Quiz List */}
        {quizzes.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow-sm text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('quiz.noQuizzesInDatabase')}
            </h3>
            <p className="text-gray-600">
              {t('quiz.createQuizzesToTest')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {quiz.title || t('quiz.noTitle')}
                    </h3>
                    
                    <p className="text-gray-600 mb-3">
                      {quiz.description || t('quiz.noDescription')}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>ID: <code className="bg-gray-100 px-2 py-1 rounded">{quiz.id}</code></span>
                      {quiz.category && <span>{t('quiz.category')}: {quiz.category}</span>}
                      {quiz.status && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          quiz.status === 'approved' ? 'bg-green-100 text-green-800' :
                          quiz.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {quiz.status === 'approved' ? t('admin.quizManagement.filter.approved') :
                           quiz.status === 'pending' ? t('admin.quizManagement.filter.pending') : t('status.rejected')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Link
                       to={`/quiz/${quiz.id}/preview`}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                       {t('quiz.preview')}
                    </Link>
                    
                    <Link
                      to={`/quiz/${quiz.id}/reviews`}
                      className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                       {t('quiz.reviewsTitle')}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {quizzes.length > 0 && (
          <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 {t('dashboard.realTimeData')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{quizzes.length}</p>
                <p className="text-sm text-gray-600">{t('dashboard.totalQuizzes')}</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {quizzes.filter(q => q.status === 'approved').length}
                </p>
                <p className="text-sm text-gray-600">{t("admin.quizManagement.filter.approved")}</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {quizzes.filter(q => q.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-600">{t("admin.quizManagement.filter.pending")}</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {new Set(quizzes.map(q => q.category).filter(Boolean)).size}
                </p>
                <p className="text-sm text-gray-600">{t("admin.preview.category")}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealQuizListPage;
