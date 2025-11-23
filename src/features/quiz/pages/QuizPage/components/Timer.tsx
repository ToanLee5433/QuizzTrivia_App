import React from 'react';

interface TimerProps {
  timeLeft: string;
  isWarning: boolean;
  isCritical: boolean;
  percentage?: number;
}

const Timer: React.FC<TimerProps> = ({ timeLeft, isCritical }) => {
  return (
    <div className="flex items-center gap-2">
      <svg 
        className={`w-5 h-5 ${isCritical ? 'animate-spin' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-mono font-bold text-lg min-w-[4.5ch]">
        {timeLeft}
      </span>
    </div>
  );
};

export default Timer;
