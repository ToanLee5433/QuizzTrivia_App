/**
 * 🎵 TrimmedAudio Component
 * Audio player with trim support - plays only selected portion
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Scissors } from 'lucide-react';
import { MediaTrimSettings } from '../../../features/quiz/types';
import { formatTime } from '../../../utils/mediaTrimUtils';

interface TrimmedAudioProps {
  url: string;
  className?: string;
  /** Trim settings - if provided, will only play the trimmed portion */
  trimSettings?: MediaTrimSettings | null;
  /** Show trim indicator badge */
  showTrimBadge?: boolean;
  /** Show native controls (default: false - uses custom controls) */
  nativeControls?: boolean;
}

export const TrimmedAudio: React.FC<TrimmedAudioProps> = ({
  url,
  className = '',
  trimSettings,
  showTrimBadge = true,
  nativeControls = false,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Trim calculations
  const hasTrim = trimSettings?.isTrimmed && trimSettings.startTime !== undefined && trimSettings.endTime !== undefined;
  const trimStart = hasTrim ? trimSettings.startTime : 0;
  const trimEnd = hasTrim ? trimSettings.endTime : duration;
  const effectiveDuration = hasTrim ? (trimEnd - trimStart) : duration;
  const effectiveCurrentTime = hasTrim ? Math.max(0, currentTime - trimStart) : currentTime;
  const progress = effectiveDuration > 0 ? (effectiveCurrentTime / effectiveDuration) * 100 : 0;

  // Handle time updates and enforce trim boundaries
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Check trim boundary
      if (hasTrim && audio.currentTime >= trimEnd) {
        audio.pause();
        audio.currentTime = trimStart;
        setIsPlaying(false);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      // Set initial position to trim start
      if (hasTrim) {
        audio.currentTime = trimStart;
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (hasTrim) {
        audio.currentTime = trimStart;
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [hasTrim, trimStart, trimEnd]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // If at or past end, reset to start
      if (hasTrim && audio.currentTime >= trimEnd) {
        audio.currentTime = trimStart;
      }
      audio.play();
    }
  }, [isPlaying, hasTrim, trimStart, trimEnd]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    
    if (hasTrim) {
      const newTime = trimStart + (percent * effectiveDuration);
      audio.currentTime = Math.max(trimStart, Math.min(trimEnd, newTime));
    } else {
      audio.currentTime = percent * duration;
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !audio.muted;
    setIsMuted(!isMuted);
  };

  // Native controls mode (simple HTML5 audio with hidden trim handling)
  if (nativeControls) {
    return (
      <div className={`relative ${className}`}>
        {/* Trim badge */}
        {showTrimBadge && hasTrim && (
          <div className="flex items-center gap-1 mb-2 text-xs text-purple-600 dark:text-purple-400">
            <Scissors className="w-3 h-3" />
            <span>Đã cắt: {formatTime(trimStart)} - {formatTime(trimEnd)}</span>
          </div>
        )}
        <audio
          ref={audioRef}
          src={url}
          controls
          className="w-full"
        >
          Trình duyệt không hỗ trợ phát audio
        </audio>
      </div>
    );
  }

  // Custom controls mode
  return (
    <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg p-3 ${className}`}>
      <audio ref={audioRef} src={url} />
      
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          className="w-10 h-10 flex items-center justify-center bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-colors"
          aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px]">
            {formatTime(effectiveCurrentTime)}
          </span>
          
          <div 
            className="flex-1 h-2 bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px]">
            {formatTime(effectiveDuration)}
          </span>
        </div>

        {/* Volume Toggle */}
        <button
          onClick={toggleMute}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Trim Badge */}
      {showTrimBadge && hasTrim && (
        <div className="flex items-center gap-1 mt-2 text-xs text-purple-600 dark:text-purple-400">
          <Scissors className="w-3 h-3" />
          <span>Đã cắt: {formatTime(trimStart)} - {formatTime(trimEnd)}</span>
        </div>
      )}
    </div>
  );
};

export default TrimmedAudio;
