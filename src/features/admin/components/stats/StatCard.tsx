/**
 * StatCard Component
 * Modern, glass-effect stat card with trend indicators
 * Beautiful responsive design with hover effects
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  changeLabel?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow' | 'indigo' | 'gray';
  subtext?: string;
  onClick?: () => void;
  className?: string;
  sparklineData?: number[];
}

// Color configurations with better contrast and visibility
const colorConfig = {
  blue: {
    bg: 'bg-white',
    border: 'border-gray-200',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md hover:border-blue-300'
  },
  green: {
    bg: 'bg-white',
    border: 'border-gray-200',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md hover:border-emerald-300'
  },
  purple: {
    bg: 'bg-white',
    border: 'border-gray-200',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md hover:border-purple-300'
  },
  orange: {
    bg: 'bg-white',
    border: 'border-gray-200',
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-600',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md hover:border-orange-300'
  },
  red: {
    bg: 'bg-white',
    border: 'border-gray-200',
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md hover:border-red-300'
  },
  yellow: {
    bg: 'bg-white',
    border: 'border-gray-200',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md hover:border-amber-300'
  },
  indigo: {
    bg: 'bg-white',
    border: 'border-gray-200',
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-600',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md hover:border-indigo-300'
  },
  gray: {
    bg: 'bg-white',
    border: 'border-gray-200',
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-600',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md hover:border-gray-300'
  }
};

// Simple Sparkline Component
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (!data || data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 24;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change = 0,
  changeLabel,
  color = 'blue',
  subtext,
  onClick,
  className = '',
  sparklineData
}) => {
  const { t } = useTranslation();
  const config = colorConfig[color];
  
  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const trendColor = change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-gray-500';
  const trendBg = change > 0 ? 'bg-emerald-50' : change < 0 ? 'bg-red-50' : 'bg-gray-50';
  
  return (
    <div 
      className={`
        relative overflow-hidden
        ${config.bg} 
        rounded-xl 
        border ${config.border}
        p-5 sm:p-6
        ${config.shadow}
        ${config.hover}
        transition-all duration-300 ease-out
        ${onClick ? 'cursor-pointer transform hover:-translate-y-0.5' : ''}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="relative z-10">
        {/* Header: Icon and Trend */}
        <div className="flex items-start justify-between mb-4">
          {/* Icon with solid color background */}
          <div className={`p-3 rounded-xl ${config.iconBg}`}>
            <div className={config.iconText}>
              {icon}
            </div>
          </div>
          
          {/* Sparkline or Trend Badge */}
          {sparklineData && sparklineData.length > 0 ? (
            <div className="pt-1">
              <Sparkline 
                data={sparklineData} 
                color={change >= 0 ? '#10B981' : '#EF4444'} 
              />
            </div>
          ) : change !== undefined && (
            <div className={`flex items-center px-2.5 py-1 rounded-full ${trendBg}`}>
              <TrendIcon className={`w-3.5 h-3.5 ${trendColor} mr-1`} />
              <span className={`text-xs font-semibold ${trendColor}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        
        {/* Value */}
        <div className="mb-2">
          <p className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        
        {/* Title */}
        <p className="text-sm font-medium text-gray-500 mb-1">
          {title}
        </p>
        
        {/* Subtext */}
        {subtext && (
          <p className="text-xs text-gray-400">
            {subtext}
          </p>
        )}
        
        {/* Change Label */}
        {changeLabel && (
          <p className="text-xs text-gray-500 mt-2">
            {changeLabel || t('admin.vsLastMonth', 'so với tháng trước')}
          </p>
        )}
      </div>
      
      {/* Click Indicator */}
      {onClick && (
        <div className="absolute bottom-3 right-3 opacity-40 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default StatCard;
