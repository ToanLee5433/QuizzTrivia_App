/**
 * 🎬 VideoPlayer Component
 * Plays both YouTube videos and direct video files
 * Supports media trimming - plays only selected portion
 * Supports single-video playback (pause others when one plays)
 */

import React, { useRef, useEffect, useCallback, useState, useId } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { isYouTubeUrl, extractYouTubeId } from '../../../utils/videoUtils';
import { MediaTrimSettings } from '../../../features/quiz/types';
import { formatTime } from '../../../utils/mediaTrimUtils';

// 🎯 Global registry to manage single video playback
const activePlayerRegistry = new Set<string>();
const pauseCallbacks = new Map<string, () => void>();

// Helper to pause all other videos
const pauseOtherVideos = (currentId: string) => {
  pauseCallbacks.forEach((pause, id) => {
    if (id !== currentId) {
      pause();
    }
  });
};

interface VideoPlayerProps {
  url: string;
  className?: string;
  style?: React.CSSProperties;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  /** Trim settings - if provided, will only play the trimmed portion */
  trimSettings?: MediaTrimSettings | null;
  /** Show trim indicator badge */
  showTrimBadge?: boolean;
  /** Callback when video starts playing */
  onPlay?: () => void;
  /** Callback when video is paused */
  onPause?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  className = '',
  style,
  controls = true,
  autoPlay = false,
  muted = false,
  loop = false,
  onClick,
  trimSettings,
  showTrimBadge = true,
  onPlay,
  onPause,
}) => {
  const playerId = useId();
  const [isYouTubeLoaded, setIsYouTubeLoaded] = useState(autoPlay); // Load immediately if autoPlay
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeRef = useRef<YouTubePlayer | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true); // Track if component is mounted
  const [_isPlaying, setIsPlaying] = useState(false);

  const hasTrim = trimSettings?.isTrimmed && trimSettings.startTime !== undefined && trimSettings.endTime !== undefined;
  const trimStart = hasTrim ? trimSettings.startTime : 0;
  const trimEnd = hasTrim ? trimSettings.endTime : Infinity;

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 🎯 Register this player's pause function
  useEffect(() => {
    const pauseThis = () => {
      if (!isMountedRef.current) return;
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (youtubeRef.current) {
        try {
          youtubeRef.current.pauseVideo();
        } catch { /* Player not ready or destroyed */ }
      }
    };
    
    pauseCallbacks.set(playerId, pauseThis);
    
    return () => {
      pauseCallbacks.delete(playerId);
      activePlayerRegistry.delete(playerId);
    };
  }, [playerId]);

  // ============================================
  // HTML5 Video Trim Control
  // ============================================
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasTrim) return;

    // Set initial position to trim start
    video.currentTime = trimStart;

    const handleTimeUpdate = () => {
      if (video.currentTime >= trimEnd) {
        if (loop) {
          video.currentTime = trimStart;
        } else {
          video.pause();
          video.currentTime = trimStart;
        }
      }
    };

    const handleSeeked = () => {
      // If user seeks outside trim range, bring them back
      if (video.currentTime < trimStart) {
        video.currentTime = trimStart;
      } else if (video.currentTime > trimEnd) {
        video.currentTime = trimEnd - 0.5;
      }
    };

    const handlePlay = () => {
      // Ensure we start from trim start if at beginning
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      // 🎯 Pause other videos when this one starts playing
      pauseOtherVideos(playerId);
      activePlayerRegistry.add(playerId);
      onPlay?.();
    };

    const handlePauseEvent = () => {
      activePlayerRegistry.delete(playerId);
      onPause?.();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePauseEvent);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePauseEvent);
    };
  }, [hasTrim, trimStart, trimEnd, loop, playerId, onPlay, onPause]);

  // ============================================
  // YouTube Video Trim Control (API Polling)
  // ============================================
  const startYouTubePolling = useCallback(() => {
    if (pollIntervalRef.current) return;

    pollIntervalRef.current = setInterval(() => {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        return;
      }
      
      const player = youtubeRef.current;
      if (!player || !hasTrim) return;

      try {
        const currentTime = player.getCurrentTime();
        
        if (currentTime >= trimEnd) {
          if (loop) {
            player.seekTo(trimStart, true);
          } else {
            player.pauseVideo();
            player.seekTo(trimStart, true);
          }
        }
      } catch {
        // Player might not be ready or destroyed
      }
    }, 250); // Poll every 250ms
  }, [hasTrim, trimStart, trimEnd, loop]);

  const stopYouTubePolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopYouTubePolling();
      // Clear YouTube ref to prevent API calls after unmount
      youtubeRef.current = null;
    };
  }, [stopYouTubePolling]);

  const handleYouTubeReady = (event: YouTubeEvent) => {
    // Check if component is still mounted
    if (!isMountedRef.current) return;
    
    youtubeRef.current = event.target;
    
    // Set initial position to trim start (without playing)
    if (hasTrim) {
      try {
        event.target.seekTo(trimStart, true);
        // Ensure video is paused after seeking
        if (!autoPlay) {
          event.target.pauseVideo();
        }
      } catch { /* Player might be destroyed */ }
    }
    
    // Only play if autoPlay is explicitly true
    if (autoPlay) {
      try {
        event.target.playVideo();
      } catch { /* Player might be destroyed */ }
    } else {
      // Ensure video stays paused
      try {
        event.target.pauseVideo();
      } catch { /* Player might be destroyed */ }
    }
  };

  const handleYouTubeStateChange = (event: YouTubeEvent) => {
    // Check if component is still mounted
    if (!isMountedRef.current) return;
    
    const playerState = event.data;
    // YouTube States: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    
    if (playerState === 1) { // Playing
      setIsPlaying(true);
      // 🎯 Pause other videos when this one starts playing
      pauseOtherVideos(playerId);
      activePlayerRegistry.add(playerId);
      onPlay?.();
      if (hasTrim) {
        startYouTubePolling();
      }
    } else {
      setIsPlaying(false);
      activePlayerRegistry.delete(playerId);
      onPause?.();
      if (playerState !== 3) { // Don't stop polling during buffering
        stopYouTubePolling();
      }
    }

    // When video ends, loop if needed
    if (playerState === 0 && loop && hasTrim && youtubeRef.current) {
      try {
        youtubeRef.current.seekTo(trimStart, true);
        youtubeRef.current.playVideo();
      } catch { /* Player might be destroyed */ }
    }
  };

  // ============================================
  // Render Trim Badge
  // ============================================
  const renderTrimBadge = () => {
    if (!showTrimBadge || !hasTrim) return null;

    return (
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 bg-black/70 text-white text-xs rounded-full backdrop-blur-sm">
        <span>✂️</span>
        <span>{formatTime(trimStart)} - {formatTime(trimEnd)}</span>
      </div>
    );
  };

  // ============================================
  // Render YouTube Player
  // ============================================
  if (isYouTubeUrl(url)) {
    const videoId = extractYouTubeId(url);
    
    if (!videoId) {
      return (
        <div className={`bg-gray-100 dark:bg-gray-800 p-4 rounded-lg ${className}`}>
          <p className="text-red-500 text-sm">Invalid YouTube URL</p>
        </div>
      );
    }

    // 🚀 Lazy load: Show thumbnail first, load iframe on click (unless autoPlay)
    if (!isYouTubeLoaded && !autoPlay) {
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      return (
        <div 
          className={`relative cursor-pointer group ${className}`} 
          style={style} 
          onClick={(e) => {
            setIsYouTubeLoaded(true);
            onClick?.(e);
          }}
        >
          {renderTrimBadge()}
          <img 
            src={thumbnailUrl} 
            alt="Video thumbnail" 
            className="w-full h-full object-cover rounded-lg"
          />
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors rounded-lg">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`relative ${className}`} style={style} onClick={onClick}>
        {renderTrimBadge()}
        <YouTube
          videoId={videoId}
          opts={{
            width: '100%',
            height: typeof style?.maxHeight === 'number' ? style.maxHeight : 300,
            playerVars: {
              autoplay: autoPlay ? 1 : 0,
              mute: muted ? 1 : 0, // Only mute if explicitly requested
              loop: loop ? 1 : 0,
              controls: controls ? 1 : 0,
              modestbranding: 1,
              rel: 0, // Don't show related videos
              playsinline: 1, // Better mobile performance
              enablejsapi: 1, // Enable API for trim control
              origin: window.location.origin,
              // Note: We use API polling instead of start/end params
              // because URL params can trigger ads
            },
          }}
          onReady={handleYouTubeReady}
          onStateChange={handleYouTubeStateChange}
          className="rounded-lg overflow-hidden"
          iframeClassName="w-full rounded-lg"
        />
      </div>
    );
  }

  // ============================================
  // Render HTML5 Video Player
  // ============================================
  return (
    <div className={`relative ${className}`} style={style} onClick={onClick}>
      {renderTrimBadge()}
      <video
        ref={videoRef}
        src={url}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        loop={false} // We handle loop manually for trimmed videos
        preload={autoPlay ? "auto" : "metadata"} // 🚀 Faster load: auto for autoplay, metadata for others
        playsInline // Better mobile performance
        className="w-full rounded-lg"
        style={style}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;
