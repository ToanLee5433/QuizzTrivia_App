import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Award } from 'lucide-react';
import { gameStateService, LeaderboardEntry } from '../services/gameStateService';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface LiveLeaderboardProps {
  roomId: string;
  currentUserId: string;
  compact?: boolean;
  showTop?: number;
}

const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  roomId,
  currentUserId,
  compact = false,
  showTop = 5,
}) => {
  const { t } = useTranslation();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [previousRanks, setPreviousRanks] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const unsubscribe = gameStateService.listenToLeaderboard(roomId, (data) => {
      // Store previous ranks before updating
      const newPreviousRanks = new Map<string, number>();
      leaderboard.forEach((entry) => {
        newPreviousRanks.set(entry.userId, entry.rank);
      });
      setPreviousRanks(newPreviousRanks);

      setLeaderboard(data);
    });

    return () => unsubscribe();
  }, [roomId]);

  const getRankChange = (userId: string, currentRank: number): 'up' | 'down' | 'same' => {
    const prevRank = previousRanks.get(userId);
    if (!prevRank) return 'same';
    if (prevRank > currentRank) return 'up';
    if (prevRank < currentRank) return 'down';
    return 'same';
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-600" />;
      default:
        return null;
    }
  };

  const getRankChangeIcon = (change: 'up' | 'down' | 'same') => {
    switch (change) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const topPlayers = leaderboard.slice(0, showTop);
  const currentUser = leaderboard.find((p) => p.userId === currentUserId);
  const showCurrentUser = currentUser && currentUser.rank > showTop;

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="font-bold text-lg">Top {showTop}</h3>
        </div>
        <div className="space-y-2">
          {topPlayers.map((player) => (
            <motion.div
              key={player.userId}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center justify-between p-2 rounded-lg ${
                player.userId === currentUserId
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {getRankIcon(player.rank)}
                  {!getRankIcon(player.rank) && (
                    <span className="text-sm font-bold text-gray-600 w-6 text-center">
                      #{player.rank}
                    </span>
                  )}
                </div>
                <span className="font-medium text-sm truncate max-w-[120px]">
                  {player.username}
                </span>
                {player.streak > 1 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                    🔥 {player.streak}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getRankChangeIcon(getRankChange(player.userId, player.rank))}
                <span className="font-bold text-blue-600">{player.score}</span>
              </div>
            </motion.div>
          ))}
        </div>
        {showCurrentUser && currentUser && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-100 border-2 border-blue-500">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-600">#{currentUser.rank}</span>
                <span className="font-medium text-sm">{t('common.you', 'You')}</span>
              </div>
              <span className="font-bold text-blue-600">{currentUser.score}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full leaderboard view
  return (
    <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-xl shadow-2xl p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-300" />
          <h2 className="text-2xl font-black">LEADERBOARD</h2>
        </div>
        <div className="text-sm opacity-75">{t('multiplayer.leaderboard.playersCount', '{{count}} players', { count: leaderboard.length })}</div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {topPlayers.map((player, index) => {
            const isCurrentUser = player.userId === currentUserId;
            const rankChange = getRankChange(player.userId, player.rank);

            return (
              <motion.div
                key={player.userId}
                layout
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`relative ${
                  isCurrentUser ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''
                }`}
              >
                <div
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    player.rank === 1
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900'
                      : player.rank === 2
                      ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900'
                      : player.rank === 3
                      ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white'
                      : isCurrentUser
                      ? 'bg-white/20 backdrop-blur-sm'
                      : 'bg-white/10 backdrop-blur-sm'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Rank */}
                    <div className="flex flex-col items-center min-w-[50px]">
                      <div className="text-2xl font-black">
                        {getRankIcon(player.rank) || `#${player.rank}`}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {getRankChangeIcon(rankChange)}
                      </div>
                    </div>

                    {/* Player Info */}
                    <div className="flex-1">
                      <div className="font-bold text-lg truncate">
                        {player.username}
                        {isCurrentUser && (
                          <span className="ml-2 text-sm opacity-75">({t('common.you', 'You')})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm opacity-75">
                        <span>{t('multiplayer.leaderboard.correctAnswers', '✓ {{count}} correct', { count: player.correctAnswers })}</span>
                        {player.streak > 1 && (
                          <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold text-xs">
                            🔥 {player.streak} streak
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <div
                        className={`text-3xl font-black ${
                          player.rank <= 3 ? '' : 'text-white'
                        }`}
                      >
                        {player.score.toLocaleString()}
                      </div>
                      <div className="text-xs opacity-75">points</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {showCurrentUser && currentUser && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 pt-4 border-t border-white/20"
        >
          <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-400 text-gray-900">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-black">#{currentUser.rank}</div>
              <div>
                <div className="font-bold text-lg">Your Position</div>
                <div className="text-sm opacity-75">
                  ✓ {currentUser.correctAnswers} correct
                </div>
              </div>
            </div>
            <div className="text-3xl font-black">{currentUser.score.toLocaleString()}</div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LiveLeaderboard;
