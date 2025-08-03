import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../../lib/store';
import { updateTimeLeft } from '../../../store';

interface UseQuizTimerProps {
  onTimeUp: () => void;
  isActive?: boolean;
}

export const useQuizTimer = ({ onTimeUp, isActive = true }: UseQuizTimerProps) => {
  const dispatch = useDispatch();
  const { timeLeft, totalTime, quizStartTime, isTimeWarning } = useSelector((state: RootState) => state.quiz);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [hasTriggeredTimeUp, setHasTriggeredTimeUp] = useState(false);

  // Start timer when quiz is active
  useEffect(() => {
    if (isActive && quizStartTime && totalTime > 0) {
      // Update timer every second
      intervalRef.current = setInterval(() => {
        dispatch(updateTimeLeft());
      }, 1000);

      // Initial update
      dispatch(updateTimeLeft());
    } else {
      // Clear interval when not active
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, quizStartTime, totalTime, dispatch]);

  // Trigger time up callback when time reaches 0
  useEffect(() => {
    if (timeLeft <= 0 && !hasTriggeredTimeUp && quizStartTime) {
      setHasTriggeredTimeUp(true);
      onTimeUp();
    }
  }, [timeLeft, hasTriggeredTimeUp, onTimeUp, quizStartTime]);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Calculate progress and warnings
  const formattedTime = formatTime(timeLeft);
  const percentage = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  
  // Modern quiz timer logic - only warn when under 10% of total time
  const timeWarningThreshold = Math.ceil(totalTime * 0.1); // 10% of total time
  const isTimeRunningOut = timeLeft <= timeWarningThreshold;
  const isTimeCritical = timeLeft <= Math.ceil(totalTime * 0.05); // Last 5% is critical
  
  // Calculate time taken - based on actual elapsed time, not timer countdown
  const timeTaken = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0;
  const timeTakenFormatted = formatTime(timeTaken);

  return {
    timeLeft,
    formattedTime,
    percentage,
    isRunning: isActive,
    isTimeRunningOut,
    isTimeCritical,
    isTimeWarning,
    timeTaken,
    timeTakenFormatted,
    totalTime,
    formatTime
  };
};
