import React, { useState, useEffect } from 'react';
// import { useTranslation } from 'react-i18n ext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Users,
  Target,
  Trophy,
  Shield
} from 'lucide-react';
import soundService from '../../services/soundService';
import musicService from '../../services/musicService';
import { MemeOverlay } from '../MemeOverlay';

// interface Answer {
//   id: number;
//   text: string;
// }

interface Question {
  id: string;
  title: string;
  options: string[];
  correct: number;
  explanation?: string;
  media?: string;
  mediaType?: 'image' | 'video';
}

interface Player {
  id: string;
  username: string;
  score: number;
  correctAnswers: number;
  rank: number;
  avatar?: string;
  streak?: number;
}

interface PowerUp {
  type: '50-50' | 'x2-score' | 'freeze-time';
  available: boolean;
  used: boolean;
}

interface ModernQuizGameProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  timeLimit: number;
  onAnswer: (answerIndex: number) => void;
  isAnswered: boolean;
  correctAnswer?: number;
  isCorrect?: boolean;
  points?: number;
  leaderboard: Player[];
  currentPlayer: Player;
  showIntermediateLeaderboard: boolean;
  enablePowerUps: boolean;
  powerUps?: PowerUp[];
  onUsePowerUp?: (type: string) => void;
}

const ANSWER_COLORS = ['#EF4444', '#3B82F6', '#FBBF24', '#10B981']; // Red, Blue, Yellow, Green
const ANSWER_SHAPES = ['△', '◆', '●', '□'];
// const ANSWER_LABELS = ['A', 'B', 'C', 'D'];

