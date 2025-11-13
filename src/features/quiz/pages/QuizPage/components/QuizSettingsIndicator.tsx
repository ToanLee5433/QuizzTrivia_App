/**
 * 🎯 Quiz Settings Indicator
 * 
 * Hiển thị settings đang được áp dụng trong quiz
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X } from 'lucide-react';
import { QuizSettings } from '../hooks/useQuizSettings';

interface QuizSettingsIndicatorProps {
  settings: QuizSettings;
  questionsCount?: number; // Optional for now
}

const QuizSettingsIndicator: React.FC<QuizSettingsIndicatorProps> = ({ 
  settings
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTimeLabel = (seconds: number) => {
    if (seconds === 0) return 'Không giới hạn';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const activeSettings = [
    settings.shuffleQuestions && { icon: '🎲', label: 'Câu hỏi đã trộn' },
    settings.shuffleAnswers && { icon: '🔀', label: 'Đáp án đã trộn' },
    settings.timePerQuestion > 0 && { 
      icon: '⏱️', 
      label: `${getTimeLabel(settings.timePerQuestion)}/câu` 
    },
    settings.autoSubmit && { icon: '⚡', label: 'Tự động nộp' },
    settings.soundEffects && { icon: '🔊', label: 'Âm thanh' }
  ].filter(Boolean) as Array<{ icon: string; label: string }>;

  if (activeSettings.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 max-w-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Cài đặt đang áp dụng
                </h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-2">
              {activeSettings.map((setting, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg"
                >
                  <span className="text-lg">{setting.icon}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {setting.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            <div className="flex items-center gap-1 pr-1">
              {activeSettings.slice(0, 3).map((setting, index) => (
                <span key={index} className="text-sm">
                  {setting.icon}
                </span>
              ))}
              {activeSettings.length > 3 && (
                <span className="text-xs font-semibold ml-1">
                  +{activeSettings.length - 3}
                </span>
              )}
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuizSettingsIndicator;
