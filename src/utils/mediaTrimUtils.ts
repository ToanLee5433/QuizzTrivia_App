/**
 * 🎬 Media Trim Utilities
 * Non-destructive trimming - chỉ lưu metadata, không cắt file thật
 * 
 * VALIDATION RULES:
 * - File Upload: Giới hạn video nguồn 15 phút (bảo vệ RAM/bandwidth)
 * - YouTube: KHÔNG giới hạn video nguồn, chỉ giới hạn đoạn cắt 3 phút (game pacing)
 */

import { MediaTrimSettings } from '../features/quiz/types';

// ===== CONSTANTS =====

// File upload limits (RAM & bandwidth protection)
export const MAX_FILE_DURATION_MINUTES = 15;
export const MAX_MEDIA_SIZE_MB = 100;

// YouTube limits (game pacing - player experience)
export const MAX_YOUTUBE_TRIM_DURATION_MINUTES = 3;
export const MAX_YOUTUBE_SOURCE_DURATION_HOURS = 4; // Practical limit, not enforced strictly

// Shared limits
export const MIN_TRIM_DURATION_SECONDS = 3;
export const YOUTUBE_POLLING_INTERVAL_MS = 250;

// Legacy export for backwards compatibility
export const MAX_MEDIA_DURATION_MINUTES = MAX_FILE_DURATION_MINUTES;

// ===== VALIDATION =====

export type MediaSourceType = 'file' | 'youtube';

/**
 * Validate media source duration
 * - File: Chặn video nguồn > 15 phút (RAM protection)
 * - YouTube: Cho phép video nguồn dài (streaming, không tốn RAM)
 */
export const validateMediaForTrim = (
  durationSeconds: number,
  fileSizeMB?: number,
  sourceType: MediaSourceType = 'file'
): { valid: boolean; error?: string; warning?: string } => {
  
  // YouTube: Không giới hạn độ dài video nguồn
  // Vì YouTube stream từ server Google, không tốn RAM
  if (sourceType === 'youtube') {
    // Chỉ warning nếu video quá dài (optional)
    if (durationSeconds > MAX_YOUTUBE_SOURCE_DURATION_HOURS * 60 * 60) {
      return {
        valid: true,
        warning: `Video rất dài (${Math.round(durationSeconds / 3600)} giờ). Hãy chọn đoạn cắt phù hợp.`
      };
    }
    return { valid: true };
  }
  
  // File upload: Giới hạn 15 phút để bảo vệ RAM
  const maxDurationSeconds = MAX_FILE_DURATION_MINUTES * 60;
  
  if (durationSeconds > maxDurationSeconds) {
    return {
      valid: false,
      error: `File quá dài (${Math.round(durationSeconds / 60)} phút). Tối đa ${MAX_FILE_DURATION_MINUTES} phút cho file tải lên.`
    };
  }
  
  if (fileSizeMB && fileSizeMB > MAX_MEDIA_SIZE_MB) {
    return {
      valid: false,
      error: `File quá nặng (${fileSizeMB.toFixed(1)}MB). Tối đa ${MAX_MEDIA_SIZE_MB}MB.`
    };
  }
  
  return { valid: true };
};

/**
 * Validate trim range with source type awareness
 * - File: Validate against source duration
 * - YouTube: Also enforce max 3 min trim duration for game pacing
 */
export const validateTrimRange = (
  startTime: number,
  endTime: number,
  totalDuration: number,
  sourceType: MediaSourceType = 'file'
): { valid: boolean; error?: string } => {
  if (startTime < 0) {
    return { valid: false, error: 'Thời gian bắt đầu không hợp lệ' };
  }
  
  if (endTime > totalDuration) {
    return { valid: false, error: 'Thời gian kết thúc vượt quá độ dài video' };
  }
  
  if (endTime <= startTime) {
    return { valid: false, error: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu' };
  }
  
  const trimDuration = endTime - startTime;
  
  if (trimDuration < MIN_TRIM_DURATION_SECONDS) {
    return { 
      valid: false, 
      error: `Đoạn cắt phải dài ít nhất ${MIN_TRIM_DURATION_SECONDS} giây` 
    };
  }
  
  // YouTube: Giới hạn đoạn cắt 3 phút để đảm bảo game pacing
  if (sourceType === 'youtube') {
    const maxTrimSeconds = MAX_YOUTUBE_TRIM_DURATION_MINUTES * 60;
    if (trimDuration > maxTrimSeconds) {
      return {
        valid: false,
        error: `Đoạn cắt quá dài cho Quiz! Vui lòng cắt dưới ${MAX_YOUTUBE_TRIM_DURATION_MINUTES} phút.`
      };
    }
  }
  
  return { valid: true };
};

// ===== TIME FORMATTING =====

/**
 * Format seconds to mm:ss string
 * @example formatTime(125) => "2:05"
 */
export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format seconds to mm:ss.ms string (for precise display)
 * @example formatTimePrecise(125.5) => "2:05.5"
 */
export const formatTimePrecise = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00.0';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
};

/**
 * Parse mm:ss string to seconds
 * @example parseTime("2:05") => 125
 * @returns null if invalid format
 */
export const parseTime = (timeStr: string): number | null => {
  if (!timeStr) return null;
  
  // Support both "2:05" and "02:05" formats
  const match = timeStr.trim().match(/^(\d{1,3}):(\d{2})$/);
  if (!match) return null;
  
  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);
  
  // Validate seconds range
  if (secs >= 60) return null;
  
  return mins * 60 + secs;
};

