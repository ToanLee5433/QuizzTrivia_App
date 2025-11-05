/**
 * Quiz Access Service
 * Handles password-protected quiz access control
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { generateProofHash } from '../utils/passwordHash';

export interface QuizPasswordData {
  enabled: boolean;
  algo: string;
  salt: string;
  hash: string;
}

export interface QuizMetadata {
  id: string;
  title: string;
  visibility: 'public' | 'password';
  pwd?: QuizPasswordData;
  createdBy: string;
  [key: string]: any;
}

/**
 * Check if user has access to password-protected quiz
 * @param quizId - Quiz ID
 * @param userId - User ID
 * @returns true if access exists, false otherwise
 */
export async function hasQuizAccess(quizId: string, userId: string): Promise<boolean> {
  try {
    const accessRef = doc(db, 'quizzes', quizId, 'access', userId);
    const accessDoc = await getDoc(accessRef);
    return accessDoc.exists();
  } catch (error) {
    console.error('❌ Error checking quiz access:', error);
    return false;
  }
}

/**
 * Unlock password-protected quiz by creating access document
 * @param quizId - Quiz ID
 * @param userId - User ID  
 * @param password - Plain password entered by user
 * @param quizMetadata - Quiz metadata (must contain pwd info)
 * @returns true if unlock successful, false if password wrong
 * @throws Error if quiz is not password-protected or missing pwd data
 */
export async function unlockQuiz(
  quizId: string,
  userId: string,
  password: string,
  quizMetadata: QuizMetadata
): Promise<boolean> {
  console.log('🔓 Attempting to unlock quiz:', quizId);

  // Validate quiz has password protection
  if (quizMetadata.visibility !== 'password') {
    throw new Error('Quiz is not password-protected');
  }

  if (!quizMetadata.pwd || !quizMetadata.pwd.enabled) {
    throw new Error('Quiz password data is missing or disabled');
  }

  const { salt, hash: expectedHash } = quizMetadata.pwd;

  try {
    // Generate proof hash from user input
    const proofHash = await generateProofHash(salt, password);
    
    console.log('🔍 Proof hash generated:', proofHash.substring(0, 16) + '...');
    console.log('🔍 Expected hash:', expectedHash.substring(0, 16) + '...');

    // Create access document with proof hash
    // Firestore rules will verify proofHash === expectedHash
    const accessRef = doc(db, 'quizzes', quizId, 'access', userId);
    
    await setDoc(accessRef, {
      proofHash,
      unlockedAt: serverTimestamp(),
      userId
    });

    console.log('✅ Quiz unlocked successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Error unlocking quiz:', error);
    
    // If permission denied, password is wrong
    if (error.code === 'permission-denied') {
      console.log('🔒 Wrong password - Firestore rules rejected access creation');
      return false;
    }
    
    // Other errors
    throw error;
  }
}

/**
 * Get quiz metadata (always allowed for authenticated users)
 * @param quizId - Quiz ID
 * @returns Quiz metadata or null if not found
 */
export async function getQuizMetadata(quizId: string): Promise<QuizMetadata | null> {
  try {
    const quizRef = doc(db, 'quizzes', quizId);
    const quizDoc = await getDoc(quizRef);
    
    if (!quizDoc.exists()) {
      return null;
    }
    
    return {
      id: quizDoc.id,
      ...quizDoc.data()
    } as QuizMetadata;
  } catch (error) {
    console.error('❌ Error getting quiz metadata:', error);
    return null;
  }
}

/**
 * Check if questions can be accessed
 * Tries to read a single question to test permissions
 * @param quizId - Quiz ID
 * @returns Object with canAccess flag and reason
 */
export async function canAccessQuestions(quizId: string): Promise<{
  canAccess: boolean;
  reason: 'public' | 'unlocked' | 'owner' | 'locked' | 'error';
}> {
  try {
    // Try to get first question (just metadata, not full content)
    const questionsRef = doc(db, 'quizzes', quizId, 'questions', '_test');
    await getDoc(questionsRef);
    
    // If no error, we have access
    return { canAccess: true, reason: 'public' };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      return { canAccess: false, reason: 'locked' };
    }
    
    return { canAccess: false, reason: 'error' };
  }
}

/**
 * Remove quiz access (logout/cleanup)
 * @param quizId - Quiz ID
 * @param userId - User ID
 */
export async function removeQuizAccess(quizId: string, userId: string): Promise<void> {
  try {
    const accessRef = doc(db, 'quizzes', quizId, 'access', userId);
    await setDoc(accessRef, { deleted: true }); // Soft delete, or use deleteDoc
    console.log('🗑️ Quiz access removed');
  } catch (error) {
    console.error('❌ Error removing quiz access:', error);
  }
}