const ModernQuizGame: React.FC<ModernQuizGameProps> = ({
  question,
  questionIndex,
  totalQuestions,
  timeLimit,
  onAnswer,
  isAnswered,
  correctAnswer,
  isCorrect,
  points,
  leaderboard,
  currentPlayer,
  showIntermediateLeaderboard,
  enablePowerUps,
  powerUps = [],
  onUsePowerUp
}) => {
  // const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [isTimeFrozen, setIsTimeFrozen] = useState(false);
  const [scoreMultiplier, setScoreMultiplier] = useState(1);

  // Timer
  useEffect(() => {
    if (isAnswered || timeLeft <= 0 || isTimeFrozen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          soundService.play('timeup'); // 🔊 Time's up sound
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnswered, timeLeft, isTimeFrozen]);

  // Play game start sound on first mount + ensure game music is playing
  useEffect(() => {
    soundService.play('start'); // 🔊 Game start sound
    
    // 🎵 Ensure game music is playing (in case user joined mid-game)
    if (!musicService.isPlaying('game')) {
      musicService.play('game', true);
    }
  }, []);

  // Show result after answering
  useEffect(() => {
    if (isAnswered && correctAnswer !== undefined) {
      setShowResult(true);
      
      // Play sound + confetti for correct answer
      if (isCorrect) {
        soundService.play('correct'); // 🔊 Correct answer sound
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        soundService.play('wrong'); // 🔊 Wrong answer sound
      }

      // Reset for next question
      setTimeout(() => {
        setShowResult(false);
        setSelectedAnswer(null);
        setTimeLeft(timeLimit);
        setEliminatedOptions([]);
        setIsTimeFrozen(false);
        setScoreMultiplier(1);
      }, 3000);
    }
  }, [isAnswered, correctAnswer, isCorrect, timeLimit]);

  // Haptic feedback at 5 seconds + tick sound
  useEffect(() => {
    if (timeLeft === 5) {
      soundService.play('tick'); // 🔊 Warning tick at 5s
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    }
  }, [timeLeft]);

  // 🔊 Transition sound when moving to next question
  useEffect(() => {
    if (questionIndex > 0) {
      soundService.play('transition'); // 🔊 Next question transition
    }
  }, [questionIndex]);

  // 🤔 Show thinking meme when not answered and time > 5s
  const showThinkingMeme = !isAnswered && timeLeft > 5 && timeLeft < (timeLimit - 5);
  
  // 🎉 Show result meme after answering
  const showResultMeme = isAnswered && showResult;

  const handleAnswerSelect = (index: number) => {
    if (isAnswered || selectedAnswer !== null) return;
    
    setSelectedAnswer(index);
    soundService.play('click'); // 🔊 Click sound
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Submit answer
    onAnswer(index);
  };

  const handleUsePowerUp = (type: string) => {
    if (!onUsePowerUp) return;

    soundService.play('powerup'); // 🔊 Power-up sound

    switch (type) {
      case '50-50':
        // Eliminate 2 wrong answers
        const wrongAnswers = question.options
          .map((_, idx) => idx)
          .filter(idx => idx !== question.correct);
        const toEliminate = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, 2);
        setEliminatedOptions(toEliminate);
        break;
      
      case 'x2-score':
        setScoreMultiplier(2);
        break;
      
      case 'freeze-time':
        setIsTimeFrozen(true);
        setTimeout(() => setIsTimeFrozen(false), 10000); // 10 seconds
        break;
    }

    onUsePowerUp(type);
  };

  const timePercentage = (timeLeft / timeLimit) * 100;
  const barColor = timePercentage > 50 ? '#10B981' : timePercentage > 20 ? '#FBBF24' : '#EF4444';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* 🤔 Thinking Meme - Floating */}
      <MemeOverlay 
        type="thinking" 
        show={showThinkingMeme}
        position="top-right"
        size="medium"
      />

      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {/* Progress Bar */}
        <div className="bg-gray-900/50 backdrop-blur-md p-6">
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white text-2xl font-bold">
                Question {questionIndex + 1} / {totalQuestions}
              </div>
              <div className="text-white text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                {currentPlayer.score} pts
              </div>
            </div>
            
            {/* Time Bar */}
            <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full"
                style={{ backgroundColor: barColor }}
                initial={{ width: '100%' }}
                animate={{ width: `${timePercentage}%` }}
                transition={{ duration: 0.3 }}
              />
              {isTimeFrozen && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Question Section */}
        <div className="container mx-auto px-6 py-8">
          {/* Question Text */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 mb-8 border border-white/20"
          >
            <h2 className="text-4xl font-bold text-white text-center leading-tight">
              {question.title}
            </h2>
            
            {/* Media */}
            {question.media && (
              <div className="mt-6 rounded-2xl overflow-hidden max-w-3xl mx-auto">
                {question.mediaType === 'video' ? (
                  <video src={question.media} controls className="w-full" />
                ) : (
                  <img src={question.media} alt="Question" className="w-full h-auto" />
                )}
              </div>
            )}
          </motion.div>

          {/* Answer Options - BIG BUTTONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-5xl mx-auto">
            {question.options.map((option, index) => {
              const isEliminated = eliminatedOptions.includes(index);
              const isSelected = selectedAnswer === index;
              const isThisCorrect = correctAnswer === index;
              const isThisWrong = isAnswered && isSelected && !isThisCorrect;

              if (isEliminated) return null;

              return (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={!isAnswered ? { scale: 1.05 } : {}}
                  whileTap={!isAnswered ? { scale: 0.95 } : {}}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={isAnswered}
                  className={`relative p-8 rounded-3xl font-bold text-2xl transition-all duration-300 ${
                    isAnswered && isThisCorrect
                      ? 'bg-gradient-to-r from-green-400 to-emerald-600 text-white ring-8 ring-green-400/50'
                      : isThisWrong
                      ? 'bg-gradient-to-r from-red-400 to-red-600 text-white ring-8 ring-red-400/50'
                      : isSelected
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white ring-4 ring-cyan-400/50'
                      : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30 border-4 border-white/30'
                  }`}
                  style={{
                    backgroundColor: !isAnswered && !isSelected ? `${ANSWER_COLORS[index]}40` : undefined,
                    borderColor: !isAnswered ? ANSWER_COLORS[index] : undefined
                  }}
                >
                  {/* Shape & Label */}
                  <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-xl"
                    style={{ backgroundColor: ANSWER_COLORS[index] }}
                  >
                    {ANSWER_SHAPES[index]}
                  </div>

                  {/* Answer Text */}
                  <div className="pl-8 text-left">
                    {option}
                  </div>

                  {/* Result Icon */}
                  {isAnswered && isThisCorrect && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute -top-4 -right-4 bg-green-500 rounded-full p-3 shadow-xl"
                    >
                      <CheckCircle className="w-8 h-8 text-white" />
                    </motion.div>
                  )}
                  {isThisWrong && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute -top-4 -right-4 bg-red-500 rounded-full p-3 shadow-xl"
                    >
                      <XCircle className="w-8 h-8 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Power-ups Bar */}
          {enablePowerUps && powerUps.length > 0 && !isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto mb-8"
            >
              <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl p-6">
                <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  Power-Ups
                </h3>
                <div className="flex gap-4">
                  {powerUps.map((powerUp, index) => (
                    <button
                      key={index}
                      onClick={() => handleUsePowerUp(powerUp.type)}
                      disabled={!powerUp.available || powerUp.used}
                      className={`flex-1 p-4 rounded-xl font-bold transition-all ${
                        powerUp.available && !powerUp.used
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:scale-105'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {powerUp.type === '50-50' && '50/50'}
                      {powerUp.type === 'x2-score' && '×2 Score'}
                      {powerUp.type === 'freeze-time' && '⏸ Freeze'}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Players Answered Count */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl text-white text-xl">
              <Users className="w-6 h-6" />
              <span className="font-bold">
                {leaderboard.filter(p => p.correctAnswers > 0).length} / {leaderboard.length}
              </span>
              <span>answered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instant Result Overlay */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex flex-col items-center justify-center"
          >
            {isCorrect ? (
              <>
                {/* 🎉 Success Meme */}
                <MemeOverlay 
                  type="success"
                  show={showResultMeme}
                  position="center"
                  size="large"
                  className="mb-6"
                />

                {/* Correct Answer */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="text-green-400 mb-8"
                >
                  <CheckCircle className="w-48 h-48" strokeWidth={3} />
                </motion.div>
                
                <motion.h1
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-8xl font-black text-white mb-4"
                >
                  CORRECT!
                </motion.h1>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-6xl font-bold text-yellow-400 mb-6"
                >
                  +{points} pts
                  {scoreMultiplier > 1 && <span className="text-orange-400 ml-2">×{scoreMultiplier}</span>}
                </motion.div>

                {/* Streak */}
                {currentPlayer.streak && currentPlayer.streak > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 text-4xl text-orange-400 font-bold"
                  >
                    🔥 {currentPlayer.streak} Streak!
                  </motion.div>
                )}

                {/* Meme GIF */}
                <motion.img
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                  src="https://media.giphy.com/media/g9582DNuQppxC/giphy.gif"
                  alt="Success"
                  className="w-64 h-64 rounded-3xl mt-6"
                />
              </>
            ) : (
              <>
                {/* 😢 Fail Meme */}
                <MemeOverlay 
                  type="fail"
                  show={showResultMeme}
                  position="center"
                  size="large"
                  className="mb-6"
                />

                {/* Wrong Answer */}
                <motion.div
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="text-red-400 mb-8"
                >
                  <XCircle className="w-48 h-48" strokeWidth={3} />
                </motion.div>
                
                <motion.h1
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-8xl font-black text-white mb-4"
                >
                  OOPS!
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl text-purple-200 mb-6"
                >
                  Don't worry, get the next one! 💪
                </motion.p>

                {/* Correct Answer */}
                {question.options[correctAnswer || 0] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-green-500/20 backdrop-blur-md border-2 border-green-400 rounded-2xl p-6 max-w-2xl"
                  >
                    <p className="text-xl text-green-300 mb-2">Correct Answer:</p>
                    <p className="text-2xl text-white font-bold">
                      {question.options[correctAnswer || 0]}
                    </p>
                  </motion.div>
                )}

                {/* Meme GIF */}
                <motion.img
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                  src="https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif"
                  alt="Try again"
                  className="w-64 h-64 rounded-3xl mt-6"
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intermediate Leaderboard */}
      <AnimatePresence>
        {showIntermediateLeaderboard && isAnswered && !showResult && (
          <IntermediateLeaderboard
            leaderboard={leaderboard}
            currentPlayer={currentPlayer}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Intermediate Leaderboard Component
const IntermediateLeaderboard: React.FC<{
  leaderboard: Player[];
  currentPlayer: Player;
}> = ({ leaderboard, currentPlayer }) => {
  const top5 = leaderboard.slice(0, 5);
  const currentPlayerRank = currentPlayer.rank;
  const previousRank = currentPlayerRank; // TODO: Get from previous state

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      className="fixed top-0 right-0 bottom-0 w-full md:w-96 bg-gradient-to-br from-purple-900 to-indigo-900 p-6 overflow-y-auto z-40"
    >
      <h2 className="text-4xl font-black text-white mb-6 flex items-center gap-3">
        <Trophy className="w-10 h-10 text-yellow-400" />
        Top 5
      </h2>

      <div className="space-y-4">
        {top5.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-white/10 backdrop-blur-md rounded-2xl p-4 ${
              player.id === currentPlayer.id ? 'ring-4 ring-yellow-400' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Rank */}
              <div className={`text-4xl font-black ${
                index === 0 ? 'text-yellow-400' :
                index === 1 ? 'text-gray-300' :
                index === 2 ? 'text-orange-600' :
                'text-white'
              }`}>
                #{index + 1}
              </div>

              {/* Player Info */}
              <div className="flex-1">
                <p className="text-xl font-bold text-white">{player.username}</p>
                <div className="flex items-center gap-2 text-sm text-purple-200">
                  <Target className="w-4 h-4" />
                  {player.correctAnswers} correct
                </div>
              </div>

              {/* Score */}
              <div className="text-3xl font-bold text-white">
                {player.score}
              </div>

              {/* Trend */}
              {player.id === currentPlayer.id && previousRank !== currentPlayerRank && (
                <div>
                  {currentPlayerRank < previousRank ? (
                    <TrendingUp className="w-8 h-8 text-green-400" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-400" />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Current Player Spotlight (if not in top 5) */}
      {currentPlayerRank > 5 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6"
        >
          <p className="text-2xl font-bold text-white mb-2">You're rank #{currentPlayerRank}!</p>
          <p className="text-lg text-white/90">
            {previousRank - currentPlayerRank > 0
              ? `You jumped ${previousRank - currentPlayerRank} places! Keep it up! 🚀`
              : 'Keep pushing for the top! 💪'}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ModernQuizGame;
