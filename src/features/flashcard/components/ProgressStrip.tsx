/**
 * ProgressStrip Component
 * Visual progress indicator showing review results
 */

import { useTranslation } from 'react-i18next';
import { ReviewQuality } from '../types/flashcard';
import type { ProgressStripProps } from '../types/flashcard';

export function ProgressStrip({
  current,
  total,
  results
}: ProgressStripProps) {
  const { t } = useTranslation();
  
  // Calculate progress percentage
  const progress = total > 0 ? (current / total) * 100 : 0;
  
  // Count results by quality
  const counts = {
    forgot: results.filter(r => r.quality === ReviewQuality.FORGOT).length,
    hard: results.filter(r => r.quality === ReviewQuality.HARD).length,
    good: results.filter(r => r.quality === ReviewQuality.GOOD).length,
    easy: results.filter(r => r.quality === ReviewQuality.EASY).length
  };
  
  return (
    <div className="w-full">
      {/* Progress Text */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
        <span>{t('flashcard.study.progress')}</span>
        <span className="font-medium">{current} / {total}</span>
      </div>
      
      {/* Progress Bar */}
      <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        
        {/* Result dots */}
        <div className="absolute inset-0 flex items-center justify-start px-1">
          {results.map((result, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full mx-0.5 ${
                result.quality === ReviewQuality.FORGOT ? 'bg-red-500' :
                result.quality === ReviewQuality.HARD ? 'bg-orange-500' :
                result.quality === ReviewQuality.GOOD ? 'bg-blue-500' :
                'bg-green-500'
              }`}
              title={
                result.quality === ReviewQuality.FORGOT ? t('flashcard.study.forgot') :
                result.quality === ReviewQuality.HARD ? t('flashcard.study.hard') :
                result.quality === ReviewQuality.GOOD ? t('flashcard.study.good') :
                t('flashcard.study.easy')
              }
            />
          ))}
        </div>
      </div>
      
      {/* Result Counts */}
      {results.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
          {counts.forgot > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span>{counts.forgot}</span>
            </div>
          )}
          {counts.hard > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded-full" />
              <span>{counts.hard}</span>
            </div>
          )}
          {counts.good > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span>{counts.good}</span>
            </div>
          )}
          {counts.easy > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>{counts.easy}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProgressStrip;
