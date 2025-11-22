import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Shield, 
  Clock, 
  Trophy,
  Lock,
  Sparkles,
  Flame,
  SkipForward,
  X,
  Eye,
  Bolt
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDatabase, ref, update, onValue, off } from 'firebase/database';

export type PowerUpType = 
  | 'doublePoints' 
  | 'timeFreeze' 
  | 'shield' 
  | 'revealAnswer' 
  | 'skipQuestion' 
  | 'fiftyFifty'
  | 'extraTime'
  | 'stealPoints';

interface PowerUp {
  id: PowerUpType;
  name: string;
  description: string;
  icon: React.ElementType;
  cost: number;
  duration?: number;
  color: string;
  gradient: string;
  isActive: boolean;
  remainingUses: number;
  cooldownUntil?: number;
}

interface PlayerPowerUps {
  [key: string]: {
    available: PowerUpType[];
    active: PowerUpType[];
    used: PowerUpType[];
    points: number;
  };
}

interface ModernPowerUpsPanelProps {
  roomId: string;
  currentUserId: string;
  onPowerUpUse: (powerUpId: PowerUpType) => void;
  compact?: boolean;
}

const ModernPowerUpsPanel: React.FC<ModernPowerUpsPanelProps> = ({
  roomId,
  currentUserId,
  onPowerUpUse,
  compact = false
}) => {
  const [playerPowerUps, setPlayerPowerUps] = useState<PlayerPowerUps>({});
  const [selectedPowerUp, setSelectedPowerUp] = useState<PowerUpType | null>(null);
  const [isUsingPowerUp, setIsUsingPowerUp] = useState(false);
  const [playerPoints, setPlayerPoints] = useState(1000);

  const db = getDatabase();

  const defaultPowerUps: PowerUp[] = [
    {
      id: 'doublePoints',
      name: 'Điểm Gấp Đôi',
      description: 'Nhân đôi điểm cho câu trả lời tiếp theo',
      icon: Trophy,
      cost: 200,
      duration: 1,
      color: 'yellow',
      gradient: 'from-yellow-400 to-amber-500',
      isActive: false,
      remainingUses: 2
    },
    {
      id: 'timeFreeze',
      name: 'Đóng Băng Thời Gian',
      description: 'Tạm dừng đếm ngược trong 10 giây',
      icon: Clock,
      cost: 150,
      duration: 10,
      color: 'blue',
      gradient: 'from-blue-400 to-cyan-500',
      isActive: false,
      remainingUses: 3
    },
    {
      id: 'shield',
      name: 'Khiên Bảo Vệ',
      description: 'Bỏ qua câu trả lời sai một lần',
      icon: Shield,
      cost: 100,
      duration: 1,
      color: 'green',
      gradient: 'from-green-400 to-emerald-500',
      isActive: false,
      remainingUses: 2
    },
    {
      id: 'revealAnswer',
      name: 'Tiết Lộ Đáp Án',
      description: 'Hiển thị đáp án đúng trong 3 giây',
      icon: Eye,
      cost: 300,
      duration: 3,
      color: 'purple',
      gradient: 'from-purple-400 to-pink-500',
      isActive: false,
      remainingUses: 1
    },
    {
      id: 'skipQuestion',
      name: 'Bỏ Qua Câu Hỏi',
      description: 'Nhận điểm trung bình và chuyển câu tiếp theo',
      icon: SkipForward,
      cost: 250,
      duration: 0,
      color: 'indigo',
      gradient: 'from-indigo-400 to-blue-500',
      isActive: false,
      remainingUses: 1
    },
    {
      id: 'fiftyFifty',
      name: '50/50',
      description: 'Loại bỏ 2 đáp án sai',
      icon: Zap,
      cost: 180,
      duration: 0,
      color: 'orange',
      gradient: 'from-orange-400 to-red-500',
      isActive: false,
      remainingUses: 2
    },
    {
      id: 'extraTime',
      name: 'Thời Gian Thêm',
      description: 'Thêm 15 giây cho câu hỏi hiện tại',
      icon: Bolt,
      cost: 120,
      duration: 15,
      color: 'cyan',
      gradient: 'from-cyan-400 to-blue-500',
      isActive: false,
      remainingUses: 3
    },
    {
      id: 'stealPoints',
      name: 'Đánh Cắp Điểm',
      description: 'Lấy 50 điểm từ người chơi dẫn đầu',
      icon: Flame,
      cost: 400,
      duration: 0,
      color: 'red',
      gradient: 'from-red-400 to-pink-500',
      isActive: false,
      remainingUses: 1
    }
  ];

  const [powerUps, setPowerUps] = useState<PowerUp[]>(defaultPowerUps);

  // Listen to player power-ups
  useEffect(() => {
    if (!roomId || !db) return;

    const powerUpsRef = ref(db, `rooms/${roomId}/powerUps/${currentUserId}`);
    const unsubscribe = onValue(powerUpsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPlayerPowerUps(prev => ({ ...prev, [currentUserId]: data }));
        setPlayerPoints(data.points || 1000);
      }
    });

    return () => off(powerUpsRef, 'value', unsubscribe);
  }, [roomId, currentUserId, db]);

  const handlePowerUpUse = async (powerUpId: PowerUpType) => {
    if (isUsingPowerUp) return;

    const powerUp = powerUps.find(p => p.id === powerUpId);
    if (!powerUp || powerUp.remainingUses <= 0 || playerPoints < powerUp.cost) {
      return;
    }

    setIsUsingPowerUp(true);
    
    try {
      // Update local state
      setPowerUps(prev => prev.map(p => 
        p.id === powerUpId 
          ? { ...p, remainingUses: p.remainingUses - 1, isActive: true }
          : p
      ));
      setPlayerPoints(prev => prev - powerUp.cost);

      // Call parent callback
      onPowerUpUse(powerUpId);

      // Update database
      const powerUpsRef = ref(db, `rooms/${roomId}/powerUps/${currentUserId}`);
      update(powerUpsRef, {
        points: playerPoints - powerUp.cost,
        used: [...(playerPowerUps[currentUserId]?.used || []), powerUpId]
      });

      // Deactivate power-up after duration
      if (powerUp.duration && powerUp.duration > 0) {
        setTimeout(() => {
          setPowerUps(prev => prev.map(p => 
            p.id === powerUpId ? { ...p, isActive: false } : p
          ));
        }, powerUp.duration * 1000);
      }

      setSelectedPowerUp(null);
    } catch (error) {
      console.error('Failed to use power-up:', error);
      // Revert state on error
      setPowerUps(prev => prev.map(p => 
        p.id === powerUpId 
          ? { ...p, remainingUses: p.remainingUses + 1, isActive: false }
          : p
      ));
      setPlayerPoints(prev => prev + powerUp.cost);
    } finally {
      setIsUsingPowerUp(false);
    }
  };

  const isPowerUpAvailable = (powerUp: PowerUp) => {
    return powerUp.remainingUses > 0 && playerPoints >= powerUp.cost && !powerUp.isActive;
  };

  const isPowerUpActive = (powerUp: PowerUp) => {
    return powerUp.isActive;
  };

  const getPowerUpStatus = (powerUp: PowerUp) => {
    if (isPowerUpActive(powerUp)) return 'active';
    if (isPowerUpAvailable(powerUp)) return 'available';
    if (powerUp.remainingUses <= 0) return 'exhausted';
    if (playerPoints < powerUp.cost) return 'insufficient-points';
    return 'unavailable';
  };

  const getPowerUpButtonClass = (status: string, powerUp: PowerUp) => {
    const baseClass = "relative overflow-hidden transition-all duration-300 ";
    
    switch (status) {
      case 'active':
        return baseClass + `bg-gradient-to-r ${powerUp.gradient} text-white shadow-xl scale-105 ring-4 ring-white/50 animate-pulse`;
      case 'available':
        return baseClass + `bg-gradient-to-r ${powerUp.gradient} text-white shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer`;
      case 'exhausted':
        return baseClass + "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50";
      case 'insufficient-points':
        return baseClass + "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60";
      default:
        return baseClass + "bg-gray-200 text-gray-400 cursor-not-allowed";
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200/50">
        <Sparkles className="w-4 h-4 text-purple-600" />
        <span className="text-sm font-semibold text-purple-700">Power-ups</span>
        <div className="flex items-center space-x-1">
          {powerUps.filter(p => p.remainingUses > 0).slice(0, 3).map((powerUp) => (
            <div
              key={powerUp.id}
              className={`w-6 h-6 rounded-full bg-gradient-to-r ${powerUp.gradient} flex items-center justify-center`}
            >
              <powerUp.icon className="w-3 h-3 text-white" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white via-purple-50/30 to-white rounded-2xl shadow-2xl border border-purple-200/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Sparkles className="w-5 h-5 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Power-ups</h3>
            <p className="text-purple-100 text-xs">Sử dụng để chiến thắng</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="px-3 py-1 bg-white/20 rounded-full">
            <p className="text-sm font-bold text-white">{playerPoints} điểm</p>
          </div>
        </div>
      </div>

      {/* Power-ups Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AnimatePresence>
            {powerUps.map((powerUp) => {
              const status = getPowerUpStatus(powerUp);
              const Icon = powerUp.icon;
              
              return (
                <motion.div
                  key={powerUp.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={status === 'available' ? { scale: 1.05 } : {}}
                  whileTap={status === 'available' ? { scale: 0.95 } : {}}
                  onClick={() => status === 'available' && handlePowerUpUse(powerUp.id)}
                  className={`relative p-4 rounded-xl ${getPowerUpButtonClass(status, powerUp)}`}
                >
                  {/* Active Effect */}
                  {status === 'active' && (
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      animate={{ opacity: [0.2, 0.4, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  {/* Lock Icon for unavailable */}
                  {status === 'insufficient-points' && (
                    <Lock className="absolute top-2 right-2 w-3 h-3 text-gray-400" />
                  )}
                  
                  {status === 'exhausted' && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                      <X className="w-2 h-2 text-white" />
                    </div>
                  )}

                  <div className="flex flex-col items-center space-y-2">
                    <div className="relative">
                      <Icon className="w-8 h-8" />
                      {status === 'active' && (
                        <motion.div
                          className="absolute inset-0 bg-white/30 rounded-full blur-sm"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs font-bold leading-tight">{powerUp.name}</p>
                      <p className="text-xs opacity-80 mt-1">
                        {status === 'available' ? `${powerUp.cost} điểm` : 
                         status === 'exhausted' ? 'Hết lượt' :
                         status === 'insufficient-points' ? 'Không đủ điểm' :
                         status === 'active' ? 'Đang hoạt động' : 'Không khả dụng'}
                      </p>
                    </div>

                    {/* Remaining Uses */}
                    {powerUp.remainingUses > 0 && status !== 'active' && (
                      <div className="flex items-center space-x-1">
                        {[...Array(powerUp.remainingUses)].map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cost Badge */}
                  {status === 'available' && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/20 rounded-full">
                      <p className="text-xs font-bold">{powerUp.cost}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Selected Power-up Details */}
        <AnimatePresence>
          {selectedPowerUp && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200/50"
            >
              {(() => {
                const powerUp = powerUps.find(p => p.id === selectedPowerUp);
                if (!powerUp) return null;
                const Icon = powerUp.icon;
                const status = getPowerUpStatus(powerUp);
                
                return (
                  <div className="flex items-start space-x-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${powerUp.gradient}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">{powerUp.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{powerUp.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Chi phí: {powerUp.cost} điểm</span>
                        <span>Lượt còn lại: {powerUp.remainingUses}</span>
                        {powerUp.duration && <span>Thời gian: {powerUp.duration}s</span>}
                      </div>
                      {status === 'available' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handlePowerUpUse(powerUp.id)}
                          disabled={isUsingPowerUp}
                          className="mt-3 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all duration-200"
                        >
                          {isUsingPowerUp ? 'Đang sử dụng...' : 'Sử dụng Power-up'}
                        </motion.button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips */}
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
          <div className="flex items-start space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Mẹo sử dụng Power-ups:</p>
              <ul className="text-xs text-blue-700 mt-1 space-y-1">
                <li>• Sử dụng Double Points cho câu hỏi khó</li>
                <li>• Time Freeze giúp bạn có thêm thời gian suy nghĩ</li>
                <li>• Shield bảo vệ bạn khỏi câu trả lời sai</li>
                <li>• Thu thập điểm bằng cách trả lời đúng câu hỏi</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernPowerUpsPanel;
