/**
 * Quiz Access Service
 * Handles password-protected quiz access control
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
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
  visibility?: 'public' | 'password';
  havePassword?: 'public' | 'password';
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
  console.log('🔍 Quiz metadata:', {
    id: quizMetadata.id,
    visibility: quizMetadata.visibility,
    havePassword: quizMetadata.havePassword,
    status: quizMetadata.status,
    hasPwd: !!quizMetadata.pwd
  });

  // Validate quiz has password protection (check both old and new fields)
  const isPasswordProtected = 
    quizMetadata.visibility === 'password' || 
    quizMetadata.havePassword === 'password';
  
  if (!isPasswordProtected) {
    console.error('❌ Quiz is not password-protected:', {
      visibility: quizMetadata.visibility,
      havePassword: quizMetadata.havePassword
    });
    throw new Error('Quiz is not password-protected');
  }

  if (!quizMetadata.pwd || !quizMetadata.pwd.enabled) {
    console.error('❌ Quiz password data is missing or disabled:', quizMetadata.pwd);
    console.error('📋 Quiz info:', {
      id: quizMetadata.id,
      title: quizMetadata.title,
      havePassword: quizMetadata.havePassword,
      visibility: quizMetadata.visibility,
      createdBy: quizMetadata.createdBy
    });
    throw new Error(
      'Quiz này được đánh dấu có mật khẩu nhưng thiếu thông tin bảo mật. ' +
      'Vui lòng liên hệ người tạo quiz để cập nhật lại mật khẩu.'
    );
  }

  const { salt, hash: expectedHash } = quizMetadata.pwd;
  
  // Declare outside try to access in catch
  let proofHash: string = '';

  try {
    // 🔍 Check if user already has access (from previous unlock)
    const existingAccess = await hasQuizAccess(quizId, userId);
    if (existingAccess) {
      console.log('✅ User already has access to this quiz (unlocked previously)');
      // Verify password is still correct by generating hash and comparing
      proofHash = await generateProofHash(salt, password);
      if (proofHash === expectedHash) {
        console.log('✅ Password verified for existing access');
        return true;
      } else {
        console.log('❌ Password incorrect for existing access');
        return false;
      }
    }
    
    // CRITICAL DEBUG: Verify auth state before attempting write
    const currentUser = auth.currentUser;
    console.log('🔐 Auth check:', {
      isSignedIn: !!currentUser,
      currentUserId: currentUser?.uid,
      targetUserId: userId,
      userIdMatch: currentUser?.uid === userId,
      userEmail: currentUser?.email,
      userRole: quizMetadata.createdBy === currentUser?.uid ? 'creator' : 'user'
    });
    
    if (!currentUser) {
      throw new Error('User not authenticated - please sign in first');
    }
    
    if (currentUser.uid !== userId) {
      throw new Error(`User ID mismatch: current=${currentUser.uid}, target=${userId}`);
    }
    
    // Generate proof hash from user input
    proofHash = await generateProofHash(salt, password);
    
    console.log('🔍 Proof hash generated:', proofHash.substring(0, 16) + '...');
    console.log('🔍 Expected hash:', expectedHash.substring(0, 16) + '...');
    console.log('🔍 Hash match:', proofHash === expectedHash);
    console.log('🔍 Quiz pwd data:', {
      enabled: quizMetadata.pwd.enabled,
      algo: quizMetadata.pwd.algo,
      hasSalt: !!quizMetadata.pwd.salt,
      hasHash: !!quizMetadata.pwd.hash
    });

    // Create access document with proof hash
    // Firestore rules will verify proofHash === expectedHash
    const accessRef = doc(db, 'quizzes', quizId, 'access', userId);
    
    console.log('🔓 Attempting to create access doc at:', accessRef.path);
    console.log('🔓 Access data:', {
      proofHash: proofHash.substring(0, 16) + '...',
      userId,
      timestamp: 'serverTimestamp()'
    });
    
    await setDoc(accessRef, {
      proofHash,
      unlockedAt: serverTimestamp(),
      userId
    });

    console.log('✅ Quiz unlocked successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Error unlocking quiz:', error);
    console.error('❌ Error details:', {
      code: error.code,
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n')[0]
    });
    
    // If permission denied, password is wrong
    if (error.code === 'permission-denied') {
      console.log('🔒 Wrong password - Firestore rules rejected access creation');
      console.log('🔍 Debugging info:', {
        quizId,
        userId,
        accessPath: `quizzes/${quizId}/access/${userId}`,
        proofHashLength: proofHash?.length || 0,
        expectedHashLength: expectedHash.length
      });
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
