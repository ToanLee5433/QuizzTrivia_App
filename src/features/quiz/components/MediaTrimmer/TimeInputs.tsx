/**
 * ⏱️ TimeInputs Component
 * Manual time input fields with mm:ss format
 */

import React, { useState, useCallback, useEffect } from 'react';
import { formatTime, parseTime, validateTrimRange } from '../../../../utils/mediaTrimUtils';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface TimeInputsProps {
  /** Total duration in seconds */
  duration: number;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Called when values change */
  onChange: (startTime: number, endTime: number) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

export const TimeInputs: React.FC<TimeInputsProps> = ({
  duration,
  startTime,
  endTime,
  onChange,
  disabled = false,
  className,
}) => {
  const { t } = useTranslation();
  
  // Local state for input values (string format)
  const [startInput, setStartInput] = useState(formatTime(startTime));
  const [endInput, setEndInput] = useState(formatTime(endTime));
  const [error, setError] = useState<string | null>(null);

  // Sync with props
  useEffect(() => {
    setStartInput(formatTime(startTime));
    setEndInput(formatTime(endTime));
  }, [startTime, endTime]);

  const handleStartChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStartInput(value);
    setError(null);
  }, []);

  const handleEndChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEndInput(value);
    setError(null);
  }, []);

  const handleStartBlur = useCallback(() => {
    const parsed = parseTime(startInput);
    
    if (parsed === null) {
      setError(t('mediaTrimmer.invalidTimeFormat', 'Định dạng không hợp lệ (mm:ss)'));
      setStartInput(formatTime(startTime));
      return;
    }

    const validation = validateTrimRange(parsed, endTime, duration);
    if (!validation.valid) {
      setError(validation.error || null);
      setStartInput(formatTime(startTime));
      return;
    }

    onChange(parsed, endTime);
  }, [startInput, endTime, duration, startTime, onChange, t]);

  const handleEndBlur = useCallback(() => {
    const parsed = parseTime(endInput);
    
    if (parsed === null) {
      setError(t('mediaTrimmer.invalidTimeFormat', 'Định dạng không hợp lệ (mm:ss)'));
      setEndInput(formatTime(endTime));
      return;
    }

    const validation = validateTrimRange(startTime, parsed, duration);
    if (!validation.valid) {
      setError(validation.error || null);
      setEndInput(formatTime(endTime));
      return;
    }

    onChange(startTime, parsed);
  }, [endInput, startTime, duration, endTime, onChange, t]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, isStart: boolean) => {
    if (e.key === 'Enter') {
      if (isStart) {
        handleStartBlur();
      } else {
        handleEndBlur();
      }
    }
  }, [handleStartBlur, handleEndBlur]);

  // Quick adjustment buttons
  const adjustTime = useCallback((type: 'start' | 'end', delta: number) => {
    if (type === 'start') {
      const newStart = Math.max(0, Math.min(startTime + delta, endTime - 3));
      const validation = validateTrimRange(newStart, endTime, duration);
      if (validation.valid) {
        onChange(newStart, endTime);
      }
    } else {
      const newEnd = Math.max(startTime + 3, Math.min(endTime + delta, duration));
      const validation = validateTrimRange(startTime, newEnd, duration);
      if (validation.valid) {
        onChange(startTime, newEnd);
      }
    }
  }, [startTime, endTime, duration, onChange]);

  const trimDuration = endTime - startTime;

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="flex items-center justify-between gap-4">
        {/* Start Time Input */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('mediaTrimmer.startTime', 'Bắt đầu')}
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => adjustTime('start', -1)}
              disabled={disabled || startTime <= 0}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30"
              title="-1s"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <input
              type="text"
              value={startInput}
              onChange={handleStartChange}
              onBlur={handleStartBlur}
              onKeyDown={(e) => handleKeyDown(e, true)}
              disabled={disabled}
              placeholder="0:00"
              className={clsx(
                'w-20 px-2 py-1.5 text-center text-sm font-mono rounded-lg border',
                'bg-white dark:bg-gray-800',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
            <button
              type="button"
              onClick={() => adjustTime('start', 1)}
              disabled={disabled || startTime >= endTime - 3}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30"
              title="+1s"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Duration Display */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t('mediaTrimmer.duration', 'Độ dài')}
          </span>
          <span className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatTime(trimDuration)}
          </span>
        </div>

        {/* End Time Input */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 text-right">
            {t('mediaTrimmer.endTime', 'Kết thúc')}
          </label>
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => adjustTime('end', -1)}
              disabled={disabled || endTime <= startTime + 3}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30"
              title="-1s"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <input
              type="text"
              value={endInput}
              onChange={handleEndChange}
              onBlur={handleEndBlur}
              onKeyDown={(e) => handleKeyDown(e, false)}
              disabled={disabled}
              placeholder="0:00"
              className={clsx(
                'w-20 px-2 py-1.5 text-center text-sm font-mono rounded-lg border',
                'bg-white dark:bg-gray-800',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
            <button
              type="button"
              onClick={() => adjustTime('end', 1)}
              disabled={disabled || endTime >= duration}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30"
              title="+1s"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 text-center">
          {error}
        </p>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        {t('mediaTrimmer.timeInputHelp', 'Nhập thời gian theo định dạng mm:ss (ví dụ: 1:30)')}
      </p>
    </div>
  );
};

export default TimeInputs;
