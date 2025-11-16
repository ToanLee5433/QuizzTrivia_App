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

  /**
   * Notify when quiz is approved
   */
  const notifyQuizApproved = async (
    userId: string,
    quizId: string,
    quizTitle: string
  ) => {
    await notificationService.notifyQuizApproved(userId, quizId, quizTitle);
  };

  /**
   * Notify when quiz is rejected
   */
  const notifyQuizRejected = async (
    userId: string,
    quizId: string,
    quizTitle: string,
    reason?: string
  ) => {
    await notificationService.notifyQuizRejected(userId, quizId, quizTitle, reason);
  };

  /**
   * Notify when quiz receives a review
   */
  const notifyQuizReviewed = async (
    userId: string,
    quizId: string,
    quizTitle: string,
    reviewerName: string,
    rating: number,
    comment?: string
  ) => {
    await notificationService.notifyQuizReviewed(userId, quizId, quizTitle, reviewerName, rating, comment);
  };

  /**
   * Notify when edit request is approved
   */
  const notifyEditRequestApproved = async (
    userId: string,
    quizId: string,
    quizTitle: string
  ) => {
    await notificationService.notifyEditRequestApproved(userId, quizId, quizTitle);
  };

  /**
   * Notify when edit request is rejected
   */
  const notifyEditRequestRejected = async (
    userId: string,
    quizId: string,
    quizTitle: string,
    reason?: string
  ) => {
    await notificationService.notifyEditRequestRejected(userId, quizId, quizTitle, reason);
  };

  /**
   * Notify admins when new quiz is submitted
   */
  const notifyAdminNewQuiz = async (
    adminIds: string[],
    quizId: string,
    quizTitle: string
  ) => {
    if (!user?.displayName) return;
    await notificationService.notifyAdminNewQuizSubmitted(adminIds, quizId, quizTitle, user.displayName);
  };

  /**
   * Notify admins when edit request is submitted
   */
  const notifyAdminEditRequest = async (
    adminIds: string[],
    quizId: string,
    quizTitle: string,
    reason: string
  ) => {
    if (!user?.displayName) return;
    await notificationService.notifyAdminEditRequest(adminIds, quizId, quizTitle, user.displayName, reason);
  };

  return {
    notifyAchievement,
    notifyQuiz,
    notifySocial,
    checkAchievements,
    notifyQuizCreator,
    notifyQuizApproved,
    notifyQuizRejected,
    notifyQuizReviewed,
    notifyEditRequestApproved,
    notifyEditRequestRejected,
    notifyAdminNewQuiz,
    notifyAdminEditRequest
  };
};
