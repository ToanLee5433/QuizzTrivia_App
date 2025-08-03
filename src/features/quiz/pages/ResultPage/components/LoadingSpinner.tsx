import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../../../shared/components/ui/Button';

export const LoadingSpinner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading results...</h2>
        <Button onClick={() => navigate('/quiz-list')}>
          Back to Quiz List
        </Button>
      </div>
    </div>
  );
};
