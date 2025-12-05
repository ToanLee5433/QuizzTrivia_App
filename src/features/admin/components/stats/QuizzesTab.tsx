/**
 * QuizzesTab Component
 * Quiz statistics tab for admin dashboard
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle, Clock, Eye, Edit, FileText, Lock, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboardStats } from '../../../../services/adminStatsService';
import StatCard from './StatCard';
import { ChartCard, DonutChart } from './ChartComponents';
import EmptyState from './EmptyState';

interface QuizzesTabProps {
  stats: AdminDashboardStats;
}

const QuizzesTab: React.FC<QuizzesTabProps> = ({ stats }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Quiz by Category data
  const categoryData = stats.categories.slice(0, 6).map((cat, index) => ({
    name: cat.name,
    value: cat.quizCount,
    color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][index % 6]
  }));

  // Quiz Type Distribution data
  const quizTypeData = [
    { 
      name: t('admin.stats.normalQuiz', 'Quiz thường'), 
      value: stats.quizTypeStats?.normal || 0, 
      color: '#3B82F6' 
    },
    { 
      name: t('admin.stats.quizWithResources', 'Quiz có tài liệu'), 
      value: stats.quizTypeStats?.withResources || 0, 
      color: '#10B981' 
    },
    { 
      name: t('admin.stats.quizWithPassword', 'Quiz có mật khẩu'), 
      value: stats.quizTypeStats?.withPassword || 0, 
      color: '#F59E0B' 
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Quiz Stats Summary - Without drafts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title={t('admin.stats.totalQuizzes', 'Tổng Quiz')}
          value={stats.totalQuizzes}
          icon={<BookOpen className="w-5 h-5" />}
          change={stats.quizGrowthRate}
          color="blue"
        />
        <StatCard
          title={t('admin.stats.publishedQuizzes', 'Đã duyệt')}
          value={stats.publishedQuizzes}
          icon={<CheckCircle className="w-5 h-5" />}
          change={0}
          color="green"
        />
        <StatCard
          title={t('admin.stats.pendingQuizzes', 'Chờ duyệt')}
          value={stats.pendingQuizzes}
          icon={<Clock className="w-5 h-5" />}
          change={0}
          color="yellow"
        />
      </div>

      {/* Quiz Type Stats - 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title={t('admin.stats.normalQuiz', 'Quiz thường')}
          value={stats.quizTypeStats?.normal || 0}
          icon={<FileText className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title={t('admin.stats.quizWithResources', 'Quiz có tài liệu')}
          value={stats.quizTypeStats?.withResources || 0}
          icon={<Layers className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title={t('admin.stats.quizWithPassword', 'Quiz có mật khẩu')}
          value={stats.quizTypeStats?.withPassword || 0}
          icon={<Lock className="w-5 h-5" />}
          color="orange"
        />
      </div>

      {/* Two Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quiz by Category Distribution */}
        <ChartCard
          title={t('admin.stats.quizByCategory', 'Quiz theo danh mục')}
          subtitle={t('admin.stats.top6Categories', 'Top 6 danh mục')}
        >
          {categoryData.length > 0 && categoryData.some(c => c.value > 0) ? (
            <DonutChart
              data={categoryData}
              height={320}
              innerRadius={60}
              outerRadius={100}
            />
          ) : (
            <EmptyState type="noQuizzes" />
          )}
        </ChartCard>

        {/* Quiz Type Distribution */}
        <ChartCard
          title={t('admin.stats.quizTypeDistribution', 'Phân loại Quiz')}
          subtitle={t('admin.stats.byFeatures', 'Theo tính năng')}
        >
          {quizTypeData.some(d => d.value > 0) ? (
            <DonutChart
              data={quizTypeData}
              height={320}
              innerRadius={60}
              outerRadius={100}
            />
          ) : (
            <EmptyState type="noQuizzes" />
          )}
        </ChartCard>
      </div>

      {/* Quiz Growth Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Quizzes This Month */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.stats.newQuizzesThisMonth', 'Quiz mới tháng này')}
          </h3>
          <div className="text-center py-6">
            <p className="text-5xl font-bold text-blue-600 mb-2">
              {stats.newQuizzesThisMonth}
            </p>
            <p className="text-sm text-gray-500">
              {t('admin.stats.vsLastMonth', 'so với tháng trước')}: {stats.newQuizzesLastMonth}
            </p>
            {stats.quizGrowthRate !== 0 && (
              <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                stats.quizGrowthRate >= 0 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {stats.quizGrowthRate >= 0 ? '+' : ''}{stats.quizGrowthRate.toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {/* Completions This Month */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.stats.completionsThisMonth', 'Lượt hoàn thành tháng này')}
          </h3>
          <div className="text-center py-6">
            <p className="text-5xl font-bold text-emerald-600 mb-2">
              {stats.completionsThisMonth}
            </p>
            <p className="text-sm text-gray-500">
              {t('admin.stats.vsLastMonth', 'so với tháng trước')}: {stats.completionsLastMonth}
            </p>
            {stats.completionGrowthRate !== 0 && (
              <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                stats.completionGrowthRate >= 0 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {stats.completionGrowthRate >= 0 ? '+' : ''}{stats.completionGrowthRate.toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {/* Average Completion */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.stats.avgCompletionsPerQuiz', 'Trung bình lượt chơi/quiz')}
          </h3>
          <div className="text-center py-6">
            <p className="text-5xl font-bold text-purple-600 mb-2">
              {stats.publishedQuizzes > 0 
                ? (stats.totalCompletions / stats.publishedQuizzes).toFixed(1)
                : 0
              }
            </p>
            <p className="text-sm text-gray-500">
              {t('admin.stats.perPublishedQuiz', 'lượt/quiz xuất bản')}
            </p>
          </div>
        </div>
      </div>

      {/* Top Quizzes Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('admin.stats.topQuizzes', 'Quiz phổ biến')}
          </h3>
          <button
            onClick={() => navigate('/admin/quiz-management')}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
          >
            {t('viewAll', 'Xem tất cả')}
          </button>
        </div>
        {stats.topQuizzes && stats.topQuizzes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">{t('admin.stats.quizTitle', 'Tiêu đề')}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm hidden sm:table-cell">{t('admin.stats.category', 'Danh mục')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-sm">{t('admin.stats.completions', 'Lượt chơi')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-sm hidden md:table-cell">{t('admin.stats.avgScore', 'Điểm TB')}</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500 text-sm">{t('admin.stats.actions', 'Hành động')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.topQuizzes.map((quiz) => (
                  <tr key={quiz.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900 line-clamp-1">{quiz.title}</p>
                    </td>
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <span className="text-sm text-gray-600">{quiz.category}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-semibold text-purple-600">{quiz.completions.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-4 text-right hidden md:table-cell">
                      <span className={`font-semibold ${quiz.averageScore >= 70 ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {quiz.averageScore}%
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => navigate(`/quiz/${quiz.id}/preview`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('admin.stats.preview', 'Xem trước')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/edit-quiz/${quiz.id}`)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title={t('admin.stats.edit', 'Sửa')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState type="noQuizzes" />
        )}
      </div>
    </div>
  );
};

export default QuizzesTab;
