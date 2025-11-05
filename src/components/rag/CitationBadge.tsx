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
}

export function CitationBadge({ citation, index }: CitationBadgeProps) {
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
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-xs"
      title={citation.snippet}
    >
      <span className="font-semibold text-purple-600 dark:text-purple-400">
        [{index}]
      </span>
      <Book className="w-3 h-3 text-gray-500 dark:text-gray-400" />
      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
        {citation.title}
      </span>
      {citation.url && (
        <ExternalLink className="w-3 h-3 text-gray-400" />
      )}
    </button>
  );
}
