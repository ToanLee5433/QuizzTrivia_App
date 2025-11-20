/**
 * Modern Multiplayer Wrapper
 * Integrates modern UI components into existing multiplayer flow
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ref, get } from 'firebase/database';
import { rtdb } from '../../../lib/firebase/config';
import ModernLobby from './modern/ModernLobby';
import ModernQuizGame from './modern/ModernQuizGame';
import FinalPodium from './modern/FinalPodium';
import type { MultiplayerServiceInterface } from '../services/enhancedMultiplayerService';
import powerUpsService from '../services/powerUpsService';
import { logger } from '../utils/logger';

interface ModernMultiplayerWrapperProps {
  roomData: any;
  currentUserId: string;
  currentUserName: string;
  gameData?: any;
  gamePhase: 'lobby' | 'game' | 'results';
  onLeaveRoom: () => void;
  onBackToLobby: () => void;
  multiplayerService?: MultiplayerServiceInterface;
}

const ModernMultiplayerWrapper: React.FC<ModernMultiplayerWrapperProps> = ({
  roomData,
  currentUserId,
  currentUserName,
  gameData,
  gamePhase,
  onLeaveRoom,
  onBackToLobby,
  multiplayerService
}) => {
  const [powerUps, setPowerUps] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [finalLeaderboard, setFinalLeaderboard] = useState<any[]>([]);

  // Determine if current user is host
  useEffect(() => {
    if (roomData && currentUserId) {
      const calculatedIsHost = roomData.hostId === currentUserId;
      setIsHost(calculatedIsHost);
      
      // Debug log
      console.log('🎮 ModernMultiplayerWrapper - Host check:', {
        roomHostId: roomData.hostId,
        currentUserId,
        isHost: calculatedIsHost,
        roomCode: roomData.code
      });
    }
  }, [roomData, currentUserId]);

  // ⚡ Fetch final leaderboard directly from RTDB for results phase
  useEffect(() => {
    if (gamePhase === 'results' && roomData?.code) {
      const fetchFinalLeaderboard = async () => {
        try {
          const leaderboardRef = ref(rtdb, `rooms/${roomData.code}/leaderboard`);
          const snapshot = await get(leaderboardRef);
          const data = snapshot.val();
          
          if (data) {
            const players = Object.values(data) as any[];
            
            // ⚡ Sort by score descending
            players.sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score;
              if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
              return a.username.localeCompare(b.username);
            });
            
            // ⚡ Update ranks
            players.forEach((player, index) => {
              player.rank = index + 1;
            });
            
            logger.success(`🏆 Final leaderboard loaded: ${players.length} players`);
            setFinalLeaderboard(players);
          } else {
            logger.warn('⚠️ No leaderboard data found in RTDB');
            setFinalLeaderboard([]);
          }
        } catch (error) {
          logger.error('Failed to fetch final leaderboard:', error);
        }
      };
      
      fetchFinalLeaderboard();
    }
  }, [gamePhase, roomData?.code]);

  // Initialize power-ups when game starts
  useEffect(() => {
    if (gamePhase === 'game' && roomData?.code && currentUserId && roomData?.settings?.enablePowerUps) {
      powerUpsService.initializePowerUps(roomData.code, currentUserId);

      // Subscribe to power-ups changes
      const unsubscribe = powerUpsService.subscribeToPowerUps(
        roomData.code,
        currentUserId,
        (updatedPowerUps) => {
          if (updatedPowerUps) {
            const powerUpsArray = Object.values(updatedPowerUps).map((pu: any) => ({
              type: pu.type,
              available: pu.available,
              used: pu.used,
              description: getPowerUpDescription(pu.type),
              icon: getPowerUpIcon(pu.type)
            }));
            setPowerUps(powerUpsArray);
          }
        }
      );

      return () => {
        unsubscribe();
      };
    }
  }, [gamePhase, roomData?.code, roomData?.settings?.enablePowerUps, currentUserId]);

  const getPowerUpDescription = (type: string): string => {
    switch (type) {
      case '50-50':
        return 'Eliminate 2 wrong answers';
      case 'x2-score':
        return 'Double your points this question';
      case 'freeze-time':
        return 'Pause the timer for 10 seconds';
      default:
        return '';
    }
  };

  const getPowerUpIcon = (type: string): string => {
    switch (type) {
      case '50-50':
        return '🎯';
      case 'x2-score':
        return '⚡';
      case 'freeze-time':
        return '❄️';
      default:
        return '✨';
    }
  };

  const handleUsePowerUp = async (type: string) => {
    if (!roomData?.code || !currentUserId || !gameData?.currentQuestionIndex) {
      logger.warn('Cannot use power-up: missing data', { 
        roomCode: roomData?.code, 
        userId: currentUserId,
        questionIndex: gameData?.currentQuestionIndex 
      });
      return;
    }

    const success = await powerUpsService.usePowerUp(
      roomData.code,
      currentUserId,
      type as any,
      gameData.currentQuestionIndex
    );

    if (success) {
      logger.info('Power-up used successfully', { type, questionIndex: gameData.currentQuestionIndex });
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (multiplayerService && roomData?.code && gameData?.currentQuestion?.id) {
      const timeRemaining = 0; // This should be tracked from timer
      multiplayerService.submitAnswer(
        roomData.code, 
        gameData.currentQuestion.id,
        optionIndex,
        timeRemaining
      );
    }
  };

  const handlePlayAgain = () => {
    // Reset power-ups and restart game
    if (roomData?.code && currentUserId) {
      powerUpsService.resetPowerUps(roomData.code, currentUserId);
    }
    // Logic for restarting game would be handled by MultiplayerManager
  };

  const handleViewReport = () => {
    // Navigate to quiz report/analytics
    logger.info('View report clicked');
  };

  const handleShareResult = () => {
    // Share result to social media or copy link
    logger.info('Share result clicked');
  };

  // Render based on game phase
  return (
    <AnimatePresence mode="wait">
      {gamePhase === 'lobby' && (
        <ModernLobby
          key="lobby"
          roomData={roomData}
          currentUserId={currentUserId}
          isHost={isHost}
          onLeaveRoom={onLeaveRoom}
          multiplayerService={multiplayerService}
        />
      )}

      {gamePhase === 'game' && gameData && (
        <ModernQuizGame
          key="game"
          question={gameData.currentQuestion || {
            id: '',
            title: '',
            options: [],
            correct: 0
          }}
          questionIndex={gameData.currentQuestionIndex || 0}
          totalQuestions={gameData.totalQuestions || 0}
          timeLimit={roomData?.settings?.timeLimit || 30}
          onAnswer={handleAnswer}
          isAnswered={false} // This should come from game state
          correctAnswer={undefined} // Revealed after answer
          isCorrect={undefined}
          points={0}
          leaderboard={gameData.leaderboard || []}
          currentPlayer={gameData.currentPlayer || {
            id: currentUserId,
            username: currentUserName,
            score: 0,
            correctAnswers: 0,
            rank: 0
          }}
          showIntermediateLeaderboard={roomData?.settings?.showIntermediateLeaderboard || false}
          enablePowerUps={roomData?.settings?.enablePowerUps || false}
          powerUps={powerUps}
          onUsePowerUp={handleUsePowerUp}
        />
      )}

      {gamePhase === 'results' && gameData && (
        <FinalPodium
          key="results"
          players={finalLeaderboard.length > 0 ? finalLeaderboard : (gameData.leaderboard || gameData.finalPlayers || [])}
          currentPlayerId={currentUserId}
          onPlayAgain={handlePlayAgain}
          onViewReport={handleViewReport}
          onShareResult={handleShareResult}
          onBackToLobby={onBackToLobby}
        />
      )}
    </AnimatePresence>
  );
};

export default ModernMultiplayerWrapper;
