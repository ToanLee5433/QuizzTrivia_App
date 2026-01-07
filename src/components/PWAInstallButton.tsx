/**
 * 📱 PWA Install Button Component
 * =================================
 * Hiển thị nút cài đặt PWA khi có thể
 * 
 * Sử dụng:
 * - Đặt trong Header/Navbar
 * - Hoặc hiển thị như banner/popup
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X, Smartphone, Check, Loader2 } from 'lucide-react';

interface PWAInstallButtonProps {
  /** Variant hiển thị */
  variant?: 'button' | 'banner' | 'minimal';
  /** Custom className */
  className?: string;
  /** Callback khi cài đặt thành công */
  onInstalled?: () => void;
  /** Callback khi người dùng dismiss */
  onDismiss?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  className = '',
  onInstalled,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const { canInstall, isInstalled, isInstalling, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't render if can't install, already installed, or dismissed
  if (!canInstall || isInstalled || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      onInstalled?.();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
    // Store dismissal in localStorage so it persists
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Minimal variant - just an icon button
  if (variant === 'minimal') {
    return (
      <button
        onClick={handleInstall}
        disabled={isInstalling}
        className={`p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 
          transition-colors disabled:opacity-50 ${className}`}
        title={t('pwa.install.buttonText', 'Install App')}
      >
        {isInstalling ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Download className="w-5 h-5" />
        )}
      </button>
    );
  }

  // Banner variant - full width banner
  if (variant === 'banner') {
    return (
      <div className={`fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 
        text-white p-4 shadow-lg z-50 ${className}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold">
                {t('pwa.install.bannerTitle', 'Install Quiz App')}
              </p>
              <p className="text-sm text-white/80">
                {t('pwa.install.bannerDescription', 'Add to home screen for offline access')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={t('common.dismiss', 'Dismiss')}
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg 
                hover:bg-blue-50 transition-colors disabled:opacity-50 
                flex items-center gap-2"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('pwa.install.installing', 'Installing...')}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {t('pwa.install.buttonText', 'Install')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default button variant
  return (
    <button
      onClick={handleInstall}
      disabled={isInstalling}
      className={`flex items-center gap-2 px-4 py-2 bg-blue-500 text-white 
        rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 
        font-medium ${className}`}
    >
      {isInstalling ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('pwa.install.installing', 'Installing...')}
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          {t('pwa.install.buttonText', 'Install App')}
        </>
      )}
    </button>
  );
};

/**
 * PWA Installed Badge - Hiển thị khi app đã cài đặt
 */
export const PWAInstalledBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { isInstalled } = usePWAInstall();

  if (!isInstalled) return null;

  return (
    <div className={`flex items-center gap-1 text-green-600 text-sm ${className}`}>
      <Check className="w-4 h-4" />
      <span>{t('pwa.install.installed', 'Installed')}</span>
    </div>
  );
};

export default PWAInstallButton;
