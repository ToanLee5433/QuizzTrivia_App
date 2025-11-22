import { NetworkError } from '../errors/MultiplayerErrors';

export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private callbacks: Map<string, { event: 'online' | 'offline', callback: Function }> = new Map();
  public isOnline = navigator.onLine;
  private checkInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    // Listen to browser online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('online');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('offline');
    });
    
    // Also ping server periodically to verify connection
    this.checkInterval = setInterval(() => this.checkConnection(), 30000);
  }
  
  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }
  
  on(event: 'online' | 'offline', callback: Function): string {
    const id = `${event}_${Date.now()}_${Math.random()}`;
    this.callbacks.set(id, { event, callback });
    return id;
  }
  
  off(id: string) {
    this.callbacks.delete(id);
  }
  
  private emit(event: 'online' | 'offline') {
    this.callbacks.forEach(({ event: cbEvent, callback }) => {
      if (cbEvent === event) {
        try {
          callback();
        } catch (error) {
          console.error(`Error in network monitor callback for ${event}:`, error);
        }
      }
    });
  }
  
  private async checkConnection(): Promise<boolean> {
    try {
      // Ping a reliable endpoint that supports HEAD requests
      // Use Google's public DNS or a known working endpoint
      await fetch('https://www.google.com/generate_204', { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      
      if (!this.isOnline) {
        this.isOnline = true;
        this.emit('online');
      }
      return true;
    } catch (error) {
      if (this.isOnline) {
        this.isOnline = false;
        this.emit('offline');
      }
      return false;
    }
  }
  
  // Check if online and throw error if not
  ensureOnline(): void {
    if (!this.isOnline) {
      throw new NetworkError('No internet connection');
    }
  }
  
  // Cleanup method
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.callbacks.clear();
  }
}

// Export singleton instance
export const networkMonitor = NetworkMonitor.getInstance();
