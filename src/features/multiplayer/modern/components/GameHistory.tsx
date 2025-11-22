import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  TrendingUp,
  Clock,
  Target,
  Medal,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader,
  BarChart3,
  Award,
  Star
} from 'lucide-react';
import { modernMultiplayerService } from '../services/modernMultiplayerService';

interface GameSubmission {
  id: string;
  playerId: string;
  playerName: string;
  finalScore: number;
  rank: number;
  correctAnswers: number;
  totalQuestions: number;
  completionTime: number;
  accuracy: number;
  roomId: string;
  timestamp: any;
  submittedAt: string;
}

interface UserStatistics {
  totalGames: number;
  totalScore: number;
  averageScore: number;
  bestScore: number;
  totalCorrectAnswers: number;
  totalQuestions: number;
  averageAccuracy: number;
  wins: number;
  averageRank: number;
  averageCompletionTime: number;
}

const GameHistory: React.FC<{ userId: string }> = ({ userId }) => {
  const [gameHistory, setGameHistory] = useState<GameSubmission[]>([]);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'history' | 'statistics'>('history');

  useEffect(() => {
    loadGameData();
  }, [userId]);

  const loadGameData = async () => {
    try {
      setIsLoading(true);
      const [historyData, statsData] = await Promise.all([
        modernMultiplayerService.getUserGameHistory(userId),
        modernMultiplayerService.getUserStatistics(userId)
      ]);
      
      setGameHistory(historyData);
      setStatistics(statsData);
    } catch (error) {
      console.error('❌ Failed to load game history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGameExpansion = (gameId: string) => {
    setExpandedGames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      return newSet;
    });
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 2: return 'text-gray-300 bg-gray-500/20 border-gray-500/30';
      case 3: return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      default: return 'text-blue-300 bg-blue-500/20 border-blue-500/30';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-4 h-4" />;
      case 2: return <Medal className="w-4 h-4" />;
      case 3: return <Award className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-400" />
        <span className="ml-3 text-blue-200">Loading game history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <span>Game History</span>
          </h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            Recent Games
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'statistics'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            Statistics
          </button>
        </div>

        {/* Statistics Tab */}
        {activeTab === 'statistics' && statistics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">{statistics.totalGames}</div>
              <div className="text-blue-200 text-sm mt-1">Games Played</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-400">{statistics.averageScore}</div>
              <div className="text-green-200 text-sm mt-1">Average Score</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">{statistics.wins}</div>
              <div className="text-yellow-200 text-sm mt-1">Wins</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-400">{statistics.averageAccuracy}%</div>
              <div className="text-purple-200 text-sm mt-1">Accuracy</div>
            </div>
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {gameHistory.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                <p className="text-blue-200">No games played yet</p>
              </div>
            ) : (
              <AnimatePresence>
                {gameHistory.map((game, index) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                  >
                    {/* Game Header */}
                    <div
                      className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => toggleGameExpansion(game.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Rank Badge */}
                          <div className={`px-3 py-1 rounded-full border flex items-center space-x-2 ${getRankColor(game.rank)}`}>
                            {getRankIcon(game.rank)}
                            <span className="font-semibold">#{game.rank}</span>
                          </div>

                          {/* Game Info */}
                          <div>
                            <div className="text-white font-semibold">Score: {game.finalScore}</div>
                            <div className="text-blue-200 text-sm flex items-center space-x-2">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(game.timestamp)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {/* Quick Stats */}
                          <div className="text-right">
                            <div className="text-green-400 text-sm">{game.correctAnswers}/{game.totalQuestions} correct</div>
                            <div className="text-blue-200 text-sm">{game.accuracy}% accuracy</div>
                          </div>

                          {/* Expand/Collapse Icon */}
                          {expandedGames.has(game.id) ? (
                            <ChevronUp className="w-5 h-5 text-blue-300" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-blue-300" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedGames.has(game.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-white/10"
                        >
                          <div className="p-4 bg-white/5 space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-2 text-blue-300 mb-1">
                                  <Target className="w-4 h-4" />
                                  <span className="text-sm">Rank</span>
                                </div>
                                <div className="text-white font-bold">#{game.rank}</div>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-2 text-green-300 mb-1">
                                  <TrendingUp className="w-4 h-4" />
                                  <span className="text-sm">Score</span>
                                </div>
                                <div className="text-white font-bold">{game.finalScore}</div>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-2 text-yellow-300 mb-1">
                                  <Star className="w-4 h-4" />
                                  <span className="text-sm">Accuracy</span>
                                </div>
                                <div className="text-white font-bold">{game.accuracy}%</div>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-2 text-purple-300 mb-1">
                                  <Clock className="w-4 h-4" />
                                  <span className="text-sm">Time</span>
                                </div>
                                <div className="text-white font-bold">{formatTime(game.completionTime)}</div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-white/10">
                              <div className="text-blue-200 text-sm">
                                Room ID: {game.roomId}
                              </div>
                              <div className="text-blue-200 text-sm">
                                {game.correctAnswers} of {game.totalQuestions} questions correct
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameHistory;
