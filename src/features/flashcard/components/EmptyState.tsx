/**
 * EmptyState Component
 * Reusable empty state for various scenarios
 */

import { useTranslation } from 'react-i18next';
import type { EmptyStateProps } from '../types/flashcard';

export function EmptyState({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  icon
}: EmptyStateProps) {
  const { t } = useTranslation();
  
  // Default content based on variant
  const defaults = {
    noDecks: {
      title: t('flashcard.empty.noDecks'),
      description: t('flashcard.empty.noDecksDesc'),
      actionLabel: t('flashcard.createDeck'),
      icon: (
        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    noCards: {
      title: t('flashcard.empty.noCards'),
      description: t('flashcard.empty.noCardsDesc'),
      actionLabel: t('flashcard.card.add'),
      icon: (
        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    },
    noResults: {
      title: t('flashcard.empty.noResults'),
      description: t('flashcard.empty.noResultsDesc'),
      actionLabel: undefined,
      icon: (
        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    noDue: {
      title: t('flashcard.empty.noDue'),
      description: t('flashcard.empty.noDueDesc'),
      actionLabel: undefined,
      icon: (
        <svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };
  
  const config = defaults[variant];
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Icon */}
      <div className="mb-4">
        {icon || config.icon}
      </div>
      
      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title || config.title}
      </h3>
      
      {/* Description */}
      {(description || config.description) && (
        <p className="text-sm text-gray-600 max-w-md mb-6">
          {description || config.description}
        </p>
      )}
      
      {/* Action button */}
      {onAction && (actionLabel || config.actionLabel) && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {actionLabel || config.actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
