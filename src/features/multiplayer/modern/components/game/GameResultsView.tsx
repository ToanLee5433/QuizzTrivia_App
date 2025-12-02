/**
 * 🏆 GAME RESULTS VIEW
 * Final leaderboard display when game ends
 * Shows rankings, scores, and stats for all players
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Flame, 
  Target, 
  Clock, 
  TrendingUp,
  Award,
  Home,
  RotateCcw
} from 'lucide-react';
import { LeaderboardEntry, ModernPlayer } from '../../types/game.types';
import { useTranslation } from 'react-i18next';
import { ref, onValue, getDatabase } from 'firebase/database';
import confetti from 'canvas-confetti';
import soundService from '../../../../../services/soundService';
import musicService from '../../../../../services/musicService';

interface GameResultsViewProps {
  roomId: string;
  players: Record<string, ModernPlayer>;
  currentUserId: string;
  onPlayAgain?: () => void;
  onBackToLobby?: () => void;
}

const GameResultsView: React.FC<GameResultsViewProps> = ({
  roomId,
  players,
  currentUserId,
  onPlayAgain,
  onBackToLobby,
}) => {
  const { t } = useTranslation('multiplayer');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  // Listen to final leaderboard
  useEffect(() => {
    const db = getDatabase();
    const leaderboardRef = ref(db, `games/${roomId}/leaderboard`);
    
    const unsubscribe = onValue(leaderboardRef, (snapshot) => {
      const data = snapshot.val();
      if (data && Array.isArray(data)) {
        setLeaderboard(data);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  // Calculate leaderboard from players if not available
  const finalLeaderboard = useMemo(() => {
    if (leaderboard.length > 0) return leaderboard;
    
    return Object.values(players)
      .filter(p => p.role === 'player')
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        rank: index + 1,
        playerId: player.id,
        playerName: player.name,
        photoURL: player.photoURL,
        score: player.score,
        correctAnswers: player.correctAnswers,
        totalAnswers: player.totalAnswers,
        accuracy: player.totalAnswers > 0 ? Math.round((player.correctAnswers / player.totalAnswers) * 100) : 0,
        avgResponseTime: player.avgResponseTime,
        streak: player.streak,
        maxStreak: player.maxStreak,
        rankChange: 0,
        scoreChange: 0,
      }));
  }, [leaderboard, players]);

  // Current player's result
  const currentPlayerResult = useMemo(() => {
    return finalLeaderboard.find(entry => entry.playerId === currentUserId);
  }, [finalLeaderboard, currentUserId]);

  // Top 3 players
  const topThree = useMemo(() => {
    return finalLeaderboard.slice(0, 3);
  }, [finalLeaderboard]);

  // Trigger confetti for winners
  useEffect(() => {
    if (finalLeaderboard.length > 0) {
      // 🎵 Crossfade to victory music
      musicService.crossfade('victory', 2000);
      
      // 🔊 Play victory/applause sounds
      soundService.play('victory');
      setTimeout(() => soundService.play('applause'), 500);
      
      // Delay to show animation first
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }, 500);

      // Show details after animation
      setTimeout(() => {
        setShowDetails(true);
      }, 1500);
    }
    
    return () => {
      // Stop music when leaving results
      musicService.stop(1000);
    };
  }, [finalLeaderboard.length]);

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-amber-600';
      default: return 'text-gray-400';
    }
  };

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1: return 'h-32';
      case 2: return 'h-24';
      case 3: return 'h-20';
      default: return 'h-16';
    }
  };

  const getPodiumGradient = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-500 to-orange-500';
      case 2: return 'from-gray-400 to-gray-500';
      case 3: return 'from-amber-600 to-amber-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 overflow-y-auto">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="mb-4"
          >
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white mb-2"
          >
            {t('gameFinished', 'Trò chơi kết thúc!')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-300"
          >
            {t('congratulationsToAll', 'Chúc mừng tất cả người chơi!')}
          </motion.p>
        </div>
      </div>

      {/* Podium */}
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-end justify-center space-x-4">
            {/* 2nd Place */}
            {topThree[1] && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-2">
                  {topThree[1].photoURL ? (
                    <img
                      src={topThree[1].photoURL}
                      alt={topThree[1].playerName}
                      className="w-16 h-16 rounded-full border-4 border-gray-300 object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border-4 border-gray-300 bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                      {topThree[1].playerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-800 font-bold">2</span>
                  </div>
                </div>
                <p className="text-white font-medium text-sm mb-1 truncate max-w-[100px]">
                  {topThree[1].playerName}
                </p>
                <p className="text-gray-300 text-lg font-bold">{topThree[1].score}</p>
                <div className={`w-24 ${getPodiumHeight(2)} bg-gradient-to-t ${getPodiumGradient(2)} rounded-t-lg mt-2 flex items-center justify-center`}>
                  <Medal className="w-8 h-8 text-white" />
                </div>
              </motion.div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  className="mb-2"
                >
                  <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-1" />
                </motion.div>
                <div className="relative mb-2">
                  {topThree[0].photoURL ? (
                    <img
                      src={topThree[0].photoURL}
                      alt={topThree[0].playerName}
                      className="w-20 h-20 rounded-full border-4 border-yellow-400 object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full border-4 border-yellow-400 bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white text-2xl font-bold">
                      {topThree[0].playerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-yellow-900 font-bold">1</span>
                  </div>
                </div>
                <p className="text-white font-bold mb-1 truncate max-w-[120px]">
                  {topThree[0].playerName}
                </p>
                <p className="text-yellow-400 text-2xl font-bold">{topThree[0].score}</p>
                <div className={`w-28 ${getPodiumHeight(1)} bg-gradient-to-t ${getPodiumGradient(1)} rounded-t-lg mt-2 flex items-center justify-center`}>
                  <Trophy className="w-10 h-10 text-white" />
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-2">
                  {topThree[2].photoURL ? (
                    <img
                      src={topThree[2].photoURL}
                      alt={topThree[2].playerName}
                      className="w-14 h-14 rounded-full border-4 border-amber-600 object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full border-4 border-amber-600 bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-lg font-bold">
                      {topThree[2].playerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                </div>
                <p className="text-white font-medium text-sm mb-1 truncate max-w-[100px]">
                  {topThree[2].playerName}
                </p>
                <p className="text-amber-400 text-lg font-bold">{topThree[2].score}</p>
                <div className={`w-20 ${getPodiumHeight(3)} bg-gradient-to-t ${getPodiumGradient(3)} rounded-t-lg mt-2 flex items-center justify-center`}>
                  <Award className="w-6 h-6 text-white" />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Your Result (if not in top 3) */}
      {currentPlayerResult && currentPlayerResult.rank > 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="max-w-4xl mx-auto px-4 mb-6"
        >
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-4 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-blue-300 font-bold">#{currentPlayerResult.rank}</span>
                </div>
                <div>
                  <p className="text-white font-medium">{t('yourResult', 'Kết quả của bạn')}</p>
                  <p className="text-sm text-gray-400">
                    {currentPlayerResult.correctAnswers}/{currentPlayerResult.totalAnswers} {t('correct', 'đúng')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-400">{currentPlayerResult.score}</p>
                <p className="text-sm text-gray-400">{t('points', 'điểm')}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Full Leaderboard */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 max-w-4xl mx-auto px-4 pb-6 w-full"
          >
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <span>{t('fullLeaderboard', 'Bảng xếp hạng đầy đủ')}</span>
              </h3>

              <div className="space-y-2">
                {finalLeaderboard.map((entry, index) => {
                  const isCurrentPlayer = entry.playerId === currentUserId;

                  return (
                    <motion.div
                      key={entry.playerId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center space-x-3 p-3 rounded-xl ${
                        isCurrentPlayer 
                          ? 'bg-blue-500/20 border border-blue-500/30' 
                          : 'bg-white/5'
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-8 text-center flex-shrink-0">
                        {index < 3 ? (
                          <Medal className={`w-6 h-6 mx-auto ${getMedalColor(index + 1)}`} />
                        ) : (
                          <span className="text-gray-400 font-bold">{entry.rank}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {entry.photoURL ? (
                          <img
                            src={entry.photoURL}
                            alt={entry.playerName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold border-2 border-white/20">
                            {entry.playerName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {entry.maxStreak >= 5 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                            <Flame className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {entry.playerName}
                          {isCurrentPlayer && <span className="text-blue-400 ml-1">(You)</span>}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <span className="flex items-center">
                            <Target className="w-3 h-3 mr-1" />
                            {entry.accuracy}%
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {(entry.avgResponseTime / 1000).toFixed(1)}s
                          </span>
                          {entry.maxStreak >= 3 && (
                            <span className="flex items-center text-orange-400">
                              <Flame className="w-3 h-3 mr-1" />
                              {entry.maxStreak}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center space-x-4 flex-shrink-0">
                        <div className="text-center">
                          <p className="text-green-400 font-bold">{entry.correctAnswers}</p>
                          <p className="text-xs text-gray-400">{t('correct', 'đúng')}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-yellow-400 text-xl font-bold">{entry.score}</p>
                          <p className="text-xs text-gray-400">{t('points', 'điểm')}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center space-x-4 mt-6">
              {onPlayAgain && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onPlayAgain}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>{t('playAgain', 'Chơi lại')}</span>
                </motion.button>
              )}
              
              {onBackToLobby && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onBackToLobby}
                  className="flex items-center space-x-2 px-6 py-3 bg-white/10 text-white rounded-xl font-semibold border border-white/20 hover:bg-white/20 transition-all"
                >
                  <Home className="w-5 h-5" />
                  <span>{t('backToLobby', 'Về phòng chờ')}</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameResultsView;
