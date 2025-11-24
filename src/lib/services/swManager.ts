/**
 * Service Worker Registration & Management
 * Note: VitePWA plugin auto-registers SW, but we keep this for manual control
 */

export function registerServiceWorker() {
  // VitePWA auto-registers the service worker via registerSW.js
  // This function is now mainly for backwards compatibility and manual updates
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Check if VitePWA already registered a SW
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          console.log('[SW] Already registered by VitePWA:', registration.scope);
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available
                  console.log('[SW] New version available');
                  
                  // Notify user
                  if (window.confirm('New version available! Reload to update?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        }
      });

      // Listen for controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed, reloading...');
        window.location.reload();
      });

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_OFFLINE_ACTIONS') {
          console.log('[SW] Sync requested by service worker');
          window.dispatchEvent(new CustomEvent('sw-sync-request'));
        }
      });
    });
  }
}

/**
 * Request background sync (when online again)
 */
export async function requestBackgroundSync() {
  if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-offline-actions');
      console.log('[SW] Background sync registered');
    } catch (error) {
      console.error('[SW] Background sync failed:', error);
    }
  }
}

/**
 * Unregister service worker (for development/debugging)
 */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('[SW] Unregistered');
    }
  }
}

/**
 * 🔥 Force update Service Worker (for new version deployment)
 * Call this after upgrading SW version
 */
export async function forceUpdateServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
        console.log('[SW] Force update triggered');
      }
    } catch (error) {
      console.error('[SW] Force update failed:', error);
    }
  }
}

/**
 * 🔥 Clear all caches (for debugging storage issues)
 */
export async function clearAllCaches() {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.log('[SW] Cleared all caches:', cacheNames);
      return cacheNames.length;
    } catch (error) {
      console.error('[SW] Failed to clear caches:', error);
      return 0;
    }
  }
  return 0;
}
