import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Star, 
  Zap, 
  Flame, 
  Target,
  Sparkles,
  Rocket
} from 'lucide-react';

interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: number;
  userAnswer: number;
  points: number;
  streak: number;
  timeBonus: number;
  explanation?: string;
}

interface ModernAnswerResultAnimationProps {
  result: AnswerResult;
  showAnimation: boolean;
  onAnimationComplete: () => void;
  questionNumber: number;
  totalQuestions: number;
  playerName?: string;
  isMultiplayer?: boolean;
}

const ModernAnswerResultAnimation: React.FC<ModernAnswerResultAnimationProps> = ({
  result,
  showAnimation,
  onAnimationComplete,
  questionNumber,
  totalQuestions,
  playerName = 'Bạn',
  }) => {
  const [animationPhase, setAnimationPhase] = useState<'reveal' | 'celebration' | 'complete'>('reveal');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!showAnimation) return;

    const timer1 = setTimeout(() => {
      setAnimationPhase('celebration');
      if (result.isCorrect) {
        setShowConfetti(true);
      }
    }, 1000);

    const timer2 = setTimeout(() => {
      setAnimationPhase('complete');
    }, 3000);

    const timer3 = setTimeout(() => {
      onAnimationComplete();
      // Reset for next use
      setAnimationPhase('reveal');
      setShowConfetti(false);
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [showAnimation, result.isCorrect, onAnimationComplete]);

  const getStreakMultiplier = () => {
    if (result.streak >= 10) return 3;
    if (result.streak >= 5) return 2;
    if (result.streak >= 3) return 1.5;
    return 1;
  };

  const getStreakColor = () => {
    if (result.streak >= 10) return 'from-red-500 to-orange-500';
    if (result.streak >= 5) return 'from-purple-500 to-pink-500';
    if (result.streak >= 3) return 'from-blue-500 to-cyan-500';
    return 'from-green-500 to-emerald-500';
  };

  const getStreakIcon = () => {
    if (result.streak >= 10) return <Flame className="w-6 h-6" />;
    if (result.streak >= 5) return <Zap className="w-6 h-6" />;
    if (result.streak >= 3) return <Star className="w-6 h-6" />;
    return <Sparkles className="w-6 h-6" />;
  };

  if (!showAnimation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {animationPhase === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="relative"
          >
            <div className={`relative p-8 rounded-3xl shadow-2xl ${
              result.isCorrect 
                ? 'bg-gradient-to-br from-green-400 via-emerald-500 to-green-600' 
                : 'bg-gradient-to-br from-red-400 via-pink-500 to-red-600'
            }`}>
              {/* Background Effects */}
              <motion.div
                className="absolute inset-0 rounded-3xl bg-white/20"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
              >
                {result.isCorrect ? (
                  <CheckCircle className="w-16 h-16 text-white" />
                ) : (
                  <XCircle className="w-16 h-16 text-white" />
                )}
              </motion.div>

              {/* Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 text-center"
              >
                <h2 className="text-3xl font-bold text-white">
                  {result.isCorrect ? 'CHÍNH XÁC!' : 'CHƯA ĐÚNG!'}
                </h2>
                <p className="text-white/80 mt-2">
                  {result.isCorrect 
                    ? `${playerName} đã trả lời đúng!` 
                    : `${playerName} đã trả lời sai`}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {animationPhase === 'celebration' && (
          <motion.div
            key="celebration"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative"
          >
            <div className={`p-8 rounded-3xl shadow-2xl ${
              result.isCorrect 
                ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500' 
                : 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800'
            }`}>
              {/* Confetti Effect */}
              {showConfetti && (
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-white"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                      }}
                      animate={{
                        y: [0, -300, 600],
                        x: [0, Math.random() * 200 - 100, Math.random() * 200 - 100],
                        rotate: [0, 360, 720],
                        opacity: [1, 1, 0]
                      }}
                      transition={{
                        duration: 3,
                        delay: Math.random() * 0.5,
                        repeat: 0
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="relative text-center">
                {/* Trophy Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mx-auto mb-4"
                >
                  {result.isCorrect ? (
                    <Trophy className="w-12 h-12 text-white" />
                  ) : (
                    <Target className="w-12 h-12 text-white" />
                  )}
                </motion.div>

                {/* Points Display */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
                  className="mb-4"
                >
                  <div className="text-5xl font-bold text-white">
                    +{result.points}
                  </div>
                  <div className="text-white/80 text-sm">điểm</div>
                </motion.div>

                {/* Streak Display */}
                {result.streak > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className={`inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r ${getStreakColor()} rounded-full text-white font-bold`}
                  >
                    {getStreakIcon()}
                    <span>{result.streak} Chuỗi đúng!</span>
                    {getStreakMultiplier() > 1 && (
                      <span className="text-xs">x{getStreakMultiplier()}</span>
                    )}
                  </motion.div>
                )}

                {/* Time Bonus */}
                {result.timeBonus > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-3 text-white/80 text-sm"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Rocket className="w-4 h-4" />
                      <span>Thưởng thời gian: +{result.timeBonus} điểm</span>
                    </div>
                  </motion.div>
                )}

                {/* Wrong Answer Info */}
                {!result.isCorrect && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-4 p-3 bg-white/20 rounded-xl backdrop-blur-sm"
                  >
                    <p className="text-white text-sm">
                      Đáp án đúng là: <span className="font-bold">Option {result.correctAnswer + 1}</span>
                    </p>
                    {result.explanation && (
                      <p className="text-white/80 text-xs mt-2">{result.explanation}</p>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {animationPhase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative"
          >
            <div className="p-8 rounded-3xl shadow-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
              <div className="text-center">
                {/* Progress */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1 }}
                  className="w-full h-2 bg-white/20 rounded-full mb-6"
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"
                    style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                  />
                </motion.div>

                {/* Summary */}
                <div className="text-white">
                  <h3 className="text-2xl font-bold mb-2">Câu hỏi {questionNumber}/{totalQuestions}</h3>
                  <div className="flex items-center justify-center space-x-4">
                    {result.isCorrect && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>Đúng</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-5 h-5" />
                      <span>{result.points} điểm</span>
                    </div>
                  </div>
                </div>

                {/* Continue Button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onAnimationComplete}
                  className="mt-6 px-6 py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-white/90 transition-colors"
                >
                  Tiếp tục
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Confetti Component for standalone use
export const ConfettiEffect: React.FC<{ trigger: boolean }> = ({ trigger }) => {
  return (
    <AnimatePresence>
      {trigger && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3"
              style={{
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD700'][i % 6],
                left: `${Math.random() * 100}%`,
                top: `-10px`,
              }}
              animate={{
                y: [0, window.innerHeight + 100],
                x: [0, Math.random() * 400 - 200],
                rotate: [0, Math.random() * 720 - 360],
                opacity: [1, 1, 0]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 0.5,
                repeat: 0
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

export default ModernAnswerResultAnimation;
