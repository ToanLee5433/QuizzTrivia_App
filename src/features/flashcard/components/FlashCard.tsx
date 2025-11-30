/**
 * FlashCard Component
 * 3D flip card with front/back content and media support
 */

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import type { FlashCardProps } from '../types/flashcard';

export function FlashCard({
  card,
  flipped,
  onFlip,
  showMedia = true
}: FlashCardProps) {
  const { t } = useTranslation();

  // Keyboard shortcuts: Space or Enter to flip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onFlip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFlip]);
  
  return (
    <div className="w-full max-w-2xl mx-auto perspective-1000">
      <motion.div
        className="relative w-full min-h-[320px] md:min-h-[384px] cursor-pointer preserve-3d"
        onClick={onFlip}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ 
          duration: 0.4, 
          type: 'spring',
          stiffness: 100,
          damping: 15
        }}
        style={{
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Front Side */}
        <motion.div
          className="absolute inset-0 w-full h-full backface-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          <div className="w-full h-full bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col items-center justify-center border-2 border-gray-200 overflow-y-auto">
            {/* Front Media */}
            {showMedia && card.frontMedia && (
              <div className="mb-6 w-full">
                {card.frontMedia.type === 'image' ? (
                  <img
                    src={card.frontMedia.url}
                    alt={t('flashcard.card.frontImage')}
                    className="max-w-full max-h-32 rounded-lg object-contain"
                  />
                ) : card.frontMedia.type === 'video' ? (
                  <video controls className="w-full max-h-40 rounded-lg object-contain">
                    <source src={card.frontMedia.url} />
                    {t('flashcard.card.videoNotSupported')}
                  </video>
                ) : (
                  <audio controls className="w-full">
                    <source src={card.frontMedia.url} />
                    {t('flashcard.card.audioNotSupported')}
                  </audio>
                )}
              </div>
            )}
            
            {/* Front Text */}
            <div className="text-center text-xl font-medium text-gray-800 mb-6">
              {card.front}
            </div>
            
            {/* Flip Hint */}
            <div className="absolute bottom-4 md:bottom-6 left-0 right-0 text-center">
              <div className="inline-flex items-center gap-2 text-xs md:text-sm text-gray-500 bg-gray-100 px-3 md:px-4 py-1.5 md:py-2 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('flashcard.card.clickToFlip')} <span className="hidden sm:inline text-gray-400">(Space)</span>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Back Side */}
        <motion.div
          className="absolute inset-0 w-full h-full backface-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl p-6 md:p-8 flex flex-col items-center justify-center border-2 border-blue-400 overflow-y-auto">
            {/* Back Media */}
            {showMedia && card.backMedia && (
              <div className="mb-6 w-full">
                {card.backMedia.type === 'image' ? (
                  <img
                    src={card.backMedia.url}
                    alt={t('flashcard.card.backImage')}
                    className="max-w-full max-h-32 rounded-lg object-contain"
                  />
                ) : card.backMedia.type === 'video' ? (
                  <video controls className="w-full max-h-40 rounded-lg object-contain">
                    <source src={card.backMedia.url} />
                    {t('flashcard.card.videoNotSupported')}
                  </video>
                ) : (
                  <audio controls className="w-full">
                    <source src={card.backMedia.url} />
                    {t('flashcard.card.audioNotSupported')}
                  </audio>
                )}
              </div>
            )}
            
            {/* Back Text */}
            <div className="text-center text-xl font-medium text-white mb-6">
              {card.back}
            </div>
            
            {/* Flip Hint */}
            <div className="absolute bottom-4 md:bottom-6 left-0 right-0 text-center">
              <div className="inline-flex items-center gap-2 text-xs md:text-sm text-white/80 bg-white/20 px-3 md:px-4 py-1.5 md:py-2 rounded-full backdrop-blur-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('flashcard.card.clickToFlip')} <span className="hidden sm:inline text-white/60">(Space)</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default FlashCard;
