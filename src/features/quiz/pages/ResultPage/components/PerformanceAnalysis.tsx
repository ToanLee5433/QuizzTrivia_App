import React from 'react';
import { Quiz } from '../../../types';
import { ResultState } from '../types';

interface PerformanceAnalysisProps {
  quiz: Quiz;
  result: ResultState;
  percentage: number;
}

export const PerformanceAnalysis: React.FC<PerformanceAnalysisProps> = ({ 
  quiz, 
  result, 
  percentage 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Analysis</h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Accuracy Rate</span>
          <div className="flex items-center">
            <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <span className="font-semibold">{percentage}%</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Quiz Difficulty</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            quiz.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
            quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Time Management</span>
          <span className="font-semibold text-green-600">
            {result.isTimeUp ? 'Used full time' : 'Completed early'}
          </span>
        </div>
      </div>
    </div>
  );
};
