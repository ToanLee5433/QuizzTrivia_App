/**
 * AudioPlayer - Component phát âm thanh fullscreen với waveform UI
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Download, SkipBack, SkipForward } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  onClose: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, title, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, togglePlayPause]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
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

    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
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
            <p className="text-blue-200 text-sm">Audio Player</p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-red-600 rounded-lg transition-colors"
            title="Đóng (ESC)"
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
            const isActive = (currentTime / duration) * 50 > i;
            
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
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer accent-blue-500"
            style={{
              background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) 100%)`
            }}
          />
          <div className="flex justify-between mt-2">
            <span className="text-white text-sm">{formatTime(currentTime)}</span>
            <span className="text-white text-sm">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* Skip Backward */}
          <button
            onClick={() => skip(-10)}
            className="p-3 text-white hover:bg-white hover:bg-opacity-10 rounded-full transition-all"
            title="Lùi 10s"
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
            title="Tiến 10s"
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
            title="Tải xuống"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-white text-sm opacity-75">
            💡 <kbd className="px-2 py-1 bg-white bg-opacity-10 rounded">Space</kbd> để phát/dừng
            • <kbd className="px-2 py-1 bg-white bg-opacity-10 rounded">ESC</kbd> để đóng
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
