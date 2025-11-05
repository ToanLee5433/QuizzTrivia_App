/**
 * Multiplayer Logging Utility
 * Environment-based logging that only works in development
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

class MultiplayerLogger {
  private prefix = '🎮 [Multiplayer]';

  log(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log(`${this.prefix} ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.info(`${this.prefix} ℹ️ ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.warn(`${this.prefix} ⚠️ ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    // Always log errors, even in production
    console.error(`${this.prefix} ❌ ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.debug(`${this.prefix} 🔍 ${message}`, ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log(`${this.prefix} ✅ ${message}`, ...args);
    }
  }
}

export const logger = new MultiplayerLogger();
