import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Settings, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  onSettings: () => void;
  onExit: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  onResume,
  onSettings,
  onExit
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 z-40 backdrop-blur-sm"
            onClick={onResume}
          />

          {/* Pause Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">⏸️</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('quiz.paused', 'Tạm dừng')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('quiz.pause_subtitle', 'Thời gian đang tạm dừng')}
                </p>
              </div>

              {/* Menu Options */}
              <div className="space-y-3">
                {/* Resume Button */}
                <button
                  onClick={onResume}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                >
                  <Play className="w-5 h-5" fill="currentColor" />
                  <span>{t('quiz.resume', 'Tiếp tục')}</span>
                </button>

                {/* Settings Button */}
                <button
                  onClick={onSettings}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95"
                >
                  <Settings className="w-5 h-5" />
                  <span>{t('quiz.settings', 'Cài đặt')}</span>
                </button>

                {/* Exit Button */}
                <button
                  onClick={onExit}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t('quiz.exit', 'Thoát quiz')}</span>
                </button>
              </div>

              {/* Hint */}
              <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  Esc
                </kbd>
                {' '}hoặc{' '}
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  P
                </kbd>
                {' '}để tạm dừng/tiếp tục
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
