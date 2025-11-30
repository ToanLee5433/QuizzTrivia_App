/**
 * 🎯 GAME COORDINATOR
 * Routes to correct view based on player role, game mode, and game state
 * Supports both SYNCED and FREE game modes
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { useTranslation } from 'react-i18next';
import PlayerGameView from './PlayerGameView';
import FreeModePlayerView from './FreeModePlayerView';
import FreeModeSpectatorView from './FreeModeSpectatorView';
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
  const { t } = useTranslation('multiplayer');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasCalledGameEnd = useRef(false); // Prevent multiple calls

  const db = getDatabase();

  // ✅ FIX: Handle game end in useEffect, not during render
  useEffect(() => {
    if (gameState?.status === 'finished' && !hasCalledGameEnd.current) {
      hasCalledGameEnd.current = true;
      // Use setTimeout to defer the state update to after render completes
      setTimeout(() => {
        onGameEnd();
      }, 0);
    }
  }, [gameState?.status, onGameEnd]);

  // Listen to game state
  useEffect(() => {
    if (!roomId) return;

    const gameRef = ref(db, RTDB_PATHS.games(roomId));
    
    // ✅ onValue returns unsubscribe function directly
    const unsubscribe = onValue(
      gameRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setGameState(data as GameState);
          setIsLoading(false);
          
          // Game finished is now handled by GameResultsView
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

    // ✅ FIX: Just call the unsubscribe function directly
    return () => {
      unsubscribe();
    };
  }, [roomId, db, onGameEnd]);

  // Submit answer handler
  const handleAnswerSubmit = async (answer: any) => {
    if (!gameState || !gameState.currentQuestion || !gameState.players) return;

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
          <p className="text-white text-lg">{t('coordinator.loadingGame')}</p>
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
          <h2 className="text-2xl font-bold text-white mb-2">{t('coordinator.error')}</h2>
          <p className="text-gray-300">{error || t('coordinator.cannotLoadGame')}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all"
          >
            {t('coordinator.reload')}
          </button>
        </div>
      </div>
    );
  }

  // Check if players data is available yet
  if (!gameState.players) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white text-lg">{t('coordinator.loadingPlayerData')}</p>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[currentUserId];
  
  if (!currentPlayer) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <p className="text-white text-lg">{t('coordinator.playerNotFound')}</p>
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
            {gameState.status === 'starting' ? t('coordinator.starting') : t('coordinator.waiting')}
          </h2>
          <p className="text-gray-300">
            {gameState.status === 'starting' 
              ? t('coordinator.gameStartingSoon') 
              : t('coordinator.waitingForHost')}
          </p>
        </div>
      </div>
    );
  }

  if (gameState.status === 'finished') {
    // ✅ FIX: Don't call onGameEnd here - it's handled in useEffect above
    // Just show loading while transitioning
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900">
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Loader2 className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-spin" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">🏆 {t('coordinator.finished')}</h2>
          <p className="text-gray-300">{t('coordinator.loadingResults')}</p>
        </div>
      </div>
    );
  }

  // Get game mode
  const gameMode = gameState.settings?.gameMode || 'synced';
  
  // 🆓 FREE MODE: Different view logic
  if (gameMode === 'free') {
    const isHost = currentPlayer.id === gameState.hostId;
    const role = currentPlayer.role;

    // Free mode doesn't use currentQuestion - each player has their own progress
    return (
      <AnimatePresence mode="wait">
        {isHost ? (
          // Host in free mode sees Race Track overview of all players
          <FreeModeSpectatorView
            key="host-free"
            roomId={roomId}
            gameState={gameState}
            players={gameState.players}
            leaderboard={gameState.leaderboard}
            gameStatus={gameState.status}
          />
        ) : role === 'player' ? (
          // Player in free mode gets individual view
          <FreeModePlayerView
            key="player-free"
            roomId={roomId}
            player={currentPlayer}
            gameState={gameState}
            gameStatus={gameState.status}
          />
        ) : (
          // Spectator sees Race Track with rolling leaderboard
          <FreeModeSpectatorView
            key="spectator-free"
            roomId={roomId}
            gameState={gameState}
            players={gameState.players}
            leaderboard={gameState.leaderboard}
            gameStatus={gameState.status}
          />
        )}
      </AnimatePresence>
    );
  }

  // 🔄 SYNCED MODE: Original logic
  // No current question in synced mode
  if (!gameState.currentQuestion) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-white text-lg">{t('coordinator.loadingQuestion')}</p>
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
          gameStatus={gameState.status}
          onAnswerSubmit={handleAnswerSubmit}
        />
      ) : (
        <SpectatorGameView
          key="spectator"
          roomId={roomId}
          questionState={gameState.currentQuestion}
          players={gameState.players}
          gameStatus={gameState.status}
        />
      )}
    </AnimatePresence>
  );
};

export default GameCoordinator;

