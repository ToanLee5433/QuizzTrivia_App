import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { AuthUser } from '../types/auth';

/**
 * Sync user role from localStorage to Firestore when possible
 */
export const syncUserRoleToFirestore = async (user: AuthUser): Promise<void> => {
  if (!user.uid) return;
  
  try {
    const localRole = localStorage.getItem(`user_role_${user.uid}`);
    if (!localRole) return;
    
    // Check if Firestore already has this role
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();
    
    if (userData?.role === localRole) {
      // Already synced, remove localStorage
      localStorage.removeItem(`user_role_${user.uid}`);
      return;
    }
    
    // Sync to Firestore
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      role: localRole,
      roleSelectedAt: new Date(),
      status: 'active',
      email: user.email,
      displayName: user.displayName,
      updatedAt: new Date(),
      syncedAt: new Date()
    }, { merge: true });
    
    // Remove from localStorage after successful sync
    localStorage.removeItem(`user_role_${user.uid}`);
    console.log('User role synced to Firestore successfully');
    
  } catch (error) {
    console.warn('Could not sync user role to Firestore:', error);
    // Keep in localStorage for later sync
  }
};

/**
 * Check and sync user roles on app initialization
 */
export const initializeRoleSync = async (user: AuthUser): Promise<void> => {
  // Wait a bit to allow auth to settle
  setTimeout(() => {
    syncUserRoleToFirestore(user);
  }, 2000);
};
