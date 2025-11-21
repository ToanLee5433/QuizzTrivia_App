import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Medal, TrendingUp, Users } from 'lucide-react';
import optimizedRealtimeService from '../services/optimizedRealtimeService';

interface Player {
  id: string;
  name: string;
  photoURL?: string;
  score: number;
  isOnline: boolean;
  lastUpdated?: number;
}

interface OptimizedLiveLeaderboardProps {
  roomId: string;
  currentUserId: string;
  maxPlayers?: number;
  compact?: boolean;
}

const OptimizedLiveLeaderboard: React.FC<OptimizedLiveLeaderboardProps> = ({
  roomId,
  currentUserId,
  maxPlayers = 10,
  compact = false
}) => {
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // ⚡ REAL-TIME LEADERBOARD LISTENER - Near-zero latency updates
  useEffect(() => {
    if (!roomId) return;

    console.log('⚡ Setting up real-time leaderboard for room:', roomId);

    const unsubscribe = optimizedRealtimeService.listenToLeaderboard(
      roomId,
      (leaderboardData) => {
        console.log('⚡ Leaderboard updated in real-time:', leaderboardData);
        setLeaderboard(leaderboardData);
        setLastUpdate(Date.now());
      }
    );

    return () => {
      console.log('⚡ Cleaning up leaderboard listener');
      unsubscribe();
    };
  }, [roomId]);

  // Memoize ranked leaderboard for performance
  const rankedLeaderboard = useMemo(() => {
    return leaderboard
      .filter(player => player.isOnline)
      .slice(0, maxPlayers)
      .map((player, index) => ({
        ...player,
        rank: index + 1,
        isCurrentUser: player.id === currentUserId,
        scoreChange: index === 0 ? 0 : (leaderboard[index - 1]?.score || 0) - player.score
      }));
  }, [leaderboard, currentUserId, maxPlayers]);

  // Get rank icon and styling
  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          icon: <Crown className="w-5 h-5 text-yellow-500" />,
          bgColor: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
          textColor: 'text-white',
          borderColor: 'border-yellow-500'
        };
      case 2:
        return {
          icon: <Medal className="w-5 h-5 text-gray-400" />,
          bgColor: 'bg-gradient-to-r from-gray-300 to-gray-500',
          textColor: 'text-white',
          borderColor: 'border-gray-400'
        };
      case 3:
        return {
          icon: <Medal className="w-5 h-5 text-orange-600" />,
          bgColor: 'bg-gradient-to-r from-orange-400 to-orange-600',
          textColor: 'text-white',
          borderColor: 'border-orange-500'
        };
      default:
        return {
          icon: <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-600">{rank}</span>,
          bgColor: 'bg-white dark:bg-gray-800',
          textColor: 'text-gray-800 dark:text-gray-200',
          borderColor: 'border-gray-200 dark:border-gray-700'
        };
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { type: "spring" as const, stiffness: 100 }
    },
    update: {
      scale: [1, 1.05, 1],
      transition: { duration: 0.3 }
    }
  };

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Live Rankings</h3>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
        
        <AnimatePresence mode="popLayout">
          {rankedLeaderboard.slice(0, 5).map((player) => {
            const rankDisplay = getRankDisplay(player.rank);
            
            return (
              <motion.div
                key={player.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                layout
                className={`flex items-center gap-3 p-2 rounded-lg mb-1 ${
                  player.isCurrentUser 
                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' 
                    : 'bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className={`flex items-center justify-center w-6 h-6 rounded-full ${rankDisplay.bgColor} ${rankDisplay.borderColor} border`}>
                  {rankDisplay.icon}
                </div>
                
                <div className="flex-1 flex items-center gap-2">
                  {player.photoURL ? (
                    <img 
                      src={player.photoURL} 
                      alt={player.name}
                      className="w-6 h-6 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className={`text-xs font-medium truncate ${rankDisplay.textColor}`}>
                    {player.name}
                    {player.isCurrentUser && <span className="ml-1 text-blue-600 dark:text-blue-400">(You)</span>}
                  </span>
                </div>
                
                <span className={`text-xs font-bold ${rankDisplay.textColor}`}>
                  {player.score}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6" />
            <h2 className="text-xl font-bold">Live Leaderboard</h2>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs opacity-90">Real-time</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm opacity-90">
            <Users className="w-4 h-4" />
            {rankedLeaderboard.length}
          </div>
        </div>
      </div>

      {/* Leaderboard Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {rankedLeaderboard.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-500 dark:text-gray-400"
            >
              <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Waiting for players to join...</p>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {rankedLeaderboard.map((player) => {
                const rankDisplay = getRankDisplay(player.rank);
                
                return (
                  <motion.div
                    key={player.id}
                    variants={itemVariants}
                    layout="position"
                    animate="visible"
                    whileHover={{ scale: 1.02 }}
                    className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      player.isCurrentUser 
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 shadow-lg' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md'
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full ${rankDisplay.bgColor} ${rankDisplay.borderColor} border-2 shadow-lg`}>
                      {rankDisplay.icon}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 flex items-center gap-3">
                      {player.photoURL ? (
                        <img 
                          src={player.photoURL} 
                          alt={player.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-md"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className={`font-bold ${rankDisplay.textColor}`}>
                          {player.name}
                          {player.isCurrentUser && (
                            <span className="ml-2 text-sm text-blue-600 dark:text-blue-400 font-normal">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${player.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {player.isOnline ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${rankDisplay.textColor}`}>
                        {player.score}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        pts
                      </div>
                    </div>

                    {/* Trend Indicator */}
                    {player.rank <= 3 && player.scoreChange > 0 && (
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                        <TrendingUp className="w-3 h-3" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Last updated: {new Date(lastUpdate).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default OptimizedLiveLeaderboard;
