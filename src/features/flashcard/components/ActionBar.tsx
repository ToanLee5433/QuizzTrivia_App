/**
 * ActionBar Component
 * Review action buttons with keyboard shortcuts
 */

import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import type { ActionBarProps } from '../types/flashcard';

export function ActionBar({
  onForgot,
  onHard,
  onGood,
  onEasy,
  disabled = false
}: ActionBarProps) {
  const { t } = useTranslation();
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (disabled) return;
      
      switch (e.key) {
        case '1':
          onForgot();
          break;
        case '2':
          onHard();
          break;
        case '3':
          onGood();
          break;
        case '4':
          onEasy();
          break;
      }
    };
    
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [onForgot, onHard, onGood, onEasy, disabled]);
  
  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      {/* Instructions */}
      <div className="text-center text-sm text-gray-600 mb-4">
        {t('flashcard.study.rateYourRecall')}
      </div>
      
      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Forgot */}
        <button
          onClick={onForgot}
          disabled={disabled}
          className="group relative px-6 py-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <div className="flex flex-col items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>{t('flashcard.study.forgot')}</span>
            <span className="text-xs opacity-80">({t('flashcard.study.key')} 1)</span>
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {t('flashcard.study.forgotTooltip')}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </button>
        
        {/* Hard */}
        <button
          onClick={onHard}
          disabled={disabled}
          className="group relative px-6 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <div className="flex flex-col items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{t('flashcard.study.hard')}</span>
            <span className="text-xs opacity-80">({t('flashcard.study.key')} 2)</span>
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {t('flashcard.study.hardTooltip')}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </button>
        
        {/* Good */}
        <button
          onClick={onGood}
          disabled={disabled}
          className="group relative px-6 py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <div className="flex flex-col items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{t('flashcard.study.good')}</span>
            <span className="text-xs opacity-80">({t('flashcard.study.key')} 3)</span>
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {t('flashcard.study.goodTooltip')}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </button>
        
        {/* Easy */}
        <button
          onClick={onEasy}
          disabled={disabled}
          className="group relative px-6 py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <div className="flex flex-col items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{t('flashcard.study.easy')}</span>
            <span className="text-xs opacity-80">({t('flashcard.study.key')} 4)</span>
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {t('flashcard.study.easyTooltip')}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </button>
      </div>
      
      {/* Help Text */}
      <div className="text-center text-xs text-gray-500 mt-4">
        {t('flashcard.study.keyboardShortcuts')}
      </div>
    </div>
  );
}

export default ActionBar;
