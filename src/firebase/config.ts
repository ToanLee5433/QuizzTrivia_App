import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase, Database } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDtBzTHNPQ5PxKhVb-si89kgr5T_3ppwj8",
  authDomain: "datn-quizapp.firebaseapp.com",
  databaseURL: "https://datn-quizapp-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "datn-quizapp",
  storageBucket: "datn-quizapp.firebasestorage.app",
  messagingSenderId: "741975099365",
  appId: "1:741975099365:web:75a1d1eb4b6d89f0f7110c",
  measurementId: "G-6Y1VQMBGJ0"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize services with error handling
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Realtime Database with proper error handling
let realtimeDb: Database;
try {
  realtimeDb = getDatabase(app);
  console.log('✅ Firebase Realtime Database initialized successfully');
  console.log('🔗 Database URL:', firebaseConfig.databaseURL);
} catch (error) {
  console.error('❌ Failed to initialize Realtime Database:', error);
  console.log('🔧 Trying alternative initialization...');
  
  // Try with default region
  try {
    realtimeDb = getDatabase(app, "https://datn-quizapp-default-rtdb.firebaseio.com/");
    console.log('✅ Realtime Database initialized with fallback URL');
  } catch (fallbackError) {
    console.error('❌ Fallback initialization also failed:', fallbackError);
    throw fallbackError;
  }
}

export { realtimeDb };

// Initialize Analytics (optional)
let analytics;
try {
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.warn('Analytics not available:', error);
}
export { analytics };
