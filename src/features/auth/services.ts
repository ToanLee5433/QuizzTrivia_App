import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  sendEmailVerification,
  User as FirebaseUser,
  AuthError as FirebaseAuthError,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { AuthUser, LoginCredentials, RegisterCredentials } from './types';
import { User } from '../../shared/types';

/**
 * Sign in with email and password
 */
export const signIn = async (credentials: LoginCredentials): Promise<AuthUser> => {
  try {
    console.log('🔵 Attempting login for:', credentials.email);
    
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    
    console.log('🟢 Firebase login successful, UID:', userCredential.user.uid);
    
    // Kiểm tra nếu là tài khoản admin cố định
    const isAdminAccount = credentials.email === 'admin123@gmail.com';
    let userRole: 'user' | 'creator' | 'admin' | undefined;
    
    if (isAdminAccount) {
      // Tự động gán role admin
      userRole = 'admin';
      console.log('🛡️ Admin account detected, setting role to admin');
      
      // Lưu role admin vào Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        role: 'admin',
        isAdmin: true,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || 'System Admin',
        updatedAt: new Date()
      }, { merge: true });
      
      // Lưu vào localStorage
      localStorage.setItem(`user_role_${userCredential.user.uid}`, 'admin');
      localStorage.setItem('isAdmin', 'true');
      console.log('💾 Admin role saved');
    } else {
      // Lấy role từ Firestore cho user thường
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();
      userRole = userData?.role;
      console.log('🔍 Role from Firestore:', userRole);
    }
    
    const authUser = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      photoURL: userCredential.user.photoURL,
      emailVerified: userCredential.user.emailVerified,
      role: userRole,
    };
    
    console.log('🚀 Returning auth user:', authUser);
    return authUser;
    
  } catch (error) {
    const authError = error as FirebaseAuthError;
    console.error('❌ Login error:', authError);
    throw new Error(getAuthErrorMessage(authError.code));
  }
};

/**
 * Register new user
 */
export const register = async (credentials: RegisterCredentials): Promise<AuthUser> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    // Cập nhật tên hiển thị
    await updateProfile(userCredential.user, {
      displayName: credentials.displayName,
    });

    // Tạo tài khoản người dùng trong Firestore với vai trò mặc định là 'user'
    const userData: User = {
      id: userCredential.user.uid,
      email: credentials.email,
      displayName: credentials.displayName,
      role: 'user', // Luôn là 'user' khi đăng ký
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        theme: 'light',
        language: 'vi',
        notifications: {
          email: true,
          push: true,
          quizReminders: true,
          newQuizzes: true,
        },
      },
      stats: {
        totalQuizzesTaken: 0,
        totalQuizzesCreated: 0,
        averageScore: 0,
        totalTimeSpent: 0,
        favoriteCategories: [],
        streak: 0,
        achievements: [],
      },
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), userData);

    // Gửi email xác thực
    await sendEmailVerification(userCredential.user);

    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      photoURL: userCredential.user.photoURL,
      emailVerified: userCredential.user.emailVerified,
      role: 'user', // Luôn trả về 'user'
    };
  } catch (error) {
    const authError = error as FirebaseAuthError;
    // Trả về lỗi tiếng Việt
    throw new Error(getAuthErrorMessage(authError.code));
  }
};

/**
 * Sign out user
 */
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    const authError = error as FirebaseAuthError;
    throw new Error(getAuthErrorMessage(authError.code));
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    const authError = error as FirebaseAuthError;
    throw new Error(getAuthErrorMessage(authError.code));
  }
};

/**
 * Update user password
 */
export const changePassword = async (newPassword: string): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('Người dùng chưa đăng nhập');
  }

  try {
    await updatePassword(auth.currentUser, newPassword);
  } catch (error) {
    const authError = error as FirebaseAuthError;
    throw new Error(getAuthErrorMessage(authError.code));
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (updates: {
  displayName?: string;
  photoURL?: string;
}): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('Người dùng chưa đăng nhập');
  }

  try {
    await updateProfile(auth.currentUser, updates);
    
    // Update user document in Firestore
    const userDoc = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userDoc, {
      displayName: updates.displayName,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
    throw new Error('Không thể cập nhật profile');
  }
};

