/**
 * YouTubePlayer - Component hiển thị video YouTube nhúng trong web
 * Hỗ trợ fullscreen, responsive và auto-play
 */

import React, { useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface YouTubePlayerProps {
  videoUrl: string;
  title?: string;
  onClose: () => void;
  onVideoEnd?: () => void;
  isFullscreen?: boolean;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ 
  videoUrl, 
  title,
  onClose,
  isFullscreen: initialFullscreen = true
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(initialFullscreen);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      
      // youtube.com/watch?v=VIDEO_ID
      if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v');
      }
      
      // youtu.be/VIDEO_ID
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }

      // youtube.com/embed/VIDEO_ID
      if (urlObj.pathname.includes('/embed/')) {
        return urlObj.pathname.split('/embed/')[1];
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const videoId = getYouTubeVideoId(videoUrl);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [onClose]);

  if (!videoId) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Link YouTube không hợp lệ</h3>
          <p className="text-gray-600 mb-4">Vui lòng kiểm tra lại URL video</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  // YouTube embed URL with parameters
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex-1">
            {title && (
              <h2 className="text-white text-xl font-semibold truncate">
                {title}
              </h2>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-6 h-6" />
              ) : (
                <Maximize2 className="w-6 h-6" />
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-red-600 rounded-lg transition-colors"
              title="Đóng (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative flex-1 bg-black rounded-lg overflow-hidden shadow-2xl">
          <iframe
            src={embedUrl}
            title={title || "YouTube Video"}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ border: 'none' }}
          />
        </div>

        {/* Instructions */}
        <div className="mt-4 text-center">
          <p className="text-white text-sm opacity-75">
            💡 Nhấn <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded">ESC</kbd> hoặc click bên ngoài để đóng
          </p>
        </div>
      </div>
    </div>
  );
};

export default YouTubePlayer;
