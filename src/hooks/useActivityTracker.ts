import { useEffect } from 'react';
import { auth, db } from '../lib/firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Hook để track user activity và cập nhật lastActive timestamp
 * Cập nhật mỗi 2 phút nếu user đang hoạt động
 */
export const useActivityTracker = () => {
  useEffect(() => {
    let activityTimer: NodeJS.Timeout | null = null;
    let lastActivityTime = Date.now();

    const updateLastActive = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          lastActive: serverTimestamp()
        });
        console.log('✅ Updated lastActive for user:', currentUser.uid);
      } catch (error) {
        console.error('⚠️ Failed to update lastActive:', error);
      }
    };

    // Track các sự kiện user interaction
    const handleUserActivity = () => {
      lastActivityTime = Date.now();
    };

    // Lắng nghe các sự kiện activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    // Cập nhật lastActive mỗi 2 phút nếu user đang hoạt động
    const startActivityTimer = () => {
      activityTimer = setInterval(() => {
        const timeSinceLastActivity = Date.now() - lastActivityTime;
        
        // Chỉ update nếu user có hoạt động trong 2 phút qua
        if (timeSinceLastActivity < 2 * 60 * 1000) {
          updateLastActive();
        }
      }, 2 * 60 * 1000); // Mỗi 2 phút
    };

    // Bắt đầu timer khi mount
    startActivityTimer();

    // Cleanup
    return () => {
      if (activityTimer) {
        clearInterval(activityTimer);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, []);
};
