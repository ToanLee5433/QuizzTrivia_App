import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
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
  Download
} from 'lucide-react';
import { toast } from 'react-toastify';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const {
    theme,
    toggleTheme,
    isMusicPlayerEnabled,
    toggleMusicPlayer,
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
    toast.success('Đã xuất cài đặt thành công!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 py-8 px-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('settings.backButton')}</span>
          </button>
          
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
              <SettingsIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t('settings.title')}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t('settings.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Appearance Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-6">
              <Monitor className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('settings.appearance.title')}</h2>
            </div>

            <div className="space-y-4">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{t('settings.appearance.theme')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
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
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    theme === 'dark' ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Font Size */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Type className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <p className="font-semibold text-gray-800 dark:text-white">{t('settings.appearance.fontSize')}</p>
                </div>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        fontSize === size
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-purple-100 dark:hover:bg-gray-500'
                      }`}
                    >
                      {t(`settings.appearance.${size}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reduced Motion */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center gap-3">
                  <Accessibility className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{t('settings.appearance.reducedMotion')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.appearance.reducedMotionDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={toggleReducedMotion}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    reducedMotion ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      reducedMotion ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Media & Audio Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-6">
              <Volume2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('settings.media.title')}</h2>
            </div>

            <div className="space-y-4">
              {/* Music Player */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{t('settings.audio.musicPlayer')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('settings.audio.musicPlayerDesc')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    toggleMusicPlayer();
                    toast.success(isMusicPlayerEnabled ? t('settings.musicPlayerToggled') : t('settings.musicPlayerEnabled'));
                  }}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    isMusicPlayerEnabled ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      isMusicPlayerEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sound Effects */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{t('settings.audio.soundEffects')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.audio.soundEffectsDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={toggleSoundEffects}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    soundEffectsEnabled ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      soundEffectsEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* System Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('settings.system.title')}</h2>
            </div>

            <div className="space-y-4">
              {/* Notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{t('settings.notifications.enable')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.notifications.enableDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={toggleNotifications}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    notificationsEnabled ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      notificationsEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Save */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center gap-3">
                  <Save className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{t('settings.system.autoSave')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.system.autoSaveDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={toggleAutoSave}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    autoSaveEnabled ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      autoSaveEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Language */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <p className="font-semibold text-gray-800 dark:text-white">{t('settings.system.language')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLanguageChange('vi')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      i18n.language === 'vi'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-purple-100 dark:hover:bg-gray-500'
                    }`}
                  >
                    🇻🇳 {t('settings.system.vietnamese')}
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      i18n.language === 'en'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-purple-100 dark:hover:bg-gray-500'
                    }`}
                  >
                    🇺🇸 {t('settings.system.english')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Data & Storage Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('settings.data.title')}</h2>
            </div>

            <div className="space-y-3">
              <button
                onClick={exportData}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                  <p className="font-semibold text-gray-800 dark:text-white">{t('settings.data.exportSettings')}</p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('settings.data.exportFormat')}</span>
              </button>

              <button
                onClick={clearCache}
                className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" />
                  <p className="font-semibold text-red-600 dark:text-red-400">{t('settings.data.clearCache')}</p>
                </div>
                <span className="text-sm text-red-500 dark:text-red-400">{t('settings.data.clearCacheAction')}</span>
              </button>
            </div>
          </div>

          {/* Info Footer */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-xl p-6 text-white">
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
