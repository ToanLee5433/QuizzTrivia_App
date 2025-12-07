import { QuizResult } from '../types/quiz';

/**
 * Format a duration in minutes to a human-readable string
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} phút`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}p`;
};

/**
 * Format a date to Vietnamese locale with various formats
 * @param date - Date object or timestamp to format
 * @param format - 'short' (dd/mm/yyyy), 'long' (dd/mm/yyyy HH:mm), 'full' (dd tháng mm năm yyyy HH:mm)
 */
export const formatDate = (date: any, format: 'short' | 'long' | 'full' = 'long'): string => {
  // Handle Firestore Timestamp objects
  if (date && typeof date === 'object' && 'toDate' in date) {
    return formatDate(date.toDate(), format);
  }
  if (date && typeof date === 'object' && 'seconds' in date) {
    return formatDate(new Date(date.seconds * 1000), format);
  }
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (format === 'short') {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dateObj);
  }
  
  if (format === 'long') {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(dateObj);
  }
  
  // format === 'full'
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(dateObj);
};

/**
 * Format a number to percentage with Vietnamese locale
 */
export const formatPercentage = (value: number, total: number): string => {
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
};

/**
 * Calculate quiz score
 */
export const calculateScore = (result: QuizResult): number => {
  return Math.round((result.correctAnswers / result.totalQuestions) * 100);
};

/**
 * Get difficulty badge color
 */
export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'hard':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get difficulty label in Vietnamese
 */
export const getDifficultyLabel = (difficulty: string): string => {
  switch (difficulty) {
    case 'easy':
      return 'Dễ';
    case 'medium':
      return 'Trung bình';
    case 'hard':
      return 'Khó';
    default:
      return 'Không xác định';
  }
};

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Generate a random ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * Requirements: minimum 8 characters, including number, lowercase, uppercase, and special character
 */
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
  errorKeys: string[]; // i18n keys for errors
} => {
  const errors: string[] = [];
  const errorKeys: string[] = [];
  
  if (password.length < 8) {
    errors.push('Mật khẩu phải có ít nhất 8 ký tự');
    errorKeys.push('auth.validation.password.minLength');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ hoa');
    errorKeys.push('auth.validation.password.uppercase');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ thường');
    errorKeys.push('auth.validation.password.lowercase');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 số');
    errorKeys.push('auth.validation.password.number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 ký tự đặc biệt');
    errorKeys.push('auth.validation.password.special');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    errorKeys,
  };
};

/**
 * Format time in seconds to MM:SS format
 */
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Get reading time estimate for text
 */
export const getReadingTime = (text: string): number => {
  const wordsPerMinute = 200;
  const words = text.split(' ').length;
  return Math.ceil(words / wordsPerMinute);
};

/**
 * Sanitize HTML to prevent XSS
 */
export const sanitizeHtml = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
};

/**
 * Get browser information
 */
export const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  
  if (userAgent.includes('Chrome')) {
    browserName = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
  } else if (userAgent.includes('Safari')) {
    browserName = 'Safari';
  } else if (userAgent.includes('Edge')) {
    browserName = 'Edge';
  }
  
  return {
    name: browserName,
    userAgent,
    language: navigator.language,
    platform: navigator.platform,
  };
};
