import React, { useState, useEffect } from 'react';
import { WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { networkMonitor } from '../utils/networkMonitor';
import { modernMultiplayerService } from '../services/modernMultiplayerService';

interface NetworkStatusBannerProps {
  className?: string;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({ 
  className = '' 
}) => {
  const [isOnline, setIsOnline] = useState(networkMonitor.isOnline);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Listen to network changes
    const onlineId = networkMonitor.on('online', () => {
      setIsOnline(true);
      setIsReconnecting(false);
      setRetryCount(0);
    });

    const offlineId = networkMonitor.on('offline', () => {
      setIsOnline(false);
    });

    // Listen to service reconnect events
    const reconnectingId = modernMultiplayerService.on('network:offline', () => {
      setIsReconnecting(true);
    });

    const reconnectedId = modernMultiplayerService.on('network:online', () => {
      setIsReconnecting(false);
      setRetryCount(0);
    });

    return () => {
      networkMonitor.off(onlineId);
      networkMonitor.off(offlineId);
      modernMultiplayerService.off('network:offline', reconnectingId);
      modernMultiplayerService.off('network:online', reconnectedId);
    };
  }, []);

  const handleManualReconnect = async () => {
    if (!isOnline) return;
    
    setIsReconnecting(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await modernMultiplayerService.reconnect();
    } catch (error) {
      console.error('Manual reconnect failed:', error);
      setIsReconnecting(false);
    }
  };

  if (isOnline && !isReconnecting) {
    return null; // Don't show banner when online and stable
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${className}`}>
      <div className={`px-4 py-3 text-center ${
        isReconnecting 
          ? 'bg-yellow-50 border-b border-yellow-200 text-yellow-800'
          : 'bg-red-50 border-b border-red-200 text-red-800'
      }`}>
        <div className="flex items-center justify-center space-x-2">
          {isReconnecting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">
                {retryCount > 0 ? `Reconnecting... (Attempt ${retryCount})` : 'Reconnecting...'}
              </span>
              <button
                onClick={handleManualReconnect}
                disabled={!isOnline}
                className="ml-4 px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Retry Now
              </button>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5" />
              <span className="font-medium">No internet connection</span>
              <span className="text-sm opacity-75">
                - Please check your connection
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkStatusBanner;
