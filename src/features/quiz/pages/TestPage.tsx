import React from 'react';

export const TestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-3xl font-bold">🎯</span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Quiz App Working!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Tailwind CSS và React đang hoạt động hoàn hảo
          </p>
          
          <div className="space-y-3">
            <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg">
              ✅ Vite server đang chạy
            </div>
            
            <div className="bg-blue-100 border border-blue-300 text-blue-800 px-4 py-3 rounded-lg">
              🎨 Tailwind CSS hoạt động
            </div>
            
            <div className="bg-purple-100 border border-purple-300 text-purple-800 px-4 py-3 rounded-lg">
              ⚛️ React components render thành công
            </div>
          </div>
          
          <div className="mt-8 flex space-x-3">
            <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
              Tiếp tục
            </button>
            <button className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
              Quay lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
