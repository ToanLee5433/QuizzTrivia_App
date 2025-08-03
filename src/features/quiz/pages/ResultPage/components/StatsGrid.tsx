import React from 'react';

interface StatsGridProps {
  correct: number;
  total: number;
  percentage: number;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ correct, total, percentage }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <div className="text-3xl font-bold text-green-600 mb-2">{correct}</div>
        <div className="text-gray-600">Correct Answers</div>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <div className="text-3xl font-bold text-red-600 mb-2">{total - correct}</div>
        <div className="text-gray-600">Incorrect Answers</div>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <div className="text-3xl font-bold text-blue-600 mb-2">{percentage}%</div>
        <div className="text-gray-600">Final Score</div>
      </div>
    </div>
  );
};
