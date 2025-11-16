import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  Timestamp,
  getDocs,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface NotificationData {
  id: string;
  userId: string;
  type: 'achievement' | 'quiz' | 'social' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon?: string;
  action?: {
    type: 'navigate' | 'external';
    path?: string;
    url?: string;
    label: string;
  };
  metadata?: {
    quizId?: string;
    achievementId?: string;
    fromUserId?: string;
    fromUserName?: string;
  };
}

class NotificationService {
  private unsubscribe: (() => void) | null = null;

  /**
   * Subscribe to user's notifications in real-time
   */
  subscribeToNotifications(
    userId: string, 
    callback: (notifications: NotificationData[]) => void
  ): () => void {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications: NotificationData[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          timestamp: data.timestamp?.toDate() || new Date(),
          read: data.read || false,
          icon: data.icon,
          action: data.action,
          metadata: data.metadata
        };
      });

      callback(notifications);
    });

    return () => this.unsubscribe?.();
  }

  /**
   * Create achievement notification
   */
  async createAchievementNotification(
    userId: string,
    achievementTitle: string,
    achievementDescription: string,
    icon: string = '🏆'
  ): Promise<void> {
    const notificationsRef = collection(db, 'notifications');
    await addDoc(notificationsRef, {
      userId,
      type: 'achievement',
      title: `Achievement Unlocked: ${achievementTitle}`,
      message: achievementDescription,
      timestamp: serverTimestamp(),
      read: false,
      icon,
      metadata: {
        achievementId: achievementTitle
      }
    });
  }

  /**
   * Create quiz notification (new quiz, quiz updated, etc.)
   */
  async createQuizNotification(
    userId: string,
    quizId: string,
    quizTitle: string,
    message: string,
    action?: { type: 'navigate' | 'external'; path?: string; url?: string; label: string }
  ): Promise<void> {
    const notificationsRef = collection(db, 'notifications');
    await addDoc(notificationsRef, {
      userId,
      type: 'quiz',
      title: `Quiz: ${quizTitle}`,
      message,
      timestamp: serverTimestamp(),
      read: false,
      icon: '📝',
      action,
      metadata: {
        quizId
      }
    });
  }

  /**
   * Create social notification (like, comment, follow)
   */
  async createSocialNotification(
    userId: string,
    fromUserId: string,
    fromUserName: string,
    type: 'like' | 'comment' | 'follow',
    message: string,
    quizId?: string
  ): Promise<void> {
    const icons = {
      like: '❤️',
      comment: '💬',
      follow: '👥'
    };

    const notificationsRef = collection(db, 'notifications');
    await addDoc(notificationsRef, {
      userId,
      type: 'social',
      title: type === 'like' ? 'New Like' : type === 'comment' ? 'New Comment' : 'New Follower',
      message,
      timestamp: serverTimestamp(),
      read: false,
      icon: icons[type],
      action: quizId ? {
        type: 'navigate',
        path: `/quiz/${quizId}`,
        label: 'View Quiz'
      } : undefined,
      metadata: {
        fromUserId,
        fromUserName,
        quizId
      }
    });
  }

  /**
   * Create system notification (from admin)
   */
  async createSystemNotification(
    message: string,
    targetRole: 'all' | 'user' | 'creator' | 'admin' = 'all',
    type: 'info' | 'warning' | 'success' | 'error' = 'info'
  ): Promise<void> {
    const systemNotificationsRef = collection(db, 'system_notifications');
    await addDoc(systemNotificationsRef, {
      message,
      type,
      targetRole,
      createdAt: serverTimestamp(),
      isActive: true
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((document) => {
      batch.update(document.ref, { read: true });
    });

    await batch.commit();
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      deleted: true
    });
  }

  /**
   * Auto-generate achievement notifications based on user stats
   */
  async checkAndGenerateAchievements(userId: string, stats: {
    quizzesCompleted?: number;
    quizzesCreated?: number;
    perfectScores?: number;
    streak?: number;
  }): Promise<void> {
    const achievements = [
      { threshold: 1, title: 'First Step', description: 'Complete your first quiz!', icon: '🎯', key: 'quizzesCompleted' },
      { threshold: 10, title: 'Quiz Enthusiast', description: 'Complete 10 quizzes!', icon: '📚', key: 'quizzesCompleted' },
      { threshold: 50, title: 'Quiz Master', description: 'Complete 50 quizzes!', icon: '🏆', key: 'quizzesCompleted' },
      { threshold: 100, title: 'Quiz Legend', description: 'Complete 100 quizzes!', icon: '👑', key: 'quizzesCompleted' },
      { threshold: 1, title: 'Creator', description: 'Create your first quiz!', icon: '✨', key: 'quizzesCreated' },
      { threshold: 10, title: 'Prolific Creator', description: 'Create 10 quizzes!', icon: '🎨', key: 'quizzesCreated' },
      { threshold: 1, title: 'Perfectionist', description: 'Get your first perfect score!', icon: '💯', key: 'perfectScores' },
      { threshold: 5, title: 'Excellence', description: 'Get 5 perfect scores!', icon: '⭐', key: 'perfectScores' },
      { threshold: 7, title: 'Week Warrior', description: '7-day streak!', icon: '🔥', key: 'streak' },
      { threshold: 30, title: 'Monthly Champion', description: '30-day streak!', icon: '🌟', key: 'streak' },
    ];

    for (const achievement of achievements) {
      const statValue = stats[achievement.key as keyof typeof stats] || 0;
      
      if (statValue === achievement.threshold) {
        await this.createAchievementNotification(
          userId,
          achievement.title,
          achievement.description,
          achievement.icon
        );
      }
    }
  }

  /**
   * Notify quiz creator when someone completes their quiz
   */
  async notifyQuizCreator(
    creatorId: string,
    quizId: string,
    quizTitle: string,
    completedByUserName: string
  ): Promise<void> {
    await this.createQuizNotification(
      creatorId,
      quizId,
      quizTitle,
      `${completedByUserName} completed your quiz!`,
      {
        type: 'navigate',
        path: `/quiz/${quizId}/results`,
        label: 'View Results'
      }
    );
  }

  /**
   * Notify users about trending quizzes
   */
  async notifyTrendingQuiz(
    userId: string,
    quizId: string,
    quizTitle: string,
    category: string
  ): Promise<void> {
    await this.createQuizNotification(
      userId,
      quizId,
      quizTitle,
      `Trending quiz in ${category} - Check it out!`,
      {
        type: 'navigate',
        path: `/quiz/${quizId}`,
        label: 'Take Quiz'
      }
    );
  }

  /**
   * Clean up method
   */
  unsubscribeAll(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

export const notificationService = new NotificationService();
