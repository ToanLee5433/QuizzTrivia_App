/**
 * 🎯 GAME COORDINATOR
 * Routes to correct view based on player role and game state
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Loader2 } from 'lucide-react';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import PlayerGameView from './PlayerGameView';
import SpectatorGameView from './SpectatorGameView';
import HostGameView from './HostGameView';
import { GameState, RTDB_PATHS } from '../../types/game.types';
import { gameEngine } from '../../services/gameEngine';

interface GameCoordinatorProps {
  roomId: string;
  currentUserId: string;
  onGameEnd: () => void;
}

const GameCoordinator: React.FC<GameCoordinatorProps> = ({
  roomId,
  currentUserId,
  onGameEnd,
}) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const db = getDatabase();

  // Listen to game state
  useEffect(() => {
    if (!roomId) return;

    const gameRef = ref(db, RTDB_PATHS.games(roomId));
    
    const unsubscribe = onValue(
      gameRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setGameState(data as GameState);
          setIsLoading(false);
          
          // Handle game finished
          if (data.status === 'finished') {
            setTimeout(() => {
              onGameEnd();
            }, 2000);
          }
        } else {
          setError('Game not found');
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Game state listener error:', error);
        setError('Failed to load game');
        setIsLoading(false);
      }
    );

    return () => {
      off(gameRef, 'value', unsubscribe);
    };
  }, [roomId, db, onGameEnd]);

  // Submit answer handler
  const handleAnswerSubmit = async (answer: any) => {
    if (!gameState || !gameState.currentQuestion) return;

    try {
      const player = gameState.players[currentUserId];
      await gameEngine.submitAnswer(
        roomId,
        currentUserId,
        answer,
        player?.activePowerUps || []
      );
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white text-lg">Đang tải trò chơi...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !gameState) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900 to-purple-900">
        <div className="text-center max-w-md p-8 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Lỗi</h2>
          <p className="text-gray-300">{error || 'Không thể tải trò chơi'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all"
          >
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[currentUserId];
  
  if (!currentPlayer) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <p className="text-white text-lg">Không tìm thấy người chơi</p>
        </div>
      </div>
    );
  }

  // Handle different game states
  if (gameState.status === 'lobby' || gameState.status === 'starting') {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {gameState.status === 'starting' ? 'Đang bắt đầu...' : 'Đang chờ...'}
          </h2>
          <p className="text-gray-300">
            {gameState.status === 'starting' 
              ? 'Trò chơi sắp bắt đầu!' 
              : 'Đang chờ host bắt đầu trò chơi'}
          </p>
        </div>
      </div>
    );
  }

  if (gameState.status === 'finished') {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: 2 }}
            className="mb-6"
          >
            <Trophy className="w-24 h-24 text-yellow-400 mx-auto" />
          </motion.div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Trò chơi kết thúc!
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Đang chuyển đến kết quả...
          </p>
        </motion.div>
      </div>
    );
  }

  // No current question
  if (!gameState.currentQuestion) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-white text-lg">Đang tải câu hỏi...</p>
        </div>
      </div>
    );
  }

  // Route to appropriate view based on role
  const isHost = currentPlayer.id === gameState.hostId;
  const role = currentPlayer.role;

  return (
    <AnimatePresence mode="wait">
      {isHost ? (
        <HostGameView
          key="host"
          roomId={roomId}
          player={currentPlayer}
          questionState={gameState.currentQuestion}
          players={gameState.players}
          gameStatus={gameState.status}
          onAnswerSubmit={handleAnswerSubmit}
        />
      ) : role === 'player' ? (
        <PlayerGameView
          key="player"
          roomId={roomId}
          player={currentPlayer}
          questionState={gameState.currentQuestion}
          onAnswerSubmit={handleAnswerSubmit}
        />
      ) : (
        <SpectatorGameView
          key="spectator"
          roomId={roomId}
          questionState={gameState.currentQuestion}
          players={gameState.players}
        />
      )}
    </AnimatePresence>
  );
};

export default GameCoordinator;
