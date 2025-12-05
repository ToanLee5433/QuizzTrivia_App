/**
 * StatsSkeleton Component
 * Beautiful skeleton loading state for admin stats dashboard
 * Matches the exact layout of Overview tab for smooth transitions
 */

import React from 'react';

// Shimmer animation component
const Shimmer: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <div 
    className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ${className}`} 
    style={style}
  />
);

// Skeleton StatCard
const SkeletonCard: React.FC<{ size?: 'normal' | 'compact' }> = ({ size = 'normal' }) => (
  <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100/50 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-5 sm:p-6">
    {/* Background Decoration */}
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-xl" />
    
    <div className="relative z-10">
      {/* Header: Icon and Trend */}
      <div className="flex items-start justify-between mb-4">
        <Shimmer className="w-12 h-12 rounded-xl" />
        <Shimmer className="w-16 h-6 rounded-full" />
      </div>
      
      {/* Value */}
      <Shimmer className={`${size === 'normal' ? 'h-10 w-32' : 'h-8 w-24'} rounded-lg mb-3`} />
      
      {/* Title */}
      <Shimmer className="h-4 w-28 rounded mb-2" />
      
      {/* Subtext */}
      <Shimmer className="h-3 w-20 rounded" />
    </div>
  </div>
);

// Skeleton Chart
const SkeletonChart: React.FC<{ height?: string }> = ({ height = 'h-[300px]' }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <div className="flex items-center justify-between mb-6">
      <Shimmer className="h-6 w-48 rounded" />
      <div className="flex gap-2">
        <Shimmer className="h-7 w-12 rounded-full" />
        <Shimmer className="h-7 w-12 rounded-full" />
        <Shimmer className="h-7 w-12 rounded-full" />
        <Shimmer className="h-7 w-12 rounded-full" />
      </div>
    </div>
    <div className={`${height} flex items-end justify-between gap-2 px-4`}>
      {Array.from({ length: 12 }).map((_, i) => {
        const randomHeight = Math.floor(Math.random() * 60) + 20;
        return (
          <Shimmer 
            key={i} 
            className={`flex-1 rounded-t-md`}
            style={{ height: `${randomHeight}%` }}
          />
        );
      })}
    </div>
  </div>
);

// Skeleton Pie Chart
const SkeletonPieChart: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <Shimmer className="h-6 w-40 rounded mb-6" />
    <div className="flex items-center justify-center py-4">
      <div className="relative">
        <Shimmer className="w-40 h-40 rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white" />
        </div>
      </div>
    </div>
    <div className="flex justify-center gap-4 mt-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Shimmer className="w-3 h-3 rounded-full" />
          <Shimmer className="h-4 w-16 rounded" />
        </div>
      ))}
    </div>
  </div>
);

// Skeleton Table
const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <Shimmer className="h-6 w-48 rounded mb-6" />
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-gray-100">
        <Shimmer className="h-4 w-8 rounded" />
        <Shimmer className="h-4 flex-1 rounded" />
        <Shimmer className="h-4 w-24 rounded" />
        <Shimmer className="h-4 w-20 rounded" />
        <Shimmer className="h-4 w-20 rounded" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 items-center">
          <Shimmer className="w-8 h-8 rounded-full" />
          <Shimmer className="h-4 flex-1 rounded" />
          <Shimmer className="h-4 w-24 rounded" />
          <Shimmer className="h-4 w-20 rounded" />
          <Shimmer className="h-4 w-20 rounded" />
        </div>
      ))}
    </div>
  </div>
);

// Skeleton Progress Bar Section
const SkeletonProgressSection: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <Shimmer className="h-6 w-40 rounded mb-6" />
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <div className="flex justify-between mb-2">
            <Shimmer className="h-4 w-32 rounded" />
            <Shimmer className="h-4 w-12 rounded" />
          </div>
          <Shimmer className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

// Skeleton List Section
const SkeletonListSection: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <Shimmer className="h-6 w-40 rounded mb-6" />
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Shimmer className="w-10 h-10 rounded-full" />
            <div>
              <Shimmer className="h-4 w-32 rounded mb-1" />
              <Shimmer className="h-3 w-24 rounded" />
            </div>
          </div>
          <div className="text-right">
            <Shimmer className="h-5 w-12 rounded mb-1" />
            <Shimmer className="h-3 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Main StatsSkeleton Component
const StatsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Main Stats Grid - 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Secondary Stats Grid - 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <SkeletonCard size="compact" />
        <SkeletonCard size="compact" />
        <SkeletonCard size="compact" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonProgressSection />
        <SkeletonListSection items={5} />
        <SkeletonPieChart />
      </div>

      {/* Top Quizzes Table */}
      <SkeletonTable rows={5} />

      {/* Recent Completions */}
      <SkeletonListSection items={5} />
    </div>
  );
};

export { 
  StatsSkeleton, 
  SkeletonCard, 
  SkeletonChart, 
  SkeletonPieChart, 
  SkeletonTable,
  SkeletonProgressSection,
  SkeletonListSection 
};
export default StatsSkeleton;