/**
 * Parse time input with flexible formats
 * Supports: "2:05", "125", "2m5s", "02:05"
 */
export const parseTimeFlexible = (input: string): number | null => {
  const trimmed = input.trim();
  
  // Try mm:ss format first
  const mmssResult = parseTime(trimmed);
  if (mmssResult !== null) return mmssResult;
  
  // Try pure seconds
  const seconds = parseFloat(trimmed);
  if (!isNaN(seconds) && seconds >= 0) {
    return Math.floor(seconds);
  }
  
  // Try XmYs format (e.g., "2m30s")
  const minsMatch = trimmed.match(/^(\d+)m(?:(\d+)s?)?$/i);
  if (minsMatch) {
    const mins = parseInt(minsMatch[1], 10);
    const secs = minsMatch[2] ? parseInt(minsMatch[2], 10) : 0;
    return mins * 60 + secs;
  }
  
  return null;
};

// ===== TRIM SETTINGS HELPERS =====

/**
 * Create default trim settings (no trim - play full)
 */
export const createDefaultTrimSettings = (duration: number): MediaTrimSettings => ({
  startTime: 0,
  endTime: duration,
  duration: duration,
  isTrimmed: false,
});

/**
 * Create trim settings from start/end times
 */
export const createTrimSettings = (
  startTime: number,
  endTime: number,
  totalDuration: number
): MediaTrimSettings => {
  // Clamp values to valid range
  const clampedStart = Math.max(0, Math.min(startTime, totalDuration));
  const clampedEnd = Math.max(clampedStart + MIN_TRIM_DURATION_SECONDS, Math.min(endTime, totalDuration));
  
  const trimDuration = clampedEnd - clampedStart;
  
  // Check if actually trimmed (not full duration)
  const isTrimmed = clampedStart > 0 || clampedEnd < totalDuration;
  
  return {
    startTime: clampedStart,
    endTime: clampedEnd,
    duration: trimDuration,
    isTrimmed,
  };
};

/**
 * Check if media should use trimmed playback
 */
export const shouldUseTrimmedPlayback = (trim?: MediaTrimSettings): boolean => {
  return Boolean(trim?.isTrimmed);
};

/**
 * Get display string for trim info
 * @example getTrimDisplayString(trim) => "0:30 - 2:15 (1:45)"
 */
export const getTrimDisplayString = (trim?: MediaTrimSettings): string | null => {
  if (!trim?.isTrimmed) return null;
  
  const start = formatTime(trim.startTime);
  const end = formatTime(trim.endTime);
  const duration = formatTime(trim.duration);
  
  return `${start} - ${end} (${duration})`;
};

// ===== YOUTUBE HELPERS =====

/**
 * Check if URL is a YouTube video
 */
export const isYouTubeUrl = (url: string): boolean => {
  if (!url) return false;
  return /(?:youtube\.com|youtu\.be)/.test(url);
};

/**
 * Extract YouTube video ID from URL
 */
export const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?]+)/);
  if (embedMatch) return embedMatch[1];

  return null;
};

/**
 * Get YouTube embed URL with optional start time only (NO end param to avoid ads)
 * ⚠️ We use API polling for end time, not URL params
 */
export const getYouTubeEmbedUrl = (
  url: string,
  startTime?: number
): string | null => {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  
  let embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const params = new URLSearchParams();
  
  // Only add start time - end time is handled via API
  if (startTime !== undefined && startTime > 0) {
    params.set('start', Math.floor(startTime).toString());
  }
  
  // Enable JS API for control
  params.set('enablejsapi', '1');
  params.set('rel', '0');
  params.set('modestbranding', '1');
  
  const paramStr = params.toString();
  return paramStr ? `${embedUrl}?${paramStr}` : embedUrl;
};

// ===== MEDIA TYPE DETECTION =====

/**
 * Check if URL is video
 */
export const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check YouTube
  if (isYouTubeUrl(url)) return true;
  
  // Check video file extensions
  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)(\?.*)?$/i;
  return videoExtensions.test(url);
};

/**
 * Check if URL is audio
 */
export const isAudioUrl = (url: string): boolean => {
  if (!url) return false;
  
  const audioExtensions = /\.(mp3|wav|ogg|aac|flac|m4a|wma)(\?.*)?$/i;
  return audioExtensions.test(url);
};

/**
 * Get media type from URL
 */
export const getMediaType = (url: string): 'video' | 'audio' | 'unknown' => {
  if (isVideoUrl(url)) return 'video';
  if (isAudioUrl(url)) return 'audio';
  return 'unknown';
};

/**
 * Check if media can be trimmed
 */
export const canTrimMedia = (url: string): boolean => {
  const type = getMediaType(url);
  return type === 'video' || type === 'audio';
};

export default {
  // Constants
  MAX_MEDIA_DURATION_MINUTES,
  MAX_MEDIA_SIZE_MB,
  MIN_TRIM_DURATION_SECONDS,
  YOUTUBE_POLLING_INTERVAL_MS,
  // Validation
  validateMediaForTrim,
  validateTrimRange,
  // Time formatting
  formatTime,
  formatTimePrecise,
  parseTime,
  parseTimeFlexible,
  // Trim settings
  createDefaultTrimSettings,
  createTrimSettings,
  shouldUseTrimmedPlayback,
  getTrimDisplayString,
  // YouTube
  isYouTubeUrl,
  extractYouTubeId,
  getYouTubeEmbedUrl,
  // Media type
  isVideoUrl,
  isAudioUrl,
  getMediaType,
  canTrimMedia,
};
