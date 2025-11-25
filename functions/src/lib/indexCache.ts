/**
 * 💾 Index Cache Manager
 * 
 * Implements in-memory caching for vector index to reduce Cloud Storage reads
 * Reduces latency and costs for chatbot queries
 * 
 * Features:
 * - TTL-based cache expiry
 * - Lazy loading
 * - Cache invalidation on updates
 */

import { VectorIndex } from '../types/genkit';
import { loadIndexFromStorage } from './storageUtils';

interface CacheEntry {
  index: VectorIndex;
  loadedAt: number;
  expiresAt: number;
}

class IndexCache {
  private cache: CacheEntry | null = null;
  private readonly TTL_MS: number;
  private loading: Promise<VectorIndex | null> | null = null;

  constructor(ttlMinutes: number = 5) {
    this.TTL_MS = ttlMinutes * 60 * 1000;
  }

  /**
   * Get index from cache or load from storage
   */
  async get(): Promise<VectorIndex | null> {
    const now = Date.now();

    // Check if cache is valid
    if (this.cache && now < this.cache.expiresAt) {
      console.log('✅ Using cached index');
      return this.cache.index;
    }

    // If already loading, wait for it
    if (this.loading) {
      console.log('⏳ Waiting for ongoing load...');
      return await this.loading;
    }

    // Load from storage
    console.log('📥 Loading index from Storage (cache miss)...');
    
    this.loading = loadIndexFromStorage()
      .then((index) => {
        if (index) {
          this.cache = {
            index,
            loadedAt: Date.now(),
            expiresAt: Date.now() + this.TTL_MS,
          };
          console.log(`✅ Index loaded and cached (expires in ${this.TTL_MS / 1000 / 60} min)`);
        }
        this.loading = null;
        return index;
      })
      .catch((error) => {
        console.error('❌ Failed to load index:', error);
        this.loading = null;
        return null;
      });

    return await this.loading;
  }

  /**
   * Invalidate cache (force reload on next get)
   */
  invalidate(): void {
    console.log('🗑️ Cache invalidated');
    this.cache = null;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    if (!this.cache) {
      return {
        cached: false,
        age: 0,
        expiresIn: 0,
      };
    }

    const now = Date.now();
    const age = (now - this.cache.loadedAt) / 1000; // seconds
    const expiresIn = Math.max(0, (this.cache.expiresAt - now) / 1000); // seconds

    return {
      cached: true,
      age: Math.round(age),
      expiresIn: Math.round(expiresIn),
      totalChunks: this.cache.index.totalChunks,
      version: this.cache.index.version,
    };
  }

  /**
   * Preload index into cache
   */
  async preload(): Promise<void> {
    console.log('🔄 Preloading index into cache...');
    await this.get();
  }
}

// Global cache instance (singleton)
export const indexCache = new IndexCache(5); // 5 minutes TTL

/**
 * Get index with caching
 */
export async function getCachedIndex(): Promise<VectorIndex | null> {
  return await indexCache.get();
}

/**
 * Invalidate cache after index update
 */
export function invalidateIndexCache(): void {
  indexCache.invalidate();
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  return indexCache.getStats();
}

/**
 * Preload cache (useful for Cloud Function warm-up)
 */
export async function preloadIndexCache(): Promise<void> {
  await indexCache.preload();
}
