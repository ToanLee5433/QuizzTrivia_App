import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MultiplayerManager from '../components/MultiplayerManager';

interface LocationState {
  selectedQuiz?: any;
}

const MultiplayerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  const { user } = useSelector((state: any) => state.auth);
  
  if (!user) {
    navigate('/login');
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <MultiplayerManager 
        selectedQuiz={state?.selectedQuiz}
        currentUserId={user.uid}
        currentUserName={user.displayName || user.email || 'User'}
        onBackToQuizSelection={() => navigate('/quizzes')}
        onQuizComplete={() => navigate('/leaderboard')}
      />
    </div>
  );
};

export default MultiplayerPage;
