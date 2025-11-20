import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MultiplayerManager from '../components/MultiplayerManager';
import MultiplayerErrorBoundary from '../components/MultiplayerErrorBoundary';
import { logger } from '../utils/logger';

interface LocationState {
  selectedQuiz?: any;
}

const MultiplayerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  const searchParams = new URLSearchParams(location.search);
  // ✅ Get room code from URL (for join links)
  const initialRoomCode = searchParams.get('code') || undefined;
  const { user } = useSelector((state: any) => state.auth);
  
  // Use useEffect for navigation to avoid React warnings
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Quiz is now optional - can be selected inside multiplayer
    const selectedQuiz = state?.selectedQuiz;
    
    if (selectedQuiz) {
      // Validate quiz if provided
      if (!selectedQuiz.questions || selectedQuiz.questions.length === 0) {
        logger.error('Selected quiz has no questions!');
        navigate('/quizzes', { 
          state: { 
            error: 'Selected quiz has no questions. Please choose a different quiz.' 
          } 
        });
        return;
      }
      
      logger.debug('MultiplayerPage Real Quiz Data', {
        quizId: selectedQuiz.id,
        quizTitle: selectedQuiz.title,
        questionsCount: selectedQuiz.questions?.length || 0
      });
    } else {
      logger.debug('No quiz pre-selected - will select inside multiplayer');
    }
  }, [user, state?.selectedQuiz, navigate]);
  
  // Don't render anything if redirecting
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <MultiplayerErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <MultiplayerManager 
          selectedQuiz={state?.selectedQuiz} // Now optional
          currentUserId={user.uid}
          currentUserName={user.displayName || user.email || 'User'}
          currentUserPhoto={user.photoURL || undefined}
          onBackToLobby={() => navigate('/multiplayer')}
          onQuizComplete={() => {
            // Don't auto-redirect - let players see final results
            // navigate('/leaderboard')
          }}
          initialRoomCode={initialRoomCode}
        />
      </div>
    </MultiplayerErrorBoundary>
  );
};

export default MultiplayerPage;
