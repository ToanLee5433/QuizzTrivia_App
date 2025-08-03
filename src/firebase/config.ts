import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB6bUM5UFLNcwPYDFPkdW2i6uy-QH7ldsA",
  authDomain: "quiz-app-85db6.firebaseapp.com",
  projectId: "quiz-app-85db6",
  storageBucket: "quiz-app-85db6.firebasestorage.app",
  messagingSenderId: "609646993082",
  appId: "1:609646993082:web:202a0d6d0ab5e0c6ac2c83",
  measurementId: "G-M7B6P9R97Y"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
