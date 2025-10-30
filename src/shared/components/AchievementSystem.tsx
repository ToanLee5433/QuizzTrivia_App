import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../lib/store';

import { useTranslation } from 'react-i18next';
import SafeHTML from 'ui/SafeHTML';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: {
    type: 'quiz_count' | 'score_average' | 'streak' | 'perfect_score' | 'time_record';
    value: number;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number; // 0-100
}

const ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt' | 'progress'>[] = [
  {
    id: 'first_quiz',
    title: '🎯 Bước đầu tiên',
    description: 'Hoàn thành quiz đầu tiên',
    icon: '🎯',
    condition: { type: 'quiz_count', value: 1 },
    rarity: 'common'
  },
  {
    id: 'quiz_master',
    title: '📚 Thạc sĩ Quiz',
    description: 'Hoàn thành 10 quiz',
    icon: '📚',
    condition: { type: 'quiz_count', value: 10 },
    rarity: 'rare'
  },
  {
    id: 'quiz_legend',
    title: '👑 Huyền thoại Quiz',
    description: 'Hoàn thành 50 quiz',
    icon: '👑',
    condition: { type: 'quiz_count', value: 50 },
    rarity: 'legendary'
  },
  {
    id: 'high_scorer',
    title: '⭐ Điểm cao',
    description: 'Đạt điểm trung bình trên 80%',
    icon: '⭐',
    condition: { type: 'score_average', value: 80 },
    rarity: 'rare'
  },
  {
    id: 'perfectionist',
    title: '💯 Hoàn hảo',
    description: 'Đạt 100% trong 1 quiz',
    icon: '💯',
    condition: { type: 'perfect_score', value: 100 },
    rarity: 'epic'
  },
  {
    id: 'streak_5',
    title: '🔥 Chuỗi 5',
    description: 'Hoàn thành 5 quiz liên tiếp',
    icon: '🔥',
    condition: { type: 'streak', value: 5 },
    rarity: 'rare'
  },
  {
    id: 'speed_demon',
    title: '⚡ Tốc độ ánh sáng',
    description: 'Hoàn thành quiz trong thời gian kỷ lục',
    icon: '⚡',
    condition: { type: 'time_record', value: 60 }, // seconds
    rarity: 'epic'
  }
];

