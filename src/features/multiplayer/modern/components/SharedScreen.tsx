import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Monitor, X, Maximize2, Minimize2, Youtube, Globe, Link } from 'lucide-react';

export interface SharedScreenData {
  type: 'youtube' | 'webpage' | 'empty';
  url?: string;
  videoId?: string;
  timestamp?: number;
  isPlaying?: boolean;
  title?: string;
}

export interface SharedScreenProps {
  roomData: any;
  isHost: boolean;
  onScreenUpdate: (data: SharedScreenData) => void;
}

const SharedScreen: React.FC<SharedScreenProps> = ({ roomData, isHost, onScreenUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showControls, setShowControls] = useState(isHost); // Show controls by default for hosts
  const [inputUrl, setInputUrl] = useState('');
  const [screenData, setScreenData] = useState<SharedScreenData>({
    type: 'empty'
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync with room data
  useEffect(() => {
    console.log('🔍 SharedScreen Debug - roomData changed:', {
      isHost,
      roomDataExists: !!roomData,
      sharedScreenData: roomData?.sharedScreen,
      currentScreenData: screenData
    });
    
    if (roomData?.sharedScreen) {
      console.log('🔄 Updating screen data from roomData:', roomData.sharedScreen);
      setScreenData(roomData.sharedScreen);
    }
  }, [roomData?.sharedScreen]);

  const extractYoutubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleUrlSubmit = () => {
    if (!inputUrl.trim()) return;

    const videoId = extractYoutubeVideoId(inputUrl);
    
    if (videoId) {
      // YouTube video
      const newData: SharedScreenData = {
        type: 'youtube',
        url: inputUrl,
        videoId,
        timestamp: 0,
        isPlaying: true,
        title: `YouTube: ${videoId}`
      };
      setScreenData(newData);
      onScreenUpdate(newData);
    } else {
      // Try as general webpage
      const newData: SharedScreenData = {
        type: 'webpage',
        url: inputUrl,
        title: `Web: ${new URL(inputUrl).hostname}`
      };
      setScreenData(newData);
      onScreenUpdate(newData);
    }
    
    setInputUrl('');
  };

  const handleClearScreen = () => {
    const newData: SharedScreenData = { type: 'empty' };
    setScreenData(newData);
    onScreenUpdate(newData);
  };

  const getYoutubeEmbedUrl = (videoId: string, timestamp?: number) => {
    const baseUrl = `https://www.youtube.com/embed/${videoId}`;
    const params = new URLSearchParams({
      autoplay: screenData.isPlaying ? '1' : '0',
      start: String(timestamp || 0),
      rel: '0',
      modestbranding: '1'
    });
    return `${baseUrl}?${params.toString()}`;
  };

  const renderContent = () => {
    switch (screenData.type) {
      case 'youtube':
        return (
          <iframe
            ref={iframeRef}
            src={getYoutubeEmbedUrl(screenData.videoId!, screenData.timestamp)}
            className="absolute inset-0 w-full h-full rounded-lg"
            style={{ border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            title="YouTube video player"
          />
        );
      
      case 'webpage':
        return (
          <iframe
            ref={iframeRef}
            src={screenData.url}
            className="absolute inset-0 w-full h-full rounded-lg"
            style={{ border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
            allowFullScreen
            title="Web page viewer"
          />
        );
      
      case 'empty':
      default:
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg border-2 border-dashed border-gray-600">
            <div className="text-center px-4">
              <Monitor className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-500" />
              <p className="text-gray-400 text-sm sm:text-lg font-medium">Chia sẻ màn hình</p>
              {isHost && (
                <p className="text-gray-500 text-xs sm:text-sm mt-1 sm:mt-2">Nhập URL YouTube hoặc trang web để bắt đầu</p>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 transition-all duration-300 ${
        isExpanded ? 'col-span-full' : 'col-span-1 md:col-span-2'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Monitor className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">Màn hình chia sẻ</h3>
          {screenData.type !== 'empty' && (
            <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
              {screenData.type === 'youtube' ? 'YouTube' : 'Web'}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {isHost && (
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
              title="Điều khiển"
            >
              {showControls ? <X className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            </button>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:bg-gray-500/20 rounded-lg transition-colors"
            title={isExpanded ? "Thu nhỏ" : "Phóng to"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Host Controls */}
      {isHost && showControls && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 border-b border-white/10 bg-blue-500/10"
        >
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                placeholder="Dán URL YouTube hoặc trang web..."
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
              />
              <Link className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
            
            <button
              onClick={handleUrlSubmit}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <Youtube className="w-4 h-4" />
              <span>Chiếu</span>
            </button>
            
            {screenData.type !== 'empty' && (
              <button
                onClick={handleClearScreen}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="mt-2 text-xs text-gray-400">
            Hỗ trợ: YouTube videos, các trang web cho phép embed
          </div>
        </motion.div>
      )}

      {/* Content Display */}
      <div className={`relative bg-black/50 w-full transition-all duration-300 ${
        isExpanded 
          ? 'min-h-[200px] sm:min-h-[250px] md:min-h-[300px] lg:min-h-[400px]' 
          : 'min-h-[120px] sm:min-h-[150px] md:min-h-[180px] lg:min-h-[240px]'
      }`}>
        {/* 16:9 Aspect Ratio Container */}
        <div className="relative w-full overflow-hidden rounded-lg">
          {/* Maintain 16:9 aspect ratio using padding-bottom technique */}
          <div className="relative" style={{ paddingBottom: '56.25%' }}>
            <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
            
            {/* Content container */}
            <div className="absolute inset-0 flex items-center justify-center rounded-lg">
              {renderContent()}
            </div>
          </div>
        </div>
        
        {/* Overlay info */}
        {screenData.type !== 'empty' && screenData.title && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white z-10">
            {screenData.title}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SharedScreen;
