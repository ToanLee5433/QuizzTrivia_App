/**
 * 🏷️ Citation Badge Component
 * 
 * Displays a clickable citation badge
 */

import { ExternalLink, Book } from 'lucide-react';
import type { Citation } from '../../lib/genkit/types';

interface CitationBadgeProps {
  citation: Citation;
  index: number;
  compact?: boolean;
}

export function CitationBadge({ citation, index, compact = false }: CitationBadgeProps) {
  const handleClick = () => {
    // Handle citation click (e.g., open quiz, scroll to section)
    if (citation.quizId) {
      console.log('Open quiz:', citation.quizId);
      // TODO: Navigate to quiz detail page
      // navigate(`/quiz/${citation.quizId}`);
    } else if (citation.url) {
      window.open(citation.url, '_blank');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
      title={citation.snippet}
    >
      <span className={`font-semibold text-purple-600 dark:text-purple-400 ${compact ? 'text-[10px]' : ''}`}>
        [{index}]
      </span>
      <Book className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-gray-500 dark:text-gray-400`} />
      <span className={`text-gray-700 dark:text-gray-300 truncate ${compact ? 'max-w-[80px]' : 'max-w-[150px]'}`}>
        {citation.title}
      </span>
      {!compact && citation.url && (
        <ExternalLink className="w-3 h-3 text-gray-400" />
      )}
    </button>
  );
}
