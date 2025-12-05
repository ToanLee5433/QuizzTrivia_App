/**
 * OverviewTab Component
 * Main overview tab for admin stats dashboard
 * Reorganized with: Overview Cards, Charts, Data Tables
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  BookOpen, 
  Target, 
  Clock, 
  TrendingUp,
  AlertCircle,
  PlayCircle,
  UserPlus
} from 'lucide-react';
import { AdminDashboardStats } from '../../../../services/adminStatsService';
import StatCard from './StatCard';
import { 
  ChartCard, 
  GrowthAreaChart, 
  ActivityBarChart, 
  DonutChart,
  ProgressBar 
} from './ChartComponents';
import DateRangeFilter from './DateRangeFilter';
import EmptyState from './EmptyState';
import { TimeRange } from './useAdminStats';

interface OverviewTabProps {
  stats: AdminDashboardStats;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  onNavigateToUsers: () => void;
  onNavigateToQuizzes: () => void;
}

// Helper to get time range label
const getTimeRangeLabel = (timeRange: TimeRange, t: (key: string, fallback: string) => string): string => {
  const labels: Record<TimeRange, string> = {
    '1d': t('admin.timeRange.today', 'hôm nay'),
    '7d': t('admin.timeRange.7daysShort', '7 ngày qua'),
    '30d': t('admin.timeRange.30daysShort', '30 ngày qua'),
    '90d': t('admin.timeRange.90daysShort', '90 ngày qua'),
    '1y': t('admin.timeRange.1yearShort', '1 năm qua')
  };
  return labels[timeRange];
};

const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  timeRange,
  onTimeRangeChange,
  onNavigateToUsers,
  onNavigateToQuizzes
}) => {
  const { t } = useTranslation();
  const timeLabel = getTimeRangeLabel(timeRange, t);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* ============================================ */}
      {/* KHU VỰC 1: SỐ LIỆU TỔNG QUAN (Overview Cards) */}
      {/* ============================================ */}
      
      {/* Section Header with Time Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('admin.stats.overview', 'Tổng quan')}
          </h2>
          <p className="text-sm text-gray-500">
            {t('admin.stats.changeIn', 'Thay đổi trong')} {timeLabel}
          </p>
        </div>
        <DateRangeFilter 
          value={timeRange} 
          onChange={onTimeRangeChange}
          variant="buttons"
        />
      </div>

      {/* Nhóm Người dùng + Nội dung (4 cards hàng ngang) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tổng người dùng */}
        <StatCard
          title={t('admin.stats.totalUsers', 'Tổng người dùng')}
          value={stats.totalUsers}
          icon={<Users className="w-5 h-5" />}
          change={stats.userGrowthRate}
          changeLabel={timeLabel}
          color="blue"
          onClick={onNavigateToUsers}
        />
        
        {/* User mới trong khoảng thời gian */}
        <StatCard
          title={t('admin.stats.newUsers', 'Người dùng mới')}
          value={stats.newUsersThisMonth}
          icon={<UserPlus className="w-5 h-5" />}
          change={stats.userGrowthRate}
          changeLabel={timeLabel}
          color="green"
        />

        {/* Tổng Quiz */}
        <StatCard
          title={t('admin.stats.totalQuizzes', 'Tổng số Quiz')}
          value={stats.totalQuizzes}
          icon={<BookOpen className="w-5 h-5" />}
          change={stats.quizGrowthRate}
          changeLabel={timeLabel}
          color="purple"
          onClick={onNavigateToQuizzes}
        />
        
        {/* Quiz chờ duyệt - NỔI BẬT */}
        <StatCard
          title={t('admin.stats.pendingQuizzes', 'Chờ duyệt')}
          value={stats.pendingQuizzes}
          icon={<Clock className="w-5 h-5" />}
          change={0}
          color={stats.pendingQuizzes > 0 ? 'yellow' : 'gray'}
          className={stats.pendingQuizzes > 0 ? 'ring-2 ring-amber-200 ring-offset-1' : ''}
        />
      </div>

      {/* Nhóm Hiệu suất (3 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Lượt hoàn thành */}
        <StatCard
          title={t('admin.stats.totalPlays', 'Lượt chơi')}
          value={stats.totalCompletions}
          icon={<PlayCircle className="w-5 h-5" />}
          change={stats.completionGrowthRate}
          changeLabel={timeLabel}
          color="indigo"
        />
        
        {/* Điểm trung bình */}
        <StatCard
          title={t('admin.stats.avgScore', 'Điểm trung bình')}
          value={`${stats.averageScore}%`}
          icon={<Target className="w-5 h-5" />}
          change={0}
          color="orange"
        />
        
        {/* Tỷ lệ hoàn thành */}
        <StatCard
          title={t('admin.stats.completionRate', 'Tỷ lệ hoàn thành')}
          value={`${stats.completionRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          change={0}
          color="green"
        />
      </div>

      {/* Cảnh báo Quiz chờ duyệt (nếu có) */}
      {stats.pendingQuizzes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {t('admin.stats.pendingAlert', 'Có {{count}} quiz đang chờ duyệt', { count: stats.pendingQuizzes })}
            </p>
            <p className="text-xs text-amber-600">
              {t('admin.stats.pendingAlertDesc', 'Hãy kiểm tra và duyệt để nội dung được xuất bản')}
            </p>
          </div>
          <button
            onClick={onNavigateToQuizzes}
            className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
          >
            {t('admin.stats.reviewNow', 'Duyệt ngay')}
          </button>
        </div>
      )}

      {/* ============================================ */}
      {/* KHU VỰC 2: BIỂU ĐỒ TRỰC QUAN (Charts) */}
      {/* ============================================ */}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ tăng trưởng người dùng (Line Chart) */}
        <ChartCard
          title={t('admin.stats.userGrowth', 'Tăng trưởng người dùng')}
          subtitle={timeLabel}
        >
          {stats.userGrowthData && stats.userGrowthData.length > 0 ? (
            <GrowthAreaChart
              data={stats.userGrowthData}
              name={t('admin.stats.users', 'Người dùng')}
              color="#3B82F6"
            />
          ) : (
            <EmptyState type="noData" />
          )}
        </ChartCard>

        {/* Biểu đồ hoạt động Quiz (Bar Chart) */}
        <ChartCard
          title={t('admin.stats.quizActivity', 'Hoạt động Quiz')}
          subtitle={t('admin.stats.quizActivityDesc', 'Quiz tạo mới vs Lượt chơi')}
        >
          {stats.quizActivityData && stats.quizActivityData.length > 0 ? (
            <ActivityBarChart
              data={stats.quizActivityData}
              primaryName={t('admin.stats.createdQuizzes', 'Quiz tạo mới')}
              secondaryName={t('admin.stats.completedAttempts', 'Lượt hoàn thành')}
              primaryColor="#10B981"
              secondaryColor="#3B82F6"
            />
          ) : (
            <EmptyState type="noData" />
          )}
        </ChartCard>
      </div>

      {/* Biểu đồ phân bố (Row 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tỷ lệ Quiz theo danh mục (Donut Chart) */}
        <ChartCard
          title={t('admin.stats.quizByCategory', 'Quiz theo danh mục')}
        >
          {stats.categories && stats.categories.length > 0 ? (
            <DonutChart
              data={stats.categories.slice(0, 5).map((cat, i) => ({
                name: cat.name,
                value: cat.quizCount,
                color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5]
              }))}
              height={200}
              innerRadius={50}
              outerRadius={80}
            />
          ) : (
            <EmptyState type="noData" className="py-6" />
          )}
        </ChartCard>

        {/* Performance Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {t('admin.stats.performanceOverview', 'Hiệu suất hệ thống')}
          </h3>
          <div className="space-y-4">
            <ProgressBar
              label={t('admin.stats.avgScore', 'Điểm trung bình')}
              value={stats.averageScore}
              color="#10B981"
            />
            <ProgressBar
              label={t('admin.stats.completionRate', 'Tỷ lệ hoàn thành')}
              value={stats.completionRate}
              color="#3B82F6"
            />
            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-purple-600">{stats.totalReviews}</p>
                <p className="text-xs text-gray-500">{t('admin.stats.reviews', 'Đánh giá')}</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-amber-600">{stats.averageRating.toFixed(1)} ⭐</p>
                <p className="text-xs text-gray-500">{t('admin.stats.rating', 'Xếp hạng')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <ChartCard
          title={t('admin.stats.ratingDistribution', 'Phân bố đánh giá')}
        >
          {stats.totalReviews > 0 ? (
            <DonutChart
              data={[
                { name: '5★', value: stats.reviewsByRating[5], color: '#10B981' },
                { name: '4★', value: stats.reviewsByRating[4], color: '#3B82F6' },
                { name: '3★', value: stats.reviewsByRating[3], color: '#F59E0B' },
                { name: '2★', value: stats.reviewsByRating[2], color: '#F97316' },
                { name: '1★', value: stats.reviewsByRating[1], color: '#EF4444' }
              ]}
              height={200}
              innerRadius={50}
              outerRadius={80}
            />
          ) : (
            <EmptyState type="noData" className="py-6" />
          )}
        </ChartCard>
      </div>

      {/* ============================================ */}
      {/* KHU VỰC 3: BẢNG DỮ LIỆU CHI TIẾT (Data Tables) */}
      {/* ============================================ */}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Quiz phổ biến (Trending Quizzes) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              {t('admin.stats.trendingQuizzes', 'Quiz phổ biến')}
            </h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              Top 5
            </span>
          </div>
          
          {stats.topQuizzes && stats.topQuizzes.length > 0 ? (
            <div className="space-y-3">
              {stats.topQuizzes.slice(0, 5).map((quiz, index) => (
                <div 
                  key={quiz.id} 
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-200 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{quiz.title}</p>
                    <p className="text-xs text-gray-500">{quiz.category}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-purple-600">{quiz.completions}</p>
                    <p className="text-xs text-gray-400">{t('admin.stats.plays', 'lượt')}</p>
                  </div>
                  {quiz.rating > 0 && (
                    <span className="text-xs text-amber-500 font-medium">
                      {quiz.rating}⭐
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState type="noQuizzes" className="py-6" />
          )}
        </div>

        {/* Hoạt động gần đây (Recent Activities) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              {t('admin.stats.recentActivities', 'Hoạt động gần đây')}
            </h3>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
          
          {stats.recentCompletions && stats.recentCompletions.length > 0 ? (
            <div className="space-y-3">
              {stats.recentCompletions.slice(0, 5).map((completion) => (
                <div 
                  key={completion.id} 
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {completion.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{completion.userName}</span>
                      <span className="text-gray-500"> {t('admin.stats.completed', 'đã hoàn thành')} </span>
                    </p>
                    <p className="text-xs text-gray-500 truncate">{completion.quizTitle}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      completion.score >= 80 ? 'bg-green-100 text-green-700' :
                      completion.score >= 60 ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {completion.score}%
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(completion.completedAt).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState type="noCompletions" className="py-6" />
          )}
        </div>
      </div>

      {/* Top Categories */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          {t('admin.stats.topCategories', 'Danh mục hàng đầu')}
        </h3>
        {stats.categories && stats.categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {stats.categories.slice(0, 5).map((category, index) => (
              <div 
                key={category.id} 
                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-center"
              >
                <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-200 text-gray-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  <span className="text-sm font-bold">#{index + 1}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{category.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {category.quizCount} quiz • {category.completionCount} {t('admin.stats.plays', 'lượt')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState type="noData" className="py-6" />
        )}
      </div>
    </div>
  );
};

export default OverviewTab;
