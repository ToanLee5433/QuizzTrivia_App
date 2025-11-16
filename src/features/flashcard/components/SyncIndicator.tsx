/**
 * SyncIndicator Component
 * Shows offline/online status and sync information
 */

import { useTranslation } from 'react-i18next';
import type { SyncIndicatorProps } from '../types/flashcard';

export function SyncIndicator({
  isOnline,
  isSyncing,
  pendingCount,
  lastSyncTime,
  error,
  onSyncNow
}: SyncIndicatorProps) {
  const { t } = useTranslation();
  
  // Format last sync time
  const formatLastSync = (timestamp?: number): string => {
    if (!timestamp) return t('flashcard.sync.never');
    
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000); // seconds
    
    if (diff < 60) return t('flashcard.sync.justNow');
    if (diff < 3600) {
      const mins = Math.floor(diff / 60);
      return t('flashcard.sync.minutesAgo', { count: mins });
    }
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return t('flashcard.sync.hoursAgo', { count: hours });
    }
    return new Date(timestamp).toLocaleDateString();
  };
  
  // Determine status
  const getStatus = () => {
    if (error) return 'error';
    if (isSyncing) return 'syncing';
    if (!isOnline) return 'offline';
    return 'online';
  };
  
  const status = getStatus();
  
  // Status config
  const statusConfig = {
    online: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ),
      label: t('flashcard.sync.online')
    },
    offline: {
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
        </svg>
      ),
      label: t('flashcard.sync.offline')
    },
    syncing: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: (
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      label: t('flashcard.sync.syncing')
    },
    error: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      label: t('flashcard.sync.error')
    }
  };
  
  const config = statusConfig[status];
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor}`}>
      {/* Status icon and label */}
      <div className={`flex items-center gap-1.5 ${config.color}`}>
        {config.icon}
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      
      {/* Pending count */}
      {pendingCount > 0 && (
        <>
          <span className="text-gray-400">•</span>
          <span className="text-sm text-gray-600">
            {t('flashcard.sync.pendingChanges', { count: pendingCount })}
          </span>
        </>
      )}
      
      {/* Last sync time */}
      {lastSyncTime && !isSyncing && (
        <>
          <span className="text-gray-400">•</span>
          <span className="text-xs text-gray-500">
            {formatLastSync(lastSyncTime)}
          </span>
        </>
      )}
      
      {/* Sync now button */}
      {!isOnline && pendingCount > 0 && onSyncNow && (
        <button
          onClick={onSyncNow}
          className="ml-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
          title={t('flashcard.sync.syncNow')}
        >
          {t('flashcard.sync.syncNow')}
        </button>
      )}
      
      {/* Error message */}
      {error && (
        <span className="text-xs text-red-600 ml-1" title={error}>
          {t('flashcard.sync.syncFailed')}
        </span>
      )}
    </div>
  );
}

export default SyncIndicator;
