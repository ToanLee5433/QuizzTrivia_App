import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 text-center">
        <div className="text-red-600 text-5xl mb-4">
          <i className="fas fa-ban"></i>
        </div>
        <h1 className="text-3xl font-bold text-red-600 mb-4">{t('unauthorized.title')}</h1>
        <p className="text-gray-600 mb-6">
          {t('unauthorized.description')}
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {t('common.back')}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('unauthorized.goHome')}
          </button>
        </div>
      </div>
    </div>
  );
};
