/**
 * SessionHeader Component
 * Header for study session with stats and controls
 */

import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import type { SessionHeaderProps } from '../types/flashcard';

export function SessionHeader({
  deckTitle,
  coverImage,
  cardsRemaining,
  totalCards,
  elapsedTime,
  onPause,
  onExit
}: SessionHeaderProps & { coverImage?: string }) {
  const { t } = useTranslation();
  const [displayTime, setDisplayTime] = useState(0);
  
  useEffect(() => {
    setDisplayTime(elapsedTime);
    const interval = setInterval(() => {
      setDisplayTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [elapsedTime]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="w-full bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Deck info with optional cover image */}
          <div className="flex-1 flex items-center gap-3">
            {coverImage && (
              <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                <img src={coverImage} alt="Quiz cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 truncate">
                {deckTitle}
              </h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                {cardsRemaining} / {totalCards} {t('flashcard.deck.cards')}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTime(displayTime)}
              </span>
              </div>
            </div>
          </div>
          
          {/* Right: Controls */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={onPause}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('flashcard.study.pause')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={onExit}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title={t('flashcard.study.exit')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionHeader;
