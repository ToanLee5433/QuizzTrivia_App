/**
 * 🎮 PLAYER GAME VIEW
 * Modern multiplayer game interface for players
 * Supports all question types with streak system and power-ups
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Trophy,
  CheckCircle,
  XCircle,
  Flame,
  TrendingUp,
} from 'lucide-react';
import { 
  ModernPlayer, 
  QuestionState, 
  PowerUpType,
  STREAK_BONUSES 
} from '../../types/game.types';
import { gameEngine } from '../../services/gameEngine';
import QuestionRenderer from './QuestionRenderer';
import PowerUpPanel from './PowerUpPanel';
import StreakIndicator from './StreakIndicator';

interface PlayerGameViewProps {
  roomId: string;
  player: ModernPlayer;
  questionState: QuestionState;
  onAnswerSubmit?: (answer: any) => void; // Optional - used by GameCoordinator
}

const PlayerGameView: React.FC<PlayerGameViewProps> = ({
  roomId,
  player,
  questionState,
  onAnswerSubmit: _onAnswerSubmit, // Reserved for future use
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [activePowerUps, setActivePowerUps] = useState<PowerUpType[]>([]);
  const [timeLeft, setTimeLeft] = useState(questionState?.timeRemaining || 30);

  // Guard: Check if question data is ready (after hooks)
  const hasQuestionData = questionState?.question?.text && questionState?.question?.answers;

  // ============= TIMER =============
  useEffect(() => {
    setTimeLeft(questionState.timeRemaining);
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          // Auto submit when time runs out
          if (!player.hasAnswered && selectedAnswer) {
            handleSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [questionState.timeRemaining, questionState.questionIndex]);

  // ============= ANSWER HANDLING =============
  const handleAnswerChange = useCallback((answer: any) => {
    if (player.hasAnswered || isSubmitting) return;
    setSelectedAnswer(answer);
  }, [player.hasAnswered, isSubmitting]);

  const handleSubmit = async () => {
    if (player.hasAnswered || isSubmitting || !selectedAnswer) return;

    try {
      setIsSubmitting(true);
      await gameEngine.submitAnswer(roomId, player.id, selectedAnswer, activePowerUps);
      
      // Show feedback (will be updated by real-time listener)
      setShowResult(true);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Listen to player updates to show result
  useEffect(() => {
    if (player.hasAnswered && player.currentAnswer) {
      const answer = questionState.answers[player.id];
      if (answer) {
        setIsCorrect(answer.isCorrect);
        setPointsEarned(answer.points + (answer.streakBonus || 0));
        setShowResult(true);
      }
    }
  }, [player.hasAnswered, player.currentAnswer, questionState.answers]);

  // ============= POWER-UPS =============
  const handlePowerUpUse = useCallback(async (powerUpType: PowerUpType) => {
    try {
      await gameEngine.usePowerUp(roomId, player.id, powerUpType);
      setActivePowerUps(prev => [...prev, powerUpType]);
      
      // Apply power-up effects
      switch (powerUpType) {
        case 'time_freeze':
          // Freeze timer for 5 seconds (handled by game engine)
          break;
        case 'fifty_fifty':
          // Will be handled by QuestionRenderer
          break;
        case 'reveal_answer':
          // Show hint for 3 seconds
          break;
      }
    } catch (error) {
      console.error('Failed to use power-up:', error);
    }
  }, [roomId, player.id]);

  // ============= UI STATES =============
  const timePercentage = useMemo(() => {
    return (timeLeft / questionState.timeLimit) * 100;
  }, [timeLeft, questionState.timeLimit]);

  const timerColor = useMemo(() => {
    if (timePercentage > 50) return 'bg-green-500';
    if (timePercentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  }, [timePercentage]);

  const canSubmit = useMemo(() => {
    return !player.hasAnswered && !isSubmitting && selectedAnswer !== null;
  }, [player.hasAnswered, isSubmitting, selectedAnswer]);

  // ============= STREAK BONUS DISPLAY =============
  const nextStreakBonus = useMemo(() => {
    return STREAK_BONUSES.find(b => b.streak > player.streak);
  }, [player.streak]);

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
          <p className="text-white text-lg">Đang tải câu hỏi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* ============= HEADER: Stats & Timer ============= */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-4">
            {/* Score */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-4 border border-yellow-500/30"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-500/20 rounded-xl">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-yellow-300/70 font-medium">Điểm</p>
                  <p className="text-2xl font-bold text-yellow-400">{player.score.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>

            {/* Streak */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className={`rounded-2xl p-4 border ${
                player.streak >= 3
                  ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30'
                  : 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-500/30'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${player.streak >= 3 ? 'bg-orange-500/20' : 'bg-gray-500/20'}`}>
                  <Flame className={`w-6 h-6 ${player.streak >= 3 ? 'text-orange-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-300/70 font-medium">Streak</p>
                  <div className="flex items-center space-x-2">
                    <p className={`text-2xl font-bold ${player.streak >= 3 ? 'text-orange-400' : 'text-gray-400'}`}>
                      {player.streak}
                    </p>
                    {nextStreakBonus && (
                      <p className="text-xs text-gray-400">→ {nextStreakBonus.streak}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Timer */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className={`rounded-2xl p-4 border ${
                timeLeft <= 5 ? 'animate-pulse' : ''
              } ${
                timePercentage > 50 
                  ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30'
                  : timePercentage > 25
                  ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
                  : 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/30'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${
                  timePercentage > 50 ? 'bg-green-500/20' : timePercentage > 25 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                }`}>
                  <Clock className={`w-6 h-6 ${
                    timePercentage > 50 ? 'text-green-400' : timePercentage > 25 ? 'text-yellow-400' : 'text-red-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-300/70 font-medium">Thời gian</p>
                  <p className={`text-2xl font-bold ${
                    timePercentage > 50 ? 'text-green-400' : timePercentage > 25 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {timeLeft}s
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Timer Progress Bar */}
          <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${timerColor}`}
              initial={{ width: '100%' }}
              animate={{ width: `${timePercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* ============= MAIN CONTENT ============= */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ============= QUESTION AREA (Main) ============= */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {!showResult ? (
                  <motion.div
                    key="question"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    {/* Question Header */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
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
                      
                      {/* Question Media */}
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

                    {/* Streak Indicator */}
                    {player.streak >= 3 && (
                      <StreakIndicator streak={player.streak} className="mb-6" />
                    )}

                    {/* Question Renderer */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                      <QuestionRenderer
                        question={questionState.question}
                        value={selectedAnswer}
                        onChange={handleAnswerChange}
                        disabled={player.hasAnswered || isSubmitting}
                        activePowerUps={activePowerUps}
                      />
                    </div>

                    {/* Submit Button */}
                    {!player.hasAnswered && (
                      <motion.button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        whileHover={canSubmit ? { scale: 1.02 } : {}}
                        whileTap={canSubmit ? { scale: 0.98 } : {}}
                        className={`w-full mt-6 py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-200 ${
                          canSubmit
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-xl hover:shadow-2xl'
                            : 'bg-gray-500/20 text-gray-500 cursor-not-allowed border border-gray-500/30'
                        }`}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center justify-center space-x-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                            <span>Đang gửi...</span>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center space-x-2">
                            <CheckCircle className="w-5 h-5" />
                            <span>Xác nhận đáp án</span>
                          </span>
                        )}
                      </motion.button>
                    )}
                  </motion.div>
                ) : (
                  // ============= ANSWER RESULT =============
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`bg-gradient-to-br rounded-3xl p-8 border-2 ${
                      isCorrect
                        ? 'from-green-500/20 to-emerald-500/20 border-green-500/50'
                        : 'from-red-500/20 to-pink-500/20 border-red-500/50'
                    }`}
                  >
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
                          isCorrect ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle className="w-16 h-16 text-white" />
                        ) : (
                          <XCircle className="w-16 h-16 text-white" />
                        )}
                      </motion.div>

                      <h3 className={`text-4xl font-bold mb-4 ${
                        isCorrect ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isCorrect ? 'Chính xác!' : 'Sai rồi!'}
                      </h3>

                      {isCorrect && (
                        <>
                          <div className="flex items-center justify-center space-x-2 mb-4">
                            <Trophy className="w-8 h-8 text-yellow-400" />
                            <span className="text-5xl font-bold text-yellow-400">
                              +{pointsEarned}
                            </span>
                            <span className="text-2xl text-yellow-400/70">điểm</span>
                          </div>

                          {questionState.answers[player.id]?.streakBonus && (
                            <div className="flex items-center justify-center space-x-2 text-orange-400 mb-4">
                              <Flame className="w-6 h-6" />
                              <span className="text-lg font-semibold">
                                Streak bonus: +{questionState.answers[player.id].streakBonus}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Explanation */}
                      {questionState.question.explanation && (
                        <div className="mt-6 p-4 bg-white/10 rounded-xl">
                          <p className="text-sm font-semibold text-white mb-2">Giải thích:</p>
                          <p className="text-gray-300">{questionState.question.explanation}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ============= SIDEBAR ============= */}
            <div className="space-y-6">
              {/* Power-ups Panel */}
              {!player.hasAnswered && (
                <PowerUpPanel
                  player={player}
                  onPowerUpUse={handlePowerUpUse}
                  activePowerUps={activePowerUps}
                />
              )}

              {/* Player Stats */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h3 className="text-lg font-bold text-white mb-4">Thống kê của bạn</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Độ chính xác</span>
                    <span className="text-white font-bold">
                      {player.totalAnswers > 0
                        ? Math.round((player.correctAnswers / player.totalAnswers) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Câu đúng</span>
                    <span className="text-green-400 font-bold">
                      {player.correctAnswers}/{player.totalAnswers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Streak tốt nhất</span>
                    <span className="text-orange-400 font-bold flex items-center space-x-1">
                      <Flame className="w-4 h-4" />
                      <span>{player.maxStreak}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Thời gian TB</span>
                    <span className="text-blue-400 font-bold">
                      {(player.avgResponseTime / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Streak Bonus */}
              {nextStreakBonus && player.streak >= 3 && (
                <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl p-6 border border-orange-500/30">
                  <div className="flex items-center space-x-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                    <h3 className="text-lg font-bold text-orange-400">Streak tiếp theo</h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    Trả lời đúng <span className="text-orange-400 font-bold">
                      {nextStreakBonus.streak - player.streak}
                    </span> câu nữa để:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">Hệ số nhân:</span>
                      <span className="text-orange-400 font-bold">x{nextStreakBonus.multiplier}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">Thưởng:</span>
                      <span className="text-yellow-400 font-bold">+{nextStreakBonus.bonusPoints}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerGameView;
