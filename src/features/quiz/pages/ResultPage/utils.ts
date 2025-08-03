// Helper: format time (milliseconds or seconds) to mm:ss
export const formatTime = (time: number, isMilliseconds = true) => {
  const seconds = isMilliseconds ? Math.floor(time / 1000) : time;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Helper: format detailed time with hours, minutes, seconds
export const formatDetailedTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

// Helper: format date and time for leaderboard display
export const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  const timeString = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  if (isToday) {
    return `Hôm nay ${timeString}`;
  } else if (isYesterday) {
    return `Hôm qua ${timeString}`;
  } else {
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }
};

// Helper: safe number conversion
export const safeNumber = (val: any, fallback = 0) => {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
};

// Helper: get score color based on percentage
export const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

// Helper: get performance message
export const getPerformanceMessage = (percentage: number) => {
  if (percentage >= 90) return 'Outstanding! 🏆';
  if (percentage >= 80) return 'Excellent! 🌟';
  if (percentage >= 70) return 'Great Job! 👏';
  if (percentage >= 60) return 'Good Work! 👍';
  if (percentage >= 50) return 'Not Bad! 📚';
  return 'Keep Practicing! 💪';
};

// Helper: get rank display with emoji
export const getRankDisplay = (index: number) => {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return index + 1;
};

// Helper: get rank background color
export const getRankBackgroundColor = (index: number) => {
  if (index === 0) return 'bg-yellow-400 text-yellow-900';
  if (index === 1) return 'bg-gray-300 text-gray-700';
  if (index === 2) return 'bg-amber-600 text-amber-100';
  return 'bg-gray-200 text-gray-600';
};
