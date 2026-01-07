/**
 * 📱 usePWAInstall Hook
 * =======================
 * Handle PWA installation prompt
 * 
 * Bắt sự kiện `beforeinstallprompt` để cho phép người dùng
 * cài đặt ứng dụng như native app
 */

import { useState, useEffect, useCallback } from 'react';

// BeforeInstallPromptEvent type (not in standard TypeScript)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface UsePWAInstallReturn {
  /** Có thể cài đặt PWA hay không */
  canInstall: boolean;
  /** PWA đã được cài đặt chưa */
  isInstalled: boolean;
  /** Đang trong quá trình cài đặt */
  isInstalling: boolean;
  /** Hiển thị prompt cài đặt */
  promptInstall: () => Promise<boolean>;
  /** Platform hỗ trợ (android, windows, etc.) */
  platform: string | null;
}

// Store the deferred prompt globally to prevent it from being garbage collected
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function usePWAInstall(): UsePWAInstallReturn {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [platform, setPlatform] = useState<string | null>(null);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      setCanInstall(false);
      console.log('[PWA] App is running in standalone mode (installed)');
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      deferredPrompt = e as BeforeInstallPromptEvent;
      
      // Get platform info
      const promptEvent = e as BeforeInstallPromptEvent;
      if (promptEvent.platforms && promptEvent.platforms.length > 0) {
        setPlatform(promptEvent.platforms[0]);
      }
      
      // Update UI to show install button
      setCanInstall(true);
      
      console.log('[PWA] Install prompt ready, platforms:', promptEvent.platforms);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if deferredPrompt was already captured (e.g., by another component)
    if (deferredPrompt) {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger the install prompt
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('[PWA] Install prompt not available');
      return false;
    }

    setIsInstalling(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user response
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('[PWA] User response:', outcome);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
      }
      
      // Clear the deferred prompt - it can only be used once
      deferredPrompt = null;
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, []);

  return {
    canInstall,
    isInstalled,
    isInstalling,
    promptInstall,
    platform,
  };
}

/**
 * Check if the app is running as installed PWA
 */
export function isPWAInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches 
    || (window.navigator as any).standalone === true;
}

/**
 * Check if PWA installation is supported
 */
export function isPWASupported(): boolean {
  return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
}
