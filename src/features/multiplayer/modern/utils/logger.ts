/**
 * Logger Utility for Modern Multiplayer
 * 
 * Provides structured logging with different levels and context.
 * Can be integrated with external services (Sentry, LogRocket, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: any;
  userId?: string;
  roomId?: string;
}

class MultiplayerLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private enabledLevels: Set<LogLevel> = new Set(['info', 'warn', 'error', 'success']);

  constructor() {
    // In development, enable debug logs
    if (process.env.NODE_ENV === 'development') {
      this.enabledLevels.add('debug');
    }
  }

  private log(level: LogLevel, message: string, context?: any): void {
    if (!this.enabledLevels.has(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context
    };

    // Add to memory store
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with colors
    const emoji = this.getEmoji(level);
    const color = this.getColor(level);
    
    if (context) {
      console.log(
        `%c${emoji} [${level.toUpperCase()}] ${message}`,
        `color: ${color}; font-weight: bold;`,
        context
      );
    } else {
      console.log(
        `%c${emoji} [${level.toUpperCase()}] ${message}`,
        `color: ${color}; font-weight: bold;`
      );
    }

    // Send to external service in production
    if (level === 'error' && process.env.NODE_ENV === 'production') {
      this.sendToExternalService(entry);
    }
  }

  debug(message: string, context?: any): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: any): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: any, context?: any): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    };
    this.log('error', message, errorContext);
  }

  success(message: string, context?: any): void {
    this.log('success', message, context);
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case 'debug': return '🔍';
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return '📝';
    }
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case 'debug': return '#6B7280';
      case 'info': return '#3B82F6';
      case 'warn': return '#F59E0B';
      case 'error': return '#EF4444';
      case 'success': return '#10B981';
      default: return '#000000';
    }
  }

  private sendToExternalService(_entry: LogEntry): void {
    // TODO: Integrate with Sentry, LogRocket, or other services
    // Example with fetch:
    // fetch('/api/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(_entry)
    // }).catch(console.error);
  }

  /**
   * Get recent logs
   */
  getLogs(level?: LogLevel, limit: number = 100): LogEntry[] {
    let filtered = this.logs;
    
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    return filtered.slice(-limit);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Enable/disable log levels
   */
  setEnabledLevels(levels: LogLevel[]): void {
    this.enabledLevels = new Set(levels);
  }

  /**
   * Get stats about logged entries
   */
  getStats(): any {
    const stats: any = {
      total: this.logs.length,
      byLevel: {}
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Download logs as file
   */
  downloadLogs(): void {
    const dataStr = this.exportLogs();
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `multiplayer-logs-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
export const logger = new MultiplayerLogger();

// Expose to window for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).multiplayerLogger = logger;
}

export default logger;
