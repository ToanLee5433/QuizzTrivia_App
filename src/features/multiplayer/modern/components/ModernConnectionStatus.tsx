import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  RefreshCw, 
  Clock,
  Zap,
  Signal,
  Router,
  CloudOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDatabase, ref, onValue, off, update } from 'firebase/database';

interface ConnectionStatus {
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  latency: number;
  lastConnected: number;
  reconnectAttempts: number;
  isReconnecting: boolean;
}

interface ModernConnectionStatusProps {
  roomId: string;
  currentUserId: string;
  onReconnect: () => Promise<void>;
  showReconnectButton?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
  showDetailed?: boolean;
}

const ModernConnectionStatus: React.FC<ModernConnectionStatusProps> = ({
  roomId,
  onReconnect,
  compact = false
}) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: navigator.onLine, // Use real browser online status
    connectionQuality: 'disconnected', // Start with unknown status
    latency: 0,
    lastConnected: Date.now(),
    reconnectAttempts: 0,
    isReconnecting: false
  });
  
  const [showDetails, setShowDetails] = useState(false);
  const [isManualReconnecting, setIsManualReconnecting] = useState(false);

  const db = getDatabase();

  // Monitor browser online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: true,
        connectionQuality: getConnectionQuality(prev.latency)
      }));
    };

    const handleOffline = () => {
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'disconnected'
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor Firebase connection status
  useEffect(() => {
    if (!roomId || !db) return;

    const connectedRef = ref(db, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val();
      
      setConnectionStatus((prevStatus) => {
        const newStatus = {
          ...prevStatus,
          isConnected: connected,
          connectionQuality: connected ? getConnectionQuality(prevStatus.latency) : 'disconnected',
          lastConnected: connected ? Date.now() : prevStatus.lastConnected
        };

        // Auto-reconnect logic
        if (!connected && prevStatus.reconnectAttempts < 3) {
          setTimeout(() => {
            handleAutoReconnect();
          }, Math.pow(2, prevStatus.reconnectAttempts) * 1000); // Exponential backoff
        }

        return newStatus;
      });
    });

    return () => {
      off(connectedRef, 'value', unsubscribe);
    };
  }, [roomId, db]);

  // Monitor latency
  useEffect(() => {
    if (!roomId || !db) return;

    console.log('🏃 Starting REAL latency measurement for room:', roomId);
    
    const measureLatency = async () => {
      const startTime = Date.now();
      try {
        // Write timestamp to measure round-trip time
        const testRef = ref(db, `rooms/${roomId}/ping`);
        const timestamp = Date.now();
        
        // Write to database
        await update(testRef, { 
          timestamp,
          test: 'latency_check'
        });
        
        // Read it back to measure RTT
        const readRef = ref(db, `rooms/${roomId}/ping/timestamp`);
        await onValue(readRef, () => {}, { onlyOnce: true });
        
        const latency = Date.now() - startTime;
        console.log('⏱️ REAL measured latency:', latency, 'ms');
        
        setConnectionStatus(prev => {
          const newQuality = getConnectionQuality(latency);
          console.log('📊 Connection quality updated:', newQuality, 'from latency:', latency);
          return {
            ...prev,
            latency,
            connectionQuality: newQuality
          };
        });
      } catch (error) {
        // Try alternative method - simple Firebase connectivity test
        try {
          const connectivityRef = ref(db, '.info/serverTimeOffset');
          await onValue(connectivityRef, () => {}, { onlyOnce: true });
          const fallbackLatency = Date.now() - startTime;
          
          setConnectionStatus(prev => ({
            ...prev,
            latency: fallbackLatency,
            connectionQuality: getConnectionQuality(fallbackLatency)
          }));
        } catch (fallbackError) {
          setConnectionStatus(prev => ({
            ...prev,
            latency: 0,
            connectionQuality: 'disconnected'
          }));
        }
      }
    };

    // Initial measurement
    setTimeout(measureLatency, 1000); // Wait 1s for Firebase to connect
    
    const latencyTestInterval = setInterval(measureLatency, 10000); // Test every 10 seconds

    return () => {
      clearInterval(latencyTestInterval);
    };
  }, [roomId, db]);

  const getConnectionQuality = (latency: number): 'excellent' | 'good' | 'poor' | 'disconnected' => {
    if (latency === 0) return 'disconnected';
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    return 'poor';
  };

  const handleAutoReconnect = useCallback(async () => {
    setConnectionStatus(prev => ({ ...prev, isReconnecting: true }));
    
    try {
      await onReconnect();
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: true,
        isReconnecting: false,
        reconnectAttempts: 0
      }));
    } catch (error) {
      console.error('Auto-reconnect failed:', error);
      setConnectionStatus(prev => ({
        ...prev,
        isReconnecting: false,
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    }
  }, [onReconnect]);

  const handleManualReconnect = useCallback(async () => {
    setIsManualReconnecting(true);
    
    try {
      await onReconnect();
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: true,
        isReconnecting: false,
        reconnectAttempts: 0,
        connectionQuality: 'excellent'
      }));
    } catch (error) {
      console.error('Manual reconnect failed:', error);
      setConnectionStatus(prev => ({
        ...prev,
        isReconnecting: false,
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    } finally {
      setIsManualReconnecting(false);
    }
  }, [onReconnect]);

  const getStatusIcon = () => {
    if (connectionStatus.isReconnecting || isManualReconnecting) {
      return <RefreshCw className="w-4 h-4 animate-spin text-yellow-500" />;
    }
    
    switch (connectionStatus.connectionQuality) {
      case 'excellent':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'good':
        return <Signal className="w-4 h-4 text-blue-500" />;
      case 'poor':
        return <WifiOff className="w-4 h-4 text-orange-500" />;
      case 'disconnected':
        return <CloudOff className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    if (connectionStatus.isReconnecting || isManualReconnecting) {
      return 'from-yellow-400 to-orange-400';
    }
    
    switch (connectionStatus.connectionQuality) {
      case 'excellent':
        return 'from-green-400 to-emerald-400';
      case 'good':
        return 'from-blue-400 to-cyan-400';
      case 'poor':
        return 'from-orange-400 to-red-400';
      case 'disconnected':
        return 'from-red-400 to-pink-400';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getStatusText = () => {
    if (connectionStatus.isReconnecting || isManualReconnecting) {
      return 'Đang kết nối lại...';
    }
    
    switch (connectionStatus.connectionQuality) {
      case 'excellent':
        return 'Kết nối tuyệt vời';
      case 'good':
        return 'Kết nối tốt';
      case 'poor':
        return 'Kết nối kém';
      case 'disconnected':
        return 'Mất kết nối';
      default:
        return 'Không xác định';
    }
  };

  const formatUptime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours} giờ ${minutes % 60} phút`;
    }
    return `${minutes} phút`;
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50">
        {getStatusIcon()}
        <span className="text-xs font-medium text-gray-700">{getStatusText()}</span>
        {connectionStatus.latency > 0 && (
          <span className="text-xs text-gray-500">{connectionStatus.latency}ms</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white via-gray-50/30 to-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
      {/* Main Status */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50/50">
        <div className="flex items-center space-x-3">
          <div className={`p-2 bg-gradient-to-r ${getStatusColor()} rounded-xl`}>
            {getStatusIcon()}
          </div>
          <div>
            <h4 className="font-bold text-gray-800">Trạng thái kết nối</h4>
            <p className="text-sm text-gray-600">{getStatusText()}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {showDetails && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Clock className="w-4 h-4" />
            </motion.button>
          )}
          
          {!connectionStatus.isConnected && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleManualReconnect}
              disabled={isManualReconnecting}
              className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all duration-200"
            >
              {isManualReconnecting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Kết nối lại</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Detailed Status */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 space-y-3 border-t border-gray-200/50"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Latency */}
              <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                <Zap className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-800">
                  {connectionStatus.latency > 0 ? `${connectionStatus.latency}ms` : '--'}
                </p>
                <p className="text-xs text-gray-600">Độ trễ</p>
              </div>

              {/* Uptime */}
              <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                <Clock className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-800">
                  {formatUptime(connectionStatus.lastConnected)}
                </p>
                <p className="text-xs text-gray-600">Thời gian kết nối</p>
              </div>

              {/* Reconnect Attempts */}
              <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                <Router className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-800">
                  {connectionStatus.reconnectAttempts}
                </p>
                <p className="text-xs text-gray-600">Lần thử lại</p>
              </div>

              {/* Quality */}
              <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
                <Signal className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-800 capitalize">
                  {connectionStatus.connectionQuality === 'excellent' ? 'Tuyệt vời' :
                   connectionStatus.connectionQuality === 'good' ? 'Tốt' :
                   connectionStatus.connectionQuality === 'poor' ? 'Kém' : 'Mất kết nối'}
                </p>
                <p className="text-xs text-gray-600">Chất lượng</p>
              </div>
            </div>

            {/* Connection Tips */}
            {!connectionStatus.isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200/50"
              >
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 mb-2">Mất kết nối</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• Kiểm tra kết nối internet của bạn</li>
                      <li>• Thử làm mới trang hoặc kết nối lại</li>
                      <li>• Nếu vẫn không được, hãy thử lại sau</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {connectionStatus.connectionQuality === 'poor' && connectionStatus.isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200/50"
              >
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 mb-2">Kết nối kém</p>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Độ trễ cao có thể ảnh hưởng đến gameplay</li>
                      <li>• Cân nhắc chuyển sang kết nối tốt hơn</li>
                      <li>• Đóng các ứng dụng sử dụng mạng khác</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ✅ Memoize component to prevent unnecessary re-renders
export default React.memo(ModernConnectionStatus, (prevProps, nextProps) => {
  return prevProps.roomId === nextProps.roomId && 
         prevProps.currentUserId === nextProps.currentUserId &&
         prevProps.compact === nextProps.compact;
});
