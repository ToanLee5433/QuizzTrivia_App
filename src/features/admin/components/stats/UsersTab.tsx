/**
 * UsersTab Component
 * Users statistics tab for admin dashboard
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Edit, Shield, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboardStats } from '../../../../services/adminStatsService';
import StatCard from './StatCard';
import { ChartCard, DonutChart, TrendLineChart } from './ChartComponents';
import EmptyState from './EmptyState';
import { useOnlineUsers } from './useAdminStats';

interface UsersTabProps {
  stats: AdminDashboardStats;
}

const UsersTab: React.FC<UsersTabProps> = ({ stats }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Get real-time online users count
  const { onlineCount, idleCount } = useOnlineUsers();

  const roleData = [
    { 
      name: t('admin.stats.admins', 'Admin'), 
      value: stats.usersByRole.admin, 
      color: '#EF4444' 
    },
    { 
      name: t('admin.stats.creators', 'Creator'), 
      value: stats.usersByRole.creator, 
      color: '#10B981' 
    },
    { 
      name: t('admin.stats.regularUsers', 'User'), 
      value: stats.usersByRole.user, 
      color: '#3B82F6' 
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* User Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title={t('admin.stats.totalUsers', 'Tổng người dùng')}
          value={stats.totalUsers}
          icon={<Users className="w-5 h-5" />}
          change={stats.userGrowthRate}
          color="blue"
        />
        <StatCard
          title={t('admin.stats.admins', 'Quản trị viên')}
          value={stats.usersByRole.admin}
          icon={<Shield className="w-5 h-5" />}
          change={0}
          color="red"
        />
        <StatCard
          title={t('admin.stats.creators', 'Người tạo nội dung')}
          value={stats.usersByRole.creator}
          icon={<Edit className="w-5 h-5" />}
          change={0}
          color="green"
        />
        <StatCard
          title={t('admin.stats.regularUsers', 'Người dùng thường')}
          value={stats.usersByRole.user}
          icon={<Users className="w-5 h-5" />}
          change={0}
          color="gray"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Role Distribution Chart */}
        <ChartCard
          title={t('admin.stats.userRoleDistribution', 'Phân bố vai trò người dùng')}
        >
          {stats.totalUsers > 0 ? (
            <DonutChart
              data={roleData}
              height={300}
              innerRadius={60}
              outerRadius={100}
            />
          ) : (
            <EmptyState type="noUsers" />
          )}
        </ChartCard>

        {/* User Growth Chart */}
        <ChartCard
          title={t('admin.stats.userGrowthTrend', 'Xu hướng tăng trưởng người dùng')}
        >
          {stats.userGrowthData && stats.userGrowthData.length > 0 ? (
            <TrendLineChart
              data={stats.userGrowthData}
              lines={[
                {
                  dataKey: 'value',
                  name: t('admin.stats.users', 'Người dùng'),
                  color: '#3B82F6'
                }
              ]}
              height={300}
            />
          ) : (
            <EmptyState type="noData" />
          )}
        </ChartCard>
      </div>

      {/* User Statistics Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Users This Month */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {t('admin.stats.newUsersThisMonth', 'Người dùng mới tháng này')}
          </h3>
          <div className="text-center py-6">
            <p className="text-5xl font-bold text-blue-600 mb-2">
              {stats.newUsersThisMonth}
            </p>
            <p className="text-sm text-gray-500">
              {t('admin.stats.vsLastMonth', 'so với tháng trước')}: {stats.newUsersLastMonth}
            </p>
            {stats.userGrowthRate !== 0 && (
              <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                stats.userGrowthRate >= 0 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {stats.userGrowthRate >= 0 ? '+' : ''}{stats.userGrowthRate.toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {/* Online Users - Real-time */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-500" />
            {t('admin.stats.onlineNow', 'Đang online')}
          </h3>
          <div className="text-center py-6">
            <p className="text-5xl font-bold text-emerald-600 mb-2">
              {onlineCount}
            </p>
            <p className="text-sm text-gray-500">
              {idleCount > 0 && `${idleCount} ${t('admin.stats.idle', 'đang treo máy')}`}
              {idleCount === 0 && t('admin.stats.realtime', 'cập nhật realtime')}
            </p>
          </div>
        </div>

        {/* Active Creators */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {t('admin.stats.activeCreators', 'Creator hoạt động')}
          </h3>
          <div className="text-center py-6">
            <p className="text-5xl font-bold text-orange-600 mb-2">
              {stats.activeCreators}
            </p>
            <p className="text-sm text-gray-500">
              {stats.totalCreators > 0 
                ? `${((stats.activeCreators / stats.totalCreators) * 100).toFixed(1)}% ${t('admin.stats.ofTotal', 'trên tổng số')}`
                : t('admin.stats.noCreators', 'Chưa có creator')
              }
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={() => navigate('/admin/roles')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
        >
          <Users className="w-5 h-5" />
          {t('admin.stats.manageUsers', 'Quản lý người dùng')}
        </button>
      </div>
    </div>
  );
};

export default UsersTab;
