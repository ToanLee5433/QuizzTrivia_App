import React from 'react';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  percentage: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  current, 
  total, 
  percentage
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">Tiến độ</span>
        <span className="text-sm font-bold text-gray-900">
          {current} / {total}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
