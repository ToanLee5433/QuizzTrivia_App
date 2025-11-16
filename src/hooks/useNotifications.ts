import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { notificationService } from '../services/notificationService';

/**
 * Hook to automatically generate notifications based on user actions
 */
export const useNotifications = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  /**
   * Send achievement notification
   */
  const notifyAchievement = async (
    achievementTitle: string,
    achievementDescription: string,
    icon: string = '🏆'
  ) => {
    if (!user?.uid) return;
    await notificationService.createAchievementNotification(
      user.uid,
      achievementTitle,
      achievementDescription,
      icon
    );
  };

  /**
   * Send quiz notification
   */
  const notifyQuiz = async (
    quizId: string,
    quizTitle: string,
    message: string,
    actionPath?: string
  ) => {
    if (!user?.uid) return;
    await notificationService.createQuizNotification(
      user.uid,
      quizId,
      quizTitle,
      message,
      actionPath ? {
        type: 'navigate',
        path: actionPath,
        label: 'View Quiz'
      } : undefined
    );
  };

  /**
   * Send social notification (like, comment, follow)
   */
  const notifySocial = async (
    toUserId: string,
    type: 'like' | 'comment' | 'follow',
    message: string,
    quizId?: string
  ) => {
    if (!user?.uid || !user?.displayName) return;
    await notificationService.createSocialNotification(
      toUserId,
      user.uid,
      user.displayName,
      type,
      message,
      quizId
    );
  };

  /**
   * Check and generate achievements based on stats
   */
  const checkAchievements = async (stats: {
    quizzesCompleted?: number;
    quizzesCreated?: number;
    perfectScores?: number;
    streak?: number;
  }) => {
    if (!user?.uid) return;
    await notificationService.checkAndGenerateAchievements(user.uid, stats);
  };

  /**
   * Notify quiz creator when someone completes their quiz
   */
  const notifyQuizCreator = async (
    creatorId: string,
    quizId: string,
    quizTitle: string
  ) => {
    if (!user?.displayName) return;
    await notificationService.notifyQuizCreator(
      creatorId,
      quizId,
      quizTitle,
      user.displayName
    );
  };

  return {
    notifyAchievement,
    notifyQuiz,
    notifySocial,
    checkAchievements,
    notifyQuizCreator
  };
};
