import React from 'react';
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
  return (
    <div className="grid grid-cols-5 gap-2.5">
      {questions.map((question, index) => {
        const answerValue = answers[question.id];
        const isAnswered = isAnswerProvided(answerValue);
        const isCurrent = index === currentQuestionIndex;
        
        return (
          <button
            key={question.id}
            onClick={() => onQuestionSelect(index)}
            className={`
              w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center
              transition-all duration-200 shadow-sm
              ${isCurrent 
                ? 'bg-blue-600 text-white shadow-blue-200 ring-2 ring-blue-100 scale-105 z-10' 
                : isAnswered
                  ? 'bg-emerald-500 text-white shadow-emerald-100 hover:bg-emerald-600'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
              }
            `}
            title={`Câu hỏi ${index + 1}${isAnswered ? ' (Đã làm)' : ''}`}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
};

export default QuickNavigation;
