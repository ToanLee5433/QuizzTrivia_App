import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Trophy, 
  Users, 
  Star, 
  Award,
  Target,
  Home,
  Share2,
  BarChart3,
  Crown,
  Medal,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { modernMultiplayerService, ModernPlayer } from '../services/modernMultiplayerService';
import { getAuth } from 'firebase/auth';

interface ModernGameResultsProps {
  roomId: string;
  onPlayAgain: () => void;
}

const ModernGameResults: React.FC<ModernGameResultsProps> = ({
  roomId,
  onPlayAgain
}) => {
  const { t } = useTranslation('multiplayer');
  const [players, setPlayers] = useState<{ [key: string]: ModernPlayer }>({});
  const [currentUserId, setCurrentUserId] = useState('');
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const initializeResults = async () => {
      try {
        // Get current user ID
        const auth = getAuth();
        setCurrentUserId(auth.currentUser?.uid || '');

        // Set up real-time listeners
        const playersUpdateId = modernMultiplayerService.on('players:updated', handlePlayersUpdate);
        const errorId = modernMultiplayerService.on('error', handleError);

        // Hide confetti after 5 seconds
        setTimeout(() => setShowConfetti(false), 5000);

        return () => {
          modernMultiplayerService.off('players:updated', playersUpdateId);
          modernMultiplayerService.off('error', errorId);
        };
      } catch (error) {
        console.error('❌ Failed to initialize results:', error);
        return () => {};
      }
    };

    const cleanup = initializeResults();
    return () => {
      cleanup.then(fn => fn());
    };
  }, [roomId]);

  const handlePlayersUpdate = (playersData: { [key: string]: ModernPlayer }) => {
    setPlayers(playersData);
  };

  const handleError = (error: any) => {
    console.error('❌ Results error:', error);
  };

  const getPlayersList = () => Object.values(players).sort((a, b) => b.score - a.score);
  const currentPlayer = players[currentUserId];
  const playersList = getPlayersList();
  const winner = playersList[0];
  const isWinner = winner?.id === currentUserId;
  const playerRank = playersList.findIndex(p => p.id === currentUserId) + 1;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-8 h-8 text-yellow-400" />;
      case 2:
        return <Medal className="w-8 h-8 text-gray-300" />;
      case 3:
        return <Award className="w-8 h-8 text-amber-600" />;
      default:
        return <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">{rank}</div>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-400/30';
      case 2:
        return 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-400/30';
      default:
        return 'bg-white/10 border-white/20';
    }
  };

  const getPerformanceEmoji = (rank: number) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 5) return '⭐';
    return '💪';
  };

  const calculateStats = () => {
    if (!currentPlayer) return { correct: 0, total: 0, accuracy: 0, avgTime: 0 };
    
    const answers = Object.values(currentPlayer.answers || {});
    const correct = answers.filter(a => a.isCorrect).length;
    const total = answers.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const avgTime = total > 0 ? Math.round(answers.reduce((sum, a) => sum + a.timeSpent, 0) / total / 1000) : 0;
    
    return { correct, total, accuracy, avgTime };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-600 p-4 relative overflow-hidden">
      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && isWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * window.innerWidth,
                  y: -50,
                  rotate: Math.random() * 360
                }}
                animate={{ 
                  y: window.innerHeight + 50,
                  rotate: Math.random() * 720
                }}
                transition={{ 
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
                className="absolute w-3 h-3"
                style={{
                  backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD700'][Math.floor(Math.random() * 6)],
                  left: `${Math.random() * 100}%`
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 mb-4"
        >
          {isWinner ? (
            <>
              <Trophy className="w-6 h-6 text-yellow-400" />
              <span className="text-white font-bold text-xl">{t('victory')}</span>
            </>
          ) : (
            <>
              <Star className="w-6 h-6 text-blue-400" />
              <span className="text-white font-bold text-xl">{t('gameOver')}</span>
            </>
          )}
        </motion.div>

        <h1 className="text-5xl font-bold text-white mb-4">
          {isWinner ? `🎉 ${t('congratulations')}! 🎉` : `🎮 ${t('gameOver')}! 🎮`}
        </h1>
        <p className="text-blue-100 text-xl max-w-2xl mx-auto">
          {isWinner 
            ? t('dominatedQuiz')
            : t('finishedPlace', { rank: playerRank, suffix: playerRank === 1 ? 'st' : playerRank === 2 ? 'nd' : playerRank === 3 ? 'rd' : 'th' })
          }
        </p>
      </motion.header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Winner Announcement */}
          {winner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 backdrop-blur-xl rounded-3xl p-8 border border-yellow-400/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="p-4 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl"
                  >
                    {getRankIcon(1)}
                  </motion.div>
                  <div>
                    <h2 className="text-3xl font-bold text-white flex items-center space-x-2">
                      <span>{winner.name}</span>
                      <Sparkles className="w-6 h-6 text-yellow-400" />
                    </h2>
                    <p className="text-yellow-100 text-lg">{t('multiplayer.quizChampion')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-white">{winner.score}</p>
                  <p className="text-yellow-100 text-sm">{t('common.points')}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Final Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <span>{t('fullLeaderboard')}</span>
              </h3>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-blue-100">{playersList.length} {t('players')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {playersList.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center justify-between p-4 rounded-2xl border ${getRankColor(index + 1)}`}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Rank */}
                      <div className="flex items-center justify-center">
                        {getRankIcon(index + 1)}
                      </div>

                      {/* Player Info */}
                      <div className="flex items-center space-x-3">
                        {player.avatar ? (
                          <img
                            src={player.avatar}
                            alt={player.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-white text-lg">{player.name}</h4>
                            {player.id === currentUserId && (
                              <span className="text-sm bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                                {t('you')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-blue-100">
                            <span>{Object.values(player.answers || {}).length} {t('game.correctAnswers')}</span>
                            <span>•</span>
                            <span>
                              {Object.values(player.answers || {}).length > 0
                                ? Math.round((Object.values(player.answers || {}).filter(a => a.isCorrect).length / Object.values(player.answers || {}).length) * 100)
                                : 0}% {t('accuracy')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{player.score}</p>
                      <p className="text-blue-100 text-sm">{t('points')}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Your Performance */}
          {currentPlayer && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-xl rounded-3xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  <span>{t('yourResult')}</span>
                </h3>
                <span className="text-2xl">{getPerformanceEmoji(playerRank)}</span>
              </div>

              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getRankColor(playerRank)} border-2`}>
                    {getRankIcon(playerRank)}
                  </div>
                  <p className="text-white font-bold text-lg mt-2">{t('rank')} #{playerRank}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-blue-100">{t('score')}</span>
                    <span className="text-white font-semibold">{currentPlayer.score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-100">{t('game.correctAnswers')}</span>
                    <span className="text-white font-semibold">{stats.correct}/{stats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-100">{t('accuracy')}</span>
                    <span className="text-white font-semibold">{stats.accuracy}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-100">{t('avgTime')}</span>
                    <span className="text-white font-semibold">{stats.avgTime}s</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onPlayAgain}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>{t('playAgain')}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-6 py-3 bg-white/10 border border-white/20 text-white rounded-2xl font-semibold hover:bg-white/20 transition-colors flex items-center justify-center space-x-2"
            >
              <Home className="w-5 h-5" />
              <span>{t('backToHome')}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-6 py-3 bg-white/10 border border-white/20 text-white rounded-2xl font-semibold hover:bg-white/20 transition-colors flex items-center justify-center space-x-2"
            >
              <Share2 className="w-5 h-5" />
              <span>{t('shareResults')}</span>
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ModernGameResults;
