import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MultiplayerManager from './MultiplayerManager';

const MultiplayerGameSimple: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state: any) => state.auth);
  
  if (!user) {
    navigate('/login');
    return null;
  }
  
  if (!roomId) {
    navigate('/multiplayer');
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

export default MultiplayerGameSimple;