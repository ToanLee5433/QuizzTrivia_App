import React, { useState, useEffect } from 'react';
import { 
  User, 
  Users, 
  Zap, 
  Trophy,
  Clock,
  Shield,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';

interface GameModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSinglePlayer: () => void;
  onSelectMultiplayer: () => void;
  quizTitle: string;
  questionCount: number;
  estimatedTime?: number;
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  isOpen,
  onClose,
  onSelectSinglePlayer,
  onSelectMultiplayer,
  quizTitle,
  questionCount,
  estimatedTime = 15
}) => {
  const [hoveredMode, setHoveredMode] = useState<'single' | 'multi' | null>(null);

  const singlePlayerFeatures = [
    { icon: Clock, text: 'Không giới hạn thời gian', color: 'text-blue-400' },
    { icon: Trophy, text: 'Theo dõi tiến độ cá nhân', color: 'text-yellow-400' },
    { icon: Shield, text: 'Chơi offline được', color: 'text-green-400' }
  ];

  const multiplayerFeatures = [
    { icon: Users, text: 'Tối đa 20 người chơi', color: 'text-purple-400' },
    { icon: Zap, text: 'Thời gian thực', color: 'text-orange-400' },
    { icon: Sparkles, text: 'Bảng xếp hạng trực tiếp', color: 'text-pink-400' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl border border-white/10 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <motion.h2 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-3xl font-bold text-white mb-2"
                >
                  Chọn chế độ chơi
                </motion.h2>
                <motion.p 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/70"
                >
                  {quizTitle} • {questionCount} câu hỏi • ~{estimatedTime} phút
                </motion.p>
              </div>
              
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>

            {/* Game Modes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Single Player Mode */}
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                onHoverStart={() => setHoveredMode('single')}
                onHoverEnd={() => setHoveredMode(null)}
                className="group cursor-pointer"
                onClick={onSelectSinglePlayer}
              >
                <div className={`
                  relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300
                  ${hoveredMode === 'single' 
                    ? 'border-blue-400/50 bg-gradient-to-br from-blue-500/10 to-blue-600/5 scale-105' 
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                  }
                `}>
                  {/* Background Effects */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Mode Icon & Title */}
                  <div className="relative flex items-center gap-4 mb-6">
                    <div className={`
                      p-3 rounded-full transition-all duration-300
                      ${hoveredMode === 'single' 
                        ? 'bg-blue-500/20 scale-110' 
                        : 'bg-white/10'
                      }
                    `}>
                      <User className={`
                        w-8 h-8 transition-colors duration-300
                        ${hoveredMode === 'single' ? 'text-blue-400' : 'text-white'}
                      `} />
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                        Chơi đơn
                      </h3>
                      <p className="text-white/60">Tập trung hoàn toàn</p>
                    </div>
                    
                    <ChevronRight className={`
                      w-6 h-6 ml-auto transition-all duration-300
                      ${hoveredMode === 'single' 
                        ? 'text-blue-400 translate-x-2' 
                        : 'text-white/40'
                      }
                    `} />
                  </div>

                  {/* Features */}
                  <div className="relative space-y-3">
                    {singlePlayerFeatures.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <feature.icon className={`w-5 h-5 ${feature.color}`} />
                        <span className="text-white/80">{feature.text}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Quick Stats */}
                  <div className="relative mt-6 p-4 bg-black/20 rounded-lg border border-white/5">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold text-blue-400">∞</div>
                        <div className="text-xs text-white/60">Thời gian</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-400">100%</div>
                        <div className="text-xs text-white/60">Điểm tối đa</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Multiplayer Mode */}
              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                onHoverStart={() => setHoveredMode('multi')}
                onHoverEnd={() => setHoveredMode(null)}
                className="group cursor-pointer"
                onClick={onSelectMultiplayer}
              >
                <div className={`
                  relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300
                  ${hoveredMode === 'multi' 
                    ? 'border-purple-400/50 bg-gradient-to-br from-purple-500/10 to-pink-600/5 scale-105' 
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                  }
                `}>
                  {/* Background Effects */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Hot Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full">
                      🔥 HOT
                    </span>
                  </div>

                  {/* Mode Icon & Title */}
                  <div className="relative flex items-center gap-4 mb-6">
                    <div className={`
                      p-3 rounded-full transition-all duration-300
                      ${hoveredMode === 'multi' 
                        ? 'bg-purple-500/20 scale-110' 
                        : 'bg-white/10'
                      }
                    `}>
                      <Users className={`
                        w-8 h-8 transition-colors duration-300
                        ${hoveredMode === 'multi' ? 'text-purple-400' : 'text-white'}
                      `} />
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
                        Multiplayer
                      </h3>
                      <p className="text-white/60">Thách thức bạn bè</p>
                    </div>
                    
                    <ChevronRight className={`
                      w-6 h-6 ml-auto transition-all duration-300
                      ${hoveredMode === 'multi' 
                        ? 'text-purple-400 translate-x-2' 
                        : 'text-white/40'
                      }
                    `} />
                  </div>

                  {/* Features */}
                  <div className="relative space-y-3">
                    {multiplayerFeatures.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <feature.icon className={`w-5 h-5 ${feature.color}`} />
                        <span className="text-white/80">{feature.text}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Quick Stats */}
                  <div className="relative mt-6 p-4 bg-black/20 rounded-lg border border-white/5">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold text-purple-400">⚡</div>
                        <div className="text-xs text-white/60">Tốc độ</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-pink-400">🏆</div>
                        <div className="text-xs text-white/60">Cạnh tranh</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Bottom Tips */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-medium">Mẹo hay</span>
              </div>
              <p className="text-white/70 text-sm">
                💡 Chơi đơn để luyện tập và hiểu sâu nội dung. Chơi multiplayer để thử thách bản thân và tạo không khí sôi động!
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameModeSelector;
