import React from 'react';
import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mr-3">
            <span className="text-white text-xl font-bold">Q</span>
          </div>
          <span className="text-white text-xl font-bold">Quiz Trivia</span>
        </div>
        {/* Đã xoá nút đăng nhập, đăng ký góc phải */}
      </nav>

      {/* Hero Section */}
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="text-center text-white max-w-4xl">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
            Thử thách kiến thức của bạn
          </h1>
          
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Khám phá hàng ngàn quiz thú vị, thử thách bản thân và nâng cao kiến thức 
            với Quiz Trivia - nền tảng quiz tương tác hàng đầu!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/login-new"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105"
            >
              Bắt đầu ngay - Miễn phí!
            </Link>
            
            <Link
              to="/login"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200"
            >
              Đã có tài khoản?
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Đa dạng chủ đề</h3>
              <p className="text-blue-100">
                Khoa học, lịch sử, thể thao, giải trí và nhiều chủ đề hấp dẫn khác
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="text-4xl mb-4">⏱️</div>
              <h3 className="text-xl font-semibold mb-2">Thời gian thực</h3>
              <p className="text-blue-100">
                Thử thách với timer đếm ngược và theo dõi tiến độ realtime
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold mb-2">Xếp hạng & Thành tích</h3>
              <p className="text-blue-100">
                Theo dõi điểm số, thống kê và so sánh với bạn bè
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-white/5 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold text-blue-300 mb-2">1000+</div>
              <div className="text-blue-100">Quiz đa dạng</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-300 mb-2">10K+</div>
              <div className="text-blue-100">Người chơi</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-300 mb-2">50K+</div>
              <div className="text-blue-100">Lượt chơi</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-300 mb-2">24/7</div>
              <div className="text-blue-100">Hỗ trợ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-blue-200 py-8">
        <p>&copy; 2025 Quiz Trivia. Tất cả quyền được bảo lưu.</p>
      </footer>
    </div>
  );
};
