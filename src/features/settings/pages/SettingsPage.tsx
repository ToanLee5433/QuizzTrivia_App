import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../lib/store';
import { useSettings } from '../../../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import { downloadManager } from '../../../features/offline/DownloadManager';
import { 
  Settings as SettingsIcon,
  Moon, 
  Sun, 
  Music, 
  Volume2, 
  Bell, 
  Save, 
  Accessibility,
  Type,
  Zap,
  ArrowLeft,
  Monitor,
  Globe,
  Shield,
  Database,
  Download,
  Trash2,
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Storage management state
  const [storageStats, setStorageStats] = useState<{
    totalQuizzes: number;
    totalSize: string;
    lastCleanup: string;
  } | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const {
    theme,
    toggleTheme,
    isMusicPlayerEnabled,
    toggleMusicPlayer,
    showSyncNotifications,
    toggleSyncNotifications,
    notificationsEnabled,
    toggleNotifications,
    soundEffectsEnabled,
    toggleSoundEffects,
    autoSaveEnabled,
    toggleAutoSave,
    reducedMotion,
    toggleReducedMotion,
    fontSize,
    setFontSize,
  } = useSettings();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    const langName = lang === 'vi' ? t('settings.system.vietnamese') : t('settings.system.english');
    toast.success(`${t('settings.languageChanged')} ${langName}`);
  };

  const clearCache = () => {
    if (confirm(t('settings.clearCacheConfirm'))) {
      localStorage.removeItem('quizCache');
      sessionStorage.clear();
      toast.success(t('settings.clearCacheSuccess'));
    }
  };

  // Load storage stats on mount
  useEffect(() => {
    loadStorageStats();
  }, [user]);

  const loadStorageStats = async () => {
    if (!user?.uid) return;

    try {
      const quizzes = await downloadManager.getDownloadedQuizzes(user.uid);
      const totalSize = quizzes.reduce((sum, q) => sum + (q.size || 0), 0);
      const lastCleanup = parseInt(localStorage.getItem('last_media_cleanup') || '0', 10);
      
      setStorageStats({
        totalQuizzes: quizzes.length,
        totalSize: formatBytes(totalSize),
        lastCleanup: lastCleanup 
          ? new Date(lastCleanup).toLocaleDateString('vi-VN')
          : t('storageManagement.notCleaned')
      });
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleManualCleanup = async () => {
    if (!user?.uid) {
      toast.error(t('storageManagement.loginRequired'));
      return;
    }

    setIsCleaningUp(true);
    try {
      const deleted = await downloadManager.cleanupOrphanedMedia(user.uid);
      localStorage.setItem('last_media_cleanup', Date.now().toString());
      await loadStorageStats();
      
      if (deleted > 0) {
        toast.success(`✅ ${t('storageManagement.cleanupSuccess', { count: deleted })}`);
      } else {
        toast.info(`✅ ${t('storageManagement.noCleanupNeeded')}`);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast.error(`❌ ${t('storageManagement.cleanupError')}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleClearAllOfflineData = async () => {
    if (!user?.uid) return;

    const confirmed = window.confirm(
      `⚠️ ${t('storageManagement.clearAllConfirm')}\n\n` +
      t('storageManagement.clearAllWarning')
    );

    if (!confirmed) return;

    setIsCleaningUp(true);
    try {
      const count = await downloadManager.clearAllDownloads(user.uid);
      localStorage.removeItem('last_media_cleanup');
      await loadStorageStats();
      
      toast.success(`✅ ${t('storageManagement.clearedSuccess', { count })}`);
    } catch (error) {
      console.error('Failed to clear data:', error);
      toast.error(`❌ ${t('storageManagement.clearError')}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const exportData = () => {
    const userData = {
      theme,
      isMusicPlayerEnabled,
      notificationsEnabled,
      soundEffectsEnabled,
      autoSaveEnabled,
      reducedMotion,
      fontSize,
      language: i18n.language,
      exportDate: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quiz-settings-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('storageManagement.exportSuccess'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4 transition-all duration-500">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 mb-4 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">{t('settings.backButton')}</span>
          </button>
          
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-2xl shadow-lg shadow-blue-500/25 dark:shadow-blue-600/25 transition-all duration-300 hover:scale-105">
              <SettingsIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">{t('settings.title')}</h1>
              <p className="text-gray-600 dark:text-gray-300 transition-colors">{t('settings.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Appearance Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Monitor className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white transition-colors">{t('settings.appearance.title')}</h2>
            </div>

            <div className="space-y-4">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-500 group-hover:rotate-12 transition-transform" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white transition-colors">{t('settings.appearance.theme')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">
                      {theme === 'dark' ? t('settings.themeEnabled') : t('settings.themeDisabled')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    toggleTheme();
                    const mode = theme === 'light' ? t('settings.themeDark') : t('settings.themeLight');
                    toast.success(`${t('settings.themeChanged')} ${mode}`);
                  }}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    theme === 'dark' ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                      theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Font Size */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Type className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <p className="font-semibold text-gray-800 dark:text-white transition-colors">{t('settings.appearance.fontSize')}</p>
                </div>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                        fontSize === size
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500'
                      }`}
                    >
                      {t(`settings.appearance.${size}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reduced Motion */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <Accessibility className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white transition-colors">{t('settings.appearance.reducedMotion')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">{t('settings.appearance.reducedMotionDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={toggleReducedMotion}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    reducedMotion ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                      reducedMotion ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Media & Audio Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Volume2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white transition-colors">{t('settings.media.title')}</h2>
            </div>

            <div className="space-y-4">
              {/* Music Player */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white transition-colors">{t('settings.audio.musicPlayer')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">
                      {t('settings.audio.musicPlayerDesc')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    toggleMusicPlayer();
                    toast.success(isMusicPlayerEnabled ? t('settings.musicPlayerToggled') : t('settings.musicPlayerEnabled'));
                  }}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    isMusicPlayerEnabled ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                      isMusicPlayerEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sound Effects */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white transition-colors">{t('settings.audio.soundEffects')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">{t('settings.audio.soundEffectsDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={toggleSoundEffects}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    soundEffectsEnabled ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                      soundEffectsEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Sync & Offline Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white transition-colors">{t('settings.sync.title')}</h2>
            </div>

            <div className="space-y-4">
              {/* Sync Notifications Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white transition-colors">{t('settings.sync.syncNotifications')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">
                      {t('settings.sync.syncNotificationsDesc')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    toggleSyncNotifications();
                    toast.success(showSyncNotifications 
                      ? t('settings.sync.syncNotificationsDisabled') 
                      : t('settings.sync.syncNotificationsEnabled')
                    );
                  }}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    showSyncNotifications ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                      showSyncNotifications ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* System Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white transition-colors">{t('settings.system.title')}</h2>
            </div>

            <div className="space-y-4">
              {/* Notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white transition-colors">{t('settings.notifications.enable')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">{t('settings.notifications.enableDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={toggleNotifications}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    notificationsEnabled ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                      notificationsEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Save */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <Save className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white transition-colors">{t('settings.system.autoSave')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">{t('settings.system.autoSaveDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={toggleAutoSave}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    autoSaveEnabled ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                      autoSaveEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Language */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <p className="font-semibold text-gray-800 dark:text-white transition-colors">{t('settings.system.language')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLanguageChange('vi')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                      i18n.language === 'vi'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500'
                    }`}
                  >
                    🇻🇳 {t('settings.system.vietnamese')}
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                      i18n.language === 'en'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500'
                    }`}
                  >
                    🇺🇸 {t('settings.system.english')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Offline Storage Management Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <HardDrive className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white transition-colors">Quản lý bộ nhớ offline</h2>
            </div>

            {storageStats && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Bài quiz đã tải</div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">{storageStats.totalQuizzes}</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Dung lượng</div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">{storageStats.totalSize}</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Dọn dẹp lần cuối</div>
                  <div className="text-lg font-semibold text-gray-800 dark:text-white">{storageStats.lastCleanup}</div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleManualCleanup}
                disabled={isCleaningUp || !user}
                className="w-full flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className={`w-5 h-5 text-green-600 dark:text-green-400 transition-transform ${isCleaningUp ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                  <div className="text-left">
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      {isCleaningUp ? t('common.loading') : t('storageManagement.cleanupOrphanedFiles')}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-500">{t('storageManagement.cleanupOrphanedFiles')}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={handleClearAllOfflineData}
                disabled={isCleaningUp || !user}
                className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="font-semibold text-red-700 dark:text-red-400">{t('storageManagement.deleteAllOfflineData')}</p>
                    <p className="text-sm text-red-600 dark:text-red-500">{t('storageManagement.deleteAllDescription')}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Data & Storage Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white transition-colors">{t('settings.data.title')}</h2>
            </div>

            <div className="space-y-3">
              <button
                onClick={exportData}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  <p className="font-semibold text-gray-800 dark:text-white transition-colors">{t('settings.data.exportSettings')}</p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{t('settings.data.exportFormat')}</span>
              </button>

              <button
                onClick={clearCache}
                className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" />
                  <p className="font-semibold text-red-600 dark:text-red-400 transition-colors">{t('settings.data.clearCache')}</p>
                </div>
                <span className="text-sm text-red-500 dark:text-red-400 transition-colors">{t('settings.data.clearCacheAction')}</span>
              </button>
            </div>
          </div>

          {/* Info Footer */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-2xl shadow-xl shadow-blue-500/25 dark:shadow-purple-600/25 p-6 text-white transition-all duration-300">
            <h3 className="font-bold text-lg mb-2">{t('settings.tips.title')}</h3>
            <p className="text-sm opacity-90">
              {t('settings.tips.description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
