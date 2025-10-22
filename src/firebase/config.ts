import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase, Database } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB6bUM5UFLNcwPYDFPkdW2i6uy-QH7ldsA",
  authDomain: "quiz-app-85db6.firebaseapp.com",
  databaseURL: "https://quiz-app-85db6-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "quiz-app-85db6",
  storageBucket: "quiz-app-85db6.firebasestorage.app",
  messagingSenderId: "609646993082",
  appId: "1:609646993082:web:202a0d6d0ab5e0c6ac2c83",
  measurementId: "G-M7B6P9R97Y"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize services with error handling
export const db = getFirestore(app);
export const auth = getAuth(app);

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
    realtimeDb = getDatabase(app, "https://quiz-app-85db6-default-rtdb.firebaseio.com/");
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
