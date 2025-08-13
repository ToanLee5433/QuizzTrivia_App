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
              {t('dashboard.welcome', {name: (user?.displayName || user?.email?.split('@')}[0] || 'User'),})} 👋
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
            title={t('nav.quizzes')}
            description={t('dashboard.takeQuizzes')}
          />
          
          <DashboardCard
            to="/favorites"
            emoji="⭐"
            bgColor="bg-yellow-100"
            title={t('nav.favorites')}
            description={t('dashboard.favoriteQuizzes')}
          />
          
          <DashboardCard
            to="/leaderboard"
            emoji="🏆"
            bgColor="bg-orange-100"
            title={t('nav.leaderboard')}
            description={t('dashboard.viewRanking')}
          />
          
          <DashboardCard
            to="/profile"
            emoji="👤"
            bgColor="bg-gray-100"
            title={t('nav.profile')}
            description={t('dashboard.editProfile')}
          />
          
          {(user?.role === 'creator' || user?.role === 'admin') && (
            <DashboardCard
              to="/creator"
              emoji="✨"
              bgColor="bg-purple-100"
              title={t('nav.creator')}
              description={t('dashboard.createQuizzes')}
            />
          )}
          
          {user?.role === 'admin' && (
            <DashboardCard
              to="/admin"
              emoji="⚙️"
              bgColor="bg-red-100"
              title={t('nav.admin')}
              description={t('dashboard.adminPanel')}
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
