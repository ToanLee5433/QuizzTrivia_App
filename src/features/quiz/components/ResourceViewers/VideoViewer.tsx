import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';

interface VideoViewerProps {
  url: string;
  title: string;
  onProgressUpdate: (progress: {
    secondsWatched: number;
    watchPercent: number;
    lastWatchPosition: number;
  }) => void;
  initialProgress?: {
    lastWatchPosition?: number;
    secondsWatched?: number;
  };
}

export const VideoViewer: React.FC<VideoViewerProps> = ({
  url,
  title,
  onProgressUpdate,
  initialProgress
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [totalWatchedSeconds, setTotalWatchedSeconds] = useState(
    initialProgress?.secondsWatched || 0
  );

  // Extract video ID from YouTube URL
  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getYouTubeVideoId(url);
  const isYouTube = !!videoId;

  useEffect(() => {
    if (videoRef.current && initialProgress?.lastWatchPosition) {
      videoRef.current.currentTime = initialProgress.lastWatchPosition;
    }
  }, []);

  useEffect(() => {
    // Track progress every second when playing
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        if (videoRef.current) {
          const current = videoRef.current.currentTime;
          const total = videoRef.current.duration;
          const watched = totalWatchedSeconds + 1;
          
          setTotalWatchedSeconds(watched);
          setCurrentTime(current);
          
          onProgressUpdate({
            secondsWatched: watched,
            watchPercent: total > 0 ? Math.round((current / total) * 100) : 0,
            lastWatchPosition: current
          });
        }
      }, 1000);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, totalWatchedSeconds]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isYouTube) {
    // YouTube embed with API for tracking
    return (
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&start=${Math.floor(initialProgress?.lastWatchPosition || 0)}`}
          title={title}
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white text-sm px-3 py-2 rounded">
          ⏱️ Đã xem: {formatTime(totalWatchedSeconds)} | 
          📊 Tiến độ: {Math.round((totalWatchedSeconds / (duration || 1)) * 100)}%
        </div>
      </div>
    );
  }

  // Direct video player
  return (
    <div 
      className="relative w-full bg-black rounded-lg overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Custom Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <input
          type="range"
          min="0"
          max={duration}
          value={currentTime}
          onChange={handleSeek}
          className="w-full mb-2 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`
          }}
        />

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className="hover:text-blue-400 transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleMuteToggle}
                className="hover:text-blue-400 transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Time */}
            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Playback Speed */}
            <div className="relative group">
              <button className="hover:text-blue-400 transition-colors flex items-center gap-1">
                <Settings className="w-5 h-5" />
                <span className="text-sm">{playbackRate}x</span>
              </button>
              <div className="absolute bottom-full right-0 mb-2 bg-gray-800 rounded-lg p-2 hidden group-hover:block">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                  <button
                    key={rate}
                    onClick={() => handlePlaybackRateChange(rate)}
                    className={`block w-full text-left px-3 py-1 rounded hover:bg-gray-700 text-sm ${
                      rate === playbackRate ? 'text-blue-400' : ''
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="hover:text-blue-400 transition-colors"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-2 text-xs text-gray-300">
          ⏱️ Tổng thời gian xem: {formatTime(totalWatchedSeconds)} | 
          📊 Tiến độ: {Math.round((currentTime / duration) * 100)}%
        </div>
      </div>
    </div>
  );
};
