/**
 * 🎬 VideoPlayer Component
 * Plays both YouTube videos and direct video files
 * Supports media trimming - plays only selected portion
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { isYouTubeUrl, extractYouTubeId } from '../../../utils/videoUtils';
import { MediaTrimSettings } from '../../../features/quiz/types';
import { formatTime } from '../../../utils/mediaTrimUtils';

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
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeRef = useRef<YouTubePlayer | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [_isPlaying, setIsPlaying] = useState(false);

  const hasTrim = trimSettings?.isTrimmed && trimSettings.startTime !== undefined && trimSettings.endTime !== undefined;
  const trimStart = hasTrim ? trimSettings.startTime : 0;
  const trimEnd = hasTrim ? trimSettings.endTime : Infinity;

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
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('play', handlePlay);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('play', handlePlay);
    };
  }, [hasTrim, trimStart, trimEnd, loop]);

  // ============================================
  // YouTube Video Trim Control (API Polling)
  // ============================================
  const startYouTubePolling = useCallback(() => {
    if (pollIntervalRef.current) return;

    pollIntervalRef.current = setInterval(() => {
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
        // Player might not be ready
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
    };
  }, [stopYouTubePolling]);

  const handleYouTubeReady = (event: YouTubeEvent) => {
    youtubeRef.current = event.target;
    
    // Set initial position to trim start
    if (hasTrim) {
      event.target.seekTo(trimStart, true);
    }
    
    if (autoPlay) {
      event.target.playVideo();
    }
  };

  const handleYouTubeStateChange = (event: YouTubeEvent) => {
    const playerState = event.data;
    // YouTube States: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    
    if (playerState === 1) { // Playing
      setIsPlaying(true);
      if (hasTrim) {
        startYouTubePolling();
      }
    } else {
      setIsPlaying(false);
      if (playerState !== 3) { // Don't stop polling during buffering
        stopYouTubePolling();
      }
    }

    // When video ends, loop if needed
    if (playerState === 0 && loop && hasTrim) {
      youtubeRef.current?.seekTo(trimStart, true);
      youtubeRef.current?.playVideo();
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
              mute: muted ? 1 : 0,
              loop: loop ? 1 : 0,
              controls: controls ? 1 : 0,
              modestbranding: 1,
              rel: 0, // Don't show related videos
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
        className="w-full rounded-lg"
        style={style}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;
