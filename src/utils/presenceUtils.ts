import { getDatabase, ref, set, serverTimestamp } from 'firebase/database';

/**
 * Manually set user presence to offline
 * Useful for logout, ban, or cleanup operations
 */
export const setUserOffline = async (userId: string): Promise<void> => {
  try {
    const rtdb = getDatabase();
    const statusRef = ref(rtdb, `status/${userId}`);
    
    await set(statusRef, {
      state: 'offline',
      lastChanged: serverTimestamp()
    });
    
    console.log(`✅ [PresenceUtils] Set user ${userId} to offline`);
  } catch (error) {
    console.error(`❌ [PresenceUtils] Failed to set user ${userId} offline:`, error);
    throw error;
  }
};

/**
 * Remove user presence data entirely
 * Use with caution - this deletes the presence record
 */
export const removeUserPresence = async (userId: string): Promise<void> => {
  try {
    const rtdb = getDatabase();
    const statusRef = ref(rtdb, `status/${userId}`);
    
    await set(statusRef, null);
    
    console.log(`✅ [PresenceUtils] Removed presence for user ${userId}`);
  } catch (error) {
    console.error(`❌ [PresenceUtils] Failed to remove presence for user ${userId}:`, error);
    throw error;
  }
};
