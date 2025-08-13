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
  
  // Create fallback quiz if none selected
  const selectedQuiz = state?.selectedQuiz || {
    id: 'default-multiplayer-quiz',
    title: 'Default Multiplayer Quiz',
    description: 'A default quiz for multiplayer testing',
    questions: [
      {
        id: 'q1',
        title: 'What is the capital of Vietnam?',
        options: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hue'],
        correct: 1
      },
      {
        id: 'q2', 
        title: 'Which programming language is primarily used for web development?',
        options: ['Python', 'Java', 'JavaScript', 'C++'],
        correct: 2
      },
      {
        id: 'q3',
        title: 'What does HTML stand for?',
        options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlink and Text Markup Language'],
        correct: 0
      }
    ]
  };
  
  console.log('🎮 MultiplayerPage Quiz Data:', {
    hasStateQuiz: !!state?.selectedQuiz,
    selectedQuiz,
    questionsCount: selectedQuiz.questions?.length || 0
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
