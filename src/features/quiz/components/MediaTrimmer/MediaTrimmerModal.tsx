/**
 * 🎬 MediaTrimmerModal Component
 * Full-featured modal for trimming video/audio
 * Supports both HTML5 media and YouTube
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import clsx from 'clsx';
import { X, Play, Pause, RotateCcw, Scissors, Save, AlertTriangle, Loader2 } from 'lucide-react';

import { MediaTrimSettings } from '../../types';
import { TrimSlider } from './TrimSlider';
import { TimeInputs } from './TimeInputs';
import { useTrimmedControl } from './hooks/useTrimmedControl';
import { useYouTubeTrim } from './hooks/useYouTubeTrim';
import {
  isYouTubeUrl,
  extractYouTubeId,
  createTrimSettings,
  validateMediaForTrim,
  validateTrimRange,
  formatTime,
  getMediaType,
  MAX_YOUTUBE_TRIM_DURATION_MINUTES,
} from '../../../../utils/mediaTrimUtils';

interface MediaTrimmerModalProps {
  /** Media URL (video or audio) */
  mediaUrl: string;
  /** Initial trim settings (optional) */
  initialTrim?: MediaTrimSettings;
  /** Called when user saves trim */
  onSave: (trim: MediaTrimSettings) => void;
  /** Called when modal closes */
  onClose: () => void;
  /** Modal open state */
  isOpen: boolean;
}

