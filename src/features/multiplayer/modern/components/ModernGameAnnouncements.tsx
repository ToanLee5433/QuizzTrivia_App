import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Trophy, 
  CheckCircle,
  Zap,
  Star,
  Bell,
  Users,
  Target,
  Flame,
  Rocket,
  AlertCircle,
  Crown,
  Info,
  PartyPopper,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDatabase, ref, onValue, off, push } from 'firebase/database';

export type AnnouncementType = 
  | 'player_joined'
  | 'player_left'
  | 'game_starting'
  | 'game_started'
  | 'question_start'
  | 'correct_answer'
  | 'wrong_answer'
  | 'streak_achievement'
  | 'leaderboard_change'
  | 'powerup_used'
  | 'room_settings_change'
  | 'achievement_unlocked'
  | 'celebration'
  | 'warning'
  | 'info';

interface GameAnnouncement {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string;
  userId?: string;
  username?: string;
  photoURL?: string;
  data?: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ModernGameAnnouncementsProps {
  roomId: string;
  currentUserId: string;
  maxAnnouncements?: number;
  showSoundEffects?: boolean;
  position?: 'top-right' | 'top-center' | 'bottom-right';
}

const ModernGameAnnouncements: React.FC<ModernGameAnnouncementsProps> = ({
  roomId,
  maxAnnouncements = 5,
  showSoundEffects = true,
  position = 'top-right'
}) => {
  const [announcements, setAnnouncements] = useState<GameAnnouncement[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  const db = getDatabase();

  // Listen to announcements
  useEffect(() => {
    if (!roomId || !db) return;

    const announcementsRef = ref(db, `rooms/${roomId}/announcements`);
    const unsubscribe = onValue(announcementsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const announcementsList: GameAnnouncement[] = Object.entries(data)
          .map(([id, announcement]: [string, any]) => ({
            id,
            ...announcement
          }))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, maxAnnouncements);

        setAnnouncements(announcementsList);
      }
    });

    return () => off(announcementsRef, 'value', unsubscribe);
  }, [roomId, db, maxAnnouncements]);

  // Auto-remove old announcements
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setAnnouncements(prev => prev.filter(announcement => {
        const age = now - announcement.timestamp;
        const maxAge = (announcement.duration || 5000) + (announcement.priority === 'urgent' ? 10000 : 0);
        return age < maxAge;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getAnnouncementIcon = (type: AnnouncementType) => {
    switch (type) {
      case 'player_joined': return <Users className="w-5 h-5" />;
      case 'player_left': return <Users className="w-5 h-5" />;
      case 'game_starting': return <Rocket className="w-5 h-5" />;
      case 'game_started': return <Trophy className="w-5 h-5" />;
      case 'question_start': return <Target className="w-5 h-5" />;
      case 'correct_answer': return <CheckCircle className="w-5 h-5" />;
      case 'wrong_answer': return <AlertCircle className="w-5 h-5" />;
      case 'streak_achievement': return <Flame className="w-5 h-5" />;
      case 'leaderboard_change': return <Crown className="w-5 h-5" />;
      case 'powerup_used': return <Zap className="w-5 h-5" />;
      case 'room_settings_change': return <Info className="w-5 h-5" />;
      case 'achievement_unlocked': return <Star className="w-5 h-5" />;
      case 'celebration': return <PartyPopper className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getAnnouncementColor = (type: AnnouncementType, priority: string) => {
    if (priority === 'urgent') return 'from-red-500 to-pink-500';
    if (priority === 'high') return 'from-orange-500 to-red-500';
    if (priority === 'medium') return 'from-blue-500 to-cyan-500';
    
    switch (type) {
      case 'player_joined': return 'from-green-500 to-emerald-500';
      case 'player_left': return 'from-gray-500 to-gray-600';
      case 'game_starting': return 'from-purple-500 to-pink-500';
      case 'game_started': return 'from-yellow-500 to-orange-500';
      case 'correct_answer': return 'from-green-500 to-emerald-500';
      case 'wrong_answer': return 'from-red-500 to-pink-500';
      case 'streak_achievement': return 'from-orange-500 to-red-500';
      case 'leaderboard_change': return 'from-purple-500 to-indigo-500';
      case 'powerup_used': return 'from-blue-500 to-purple-500';
      case 'achievement_unlocked': return 'from-yellow-500 to-amber-500';
      case 'celebration': return 'from-pink-500 to-rose-500';
      case 'warning': return 'from-orange-500 to-red-500';
      case 'info': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right': return 'top-4 right-4';
      case 'top-center': return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right': return 'bottom-4 right-4';
      default: return 'top-4 right-4';
    }
  };

  const playSound = (type: AnnouncementType) => {
    if (!showSoundEffects) return;
    
    // Sound implementation would go here
    // For now, we'll just log it
    console.log('Playing sound for:', type);
  };

  useEffect(() => {
    announcements.forEach(announcement => {
      if (announcement.timestamp > Date.now() - 1000) {
        playSound(announcement.type);
      }
    });
  }, [announcements, showSoundEffects]);

  const removeAnnouncement = useCallback((id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  }, []);

  if (!isVisible || announcements.length === 0) {
    return null;
  }

  return (
    <div className={`fixed z-50 ${getPositionClasses()} space-y-3 max-w-sm w-full`}>
      <AnimatePresence>
        {announcements.map((announcement) => {
          const Icon = getAnnouncementIcon(announcement.type);
          const colorClass = getAnnouncementColor(announcement.type, announcement.priority);
          
          return (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, x: position.includes('right') ? 100 : position.includes('left') ? -100 : 0, y: position.includes('top') ? -50 : 50 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: position.includes('right') ? 100 : position.includes('left') ? -100 : 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`relative bg-gradient-to-r ${colorClass} rounded-2xl shadow-2xl border border-white/20 overflow-hidden backdrop-blur-lg`}
            >
              {/* Priority Indicator */}
              {announcement.priority === 'urgent' && (
                <motion.div
                  className="absolute inset-0 bg-red-500/20"
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}

              <div className="p-4">
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <div className="text-white">
                      {Icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-bold text-sm truncate">
                        {announcement.title}
                      </h4>
                      <button
                        onClick={() => removeAnnouncement(announcement.id)}
                        className="ml-2 text-white/60 hover:text-white transition-colors"
                      >
                        <span className="text-xs">✕</span>
                      </button>
                    </div>
                    
                    <p className="text-white/80 text-xs mt-1 line-clamp-2">
                      {announcement.message}
                    </p>

                    {/* User Info */}
                    {announcement.username && (
                      <div className="flex items-center space-x-2 mt-2">
                        {announcement.photoURL ? (
                          <img
                            src={announcement.photoURL}
                            alt={announcement.username}
                            className="w-5 h-5 rounded-full object-cover border border-white/30"
                          />
                        ) : (
                          <div className="w-5 h-5 bg-white/30 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {announcement.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-white/70 text-xs">
                          {announcement.username}
                        </span>
                      </div>
                    )}

                    {/* Action Button */}
                    {announcement.action && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={announcement.action.onClick}
                        className="mt-3 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs font-medium transition-colors"
                      >
                        {announcement.action.label}
                      </motion.button>
                    )}

                    {/* Additional Data Display */}
                    {announcement.data && (
                      <div className="mt-2 space-y-1">
                        {announcement.data.points && (
                          <div className="flex items-center space-x-1 text-white/70 text-xs">
                            <Trophy className="w-3 h-3" />
                            <span>+{announcement.data.points} điểm</span>
                          </div>
                        )}
                        {announcement.data.streak && (
                          <div className="flex items-center space-x-1 text-white/70 text-xs">
                            <Flame className="w-3 h-3" />
                            <span>{announcement.data.streak} chuỗi</span>
                          </div>
                        )}
                        {announcement.data.rank && (
                          <div className="flex items-center space-x-1 text-white/70 text-xs">
                            <Crown className="w-3 h-3" />
                            <span>Hạng #{announcement.data.rank}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar for timed announcements */}
              {announcement.duration && (
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-white/30"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: announcement.duration / 1000, ease: 'linear' }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Toggle Visibility Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsVisible(!isVisible)}
        className="p-2 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-colors"
      >
        <Bell className="w-4 h-4" />
      </motion.button>
    </div>
  );
};

// Hook for creating announcements
export const useGameAnnouncements = (roomId: string) => {
  const db = getDatabase();
  const { t } = useTranslation('multiplayer');

  const createAnnouncement = useCallback((
    type: AnnouncementType,
    title: string,
    message: string,
    options: {
      userId?: string;
      username?: string;
      photoURL?: string;
      data?: any;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    } = {}
  ) => {
    // Build announcement object, excluding undefined values (Firebase RTDB doesn't allow undefined)
    const announcement: Omit<GameAnnouncement, 'id'> = {
      type,
      title,
      message,
      timestamp: Date.now(),
      priority: options.priority || 'medium',
      duration: options.duration || 5000,
    };
    
    // Only add optional fields if they have values
    if (options.userId) announcement.userId = options.userId;
    if (options.username) announcement.username = options.username;
    if (options.photoURL) announcement.photoURL = options.photoURL;
    if (options.data) announcement.data = options.data;
    if (options.action) announcement.action = options.action;

    const announcementsRef = ref(db, `rooms/${roomId}/announcements`);
    push(announcementsRef, announcement);
  }, [roomId, db]);

  // Predefined announcement creators
  const announcePlayerJoined = useCallback((username: string, photoURL?: string) => {
    createAnnouncement('player_joined', t('announcements.newPlayer', 'Người chơi mới'), t('announcements.playerJoined', '{{username}} đã tham gia phòng', { username }), {
      username,
      photoURL,
      priority: 'low'
    });
  }, [createAnnouncement, t]);

  const announcePlayerLeft = useCallback((username: string, photoURL?: string) => {
    createAnnouncement('player_left', t('announcements.playerLeft', 'Người chơi rời đi'), t('announcements.playerLeftMessage', '{{username}} đã rời phòng', { username }), {
      username,
      photoURL,
      priority: 'medium'
    });
  }, [createAnnouncement, t]);

  const announceGameStarting = useCallback((delay: number) => {
    createAnnouncement('game_starting', t('announcements.gameStartingSoon', 'Game sắp bắt đầu!'), t('announcements.startingIn', 'Bắt đầu sau {{delay}} giây', { delay }), {
      priority: 'high',
      duration: delay * 1000
    });
  }, [createAnnouncement, t]);

  const announceCorrectAnswer = useCallback((username: string, points: number, streak?: number) => {
    createAnnouncement('correct_answer', t('announcements.correctAnswer', 'Đáp án đúng!'), t('announcements.answeredCorrectly', '{{username}} đã trả lời đúng!', { username }), {
      username,
      data: { points, streak },
      priority: 'medium'
    });
  }, [createAnnouncement, t]);

  const announceStreakAchievement = useCallback((username: string, streak: number) => {
    createAnnouncement('streak_achievement', t('announcements.streakAchievement', 'Thành tựu chuỗi!'), t('announcements.streakReached', '{{username}} đạt {{streak}} chuỗi đúng!', { username, streak }), {
      username,
      data: { streak },
      priority: 'high'
    });
  }, [createAnnouncement, t]);

  const announcePowerUpUsed = useCallback((username: string, powerUp: string) => {
    createAnnouncement('powerup_used', 'Power-up đã sử dụng!', `${username} đã sử dụng ${powerUp}`, {
      username,
      priority: 'medium'
    });
  }, [createAnnouncement]);

  const announceAchievementUnlocked = useCallback((username: string, achievement: string) => {
    createAnnouncement('achievement_unlocked', 'Thành tựu mở khóa!', `${username} đã mở khóa: ${achievement}`, {
      username,
      priority: 'high',
      duration: 8000
    });
  }, [createAnnouncement]);

  return {
    createAnnouncement,
    announcePlayerJoined,
    announcePlayerLeft,
    announceGameStarting,
    announceCorrectAnswer,
    announceStreakAchievement,
    announcePowerUpUsed,
    announceAchievementUnlocked
  };
};

export default ModernGameAnnouncements;
