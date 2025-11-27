/**
 * 🏎️ FREE MODE (SELF-PACED) SPECTATOR VIEW
 * Real-time race track view showing player progress
 * Host/Spectator can see each player's progress through questions
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Flag, 
  Users, 
  Clock, 
  Target,
  Flame,
  Medal,
  CheckCircle,
  Activity
} from 'lucide-react';
import { GameState, ModernPlayer, LeaderboardEntry } from '../../types/game.types';
import { useTranslation } from 'react-i18next';

interface FreeModeSpectatorViewProps {
  roomId: string;
  gameState: GameState;
  players: Record<string, ModernPlayer>;
  leaderboard: LeaderboardEntry[];
}

const FreeModeSpectatorView: React.FC<FreeModeSpectatorViewProps> = ({
  roomId: _roomId, // Reserved for future use
  gameState,
  players,
  leaderboard,
}) => {
  const { t } = useTranslation('multiplayer');
  const totalQuestions = gameState.totalQuestions || 0;
  
  // Calculate player progress for race track
  const playerProgress = useMemo(() => {
    return Object.values(players)
      .filter(p => p.role === 'player')
      .map(player => {
        const freeMode = player.freeMode;
        const currentQ = freeMode?.currentQuestionIndex ?? 0;
        const isFinished = player.status === 'finished' || !!freeMode?.finishedAt;
        const progress = totalQuestions > 0 
          ? ((isFinished ? totalQuestions : currentQ) / totalQuestions) * 100 
          : 0;
        
        return {
          id: player.id,
          name: player.name,
          photoURL: player.photoURL,
          score: player.score,
          correctAnswers: player.correctAnswers,
          totalAnswers: player.totalAnswers,
          streak: player.streak,
          progress,
          currentQuestion: currentQ,
          isFinished,
          timeRemaining: freeMode?.timeRemaining ?? 0,
        };
      })
      .sort((a, b) => {
        // Sort by progress first, then by score
        if (a.isFinished !== b.isFinished) return a.isFinished ? -1 : 1;
        if (Math.abs(a.progress - b.progress) > 5) return b.progress - a.progress;
        return b.score - a.score;
      });
  }, [players, totalQuestions]);

  // Stats
  const finishedCount = playerProgress.filter(p => p.isFinished).length;
  const totalPlayers = playerProgress.length;
  const avgProgress = totalPlayers > 0 
    ? Math.round(playerProgress.reduce((sum, p) => sum + p.progress, 0) / totalPlayers) 
    : 0;

  // Live leaderboard from props or calculate from players
  const liveLeaderboard = useMemo(() => {
    if (leaderboard && leaderboard.length > 0) return leaderboard;
    
    return playerProgress
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        rank: index + 1,
        playerId: player.id,
        playerName: player.name,
        photoURL: player.photoURL,
        score: player.score,
        correctAnswers: player.correctAnswers,
        totalAnswers: player.totalAnswers,
        accuracy: player.totalAnswers > 0 
          ? Math.round((player.correctAnswers / player.totalAnswers) * 100) 
          : 0,
        avgResponseTime: 0,
        streak: player.streak,
        maxStreak: player.streak,
        rankChange: 0,
        scoreChange: 0,
      }));
  }, [leaderboard, playerProgress]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* ============= HEADER ============= */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {t('selfPacedMode', 'Chế độ Tự do')}
                </h2>
                <p className="text-xs text-gray-400">
                  {t('raceProgress', 'Theo dõi tiến trình real-time')}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-4">
              <div className="px-4 py-2 bg-green-500/20 rounded-xl border border-green-500/30">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-lg font-bold text-green-400">
                    {finishedCount}/{totalPlayers}
                  </span>
                  <span className="text-xs text-green-300">
                    {t('finished', 'hoàn thành')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">{t('averageProgress', 'Tiến trình trung bình')}</span>
              <span className="text-white font-bold">{avgProgress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${avgProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============= MAIN CONTENT ============= */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {/* LEFT: Race Track (3 cols) */}
            <div className="xl:col-span-3 space-y-4">
              {/* Race Track Title */}
              <div className="flex items-center space-x-2 mb-2">
                <Flag className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-bold text-white">
                  {t('raceTrack', 'Đường đua tiến trình')}
                </h3>
              </div>

              {/* 🏎️ RACE TRACK - Thanh tiến trình đua top */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                {/* Question markers */}
                <div className="flex items-center justify-between mb-2 px-2">
                  {Array.from({ length: Math.min(totalQuestions, 10) }).map((_, i) => {
                    const questionNum = Math.floor((i / 9) * (totalQuestions - 1)) + 1;
                    return (
                      <div key={i} className="text-xs text-gray-400">
                        Q{questionNum}
                      </div>
                    );
                  })}
                  <Flag className="w-4 h-4 text-green-400" />
                </div>

                {/* Track background */}
                <div className="relative h-3 bg-white/10 rounded-full mb-6 overflow-hidden">
                  {/* Track markers */}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-white/20"
                      style={{ left: `${(i + 1) * 10}%` }}
                    />
                  ))}
                </div>

                {/* Player Race Bars */}
                <div className="space-y-4">
                  <AnimatePresence>
                    {playerProgress.map((player, index) => {
                      const isTopThree = index < 3;
                      
                      // Color based on position
                      const colors = [
                        'from-yellow-500 to-amber-400', // 1st
                        'from-gray-400 to-gray-300',    // 2nd
                        'from-amber-600 to-amber-500',  // 3rd
                        'from-blue-500 to-cyan-400',    // others
                        'from-purple-500 to-pink-400',
                        'from-green-500 to-emerald-400',
                      ];
                      const barColor = colors[Math.min(index, colors.length - 1)];

                      return (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`relative ${isTopThree ? 'scale-105 z-10' : ''}`}
                        >
                          {/* Player Info Row */}
                          <div className="flex items-center space-x-3 mb-1">
                            {/* Rank */}
                            <div className="w-6 text-center">
                              {isTopThree ? (
                                <Medal className={`w-5 h-5 ${
                                  index === 0 ? 'text-yellow-400' : 
                                  index === 1 ? 'text-gray-300' : 'text-amber-600'
                                }`} />
                              ) : (
                                <span className="text-sm text-gray-400 font-bold">
                                  {index + 1}
                                </span>
                              )}
                            </div>

                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                              {player.photoURL ? (
                                <img
                                  src={player.photoURL}
                                  alt={player.name}
                                  className={`w-8 h-8 rounded-full object-cover border-2 ${
                                    player.isFinished ? 'border-green-500' : 'border-white/20'
                                  }`}
                                />
                              ) : (
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold border-2 ${
                                  player.isFinished ? 'border-green-500' : 'border-white/20'
                                }`}>
                                  {player.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              {player.streak >= 3 && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                  <Flame className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Name & Status */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm text-white font-medium truncate">
                                  {player.name}
                                </p>
                                {player.isFinished && (
                                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                                    {t('doneCheck', '✓ Xong')}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-400">
                                <span>Q{player.currentQuestion + 1}/{totalQuestions}</span>
                                <span>•</span>
                                <span className="text-yellow-400">{player.score} {t('points', 'điểm')}</span>
                                {!player.isFinished && (
                                  <>
                                    <span>•</span>
                                    <Clock className="w-3 h-3" />
                                    <span>{formatTime(player.timeRemaining)}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Progress % */}
                            <div className="text-right">
                              <p className={`text-lg font-bold ${
                                player.isFinished ? 'text-green-400' : 'text-white'
                              }`}>
                                {Math.round(player.progress)}%
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar (Race Track) */}
                          <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full bg-gradient-to-r ${barColor} rounded-full`}
                              initial={{ width: 0 }}
                              animate={{ width: `${player.progress}%` }}
                              transition={{ 
                                type: 'spring',
                                stiffness: 40,
                                damping: 12,
                                mass: 0.8
                              }}
                            />
                            
                            {/* Player avatar at progress position - Smooth sliding */}
                            <motion.div
                              className="absolute top-1/2 -translate-y-1/2"
                              initial={{ left: '0%' }}
                              animate={{ left: `${Math.min(player.progress, 97)}%` }}
                              transition={{ 
                                type: 'spring',
                                stiffness: 40,
                                damping: 12,
                                mass: 0.8
                              }}
                            >
                              <div className={`w-6 h-6 rounded-full ${
                                player.isFinished ? 'bg-green-500' : `bg-gradient-to-r ${barColor}`
                              } border-2 border-white shadow-lg flex items-center justify-center`}>
                                {player.isFinished ? (
                                  <CheckCircle className="w-4 h-4 text-white" />
                                ) : (
                                  <span className="text-[10px] font-bold text-white">
                                    {player.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-3 border border-blue-500/30">
                  <div className="flex items-center space-x-2 mb-1">
                    <Users className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-medium text-blue-300">
                      {t('playing', 'Đang chơi')}
                    </h4>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">
                    {totalPlayers - finishedCount}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-3 border border-green-500/30">
                  <div className="flex items-center space-x-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <h4 className="text-xs font-medium text-green-300">
                      {t('finished', 'Hoàn thành')}
                    </h4>
                  </div>
                  <p className="text-2xl font-bold text-green-400">{finishedCount}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-3 border border-purple-500/30">
                  <div className="flex items-center space-x-2 mb-1">
                    <Target className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-medium text-purple-300">
                      {t('avgAccuracy', 'Độ chính xác TB')}
                    </h4>
                  </div>
                  <p className="text-2xl font-bold text-purple-400">
                    {playerProgress.length > 0
                      ? Math.round(
                          playerProgress.reduce((sum, p) => 
                            sum + (p.totalAnswers > 0 ? (p.correctAnswers / p.totalAnswers) * 100 : 0), 
                          0) / playerProgress.length
                        )
                      : 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT: Real-time Leaderboard (1 col) */}
            <div className="xl:col-span-1">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 sticky top-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-bold text-white">
                    {t('liveRanking', 'Xếp hạng Real-time')}
                  </h3>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {liveLeaderboard.map((entry, index) => {
                    const isTopThree = index < 3;
                    const medalColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
                    const playerData = playerProgress.find(p => p.id === entry.playerId);

                    return (
                      <motion.div
                        key={entry.playerId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center space-x-2 p-2 rounded-xl ${
                          isTopThree 
                            ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20' 
                            : 'bg-white/5'
                        } ${playerData?.isFinished ? 'ring-2 ring-green-500/30' : ''}`}
                      >
                        {/* Rank */}
                        <div className="w-6 text-center flex-shrink-0">
                          {isTopThree ? (
                            <Medal className={`w-5 h-5 ${medalColors[index]}`} />
                          ) : (
                            <span className="text-sm text-gray-400 font-bold">
                              {entry.rank}
                            </span>
                          )}
                        </div>

                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {entry.photoURL ? (
                            <img
                              src={entry.photoURL}
                              alt={entry.playerName}
                              className="w-8 h-8 rounded-full object-cover border-2 border-white/20"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white/20">
                              {entry.playerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {playerData?.isFinished && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Name & Stats */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">
                            {entry.playerName}
                          </p>
                          <div className="flex items-center space-x-1 text-xs">
                            <span className="text-gray-400">
                              {entry.correctAnswers}/{entry.totalAnswers}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span className="text-purple-400">
                              {Math.round(playerData?.progress || 0)}%
                            </span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-yellow-400">{entry.score}</p>
                        </div>
                      </motion.div>
                    );
                  })}

                  {liveLeaderboard.length === 0 && (
                    <div className="text-center py-8">
                      <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">
                        {t('noPlayersYet', 'Chưa có người chơi')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeModeSpectatorView;
