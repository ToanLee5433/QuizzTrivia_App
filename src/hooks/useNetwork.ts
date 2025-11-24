/**
 * 🌐 useNetwork Hook
 * ===================
 * Monitor network status và connection quality
 */

import { useState, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface NetworkStatus {
  isOnline: boolean;
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // Round-trip time (ms)
  saveData: boolean; // Data saver mode
}

export interface UseNetworkResult {
  isOnline: boolean;
  isOffline: boolean;
  status: NetworkStatus;
  isFastConnection: boolean;
  isSlowConnection: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook để monitor network status
 */
export function useNetwork(): UseNetworkResult {
  const [status, setStatus] = useState<NetworkStatus>(getNetworkStatus());

  useEffect(() => {
    // Update status on mount
    setStatus(getNetworkStatus());

    // Listen to online/offline events
    const handleOnline = () => {
      console.log('[useNetwork] Device online');
      setStatus(getNetworkStatus());
    };

    const handleOffline = () => {
      console.log('[useNetwork] Device offline');
      setStatus(getNetworkStatus());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen to connection change (if supported)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const handleConnectionChange = () => {
        console.log('[useNetwork] Connection changed:', connection.effectiveType);
        setStatus(getNetworkStatus());
      };

      connection?.addEventListener('change', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection?.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Derived states
  const isFastConnection = status.isOnline && ['4g', '3g'].includes(status.effectiveType);
  const isSlowConnection = status.isOnline && ['2g', 'slow-2g'].includes(status.effectiveType);

  return {
    isOnline: status.isOnline,
    isOffline: !status.isOnline,
    status,
    isFastConnection,
    isSlowConnection,
  };
}

// ============================================================================
// HELPER
// ============================================================================

function getNetworkStatus(): NetworkStatus {
  const connection = (navigator as any).connection;

  return {
    isOnline: navigator.onLine,
    effectiveType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || 0,
    rtt: connection?.rtt || 0,
    saveData: connection?.saveData || false,
  };
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Show connection badge
 * 
 * ```tsx
 * const App = () => {
 *   const { isOnline, isOffline, status } = useNetwork();
 * 
 *   return (
 *     <div>
 *       {isOffline && <Badge color="red">Offline</Badge>}
 *       {isOnline && status.effectiveType === 'slow-2g' && (
 *         <Badge color="yellow">Slow Connection</Badge>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 * 
 * Example 2: Conditional content loading
 * 
 * ```tsx
 * const ImageGallery = () => {
 *   const { isFastConnection, status } = useNetwork();
 * 
 *   return (
 *     <div>
 *       {isFastConnection ? (
 *         <HighQualityImages />
 *       ) : (
 *         <LowQualityImages />
 *       )}
 *       
 *       {status.saveData && (
 *         <p>Data saver mode active - showing compressed images</p>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 * 
 * Example 3: Auto-sync when connection improves
 * 
 * ```tsx
 * const SyncManager = () => {
 *   const { isOnline, isFastConnection } = useNetwork();
 * 
 *   useEffect(() => {
 *     if (isOnline && isFastConnection) {
 *       syncPendingData();
 *     }
 *   }, [isOnline, isFastConnection]);
 * 
 *   return null;
 * };
 * ```
 */

export default useNetwork;
