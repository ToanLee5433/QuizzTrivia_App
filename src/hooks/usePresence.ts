import { useEffect } from 'react';
import { getDatabase, ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { auth } from '../lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Facebook-style Presence System using Firebase Realtime Database
 * 
 * Implements the same mechanisms as Facebook Messenger:
 * 1. WebSockets (via Firebase) for persistent connection
 * 2. Heartbeat mechanism (.info/connected)
 * 3. onDisconnect() for automatic offline on connection loss
 * 4. Idle detection with throttled event listeners
 * 5. Page Visibility & Window Focus detection
 * 
 * States:
 * - online: Đang hoạt động
 * - idle: Đang treo máy (5 phút không tương tác)
 * - offline: Mất kết nối hoàn toàn
 */

// Throttle utility (Facebook-style)
function throttle(func: Function, delay: number) {
  let lastCall = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

export const usePresence = () => {
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let lastUserId: string | null = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Cleanup previous presence setup if exists
      if (cleanup) {
        cleanup();
        cleanup = null;
      }

      // If user logged out, set previous user's status to offline
      if (!currentUser && lastUserId) {
        console.log('⏳ Presence: User logged out, setting offline for:', lastUserId);
        try {
          const rtdb = getDatabase();
          const prevStatusRef = ref(rtdb, `status/${lastUserId}`);
          await set(prevStatusRef, {
            state: 'offline',
            lastChanged: serverTimestamp()
          });
          console.log('✅ Presence: Set offline for logged out user:', lastUserId);
        } catch (error) {
          console.error('❌ Failed to set offline on logout:', error);
        }
        lastUserId = null;
        return;
      }

      if (!currentUser) {
        console.log('⏳ Presence: No user logged in');
        return;
      }

      // Update last user ID
      lastUserId = currentUser.uid;
      console.log('🟢 Presence: Setting up for user:', currentUser.uid);
      const rtdb = getDatabase();
      const connectedRef = ref(rtdb, '.info/connected');
      const myStatusRef = ref(rtdb, `status/${currentUser.uid}`);
      
      let idleTimeout: NodeJS.Timeout;
      let isIdle = false;
      let currentState: 'online' | 'idle' | 'offline' = 'offline';

      // Helper to update state (with deduplication)
      const updateState = async (newState: 'online' | 'idle' | 'offline') => {
        if (currentState === newState) {
          // Skip duplicate updates (Facebook optimization)
          return;
        }
        
        currentState = newState;
        try {
          await set(myStatusRef, {
            state: newState,
            lastChanged: serverTimestamp()
          });
          console.log(`✅ Presence: State changed to ${newState.toUpperCase()}`);
        } catch (error) {
          console.error(`❌ Presence: Failed to set ${newState}:`, error);
        }
      };

      // ===== 1. THEO DÕI KẾT NỐI (Heartbeat) =====
      const unsubscribe = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          // Khi kết nối thành công
          
          // 1a. Đăng ký lệnh "onDisconnect" - tự động offline khi mất kết nối
          onDisconnect(myStatusRef).set({
            state: 'offline',
            lastChanged: serverTimestamp()
          }).then(() => {
            // 1b. SAU KHI đăng ký xong, mới set Online
            updateState('online');
          }).catch((error) => {
            console.error('❌ Presence: Failed to setup onDisconnect:', error);
          });
        }
      });

      // ===== 2. XỬ LÝ IDLE (Treo máy) =====
      const resetIdleTimer = () => {
        clearTimeout(idleTimeout);
        
        // Nếu đang idle, chuyển về online
        if (isIdle) {
          isIdle = false;
          updateState('online');
        }

        // Set timeout 5 phút không tương tác → chuyển idle
        idleTimeout = setTimeout(() => {
          isIdle = true;
          updateState('idle');
        }, 5 * 60 * 1000); // 5 phút
      };

      // ===== 3. FACEBOOK-STYLE EVENT LISTENERS =====
      // Throttle: Chỉ xử lý 1 lần mỗi 2 giây (tránh spam)
      const throttledReset = throttle(resetIdleTimer, 2000);
      
      // User interaction events
      const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
      events.forEach(event => {
        window.addEventListener(event, throttledReset, { passive: true });
      });

      // ===== 4. PAGE VISIBILITY API (Facebook có) =====
      const handleVisibilityChange = () => {
        if (document.hidden) {
          console.log('📱 Tab hidden - user switched away');
          // Optional: Có thể giảm frequency của heartbeat
        } else {
          console.log('📱 Tab visible - user came back');
          resetIdleTimer();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // ===== 5. WINDOW FOCUS DETECTION (Facebook có) =====
      const handleFocus = () => {
        console.log('🪟 Window focused');
        resetIdleTimer();
      };
      
      const handleBlur = () => {
        console.log('🪟 Window blurred');
        // Optional: Start idle timer sớm hơn
      };
      
      window.addEventListener('focus', handleFocus);
      window.addEventListener('blur', handleBlur);

      // Khởi động timer lần đầu
      resetIdleTimer();

      // ===== 6. CLEANUP =====
      cleanup = () => {
        unsubscribe();
        clearTimeout(idleTimeout);
        
        // Remove all event listeners
        events.forEach(event => {
          window.removeEventListener(event, throttledReset);
        });
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('blur', handleBlur);
        
        // Set offline khi cleanup
        updateState('offline');
      };
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
      authUnsubscribe();
    };
  }, []);
};
