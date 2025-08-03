import React from 'react';
import { useNavigate } from 'react-router-dom';
import FirebaseTestPanel from '../components/FirebaseTestPanel';

const FirebaseTestPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Quay lại</span>
              </button>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-xl font-semibold text-gray-900">🔥 Firebase Review System Test</h1>
                <p className="text-sm text-gray-600">Test và debug hệ thống đánh giá Firebase</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Environment: <span className="font-medium text-blue-600">Development</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">📋 Hướng dẫn sử dụng</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-blue-800 mb-2">🔧 Test Steps:</h3>
              <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                <li>Nhấn "Test Connection" để kiểm tra kết nối Firebase</li>
                <li>Nhấn "Create Sample Data" để tạo dữ liệu review mẫu</li>
                <li>Nhấn "Test Review Load" để test tải reviews cho quiz</li>
                <li>Kiểm tra logs để xem chi tiết quá trình</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-medium text-blue-800 mb-2">✅ Expected Results:</h3>
              <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                <li>Status hiển thị "Connected" màu xanh</li>
                <li>Sample data được tạo thành công</li>
                <li>Review loading trả về dữ liệu</li>
                <li>Không có errors trong console</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Firebase Test Panel */}
        <FirebaseTestPanel quizId="sample-quiz-1" />

        {/* Additional Debug Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">🔍 Debug Tips</h3>
            <ul className="text-gray-700 text-sm space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-red-500">•</span>
                <span>Mở DevTools (F12) để xem console logs</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-red-500">•</span>
                <span>Kiểm tra tab Network để xem Firebase requests</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-red-500">•</span>
                <span>Refresh trang nếu có lỗi cache</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">📊 Firebase Collections</h3>
            <ul className="text-gray-700 text-sm space-y-2">
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>quizReviews - User reviews</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>quizzes - Quiz data</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span>users - User profiles</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">🚨 Common Issues</h3>
            <ul className="text-gray-700 text-sm space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-yellow-500">⚠</span>
                <span>Permission denied - Check Firebase rules</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-yellow-500">⚠</span>
                <span>Network error - Check internet connection</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-yellow-500">⚠</span>
                <span>Quota exceeded - Check Firebase usage</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirebaseTestPage;
