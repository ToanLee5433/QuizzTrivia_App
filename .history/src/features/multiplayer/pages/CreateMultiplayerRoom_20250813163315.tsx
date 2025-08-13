import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MultiplayerManager from '../components/MultiplayerManager';

const CreateMultiplayerRoom: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: any) => state.auth);
  
  if (!user) {
    navigate('/login');
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <MultiplayerManager 
        currentUserId={user.uid}
        currentUserName={user.displayName || user.email || 'User'}
        onBackToQuizSelection={() => navigate('/quizzes')}
        onQuizComplete={() => navigate('/leaderboard')}
      />
    </div>
  );
};

export default CreateMultiplayerRoom;