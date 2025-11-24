/**
 * Auto Sync Manager
 * Automatically triggers sync when coming online
 */

import { flushPendingQueue } from './syncWorker';
import { requestBackgroundSync } from '../../lib/services/swManager';

let syncInterval: NodeJS.Timeout | null = null;
let isInitialized = false;

/**
 * Initialize auto-sync listeners
 */
export function initializeAutoSync(userId: string) {
  if (isInitialized) {
    console.log('[AutoSync] Already initialized');
    return;
  }

  console.log('[AutoSync] Initializing for user:', userId);
  isInitialized = true;

  // Listen for online event
  window.addEventListener('online', async () => {
    console.log('[AutoSync] Device is online, triggering sync...');
    try {
      const result = await flushPendingQueue(userId);
      console.log('[AutoSync] Sync completed:', result);
      
      // 🔥 Single notification: check setting before showing
      if (result.synced > 0) {
        // Check if user enabled sync notifications
        const showSyncNotif = localStorage.getItem('showSyncNotifications') === 'true';
        
        if (showSyncNotif) {
          // Dispatch single event with batch summary
          window.dispatchEvent(new CustomEvent('sync-completed', { 
            detail: { synced: result.synced, failed: result.failed }
          }));
        }
      }

      // Request background sync
      await requestBackgroundSync();
    } catch (error) {
      console.error('[AutoSync] Sync failed:', error);
    }
  });

  // Listen for offline event
  window.addEventListener('offline', () => {
    console.log('[AutoSync] Device is offline');
    stopPeriodicSync();
  });

  // Listen for queue changes
  window.addEventListener('offline-queue-changed', async () => {
    console.log('[AutoSync] Queue changed');
    if (navigator.onLine) {
      // Debounce sync
      await debouncedSync(userId);
    }
  });

  // Listen for SW sync requests
  window.addEventListener('sw-sync-request', async () => {
    console.log('[AutoSync] Service Worker requested sync');
    if (navigator.onLine) {
      await flushPendingQueue(userId);
    }
  });

  // Start periodic sync if online
  if (navigator.onLine) {
    startPeriodicSync(userId);
  }
}

/**
 * Start periodic background sync (every 5 minutes)
 */
function startPeriodicSync(userId: string) {
  if (syncInterval) return;

  console.log('[AutoSync] Starting periodic sync');
  syncInterval = setInterval(async () => {
    if (navigator.onLine) {
      console.log('[AutoSync] Periodic sync...');
      try {
        const result = await flushPendingQueue(userId);
        
        // 🔥 Check setting for periodic sync too (silent by default)
        if (result.synced > 0) {
          const showSyncNotif = localStorage.getItem('showSyncNotifications') === 'true';
          
          if (showSyncNotif) {
            window.dispatchEvent(new CustomEvent('sync-completed', { 
              detail: { synced: result.synced, failed: result.failed }
            }));
          }
        }
      } catch (error) {
        console.error('[AutoSync] Periodic sync failed:', error);
      }
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

/**
 * Stop periodic sync
 */
function stopPeriodicSync() {
  if (syncInterval) {
    console.log('[AutoSync] Stopping periodic sync');
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

/**
 * Debounced sync (wait 2 seconds after last queue change)
 */
let syncTimeout: NodeJS.Timeout | null = null;

function debouncedSync(userId: string) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    console.log('[AutoSync] Debounced sync executing...');
    try {
      const result = await flushPendingQueue(userId);
      
      // 🔥 Check setting before showing notification (same as online event)
      if (result.synced > 0) {
        const showSyncNotif = localStorage.getItem('showSyncNotifications') === 'true';
        
        if (showSyncNotif) {
          window.dispatchEvent(new CustomEvent('sync-completed', { 
            detail: { synced: result.synced, failed: result.failed }
          }));
        }
      }
    } catch (error) {
      console.error('[AutoSync] Debounced sync failed:', error);
    }
  }, 2000);
}

/**
 * Cleanup auto-sync (call on logout)
 */
export function cleanupAutoSync() {
  console.log('[AutoSync] Cleaning up');
  stopPeriodicSync();
  isInitialized = false;
}

/**
 * Force sync now
 */
export async function forceSyncNow(userId: string) {
  console.log('[AutoSync] Force sync requested');
  if (!navigator.onLine) {
    throw new Error('Device is offline');
  }
  return await flushPendingQueue(userId);
}
