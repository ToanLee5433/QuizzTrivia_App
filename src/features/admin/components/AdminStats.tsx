/**
 * AdminStats Component (Refactored)
 * Modern admin dashboard with beautiful UI
 * 
 * Features:
 * - Skeleton Loading instead of spinner
 * - Global Date Range Filter
 * - Modern Glass-effect StatCards
 * - Custom Charts with tooltips & gradients
 * - Fully responsive design
 * - Complete i18n support
 * - Modular architecture
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Users, BookOpen, Award, RefreshCw, Download, Clock } from 'lucide-react';

// Import modular components
import {
  useAdminStats,
  StatsSkeleton,
  DateRangeFilter,
  OverviewTab,
  UsersTab,
  QuizzesTab,
  PerformanceTab
} from './stats';

type TabId = 'overview' | 'users' | 'quizzes' | 'performance';

const AdminStats: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  
  // Use custom hook for data management
  const {
    stats,
    loading,
    timeRange,
    setTimeRange,
    refreshData,
    exportData,
    lastUpdated
  } = useAdminStats();

  // Tab configuration
  const tabs: { id: TabId; labelKey: string; defaultLabel: string; icon: React.ElementType }[] = [
    { id: 'overview', labelKey: 'admin.tabs.overview', defaultLabel: 'Tổng quan', icon: Target },
    { id: 'users', labelKey: 'admin.tabs.users', defaultLabel: 'Người dùng', icon: Users },
    { id: 'quizzes', labelKey: 'admin.tabs.quizzes', defaultLabel: 'Quiz', icon: BookOpen },
    { id: 'performance', labelKey: 'admin.tabs.performance', defaultLabel: 'Hiệu suất', icon: Award }
  ];

  // Render tab content
  const renderTabContent = () => {
    if (!stats) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            stats={stats}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            onNavigateToUsers={() => setActiveTab('users')}
            onNavigateToQuizzes={() => setActiveTab('quizzes')}
          />
        );
      case 'users':
        return <UsersTab stats={stats} />;
      case 'quizzes':
        return <QuizzesTab stats={stats} />;
      case 'performance':
        return <PerformanceTab stats={stats} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title Section */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1.5 flex items-center gap-3">
                <span className="text-3xl">📊</span>
                {t('admin.stats.title', 'Thống kê Quiz')}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {t('admin.stats.subtitle', 'Dữ liệu thực từ Firebase - Cập nhật realtime')}
              </p>
            </div>
            
            {/* Actions Section */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Global Date Range Filter */}
              <DateRangeFilter
                value={timeRange}
                onChange={setTimeRange}
                variant="dropdown"
              />
              
              {/* Refresh Button */}
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                  {t('refresh', 'Làm mới')}
                </span>
              </button>
              
              {/* Export Dropdown */}
              <div className="relative group">
                <button
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">
                    {t('admin.exportData', 'Xuất dữ liệu')}
                  </span>
                </button>
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                  <button
                    onClick={() => exportData('csv')}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span>📄</span> CSV
                  </button>
                  <button
                    onClick={() => exportData('json')}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span>📋</span> JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Last Updated Indicator */}
        {lastUpdated && (
          <div className="mb-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex items-center shadow-sm">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <span className="text-sm font-medium text-blue-700">
                {t('admin.stats.lastUpdated', 'Cập nhật gần đây nhất')}
              </span>
              <span className="text-sm text-blue-600 ml-2">
                {lastUpdated.toLocaleString('vi-VN')}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6 sm:mb-8">
          <nav className="flex gap-1 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">
                    {t(tab.labelKey, tab.defaultLabel)}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {loading ? (
            <StatsSkeleton />
          ) : (
            renderTabContent()
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
