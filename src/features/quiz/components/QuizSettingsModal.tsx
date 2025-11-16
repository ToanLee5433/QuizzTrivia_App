/**
 * ≡ƒÄ« Quiz Settings Modal
 * 
 * Features:
 * - Adjust time per question
 * - Shuffle questions
 * - Show/hide explanations
 * - Auto-submit on time end
 * - Sound effects
 * - Dark mode preference
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Clock, 
  Shuffle, 
  BookOpen, 
  Volume2, 
  VolumeX,
  Zap,
  RotateCcw,
  Save
} from 'lucide-react';

export interface QuizSettings {
  timePerQuestion: number; // seconds, 0 = no limit
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showExplanations: boolean;
  autoSubmit: boolean;
  soundEffects: boolean;
  darkMode: boolean;
}

interface QuizSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: QuizSettings) => void;
  currentSettings?: QuizSettings;
  quizId: string;
}

const DEFAULT_SETTINGS: QuizSettings = {
  timePerQuestion: 0, // No limit by default
  shuffleQuestions: false,
  shuffleAnswers: false,
  showExplanations: true,
  autoSubmit: true,
  soundEffects: false,
  darkMode: false
};

const TIME_OPTIONS = [
  { value: 0, labelKey: 'quizSettings.timeOptions.noLimit', fallback: 'No limit' },
  { value: 30, labelKey: 'quizSettings.timeOptions.seconds30', fallback: '30 seconds' },
  { value: 45, labelKey: 'quizSettings.timeOptions.seconds45', fallback: '45 seconds' },
  { value: 60, labelKey: 'quizSettings.timeOptions.minute1', fallback: '1 minute' },
  { value: 90, labelKey: 'quizSettings.timeOptions.minute1_5', fallback: '1.5 minutes' },
  { value: 120, labelKey: 'quizSettings.timeOptions.minutes2', fallback: '2 minutes' },
  { value: 180, labelKey: 'quizSettings.timeOptions.minutes3', fallback: '3 minutes' }
];

export const QuizSettingsModal: React.FC<QuizSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings,
  quizId
}) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<QuizSettings>(
    currentSettings || DEFAULT_SETTINGS
  );

  // Load settings from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const savedSettings = localStorage.getItem(`quiz_settings_${quizId}`);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (e) {
          setSettings(currentSettings || DEFAULT_SETTINGS);
        }
      } else {
        setSettings(currentSettings || DEFAULT_SETTINGS);
      }
    }
  }, [isOpen, quizId, currentSettings]);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem(`quiz_settings_${quizId}`, JSON.stringify(settings));
    onSave(settings);
    onClose();
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(`quiz_settings_${quizId}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {t('quizSettings.title', 'Quiz Settings')}
                </h2>
                <p className="text-sm text-blue-100">
                  {t('quizSettings.subtitle', 'Customize your quiz experience')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            
            {/* Time per Question */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t('quizSettings.timePerQuestion', 'Time per question')}
                </h3>
              </div>
              <select
                value={settings.timePerQuestion}
                onChange={(e) => setSettings({ ...settings, timePerQuestion: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {TIME_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey, option.fallback)}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('quizSettings.timeDesc', 'Time limit for each question. Choose "No limit" for unlimited time.')}
              </p>
            </div>

            {/* Shuffle Questions */}
            <div className="flex items-start justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Shuffle className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('quizSettings.shuffleQuestions', 'Shuffle questions')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('quizSettings.shuffleQuestionsDesc', 'Display questions in random order')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.shuffleQuestions}
                  onChange={(e) => setSettings({ ...settings, shuffleQuestions: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Shuffle Answers */}
            <div className="flex items-start justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Shuffle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('quizSettings.shuffleAnswers', 'Shuffle answers')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('quizSettings.shuffleAnswersDesc', 'Display answer options in random order')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.shuffleAnswers}
                  onChange={(e) => setSettings({ ...settings, shuffleAnswers: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Show Explanations */}
            <div className="flex items-start justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('quizSettings.showExplanations', 'Show explanations')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('quizSettings.showExplanationsDesc', 'Display explanations after answering')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.showExplanations}
                  onChange={(e) => setSettings({ ...settings, showExplanations: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Auto Submit */}
            <div className="flex items-start justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('quizSettings.autoSubmit', 'Auto-submit')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('quizSettings.autoSubmitDesc', 'Automatically submit quiz when time expires')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.autoSubmit}
                  onChange={(e) => setSettings({ ...settings, autoSubmit: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {/* Sound Effects */}
            <div className="flex items-start justify-between p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {settings.soundEffects ? (
                    <Volume2 className="w-5 h-5 text-rose-600" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-rose-600" />
                  )}
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('quizSettings.soundEffects', 'Sound effects')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('quizSettings.soundEffectsDesc', 'Play sounds for correct/incorrect answers')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.soundEffects}
                  onChange={(e) => setSettings({ ...settings, soundEffects: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 dark:peer-focus:ring-rose-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-rose-600"></div>
              </label>
            </div>

          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-slate-900 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('quizSettings.reset', 'Reset')}
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Save className="w-4 h-4" />
                {t('quizSettings.save', 'Save settings')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QuizSettingsModal;
