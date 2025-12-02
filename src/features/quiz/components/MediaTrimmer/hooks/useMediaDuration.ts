/**
 * 🎬 useMediaDuration Hook
 * Get duration of HTML5 video/audio or YouTube video
 */

import { useState, useEffect, useCallback, RefObject } from 'react';
import { isYouTubeUrl } from '../../../../../utils/mediaTrimUtils';

interface UseMediaDurationOptions {
  /** Media element ref (for HTML5 video/audio) */
  mediaRef?: RefObject<HTMLMediaElement>;
  /** Media URL (for YouTube detection) */
  url?: string;
  /** YouTube player instance */
  youtubePlayer?: any;
}

interface UseMediaDurationResult {
  /** Duration in seconds */
  duration: number;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Retry function */
  retry: () => void;
}

export const useMediaDuration = ({
  mediaRef,
  url,
  youtubePlayer,
}: UseMediaDurationOptions): UseMediaDurationResult => {
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isYouTube = url ? isYouTubeUrl(url) : false;

  // Get duration from HTML5 media element
  const getHTML5Duration = useCallback(() => {
    const media = mediaRef?.current;
    if (!media) return;

    const handleLoadedMetadata = () => {
      if (media.duration && Number.isFinite(media.duration)) {
        setDuration(media.duration);
        setIsLoading(false);
        setError(null);
      }
    };

    const handleError = () => {
      setError('Không thể tải media');
      setIsLoading(false);
    };

    // Check if already loaded
    if (media.duration && Number.isFinite(media.duration)) {
      setDuration(media.duration);
      setIsLoading(false);
      return;
    }

    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    media.addEventListener('error', handleError);

    // Trigger load if needed
    if (media.readyState < 1) {
      media.load();
    }

    return () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata);
      media.removeEventListener('error', handleError);
    };
  }, [mediaRef]);

  // Get duration from YouTube player
  const getYouTubeDuration = useCallback(() => {
    if (!youtubePlayer) {
      setIsLoading(true);
      return;
    }

    try {
      const ytDuration = youtubePlayer.getDuration?.();
      if (ytDuration && ytDuration > 0) {
        setDuration(ytDuration);
        setIsLoading(false);
        setError(null);
      } else {
        // Retry after a short delay (YouTube player might not be ready)
        const timer = setTimeout(() => {
          const retryDuration = youtubePlayer.getDuration?.();
          if (retryDuration && retryDuration > 0) {
            setDuration(retryDuration);
            setIsLoading(false);
            setError(null);
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      setError('Không thể lấy độ dài video YouTube');
      setIsLoading(false);
    }
  }, [youtubePlayer]);

  // Main effect
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    if (isYouTube) {
      return getYouTubeDuration();
    } else if (mediaRef) {
      return getHTML5Duration();
    } else {
      setIsLoading(false);
    }
  }, [isYouTube, mediaRef, getHTML5Duration, getYouTubeDuration]);

  // Retry function
  const retry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setDuration(0);

    if (isYouTube) {
      getYouTubeDuration();
    } else {
      getHTML5Duration();
    }
  }, [isYouTube, getHTML5Duration, getYouTubeDuration]);

  return {
    duration,
    isLoading,
    error,
    retry,
  };
};

export default useMediaDuration;
