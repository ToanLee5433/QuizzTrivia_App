import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Split, Clock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import powerUpsService, { PlayerPowerUps, PowerUpType } from '../services/powerUpsService';
import { logger } from '../utils/logger';

interface PowerUpsPanelProps {
  roomCode: string;
  playerId: string;
  currentQuestionIndex: number;
  onPowerUpUsed?: (type: PowerUpType) => void;
  disabled?: boolean;
}

const PowerUpsPanel: React.FC<PowerUpsPanelProps> = ({
  roomCode,
  playerId,
  currentQuestionIndex,
  onPowerUpUsed,
  disabled = false
}) => {
  const { t } = useTranslation();
  const [powerUps, setPowerUps] = useState<PlayerPowerUps | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to power-ups changes
  useEffect(() => {
    const unsubscribe = powerUpsService.subscribeToPowerUps(
      roomCode,
      playerId,
      (updatedPowerUps) => {
        setPowerUps(updatedPowerUps);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [roomCode, playerId]);

  const handleUsePowerUp = async (type: PowerUpType) => {
    if (isLoading || disabled) return;

    const powerUp = powerUps?.[type];
    if (!powerUp?.available || powerUp.used) return;

    setIsLoading(true);

    try {
      const success = await powerUpsService.usePowerUp(
        roomCode,
        playerId,
        type,
        currentQuestionIndex
      );

      if (success) {
        logger.info('Power-up activated', { type, currentQuestionIndex });
        onPowerUpUsed?.(type);
      } else {
        logger.warn('Failed to use power-up', { type });
      }
    } catch (error) {
      logger.error('Error using power-up', { error, type });
    } finally {
      setIsLoading(false);
    }
  };

  const getPowerUpConfig = (type: PowerUpType) => {
    switch (type) {
      case '50-50':
        return {
          icon: Split,
          label: t('multiplayer.powerUps.5050'),
          description: t('multiplayer.powerUps.5050Desc'),
          gradient: 'from-blue-500 to-cyan-500',
          hoverGradient: 'from-blue-600 to-cyan-600',
          shadowColor: 'shadow-blue-500/30'
        };
      case 'x2-score':
        return {
          icon: X,
          label: t('multiplayer.powerUps.x2Score'),
          description: t('multiplayer.powerUps.x2ScoreDesc'),
          gradient: 'from-yellow-500 to-orange-500',
          hoverGradient: 'from-yellow-600 to-orange-600',
          shadowColor: 'shadow-yellow-500/30'
        };
      case 'freeze-time':
        return {
          icon: Clock,
          label: t('multiplayer.powerUps.freezeTime'),
          description: t('multiplayer.powerUps.freezeTimeDesc'),
          gradient: 'from-purple-500 to-pink-500',
          hoverGradient: 'from-purple-600 to-pink-600',
          shadowColor: 'shadow-purple-500/30'
        };
    }
  };

  if (!powerUps) {
    return null;
  }

  const powerUpTypes: PowerUpType[] = ['50-50', 'x2-score', 'freeze-time'];

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-stretch w-full max-w-2xl mx-auto">
      {powerUpTypes.map((type) => {
        const powerUp = powerUps[type];
        const config = getPowerUpConfig(type);
        const Icon = config.icon;
        const isAvailable = powerUp.available && !powerUp.used;
        const isDisabled = disabled || !isAvailable || isLoading;

        return (
          <motion.button
            key={type}
            onClick={() => handleUsePowerUp(type)}
            disabled={isDisabled}
            whileHover={isAvailable && !disabled ? { scale: 1.05, y: -4 } : {}}
            whileTap={isAvailable && !disabled ? { scale: 0.95 } : {}}
            className={`
              relative flex-1 min-w-0 group
              rounded-2xl p-3 sm:p-4
              transition-all duration-300
              border-2
              ${
                isAvailable && !disabled
                  ? `bg-gradient-to-br ${config.gradient} ${config.shadowColor} shadow-lg hover:shadow-xl border-white/20`
                  : 'bg-gray-800/50 border-gray-700/50 opacity-50 cursor-not-allowed'
              }
            `}
          >
            {/* Glow Effect */}
            {isAvailable && !disabled && (
              <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-20 rounded-2xl blur-xl transition-opacity duration-300`}></div>
            )}

            {/* Content */}
            <div className="relative flex flex-col items-center gap-1.5 sm:gap-2">
              <div className="relative">
                <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={2.5} />
                {!isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                    <X className="w-4 h-4 text-red-400" />
                  </div>
                )}
              </div>
              
              <div className="text-center w-full">
                <div className="text-xs sm:text-sm font-bold text-white truncate">
                  {config.label}
                </div>
                <div className="hidden sm:block text-[10px] text-white/70 mt-0.5 line-clamp-2">
                  {config.description}
                </div>
              </div>

              {/* Used Badge */}
              {powerUp.used && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  {t('multiplayer.powerUps.used')}
                </div>
              )}
            </div>

            {/* Sparkle Effect */}
            {isAvailable && !disabled && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              >
                <Zap className="absolute top-2 right-2 w-3 h-3 text-yellow-300" />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default PowerUpsPanel;
