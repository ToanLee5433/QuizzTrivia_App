import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Question, AnswerMap } from '../../../types';
import { isAnswerProvided } from '../utils';

interface QuickNavigationProps {
  questions: Question[];
  currentQuestionIndex: number;
  answers: AnswerMap;
  onQuestionSelect: (index: number) => void;
}

const QuickNavigation: React.FC<QuickNavigationProps> = ({
  questions,
  currentQuestionIndex,
  answers,
  onQuestionSelect,
}) => {
  const { t } = useTranslation();

  const heading = useMemo(() => t('quiz.quickNavigation.heading', 'Điều hướng nhanh'), [t]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-sm font-medium text-gray-600 mb-3">{heading}</h3>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((question, index) => {
          const answerValue = answers[question.id];
          const isAnswered = isAnswerProvided(answerValue);
          return (
            <button
              key={question.id}
              onClick={() => onQuestionSelect(index)}
              className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                index === currentQuestionIndex
                  ? 'bg-blue-500 text-white'
                  : isAnswered
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickNavigation;
