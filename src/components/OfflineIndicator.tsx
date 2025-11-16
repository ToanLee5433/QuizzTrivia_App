import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { Wifi, WifiOff, Cloud, AlertCircle } from 'lucide-react';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  className = '',
  showDetails = true 
}) => {
  const { t } = useTranslation();
  const { isOnline, pendingCount, mediaCount, isSyncing } = useOfflineQueue();
  const [showTooltip, setShowTooltip] = useState(false);

  // Status variants
  const getStatusVariant = () => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    if (pendingCount > 0) return 'pending';
    return 'synced';
  };

  const variant = getStatusVariant();

  // Variant styles
  const variantStyles = {
    offline: 'bg-gray-500 text-white',
    syncing: 'bg-blue-500 text-white animate-pulse',
    pending: 'bg-yellow-500 text-white',
    synced: 'bg-green-500 text-white'
  };

  // Icons
  const renderIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (isSyncing) return <Cloud className="w-4 h-4 animate-pulse" />;
    if (pendingCount > 0) return <AlertCircle className="w-4 h-4" />;
    return <Wifi className="w-4 h-4" />;
  };



  return (
    <div 
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Main indicator */}
      <div 
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full
          text-sm font-medium transition-all duration-200
          ${variantStyles[variant]}
          hover:shadow-lg cursor-pointer
        `}
      >
        {renderIcon()}
        {showDetails && (
          <span className="hidden sm:inline">
            {isOnline ? t('offline.indicator.syncing') : t('offline.indicator.offline')}
          </span>
        )}
        {pendingCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
            {pendingCount}
          </span>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div 
          className="
            absolute top-full right-0 mt-2 w-64 
            bg-white dark:bg-gray-800 
            rounded-lg shadow-xl border border-gray-200 dark:border-gray-700
            p-4 z-50
            animate-fade-in
          "
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              {renderIcon()}
              <span>
                {isOnline ? t('offline.indicator.connected') : t('offline.indicator.noConnection')}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {isOnline ? (
                isSyncing || pendingCount > 0 ? (
                  <div>
                    {t('offline.indicator.syncingChanges')}
                    {pendingCount > 0 && <div>• {t('offline.indicator.pendingActions', { count: pendingCount })}</div>}
                    {mediaCount > 0 && <div>• {t('offline.indicator.filesUploading', { count: mediaCount })}</div>}
                  </div>
                ) : (
                  t('offline.indicator.allSynced')
                )
              ) : (
                <div>
                  {t('offline.indicator.workingOffline')}
                  <div className="mt-2 text-xs">
                    {pendingCount > 0 && <div>• {t('offline.indicator.actionsQueued', { count: pendingCount })}</div>}
                    {mediaCount > 0 && <div>• {t('offline.indicator.filesQueued', { count: mediaCount })}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
