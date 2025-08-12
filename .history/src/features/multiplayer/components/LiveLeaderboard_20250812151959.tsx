import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Trophy, 
  Crown, 
  Star, 
  Zap, 
  TrendingUp,
  Medal,
  Award,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaderboardPlayer {
  playerId: string;
  playerName: string;
  totalScore: number;
  correctAnswers: number;
  averageTime: number;
  streak: number;
  lastAnswerTime?: number;
  position: number;
  previousPosition?: number;
  isConnected: boolean;
  accuracy: number;
  speedBonus: number;
  achievements: string[];
}

interface LiveLeaderboardProps {
  players: LeaderboardPlayer[];
  currentUser?: string;
  gamePhase: 'waiting' | 'question' | 'results' | 'finished';
  totalQuestions: number;
  currentQuestionIndex: number;
  onPlayerClick?: (playerId: string) => void;
  showAnimation?: boolean;
}

const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  players,
  currentUser,
  gamePhase,
  totalQuestions,
  currentQuestionIndex,
  onPlayerClick,
  showAnimation = true
}) => {
  const { t } = useTranslation();
  const [animatedPlayers, setAnimatedPlayers] = useState<LeaderboardPlayer[]>(players);
  const [highlightedPlayers, setHighlightedPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (showAnimation) {
      // Animate position changes
      const timer = setTimeout(() => {
        setAnimatedPlayers(players);
        
        // Highlight players who changed position
        const changedPlayers = players.filter(player => 
          player.previousPosition && player.position !== player.previousPosition
        );
        
        setHighlightedPlayers(new Set(changedPlayers.map(p => p.playerId)));
        
        // Remove highlight after animation
        setTimeout(() => {
          setHighlightedPlayers(new Set());
        }, 2000);
        
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      setAnimatedPlayers(players);
    }
  }, [players, showAnimation]);

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-500" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500" />;
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
            {position}
          </div>
        );
    }
  };

  const getPositionColor = (position: number): string => {
    switch (position) {
      case 1:
        return 'from-yellow-400 to-yellow-600';
      case 2:
        return 'from-gray-400 to-gray-600';
      case 3:
        return 'from-orange-400 to-orange-600';
      default:
        return 'from-blue-400 to-blue-600';
    }
  };

  const getPositionChange = (player: LeaderboardPlayer) => {
    if (!player.previousPosition) return null;
    
    const change = player.previousPosition - player.position;
    if (change > 0) {
      return (
        <div className="flex items-center text-green-600 text-xs">
          <TrendingUp className="w-3 h-3 mr-1" />
          +{change}
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-600 text-xs">
          <TrendingUp className="w-3 h-3 mr-1 rotate-180" />
          {change}
        </div>
      );
    }
    return null;
  };

  const getAchievementBadge = (achievement: string) => {
    const achievements = {
      'speed_demon': { icon: Zap, color: 'text-yellow-500', label: 'Speed Demon' },
      'perfectionist': { icon: Target, color: 'text-green-500', label: 'Perfect' },
      'comeback_king': { icon: TrendingUp, color: 'text-blue-500', label: 'Comeback' },
      'hot_streak': { icon: Star, color: 'text-purple-500', label: 'Hot Streak' }
    };
    
    const config = achievements[achievement as keyof typeof achievements];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <div className={`${config.color} flex items-center space-x-1`} title={config.label}>
        <Icon className="w-3 h-3" />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-6 h-6" />
            <h3 className="text-xl font-bold">
              {t('multiplayer.liveLeaderboard', 'Bảng xếp hạng trực tiếp')}
            </h3>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">
              Câu {currentQuestionIndex + 1}/{totalQuestions}
            </div>
            <div className="text-xs opacity-75 capitalize">
              {gamePhase === 'waiting' && 'Đang chờ'}
              {gamePhase === 'question' && 'Đang trả lời'}
              {gamePhase === 'results' && 'Kết quả'}
              {gamePhase === 'finished' && 'Kết thúc'}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {animatedPlayers.map((player, index) => (
            <motion.div
              key={player.playerId}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: highlightedPlayers.has(player.playerId) ? 1.02 : 1
              }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.05,
                type: "spring",
                stiffness: 500,
                damping: 30
              }}
              className={`mb-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                player.playerId === currentUser
                  ? 'bg-blue-50 border-blue-300 shadow-md'
                  : highlightedPlayers.has(player.playerId)
                  ? 'bg-yellow-50 border-yellow-300 shadow-lg'
                  : player.isConnected
                  ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  : 'bg-red-50 border-red-200 opacity-75'
              }`}
              onClick={() => onPlayerClick?.(player.playerId)}
            >
              <div className="flex items-center justify-between">
                {/* Left side - Position and Player Info */}
                <div className="flex items-center space-x-3">
                  {/* Position Badge */}
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getPositionColor(player.position)} flex items-center justify-center shadow-lg`}>
                    {player.position <= 3 ? (
                      getPositionIcon(player.position)
                    ) : (
                      <span className="text-white font-bold">{player.position}</span>
                    )}
                  </div>

                  {/* Player Details */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-lg text-gray-800">
                        {player.playerName}
                      </h4>
                      {player.playerId === currentUser && (
                        <Star className="w-4 h-4 text-blue-500" />
                      )}
                      {!player.isConnected && (
                        <div className="w-2 h-2 bg-red-500 rounded-full" title="Mất kết nối" />
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{player.correctAnswers}/{totalQuestions} đúng</span>
                      <span>{player.accuracy.toFixed(0)}% chính xác</span>
                      {player.streak > 1 && (
                        <span className="flex items-center text-orange-600">
                          <Zap className="w-3 h-3 mr-1" />
                          {player.streak} combo
                        </span>
                      )}
                    </div>

                    {/* Achievements */}
                    {player.achievements.length > 0 && (
                      <div className="flex items-center space-x-1 mt-1">
                        {player.achievements.slice(0, 3).map((achievement, idx) => (
                          <div key={idx}>
                            {getAchievementBadge(achievement)}
                          </div>
                        ))}
                        {player.achievements.length > 3 && (
                          <span className="text-xs text-gray-500">+{player.achievements.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side - Score and Stats */}
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl font-bold text-purple-600">
                      {player.totalScore.toLocaleString()}
                    </div>
                    {getPositionChange(player)}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    {player.speedBonus > 0 && (
                      <div className="text-yellow-600">
                        +{player.speedBonus} tốc độ
                      </div>
                    )}
                    {player.averageTime > 0 && (
                      <div>
                        ⚡ {player.averageTime.toFixed(1)}s TB
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Tiến độ</span>
                  <span>{((player.correctAnswers / totalQuestions) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className={`h-2 rounded-full bg-gradient-to-r ${getPositionColor(player.position)}`}
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${Math.max(5, (player.correctAnswers / totalQuestions) * 100)}%` 
                    }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {animatedPlayers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có người chơi nào</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {gamePhase !== 'waiting' && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-purple-600">
                {animatedPlayers.filter(p => p.isConnected).length}
              </div>
              <div className="text-xs text-gray-500">Đang online</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {animatedPlayers.reduce((sum, p) => sum + p.correctAnswers, 0)}
              </div>
              <div className="text-xs text-gray-500">Tổng câu đúng</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {totalQuestions > 0 ? 
                  ((animatedPlayers.reduce((sum, p) => sum + p.correctAnswers, 0) / 
                    (animatedPlayers.length * totalQuestions)) * 100).toFixed(0) : 0}%
              </div>
              <div className="text-xs text-gray-500">Độ chính xác TB</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveLeaderboard;
