/**
 * ⚡ POWER-UP PANEL
 * Display and use power-ups during game
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Shield, 
  Clock, 
  Eye, 
  SkipForward,
  Trophy,
  Flame,
  Plus
} from 'lucide-react';
import { ModernPlayer, PowerUpType } from '../../types/game.types';

interface PowerUpPanelProps {
  player: ModernPlayer;
  onPowerUpUse: (powerUpType: PowerUpType) => void;
  activePowerUps: PowerUpType[];
}

interface PowerUpConfig {
  type: PowerUpType;
  name: string;
  description: string;
  icon: React.ElementType;
  cost: number;
  color: string;
  gradient: string;
}

const POWER_UPS: PowerUpConfig[] = [
  {
    type: 'fifty_fifty',
    name: '50/50',
    description: 'Loại 2 đáp án sai',
    icon: Zap,
    cost: 50,
    color: 'text-yellow-400',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    type: 'time_freeze',
    name: 'Đóng băng',
    description: 'Dừng thời gian 5s',
    icon: Clock,
    cost: 100,
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    type: 'reveal_answer',
    name: 'Gợi ý',
    description: 'Hiện đáp án 3s',
    icon: Eye,
    cost: 150,
    color: 'text-purple-400',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    type: 'shield',
    name: 'Khiên',
    description: 'Bảo vệ streak',
    icon: Shield,
    cost: 75,
    color: 'text-green-400',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    type: 'double_points',
    name: 'x2 Điểm',
    description: 'Nhân đôi điểm',
    icon: Trophy,
    cost: 200,
    color: 'text-yellow-400',
    gradient: 'from-yellow-500 to-amber-500',
  },
  {
    type: 'skip_question',
    name: 'Bỏ qua',
    description: 'Skip câu hỏi',
    icon: SkipForward,
    cost: 120,
    color: 'text-indigo-400',
    gradient: 'from-indigo-500 to-blue-500',
  },
];

const PowerUpPanel: React.FC<PowerUpPanelProps> = ({
  player,
  onPowerUpUse,
  activePowerUps,
}) => {
  const canAfford = (cost: number) => player.powerUpPoints >= cost;
  const isActive = (type: PowerUpType) => activePowerUps.includes(type);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-purple-500/20 rounded-xl">
            <Flame className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Vật phẩm</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Plus className="w-4 h-4 text-purple-400" />
          <span className="text-lg font-bold text-purple-400">
            {player.powerUpPoints}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {POWER_UPS.map((powerUp) => {
          const affordable = canAfford(powerUp.cost);
          const active = isActive(powerUp.type);

          return (
            <motion.button
              key={powerUp.type}
              onClick={() => affordable && !active && onPowerUpUse(powerUp.type)}
              disabled={!affordable || active}
              whileHover={affordable && !active ? { scale: 1.05, y: -2 } : {}}
              whileTap={affordable && !active ? { scale: 0.95 } : {}}
              className={`relative overflow-hidden p-4 rounded-xl border-2 transition-all ${
                active
                  ? `bg-gradient-to-br ${powerUp.gradient} border-white/50 shadow-xl`
                  : affordable
                  ? `bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30`
                  : 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
              }`}
            >
              {/* Active Indicator */}
              {active && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}

              <div className="flex flex-col items-center space-y-2">
                <div className={`p-2 rounded-xl ${
                  active ? 'bg-white/20' : 'bg-white/10'
                }`}>
                  <powerUp.icon className={`w-5 h-5 ${
                    active ? 'text-white' : affordable ? powerUp.color : 'text-gray-500'
                  }`} />
                </div>

                <div className="text-center">
                  <p className={`text-sm font-bold ${
                    active ? 'text-white' : affordable ? 'text-white' : 'text-gray-500'
                  }`}>
                    {powerUp.name}
                  </p>
                  <p className={`text-xs mt-1 ${
                    active ? 'text-white/80' : affordable ? 'text-white/60' : 'text-gray-600'
                  }`}>
                    {powerUp.description}
                  </p>
                </div>

                {!active && (
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-bold ${
                    affordable
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    <Plus className="w-3 h-3" />
                    <span>{powerUp.cost}</span>
                  </div>
                )}

                {active && (
                  <span className="text-xs font-bold text-white bg-green-500/30 px-2 py-1 rounded-full">
                    Đang dùng
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-purple-500/10 rounded-xl border border-purple-500/30">
        <p className="text-xs text-purple-300 text-center">
          Trả lời đúng để nhận thêm điểm vật phẩm
        </p>
      </div>
    </div>
  );
};

export default PowerUpPanel;
