import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 text-center">
        <div className="text-red-600 text-5xl mb-4">
          <i className="fas fa-ban"></i>
        </div>
        <h1 className="text-3xl font-bold text-red-600 mb-4">Không có quyền truy cập</h1>
        <p className="text-gray-600 mb-6">
          Bạn không có quyền cần thiết để truy cập trang này.
          Vui lòng liên hệ quản trị viên nếu bạn cần hỗ trợ.
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Quay lại
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};
