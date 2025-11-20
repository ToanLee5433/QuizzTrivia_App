import React from 'react';
import { useTranslation } from 'react-i18next';

interface StatsGridProps {
  correct: number;
  total: number;
  percentage: number;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ correct, total, percentage }) => {
  const { t } = useTranslation();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <div className="text-3xl font-bold text-green-600 mb-2">{correct}</div>
        <div className="text-gray-600">{t('quiz.result.correctAnswers')}</div>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <div className="text-3xl font-bold text-red-600 mb-2">{total - correct}</div>
        <div className="text-gray-600">{t('quiz.result.incorrectAnswers')}</div>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <div className="text-3xl font-bold text-blue-600 mb-2">{percentage}%</div>
        <div className="text-gray-600">{t('quiz.result.finalScore')}</div>
      </div>
    </div>
  );
};
