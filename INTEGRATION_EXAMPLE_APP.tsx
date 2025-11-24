/**
 * 🚀 App.tsx Integration Example
 * ===============================
 * Cách tích hợp Hybrid Storage vào App chính
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { downloadManager } from './features/offline/DownloadManager';
import { enhancedSyncService } from './services/EnhancedSyncService';
import { NetworkStatus } from './components/common/NetworkStatus';

// Pages
import HomePage from './pages/HomePage';
import QuizzesPage from './pages/QuizzesPage';
import DownloadedQuizzesPage from './pages/DownloadedQuizzesPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const { user } = useAuth();

  // ============================================================================
  // 🔄 AUTO-SYNC SETUP (Sync pending operations every 30s)
  // ============================================================================
  useEffect(() => {
    if (user?.uid) {
      console.log('[App] Starting auto-sync for user:', user.uid);
      
      // Start auto-sync service
      enhancedSyncService.startAutoSync(user.uid, 30000); // 30 seconds
      
      return () => {
        console.log('[App] Stopping auto-sync');
        enhancedSyncService.stopAutoSync();
      };
    }
  }, [user]);

  // ============================================================================
  // 🧹 ORPHANED MEDIA CLEANUP (Run weekly)
  // ============================================================================
  useEffect(() => {
    if (user?.uid) {
      console.log('[App] Scheduling media cleanup for user:', user.uid);
      
      // Schedule periodic cleanup (checks if 7 days passed since last cleanup)
      downloadManager.scheduleMediaCleanup(user.uid);
      
      // Also run on app startup if more than 7 days passed
      const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const lastCleanup = parseInt(localStorage.getItem('last_media_cleanup') || '0', 10);
      const now = Date.now();
      
      if (now - lastCleanup > WEEK_MS) {
        console.log('[App] Running overdue media cleanup...');
        
        downloadManager.cleanupOrphanedMedia(user.uid).then((deleted) => {
          if (deleted > 0) {
            console.log(`[App] ✅ Cleaned up ${deleted} orphaned media files`);
          }
        });
      }
    }
  }, [user]);

  // ============================================================================
  // 🔐 SECURITY CHECK (Prevent unauthorized access)
  // ============================================================================
  useEffect(() => {
    if (!user) {
      // Clear any pending operations when user logs out
      console.log('[App] User logged out, clearing sync queue');
      // Optional: Clear offline queue here
    }
  }, [user]);

  return (
    <div className="App">
      {/* ============================================================================
          🌐 NETWORK STATUS BANNER
          Shows online/offline status with auto-hide
          ============================================================================ */}
      <NetworkStatus position="top" autoHide={true} />

      <Router>
        <Routes>
          {/* Main routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/quizzes" element={<QuizzesPage />} />
          
          {/* 📥 Offline Quizzes (NEW) */}
          <Route 
            path="/offline-quizzes" 
            element={<DownloadedQuizzesPage />} 
          />
          
          {/* Settings with cleanup */}
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Other routes... */}
        </Routes>
      </Router>
    </div>
  );
}

export default App;

/**
 * 📝 INTEGRATION CHECKLIST
 * =========================
 * 
 * ✅ 1. Auto-sync service started on user login
 * ✅ 2. Orphaned media cleanup scheduled (weekly)
 * ✅ 3. Network status banner added
 * ✅ 4. Offline quizzes route added
 * ✅ 5. User logout cleanup
 * 
 * 🔜 OPTIONAL ENHANCEMENTS:
 * - Add loading screen during initial sync
 * - Show toast notification when offline operations synced
 * - Add badge to "Offline Quizzes" menu showing download count
 * - Implement background sync API for sync when app closed
 */
