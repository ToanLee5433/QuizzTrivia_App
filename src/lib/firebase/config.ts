// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// import { getDatabase, Database } from "firebase/database"; // Disabled - not configured
import { getAnalytics } from "firebase/analytics";
// import { toast } from "react-toastify";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDtBzTHNPQ5PxKhVb-si89kgr5T_3ppwj8",
  authDomain: "datn-quizapp.firebaseapp.com",
  projectId: "datn-quizapp",
  storageBucket: "datn-quizapp.firebasestorage.app",
  messagingSenderId: "741975099365",
  appId: "1:741975099365:web:75a1d1eb4b6d89f0f7110c",
  measurementId: "G-6Y1VQMBGJ0"
};

import { getApps, getApp } from "firebase/app";
// Initialize Firebase chỉ 1 lần duy nhất
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Auth persistence error:", error);
  });

export const db = getFirestore(app);
export const storage = getStorage(app);

// Optional analytics
let analytics: any = null;
if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn("Analytics not available:", error);
  }
}
export { analytics };

// Initialize offline support for Firestore
let firestoreOfflineInitialized = false;

export async function initializeFirestoreOffline() {
  if (firestoreOfflineInitialized || typeof window === 'undefined') {
    return;
  }

  try {
    await enableIndexedDbPersistence(db);
    console.log('✅ Firestore offline persistence enabled');
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ The current browser does not support offline persistence');
    }
  }
  
  firestoreOfflineInitialized = true;
}

// Preload data for offline usage - Simplified version
export async function preloadOfflineData() {
  console.log('📦 Offline preload functionality temporarily disabled');
  // Functionality can be re-implemented when offline services are available
}

// Sync pending data when coming back online - Simplified version
export async function syncPendingData() {
  console.log('🔄 Sync functionality temporarily disabled');
  // Functionality can be re-implemented when offline services are available
}

// Connection status monitoring - Simplified version
export function initializeConnectionMonitoring() {
  console.log('🌐 Connection monitoring temporarily disabled');
  // Functionality can be re-implemented when offline services are available
}

// Export simplified Firebase app
export default app;

// Initialize connection monitoring when module loads
if (typeof window !== 'undefined') {
  initializeConnectionMonitoring();
}
