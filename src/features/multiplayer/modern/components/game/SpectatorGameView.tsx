/**
 * 👁️ SPECTATOR GAME VIEW
 * Real-time statistics view for spectators
 * Shows answer distribution and player stats
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Users, TrendingUp, Clock, Target } from 'lucide-react';
import { QuestionState, ModernPlayer } from '../../types/game.types';
import { gameEngine } from '../../services/gameEngine';
import { Answer } from '../../../../quiz/types';

interface SpectatorGameViewProps {
  roomId: string;
  questionState: QuestionState;
  players: Record<string, ModernPlayer>;
}

const SpectatorGameView: React.FC<SpectatorGameViewProps> = ({
  roomId,
  questionState,
  players,
}) => {
  const [spectatorData, setSpectatorData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(questionState.timeRemaining);

  // Update timer
  useEffect(() => {
    setTimeLeft(questionState.timeRemaining);
    
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [questionState.timeRemaining, questionState.questionIndex]);

  // Fetch spectator view data
  useEffect(() => {
    const fetchData = async () => {
      const data = await gameEngine.getSpectatorViewData(roomId);
      setSpectatorData(data);
    };

    fetchData();
    const interval = setInterval(fetchData, 1000); // Update every second

    return () => clearInterval(interval);
  }, [roomId, questionState.questionIndex]);

  if (!spectatorData) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white text-lg">Đang tải...</p>
        </div>
      </div>
    );
  }

  const playerCount = Object.values(players).filter(p => p.role === 'player').length;
  const answeredCount = spectatorData.totalAnswered;
  const progressPercent = playerCount > 0 ? (answeredCount / playerCount) * 100 : 0;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* ============= HEADER ============= */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Eye className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Chế độ xem</h2>
                <p className="text-sm text-gray-400">Theo dõi trận đấu real-time</p>
              </div>
            </div>

            {/* Timer */}
            <div className={`px-6 py-3 rounded-2xl border-2 ${
              timeLeft <= 5
                ? 'bg-red-500/20 border-red-500/50 animate-pulse'
                : timeLeft <= 10
                ? 'bg-yellow-500/20 border-yellow-500/50'
                : 'bg-green-500/20 border-green-500/50'
            }`}>
              <div className="flex items-center space-x-3">
                <Clock className={`w-6 h-6 ${
                  timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-yellow-400' : 'text-green-400'
                }`} />
                <span className={`text-3xl font-bold ${
                  timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Người chơi đã trả lời</span>
              <span className="text-white font-bold">{answeredCount}/{playerCount}</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
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
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Question Display */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium border border-blue-500/30">
                    Câu {questionState.questionIndex + 1}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    questionState.question.difficulty === 'easy'
                      ? 'bg-green-500/20 text-green-300 border-green-500/30'
                      : questionState.question.difficulty === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}>
                    {questionState.question.difficulty === 'easy' ? 'Dễ' :
                     questionState.question.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white leading-tight">
                  {questionState.question.text}
                </h2>
              </div>
            </div>

            {questionState.question.imageUrl && (
              <div className="mt-4">
                <img
                  src={questionState.question.imageUrl}
                  alt="Question"
                  className="w-full rounded-xl object-cover max-h-80"
                />
              </div>
            )}
          </div>

          {/* Answer Distribution */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-2 mb-6">
              <Target className="w-5 h-5 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Phân bố câu trả lời</h3>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {questionState.question.answers.map((answer: Answer, index: number) => {
                  const distribution = spectatorData.answerDistribution.find(
                    (d: any) => d.answerId === answer.id
                  );
                  const count = distribution?.count || 0;
                  const percentage = distribution?.percentage || 0;
                  const playerList = distribution?.players || [];
                  const letter = String.fromCharCode(65 + index);

                  return (
                    <motion.div
                      key={answer.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`relative overflow-hidden rounded-2xl border-2 ${
                        answer.isCorrect
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      {/* Background Bar */}
                      <motion.div
                        className={`absolute inset-0 ${
                          answer.isCorrect
                            ? 'bg-gradient-to-r from-green-500/20 to-transparent'
                            : 'bg-gradient-to-r from-blue-500/20 to-transparent'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />

                      {/* Content */}
                      <div className="relative p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4 flex-1">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                              answer.isCorrect
                                ? 'bg-green-500 text-white'
                                : count > 0
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/10 text-white/50'
                            }`}>
                              {letter}
                            </div>
                            <div className="flex-1">
                              <p className="text-lg text-white font-medium leading-tight">
                                {answer.text}
                              </p>
                              {answer.isCorrect && (
                                <span className="inline-block mt-1 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                                  ✓ Đáp án đúng
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right ml-4">
                            <p className="text-3xl font-bold text-white">{percentage}%</p>
                            <p className="text-sm text-gray-400">{count} người</p>
                          </div>
                        </div>

                        {/* Player Avatars */}
                        {playerList.length > 0 && (
                          <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-white/10">
                            <Users className="w-4 h-4 text-gray-400" />
                            <div className="flex items-center -space-x-2 flex-1">
                              {playerList.slice(0, 10).map((player: any) => (
                                <div
                                  key={player.id}
                                  className="relative group"
                                  title={player.name}
                                >
                                  {player.photoURL ? (
                                    <img
                                      src={player.photoURL}
                                      alt={player.name}
                                      className="w-8 h-8 rounded-full border-2 border-gray-900 object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full border-2 border-gray-900 bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                      {player.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {playerList.length > 10 && (
                                <div className="w-8 h-8 rounded-full border-2 border-gray-900 bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
                                  +{playerList.length - 10}
                                </div>
                              )}
                            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-6 border border-blue-500/30">
              <div className="flex items-center space-x-3 mb-2">
                <Users className="w-6 h-6 text-blue-400" />
                <h4 className="text-sm font-medium text-blue-300">Tổng người chơi</h4>
              </div>
              <p className="text-4xl font-bold text-blue-400">{playerCount}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-green-500/30">
              <div className="flex items-center space-x-3 mb-2">
                <TrendingUp className="w-6 h-6 text-green-400" />
                <h4 className="text-sm font-medium text-green-300">Đã trả lời</h4>
              </div>
              <p className="text-4xl font-bold text-green-400">{answeredCount}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center space-x-3 mb-2">
                <Target className="w-6 h-6 text-purple-400" />
                <h4 className="text-sm font-medium text-purple-300">Tỷ lệ đúng</h4>
              </div>
              <p className="text-4xl font-bold text-purple-400">
                {playerCount > 0
                  ? Math.round((questionState.correctCount / answeredCount) * 100) || 0
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpectatorGameView;
