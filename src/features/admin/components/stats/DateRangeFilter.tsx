/**
 * DateRangeFilter Component
 * Global date range filter for admin stats dashboard
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronDown } from 'lucide-react';
import { TimeRange } from './useAdminStats';

interface DateRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  variant?: 'buttons' | 'dropdown';
  className?: string;
}

const timeRanges: { value: TimeRange; labelKey: string; defaultLabel: string }[] = [
  { value: '1d', labelKey: 'admin.timeRange.1day', defaultLabel: 'Hôm nay' },
  { value: '7d', labelKey: 'admin.timeRange.7days', defaultLabel: '7 ngày' },
  { value: '30d', labelKey: 'admin.timeRange.30days', defaultLabel: '30 ngày' },
  { value: '90d', labelKey: 'admin.timeRange.90days', defaultLabel: '90 ngày' },
  { value: '1y', labelKey: 'admin.timeRange.1year', defaultLabel: '1 năm' }
];

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  variant = 'buttons',
  className = ''
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  
  const selectedRange = timeRanges.find(r => r.value === value);

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
        >
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {selectedRange ? t(selectedRange.labelKey, selectedRange.defaultLabel) : value}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => {
                    onChange(range.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    value === range.value
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{t(range.labelKey, range.defaultLabel)}</span>
                    {value === range.value && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Button variant (default)
  return (
    <div className={`flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl ${className}`}>
      {timeRanges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
            value === range.value
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {t(range.labelKey, range.defaultLabel)}
        </button>
      ))}
    </div>
  );
};

export default DateRangeFilter;
