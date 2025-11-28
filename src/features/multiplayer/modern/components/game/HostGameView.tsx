/**
 * 👑 HOST GAME VIEW
 * Game view for host with controls
 * Can switch between Player and Spectator modes
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Crown, 
  Play, 
  Pause, 
  SkipForward, 
  StopCircle,
  Eye,
  Gamepad2,
  Settings
} from 'lucide-react';
import PlayerGameView from './PlayerGameView';
import SpectatorGameView from './SpectatorGameView';
import { ModernPlayer, QuestionState } from '../../types/game.types';
import { gameEngine } from '../../services/gameEngine';

interface HostGameViewProps {
  roomId: string;
  player: ModernPlayer;
  questionState: QuestionState;
  players: Record<string, ModernPlayer>;
  gameStatus: string;
  onAnswerSubmit: (answer: any) => void;
}

type HostMode = 'player' | 'spectator';

const HostGameView: React.FC<HostGameViewProps> = ({
  roomId,
  player,
  questionState,
  players,
  gameStatus,
  onAnswerSubmit,
}) => {
  const { t } = useTranslation('multiplayer');
  const [hostMode, setHostMode] = useState<HostMode>('spectator');
  const [showControls, setShowControls] = useState(true);

  const handlePauseResume = async () => {
    if (gameStatus === 'paused') {
      await gameEngine.resumeGame(roomId);
    } else {
      await gameEngine.pauseGame(roomId);
    }
  };

  const handleSkipQuestion = async () => {
    // Direct skip without confirmation - instantly go to next question
    await gameEngine.skipQuestion(roomId);
  };

  const handleEndGame = async () => {
    // Direct end without confirmation
    await gameEngine.finishGame(roomId);
  };

  return (
    <div className="relative h-full">
      {/* Main View */}
      <AnimatePresence mode="wait">
        {hostMode === 'player' ? (
          <PlayerGameView
            key="player-view"
            roomId={roomId}
            player={player}
            questionState={questionState}
            gameStatus={gameStatus}
            onAnswerSubmit={onAnswerSubmit}
          />
        ) : (
          <SpectatorGameView
            key="spectator-view"
            roomId={roomId}
            questionState={questionState}
            players={players}
            gameStatus={gameStatus}
          />
        )}
      </AnimatePresence>

      {/* Host Control Panel Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-3xl shadow-2xl border-2 border-white/20 backdrop-blur-xl p-2">
              {/* Host Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-yellow-500 rounded-full border-2 border-white shadow-lg">
                <div className="flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-white" />
                  <span className="text-xs font-bold text-white">HOST</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3">
                {/* Mode Toggle */}
                <div className="flex items-center space-x-2 bg-white/10 rounded-2xl p-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setHostMode('spectator')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                      hostMode === 'spectator'
                        ? 'bg-white text-purple-600 font-bold shadow-lg'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">{t('spectatorModeShort', 'Xem')}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setHostMode('player')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                      hostMode === 'player'
                        ? 'bg-white text-purple-600 font-bold shadow-lg'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span className="text-sm">{t('playerModeShort', 'Chơi')}</span>
                  </motion.button>
                </div>

                {/* Divider */}
                <div className="w-px h-10 bg-white/20" />

                {/* Game Controls */}
                <div className="flex items-center space-x-2">
                  {/* Pause/Resume */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handlePauseResume}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all group"
                    title={gameStatus === 'paused' ? t('resumeButton') : t('pauseButton')}
                  >
                    {gameStatus === 'paused' ? (
                      <Play className="w-5 h-5 text-green-400 group-hover:text-green-300" />
                    ) : (
                      <Pause className="w-5 h-5 text-yellow-400 group-hover:text-yellow-300" />
                    )}
                  </motion.button>

                  {/* Skip Question */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSkipQuestion}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all group"
                    title={t('skipButton')}
                  >
                    <SkipForward className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                  </motion.button>

                  {/* End Game */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleEndGame}
                    className="p-3 bg-white/10 hover:bg-red-500/30 rounded-xl transition-all group"
                    title={t('endGame', 'Kết thúc trò chơi')}
                  >
                    <StopCircle className="w-5 h-5 text-red-400 group-hover:text-red-300" />
                  </motion.button>
                </div>

                {/* Divider */}
                <div className="w-px h-10 bg-white/20" />

                {/* Toggle Controls */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowControls(!showControls)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                  title={t('toggleControls', 'Ẩn/Hiện điều khiển')}
                >
                  <Settings className="w-5 h-5 text-white" />
                </motion.button>
              </div>

              {/* Status Indicator */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gray-900 rounded-full border border-white/20">
                <p className="text-xs text-white font-medium">
                  {gameStatus === 'paused' ? `⏸️ ${t('gamePaused')}` : `▶️ ${t('gamePlaying')}`}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button (when controls hidden) */}
      {!showControls && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowControls(true)}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 p-4 bg-purple-600 rounded-full shadow-2xl border-2 border-white/20"
        >
          <Crown className="w-6 h-6 text-white" />
        </motion.button>
      )}
    </div>
  );
};

export default HostGameView;