/**
 * Get current user data from Firestore
 */
export const getCurrentUserData = async (): Promise<User | null> => {
  if (!auth.currentUser) {
    return null;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

/**
 * Convert Firebase auth error codes to Vietnamese messages
 */
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Không tìm thấy tài khoản với email này';
    case 'auth/wrong-password':
      return 'Mật khẩu không chính xác';
    case 'auth/email-already-in-use':
      return 'Email này đã được sử dụng';
    case 'auth/weak-password':
      return 'Mật khẩu quá yếu';
    case 'auth/invalid-email':
      return 'Email không hợp lệ';
    case 'auth/user-disabled':
      return 'Tài khoản đã bị vô hiệu hóa';
    case 'auth/too-many-requests':
      return 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
    case 'auth/network-request-failed':
      return 'Lỗi kết nối mạng';
    default:
      return 'Đã xảy ra lỗi không xác định';
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};

/**
 * Get current Firebase user
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

/**
 * Sign up new user (alias for register)
 */
export const signUp = register;

/**
 * Update user quiz stats after completing a quiz
 */
export const updateUserStats = async (
  userId: string, 
  quizData: {
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    timeSpent: number;
    difficulty: string;
  }
): Promise<void> => {
  try {
    console.log('🔄 Starting user stats update for userId:', userId);
    console.log('🔄 Quiz data:', quizData);
    // --- Cập nhật users.stats (profile) ---
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    let newStats = {};
    if (userDoc.exists()) {
      const currentData = userDoc.data();
      const currentStats = currentData.stats || {};
      newStats = {
        totalQuizzes: (currentStats.totalQuizzes || 0) + 1,
        totalQuestions: (currentStats.totalQuestions || 0) + quizData.totalQuestions,
        totalCorrectAnswers: (currentStats.totalCorrectAnswers || 0) + quizData.correctAnswers,
        totalTimeSpent: (currentStats.totalTimeSpent || 0) + quizData.timeSpent,
        averageScore: currentStats.totalQuizzes > 0 
          ? Math.round(((currentStats.averageScore || 0) * currentStats.totalQuizzes + quizData.score) / (currentStats.totalQuizzes + 1))
          : quizData.score,
        bestScore: Math.max(currentStats.bestScore || 0, quizData.score),
        lastQuizDate: new Date(),
        difficultyStats: {
          ...currentStats.difficultyStats,
          [quizData.difficulty]: {
            attempts: ((currentStats.difficultyStats?.[quizData.difficulty]?.attempts) || 0) + 1,
            bestScore: Math.max((currentStats.difficultyStats?.[quizData.difficulty]?.bestScore) || 0, quizData.score)
          }
        }
      };
      await setDoc(userRef, {
        ...currentData,
        stats: newStats,
        updatedAt: new Date()
      }, { merge: true });
    }
    // --- Cập nhật user_stats (leaderboard) ---
    const statsRef = doc(db, 'user_stats', userId);
    const statsDoc = await getDoc(statsRef);
    let statsData = {};
    if (statsDoc.exists()) {
      const old = statsDoc.data();
      statsData = {
        userId,
        displayName: userDoc.exists() ? userDoc.data().displayName : '',
        totalScore: (old.totalScore || 0) + quizData.score,
        totalAttempts: (old.totalAttempts || 0) + 1,
        updatedAt: new Date(),
      };
    } else {
      statsData = {
        userId,
        displayName: userDoc.exists() ? userDoc.data().displayName : '',
        totalScore: quizData.score,
        totalAttempts: 1,
        updatedAt: new Date(),
      };
    }
    await setDoc(statsRef, statsData, { merge: true });
    console.log('✅ User stats updated successfully in Firebase (profile + leaderboard)');
  } catch (error) {
    console.error('❌ Error updating user stats:', error);
    throw error;
  }
};
