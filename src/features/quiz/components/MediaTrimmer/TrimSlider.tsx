/**
 * 🎚️ TrimSlider Component
 * Dual-handle slider for selecting start/end time
 * Using Radix UI for mobile touch support
 */

import React, { useCallback } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { formatTime } from '../../../../utils/mediaTrimUtils';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface TrimSliderProps {
  /** Total duration in seconds */
  duration: number;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Called continuously while dragging (for UI update) */
  onValueChange: (val: [number, number]) => void;
  /** Called when user releases the handle (for video seek) */
  onValueCommit: (val: [number, number]) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Show time labels above handles */
  showHandleLabels?: boolean;
  /** Custom class name */
  className?: string;
}

export const TrimSlider: React.FC<TrimSliderProps> = ({
  duration,
  startTime,
  endTime,
  onValueChange,
  onValueCommit,
  disabled = false,
  showHandleLabels: _showHandleLabels = true,
  className,
}) => {
  const { t } = useTranslation();

  // Calculate percentage for display
  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;
  const trimDuration = endTime - startTime;

  const handleValueChange = useCallback((val: number[]) => {
    onValueChange([val[0], val[1]]);
  }, [onValueChange]);

  const handleValueCommit = useCallback((val: number[]) => {
    onValueCommit([val[0], val[1]]);
  }, [onValueCommit]);

  return (
    <div className={clsx('w-full px-2 py-4', className)}>
      {/* Time display header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('mediaTrimmer.start', 'Bắt đầu')}:
          </span>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
            {formatTime(startTime)}
          </span>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>→</span>
          <span className="font-medium text-green-600 dark:text-green-400">
            {formatTime(trimDuration)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('mediaTrimmer.end', 'Kết thúc')}:
          </span>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
            {formatTime(endTime)}
          </span>
        </div>
      </div>

      {/* Slider */}
      <Slider.Root
        className={clsx(
          'relative flex items-center select-none touch-none w-full h-6',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        )}
        value={[startTime, endTime]}
        max={duration}
        step={1}
        minStepsBetweenThumbs={3} // Minimum 3 seconds between handles
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        disabled={disabled}
      >
        {/* Track background */}
        <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2 overflow-hidden">
          {/* Inactive area (before start) */}
          <div 
            className="absolute h-full bg-gray-300 dark:bg-gray-600 left-0"
            style={{ width: `${startPercent}%` }}
          />
          
          {/* Active range */}
          <Slider.Range className="absolute bg-gradient-to-r from-blue-500 to-blue-600 h-full" />
          
          {/* Inactive area (after end) */}
          <div 
            className="absolute h-full bg-gray-300 dark:bg-gray-600 right-0"
            style={{ width: `${100 - endPercent}%` }}
          />
        </Slider.Track>
        
        {/* Start Handle */}
        <Slider.Thumb
          className={clsx(
            'block w-6 h-6 bg-white border-2 border-blue-500 shadow-lg rounded-full',
            'hover:bg-blue-50 hover:border-blue-600 hover:scale-110',
            'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
            'transition-all duration-150',
            'cursor-grab active:cursor-grabbing active:scale-95',
            // Mobile: larger touch target
            'touch-manipulation'
          )}
          aria-label={t('mediaTrimmer.startHandle', 'Điểm bắt đầu')}
        >
          {/* Visual indicator */}
          <div className="absolute inset-1 bg-blue-500 rounded-full opacity-30" />
        </Slider.Thumb>
        
        {/* End Handle */}
        <Slider.Thumb
          className={clsx(
            'block w-6 h-6 bg-white border-2 border-blue-500 shadow-lg rounded-full',
            'hover:bg-blue-50 hover:border-blue-600 hover:scale-110',
            'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
            'transition-all duration-150',
            'cursor-grab active:cursor-grabbing active:scale-95',
            // Mobile: larger touch target
            'touch-manipulation'
          )}
          aria-label={t('mediaTrimmer.endHandle', 'Điểm kết thúc')}
        >
          {/* Visual indicator */}
          <div className="absolute inset-1 bg-blue-500 rounded-full opacity-30" />
        </Slider.Thumb>
      </Slider.Root>
      
      {/* Duration labels at bottom */}
      <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
        <span>0:00</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      {/* Trim info */}
      <div className="mt-3 text-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('mediaTrimmer.selectedDuration', 'Độ dài đoạn cắt')}:{' '}
        </span>
        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
          {formatTime(trimDuration)}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
          / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

export default TrimSlider;
