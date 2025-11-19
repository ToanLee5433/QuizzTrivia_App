import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface QuestionTimerProps {
  startTime: number;
  timeLimit: number; // seconds
  onTimeUp: () => void;
  isPaused?: boolean;
}

const QuestionTimer: React.FC<QuestionTimerProps> = ({
  startTime,
  timeLimit,
  onTimeUp,
  isPaused = false,
}) => {
  const { t } = useTranslation();
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [hasCalledTimeUp, setHasCalledTimeUp] = useState(false);

  useEffect(() => {
    setTimeRemaining(timeLimit);
    setHasCalledTimeUp(false);
  }, [startTime, timeLimit]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, timeLimit - elapsed);

      setTimeRemaining(remaining);

      if (remaining === 0 && !hasCalledTimeUp) {
        setHasCalledTimeUp(true);
        onTimeUp();
      }
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [startTime, timeLimit, isPaused, hasCalledTimeUp, onTimeUp]);

  const percentage = (timeRemaining / timeLimit) * 100;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on time remaining
  const getColor = () => {
    if (percentage > 50) return '#10b981'; // green
    if (percentage > 20) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getBackgroundGradient = () => {
    if (percentage > 50) return 'from-green-400 to-emerald-500';
    if (percentage > 20) return 'from-yellow-400 to-orange-500';
    return 'from-red-400 to-red-600';
  };

  return (
    <div className="relative">
      {/* Circular Progress */}
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            stroke={getColor()}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.1 }}
          />
        </svg>

        {/* Time display in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Clock className={`w-6 h-6 mb-1 ${percentage <= 20 ? 'animate-pulse' : ''}`} />
          <motion.div
            className={`text-3xl font-black ${
              percentage <= 20 ? 'text-red-600 animate-pulse' : 'text-gray-800'
            }`}
            animate={percentage <= 5 ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            {timeRemaining}
          </motion.div>
          <div className="text-xs text-gray-500">{t('multiplayer.timer.seconds')}</div>
        </div>
      </div>

      {/* Warning pulses */}
      {percentage <= 20 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className={`absolute w-32 h-32 rounded-full bg-gradient-to-r ${getBackgroundGradient()} opacity-20`}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
          <motion.div
            className={`absolute w-32 h-32 rounded-full bg-gradient-to-r ${getBackgroundGradient()} opacity-10`}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
          />
        </div>
      )}
    </div>
  );
};

export default QuestionTimer;
