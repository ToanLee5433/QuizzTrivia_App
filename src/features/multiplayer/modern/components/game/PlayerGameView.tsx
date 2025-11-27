/**
 * 🎮 PLAYER GAME VIEW
 * Modern multiplayer game interface for players
 * Supports all question types with streak system and power-ups
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  Trophy,
  CheckCircle,
  XCircle,
  Flame,
  TrendingUp,
  Loader2,
  Users,
} from 'lucide-react';
import { 
  ModernPlayer, 
  QuestionState, 
  PowerUpType,
  STREAK_BONUSES 
} from '../../types/game.types';
import { gameEngine } from '../../services/gameEngine';
import soundService from '../../../services/soundService';
import QuestionRenderer from './QuestionRenderer';
import PowerUpPanel from './PowerUpPanel';
import StreakIndicator from './StreakIndicator';

interface PlayerGameViewProps {
  roomId: string;
  player: ModernPlayer;
  questionState: QuestionState;
  gameStatus?: string; // 'answering' | 'reviewing' | 'leaderboard' - để biết phase hiện tại
  onAnswerSubmit?: (answer: any) => void; // Optional - used by GameCoordinator
}

const PlayerGameView: React.FC<PlayerGameViewProps> = ({
  roomId,
  player,
  questionState,
  gameStatus = 'answering', // Default to answering phase
  onAnswerSubmit: _onAnswerSubmit, // Reserved for future use
}) => {
  const { t } = useTranslation('multiplayer');
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [activePowerUps, setActivePowerUps] = useState<PowerUpType[]>([]);
  
  // ✅ OPTIMIZED: Use server time directly instead of local countdown
  // This ensures all clients are perfectly synced with server
  const timeLeft = questionState?.timeRemaining ?? 30;

  // Guard: Check if question data is ready (after hooks)
  const hasQuestionData = questionState?.question?.text && questionState?.question?.answers;

  // ✅ REMOVED: Local timer - now using server timeRemaining directly
  // Server updates timeRemaining every second via RTDB
  // All clients receive the same value = perfect sync
  
  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCorrect(null);
    setPointsEarned(0);
  }, [questionState?.questionIndex]);

  // ============= ANSWER HANDLING =============
  // ✅ MODERN UX: Auto-submit khi click đáp án (không cần nút xác nhận)
  const handleAnswerSelect = useCallback(async (answer: any) => {
    if (player.hasAnswered || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      setSelectedAnswer(answer);
      
      // Auto-submit ngay khi chọn
      await gameEngine.submitAnswer(roomId, player.id, answer, activePowerUps);
      
      // ✅ FIX: Không set showResult ngay, chỉ đợi cho đến Revealing Phase
      // Result sẽ được hiện khi gameStatus === 'reviewing'
    } catch (error) {
      console.error('Failed to submit answer:', error);
      // Reset selected nếu submit fail
      setSelectedAnswer(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [roomId, player.id, player.hasAnswered, isSubmitting, activePowerUps]);
  
  // Auto-submit when time runs out (if player hasn't answered yet)
  useEffect(() => {
    // Không cần auto-submit với selectedAnswer nữa vì đã auto-submit khi click
    // Server sẽ handle timeout cho người không trả lời
  }, []);

  // ✅ FIX: Chỉ hiện result khi vào Revealing Phase (gameStatus === 'reviewing')
  // Live Mode 3 phases: Answering → Revealing → Leaderboard
  const isRevealingPhase = gameStatus === 'reviewing';
  
  // Listen to player updates to prepare result (but only show during revealing)
  useEffect(() => {
    if (player.hasAnswered && player.currentAnswer) {
      const answer = questionState.answers[player.id];
      if (answer) {
        setIsCorrect(answer.isCorrect);
        setPointsEarned(answer.points + (answer.streakBonus || 0));
        // ✅ FIX: Chỉ show result khi đang ở Revealing Phase
        if (isRevealingPhase) {
          setShowResult(true);
        }
      }
    }
  }, [player.hasAnswered, player.currentAnswer, questionState.answers, player.id, isRevealingPhase]);

  // ✅ NEW: Khi vào Revealing Phase, show result
  useEffect(() => {
    if (isRevealingPhase && player.hasAnswered && isCorrect !== null) {
      setShowResult(true);
    }
  }, [isRevealingPhase, player.hasAnswered, isCorrect]);

  // 🔊 SFX: Tick tắc khi còn 5s cuối (Live Mode tension)
  const lastTickRef = useRef<number>(-1);
  useEffect(() => {
    // Chỉ play tick khi đang ở Answering phase và chưa trả lời
    if (gameStatus === 'answering' && !player.hasAnswered && timeLeft <= 5 && timeLeft > 0) {
      // Tránh play nhiều lần cho cùng 1 giây
      if (lastTickRef.current !== timeLeft) {
        lastTickRef.current = timeLeft;
        soundService.play('tick');
      }
    }
  }, [timeLeft, gameStatus, player.hasAnswered]);

  // 🔊 SFX: Transition sound khi vào Revealing Phase
  const hasPlayedRevealSound = useRef(false);
  useEffect(() => {
    if (isRevealingPhase && !hasPlayedRevealSound.current) {
      hasPlayedRevealSound.current = true;
      // Play correct/wrong sound based on result
      if (isCorrect === true) {
        soundService.play('correct');
      } else if (isCorrect === false) {
        soundService.play('wrong');
      } else {
        soundService.play('transition');
      }
    }
    // Reset khi chuyển câu mới
    if (!isRevealingPhase) {
      hasPlayedRevealSound.current = false;
    }
  }, [isRevealingPhase, isCorrect]);

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
                  <p className="text-xs text-yellow-300/70 font-medium">{t('game.score')}</p>
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
                  <p className="text-xs text-gray-300/70 font-medium">{t('game.streak')}</p>
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
                  <p className="text-xs text-gray-300/70 font-medium">{t('game.timeRemaining')}</p>
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
                        onChange={handleAnswerSelect}
                        disabled={player.hasAnswered || isSubmitting}
                        activePowerUps={activePowerUps}
                      />
                    </div>

                    {/* Submitting Indicator (replaces Submit Button) */}
                    {isSubmitting && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 flex items-center justify-center space-x-3 text-blue-400"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"
                        />
                        <span className="text-lg font-medium">{t('game.submitting')}</span>
                      </motion.div>
                    )}
                  </motion.div>
                ) : player.hasAnswered && !isRevealingPhase ? (
                  // ============= WAITING STATE (LIVE MODE - PHASE 1) =============
                  // ✅ Đã gửi đáp án, đang chờ người khác - CHƯA BIẾT ĐÚNG/SAI
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-3xl p-8 border-2 border-blue-500/50"
                  >
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                        transition={{ type: 'spring', stiffness: 200, rotate: { repeat: Infinity, duration: 2 } }}
                        className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-blue-500"
                      >
                        <Clock className="w-16 h-16 text-white" />
                      </motion.div>

                      <h3 className="text-3xl font-bold mb-4 text-blue-400">
                        {t('game.answerSubmitted')}
                      </h3>
                      
                      <p className="text-xl text-blue-300/80 mb-6">
                        {t('game.waitingForOpponents')}
                      </p>

                      {/* Timer countdown */}
                      <div className="flex items-center justify-center space-x-3 mb-4">
                        <Clock className="w-5 h-5 text-blue-400" />
                        <span className="text-2xl font-mono text-blue-300">{timeLeft}s</span>
                      </div>

                      {/* Answer count indicator */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-4 p-4 bg-white/10 rounded-xl"
                      >
                        <div className="flex items-center justify-center space-x-3">
                          <Users className="w-5 h-5 text-blue-400" />
                          <span className="text-blue-200">
                            {questionState.answerCount > 0 
                              ? t('game.playersAnswered', { count: questionState.answerCount })
                              : t('game.youAreFirst')
                            }
                          </span>
                          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                        </div>
                      </motion.div>

                      {/* Suspense message */}
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="mt-6 text-gray-400 text-sm"
                      >
                        {t('game.resultsWhenAllFinish')}
                      </motion.p>
                    </div>
                  </motion.div>
                ) : (
                  // ============= RESULT STATE (LIVE MODE - REVEALING PHASE) =============
                  // ✅ Hiện kết quả đúng/sai + điểm
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
                        {isCorrect ? t('game.correct') : t('game.incorrect')}
                      </h3>

                      {isCorrect && (
                        <>
                          <div className="flex items-center justify-center space-x-2 mb-4">
                            <Trophy className="w-8 h-8 text-yellow-400" />
                            <span className="text-5xl font-bold text-yellow-400">
                              +{pointsEarned}
                            </span>
                            <span className="text-2xl text-yellow-400/70">{t('points')}</span>
                          </div>

                          {questionState.answers?.[player.id]?.streakBonus && (
                            <div className="flex items-center justify-center space-x-2 text-orange-400 mb-4">
                              <Flame className="w-6 h-6" />
                              <span className="text-lg font-semibold">
                                {t('game.streakBonus')}: +{questionState.answers[player.id].streakBonus}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Explanation */}
                      {questionState.question.explanation && (
                        <div className="mt-6 p-4 bg-white/10 rounded-xl">
                          <p className="text-sm font-semibold text-white mb-2">{t('game.explanation')}:</p>
                          <p className="text-gray-300">{questionState.question.explanation}</p>
                        </div>
                      )}
                      
                      {/* Revealing Phase indicator */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-6 p-3 bg-white/10 rounded-xl border border-white/20"
                      >
                        <div className="flex items-center justify-center space-x-2 text-gray-300">
                          <span>{t('game.movingToNext')}</span>
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      </motion.div>
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
                <h3 className="text-lg font-bold text-white mb-4">{t('game.yourStats')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">{t('accuracy')}</span>
                    <span className="text-white font-bold">
                      {player.totalAnswers > 0
                        ? Math.round((player.correctAnswers / player.totalAnswers) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">{t('game.correctAnswers')}</span>
                    <span className="text-green-400 font-bold">
                      {player.correctAnswers}/{player.totalAnswers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">{t('bestStreak')}</span>
                    <span className="text-orange-400 font-bold flex items-center space-x-1">
                      <Flame className="w-4 h-4" />
                      <span>{player.maxStreak}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">{t('avgTime')}</span>
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
                    <h3 className="text-lg font-bold text-orange-400">{t('game.nextStreak')}</h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    {t('game.answerCorrectlyMore', { count: nextStreakBonus.streak - player.streak })}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{t('game.multiplier')}:</span>
                      <span className="text-orange-400 font-bold">x{nextStreakBonus.multiplier}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{t('game.bonus')}:</span>
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
