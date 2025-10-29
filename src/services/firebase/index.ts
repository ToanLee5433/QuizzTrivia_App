/**
 * 📦 Firebase Services Index
 * Single entry point cho tất cả Firebase operations
 */

// ============= COLLECTIONS & PATHS =============
export * from './collections';
export * from './storage';
export * from './dataModels';

// ============= SERVICES =============
export * from './firestoreService';
export * from './storageService';

// ============= RE-EXPORTS =============
import {
  quizService,
  quizResultsService,
  userService,
  learningSessionService,
  multiplayerRoomService,
  favoritesService,
  reviewService,
  categoryService,
  notificationService,
} from './firestoreService';

import {
  storageService,
  avatarUploadService,
  quizCoverUploadService,
  resourceUploadService,
  deleteQuizFiles,
  cleanupTempFiles,
} from './storageService';

// Export ready-to-use service instances
export const firebase = {
  // Firestore services
  quiz: quizService,
  quizResults: quizResultsService,
  user: userService,
  learningSession: learningSessionService,
  multiplayerRoom: multiplayerRoomService,
  favorites: favoritesService,
  review: reviewService,
  category: categoryService,
  notification: notificationService,
  
  // Storage services
  storage: storageService,
  avatar: avatarUploadService,
  quizCover: quizCoverUploadService,
  resource: resourceUploadService,
  
  // Utilities
  deleteQuizFiles,
  cleanupTempFiles,
};

// ============= USAGE EXAMPLES =============

/**
 * Example 1: Get published quizzes
 * 
 * import { firebase } from '@/services/firebase';
 * 
 * const quizzes = await firebase.quiz.getPublishedQuizzes();
 */

/**
 * Example 2: Upload quiz cover
 * 
 * import { firebase } from '@/services/firebase';
 * 
 * const result = await firebase.quizCover.uploadCover(quizId, file);
 * console.log('Cover URL:', result.url);
 */

/**
 * Example 3: Get user quiz session
 * 
 * import { firebase } from '@/services/firebase';
 * 
 * const session = await firebase.learningSession.getSession(quizId, userId);
 */

/**
 * Example 4: Save quiz result
 * 
 * import { firebase, QuizResult } from '@/services/firebase';
 * 
 * const result: Partial<QuizResult> = {
 *   quizId: 'quiz123',
 *   userId: 'user456',
 *   score: 85,
 *   // ... other fields
 * };
 * 
 * const resultId = await firebase.quizResults.create(result);
 */

/**
 * Example 5: Add to favorites
 * 
 * import { firebase } from '@/services/firebase';
 * 
 * await firebase.favorites.addFavorite(userId, quizId);
 */

/**
 * Example 6: Upload learning resource
 * 
 * import { firebase } from '@/services/firebase';
 * 
 * const result = await firebase.resource.uploadVideo(
 *   quizId,
 *   resourceId,
 *   videoFile,
 *   (progress) => console.log(`Upload: ${progress}%`)
 * );
 */

/**
 * Example 7: Delete quiz with all files
 * 
 * import { firebase } from '@/services/firebase';
 * 
 * // Delete from Firestore
 * await firebase.quiz.delete(quizId);
 * 
 * // Delete from Storage
 * await firebase.deleteQuizFiles(quizId);
 */

/**
 * Example 8: Multiplayer room by code
 * 
 * import { firebase } from '@/services/firebase';
 * 
 * const room = await firebase.multiplayerRoom.getRoomByCode('ABC123');
 */
