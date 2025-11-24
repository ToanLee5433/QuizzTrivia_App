/**
 * 🔥 Chunk Preloader - Prefetch all lazy-loaded chunks
 * ====================================================
 * Giải quyết vấn đề: Quiz không chạy offline vì QuizPage chunk chưa được cache
 * 
 * Strategy:
 * 1. Detect when user is online
 * 2. Prefetch critical lazy-loaded chunks in background (không ảnh hưởng UX)
 * 3. Service Worker will cache these chunks automatically
 * 4. Khi offline → chunks đã có trong cache → Quiz chạy mượt
 */

interface PreloadProgress {
  loaded: number;
  total: number;
  currentChunk?: string;
}

type PreloadCallback = (progress: PreloadProgress) => void;

/**
 * 🔥 Prefetch all critical chunks (QuizPage, etc.)
 * Call this on app startup when online
 */
export async function preloadCriticalChunks(onProgress?: PreloadCallback): Promise<void> {
  // Only preload when online
  if (!navigator.onLine) {
    console.log('[ChunkPreloader] Offline - skipping preload');
    return;
  }

  // Check if already preloaded (use localStorage flag)
  const lastPreload = parseInt(localStorage.getItem('chunks_preloaded_at') || '0', 10);
  const ONE_DAY = 24 * 60 * 60 * 1000;
  
  if (Date.now() - lastPreload < ONE_DAY) {
    console.log('[ChunkPreloader] ✓ Chunks recently preloaded, skipping');
    return;
  }

  console.log('[ChunkPreloader] 🚀 Starting chunk preload...');

  try {
    // 🔥 CRITICAL: Import all lazy-loaded routes
    // This triggers Vite to load the chunks, and Service Worker will cache them
    const criticalImports = [
      // Core pages
      import('../../features/quiz/pages/QuizPage'),
      import('../../features/quiz/pages/QuizList'),
      import('../../shared/pages/Dashboard'),
      
      // Secondary pages
      import('../../features/quiz/pages/QuizPreviewPage'),
      import('../../features/quiz/pages/QuizReviewsPage'),
      import('../../pages/DownloadedQuizzesPage'),
      
      // Creator pages (if user becomes creator)
      import('../../features/quiz/pages/CreateQuizPage'),
      import('../../features/quiz/pages/EditQuizPageAdvanced'),
    ];

    const total = criticalImports.length;
    let loaded = 0;

    // Load chunks with progress tracking
    for (const importPromise of criticalImports) {
      try {
        await importPromise;
        loaded++;
        
        onProgress?.({
          loaded,
          total,
          currentChunk: `Chunk ${loaded}/${total}`,
        });
        
        console.log(`[ChunkPreloader] ✓ Loaded ${loaded}/${total}`);
      } catch (error) {
        console.warn(`[ChunkPreloader] Failed to load chunk ${loaded + 1}:`, error);
        loaded++;
      }
    }

    // Mark as preloaded
    localStorage.setItem('chunks_preloaded_at', Date.now().toString());
    
    console.log('[ChunkPreloader] ✅ Preload complete - App ready for offline use');
  } catch (error) {
    console.error('[ChunkPreloader] Preload failed:', error);
  }
}

/**
 * 🔥 Force preload (ignore cache, for debugging)
 */
export async function forcePreloadChunks(onProgress?: PreloadCallback): Promise<void> {
  localStorage.removeItem('chunks_preloaded_at');
  return preloadCriticalChunks(onProgress);
}

/**
 * 🔥 Check if chunks are preloaded
 */
export function areChunksPreloaded(): boolean {
  const lastPreload = parseInt(localStorage.getItem('chunks_preloaded_at') || '0', 10);
  const ONE_DAY = 24 * 60 * 60 * 1000;
  return Date.now() - lastPreload < ONE_DAY;
}

/**
 * 🔥 Background preload (non-blocking)
 * Call this in App.tsx after initial render
 */
export function backgroundPreloadChunks(): void {
  // Wait for idle time to avoid blocking UI
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      preloadCriticalChunks();
    }, { timeout: 5000 }); // Max 5s wait
  } else {
    // Fallback: Use setTimeout
    setTimeout(() => {
      preloadCriticalChunks();
    }, 3000); // Wait 3s after page load
  }
}

export default {
  preloadCriticalChunks,
  forcePreloadChunks,
  areChunksPreloaded,
  backgroundPreloadChunks,
};
