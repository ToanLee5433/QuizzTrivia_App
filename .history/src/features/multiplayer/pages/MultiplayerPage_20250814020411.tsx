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
  const searchParams = new URLSearchParams(location.search);
  const initialRoomId = searchParams.get('roomId') || undefined;
  const { user } = useSelector((state: any) => state.auth);
  
  if (!user) {
    navigate('/login');
    return null;
  }
  
  // Require actual quiz selection - NO fallback
  const selectedQuiz = state?.selectedQuiz;
  
  if (!selectedQuiz) {
    console.error('❌ No quiz selected for multiplayer!');
    navigate('/quizzes', { 
      state: { 
        error: 'Please select a quiz before starting multiplayer game' 
      } 
    });
    return null;
  }
  
  if (!selectedQuiz.questions || selectedQuiz.questions.length === 0) {
    console.error('❌ Selected quiz has no questions!');
    navigate('/quizzes', { 
      state: { 
        error: 'Selected quiz has no questions. Please choose a different quiz.' 
      } 
    });
    return null;
  }
  
  console.log('🎮 MultiplayerPage Real Quiz Data:', {
    quizId: selectedQuiz.id,
    quizTitle: selectedQuiz.title,
    questionsCount: selectedQuiz.questions?.length || 0,
    hasValidQuestions: selectedQuiz.questions?.every((q: any) => q.title && q.options && q.options.length > 0)
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      <MultiplayerManager 
        selectedQuiz={selectedQuiz}
        currentUserId={user.uid}
        currentUserName={user.displayName || user.email || 'User'}
        onBackToQuizSelection={() => navigate('/quizzes')}
        onQuizComplete={() => navigate('/leaderboard')}
        initialRoomId={initialRoomId}
      />
    </div>
  );
};

export default MultiplayerPage;
