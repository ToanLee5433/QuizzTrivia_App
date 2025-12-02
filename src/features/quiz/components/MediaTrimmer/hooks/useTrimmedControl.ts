/**
 * 🎬 useTrimmedControl Hook
 * Control HTML5 video/audio playback with trim settings
 * Auto-seek to startTime, auto-pause at endTime
 */

import { useEffect, useCallback, RefObject, useState } from 'react';
import { MediaTrimSettings } from '../../../types';

interface UseTrimmedControlOptions {
  /** HTML5 media element ref */
  mediaRef: RefObject<HTMLMediaElement>;
  /** Trim settings */
  trimSettings?: MediaTrimSettings;
  /** Enable trim control (default: true if trimSettings.isTrimmed) */
  enabled?: boolean;
}

interface UseTrimmedControlResult {
  /** Seek to start time */
  seekToStart: () => void;
  /** Seek to end time */
  seekToEnd: () => void;
  /** Seek to specific time (clamped to trim range) */
  seekTo: (time: number) => void;
  /** Play the trimmed segment */
  playTrimmed: () => void;
  /** Current time (updated during playback) */
  currentTime: number;
  /** Is currently playing */
  isPlaying: boolean;
}

export const useTrimmedControl = ({
  mediaRef,
  trimSettings,
  enabled,
}: UseTrimmedControlOptions): UseTrimmedControlResult => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Determine if trim control should be active
  const isActive = enabled !== undefined 
    ? enabled 
    : Boolean(trimSettings?.isTrimmed);

  const startTime = trimSettings?.startTime ?? 0;
  const endTime = trimSettings?.endTime ?? Infinity;

  // Seek to start time
  const seekToStart = useCallback(() => {
    const media = mediaRef.current;
    if (media && isActive) {
      media.currentTime = startTime;
    }
  }, [mediaRef, isActive, startTime]);

  // Seek to end time
  const seekToEnd = useCallback(() => {
    const media = mediaRef.current;
    if (media && isActive) {
      media.currentTime = Math.max(0, endTime - 0.1);
    }
  }, [mediaRef, isActive, endTime]);

  // Seek to specific time (clamped to trim range)
  const seekTo = useCallback((time: number) => {
    const media = mediaRef.current;
    if (!media) return;

    if (isActive) {
      // Clamp to trim range
      const clampedTime = Math.max(startTime, Math.min(time, endTime));
      media.currentTime = clampedTime;
    } else {
      media.currentTime = time;
    }
  }, [mediaRef, isActive, startTime, endTime]);

  // Play the trimmed segment
  const playTrimmed = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (isActive) {
      // Make sure we're at or after startTime
      if (media.currentTime < startTime || media.currentTime >= endTime) {
        media.currentTime = startTime;
      }
    }
    media.play().catch(() => {
      // Handle autoplay blocked
      console.warn('[useTrimmedControl] Autoplay blocked');
    });
  }, [mediaRef, isActive, startTime, endTime]);

  // Main effect: control playback
  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !isActive) return;

    // 1. Seek to startTime when loaded
    const onLoadedMetadata = () => {
      if (media.currentTime < startTime) {
        media.currentTime = startTime;
      }
    };

    // 2. Check and enforce trim range during playback
    const onTimeUpdate = () => {
      setCurrentTime(media.currentTime);

      // Stop at endTime
      if (media.currentTime >= endTime) {
        media.pause();
        media.currentTime = startTime; // Reset to start
      }
    };

    // 3. When play starts, ensure we're in range
    const onPlay = () => {
      setIsPlaying(true);
      if (media.currentTime < startTime || media.currentTime >= endTime) {
        media.currentTime = startTime;
      }
    };

    // 4. Track pause state
    const onPause = () => {
      setIsPlaying(false);
    };

    // 5. When seeking, clamp to trim range
    const onSeeking = () => {
      if (media.currentTime < startTime) {
        media.currentTime = startTime;
      } else if (media.currentTime >= endTime) {
        media.currentTime = Math.max(startTime, endTime - 0.1);
      }
    };

    // Add listeners
    media.addEventListener('loadedmetadata', onLoadedMetadata);
    media.addEventListener('timeupdate', onTimeUpdate);
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('seeking', onSeeking);

    // Initial check if already loaded
    if (media.readyState >= 1) {
      onLoadedMetadata();
    }

    return () => {
      media.removeEventListener('loadedmetadata', onLoadedMetadata);
      media.removeEventListener('timeupdate', onTimeUpdate);
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('seeking', onSeeking);
    };
  }, [mediaRef, isActive, startTime, endTime]);

  // Track time even when not trimmed
  useEffect(() => {
    const media = mediaRef.current;
    if (!media || isActive) return;

    const onTimeUpdate = () => setCurrentTime(media.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    media.addEventListener('timeupdate', onTimeUpdate);
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);

    return () => {
      media.removeEventListener('timeupdate', onTimeUpdate);
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
    };
  }, [mediaRef, isActive]);

  return {
    seekToStart,
    seekToEnd,
    seekTo,
    playTrimmed,
    currentTime,
    isPlaying,
  };
};

export default useTrimmedControl;
