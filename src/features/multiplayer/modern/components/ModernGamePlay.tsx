/**
 * 🎮 MODERN GAME PLAY
 * Main game component that routes to appropriate view based on player role
 * Uses new GameCoordinator and GameEngine
 */

import React from 'react';
import GameCoordinator from './game/GameCoordinator';

interface ModernGamePlayProps {
  roomId: string;
  currentUserId: string;
  onGameEnd: () => void;
}

/**
 * Modern Game Play Component
 * 
 * This component delegates all game logic to the GameCoordinator,
 * which handles:
 * - Role detection (Player/Spectator/Host)
 * - View routing
 * - Real-time game state management
 * - Answer submission
 * - Game end handling
 */
const ModernGamePlay: React.FC<ModernGamePlayProps> = ({
  roomId,
  currentUserId,
  onGameEnd,
}) => {
  return (
    <GameCoordinator
      roomId={roomId}
      currentUserId={currentUserId}
      onGameEnd={onGameEnd}
    />
  );
};

export default ModernGamePlay;
