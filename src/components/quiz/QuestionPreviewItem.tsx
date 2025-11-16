import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { QuizTag } from './QuizTag';

// Component-level translation hook
const useQuestionTranslation = () => {
  const { t } = useTranslation();
  return t;
};

export interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionPreviewItemProps {
  /**
   * Question number/index
   */
  questionNumber: number;
  
  /**
   * Question title/text
   */
  title: string;
  
  /**
   * Question type (multiple, boolean, short_answer, etc.)
   */
  type: string;
  
  /**
   * Difficulty level
   */
  difficulty: 'easy' | 'medium' | 'hard';
  
  /**
   * Points awarded
   */
  points: number;
  
  /**
   * List of answers
   */
  answers?: Answer[];
  
  /**
   * Optional explanation text
   */
  explanation?: string;
  
  /**
   * Initially expanded state
   */
  defaultExpanded?: boolean;
}

/**
 * Question preview item with expandable details
 * Shows question metadata and answer choices
 */
export const QuestionPreviewItem: React.FC<QuestionPreviewItemProps> = ({
  questionNumber,
  title,
  type,
  difficulty,
  points,
  answers = [],
  explanation,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const t = useQuestionTranslation();

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'easy':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
      case 'medium':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
      case 'hard':
        return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getTypeLabel = () => {
    const types: Record<string, string> = {
      multiple: 'Multiple Choice',
      boolean: 'True/False',
      short_answer: 'Short Answer',
      checkbox: 'Multiple Select'
    };
    return types[type] || type;
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                #{questionNumber}
              </span>
              <QuizTag label={getTypeLabel()} variant="tag" />
              <QuizTag 
                label={difficulty} 
                variant="difficulty" 
                colorClass={getDifficultyColor()}
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {points} {t('common.points', 'points')}
              </span>
            </div>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white">
              {title || 'Untitled Question'}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <span>{isExpanded ? 'Hide details' : 'Show details'}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50">
          {answers.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t('quiz.answerChoices', 'Answer Choices')}:
              </p>
              <div className="space-y-2">
                {answers.map((answer) => (
                  <div
                    key={answer.id}
                    className={`flex items-start gap-2 p-3 rounded-lg border ${
                      answer.isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {answer.isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {answer.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {explanation && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                {t('quiz.explanation', 'Explanation')}:
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
