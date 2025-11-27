/**
 * 🆓 FREE MODE PLAYER VIEW
 * Individual player view for free mode gameplay
 * Each player progresses through questions at their own pace
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  Trophy,
  CheckCircle,
  XCircle,
  Flame,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { 
  ModernPlayer, 
  GameState,
  PowerUpType,
  STREAK_BONUSES 
} from '../../types/game.types';
import { gameEngine } from '../../services/gameEngine';
import QuestionRenderer from './QuestionRenderer';
import StreakIndicator from './StreakIndicator';
import { Question } from '../../../../quiz/types';

interface FreeModePlayerViewProps {
  roomId: string;
  player: ModernPlayer;
  gameState: GameState;
}

const FreeModePlayerView: React.FC<FreeModePlayerViewProps> = ({
  roomId,
  player,
  gameState,
}) => {
  const { t } = useTranslation('multiplayer');
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [activePowerUps] = useState<PowerUpType[]>([]);
  
  // 🆓 SELF-PACED MODE: Per-question timer (30s độc lập client)
  const timePerQuestion = gameState.settings?.timePerQuestion || 30;
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(timePerQuestion);

  // 🆓 FREE MODE: Get individual player state
  const freeMode = player.freeMode;
  const currentQuestionIndex = freeMode?.currentQuestionIndex ?? 0;
  const isFinished = player.status === 'finished' || !!freeMode?.finishedAt;
  
  // Get current question from gameState.questions array
  const currentQuestion: Question | undefined = gameState.questions?.[currentQuestionIndex];
  const totalQuestions = gameState.totalQuestions || gameState.questions?.length || 0;

  // Format time as seconds
  const formatTimeSeconds = (seconds: number) => {
    return `${seconds}s`;
  };

  // Progress percentage
  const progressPercentage = totalQuestions > 0 
    ? (currentQuestionIndex / totalQuestions) * 100 
    : 0;

  // Timer percentage for per-question timer
  const timerPercentage = (questionTimeRemaining / timePerQuestion) * 100;

  // Timer color based on time remaining
  const timerColor = useMemo(() => {
    if (timerPercentage > 50) return 'from-green-500 to-emerald-500';
    if (timerPercentage > 25) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  }, [timerPercentage]);

  // 🆓 SELF-PACED: Per-question timer countdown (client-side)
  useEffect(() => {
    // Reset timer when question changes
    setQuestionTimeRemaining(timePerQuestion);
  }, [currentQuestionIndex, timePerQuestion]);
  
  useEffect(() => {
    if (isFinished || showResult || !currentQuestion) return;
    
    const timer = setInterval(() => {
      setQuestionTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-skip when time runs out
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [currentQuestionIndex, isFinished, showResult, currentQuestion]);
  
  // Auto-submit/skip when per-question timer runs out
  useEffect(() => {
    if (questionTimeRemaining === 0 && !isSubmitting && !showResult && currentQuestion) {
      // Auto-skip this question (no answer)
      handleSkip();
    }
  }, [questionTimeRemaining]);

  // Reset answer state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCorrect(null);
    setPointsEarned(0);
  }, [currentQuestionIndex]);

  // ============= ANSWER HANDLING =============
  const handleAnswerChange = useCallback((answer: any) => {
    if (isSubmitting || showResult) return;
    setSelectedAnswer(answer);
  }, [isSubmitting, showResult]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !selectedAnswer || showResult) return;

    try {
      setIsSubmitting(true);
      
      // Submit answer for free mode
      await gameEngine.submitFreeModeAnswer(
        roomId, 
        player.id, 
        currentQuestionIndex, 
        selectedAnswer, 
        activePowerUps
      );
      
      // Show result briefly
      setShowResult(true);
      
      // Auto-advance to next question after 1.5s
      setTimeout(() => {
        setShowResult(false);
        setSelectedAnswer(null);
      }, 1500);
      
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [roomId, player.id, currentQuestionIndex, selectedAnswer, activePowerUps, showResult, isSubmitting]);

  // ============= SKIP QUESTION =============
  const handleSkip = useCallback(async () => {
    if (isSubmitting || showResult) return;
    
    try {
      setIsSubmitting(true);
      // Submit null answer (skip)
      await gameEngine.submitFreeModeAnswer(
        roomId,
        player.id,
        currentQuestionIndex,
        null,
        []
      );
    } catch (error) {
      console.error('Failed to skip question:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [roomId, player.id, currentQuestionIndex, showResult, isSubmitting]);

  // ============= STREAK BONUS =============
  const nextStreakBonus = useMemo(() => {
    return STREAK_BONUSES.find(b => b.streak > player.streak);
  }, [player.streak]);

  // ============= RENDER FINISHED STATE =============
  if (isFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 text-center max-w-md"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ duration: 0.5 }}
          >
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-white mb-2">{t('completed', 'Completed!')}</h2>
          <p className="text-purple-200 mb-6">{t('allQuestionsAnswered', 'You answered all questions')}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-purple-200 text-sm">{t('score', 'Score')}</p>
              <p className="text-3xl font-bold text-white">{player.score}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-purple-200 text-sm">{t('accuracy', 'Accuracy')}</p>
              <p className="text-3xl font-bold text-green-400">
                {player.totalAnswers > 0 
                  ? Math.round((player.correctAnswers / player.totalAnswers) * 100)
                  : 0}%
              </p>
            </div>
          </div>
          
          <p className="text-purple-200 text-sm">
            {t('waitingForOthers', 'Waiting for other players...')}
          </p>
          <Loader2 className="w-6 h-6 text-purple-400 mx-auto mt-4 animate-spin" />
        </motion.div>
      </div>
    );
  }

  // ============= RENDER LOADING STATE =============
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
          <p>{t('loadingQuestion', 'Loading question...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Header with Time and Progress */}
      <div className="sticky top-0 z-10 bg-black/30 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-4xl mx-auto p-4">
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/70 text-sm">
              {t('questionProgress', 'Question {{current}} / {{total}}', { current: currentQuestionIndex + 1, total: totalQuestions })}
            </span>
            <span className="text-white/70 text-sm">
              {Math.round(progressPercentage)}% {t('complete', 'complete')}
            </span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Timer and Score */}
          <div className="flex items-center justify-between">
            {/* Per-question timer (30s độc lập client) */}
            <div className="flex items-center space-x-3">
              <div className={`px-4 py-2 rounded-xl bg-gradient-to-r ${timerColor} flex items-center space-x-2`}>
                <Clock className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-lg">
                  {formatTimeSeconds(questionTimeRemaining)}
                </span>
              </div>
              {timerPercentage < 25 && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                >
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </motion.div>
              )}
            </div>

            {/* Score and Streak */}
            <div className="flex items-center space-x-4">
              {player.streak >= 2 && (
                <StreakIndicator streak={player.streak} />
              )}
              <div className="flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-xl">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-bold">{player.score}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {/* Question Renderer */}
            <QuestionRenderer
              question={currentQuestion}
              value={selectedAnswer}
              onChange={handleAnswerChange}
              disabled={isSubmitting || showResult}
              activePowerUps={activePowerUps}
            />

            {/* Result Feedback */}
            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`mt-4 p-4 rounded-xl ${
                    isCorrect 
                      ? 'bg-green-500/20 border border-green-500/50' 
                      : 'bg-red-500/20 border border-red-500/50'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-3">
                    {isCorrect ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-green-400" />
                        <div className="text-center">
                          <p className="text-green-400 font-bold text-lg">{t('correct', 'Correct!')}</p>
                          <p className="text-green-300 text-sm">+{pointsEarned} {t('points', 'points')}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-8 h-8 text-red-400" />
                        <p className="text-red-400 font-bold text-lg">{t('wrong', 'Wrong!')}</p>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            {!showResult && (
              <div className="mt-6 flex items-center justify-between">
                {/* Skip Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white/70 rounded-xl transition-colors disabled:opacity-50"
                >
                  {t('skip', 'Skip')}
                </motion.button>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: selectedAnswer ? 1.05 : 1 }}
                  whileTap={{ scale: selectedAnswer ? 0.95 : 1 }}
                  onClick={handleSubmit}
                  disabled={!selectedAnswer || isSubmitting}
                  className={`flex items-center space-x-2 px-8 py-3 rounded-xl font-bold transition-all ${
                    selectedAnswer && !isSubmitting
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>{t('answer', 'Answer')}</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Streak Bonus Hint */}
      {player.streak > 0 && nextStreakBonus && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-4 bg-orange-500/20 backdrop-blur-lg rounded-xl p-3 flex items-center space-x-2"
        >
          <Flame className="w-5 h-5 text-orange-400" />
          <span className="text-orange-200 text-sm">
            {t('streakHint', '{{count}} more for x{{multiplier}} bonus!', { 
              count: nextStreakBonus.streak - player.streak, 
              multiplier: nextStreakBonus.multiplier 
            })}
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default FreeModePlayerView;
