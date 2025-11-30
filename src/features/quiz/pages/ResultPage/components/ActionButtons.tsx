import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Quiz } from '../../../types';
import Button from '../../../../../shared/components/ui/Button';
import { toast } from 'react-toastify';

interface ActionButtonsProps {
  quiz: Quiz;
  percentage: number;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ quiz, percentage }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleRetakeQuiz = () => {
    // Force re-mount by adding timestamp to URL state
    navigate(`/quiz/${quiz.id}`, { 
      replace: true,
      state: { retakeTimestamp: Date.now() }
    });
  };

  const handleShareResult = () => {
    navigator.clipboard.writeText(
      `I scored ${percentage}% on "${quiz.title}" quiz! 🎯`
    );
    toast.success(t('quiz.result_copied', 'Result copied to clipboard!'));
  };

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      <Button
        onClick={handleRetakeQuiz}
        className="bg-blue-600 hover:bg-blue-700"
      >
        🔄 {t('quiz.retake_quiz', 'Retake Quiz')}
      </Button>


      <Button
        onClick={() => {
          console.log('📚 Navigating to /quizzes...');
          navigate('/quizzes');
        }}
        variant="outline"
      >
        📚 {t('quiz.view_more_quizzes', 'View More Quizzes')}
      </Button>
      
      <Button
        onClick={() => navigate('/dashboard')}
        variant="outline"
      >
        🏠 {t('quiz.back_to_dashboard', 'Back to Dashboard')}
      </Button>
      
      <Button
        variant="outline"
        onClick={handleShareResult}
      >
        📤 {t('quiz.share_result', 'Share Result')}
      </Button>
      
      <Button
        onClick={() => navigate('/profile')}
        variant="outline"
      >
        👤 {t('quiz.view_all_results', 'View All Results')}
      </Button>
    </div>
  );
};
