/**
 * Rate Limiter for Multiplayer Operations
 * 
 * Prevents spam and abuse by limiting the rate of operations
 * per user. Uses sliding window algorithm.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  timestamps: number[];
  blocked: boolean;
  blockedUntil?: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    // Define rate limits for different actions
    this.configs.set('createRoom', { maxRequests: 5, windowMs: 60000 }); // 5 per minute
    this.configs.set('joinRoom', { maxRequests: 10, windowMs: 60000 }); // 10 per minute
    this.configs.set('sendMessage', { maxRequests: 20, windowMs: 60000 }); // 20 per minute
    this.configs.set('submitAnswer', { maxRequests: 100, windowMs: 60000 }); // 100 per minute
    this.configs.set('toggleReady', { maxRequests: 10, windowMs: 30000 }); // 10 per 30s
    this.configs.set('kickPlayer', { maxRequests: 5, windowMs: 60000 }); // 5 per minute
    // ✅ FIX: Add missing rate limit config for updateSharedScreen
    this.configs.set('updateSharedScreen', { maxRequests: 10, windowMs: 60000 }); // 10 per minute
  }

  /**
   * Check if action can be performed
   * @param userId - User ID
   * @param action - Action type
   * @returns true if allowed, false if rate limited
   */
  canPerform(userId: string, action: string): boolean {
    const config = this.configs.get(action);
    if (!config) {
      console.warn(`⚠️ No rate limit config for action: ${action}`);
      return true; // Allow if no config
    }

    const key = `${userId}_${action}`;
    const now = Date.now();
    
    // Get or create entry
    let entry = this.limits.get(key);
    if (!entry) {
      entry = { timestamps: [], blocked: false };
      this.limits.set(key, entry);
    }

    // Check if currently blocked
    if (entry.blocked && entry.blockedUntil) {
      if (now < entry.blockedUntil) {
        console.warn(`🚫 Rate limit: User ${userId} blocked for ${action} until ${new Date(entry.blockedUntil).toISOString()}`);
        return false;
      } else {
        // Unblock
        entry.blocked = false;
        entry.blockedUntil = undefined;
        entry.timestamps = [];
      }
    }

    // Remove old timestamps outside the window
    entry.timestamps = entry.timestamps.filter(t => now - t < config.windowMs);

    // Check if limit exceeded
    if (entry.timestamps.length >= config.maxRequests) {
      console.warn(`⚠️ Rate limit exceeded: User ${userId} for ${action} (${entry.timestamps.length}/${config.maxRequests})`);
      
      // Block for 2x the window duration
      entry.blocked = true;
      entry.blockedUntil = now + (config.windowMs * 2);
      
      return false;
    }

    // Add current timestamp
    entry.timestamps.push(now);
    return true;
  }

  /**
   * Get remaining requests for action
   */
  getRemaining(userId: string, action: string): number {
    const config = this.configs.get(action);
    if (!config) return Infinity;

    const key = `${userId}_${action}`;
    const entry = this.limits.get(key);
    if (!entry) return config.maxRequests;

    const now = Date.now();
    const validTimestamps = entry.timestamps.filter(t => now - t < config.windowMs);
    
    return Math.max(0, config.maxRequests - validTimestamps.length);
  }

  /**
   * Reset rate limit for user and action
   */
  reset(userId: string, action?: string): void {
    if (action) {
      const key = `${userId}_${action}`;
      this.limits.delete(key);
    } else {
      // Reset all actions for user
      const keysToDelete: string[] = [];
      this.limits.forEach((_, key) => {
        if (key.startsWith(`${userId}_`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.limits.delete(key));
    }
  }

  /**
   * Cleanup old entries (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.limits.forEach((entry, key) => {
      // Remove if all timestamps are old
      entry.timestamps = entry.timestamps.filter(t => {
        const action = key.split('_')[1];
        const config = this.configs.get(action);
        return config && now - t < config.windowMs;
      });

      // Remove entry if empty and not blocked
      if (entry.timestamps.length === 0 && !entry.blocked) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.limits.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Rate limiter cleanup: Removed ${keysToDelete.length} entries`);
    }
  }

  /**
   * Get all rate limit stats (for debugging)
   */
  getStats(): any {
    const stats: any = {};
    
    this.limits.forEach((entry, key) => {
      stats[key] = {
        requests: entry.timestamps.length,
        blocked: entry.blocked,
        blockedUntil: entry.blockedUntil ? new Date(entry.blockedUntil).toISOString() : null
      };
    });

    return stats;
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// ✅ FIX: Store cleanup interval for proper cleanup and clear on unload
let cleanupIntervalId: NodeJS.Timeout | null = null;

if (typeof window !== 'undefined') {
  // Cleanup every 5 minutes
  cleanupIntervalId = setInterval(() => {
    rateLimiter.cleanup();
  }, 5 * 60 * 1000);
  
  // Clear interval on window unload to prevent memory leak
  window.addEventListener('unload', () => {
    if (cleanupIntervalId) {
      clearInterval(cleanupIntervalId);
      cleanupIntervalId = null;
    }
  });
}

export default rateLimiter;
