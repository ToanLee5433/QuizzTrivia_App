/**
 * DeckCard Component
 * Display card for a flashcard deck with cover, stats, and actions
 */

import { useTranslation } from 'react-i18next';
import type { DeckCardProps } from '../types/flashcard';

export function DeckCard({
  deck,
  progress,
  onClick,
  onEdit,
  onDelete,
  showActions = false
}: DeckCardProps) {
  const { t } = useTranslation();
  
  // Calculate progress percentage
  const progressPercent = progress 
    ? Math.round((progress.totalCardsStudied / deck.cardCount) * 100)
    : 0;
  
  // Calculate due cards
  const dueCards = progress?.dueQueue?.length || 0;
  
  return (
    <div 
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {/* Cover Image */}
      <div className="relative h-40 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
        {deck.coverUrl ? (
          <img 
            src={deck.coverUrl} 
            alt={deck.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <svg 
              className="w-16 h-16 text-white/30" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
              />
            </svg>
          </div>
        )}
        
        {/* Due badge */}
        {dueCards > 0 && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {dueCards} {t('flashcard.deck.due')}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {deck.title}
        </h3>
        
        {/* Description */}
        {deck.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {deck.description}
          </p>
        )}
        
        {/* Tags */}
        {deck.tags && deck.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {deck.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
              >
                #{tag}
              </span>
            ))}
            {deck.tags.length > 3 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{deck.tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            {deck.cardCount} {t('flashcard.deck.cards')}
          </span>
          
          {progress && (
            <span className="font-medium text-blue-600">
              {progressPercent}% {t('flashcard.deck.complete')}
            </span>
          )}
        </div>
        
        {/* Progress Bar */}
        {progress && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
        
        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-3 border-t border-gray-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {t('flashcard.deck.edit')}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="flex-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              {t('flashcard.deck.delete')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DeckCard;
