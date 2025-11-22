import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Timer,
  Zap,
  Trophy,
  Target,
  CheckCircle,
  XCircle,
  Users,
  BarChart3
} from 'lucide-react';
import { modernMultiplayerService, ModernQuiz, ModernPlayer, QuizQuestion } from '../services/modernMultiplayerService';

interface ModernGamePlayProps {
  roomId: string;
  quiz: ModernQuiz | null;
  onGameEnd: () => void;
}

const ModernGamePlay: React.FC<ModernGamePlayProps> = ({
  roomId,
  quiz,
  onGameEnd
}) => {
  const { t } = useTranslation('multiplayer');
  const [gameState, setGameState] = useState<any>(null);
  const [players, setPlayers] = useState<{ [key: string]: ModernPlayer }>({});
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    const initializeGame = async () => {
      try {
        // Get current user ID
        const auth = require('firebase/auth').getAuth();
        setCurrentUserId(auth.currentUser?.uid || '');

        // Set up real-time listeners
        const gameUpdateId = modernMultiplayerService.on('game:updated', handleGameStateUpdate);
        const playersUpdateId = modernMultiplayerService.on('players:updated', handlePlayersUpdate);
        const errorId = modernMultiplayerService.on('error', handleError);

        return () => {
          modernMultiplayerService.off('game:updated', gameUpdateId);
          modernMultiplayerService.off('players:updated', playersUpdateId);
          modernMultiplayerService.off('error', errorId);
          
          // Clear large state objects to prevent memory leaks
          setCurrentQuestion(null);
          setSelectedAnswer(null);
          setHasSubmitted(false);
          setTimeLeft(0);
          setShowResults(false);
          setQuestionStartTime(0);
        };
      } catch (error) {
        console.error('❌ Failed to initialize game:', error);
        return () => {};
      }
    };

    const cleanup = initializeGame();
    return () => {
      cleanup.then(fn => fn());
    };
  }, [roomId]);

  useEffect(() => {
    if (gameState && quiz) {
      const questionIndex = gameState.currentQuestion as number;
      if (questionIndex >= 0 && questionIndex < quiz.questions.length) {
        setCurrentQuestion(quiz.questions[questionIndex]);
        setSelectedAnswer(null);
        setHasSubmitted(false);
        setShowResults(false);
        setQuestionStartTime(gameState.questionStartTime || Date.now());
        setTimeLeft(gameState.timeLeft || quiz.timeLimit);
      } else if (questionIndex >= quiz.questions.length) {
        // Game ended
        onGameEnd();
      }
    }
  }, [gameState, quiz, onGameEnd]);

  useEffect(() => {
    if (timeLeft > 0 && !showResults && !hasSubmitted) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !hasSubmitted) {
      // Auto-submit when time runs out
      handleAnswerSubmit();
    }
  }, [timeLeft, showResults, hasSubmitted]);

  const handleGameStateUpdate = (gameStateData: any) => {
    setGameState(gameStateData);
  };

  const handlePlayersUpdate = (playersData: { [key: string]: ModernPlayer }) => {
    setPlayers(playersData);
  };

  const handleError = (error: any) => {
    console.error('❌ Game error:', error);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (hasSubmitted || showResults) return;
    setSelectedAnswer(answerIndex);
  };

  const handleAnswerSubmit = async () => {
    if (hasSubmitted || !currentQuestion || selectedAnswer === null) {
      // Auto-submit with random answer if none selected
      const randomAnswer = Math.floor(Math.random() * currentQuestion?.options.length!);
      setSelectedAnswer(randomAnswer);
    }

    try {
      const timeSpent = Date.now() - questionStartTime;
      await modernMultiplayerService.submitAnswer(
        currentQuestion!.id,
        selectedAnswer!,
        timeSpent
      );
      setHasSubmitted(true);
      setShowResults(true);
    } catch (error) {
      console.error('❌ Failed to submit answer:', error);
    }
  };

  const getPlayersList = () => Object.values(players).sort((a, b) => b.score - a.score);
  const currentPlayer = players[currentUserId];
  const currentAnswer = currentPlayer?.answers?.find(a => a.questionId === currentQuestion?.id);

  const getTimeColor = () => {
    if (timeLeft > 10) return 'text-green-400';
    if (timeLeft > 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAnswerColor = (index: number) => {
    if (!showResults) {
      return selectedAnswer === index
        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 border-blue-400'
        : 'bg-white/10 border-white/20 hover:bg-white/20';
    }

    const isCorrect = index === currentQuestion?.correctAnswer;
    const isSelected = index === selectedAnswer;

    if (isCorrect) {
      return 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-400';
    }
    if (isSelected && !isCorrect) {
      return 'bg-gradient-to-r from-red-500 to-pink-500 border-red-400';
    }
    return 'bg-white/10 border-white/20 opacity-50';
  };

  if (!currentQuestion) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white text-xl">{t('common.loading')}...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-600 p-4">
      {/* Game Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-6"
      >
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{quiz?.title}</h1>
                <p className="text-blue-100">{t('game.question')} {gameState?.currentQuestion + 1} {t('common.of')} {quiz?.questions.length}</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {/* Timer */}
              <motion.div
                animate={{ scale: timeLeft <= 5 ? [1, 1.1, 1] : 1 }}
                transition={{ repeat: timeLeft <= 5 ? Infinity : 0, duration: 0.5 }}
                className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20"
              >
                <Timer className={`w-5 h-5 ${getTimeColor()}`} />
                <span className={`text-2xl font-bold ${getTimeColor()}`}>{timeLeft}s</span>
              </motion.div>

              {/* Player Status */}
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-white font-semibold">{Object.keys(players).length} {t('common.players')}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-white/10 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((gameState?.currentQuestion + 1) / quiz?.questions.length!) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Question Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {currentQuestion.question}
              </h2>
              {hasSubmitted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center space-x-2 bg-green-500/20 px-3 py-1 rounded-full border border-green-400/30"
                >
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">Submitted</span>
                </motion.div>
              )}
            </div>

            {/* Answer Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {currentQuestion.options.map((option: string, index: number) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: !hasSubmitted && !showResults ? 1.02 : 1 }}
                    whileTap={{ scale: !hasSubmitted && !showResults ? 0.98 : 1 }}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={hasSubmitted}
                    className={`p-4 rounded-2xl border text-left transition-all ${getAnswerColor(index)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          selectedAnswer === index
                            ? 'bg-white text-purple-600'
                            : 'bg-white/20 text-white'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="text-white font-medium">{option}</span>
                      </div>
                      {showResults && index === currentQuestion.correctAnswer && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                      {showResults && index === selectedAnswer && index !== currentQuestion.correctAnswer && (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            {/* Submit Button */}
            {!hasSubmitted && selectedAnswer !== null && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAnswerSubmit}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  {t('game.submitAnswer')}
                </motion.button>
              </motion.div>
            )}

            {/* Answer Result */}
            {showResults && currentAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-white/10 rounded-2xl border border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {currentAnswer.isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                    <div>
                      <p className="text-white font-semibold">
                        {currentAnswer.isCorrect ? t('multiplayer.correct') : t('multiplayer.incorrect')}
                      </p>
                      <p className="text-blue-100 text-sm">
                        {t('common.time')}: {Math.round(currentAnswer.timeSpent / 1000)}s • {t('common.points')}: {currentAnswer.points}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">+{currentAnswer.points}</p>
                    <p className="text-blue-100 text-sm">{t('common.points')}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Live Leaderboard */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <span>{t('game.liveLeaderboard')}</span>
              </h3>
              <div className="flex items-center space-x-1">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-green-400">{t('common.live')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {getPlayersList().map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`flex items-center justify-between p-3 rounded-2xl ${
                      player.id === currentUserId
                        ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {player.name}
                          {player.id === currentUserId && (
                            <span className="ml-2 text-xs text-blue-400">({t('common.you')})</span>
                          )}
                        </p>
                        <p className="text-blue-100 text-sm">
                          {player.answers ? Object.keys(player.answers).length : 0} {t('game.answered')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">{player.score}</p>
                      <p className="text-blue-100 text-sm">{t('common.points')}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Game Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-400" />
              <span>{t('game.yourStats')}</span>
            </h3>
            
            {currentPlayer && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-blue-100">{t('game.currentScore')}</span>
                  <span className="text-white font-semibold">{currentPlayer.score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">{t('game.answersGiven')}</span>
                  <span className="text-white font-semibold">
                    {currentPlayer.answers ? Object.keys(currentPlayer.answers).length : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">{t('game.correctRate')}</span>
                  <span className="text-white font-semibold">
                    {currentPlayer.answers ? 
                      Math.round((Object.values(currentPlayer.answers).filter(a => a.isCorrect).length / Object.values(currentPlayer.answers).length) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ModernGamePlay;
