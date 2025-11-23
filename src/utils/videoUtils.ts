/**
 * Video Utilities - Support for YouTube and direct video URLs
 */

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
export const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;

  // YouTube watch URL: youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  // YouTube short URL: youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) return shortMatch[1];

  // YouTube embed URL: youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?]+)/);
  if (embedMatch) return embedMatch[1];

  return null;
};

/**
 * Check if URL is a YouTube video
 */
export const isYouTubeUrl = (url: string): boolean => {
  if (!url) return false;
  return /(?:youtube\.com|youtu\.be)/.test(url);
};

/**
 * Convert YouTube URL to embed URL
 */
export const getYouTubeEmbedUrl = (url: string): string | null => {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}`;
};

/**
 * Get YouTube thumbnail URL
 */
export const getYouTubeThumbnail = (url: string): string | null => {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

/**
 * Check if URL is a valid video URL (YouTube or direct video file)
 */
export const isValidVideoUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check if YouTube
  if (isYouTubeUrl(url)) return true;
  
  // Check if direct video file
  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)(\?.*)?$/i;
  return videoExtensions.test(url);
};
