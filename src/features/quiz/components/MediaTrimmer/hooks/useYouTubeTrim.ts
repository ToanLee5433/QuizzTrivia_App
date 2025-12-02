/**
 * 🎬 useYouTubeTrim Hook
 * Control YouTube player playback with trim settings
 * Uses polling instead of URL params (to avoid ads on end)
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { MediaTrimSettings } from '../../../types';
import { YOUTUBE_POLLING_INTERVAL_MS } from '../../../../../utils/mediaTrimUtils';

// YouTube Player interface (from react-youtube)
interface YouTubePlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  pauseVideo: () => void;
  playVideo: () => void;
  getPlayerState: () => number;
}

// YouTube Player States: 
// -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued

interface UseYouTubeTrimOptions {
  /** YouTube player ref */
  playerRef: React.MutableRefObject<YouTubePlayer | null>;
  /** Trim settings */
  trimSettings?: MediaTrimSettings;
  /** Is player currently playing */
  isPlaying?: boolean;
  /** Enable trim control */
  enabled?: boolean;
}

interface UseYouTubeTrimResult {
  /** Seek to start time */
  seekToStart: () => void;
  /** Seek to end time */
  seekToEnd: () => void;
  /** Seek to specific time (clamped to trim range) */
  seekTo: (time: number) => void;
  /** Play the trimmed segment */
  playTrimmed: () => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Current time (updated during playback) */
  currentTime: number;
  /** Is polling active */
  isPolling: boolean;
}

export const useYouTubeTrim = ({
  playerRef,
  trimSettings,
  isPlaying = false,
  enabled,
}: UseYouTubeTrimOptions): UseYouTubeTrimResult => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if trim control should be active
  const isActive = enabled !== undefined 
    ? enabled 
    : Boolean(trimSettings?.isTrimmed);

  const startTime = trimSettings?.startTime ?? 0;
  const endTime = trimSettings?.endTime ?? Infinity;

  // Check and enforce trim range
  const checkAndEnforce = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isActive) return;

    try {
      const time = player.getCurrentTime();
      setCurrentTime(time);

      // If past endTime -> pause and reset
      if (time >= endTime) {
        player.pauseVideo();
        player.seekTo(startTime, true);
        return;
      }

      // If before startTime (user manually seeked) -> seek to start
      if (time < startTime - 0.5) {
        player.seekTo(startTime, true);
      }
    } catch (err) {
      // Player might not be ready yet
      console.warn('[useYouTubeTrim] Error checking time:', err);
    }
  }, [playerRef, isActive, startTime, endTime]);

  // Seek to start time
  const seekToStart = useCallback(() => {
    const player = playerRef.current;
    if (player) {
      player.seekTo(startTime, true);
      setCurrentTime(startTime);
    }
  }, [playerRef, startTime]);

  // Seek to end time
  const seekToEnd = useCallback(() => {
    const player = playerRef.current;
    if (player && isActive) {
      player.seekTo(Math.max(startTime, endTime - 0.1), true);
    }
  }, [playerRef, isActive, startTime, endTime]);

  // Seek to specific time (clamped to trim range)
  const seekTo = useCallback((time: number) => {
    const player = playerRef.current;
    if (!player) return;

    if (isActive) {
      // Clamp to trim range
      const clampedTime = Math.max(startTime, Math.min(time, endTime - 0.1));
      player.seekTo(clampedTime, true);
      setCurrentTime(clampedTime);
    } else {
      player.seekTo(time, true);
      setCurrentTime(time);
    }
  }, [playerRef, isActive, startTime, endTime]);

  // Play the trimmed segment
  const playTrimmed = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    if (isActive) {
      const current = player.getCurrentTime();
      if (current < startTime || current >= endTime) {
        player.seekTo(startTime, true);
      }
    }
    player.playVideo();
  }, [playerRef, isActive, startTime, endTime]);

  // Stop polling manually
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPolling(false);
    }
  }, []);

  // Main polling effect
  useEffect(() => {
    // Only poll when playing AND trim is active
    if (!isPlaying || !isActive) {
      stopPolling();
      return;
    }

    // Start polling
    setIsPolling(true);
    intervalRef.current = setInterval(checkAndEnforce, YOUTUBE_POLLING_INTERVAL_MS);

    return () => {
      stopPolling();
    };
  }, [isPlaying, isActive, checkAndEnforce, stopPolling]);

  // Initial seek when trim settings change
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isActive) return;

    // Seek to start if current position is outside trim range
    try {
      const current = player.getCurrentTime();
      if (current < startTime || current >= endTime) {
        player.seekTo(startTime, true);
      }
    } catch (err) {
      // Player not ready
    }
  }, [playerRef, isActive, startTime, endTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    seekToStart,
    seekToEnd,
    seekTo,
    playTrimmed,
    stopPolling,
    currentTime,
    isPolling,
  };
};

export default useYouTubeTrim;
