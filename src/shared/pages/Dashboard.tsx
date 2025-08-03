import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../../lib/store';

// Card component to reduce re-renders
const DashboardCard = React.memo(({ 
  to, 
  bgColor, 
  borderColor, 
  hoverColor, 
  title, 
  icon, 
  description 
}: {
  to: string;
  bgColor: string;
  borderColor: string;
  hoverColor: string;
  title: string;
  icon: string;
  description: string;
}) => (
  <Link to={to} 
    className={`block p-6 ${bgColor} rounded-lg border ${borderColor} ${hoverColor} transition-colors`}>
    <h2 className="text-xl font-semibold mb-2">{icon} {title}</h2>
    <p className="text-gray-600">{description}</p>
  </Link>
));

const Dashboard = React.memo(() => {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Xin chào, {user?.displayName || user?.email}! 👋
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardCard
            to="/quizzes"
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
            hoverColor="hover:bg-blue-100"
            title="Làm bài Quiz"
            icon="📝"
            description="Thử thách kiến thức của bạn"
          />
          
          <DashboardCard
            to="/favorites"
            bgColor="bg-green-50"
            borderColor="border-green-200"
            hoverColor="hover:bg-green-100"
            title="Yêu thích"
            icon="⭐"
            description="Các quiz bạn đã lưu"
          />
          
          <DashboardCard
            to="/leaderboard"
            bgColor="bg-yellow-50"
            borderColor="border-yellow-200"
            hoverColor="hover:bg-yellow-100"
            title="Bảng xếp hạng"
            icon="🏆"
            description="Xem thứ hạng của bạn"
          />
          
          {user?.role === 'creator' && (
            <DashboardCard
              to="/creator"
              bgColor="bg-indigo-50"
              borderColor="border-indigo-200"
              hoverColor="hover:bg-indigo-100"
              title="Tạo Quiz"
              icon="✨"
              description="Tạo các bài quiz của riêng bạn"
            />
          )}
          
          {user?.role === 'admin' && (
            <DashboardCard
              to="/admin"
              bgColor="bg-purple-50"
              borderColor="border-purple-200"
              hoverColor="hover:bg-purple-100"
              title="Quản trị viên"
              icon="⚙️"
              description="Quản lý người dùng và hệ thống"
            />
          )}
          
          <DashboardCard
            to="/profile"
            bgColor="bg-amber-50"
            borderColor="border-amber-200"
            hoverColor="hover:bg-amber-100"
            title="Hồ sơ cá nhân"
            icon="👤"
            description="Xem và chỉnh sửa thông tin cá nhân"
          />
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
