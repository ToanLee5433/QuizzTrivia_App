import React from 'react';
import { useTranslation } from 'react-i18next';
import AdminStats from '../components/AdminStats';

const StatsDashboard: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-xl">📊</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">{t('admin.stats.title')}</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <a
                href="/admin"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors duration-200"
              >
                ← {t('admin.sidebar.backToDashboard')}
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Success Banner */}
      <div className="bg-green-50 border-l-4 border-green-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-400 text-xl">✅</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Thành công! Bạn đang xem trang thống kê với biểu đồ
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Trang này hiển thị:</p>
              <ul className="list-disc list-inside mt-1">
                <li>📊 Biểu đồ cột - Danh mục phổ biến</li>
                <li>🥧 Biểu đồ tròn - Tỷ lệ quiz đã duyệt/chờ duyệt</li>
                <li>📈 8 Cards thống kê chi tiết</li>
                <li>🎯 Dữ liệu mẫu để demo</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminStats />
      </main>
    </div>
  );
};

export default StatsDashboard;
