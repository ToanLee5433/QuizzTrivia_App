import React, { useState } from 'react';
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl border border-white/10 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slideUp"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 animate-slideInLeft">
              Chọn chế độ chơi
            </h2>
            <p className="text-white/70 animate-slideInLeft animation-delay-100">
              {quizTitle} • {questionCount} câu hỏi • ~{estimatedTime} phút
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300 hover:scale-110 animate-scaleIn animation-delay-300"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Game Modes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Single Player Mode */}
          <div
            onMouseEnter={() => setHoveredMode('single')}
            onMouseLeave={() => setHoveredMode(null)}
            className="group cursor-pointer animate-slideInLeft animation-delay-200"
            onClick={onSelectSinglePlayer}
          >
            <div className={`
              relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300 transform
              ${hoveredMode === 'single' 
                ? 'border-blue-400/50 bg-gradient-to-br from-blue-500/10 to-blue-600/5 scale-105 shadow-2xl shadow-blue-500/20' 
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:scale-102'
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
                  <div
                    key={index}
                    className="flex items-center gap-3 animate-slideInLeft"
                    style={{ animationDelay: `${400 + index * 100}ms` }}
                  >
                    <feature.icon className={`w-5 h-5 ${feature.color}`} />
                    <span className="text-white/80">{feature.text}</span>
                  </div>
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
          </div>

          {/* Multiplayer Mode */}
          <div
            onMouseEnter={() => setHoveredMode('multi')}
            onMouseLeave={() => setHoveredMode(null)}
            className="group cursor-pointer animate-slideInRight animation-delay-300"
            onClick={onSelectMultiplayer}
          >
            <div className={`
              relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300 transform
              ${hoveredMode === 'multi' 
                ? 'border-purple-400/50 bg-gradient-to-br from-purple-500/10 to-pink-600/5 scale-105 shadow-2xl shadow-purple-500/20' 
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:scale-102'
              }
            `}>
              {/* Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Hot Badge */}
              <div className="absolute top-4 right-4 animate-bounce">
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
                  <div
                    key={index}
                    className="flex items-center gap-3 animate-slideInRight"
                    style={{ animationDelay: `${500 + index * 100}ms` }}
                  >
                    <feature.icon className={`w-5 h-5 ${feature.color}`} />
                    <span className="text-white/80">{feature.text}</span>
                  </div>
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
          </div>
        </div>

        {/* Bottom Tips */}
        <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10 animate-slideUp animation-delay-600">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-white font-medium">Mẹo hay</span>
          </div>
          <p className="text-white/70 text-sm">
            💡 Chơi đơn để luyện tập và hiểu sâu nội dung. Chơi multiplayer để thử thách bản thân và tạo không khí sôi động!
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes slideInLeft {
          from { 
            opacity: 0;
            transform: translateX(-20px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInRight {
          from { 
            opacity: 0;
            transform: translateX(20px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-slideInLeft {
          animation: slideInLeft 0.6s ease-out;
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.6s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animation-delay-100 {
          animation-delay: 0.1s;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-300 {
          animation-delay: 0.3s;
        }
        
        .animation-delay-600 {
          animation-delay: 0.6s;
        }
        
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
};

export default GameModeSelector;
  );
};

export default GameModeSelector;
