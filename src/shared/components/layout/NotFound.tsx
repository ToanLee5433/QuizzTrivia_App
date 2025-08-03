import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-400 text-7xl mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Trang không tồn tại</h1>
        <p className="text-gray-600 mb-6">
          Rất tiếc, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <Link 
          to="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Quay về trang chủ
        </Link>
      </div>
    </div>
  );
};
