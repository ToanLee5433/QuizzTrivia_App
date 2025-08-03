import React from 'react';

interface TimerProps {
  timeLeft: string;
  isWarning: boolean;
  isCritical: boolean;
  percentage?: number;
}

const Timer: React.FC<TimerProps> = ({ timeLeft, isWarning, isCritical, percentage = 0 }) => {
  const getTimerColor = () => {
    if (isCritical) return 'text-red-600';
    if (isWarning) return 'text-amber-600';
    return 'text-blue-600'; // Changed to blue for better aesthetics
  };

  const getBackgroundColor = () => {
    if (isCritical) return 'bg-red-50 border-red-200';
    if (isWarning) return 'bg-amber-50 border-amber-200';
    return 'bg-blue-50 border-blue-200'; // Changed to blue theme
  };

  const getProgressColor = () => {
    if (isCritical) return 'bg-red-500';
    if (isWarning) return 'bg-amber-500';
    return 'bg-blue-500'; // Changed to blue for consistency
  };

  return (
    <div className={`rounded-md border p-3 transition-all duration-300 ${getBackgroundColor()} ${isCritical ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600 flex items-center">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Thời gian còn lại
        </span>
        <span className={`text-lg font-bold font-mono ${getTimerColor()}`}>
          {timeLeft}
        </span>
      </div>
      
      {/* Compact progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full transition-all duration-1000 ${getProgressColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      
      {/* Subtle warning messages */}
      {isCritical && (
        <div className="text-xs text-red-600 font-medium mt-1 flex items-center">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Sắp hết giờ!
        </div>
      )}
      
      {isWarning && !isCritical && (
        <div className="text-xs text-amber-600 font-medium mt-1 flex items-center">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Còn ít thời gian
        </div>
      )}
    </div>
  );
};

export default Timer;
