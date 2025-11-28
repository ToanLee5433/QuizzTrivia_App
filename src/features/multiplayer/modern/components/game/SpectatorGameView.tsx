/**
 * 👁️ SPECTATOR GAME VIEW
 * Real-time statistics view for spectators
 * Shows answer distribution bar chart + live leaderboard sidebar
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  Users, 
  TrendingUp, 
  Clock, 
  Target, 
  Trophy,
  Flame,
  Medal,
  BarChart3,
  Loader2
} from 'lucide-react';
import { QuestionState, ModernPlayer, LeaderboardEntry } from '../../types/game.types';
import { gameEngine } from '../../services/gameEngine';
import soundService from '../../../services/soundService';
import { Answer } from '../../../../quiz/types';
import { useTranslation } from 'react-i18next';
import { ref, onValue, getDatabase } from 'firebase/database';

interface SpectatorGameViewProps {
  roomId: string;
  questionState: QuestionState;
  players: Record<string, ModernPlayer>;
  gameStatus?: string;
}

const SpectatorGameView: React.FC<SpectatorGameViewProps> = ({
  roomId,
  questionState,
  players,
  gameStatus = 'playing',
}) => {
  const { t } = useTranslation('multiplayer');
  const [spectatorData, setSpectatorData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // ✅ OPTIMIZED: Use server time directly - no local countdown
  const timeLeft = questionState?.timeRemaining ?? 0;

  // Fetch spectator view data - use longer interval to avoid spam
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 5;
    
    const fetchData = async () => {
      if (!mounted) return;
      
      const data = await gameEngine.getSpectatorViewData(roomId);
      if (data) {
        setSpectatorData(data);
        retryCount = 0; // Reset retry count on success
      } else {
        retryCount++;
        // Stop polling after max retries to avoid spam
        if (retryCount >= maxRetries) {
          console.log('📊 Spectator data not available yet, using fallback');
        }
      }
    };

    fetchData();
    // Poll every 2 seconds instead of 1 to reduce load
    const interval = setInterval(fetchData, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [roomId, questionState.questionIndex]);

  // Listen to leaderboard updates
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

  // 🔊 SFX: Tick tắc khi còn 5s cuối (Live Mode tension cho Spectator)
  const lastTickRef = useRef<number>(-1);
  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0) {
      if (lastTickRef.current !== timeLeft) {
        lastTickRef.current = timeLeft;
        soundService.play('tick');
      }
    }
  }, [timeLeft]);

  // Calculate live leaderboard from players if leaderboard is empty
  const liveLeaderboard = useMemo(() => {
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

  // Guard: Check if question data is ready
  const questionAnswers = questionState?.question?.answers;
  const hasQuestionData = questionState?.question && questionAnswers;

  // Use spectatorData if available, otherwise use props directly
  const playerCount = Object.values(players).filter(p => p.role === 'player').length;
  const answeredCount = spectatorData?.totalAnswered || questionState?.answerCount || 0;
  const progressPercent = playerCount > 0 ? (answeredCount / playerCount) * 100 : 0;

  // Build fallback distribution from questionState if spectatorData not available
  const answerDistribution = useMemo(() => {
    if (spectatorData?.answerDistribution) return spectatorData.answerDistribution;
    
    // Fallback: create empty distribution from question answers
    if (!questionAnswers) return [];
    return questionAnswers.map((answer: Answer) => ({
      answerId: answer.id,
      answerText: answer.text,
      count: 0,
      percentage: 0,
      players: [],
    }));
  }, [spectatorData, questionAnswers]);

  // Get max count for bar chart scaling (must be after answerDistribution)
  const maxAnswerCount = useMemo(() => {
    if (!answerDistribution || answerDistribution.length === 0) return 1;
    return Math.max(...answerDistribution.map((d: any) => d.count), 1);
  }, [answerDistribution]);

  // Show loading if question data not ready
  if (!hasQuestionData) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white text-lg">{t('loading', 'Đang tải câu hỏi...')}</p>
        </div>
      </div>
    );
  }

  // Check if game is paused
  const isPaused = gameStatus === 'paused';

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative">
      {/* ============= PAUSE OVERLAY ============= */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-yellow-500/50"
              >
                <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
              </motion.div>
              <h2 className="text-4xl font-bold text-white mb-4">
                {t('gamePausedTitle', 'Tạm dừng')}
              </h2>
              <p className="text-xl text-gray-300">
                {t('gamePausedDesc', 'Đang chờ host tiếp tục trò chơi...')}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============= HEADER ============= */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <Eye className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t('spectatorMode', 'Chế độ xem')}</h2>
                <p className="text-xs text-gray-400">{t('watchingLive', 'Theo dõi real-time')}</p>
              </div>
            </div>

            {/* Timer */}
            <div className={`px-4 py-2 rounded-xl border-2 ${
              timeLeft <= 5
                ? 'bg-red-500/20 border-red-500/50 animate-pulse'
                : timeLeft <= 10
                ? 'bg-yellow-500/20 border-yellow-500/50'
                : 'bg-green-500/20 border-green-500/50'
            }`}>
              <div className="flex items-center space-x-2">
                <Clock className={`w-5 h-5 ${
                  timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-yellow-400' : 'text-green-400'
                }`} />
                <span className={`text-2xl font-bold ${
                  timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">{t('playersAnswered', 'Đã trả lời')}</span>
              <span className="text-white font-bold">{answeredCount}/{playerCount}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
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
            {/* LEFT: Question + Bar Chart (3 cols) */}
            <div className="xl:col-span-3 space-y-4">
              {/* Question Display */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium border border-blue-500/30">
                        {t('question', 'Câu')} {questionState.questionIndex + 1}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        questionState.question.difficulty === 'easy'
                          ? 'bg-green-500/20 text-green-300 border-green-500/30'
                          : questionState.question.difficulty === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                          : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}>
                        {questionState.question.difficulty === 'easy' ? t('easy', 'Dễ') :
                         questionState.question.difficulty === 'medium' ? t('medium', 'TB') : t('hard', 'Khó')}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white leading-tight">
                      {questionState.question.text}
                    </h2>
                  </div>
                </div>

                {questionState.question.imageUrl && (
                  <div className="mt-3">
                    <img
                      src={questionState.question.imageUrl}
                      alt="Question"
                      className="w-full rounded-xl object-cover max-h-48"
                    />
                  </div>
                )}
              </div>

              {/* Bar Chart Answer Distribution */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">{t('answerDistribution', 'Phân bố câu trả lời')}</h3>
                </div>

                {/* Horizontal Bar Chart */}
                <div className="space-y-3">
                  <AnimatePresence>
                    {(questionState.question.answers || []).map((answer: Answer, index: number) => {
                      const distribution = answerDistribution.find(
                        (d: any) => d.answerId === answer.id
                      );
                      const count = distribution?.count || 0;
                      const percentage = distribution?.percentage || 0;
                      const barWidth = maxAnswerCount > 0 ? (count / maxAnswerCount) * 100 : 0;
                      const playerList = distribution?.players || [];
                      const letter = String.fromCharCode(65 + index);

                      // Colors for each answer option
                      const colors = [
                        { bg: 'bg-red-500', border: 'border-red-500/50', gradient: 'from-red-500/40' },
                        { bg: 'bg-blue-500', border: 'border-blue-500/50', gradient: 'from-blue-500/40' },
                        { bg: 'bg-yellow-500', border: 'border-yellow-500/50', gradient: 'from-yellow-500/40' },
                        { bg: 'bg-green-500', border: 'border-green-500/50', gradient: 'from-green-500/40' },
                      ];
                      const color = answer.isCorrect 
                        ? { bg: 'bg-green-500', border: 'border-green-500/50', gradient: 'from-green-500/40' }
                        : colors[index % colors.length];

                      return (
                        <motion.div
                          key={answer.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`relative overflow-hidden rounded-xl border ${color.border} bg-black/20`}
                        >
                          {/* Background Bar - Smooth grow animation */}
                          <motion.div
                            className={`absolute inset-0 bg-gradient-to-r ${color.gradient} to-transparent`}
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ 
                              type: 'spring',
                              stiffness: 50,
                              damping: 15,
                              mass: 1
                            }}
                          />

                          {/* Content */}
                          <div className="relative p-3 flex items-center">
                            {/* Letter Badge */}
                            <div className={`w-8 h-8 ${color.bg} rounded-lg flex items-center justify-center font-bold text-white text-sm mr-3 flex-shrink-0`}>
                              {letter}
                            </div>
                            
                            {/* Answer Text */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-medium truncate">
                                {answer.text}
                              </p>
                              {answer.isCorrect && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded">
                                  ✓ {t('correct', 'Đúng')}
                                </span>
                              )}
                            </div>

                            {/* Count & Percentage */}
                            <div className="text-right ml-2 flex-shrink-0">
                              <p className="text-xl font-bold text-white">{count}</p>
                              <p className="text-xs text-gray-400">{percentage}%</p>
                            </div>

                            {/* Player Avatars */}
                            {playerList.length > 0 && (
                              <div className="flex items-center -space-x-1.5 ml-3 flex-shrink-0">
                                {playerList.slice(0, 5).map((player: any) => (
                                  <div
                                    key={player.id}
                                    title={player.name}
                                  >
                                    {player.photoURL ? (
                                      <img
                                        src={player.photoURL}
                                        alt={player.name}
                                        className="w-6 h-6 rounded-full border-2 border-gray-900 object-cover"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full border-2 border-gray-900 bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                                        {player.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {playerList.length > 5 && (
                                  <div className="w-6 h-6 rounded-full border-2 border-gray-900 bg-gray-700 flex items-center justify-center text-white text-[10px] font-bold">
                                    +{playerList.length - 5}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Live Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-3 border border-blue-500/30">
                  <div className="flex items-center space-x-2 mb-1">
                    <Users className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-medium text-blue-300">{t('totalPlayers', 'Người chơi')}</h4>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{playerCount}</p>
                </div>

                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-3 border border-green-500/30">
                  <div className="flex items-center space-x-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <h4 className="text-xs font-medium text-green-300">{t('answered', 'Đã trả lời')}</h4>
                  </div>
                  <p className="text-2xl font-bold text-green-400">{answeredCount}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-3 border border-purple-500/30">
                  <div className="flex items-center space-x-2 mb-1">
                    <Target className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-medium text-purple-300">{t('correctRate', 'Tỷ lệ đúng')}</h4>
                  </div>
                  <p className="text-2xl font-bold text-purple-400">
                    {answeredCount > 0
                      ? Math.round((questionState.correctCount / answeredCount) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
              
              {/* 🆕 LIVE MODE: Player Status Grid - Lưới trạng thái người chơi */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center space-x-2 mb-4">
                  <Users className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">{t('playerStatus', 'Trạng thái người chơi')}</h3>
                </div>
                
                {/* Player Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {Object.values(players)
                    .filter(p => p.role === 'player')
                    .map((p) => {
                      const hasAnswered = p.hasAnswered;
                      return (
                        <motion.div
                          key={p.id}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`relative flex flex-col items-center p-2 rounded-xl transition-all duration-300 ${
                            hasAnswered
                              ? 'bg-green-500/20 border-2 border-green-500/50'
                              : 'bg-yellow-500/10 border-2 border-yellow-500/30 animate-pulse'
                          }`}
                        >
                          {/* Avatar */}
                          {p.photoURL ? (
                            <img
                              src={p.photoURL}
                              alt={p.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold border-2 border-white/20">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          
                          {/* Name */}
                          <p className="text-xs text-white/80 font-medium mt-1 truncate max-w-full">
                            {p.name.split(' ')[0]}
                          </p>
                          
                          {/* Status Icon */}
                          <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                            hasAnswered ? 'bg-green-500' : 'bg-yellow-500'
                          }`}>
                            {hasAnswered ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500 }}
                              >
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </motion.div>
                            ) : (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                              />
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-green-300">{t('answered', 'Đã trả lời')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
                    <span className="text-yellow-300">{t('thinking', 'Đang suy nghĩ')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Live Leaderboard Sidebar (1 col) */}
            <div className="xl:col-span-1">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 sticky top-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-bold text-white">{t('leaderboard', 'Bảng xếp hạng')}</h3>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {liveLeaderboard.map((entry, index) => {
                    const player = players[entry.playerId];
                    const isTopThree = index < 3;
                    const medalColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];

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
                        }`}
                      >
                        {/* Rank */}
                        <div className="w-6 text-center flex-shrink-0">
                          {isTopThree ? (
                            <Medal className={`w-5 h-5 ${medalColors[index]}`} />
                          ) : (
                            <span className="text-sm text-gray-400 font-bold">{entry.rank}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {entry.photoURL || player?.photoURL ? (
                            <img
                              src={entry.photoURL || player?.photoURL}
                              alt={entry.playerName}
                              className="w-8 h-8 rounded-full object-cover border-2 border-white/20"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white/20">
                              {entry.playerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {/* Streak indicator */}
                          {(player?.streak || entry.streak) >= 3 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                              <Flame className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Name & Score */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">
                            {entry.playerName}
                          </p>
                          <div className="flex items-center space-x-1 text-xs">
                            <span className="text-gray-400">
                              {entry.correctAnswers}/{entry.totalAnswers}
                            </span>
                            {entry.streak >= 3 && (
                              <span className="text-orange-400 flex items-center">
                                <Flame className="w-3 h-3 mr-0.5" />
                                {entry.streak}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-yellow-400">{entry.score}</p>
                          {entry.scoreChange > 0 && (
                            <p className="text-xs text-green-400">+{entry.scoreChange}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {liveLeaderboard.length === 0 && (
                    <div className="text-center py-8">
                      <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">{t('noPlayersYet', 'Chưa có người chơi')}</p>
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

export default SpectatorGameView;
