import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface QuizInsightCardProps {
  /**
   * Main label
   */
  label: string;
  
  /**
   * Sub-label (description)
   */
  subLabel: string;
  
  /**
   * Main value to display
   */
  value: string | number;
  
  /**
   * Icon component
   */
  icon: LucideIcon;
  
  /**
   * Background color class
   */
  background?: string;
  
  /**
   * Accent color for icon
   */
  accent?: string;
}

/**
 * Insight card showing quiz analytics/metrics
 * Used in the Key Insights section
 */
export const QuizInsightCard: React.FC<QuizInsightCardProps> = ({
  label,
  subLabel,
  value,
  icon: Icon,
  background = 'bg-slate-50 dark:bg-slate-800/50',
  accent = 'text-blue-600 dark:text-blue-400'
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-800 p-4 ${background}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </p>
        <Icon className={`w-5 h-5 ${accent}`} />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {subLabel}
      </p>
    </div>
  );
};
