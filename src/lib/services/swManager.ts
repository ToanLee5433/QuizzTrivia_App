/**
 * Service Worker Registration & Management
 */

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Registered:', registration.scope);

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
        })
        .catch((error) => {
          console.error('[SW] Registration failed:', error);
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
