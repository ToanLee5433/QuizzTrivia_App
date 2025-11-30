/**
 * 🔥 STREAK INDICATOR
 * Show current streak with bonus information
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Star, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { STREAK_BONUSES } from '../../types/game.types';

interface StreakIndicatorProps {
  streak: number;
  className?: string;
}

const StreakIndicator: React.FC<StreakIndicatorProps> = ({ streak, className = '' }) => {
  const { t } = useTranslation('multiplayer');
  const currentBonus = STREAK_BONUSES.find(b => b.streak === streak);
  const nextBonus = STREAK_BONUSES.find(b => b.streak > streak);

  if (streak < 3) return null;

  return (
    <motion.div
      initial={{ scale: 0, y: -20 }}
      animate={{ scale: 1, y: 0 }}
      className={`bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl p-6 border-2 border-orange-500/50 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <motion.div
            animate={{
              rotate: [0, 10, -10, 10, 0],
              scale: [1, 1.1, 1.1, 1.1, 1],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 2,
            }}
            className="p-3 bg-orange-500 rounded-xl"
          >
            <Flame className="w-8 h-8 text-white" />
          </motion.div>

          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-2xl font-bold text-orange-400">
                {streak} Streak!
              </h3>
              {currentBonus && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-500/20 rounded-full">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-bold text-yellow-400">
                    x{currentBonus.multiplier}
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-orange-300">
              {t('streak.currentStreak', { count: streak })}
            </p>
          </div>
        </div>

        {currentBonus && (
          <div className="text-right">
            <div className="flex items-center justify-end space-x-2 mb-1">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">
                +{currentBonus.bonusPoints}
              </span>
            </div>
            <p className="text-xs text-yellow-300">{t('streak.bonusPoints')}</p>
          </div>
        )}
      </div>

      {nextBonus && (
        <div className="mt-4 p-3 bg-white/10 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-orange-300" />
              <span className="text-sm text-orange-200">
                {t('streak.nextStreak')}: <span className="font-bold">{nextBonus.streak}</span>
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1">
                <span className="text-orange-300">{t('streak.multiplier')}:</span>
                <span className="font-bold text-yellow-400">x{nextBonus.multiplier}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-orange-300">{t('streak.bonus')}:</span>
                <span className="font-bold text-yellow-400">+{nextBonus.bonusPoints}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StreakIndicator;
