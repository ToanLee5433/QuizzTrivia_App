import React, { useEffect, useState } from 'react';
// import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Medal,
  Award,
  Star,
  Share2,
  RotateCcw,
  FileText,
  Sparkles,
  Crown
} from 'lucide-react';

interface Player {
  id: string;
  username: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  avgTimePerQuestion: number;
  rank: number;
  avatar?: string;
  avatarEmoji?: string;
  streak?: number;
}

interface FinalPodiumProps {
  players: Player[];
  currentPlayerId: string;
  onPlayAgain?: () => void;
  onViewReport?: () => void;
  onShareResult?: () => void;
  onBackToLobby: () => void;
}

const FinalPodium: React.FC<FinalPodiumProps> = ({
  players,
  currentPlayerId,
  onPlayAgain,
  onViewReport,
  onShareResult,
  onBackToLobby
}) => {
  // const { t } = useTranslation();
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  
  // Sort players by rank
  const sortedPlayers = [...players].sort((a, b) => a.rank - b.rank);
  const top3 = sortedPlayers.slice(0, 3);
  const winner = top3[0];
  const currentPlayer = players.find(p => p.id === currentPlayerId);

  // Confetti celebration
  useEffect(() => {
    // Initial burst
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1']
    });

    // Continuous celebration
    const interval = setInterval(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500']
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FF69B4', '#00CED1']
      });
    }, 2000);

    // Victory music
    const audio = new Audio('/sounds/victory.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});

    return () => {
      clearInterval(interval);
      audio.pause();
    };
  }, []);

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1: return 'h-80'; // 1st place tallest
      case 2: return 'h-64'; // 2nd place medium
      case 3: return 'h-52'; // 3rd place shortest
      default: return 'h-40';
    }
  };

  const getPodiumColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-400 via-yellow-500 to-yellow-600';
      case 2: return 'from-gray-300 via-gray-400 to-gray-500';
      case 3: return 'from-orange-400 via-orange-500 to-orange-600';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-16 h-16 text-yellow-400" />;
      case 2: return <Medal className="w-12 h-12 text-gray-400" />;
      case 3: return <Award className="w-12 h-12 text-orange-600" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-6"
          >
            <Sparkles className="w-24 h-24 text-yellow-400" />
          </motion.div>
          <h1 className="text-8xl font-black text-white mb-4 tracking-tight">
            GAME OVER!
          </h1>
          <p className="text-4xl text-purple-200 font-bold">
            🎉 Amazing performance from all players! 🎉
          </p>
        </motion.div>

        {/* Winner Spotlight */}
        {winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="mb-16 max-w-2xl mx-auto"
          >
            <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 rounded-3xl p-8 text-center relative overflow-hidden">
              {/* Animated rays */}
              <div className="absolute inset-0 opacity-30">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute top-1/2 left-1/2 w-1 bg-white"
                    style={{
                      height: '200%',
                      transformOrigin: 'top',
                      transform: `rotate(${i * 30}deg)`
                    }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </div>

              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="relative z-10"
              >
                <Crown className="w-20 h-20 text-white mx-auto mb-4" />
                <p className="text-3xl font-bold text-white mb-2">
                  👑 WINNER 👑
                </p>
                <p className="text-6xl font-black text-white mb-4">
                  {winner.username}
                </p>
                <p className="text-5xl font-bold text-white">
                  {winner.score} points
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* 3D Podium */}
        <div className="mb-16">
          <div className="flex items-end justify-center gap-8 max-w-4xl mx-auto">
            {/* 2nd Place */}
            {top3[1] && (
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex-1 flex flex-col items-center"
              >
                {/* Avatar */}
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 5, 0, -5, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-4 text-7xl"
                >
                  {top3[1].avatarEmoji || '🥈'}
                </motion.div>

                <div className="text-center mb-4">
                  <p className="text-2xl font-bold text-white">{top3[1].username}</p>
                  <p className="text-4xl font-black text-yellow-300">{top3[1].score}</p>
                </div>

                {/* Podium */}
                <div className={`w-full ${getPodiumHeight(2)} bg-gradient-to-t ${getPodiumColor(2)} rounded-t-3xl flex items-center justify-center relative`}>
                  <div className="absolute -top-8">
                    {getMedalIcon(2)}
                  </div>
                  <span className="text-8xl font-black text-white opacity-20">2</span>
                </div>
              </motion.div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex-1 flex flex-col items-center"
              >
                {/* Avatar */}
                <motion.div
                  animate={{ 
                    y: [0, -15, 0],
                    rotate: [0, 10, 0, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-4 text-9xl"
                >
                  {top3[0].avatarEmoji || '👑'}
                </motion.div>

                <div className="text-center mb-4">
                  <p className="text-3xl font-bold text-white">{top3[0].username}</p>
                  <p className="text-5xl font-black text-yellow-400">{top3[0].score}</p>
                </div>

                {/* Podium */}
                <div className={`w-full ${getPodiumHeight(1)} bg-gradient-to-t ${getPodiumColor(1)} rounded-t-3xl flex items-center justify-center relative shadow-2xl`}>
                  <div className="absolute -top-12">
                    {getMedalIcon(1)}
                  </div>
                  <span className="text-9xl font-black text-white opacity-20">1</span>
                  
                  {/* Sparkle effects */}
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute -top-2 -left-2"
                  >
                    <Star className="w-8 h-8 text-yellow-300" />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
                    className="absolute -top-2 -right-2"
                  >
                    <Star className="w-8 h-8 text-yellow-300" />
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex-1 flex flex-col items-center"
              >
                {/* Avatar */}
                <motion.div
                  animate={{ 
                    y: [0, -8, 0],
                    rotate: [0, -5, 0, 5, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-4 text-6xl"
                >
                  {top3[2].avatarEmoji || '🥉'}
                </motion.div>

                <div className="text-center mb-4">
                  <p className="text-2xl font-bold text-white">{top3[2].username}</p>
                  <p className="text-4xl font-black text-orange-300">{top3[2].score}</p>
                </div>

                {/* Podium */}
                <div className={`w-full ${getPodiumHeight(3)} bg-gradient-to-t ${getPodiumColor(3)} rounded-t-3xl flex items-center justify-center relative`}>
                  <div className="absolute -top-8">
                    {getMedalIcon(3)}
                  </div>
                  <span className="text-8xl font-black text-white opacity-20">3</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Current Player Stats (if not in top 3) */}
        {currentPlayer && currentPlayer.rank > 3 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto mb-12"
          >
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8">
              <h3 className="text-3xl font-bold text-white mb-6 text-center">
                Your Result
              </h3>
              <div className="grid grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-5xl font-black text-white mb-2">
                    #{currentPlayer.rank}
                  </div>
                  <p className="text-lg text-purple-200">Rank</p>
                </div>
                <div>
                  <div className="text-5xl font-black text-white mb-2">
                    {currentPlayer.score}
                  </div>
                  <p className="text-lg text-purple-200">Score</p>
                </div>
                <div>
                  <div className="text-5xl font-black text-white mb-2">
                    {currentPlayer.correctAnswers}/{currentPlayer.totalQuestions}
                  </div>
                  <p className="text-lg text-purple-200">Correct</p>
                </div>
                <div>
                  <div className="text-5xl font-black text-white mb-2">
                    {currentPlayer.accuracy}%
                  </div>
                  <p className="text-lg text-purple-200">Accuracy</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Full Leaderboard Toggle */}
        <div className="text-center mb-12">
          <button
            onClick={() => setShowFullLeaderboard(!showFullLeaderboard)}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-8 py-4 rounded-2xl text-white text-xl font-bold hover:bg-white/20 transition-all"
          >
            <Trophy className="w-6 h-6" />
            {showFullLeaderboard ? 'Hide' : 'View'} Complete Rankings
          </button>
        </div>

        {/* Full Leaderboard */}
        <AnimatePresence>
          {showFullLeaderboard && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-4xl mx-auto mb-12"
            >
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
                <h3 className="text-3xl font-bold text-white mb-6">
                  Complete Rankings
                </h3>
                <div className="space-y-4">
                  {sortedPlayers.map((player, index) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`bg-white/10 rounded-2xl p-6 flex items-center gap-6 ${
                        player.id === currentPlayerId ? 'ring-4 ring-yellow-400' : ''
                      }`}
                    >
                      {/* Rank */}
                      <div className={`text-4xl font-black ${
                        index < 3 ? 'text-yellow-400' : 'text-white'
                      }`}>
                        #{index + 1}
                      </div>

                      {/* Avatar */}
                      <div className="text-5xl">
                        {player.avatarEmoji || '👤'}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <p className="text-2xl font-bold text-white">
                          {player.username}
                          {player.id === currentPlayerId && (
                            <span className="ml-2 text-yellow-400">(You)</span>
                          )}
                        </p>
                        <p className="text-lg text-purple-200">
                          {player.correctAnswers}/{player.totalQuestions} correct • 
                          {player.accuracy}% accuracy • 
                          Avg: {player.avgTimePerQuestion}s
                        </p>
                      </div>

                      {/* Score */}
                      <div className="text-4xl font-bold text-white">
                        {player.score}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <button
            onClick={onPlayAgain}
            className="bg-gradient-to-r from-green-400 to-emerald-600 py-6 px-8 rounded-2xl text-white text-2xl font-bold hover:scale-105 transition-transform flex items-center justify-center gap-3 shadow-2xl"
          >
            <RotateCcw className="w-8 h-8" />
            Play Again
          </button>

          <button
            onClick={onViewReport}
            className="bg-gradient-to-r from-blue-400 to-cyan-600 py-6 px-8 rounded-2xl text-white text-2xl font-bold hover:scale-105 transition-transform flex items-center justify-center gap-3 shadow-2xl"
          >
            <FileText className="w-8 h-8" />
            View Full Report
          </button>

          <button
            onClick={onShareResult}
            className="bg-gradient-to-r from-pink-400 to-purple-600 py-6 px-8 rounded-2xl text-white text-2xl font-bold hover:scale-105 transition-transform flex items-center justify-center gap-3 shadow-2xl"
          >
            <Share2 className="w-8 h-8" />
            Share Result
          </button>

          <button
            onClick={onBackToLobby}
            className="bg-white/10 backdrop-blur-md py-6 px-8 rounded-2xl text-white text-2xl font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-3 border-2 border-white/30"
          >
            Back to Lobby
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default FinalPodium;
