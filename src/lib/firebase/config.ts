// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { toast } from "react-toastify";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB6bUM5UFLNcwPYDFPkdW2i6uy-QH7ldsA",
  authDomain: "quiz-app-85db6.firebaseapp.com",
  projectId: "quiz-app-85db6",
  storageBucket: "quiz-app-85db6.appspot.com",
  messagingSenderId: "609646993082",
  appId: "1:609646993082:web:202a0d6d0ab5e0c6ac2c83",
  measurementId: "G-M7B6P9R97Y"
};

import { getApps, getApp } from "firebase/app";
// Initialize Firebase chỉ 1 lần duy nhất
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app); // Optional: uncomment if you want to use analytics

// Initialize Firebase services
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Auth persistence error:", error);
    toast.error("Có lỗi xảy ra khi thiết lập xác thực. Vui lòng tải lại trang.");
  });

// Initialize Firestore with modern configuration
export const db = getFirestore(app);

// Use modern cache settings instead of deprecated enableIndexedDbPersistence
// This is automatically handled by the new Firebase SDK

// Configure timeout for Firestore operations
export const FIRESTORE_TIMEOUT = 15000; // 15 seconds

export const withTimeout = async (promise: Promise<any>) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), FIRESTORE_TIMEOUT)
  );

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string' && (error as any).message === 'Request timeout') {
      toast.error("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.");
    }
    throw error;
  }
};

export default app;

// ...existing code...
