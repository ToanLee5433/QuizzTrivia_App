import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Quiz } from '../../../types';
import Button from '../../../../../shared/components/ui/Button';
import { toast } from 'react-toastify';

interface ActionButtonsProps {
  quiz: Quiz;
  percentage: number;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ quiz, percentage }) => {
  const navigate = useNavigate();

  const handleShareResult = () => {
    navigator.clipboard.writeText(
      `I scored ${percentage}% on "${quiz.title}" quiz! 🎯`
    );
    toast.success('Result copied to clipboard!');
  };

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      <Button
        onClick={() => navigate(`/quiz/${quiz.id}`)}
        className="bg-blue-600 hover:bg-blue-700"
      >
        🔄 Làm lại Quiz
      </Button>


      <Button
        onClick={() => {
          console.log('📚 Navigating to /quizzes...');
          navigate('/quizzes');
        }}
        variant="outline"
      >
        📚 Xem thêm Quiz
      </Button>
      
      <Button
        onClick={() => navigate('/dashboard')}
        variant="outline"
      >
        🏠 Về Dashboard
      </Button>
      
      <Button
        variant="outline"
        onClick={handleShareResult}
      >
        📤 Chia sẻ kết quả
      </Button>
      
      <Button
        onClick={() => navigate('/profile')}
        variant="outline"
      >
        👤 Xem tất cả kết quả
      </Button>
    </div>
  );
};
