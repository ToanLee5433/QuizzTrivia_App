/**
 * AudioPlayer - Component phát âm thanh fullscreen với waveform UI
 * Hỗ trợ trim settings để phát chỉ phần được chọn
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Download, SkipBack, SkipForward, Scissors } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MediaTrimSettings } from '../../../features/quiz/types';
import { formatTime as formatTrimTime } from '../../../utils/mediaTrimUtils';

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  onClose: () => void;
  /** Trim settings - if provided, will only play the trimmed portion */
  trimSettings?: MediaTrimSettings | null;
  /** Show trim indicator */
  showTrimBadge?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  audioUrl, 
  title, 
  onClose,
  trimSettings,
  showTrimBadge = true,
}) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Trim settings
  const hasTrim = trimSettings?.isTrimmed && trimSettings.startTime !== undefined && trimSettings.endTime !== undefined;
  const trimStart = hasTrim ? trimSettings.startTime : 0;
  const trimEnd = hasTrim ? trimSettings.endTime : duration;
  const effectiveDuration = hasTrim ? (trimEnd - trimStart) : duration;
  const effectiveCurrentTime = hasTrim ? Math.max(0, currentTime - trimStart) : currentTime;

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // If at the end of trim range, reset to start
      if (hasTrim && audio.currentTime >= trimEnd) {
        audio.currentTime = trimStart;
      }
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, hasTrim, trimStart, trimEnd]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Skip when user is editing text
      const activeElement = document.activeElement;
      const isEditingText = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true' ||
        activeElement.classList.contains('ql-editor') ||
        activeElement.closest('.ql-container') !== null
      );
      
      if (isEditingText) return;
      
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [onClose, togglePlayPause]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Trim boundary check - stop at end of trim range
      if (hasTrim && audio.currentTime >= trimEnd) {
        audio.pause();
        setIsPlaying(false);
        audio.currentTime = trimStart; // Reset to trim start
      }
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      // Set initial position to trim start
      if (hasTrim && audio.currentTime < trimStart) {
        audio.currentTime = trimStart;
      }
    };
    
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [hasTrim, trimStart, trimEnd]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    
    // If trimmed, adjust to work within trim range
    if (hasTrim) {
      const actualTime = trimStart + time;
      audio.currentTime = Math.min(Math.max(actualTime, trimStart), trimEnd);
    } else {
      audio.currentTime = time;
    }
    setCurrentTime(audio.currentTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const vol = parseFloat(e.target.value);
    audio.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (hasTrim) {
      // Stay within trim bounds when skipping
      const newTime = Math.max(trimStart, Math.min(trimEnd, audio.currentTime + seconds));
      audio.currentTime = newTime;
    } else {
      audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = title || 'audio';
    link.click();
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <audio ref={audioRef} src={audioUrl} />

      <div className="bg-black bg-opacity-40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            {title && (
              <h2 className="text-white text-2xl font-bold mb-1">
                🎵 {title}
              </h2>
            )}
            <div className="flex items-center gap-2">
              <p className="text-blue-200 text-sm">Audio Player</p>
              {/* Trim Badge */}
              {showTrimBadge && hasTrim && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/30 text-purple-200 text-xs rounded-full">
                  <Scissors className="w-3 h-3" />
                  <span>{formatTrimTime(trimStart)} - {formatTrimTime(trimEnd)}</span>
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-red-600 rounded-lg transition-colors"
            title={t('common.dong_esc')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Waveform Visualization (Decorative) */}
        <div className="mb-8 h-32 flex items-end justify-center gap-1">
          {Array.from({ length: 50 }).map((_, i) => {
            const height = isPlaying 
              ? Math.random() * 100 + 20 
              : 30;
            const progress = effectiveDuration > 0 ? effectiveCurrentTime / effectiveDuration : 0;
            const isActive = progress * 50 > i;
            
            return (
              <div
                key={i}
                className={`w-2 rounded-full transition-all duration-150 ${
                  isActive 
                    ? 'bg-gradient-to-t from-blue-500 to-purple-500' 
                    : 'bg-white bg-opacity-20'
                }`}
                style={{
                  height: `${height}%`,
                  animation: isPlaying ? `wave 0.${Math.random() * 9 + 1}s ease-in-out infinite alternate` : 'none'
                }}
              />
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <input
            type="range"
            min="0"
            max={effectiveDuration || 0}
            value={effectiveCurrentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer accent-blue-500"
            style={{
              background: effectiveDuration > 0 
                ? `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${(effectiveCurrentTime / effectiveDuration) * 100}%, rgba(255,255,255,0.2) ${(effectiveCurrentTime / effectiveDuration) * 100}%, rgba(255,255,255,0.2) 100%)`
                : 'rgba(255,255,255,0.2)'
            }}
          />
          <div className="flex justify-between mt-2">
            <span className="text-white text-sm">{formatTime(effectiveCurrentTime)}</span>
            <span className="text-white text-sm">{formatTime(effectiveDuration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* Skip Backward */}
          <button
            onClick={() => skip(-10)}
            className="p-3 text-white hover:bg-white hover:bg-opacity-10 rounded-full transition-all"
            title={t('common.lui_10s')}
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            className="p-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:scale-110 transition-all shadow-lg"
            title={isPlaying ? "Dừng (Space)" : "Phát (Space)"}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" fill="white" />
            ) : (
              <Play className="w-8 h-8 ml-1" fill="white" />
            )}
          </button>

          {/* Skip Forward */}
          <button
            onClick={() => skip(10)}
            className="p-3 text-white hover:bg-white hover:bg-opacity-10 rounded-full transition-all"
            title={t('common.tien_10s')}
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume & Download */}
        <div className="flex items-center justify-between gap-4">
          {/* Volume Control */}
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={toggleMute}
              className="p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
            title={t('common.tai_xuong')}
          >
            <Download className="w-5 h-5" />
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-white text-sm opacity-75">
            💡 <kbd className="px-2 py-1 bg-white bg-opacity-10 rounded">Space</kbd> {t('audioPlayer.spacePlayPause')}
            • <kbd className="px-2 py-1 bg-white bg-opacity-10 rounded">ESC</kbd> {t('audioPlayer.escClose')}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes wave {
          0% { transform: scaleY(1); }
          100% { transform: scaleY(0.5); }
        }
      `}</style>
    </div>
  );
};

export default AudioPlayer;
