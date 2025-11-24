import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Monitor, X, Maximize2, Minimize2, Youtube, Globe, Link, Loader2, AlertCircle } from 'lucide-react';
import { modernMultiplayerService, SharedScreenData } from '../services/modernMultiplayerService';
import { useTranslation } from 'react-i18next';

export interface SharedScreenProps {
  roomData: any;
  isHost: boolean;
}

const SharedScreen: React.FC<SharedScreenProps> = ({ isHost }) => {
  const { t } = useTranslation('multiplayer');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showControls, setShowControls] = useState(isHost);
  const [inputUrl, setInputUrl] = useState('');
  const [screenData, setScreenData] = useState<SharedScreenData>({ type: 'empty' });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen to RTDB shared screen updates
  useEffect(() => {
    const handleSharedScreenUpdate = (data: SharedScreenData) => {
      console.log('📺 Received shared screen update:', data);
      setScreenData(data);
      setLoadError(null);
    };

    const callbackId = modernMultiplayerService.on('sharedScreen:updated', handleSharedScreenUpdate);

    return () => {
      modernMultiplayerService.off('sharedScreen:updated', callbackId);
    };
  }, []);

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

  const handleUrlSubmit = async () => {
    if (!inputUrl.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setIsLoading(true);
      setLoadError(null);

      const videoId = extractYoutubeVideoId(inputUrl);
      
      let newData: SharedScreenData;
      if (videoId) {
        // YouTube video
        newData = {
          type: 'youtube',
          url: inputUrl,
          videoId,
          timestamp: 0,
          isPlaying: true,
          title: `YouTube: ${videoId}`
        };
      } else {
        // Try as general webpage
        try {
          const url = new URL(inputUrl);
          newData = {
            type: 'webpage',
            url: inputUrl,
            title: `Web: ${url.hostname}`
          };
        } catch {
          setLoadError(t('sharedScreen.invalidUrl'));
          return;
        }
      }
      
      await modernMultiplayerService.updateSharedScreen(newData);
      setInputUrl('');
    } catch (error: any) {
      console.error('Failed to update shared screen:', error);
      setLoadError(error.message || t('sharedScreen.updateFailed'));
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  const handleClearScreen = async () => {
    try {
      setIsLoading(true);
      const newData: SharedScreenData = { type: 'empty' };
      await modernMultiplayerService.updateSharedScreen(newData);
    } catch (error) {
      console.error('Failed to clear screen:', error);
    } finally {
      setIsLoading(false);
    }
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
    // Show loading state
    if (isLoading && screenData.type !== 'empty') {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-spin" />
            <p className="text-white">{t('sharedScreen.loading')}</p>
          </div>
        </div>
      );
    }

    // Show error state
    if (loadError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-900/30 to-gray-900/50 rounded-lg border-2 border-red-500/30">
          <div className="text-center px-4">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-red-400" />
            <p className="text-red-400 text-sm sm:text-lg font-medium mb-2">{t('sharedScreen.error')}</p>
            <p className="text-gray-400 text-xs sm:text-sm">{loadError}</p>
            {isHost && (
              <button
                onClick={handleClearScreen}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                {t('sharedScreen.clearError')}
              </button>
            )}
          </div>
        </div>
      );
    }

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
            onLoad={() => setIsLoading(false)}
            onError={() => setLoadError(t('sharedScreen.loadFailed'))}
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
            onLoad={() => setIsLoading(false)}
            onError={() => setLoadError(t('sharedScreen.loadFailed'))}
          />
        );
      
      case 'empty':
      default:
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg border-2 border-dashed border-gray-600">
            <div className="text-center px-4">
              <Monitor className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-500" />
              <p className="text-gray-400 text-sm sm:text-lg font-medium">{t('sharedScreen.title')}</p>
              {isHost && (
                <p className="text-gray-500 text-xs sm:text-sm mt-1 sm:mt-2">{t('sharedScreen.placeholder')}</p>
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
          <h3 className="text-white font-semibold">{t('sharedScreen.title')}</h3>
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
                placeholder={t('sharedScreen.inputPlaceholder')}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
              />
              <Link className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
            
            <button
              onClick={handleUrlSubmit}
              disabled={isSubmitting || !inputUrl.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Youtube className="w-4 h-4" />
              )}
              <span>{t('sharedScreen.shareButton')}</span>
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
            {t('sharedScreen.supportedFormats')}
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
