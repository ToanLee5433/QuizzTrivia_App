import React from 'react';
import { Question } from '../../../types';

interface QuickNavigationProps {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, any>;
  onQuestionSelect: (index: number) => void;
}

const QuickNavigation: React.FC<QuickNavigationProps> = ({
  questions,
  currentQuestionIndex,
  answers,
  onQuestionSelect,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-sm font-medium text-gray-600 mb-3">Điều hướng nhanh</h3>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((question, index) => (
          <button
            key={question.id}
            onClick={() => onQuestionSelect(index)}
            className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
              index === currentQuestionIndex
                ? 'bg-blue-500 text-white'
                : answers[question.id]
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickNavigation;
