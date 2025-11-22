import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Crown, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Zap,
  Flame,
  Medal,
  Award
} from 'lucide-react';
import { getDatabase, ref, onValue, off } from 'firebase/database';

interface LeaderboardEntry {
  userId: string;
  username: string;
  photoURL?: string;
  score: number;
  rank: number;
  correctAnswers: number;
  totalAnswers: number;
  streak?: number;
  isOnline: boolean;
  lastActive: number;
}

interface ModernLiveLeaderboardProps {
  roomId: string;
  currentUserId: string;
  maxEntries?: number;
  showTop?: number;
  showAnimations?: boolean;
  compact?: boolean;
}

const ModernLiveLeaderboard: React.FC<ModernLiveLeaderboardProps> = ({
  roomId,
  currentUserId,
  showTop = 10,
  showAnimations = true,
  compact = false
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [previousRanks, setPreviousRanks] = useState<{ [key: string]: number }>({});
  const [isLive, setIsLive] = useState(true);

  const db = getDatabase();

  useEffect(() => {
    if (!roomId || !db) return;

    const leaderboardRef = ref(db, `rooms/${roomId}/leaderboard`);
    
    const unsubscribe = onValue(leaderboardRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entries: LeaderboardEntry[] = Object.entries(data)
          .map(([userId, entry]: [string, any]) => ({
            userId,
            username: entry.username || 'Unknown',
            photoURL: entry.photoURL,
            score: entry.score || 0,
            rank: entry.rank || 0,
            correctAnswers: entry.correctAnswers || 0,
            totalAnswers: entry.totalAnswers || 0,
            streak: entry.streak || 0,
            isOnline: entry.isOnline !== false,
            lastActive: entry.lastActive || Date.now()
          }))
          .sort((a, b) => b.score - a.score)
          .map((entry, index) => ({ ...entry, rank: index + 1 }));

        // Store previous ranks before updating
        const newPreviousRanks: { [key: string]: number } = {};
        leaderboard.forEach((entry) => {
          newPreviousRanks[entry.userId] = entry.rank;
        });
        setPreviousRanks(newPreviousRanks);

        setLeaderboard(entries);
        setIsLive(true);
      }
    }, (error) => {
      console.error('Leaderboard subscription error:', error);
      setIsLive(false);
    });

    return () => off(leaderboardRef, 'value', unsubscribe);
  }, [roomId, db]);

  const getRankChange = (userId: string, currentRank: number): 'up' | 'down' | 'same' => {
    const prevRank = previousRanks[userId];
    if (!prevRank) return 'same';
    if (prevRank > currentRank) return 'up';
    if (prevRank < currentRank) return 'down';
    return 'same';
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500 drop-shadow-lg" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400 drop-shadow-lg" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600 drop-shadow-lg" />;
      default:
        return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getRankBackground = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500';
      case 2:
        return 'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800';
      default:
        return 'bg-gradient-to-r from-blue-50 to-indigo-50';
    }
  };

  const getStreakIcon = (streak: number) => {
    if (streak >= 10) return <Flame className="w-4 h-4 text-red-500" />;
    if (streak >= 5) return <Zap className="w-4 h-4 text-yellow-500" />;
    if (streak >= 3) return <Star className="w-4 h-4 text-blue-500" />;
    return null;
  };

  const formatScore = (score: number) => {
    return new Intl.NumberFormat('vi-VN').format(score);
  };

  const getAccuracy = (correct: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  const displayedLeaderboard = compact 
    ? leaderboard.slice(0, showTop)
    : leaderboard.slice(0, showTop);

  if (leaderboard.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 text-center border border-blue-100/50">
        <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Bảng xếp hạng sẽ xuất hiện khi game bắt đầu</p>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-white via-blue-50/30 to-white rounded-2xl shadow-2xl border border-blue-200/50 overflow-hidden ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          </div>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent">
              Bảng Xếp Hạng
            </h3>
            <p className="text-xs text-gray-500 flex items-center space-x-1">
              <span>{leaderboard.length} người chơi</span>
              {isLive && (
                <>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live</span>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        {!compact && (
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full">
              <p className="text-xs font-semibold text-blue-700">Top {showTop}</p>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard Entries */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {displayedLeaderboard.map((entry) => {
            const rankChange = getRankChange(entry.userId, entry.rank);
            const isCurrentUser = entry.userId === currentUserId;
            const accuracy = getAccuracy(entry.correctAnswers, entry.totalAnswers);

            return (
              <motion.div
                key={entry.userId}
                initial={showAnimations ? { opacity: 0, x: rankChange === 'up' ? -50 : rankChange === 'down' ? 50 : 0, scale: 0.9 } : { opacity: 1 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={showAnimations ? { opacity: 0, x: rankChange === 'up' ? 50 : rankChange === 'down' ? -50 : 0, scale: 0.9 } : { opacity: 0 }}
                transition={{ 
                  duration: 0.5, 
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
                className={`relative ${isCurrentUser ? 'ring-2 ring-blue-500 ring-offset-2 rounded-xl' : ''}`}
              >
                <div className={`flex items-center justify-between p-4 rounded-xl ${getRankBackground(entry.rank)} ${isCurrentUser ? 'shadow-lg' : 'shadow-md'} hover:shadow-xl transition-all duration-300`}>
                  {/* Rank and User Info */}
                  <div className="flex items-center space-x-4">
                    {/* Rank */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/80 shadow-md">
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* User Avatar and Info */}
                    <div className="flex items-center space-x-3">
                      {entry.photoURL ? (
                        <img
                          src={entry.photoURL}
                          alt={entry.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                          {entry.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-gray-800">
                            {entry.username}
                            {isCurrentUser && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                Bạn
                              </span>
                            )}
                          </p>
                          {getStreakIcon(entry.streak || 0)}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-600">
                          <span className="flex items-center space-x-1">
                            <Trophy className="w-3 h-3" />
                            <span>{accuracy}% chính xác</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Zap className="w-3 h-3" />
                            <span>{entry.correctAnswers}/{entry.totalAnswers}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score and Rank Change */}
                  <div className="flex items-center space-x-3">
                    {/* Rank Change Indicator */}
                    {showAnimations && rankChange !== 'same' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-bold ${
                          rankChange === 'up' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {rankChange === 'up' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{Math.abs(previousRanks[entry.userId] - entry.rank)}</span>
                      </motion.div>
                    )}

                    {/* Score */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">
                        {formatScore(entry.score)}
                      </p>
                      <p className="text-xs text-gray-600">điểm</p>
                    </div>
                  </div>
                </div>

                {/* Online Status Indicator */}
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${entry.isOnline ? 'bg-green-500' : 'bg-gray-400'} ${entry.isOnline ? 'animate-pulse' : ''}`}></div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show More Button */}
      {!compact && leaderboard.length > showTop && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center"
        >
          <button className="px-4 py-2 bg-gradient-to-r from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 rounded-xl text-sm font-semibold text-blue-700 transition-all duration-200">
            Xem tất cả {leaderboard.length} người chơi
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default ModernLiveLeaderboard;
