import React, { useState, useEffect } from 'react';
import GameModeSelector from './GameModeSelector';
import { CreateRoomModal } from './CreateRoomModal';
import { JoinRoomModal } from './JoinRoomModal';
import { RoomLobby } from './RoomLobby';
import { MultiplayerQuiz } from './MultiplayerQuiz';
import { getMultiplayerService } from '../services/enhancedMultiplayerService';
import { Room, Player, Quiz, RoomConfig, ChatMessage, GameMode } from '../types';

interface MultiplayerManagerProps {
  selectedQuiz?: Quiz;
  currentUserId: string;
  currentUserName: string;
  onBackToQuizSelection?: () => void;
  onQuizComplete?: (results: any) => void;
}

type GameState = 'mode-selection' | 'creating-room' | 'joining-room' | 'lobby' | 'playing' | 'finished';

export const MultiplayerManager: React.FC<MultiplayerManagerProps> = ({
  selectedQuiz,
  currentUserId,
  currentUserName,
  onBackToQuizSelection,
  onQuizComplete
}) => {
  const [gameState, setGameState] = useState<GameState>('mode-selection');
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const multiplayerService = getMultiplayerService();

  // Initialize connection
  useEffect(() => {
    const connectToService = async () => {
      try {
        await multiplayerService.connect(currentUserId, currentUserName);
        setIsConnected(true);
        
        // Set up event listeners
        multiplayerService.on('room:update', (data) => {
          setRoom(data.room);
        });
        
        multiplayerService.on('player:update', (data) => {
          setPlayers(prev => prev.map(p => p.id === data.player.id ? data.player : p));
        });
        
        multiplayerService.on('chat:message', (data) => {
          setMessages(prev => [...prev, data.message]);
        });
        
        multiplayerService.on('game:start', () => {
          setGameState('playing');
        });
        
        multiplayerService.on('game:finish', () => {
          setGameState('finished');
        });
        
        multiplayerService.on('error', (data) => {
          setError(data.message);
        });
        
      } catch (error) {
        console.error('Failed to connect to multiplayer service:', error);
        setError('Failed to connect to multiplayer service');
      }
    };

    connectToService();

    return () => {
      multiplayerService.disconnect();
    };
  }, [currentUserId, currentUserName]);

  const handleGameModeSelect = (mode: GameMode) => {
    if (mode === 'single') {
      // Handle single player mode
      onBackToQuizSelection?.();
    } else {
      // For multiplayer, show create/join choice by staying in mode selection
      // The GameModeSelector component will show both options
    }
  };

  const handleCreateRoom = () => {
    setGameState('creating-room');
  };

  const handleJoinRoom = () => {
    setGameState('joining-room');
  };

  const handleRoomCreated = async (roomConfig: RoomConfig) => {
    if (!selectedQuiz) {
      setError('No quiz selected');
      return;
    }

    try {
      const response = await multiplayerService.createRoom(roomConfig, selectedQuiz);
      setRoom(response.room);
      setCurrentPlayer(response.player);
      setPlayers([response.player]);
      setGameState('lobby');
    } catch (error) {
      console.error('Failed to create room:', error);
      setError('Failed to create room');
    }
  };

  const handleRoomJoined = async (roomId: string, password?: string) => {
    try {
      const response = await multiplayerService.joinRoom(roomId, password);
      setRoom(response.room);
      setPlayers(response.players);
      setCurrentPlayer(response.player);
      setGameState('lobby');
    } catch (error) {
      console.error('Failed to join room:', error);
      setError('Failed to join room');
    }
  };

  const handleStartGame = async () => {
    if (!room) return;
    
    try {
      await multiplayerService.startGame(room.id);
      // Game state will be updated via WebSocket event
    } catch (error) {
      console.error('Failed to start game:', error);
      setError('Failed to start game');
    }
  };

  const handleLeaveRoom = async () => {
    if (!room) return;
    
    try {
      await multiplayerService.leaveRoom(room.id);
      setRoom(null);
      setPlayers([]);
      setCurrentPlayer(null);
      setMessages([]);
      setGameState('mode-selection');
    } catch (error) {
      console.error('Failed to leave room:', error);
      setError('Failed to leave room');
    }
  };

  const handleKickPlayer = async (playerId: string) => {
    if (!room) return;
    
    try {
      await multiplayerService.kickPlayer(room.id, playerId);
    } catch (error) {
      console.error('Failed to kick player:', error);
      setError('Failed to kick player');
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!room) return;
    
    try {
      await multiplayerService.sendChatMessage(room.id, message);
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
    }
  };

  const handleAnswerSubmit = async (questionId: string, selectedAnswer: string, timeRemaining: number) => {
    try {
      await multiplayerService.submitAnswer(questionId, selectedAnswer, timeRemaining);
    } catch (error) {
      console.error('Failed to submit answer:', error);
      setError('Failed to submit answer');
    }
  };

  const handleQuizComplete = () => {
    setGameState('finished');
    onQuizComplete?.({
      room,
      players,
      currentPlayer
    });
  };

  const resetToModeSelection = () => {
    setGameState('mode-selection');
    setError(null);
  };

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-red-500/10 border border-red-400/20 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={resetToModeSelection}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Try Again
              </button>
              {onBackToQuizSelection && (
                <button
                  onClick={onBackToQuizSelection}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Back to Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while connecting
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Connecting to multiplayer service...</p>
        </div>
      </div>
    );
  }

  // Render appropriate component based on game state
  switch (gameState) {
    case 'mode-selection':
      return (
        <GameModeSelector
          isOpen={true}
          onClose={() => onBackToQuizSelection?.()}
          onSelectSinglePlayer={() => handleGameModeSelect('single')}
          onSelectMultiplayer={() => handleGameModeSelect('multiplayer')}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      );

    case 'creating-room':
      return (
        <CreateRoomModal
          isOpen={true}
          onClose={resetToModeSelection}
          onCreateRoom={handleRoomCreated}
          selectedQuiz={selectedQuiz ? {
            id: selectedQuiz.id,
            title: selectedQuiz.title,
            category: selectedQuiz.category,
            questionCount: selectedQuiz.questions.length
          } : undefined}
        />
      );

    case 'joining-room':
      return (
        <JoinRoomModal
          isOpen={true}
          onClose={resetToModeSelection}
          onJoinRoom={handleRoomJoined}
        />
      );

    case 'lobby':
      if (!room || !selectedQuiz) return null;
      
      return (
        <RoomLobby
          room={room}
          players={players}
          currentUserId={currentUserId}
          quiz={{
            title: selectedQuiz.title,
            category: selectedQuiz.category,
            questionCount: selectedQuiz.questions.length
          }}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
          onKickPlayer={handleKickPlayer}
          onSendMessage={handleSendMessage}
          messages={messages}
        />
      );

    case 'playing':
      if (!room || !selectedQuiz) return null;
      
      return (
        <MultiplayerQuiz
          room={room}
          quiz={selectedQuiz}
          players={players}
          currentUserId={currentUserId}
          onAnswerSubmit={handleAnswerSubmit}
          onQuizComplete={handleQuizComplete}
        />
      );

    case 'finished':
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
          <div className="max-w-md w-full mx-auto p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Game Complete!</h1>
            <p className="text-gray-400 mb-6">Thanks for playing!</p>
            <div className="flex gap-3">
              <button
                onClick={resetToModeSelection}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Play Again
              </button>
              {onBackToQuizSelection && (
                <button
                  onClick={onBackToQuizSelection}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Back to Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};
