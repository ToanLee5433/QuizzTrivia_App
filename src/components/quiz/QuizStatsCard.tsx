import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface QuizStatsCardProps {
  /**
   * Icon component from lucide-react (optional if emoji provided)
   */
  icon?: LucideIcon;
  
  /**
   * Main value to display (number or string)
   */
  value: string | number;
  
  /**
   * Label below the value
   */
  label: string;
  
  /**
   * Icon color class (Tailwind)
   */
  iconColor?: string;
  
  /**
   * Optional custom border color
   */
  borderColor?: string;
  
  /**
   * Optional emoji/icon character
   */
  emoji?: string;
}

/**
 * Stats card component used in Quiz Preview page
 * Displays a single statistic with icon, value, and label
 */
export const QuizStatsCard: React.FC<QuizStatsCardProps> = ({
  icon: Icon,
  value,
  label,
  iconColor = 'text-blue-600 dark:text-blue-400',
  borderColor = 'border-slate-200 dark:border-slate-800',
  emoji
}) => {
  return (
    <div className={`p-4 bg-white dark:bg-slate-900 rounded-xl border ${borderColor} shadow-sm text-center`}>
      {emoji ? (
        <span className="text-3xl">{emoji}</span>
      ) : Icon ? (
        <Icon className={`w-6 h-6 ${iconColor} mx-auto mb-2`} />
      ) : null}
      <div className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
};
