/**
 * 📡 NetworkStatus Banner Component
 * ==================================
 * Hiển thị trạng thái kết nối mạng với animations
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetwork } from '../../hooks/useNetwork';

// ============================================================================
// TYPES
// ============================================================================

interface NetworkStatusProps {
  position?: 'top' | 'bottom';
  showOnlineMessage?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number; // milliseconds
}

// ============================================================================
// COMPONENT
// ============================================================================

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  position = 'top',
  showOnlineMessage = true,
  autoHide = true,
  autoHideDelay = 3000,
}) => {
  const { isOnline, isOffline, status, isSlowConnection } = useNetwork();
  const [showBanner, setShowBanner] = useState(false);
  const [message, setMessage] = useState('');
  const [color, setColor] = useState('green');

  useEffect(() => {
    if (isOffline) {
      // Offline: Always show
      setMessage('Bạn đang ngoại tuyến. Dữ liệu sẽ được lưu cục bộ.');
      setColor('red');
      setShowBanner(true);
    } else if (isSlowConnection) {
      // Slow connection: Show warning
      setMessage(`Kết nối chậm (${status.effectiveType}). Tải nội dung có thể lâu hơn.`);
      setColor('yellow');
      setShowBanner(true);

      if (autoHide) {
        setTimeout(() => setShowBanner(false), autoHideDelay);
      }
    } else if (isOnline && showOnlineMessage) {
      // Back online: Show success message
      setMessage('Đã kết nối! Đang đồng bộ dữ liệu...');
      setColor('green');
      setShowBanner(true);

      if (autoHide) {
        setTimeout(() => setShowBanner(false), autoHideDelay);
      }
    } else {
      // Online with good connection: Hide
      setShowBanner(false);
    }
  }, [isOnline, isOffline, isSlowConnection, status, showOnlineMessage, autoHide, autoHideDelay]);

  // Icon based on status
  const getIcon = () => {
    if (isOffline) {
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
      );
    } else if (isSlowConnection) {
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
          />
        </svg>
      );
    }
  };

  // Color classes
  const colorClasses = {
    red: 'bg-red-500 dark:bg-red-600',
    yellow: 'bg-yellow-500 dark:bg-yellow-600',
    green: 'bg-green-500 dark:bg-green-600',
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`fixed ${
            position === 'top' ? 'top-0' : 'bottom-0'
          } left-0 right-0 z-50 ${colorClasses[color as keyof typeof colorClasses]} text-white py-3 px-4 shadow-lg`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getIcon()}
              <span className="font-medium">{message}</span>
            </div>

            {/* Connection details */}
            {isOnline && (
              <div className="hidden md:flex items-center gap-4 text-sm opacity-90">
                <span>
                  {status.effectiveType.toUpperCase()}
                </span>
                {status.downlink > 0 && (
                  <span>
                    {status.downlink.toFixed(1)} Mbps
                  </span>
                )}
                {status.rtt > 0 && (
                  <span>
                    {status.rtt}ms
                  </span>
                )}
              </div>
            )}

            {/* Close button */}
            {autoHide && (
              <button
                onClick={() => setShowBanner(false)}
                className="ml-4 p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Example: Add to App.tsx
 * 
 * ```tsx
 * import { NetworkStatus } from './components/common/NetworkStatus';
 * 
 * const App = () => {
 *   return (
 *     <div>
 *       <NetworkStatus 
 *         position="top"
 *         showOnlineMessage={true}
 *         autoHide={true}
 *         autoHideDelay={3000}
 *       />
 *       
 *       <Router>
 *         <Routes>
 *           // Your routes
 *         </Routes>
 *       </Router>
 *     </div>
 *   );
 * };
 * ```
 */

export default NetworkStatus;