const AchievementCard: React.FC<{ achievement: Achievement; onClaim: () => void }> = ({ 
  achievement, 
  onClaim 
}) => {
  const { t } = useTranslation();

  // Remove unused state since we use the modal from parent component

  const getRarityStyle = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-300 bg-gray-50';
      case 'rare':
        return 'border-blue-300 bg-blue-50';
      case 'epic':
        return 'border-purple-300 bg-purple-50';
      case 'legendary':
        return 'border-yellow-300 bg-yellow-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'text-gray-600';
      case 'rare':
        return 'text-blue-600';
      case 'epic':
        return 'text-purple-600';
      case 'legendary':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div
      className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
        achievement.unlocked
          ? getRarityStyle(achievement.rarity)
          : 'border-gray-200 bg-gray-100 opacity-60'
      } ${achievement.unlocked ? 'hover:scale-105 cursor-pointer' : ''}`}
      onClick={() => achievement.unlocked && onClaim()}
    >
      {/* Achievement Icon */}
      <div className="text-center mb-3">
        <div
          className={`text-4xl ${
            achievement.unlocked ? '' : 'grayscale'
          }`}
        >
          {achievement.icon}
        </div>
      </div>

      {/* Achievement Info */}
      <div className="text-center">
        <h3
          className={`font-bold text-lg mb-1 ${
            achievement.unlocked ? getRarityColor(achievement.rarity) : 'text-gray-500'
          }`}
        >
          {achievement.title}
        </h3>
        <SafeHTML content={achievement.description} className="text-sm text-gray-600 mb-2" />

        {/* Progress Bar */}
        {!achievement.unlocked && achievement.progress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${achievement.progress}%` }}
            ></div>
          </div>
        )}

        {/* Rarity Badge */}
        <div className="flex items-center justify-center">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              achievement.unlocked
                ? `${getRarityColor(achievement.rarity)} bg-white`
                : 'text-gray-500 bg-gray-200'
            }`}
          >
            {achievement.rarity.toUpperCase()}
          </span>
        </div>

        {/* Unlock Date */}
        {achievement.unlocked && achievement.unlockedAt && (
          <div className="text-xs text-gray-500 mt-2">
            {t('achievement.unlockedAt', {date: achievement.unlockedAt.toLocaleDateString('vi-VN')})}
          </div>
        )}
      </div>

      {/* Unlock Effect */}
      {achievement.unlocked && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-yellow-200 to-orange-200 opacity-20"></div>
      )}
    </div>
  );
};

const AchievementSystem: React.FC = () => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const userResults = useSelector((state: RootState) => state.quiz.userResults);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [newUnlocks, setNewUnlocks] = useState<Achievement[]>([]);
  const [showModal, setShowModal] = useState<Achievement | null>(null);

  const handleClaim = (achievement: Achievement) => {
    if (achievement.unlocked) {
      setShowModal(achievement);
    }
  };

  // Calculate achievements based on user stats
  useEffect(() => {
    if (!user || !userResults) return;

    // Mock user stats - replace with actual data
    const userStats = {
      quizCount: userResults.length || 5, // Mock: 5 quizzes completed
      averageScore: userResults.length > 0 
        ? userResults.reduce((sum, result) => sum + result.score, 0) / userResults.length 
        : 85, // Mock: 85% average
      perfectScores: userResults.filter(result => result.score === 100).length || 1, // Mock: 1 perfect
      currentStreak: 3, // Mock: 3 quiz streak
      bestTime: 45 // Mock: 45 seconds record
    };

    const updatedAchievements = ACHIEVEMENTS.map(achievement => {
      let progress = 0;
      let unlocked = false;

      switch (achievement.condition.type) {
        case 'quiz_count':
          progress = Math.min((userStats.quizCount / achievement.condition.value) * 100, 100);
          unlocked = userStats.quizCount >= achievement.condition.value;
          break;
        case 'score_average':
          progress = Math.min((userStats.averageScore / achievement.condition.value) * 100, 100);
          unlocked = userStats.averageScore >= achievement.condition.value;
          break;
        case 'perfect_score':
          progress = Math.min((userStats.perfectScores / 1) * 100, 100);
          unlocked = userStats.perfectScores >= 1;
          break;
        case 'streak':
          progress = Math.min((userStats.currentStreak / achievement.condition.value) * 100, 100);
          unlocked = userStats.currentStreak >= achievement.condition.value;
          break;
        case 'time_record':
          progress = userStats.bestTime <= achievement.condition.value ? 100 : 0;
          unlocked = userStats.bestTime <= achievement.condition.value;
          break;
      }

      return {
        ...achievement,
        unlocked,
        progress,
        unlockedAt: unlocked ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined
      };
    });

    setAchievements(updatedAchievements);
  }, [user, userResults]);

  // Show unlock notifications
  useEffect(() => {
    const newlyUnlocked = achievements.filter(a => 
      a.unlocked && !newUnlocks.find(nu => nu.id === a.id)
    );
    
    if (newlyUnlocked.length > 0) {
      setNewUnlocks(prev => [...prev, ...newlyUnlocked]);
      
      // Auto-hide notifications after 5 seconds
      setTimeout(() => {
        setNewUnlocks(prev => prev.filter(a => !newlyUnlocked.includes(a)));
      }, 5000);
    }
  }, [achievements, newUnlocks]);

  if (!user) return null;

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div>
      {/* Achievement Notifications */}
      {newUnlocks.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {newUnlocks.map(achievement => (
            <div
              key={achievement.id}
              className="bg-white border-2 border-yellow-300 rounded-lg p-4 shadow-lg animate-bounce"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{achievement.icon}</div>
                <div>
                  <h4 className="font-bold text-yellow-600">{t('achievement.unlocked')}</h4>
                  <p className="text-sm">{achievement.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Achievement Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-gray-900">🏆 Thành tích</h2>
          <div className="text-sm text-gray-600">
            {unlockedCount}/{totalCount} đã mở khóa
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {achievements.map(achievement => (
          <AchievementCard 
            key={achievement.id} 
            achievement={achievement} 
            onClaim={() => handleClaim(achievement)}
          />
        ))}
      </div>

      {/* Achievement Details Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="text-6xl mb-4">{showModal.icon}</div>
              <h3 className="text-xl font-bold mb-2">{showModal.title}</h3>
              <SafeHTML content={showModal.description} className="text-gray-600 mb-4" />
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowModal(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >{t('close')}
                </button>
                {showModal.unlocked && (
                  <button
                    onClick={() => {
                      // Share achievement
                      navigator.clipboard.writeText(`🎉 Tôi vừa mở khóa thành tích "${showModal.title}" trong Quiz App!`);
                      setShowModal(null);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {t('share')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementSystem;
