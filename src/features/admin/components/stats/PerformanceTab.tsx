/**
 * PerformanceTab Component
 * Performance statistics tab for admin dashboard
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Target, CheckCircle, Star } from 'lucide-react';
import { AdminDashboardStats } from '../../../../services/adminStatsService';
import StatCard from './StatCard';
import { 
  ChartCard, 
  TrendLineChart, 
  HorizontalBarChart, 
  CategoryPerformanceChart,
  ProgressBar 
} from './ChartComponents';
import EmptyState from './EmptyState';

interface PerformanceTabProps {
  stats: AdminDashboardStats;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({ stats }) => {
  const { t } = useTranslation();

  // Rating distribution data
  const ratingData = [
    { label: '5★', value: stats.reviewsByRating[5], color: '#10B981' },
    { label: '4★', value: stats.reviewsByRating[4], color: '#3B82F6' },
    { label: '3★', value: stats.reviewsByRating[3], color: '#F59E0B' },
    { label: '2★', value: stats.reviewsByRating[2], color: '#EF4444' },
    { label: '1★', value: stats.reviewsByRating[1], color: '#6B7280' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Performance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title={t('admin.stats.averageScore', 'Điểm trung bình')}
          value={`${stats.averageScore}%`}
          icon={<Target className="w-5 h-5" />}
          change={2.5}
          color="green"
        />
        <StatCard
          title={t('admin.stats.completionRate', 'Tỷ lệ hoàn thành')}
          value={`${stats.completionRate}%`}
          icon={<CheckCircle className="w-5 h-5" />}
          change={1.8}
          color="blue"
        />
        <StatCard
          title={t('admin.stats.averageRating', 'Đánh giá TB')}
          value={`${stats.averageRating} ⭐`}
          icon={<Star className="w-5 h-5" />}
          change={0.3}
          color="yellow"
        />
      </div>

      {/* Performance Metrics Chart */}
      <ChartCard
        title={t('admin.stats.performanceMetrics', 'Chỉ số hiệu suất theo thời gian')}
        subtitle={t('admin.stats.scoreAndCompletionTrend', 'Điểm TB và tỷ lệ hoàn thành')}
      >
        {stats.completionTrendData && stats.completionTrendData.length > 0 ? (
          <TrendLineChart
            data={stats.completionTrendData}
            lines={[
              {
                dataKey: 'value',
                name: t('admin.stats.averageScore', 'Điểm TB'),
                color: '#10B981'
              },
              {
                dataKey: 'value2',
                name: t('admin.stats.completionRate', 'Tỷ lệ hoàn thành'),
                color: '#3B82F6'
              }
            ]}
            yDomain={[0, 100]}
          />
        ) : (
          <EmptyState type="noData" />
        )}
      </ChartCard>

      {/* Rating Distribution and Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <ChartCard
          title={t('admin.stats.ratingDistribution', 'Phân bố đánh giá')}
        >
          {stats.totalReviews > 0 ? (
            <HorizontalBarChart
              data={ratingData}
              height={280}
            />
          ) : (
            <EmptyState type="noData" className="py-8" />
          )}
        </ChartCard>

        {/* Categories Performance */}
        <ChartCard
          title={t('admin.stats.categoryPerformance', 'Hiệu suất theo danh mục')}
        >
          {stats.categories && stats.categories.length > 0 ? (
            <CategoryPerformanceChart
              categories={stats.categories}
              quizLabel={t('admin.stats.quizzes', 'Quiz')}
              completionLabel={t('admin.stats.completions', 'Lượt chơi')}
            />
          ) : (
            <EmptyState type="noData" className="py-8" />
          )}
        </ChartCard>
      </div>

      {/* Performance Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Insights */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {t('admin.stats.performanceInsights', 'Phân tích hiệu suất')}
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {t('admin.stats.highScorers', 'Điểm cao (≥80%)')}
                </span>
                <span className="text-sm font-semibold text-emerald-600">
                  {Math.round(stats.totalCompletions * 0.35).toLocaleString()}
                </span>
              </div>
              <ProgressBar
                label=""
                value={35}
                color="#10B981"
                showPercentage={false}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {t('admin.stats.mediumScorers', 'Điểm trung bình (50-79%)')}
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  {Math.round(stats.totalCompletions * 0.45).toLocaleString()}
                </span>
              </div>
              <ProgressBar
                label=""
                value={45}
                color="#3B82F6"
                showPercentage={false}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {t('admin.stats.lowScorers', 'Điểm thấp (<50%)')}
                </span>
                <span className="text-sm font-semibold text-orange-600">
                  {Math.round(stats.totalCompletions * 0.20).toLocaleString()}
                </span>
              </div>
              <ProgressBar
                label=""
                value={20}
                color="#F59E0B"
                showPercentage={false}
              />
            </div>
          </div>
        </div>

        {/* Rating Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {t('admin.stats.ratingSummary', 'Tổng quan đánh giá')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-100">
              <p className="text-4xl font-bold text-amber-600 mb-1">
                {stats.averageRating.toFixed(1)}
              </p>
              <p className="text-xs text-amber-700/70">
                {t('admin.stats.avgRating', 'Đánh giá TB')}
              </p>
              <div className="flex justify-center gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(stats.averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <p className="text-4xl font-bold text-blue-600 mb-1">
                {stats.totalReviews.toLocaleString()}
              </p>
              <p className="text-xs text-blue-700/70">
                {t('admin.stats.totalReviews', 'Tổng đánh giá')}
              </p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
              <p className="text-4xl font-bold text-emerald-600 mb-1">
                {stats.reviewsByRating[5] + stats.reviewsByRating[4]}
              </p>
              <p className="text-xs text-emerald-700/70">
                {t('admin.stats.positiveReviews', 'Đánh giá tích cực')}
              </p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-100">
              <p className="text-4xl font-bold text-gray-600 mb-1">
                {((stats.reviewsByRating[5] + stats.reviewsByRating[4]) / Math.max(stats.totalReviews, 1) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-600/70">
                {t('admin.stats.satisfactionRate', 'Hài lòng')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceTab;
