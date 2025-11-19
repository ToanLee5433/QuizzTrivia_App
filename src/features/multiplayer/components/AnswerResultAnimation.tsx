import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AnswerResultAnimationProps {
  isCorrect: boolean;
  points: number;
  rankChange?: number;
  explanation?: string;
  onAnimationComplete?: () => void;
}

const AnswerResultAnimation: React.FC<AnswerResultAnimationProps> = ({
  isCorrect,
  points,
  rankChange = 0,
  explanation,
  onAnimationComplete,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence mode="wait" onExitComplete={onAnimationComplete}>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ delay: 0.2 }}
          className={`relative max-w-lg w-full mx-4 rounded-3xl shadow-2xl overflow-hidden ${
            isCorrect 
              ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
              : 'bg-gradient-to-br from-red-400 to-red-600'
          }`}
        >
          {/* Confetti effect for correct answer */}
          {isCorrect && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -20, x: Math.random() * 100 + '%', opacity: 1 }}
                  animate={{ 
                    y: ['0%', '100%'],
                    x: [Math.random() * 100 + '%', Math.random() * 100 + '%'],
                    rotate: [0, 360],
                    opacity: [1, 0]
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 2,
                    delay: Math.random() * 0.5,
                    ease: 'easeOut'
                  }}
                  className={`absolute w-3 h-3 rounded-full ${
                    ['bg-yellow-300', 'bg-blue-300', 'bg-pink-300', 'bg-purple-300'][i % 4]
                  }`}
                />
              ))}
            </div>
          )}

          <div className="relative p-8 text-center text-white">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-4"
            >
              {isCorrect ? (
                <CheckCircle size={80} strokeWidth={3} />
              ) : (
                <XCircle size={80} strokeWidth={3} />
              )}
            </motion.div>

            {/* Result text */}
            <motion.h2
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-black mb-2"
            >
              {isCorrect ? t('multiplayer.results.correct') : t('multiplayer.results.wrong')}
            </motion.h2>

            {/* Points earned */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="mb-4"
            >
              <div className="text-6xl font-black">
                +{points}
              </div>
              <div className="text-xl font-semibold opacity-90">
                {t('multiplayer.results.points')}
              </div>
            </motion.div>

            {/* Rank change */}
            {rankChange !== 0 && (
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-2 mb-4"
              >
                {rankChange > 0 ? (
                  <>
                    <TrendingUp size={24} />
                    <span className="text-lg font-bold">
                      {t('multiplayer.results.rankUp', { count: Math.abs(rankChange) })}
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown size={24} />
                    <span className="text-lg font-bold">
                      {t('multiplayer.results.rankDown', { count: Math.abs(rankChange) })}
                    </span>
                  </>
                )}
              </motion.div>
            )}

            {/* Explanation */}
            {explanation && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-left"
              >
                <div className="text-sm font-semibold mb-2">
                  {t('multiplayer.results.explanation')}
                </div>
                <div className="text-sm opacity-90">
                  {explanation}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnswerResultAnimation;
