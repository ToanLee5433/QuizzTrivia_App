/**
 * Firebase Config - Re-export
 * ===========================
 * This file re-exports from lib/firebase/config to maintain backward compatibility
 * All actual Firebase initialization happens in lib/firebase/config.ts
 */

export { 
  app,
  auth, 
  db, 
  storage, 
  rtdb,
  analytics,
  preloadOfflineData,
  syncPendingData
} from '../lib/firebase/config';
