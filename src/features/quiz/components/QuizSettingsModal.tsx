/**
 * 🎮 Quiz Settings Modal - DUAL MODE
 * 
 * Features:
 * - EXAM MODE: Timed quiz, review answers at the end
 * - PRACTICE MODE: Instant feedback, retry on wrong
 * - Shuffle questions/answers
 * - Sound effects
 * - Auto-submit settings
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Shuffle, 
  BookOpen, 
  Volume2, 
  VolumeX,
  Zap,
  RotateCcw,
  Save,
  GraduationCap,
  Target,
  RefreshCw,
  MessageSquare,
  Timer,
  MousePointerClick
} from 'lucide-react';

// Import types from centralized location
import {
  QuizSettings,
  QuizMode,
  ExamConfig,
  PracticeConfig,
  DEFAULT_QUIZ_SETTINGS,
  TIME_PER_QUESTION_OPTIONS,
  TOTAL_TIME_OPTIONS,
  SETTINGS_VERSION
} from '../types/quizSettings';

// Re-export types for backward compatibility
export type { QuizSettings, QuizMode, ExamConfig, PracticeConfig };

// Quiz data for defaults (only need these fields)
interface QuizData {
  duration: number; // minutes - Firestore quiz duration
  questions: Array<{ explanation?: string }>; // To check if quiz has explanations
}

interface QuizSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: QuizSettings) => void;
  currentSettings?: QuizSettings;
  quizId: string;
  quiz?: QuizData; // Optional: used to set defaults from Firestore
}

export const QuizSettingsModal: React.FC<QuizSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings,
  quizId,
  quiz
}) => {
  const { t } = useTranslation();
  
  // Calculate defaults based on Firestore quiz data
  const getDefaultSettings = (): QuizSettings => {
    const defaults = { ...DEFAULT_QUIZ_SETTINGS };
    
    if (quiz) {
      // Exam Mode default: use quiz.duration from Firestore
      defaults.examConfig = {
        ...defaults.examConfig,
        totalTime: quiz.duration || 0 // minutes
      };
      
      // Practice Mode default: 30 seconds per question
      defaults.practiceConfig = {
        ...defaults.practiceConfig,
        timePerQuestion: 30 // seconds
      };
    }
    
    return defaults;
  };
  
  const [settings, setSettings] = useState<QuizSettings>(
    currentSettings || getDefaultSettings()
  );

  // Load settings from localStorage on mount with VERSION MIGRATION
  useEffect(() => {
    if (isOpen) {
      const defaults = getDefaultSettings();
      const savedSettings = localStorage.getItem(`quiz_settings_${quizId}`);
      
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          
          // VERSION CHECK - Migration strategy
          if (parsed.version !== SETTINGS_VERSION) {
            // OLD DATA (v0 or different version) -> Discard and use Firestore defaults
            console.log(`🔄 Migrating settings from v${parsed.version || 0} to v${SETTINGS_VERSION}`);
            setSettings({
              ...defaults,
              version: SETTINGS_VERSION
            });
          } else {
            // CURRENT VERSION -> Trust user's saved settings (including 0 for no limit)
            // Deep merge to ensure all fields exist
            setSettings({
              ...defaults,
              ...parsed,
              version: SETTINGS_VERSION,
              examConfig: {
                ...defaults.examConfig,
                ...(parsed.examConfig || {})
              },
              practiceConfig: {
                ...defaults.practiceConfig,
                ...(parsed.practiceConfig || {})
              }
            });
          }
        } catch (e) {
          console.error('Failed to parse settings:', e);
          setSettings({ ...defaults, version: SETTINGS_VERSION });
        }
      } else {
        // NO SAVED SETTINGS -> Use Firestore defaults
        setSettings({ ...defaults, version: SETTINGS_VERSION });
      }
    }
  }, [isOpen, quizId, currentSettings, quiz]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem(`quiz_settings_${quizId}`, JSON.stringify(settings));
    onSave(settings);
    onClose();
  };

  const handleReset = () => {
    // Reset to defaults based on Firestore quiz data
    setSettings(getDefaultSettings());
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
            
            {/* Mode Selector */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t('quizSettings.mode.title', 'Quiz Mode')}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Exam Mode Card */}
                <button
                  onClick={() => setSettings({ ...settings, mode: 'exam' })}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                    settings.mode === 'exam'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  {settings.mode === 'exam' && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full" />
                  )}
                  <GraduationCap className={`w-8 h-8 mb-2 ${
                    settings.mode === 'exam' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <h4 className={`font-semibold mb-1 ${
                    settings.mode === 'exam' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {t('quizSettings.mode.exam', 'Exam Mode')}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('quizSettings.mode.examDesc', 'Timed quiz, see results at the end')}
                  </p>
                </button>

                {/* Practice Mode Card */}
                <button
                  onClick={() => setSettings({ ...settings, mode: 'practice' })}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                    settings.mode === 'practice'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-lg'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  {settings.mode === 'practice' && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-emerald-500 rounded-full" />
                  )}
                  <Target className={`w-8 h-8 mb-2 ${
                    settings.mode === 'practice' ? 'text-emerald-600' : 'text-gray-400'
                  }`} />
                  <h4 className={`font-semibold mb-1 ${
                    settings.mode === 'practice' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {t('quizSettings.mode.practice', 'Practice Mode')}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('quizSettings.mode.practiceDesc', 'Instant feedback, learn as you go')}
                  </p>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-slate-700" />

            {/* EXAM MODE Settings */}
            {settings.mode === 'exam' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Timer className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('quizSettings.examConfig.title', 'Exam Settings')}
                  </h3>
                </div>

                {/* Total Time */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('quizSettings.examConfig.totalTime', 'Total Time')}
                  </label>
                  <select
                    value={settings.examConfig.totalTime}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      examConfig: { ...settings.examConfig, totalTime: Number(e.target.value) }
                    })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {TOTAL_TIME_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {String(t(option.labelKey, option.fallback))}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('quizSettings.examConfig.totalTimeDesc', 'Total time for the entire quiz')}
                  </p>
                </div>

                {/* Allow Review */}
                <div className="flex items-start justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {t('quizSettings.examConfig.allowReview', 'Allow Review')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t('quizSettings.examConfig.allowReviewDesc', 'Review all answers before submitting')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={settings.examConfig.allowReview}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        examConfig: { ...settings.examConfig, allowReview: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </motion.div>
            )}

            {/* PRACTICE MODE Settings */}
            {settings.mode === 'practice' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('quizSettings.practiceConfig.title', 'Practice Settings')}
                  </h3>
                </div>

                {/* Time per Question */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('quizSettings.practiceConfig.timePerQuestion', 'Time per Question')}
                  </label>
                  <select
                    value={settings.practiceConfig.timePerQuestion}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      practiceConfig: { ...settings.practiceConfig, timePerQuestion: Number(e.target.value) },
                      timePerQuestion: Number(e.target.value) // Legacy support
                    })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {TIME_PER_QUESTION_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {String(t(option.labelKey, option.fallback))}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('quizSettings.practiceConfig.timePerQuestionDesc', 'Time limit for each question')}
                  </p>
                </div>

                {/* Instant Feedback */}
                <div className="flex items-start justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {t('quizSettings.practiceConfig.instantFeedback', 'Instant Feedback')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t('quizSettings.practiceConfig.instantFeedbackDesc', 'Show correct/incorrect immediately')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={settings.practiceConfig.instantFeedback}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        practiceConfig: { ...settings.practiceConfig, instantFeedback: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Retry on Wrong */}
                <div className="flex items-start justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <RefreshCw className="w-5 h-5 text-amber-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {t('quizSettings.practiceConfig.retryOnWrong', 'Retry on Wrong')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t('quizSettings.practiceConfig.retryOnWrongDesc', 'Allow retrying wrong answers')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={settings.practiceConfig.retryOnWrong}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        practiceConfig: { ...settings.practiceConfig, retryOnWrong: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {/* Show Explanation (Practice Mode Only) */}
                <div className="flex items-start justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {t('quizSettings.practiceConfig.showExplanation', 'Show Explanation')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t('quizSettings.practiceConfig.showExplanationDesc', 'Display explanation after answering each question')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={settings.practiceConfig.showExplanation}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        practiceConfig: { ...settings.practiceConfig, showExplanation: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </motion.div>
            )}

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-slate-700" />

            {/* Common Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-600" />
                {t('quizSettings.commonSettings', 'General Settings')}
              </h3>

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

            {/* Auto Advance - Instant Answer Selection */}
            {(() => {
              // Check if auto advance should be disabled (Practice mode + Instant Feedback ON)
              const isDisabled = settings.mode === 'practice' && settings.practiceConfig.instantFeedback;
              return (
                <div className={`flex items-start justify-between p-4 rounded-lg ${
                  isDisabled 
                    ? 'bg-gray-100 dark:bg-gray-800/50 opacity-60' 
                    : 'bg-indigo-50 dark:bg-indigo-900/20'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MousePointerClick className={`w-5 h-5 ${isDisabled ? 'text-gray-400' : 'text-indigo-600'}`} />
                      <h3 className={`font-semibold ${isDisabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {t('quizSettings.autoAdvance', 'Instant Answer')}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {isDisabled 
                        ? t('quizSettings.autoAdvanceDisabledNote', 'Disabled when Instant Feedback is ON (need time to see feedback)')
                        : t('quizSettings.autoAdvanceDesc', 'Auto advance to next question after selecting answer')
                      }
                    </p>
                  </div>
                  <label className={`relative inline-flex items-center ml-4 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={isDisabled ? false : settings.autoAdvance}
                      onChange={(e) => !isDisabled && setSettings({ ...settings, autoAdvance: e.target.checked })}
                      disabled={isDisabled}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                      isDisabled 
                        ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
                        : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white dark:border-gray-600 peer-checked:bg-indigo-600'
                    }`}></div>
                  </label>
                </div>
              );
            })()}

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
                  {t('quizSettings.soundEffectsDesc', 'Sound effects while taking the quiz')}
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

            </div> {/* End Common Settings */}
          </div> {/* End Content */}

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
