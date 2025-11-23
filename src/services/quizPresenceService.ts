/**
 * Quiz Presence Service
 * Tracks real-time viewers and active players for quizzes
 * Uses Firebase Realtime Database for real-time updates
 */

import { ref, onValue, set, onDisconnect, serverTimestamp, remove } from 'firebase/database';
import { rtdb } from '../lib/firebase/config';

export interface QuizPresence {
  currentViewers: number;
  activePlayers: number;
  viewersList: { [userId: string]: { name: string; joinedAt: number; isPlaying: boolean } };
}

class QuizPresenceService {

  /**
   * Register user as viewer/player of a quiz
   * Automatically removes presence on disconnect
   */
  async joinQuiz(quizId: string, userId: string, userName: string, isPlaying: boolean = false) {
    try {
      const presenceRef = ref(rtdb, `quizPresence/${quizId}/users/${userId}`);
      
      // Set up auto-removal on disconnect
      await onDisconnect(presenceRef).remove();
      
      // Register presence
      await set(presenceRef, {
        name: userName,
        joinedAt: serverTimestamp(),
        isPlaying,
        lastActive: serverTimestamp()
      });

      console.log(`✅ [Presence] Joined quiz ${quizId} as ${isPlaying ? 'player' : 'viewer'}`, {
        userId,
        userName,
        isPlaying,
        path: `quizPresence/${quizId}/users/${userId}`
      });
    } catch (error) {
      console.error('Error joining quiz:', error);
    }
  }

  /**
   * Update user status (viewer -> player)
   */
  async updatePlayingStatus(quizId: string, userId: string, isPlaying: boolean) {
    try {
      const presenceRef = ref(rtdb, `quizPresence/${quizId}/users/${userId}/isPlaying`);
      await set(presenceRef, isPlaying);
      
      // Update lastActive
      const lastActiveRef = ref(rtdb, `quizPresence/${quizId}/users/${userId}/lastActive`);
      await set(lastActiveRef, serverTimestamp());
    } catch (error) {
      console.error('Error updating playing status:', error);
    }
  }

  /**
   * Leave quiz (manual removal)
   */
  async leaveQuiz(quizId: string, userId: string) {
    try {
      const presenceRef = ref(rtdb, `quizPresence/${quizId}/users/${userId}`);
      await remove(presenceRef);
      console.log(`👋 Left quiz ${quizId}`);
    } catch (error) {
      console.error('Error leaving quiz:', error);
    }
  }

  /**
   * Subscribe to quiz presence updates
   * Returns unsubscribe function
   */
  subscribeToQuizPresence(
    quizId: string, 
    callback: (presence: QuizPresence) => void
  ): () => void {
    const presenceRef = ref(rtdb, `quizPresence/${quizId}/users`);
    
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const users = snapshot.val() || {};
      const viewersList = users;
      
      // Count viewers and players
      let currentViewers = 0;
      let activePlayers = 0;
      
      Object.values(users).forEach((user: any) => {
        currentViewers++;
        if (user.isPlaying) {
          activePlayers++;
        }
      });
      
      console.log(`📊 [Presence] Quiz ${quizId} update:`, {
        currentViewers,
        activePlayers,
        usersList: Object.keys(users),
        path: `quizPresence/${quizId}/users`
      });
      
      callback({
        currentViewers,
        activePlayers,
        viewersList
      });
    }, (error) => {
      console.error('❌ [Presence] Error subscribing to quiz presence:', error);
    });
    
    return unsubscribe;
  }

  /**
   * Clean up old presence data (users who disconnected more than 5 minutes ago)
   * Should be called periodically or via Cloud Function
   */
  async cleanupStalePresence(quizId: string) {
    try {
      const presenceRef = ref(rtdb, `quizPresence/${quizId}/users`);
      const snapshot = await new Promise<any>((resolve) => {
        onValue(presenceRef, resolve, { onlyOnce: true });
      });
      
      const users = snapshot.val() || {};
      const now = Date.now();
      const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
      
      for (const [userId, userData] of Object.entries(users)) {
        const lastActive = (userData as any).lastActive || 0;
        if (now - lastActive > STALE_THRESHOLD) {
          const userRef = ref(rtdb, `quizPresence/${quizId}/users/${userId}`);
          await remove(userRef);
          console.log(`🧹 Removed stale presence for user ${userId}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up stale presence:', error);
    }
  }
}

export const quizPresenceService = new QuizPresenceService();
