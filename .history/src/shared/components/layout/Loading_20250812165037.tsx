import React from 'react';
import { useTranslation } from 'react-i18next';

type LoadingProps = {
  message?: string;
  fullScreen?: boolean;
};

export const Loading: React.FC<LoadingProps> = ({ message, fullScreen = true }) => {
  const { t } = useTranslation();
  const loadingMessage = message || t('loading', 'Đang tải...');
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-xl font-semibold text-gray-700">{loadingMessage}</div>
        </div>
      </div>
    );
  }
  // Skeleton cho loading danh sách
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
      {Array.from({length: 6}).map((_,i) => (
        <div key={i} className="animate-pulse bg-white rounded-xl shadow-lg h-64" />
      ))}
    </div>
  );
};