export const MediaTrimmerModal: React.FC<MediaTrimmerModalProps> = ({
  mediaUrl,
  initialTrim,
  onSave,
  onClose,
  isOpen,
}) => {
  const { t } = useTranslation();
  
  // State
  const [startTime, setStartTime] = useState(initialTrim?.startTime ?? 0);
  const [endTime, setEndTime] = useState(initialTrim?.endTime ?? 0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  
  // Detect media type
  const isYouTube = isYouTubeUrl(mediaUrl);
  const mediaType = getMediaType(mediaUrl);
  const youtubeVideoId = isYouTube ? extractYouTubeId(mediaUrl) : null;
  const sourceType = isYouTube ? 'youtube' : 'file';
  
  // Get the appropriate media ref
  const mediaRef = mediaType === 'audio' ? audioRef : videoRef;

  // Hooks for HTML5 media control
  const trimmedControl = useTrimmedControl({
    mediaRef: mediaRef as React.RefObject<HTMLMediaElement>,
    trimSettings: { startTime, endTime, duration: endTime - startTime, isTrimmed: true },
    enabled: !isYouTube,
  });

  // Hook for YouTube control
  const youtubeTrim = useYouTubeTrim({
    playerRef: youtubePlayerRef,
    trimSettings: { startTime, endTime, duration: endTime - startTime, isTrimmed: true },
    isPlaying,
    enabled: isYouTube,
  });

  // Initialize with duration when loaded
  const handleDurationLoaded = useCallback((loadedDuration: number) => {
    setDuration(loadedDuration);
    setIsLoading(false);
    
    // Validate media source duration (different rules for File vs YouTube)
    const validation = validateMediaForTrim(loadedDuration, undefined, sourceType);
    if (!validation.valid) {
      setError(validation.error || null);
    } else if (validation.warning) {
      setValidationWarning(validation.warning);
    }

    // Set initial end time if not provided
    if (!initialTrim) {
      setEndTime(loadedDuration);
    } else if (initialTrim.endTime > loadedDuration) {
      setEndTime(loadedDuration);
    }
  }, [initialTrim, sourceType]);

  // Handle HTML5 media loaded
  useEffect(() => {
    if (isYouTube) return;
    
    const media = mediaRef.current;
    if (!media) return;

    const handleLoaded = () => {
      if (media.duration && Number.isFinite(media.duration)) {
        handleDurationLoaded(media.duration);
      }
    };

    const handleError = () => {
      setError(t('mediaTrimmer.loadError', 'Không thể tải media'));
      setIsLoading(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    media.addEventListener('loadedmetadata', handleLoaded);
    media.addEventListener('error', handleError);
    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);

    // Check if already loaded
    if (media.readyState >= 1) {
      handleLoaded();
    }

    return () => {
      media.removeEventListener('loadedmetadata', handleLoaded);
      media.removeEventListener('error', handleError);
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
    };
  }, [isYouTube, mediaRef, handleDurationLoaded, t]);

  // Handle YouTube player ready
  const handleYouTubeReady = useCallback((event: YouTubeEvent) => {
    youtubePlayerRef.current = event.target;
    const ytDuration = event.target.getDuration();
    if (ytDuration > 0) {
      handleDurationLoaded(ytDuration);
    }
  }, [handleDurationLoaded]);

  // Handle YouTube state change
  const handleYouTubeStateChange = useCallback((event: YouTubeEvent) => {
    const state = event.data;
    setIsPlaying(state === 1); // 1 = playing
  }, []);

  // Handle YouTube error
  const handleYouTubeError = useCallback(() => {
    setError(t('mediaTrimmer.youtubeError', 'Không thể tải video YouTube'));
    setIsLoading(false);
  }, [t]);

  // Handle slider value change (continuous)
  const handleSliderChange = useCallback((val: [number, number]) => {
    setStartTime(val[0]);
    setEndTime(val[1]);
  }, []);

  // Handle slider value commit (seek video)
  const handleSliderCommit = useCallback((val: [number, number]) => {
    setStartTime(val[0]);
    setEndTime(val[1]);
    
    // Seek to start position
    if (isYouTube) {
      youtubePlayerRef.current?.seekTo(val[0], true);
    } else {
      const media = mediaRef.current;
      if (media) {
        media.currentTime = val[0];
      }
    }
  }, [isYouTube, mediaRef]);

  // Handle time inputs change
  const handleTimeInputsChange = useCallback((newStart: number, newEnd: number) => {
    setStartTime(newStart);
    setEndTime(newEnd);
    
    // Seek to new start position
    if (isYouTube) {
      youtubePlayerRef.current?.seekTo(newStart, true);
    } else {
      const media = mediaRef.current;
      if (media) {
        media.currentTime = newStart;
      }
    }
  }, [isYouTube, mediaRef]);

  // Play/Pause toggle
  const togglePlayPause = useCallback(() => {
    if (isYouTube) {
      if (isPlaying) {
        youtubePlayerRef.current?.pauseVideo();
      } else {
        youtubeTrim.playTrimmed();
      }
    } else {
      const media = mediaRef.current;
      if (!media) return;
      
      if (isPlaying) {
        media.pause();
      } else {
        trimmedControl.playTrimmed();
      }
    }
  }, [isYouTube, isPlaying, youtubeTrim, mediaRef, trimmedControl]);

  // Preview from start
  const handlePreview = useCallback(() => {
    if (isYouTube) {
      youtubeTrim.seekToStart();
      youtubePlayerRef.current?.playVideo();
    } else {
      trimmedControl.seekToStart();
      mediaRef.current?.play();
    }
  }, [isYouTube, youtubeTrim, trimmedControl, mediaRef]);

  // Reset to full duration
  const handleReset = useCallback(() => {
    setStartTime(0);
    setEndTime(duration);
    
    if (isYouTube) {
      youtubePlayerRef.current?.seekTo(0, true);
    } else {
      const media = mediaRef.current;
      if (media) {
        media.currentTime = 0;
      }
    }
  }, [duration, isYouTube, mediaRef]);

  // Save trim settings
  const handleSave = useCallback(() => {
    // Validate trim range before saving (with source type awareness)
    const trimValidation = validateTrimRange(startTime, endTime, duration, sourceType);
    if (!trimValidation.valid) {
      setError(trimValidation.error || null);
      return;
    }
    
    const trimSettings = createTrimSettings(startTime, endTime, duration);
    onSave(trimSettings);
    onClose();
  }, [startTime, endTime, duration, sourceType, onSave, onClose]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Spacebar for play/pause
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        togglePlayPause();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, togglePlayPause]);

  if (!isOpen) return null;

  const trimDuration = endTime - startTime;
  const isTrimmed = startTime > 0 || endTime < duration;

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={clsx(
          'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full overflow-hidden',
          'max-w-3xl max-h-[90vh] flex flex-col',
          // Mobile: full screen
          'sm:max-w-3xl sm:max-h-[90vh]',
          'max-sm:!max-w-none max-sm:!max-h-none max-sm:!h-full max-sm:!rounded-none'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Scissors className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {mediaType === 'audio' 
                  ? t('mediaTrimmer.titleAudio', 'Cắt âm thanh')
                  : t('mediaTrimmer.titleVideo', 'Cắt video')
                }
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('mediaTrimmer.subtitle', 'Chọn đoạn bắt đầu và kết thúc')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* YouTube Info Banner */}
          {isYouTube && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-300">
                  {t('mediaTrimmer.youtubeInfo', 'Video YouTube')}
                </p>
                <p className="text-blue-600 dark:text-blue-400">
                  {t('mediaTrimmer.youtubeTrimLimit', `Đoạn cắt tối đa ${MAX_YOUTUBE_TRIM_DURATION_MINUTES} phút để đảm bảo trải nghiệm Quiz tốt nhất.`)}
                </p>
              </div>
            </div>
          )}
          
          {/* Validation Warning */}
          {validationWarning && (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">{validationWarning}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Media Preview */}
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}

            {isYouTube && youtubeVideoId ? (
              <YouTube
                videoId={youtubeVideoId}
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: {
                    autoplay: 0,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0,
                    start: Math.floor(startTime),
                  },
                }}
                onReady={handleYouTubeReady}
                onStateChange={handleYouTubeStateChange}
                onError={handleYouTubeError}
                className="w-full h-full"
                iframeClassName="w-full h-full"
              />
            ) : mediaType === 'audio' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
                <div className="w-24 h-24 mb-4 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
                <audio
                  ref={audioRef}
                  src={mediaUrl}
                  preload="metadata"
                  className="hidden"
                />
                <p className="text-white/60 text-sm">
                  {isPlaying ? t('mediaTrimmer.playing', 'Đang phát...') : t('mediaTrimmer.paused', 'Đã tạm dừng')}
                </p>
              </div>
            ) : (
              <video
                ref={videoRef}
                src={mediaUrl}
                preload="metadata"
                className="w-full h-full object-contain"
                playsInline
              />
            )}
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleReset}
              disabled={isLoading || (!startTime && endTime === duration)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title={t('mediaTrimmer.reset', 'Đặt lại')}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">{t('mediaTrimmer.reset', 'Đặt lại')}</span>
            </button>

            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className={clsx(
                'flex items-center justify-center w-14 h-14 rounded-full transition-all',
                'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title={isPlaying ? t('mediaTrimmer.pause', 'Tạm dừng') : t('mediaTrimmer.play', 'Phát')}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </button>

            <button
              onClick={handlePreview}
              disabled={isLoading}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title={t('mediaTrimmer.preview', 'Xem trước đoạn cắt')}
            >
              <Play className="w-4 h-4" />
              <span className="text-sm">{t('mediaTrimmer.previewTrim', 'Xem đoạn cắt')}</span>
            </button>
          </div>

          {/* Trim Slider */}
          {duration > 0 && (
            <TrimSlider
              duration={duration}
              startTime={startTime}
              endTime={endTime}
              onValueChange={handleSliderChange}
              onValueCommit={handleSliderCommit}
              disabled={isLoading}
            />
          )}

          {/* Time Inputs */}
          {duration > 0 && (
            <TimeInputs
              duration={duration}
              startTime={startTime}
              endTime={endTime}
              onChange={handleTimeInputsChange}
              disabled={isLoading}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {isTrimmed ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                ✂️ {formatTime(startTime)} - {formatTime(endTime)} ({formatTime(trimDuration)})
              </span>
            ) : (
              <span>{t('mediaTrimmer.noTrim', 'Chưa cắt - sẽ phát toàn bộ')}</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={clsx(
                'px-4 py-2 rounded-lg transition-colors',
                'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {t('cancel', 'Hủy')}
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !!error}
              className={clsx(
                'flex items-center gap-2 px-5 py-2 rounded-lg transition-colors',
                'bg-blue-600 hover:bg-blue-700 text-white font-medium',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Save className="w-4 h-4" />
              {t('save', 'Lưu')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render in portal
  return createPortal(modalContent, document.body);
};

export default MediaTrimmerModal;
