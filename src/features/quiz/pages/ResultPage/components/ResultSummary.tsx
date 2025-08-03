import React from 'react';
import { ScoreCircle } from './ScoreCircle';
import { ResultState } from '../types';
import { getPerformanceMessage, formatDetailedTime, safeNumber } from '../utils';

interface ResultSummaryProps {
  result: ResultState;
  percentage: number;
  correct: number;
  total: number;
}

export const ResultSummary: React.FC<ResultSummaryProps> = ({ 
  result, 
  percentage, 
  correct, 
  total 
}) => {
  return (
    <div className="text-center mb-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
        {result.isTimeUp && (
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            ⏰ Time's up! Quiz was automatically submitted.
          </div>
        )}
        <div className="flex flex-col items-center">
          <ScoreCircle score={percentage} />
          <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
            Quiz Completed!
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            {getPerformanceMessage(percentage)}
          </p>
          <div className="text-lg text-gray-700 mb-2">
            You got <span className="font-bold text-blue-600">{correct}</span> out of{' '}
            <span className="font-bold">{total}</span> questions correct
          </div>
          {/* Hiển thị thời gian làm bài - giống y hệt Leaderboard */}
          {typeof result.timeSpent === 'number' && (
            <div className="text-md text-gray-500 mt-2">
              ⏱️ Time taken: <span className="font-semibold text-blue-700">{formatDetailedTime(safeNumber(result.timeSpent))}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
