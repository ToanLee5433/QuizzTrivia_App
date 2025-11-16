import React from 'react';
import { Play, Unlock, Brain, Settings, Lock } from 'lucide-react';

export interface QuizActionsPanelProps {
  /**
   * Whether quiz is locked (password protected)
   */
  isLocked?: boolean;
  
  /**
   * Handler for start/unlock button
   */
  onStart: () => void;
  
  /**
   * Handler for flashcards button
   */
  onFlashcards?: () => void;
  
  /**
   * Handler for settings button
   */
  onSettings?: () => void;
  
  /**
   * Disable flashcards button
   */
  disableFlashcards?: boolean;
  
  /**
   * Disable settings button
   */
  disableSettings?: boolean;
}

/**
 * Quiz actions panel with Start, Flashcards, and Settings buttons
 * Shows lock indicator if quiz is password protected
 */
export const QuizActionsPanel: React.FC<QuizActionsPanelProps> = ({
  isLocked = false,
  onStart,
  onFlashcards,
  onSettings,
  disableFlashcards = false,
  disableSettings = false
}) => {
  const mainButtonClass = isLocked
    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 text-center">
        Ready to Start?
      </h3>
      
      {isLocked && (
        <div className="mb-4 text-center text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/50 rounded-lg">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <span>This quiz is password protected</span>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={onStart}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl ${mainButtonClass}`}
        >
          {isLocked ? <Unlock className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          <span>{isLocked ? 'Unlock Quiz' : 'Start Quiz'}</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onFlashcards}
            disabled={disableFlashcards}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Brain className="w-5 h-5" />
            <span>Flashcards</span>
          </button>
          <button
            onClick={onSettings}
            disabled={disableSettings}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
