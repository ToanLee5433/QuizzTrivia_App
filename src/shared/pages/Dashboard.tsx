import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../lib/store';

// Dashboard card component giống style Admin
const DashboardCard = React.memo(({ 
  to, 
  title, 
  description,
  emoji,
  bgColor = "bg-blue-100"
}: {
  to: string;
  title: string;
  description: string;
  emoji: string;
  bgColor?: string;
}) => (
  <Link to={to} 
    className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200 group">
    <div className="flex items-center">
      <div className={`p-3 ${bgColor} rounded-lg`}>
        <span className="text-2xl">{emoji}</span>
      </div>
      <div className="ml-4">
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700">
          {title}
        </h3>
        <p className="text-gray-600 text-sm mt-1">
          {description}
        </p>
      </div>
    </div>
  </Link>
));

const Dashboard = React.memo(() => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header giống Admin */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('dashboard.welcome', { name: user?.displayName || user?.email?.split('@')[0] || 'User', defaultValue: 'Xin chào, {{name}}!' })} 👋
            </h1>
            <p className="text-gray-600">{user?.displayName || user?.email || 'User'}</p>
          </div>
          <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium">
            {user?.role === 'admin' ? 'Admin' : user?.role === 'creator' ? 'Creator' : 'User'}
          </div>
        </div>

        {/* Main Actions Grid - 2 cột như Admin */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DashboardCard
            to="/quizzes"
            emoji="📝"
            bgColor="bg-blue-100"
            title={t('nav.quizzes', 'Làm Quiz')}
            description={t('dashboard.takeQuizzes', 'Thử thách kiến thức với các bài quiz đa dạng')}
          />
          
          <DashboardCard
            to="/favorites"
            emoji="⭐"
            bgColor="bg-yellow-100"
            title={t('nav.favorites', 'Yêu thích')}
            description={t('dashboard.favoriteQuizzes', 'Các quiz bạn đã lưu để làm sau')}
          />
          
          <DashboardCard
            to="/leaderboard"
            emoji="🏆"
            bgColor="bg-orange-100"
            title={t('nav.leaderboard', 'Bảng xếp hạng')}
            description={t('dashboard.viewRanking', 'Xem thứ hạng và thành tích của bạn')}
          />
          
          <DashboardCard
            to="/profile"
            emoji="👤"
            bgColor="bg-gray-100"
            title={t('nav.profile', 'Hồ sơ cá nhân')}
            description={t('dashboard.editProfile', 'Xem và chỉnh sửa thông tin cá nhân')}
          />
          
          {(user?.role === 'creator' || user?.role === 'admin') && (
            <DashboardCard
              to="/creator"
              emoji="✨"
              bgColor="bg-purple-100"
              title={t('nav.creator', 'Tạo Quiz')}
              description={t('dashboard.createQuizzes', 'Tạo các bài quiz của riêng bạn')}
            />
          )}
          
          {user?.role === 'admin' && (
            <DashboardCard
              to="/admin"
              emoji="⚙️"
              bgColor="bg-red-100"
              title={t('nav.admin', 'Quản trị viên')}
              description={t('dashboard.adminPanel', 'Quản lý người dùng và hệ thống')}
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
