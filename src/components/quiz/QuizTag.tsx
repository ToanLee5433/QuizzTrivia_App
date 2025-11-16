import React from 'react';

export interface QuizTagProps {
  /**
   * Tag text content
   */
  label: string;
  
  /**
   * Tag type/variant
   */
  variant?: 'category' | 'tag' | 'badge' | 'difficulty';
  
  /**
   * Optional custom color class
   */
  colorClass?: string;
}

/**
 * Tag component for displaying categories, tags, badges, and difficulty levels
 */
export const QuizTag: React.FC<QuizTagProps> = ({
  label,
  variant = 'tag',
  colorClass
}) => {
  const getVariantStyles = () => {
    if (colorClass) return colorClass;
    
    switch (variant) {
      case 'category':
        return 'bg-white/20 backdrop-blur-sm text-white border border-white/30';
      case 'badge':
        return 'bg-amber-400/90 text-amber-950 font-semibold shadow-lg';
      case 'difficulty':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
      case 'tag':
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVariantStyles()}`}>
      {label}
    </span>
  );
};
