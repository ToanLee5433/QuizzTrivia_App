/**
 * 🔥 Unified Firestore Service
 * Centralized service layer cho tất cả Firestore operations
 * Hỗ trợ: Type-safety, Offline mode, Cache management
 */

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  QueryConstraint,
  serverTimestamp,
  writeBatch,
  DocumentData,
  WithFieldValue,
  PartialWithFieldValue,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLLECTIONS, compositeKeys } from './collections';
import type {
  Quiz,
  UserProfile,
  QuizResult,
  QuizReview,
  UserQuizSession,
  MultiplayerRoom,
  SystemNotification,
  Category,
  UserFavorites,
} from './dataModels';

// ============= GENERIC CRUD OPERATIONS =============

export class FirestoreService<T extends DocumentData> {
  protected collectionName: string;
  
  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  /**
   * Get single document by ID
   */
  async getById(docId: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return { id: docSnap.id, ...docSnap.data() } as unknown as T;
    } catch (error) {
      console.error(`[Firestore] Error getting document from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple documents with query constraints
   */
  async getMany(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const collectionRef = collection(db, this.collectionName);
      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as unknown as T[];
    } catch (error) {
      console.error(`[Firestore] Error getting documents from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get all documents (use with caution!)
   */
  async getAll(): Promise<T[]> {
    return this.getMany();
  }

  /**
   * Create new document with auto-generated ID
   */
  async create(data: WithFieldValue<Partial<T>>): Promise<string> {
    try {
      const collectionRef = collection(db, this.collectionName);
      const docRef = await addDoc(collectionRef, {
        ...(data as any),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return docRef.id;
    } catch (error) {
      console.error(`[Firestore] Error creating document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Set document with specific ID (overwrites existing)
   */
  async set(docId: string, data: WithFieldValue<Partial<T>>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, docId);
      await setDoc(docRef, {
        ...(data as any),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(`[Firestore] Error setting document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update existing document (merge)
   */
  async update(docId: string, data: PartialWithFieldValue<T>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(`[Firestore] Error updating document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async delete(docId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`[Firestore] Error deleting document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Batch write operations
   */
  async batchWrite(operations: Array<{
    type: 'set' | 'update' | 'delete';
    docId: string;
    data?: any;
  }>): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      for (const op of operations) {
        const docRef = doc(db, this.collectionName, op.docId);
        
        switch (op.type) {
          case 'set':
            batch.set(docRef, { ...op.data, updatedAt: serverTimestamp() });
            break;
          case 'update':
            batch.update(docRef, { ...op.data, updatedAt: serverTimestamp() });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      }
      
      await batch.commit();
    } catch (error) {
      console.error(`[Firestore] Error in batch write for ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Paginated query
   */
  async getPaginated(
    constraints: QueryConstraint[] = [],
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot
  ): Promise<{ data: T[]; lastDoc: DocumentSnapshot | null }> {
    try {
      const collectionRef = collection(db, this.collectionName);
      const queryConstraints = [
        ...constraints,
        limit(pageSize),
      ];
      
      if (lastDoc) {
        queryConstraints.push(startAfter(lastDoc));
      }
      
      const q = query(collectionRef, ...queryConstraints);
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as unknown as T[];
      
      const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      
      return { data, lastDoc: newLastDoc };
    } catch (error) {
      console.error(`[Firestore] Error in paginated query for ${this.collectionName}:`, error);
      throw error;
    }
  }
}

// ============= SPECIALIZED SERVICES =============

/**
 * Quiz Service
 */
export class QuizService extends FirestoreService<Quiz> {
  constructor() {
    super(COLLECTIONS.QUIZZES);
  }

  async getPublishedQuizzes(): Promise<Quiz[]> {
    return this.getMany([
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc'),
    ]);
  }

  async getQuizzesByCategory(category: string): Promise<Quiz[]> {
    return this.getMany([
      where('category', '==', category),
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc'),
    ]);
  }

  async getQuizzesByCreator(userId: string): Promise<Quiz[]> {
    return this.getMany([
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc'),
    ]);
  }

  async searchQuizzes(searchTerm: string): Promise<Quiz[]> {
    // Note: Firestore doesn't support full-text search
    // Use Algolia or implement client-side filtering
    const allQuizzes = await this.getPublishedQuizzes();
    const lowerSearch = searchTerm.toLowerCase();
    
    return allQuizzes.filter(quiz =>
      quiz.title.toLowerCase().includes(lowerSearch) ||
      quiz.description.toLowerCase().includes(lowerSearch) ||
      quiz.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
    );
  }

  async incrementAttempts(quizId: string): Promise<void> {
    const quizRef = doc(db, this.collectionName, quizId);
    const quizDoc = await getDoc(quizRef);
    
    if (quizDoc.exists()) {
      const currentAttempts = quizDoc.data().attempts || 0;
      await updateDoc(quizRef, {
        attempts: currentAttempts + 1,
        updatedAt: serverTimestamp(),
      });
    }
  }

  async updateStats(quizId: string, score: number): Promise<void> {
    const quizRef = doc(db, this.collectionName, quizId);
    const quizDoc = await getDoc(quizRef);
    
    if (quizDoc.exists()) {
      const data = quizDoc.data();
      const currentTotal = (data.averageScore || 0) * (data.completions || 0);
      const newCompletions = (data.completions || 0) + 1;
      const newAverage = (currentTotal + score) / newCompletions;
      
      await updateDoc(quizRef, {
        completions: newCompletions,
        averageScore: Math.round(newAverage * 100) / 100,
        totalPlayers: (data.totalPlayers || 0) + 1,
        updatedAt: serverTimestamp(),
      });
    }
  }
}

/**
 * Quiz Results Service
 */
export class QuizResultsService extends FirestoreService<QuizResult> {
  constructor() {
    super(COLLECTIONS.QUIZ_RESULTS);
  }

  async getUserResults(userId: string, limitCount: number = 50): Promise<QuizResult[]> {
    return this.getMany([
      where('userId', '==', userId),
      orderBy('completedAt', 'desc'),
      limit(limitCount),
    ]);
  }

  async getQuizLeaderboard(quizId: string, limitCount: number = 10): Promise<QuizResult[]> {
    return this.getMany([
      where('quizId', '==', quizId),
      orderBy('score', 'desc'),
      limit(limitCount),
    ]);
  }

  async getGlobalLeaderboard(limitCount: number = 100): Promise<QuizResult[]> {
    return this.getMany([
      orderBy('score', 'desc'),
      orderBy('completedAt', 'desc'),
      limit(limitCount),
    ]);
  }
}

/**
 * User Service
 */
export class UserService extends FirestoreService<UserProfile> {
  constructor() {
    super(COLLECTIONS.USERS);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.update(userId, {
      lastLoginAt: serverTimestamp(),
    } as any);
  }

  async updateRole(userId: string, role: UserProfile['role']): Promise<void> {
    await this.update(userId, { role } as any);
  }

  async toggleActive(userId: string): Promise<void> {
    const user = await this.getById(userId);
    if (user) {
      await this.update(userId, {
        isActive: !user.isActive,
      } as any);
    }
  }
}

/**
 * Learning Session Service
 */
export class LearningSessionService extends FirestoreService<UserQuizSession> {
  constructor() {
    super(COLLECTIONS.USER_QUIZ_SESSIONS);
  }

  async getSession(quizId: string, userId: string): Promise<UserQuizSession | null> {
    const sessionId = compositeKeys.userQuizSession(quizId, userId);
    return this.getById(sessionId);
  }

  async initSession(quizId: string, userId: string): Promise<void> {
    const sessionId = compositeKeys.userQuizSession(quizId, userId);
    await this.set(sessionId, {
      userId,
      quizId,
      viewedResources: {},
      completionPercent: 0,
      ready: false,
      startedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    } as any);
  }

  async updateProgress(
    quizId: string,
    userId: string,
    resourceId: string,
    progress: any
  ): Promise<void> {
    const sessionId = compositeKeys.userQuizSession(quizId, userId);
    await this.update(sessionId, {
      [`viewedResources.${resourceId}`]: progress,
      lastActivityAt: serverTimestamp(),
    } as any);
  }
}

/**
 * Multiplayer Room Service
 */
export class MultiplayerRoomService extends FirestoreService<MultiplayerRoom> {
  constructor() {
    super(COLLECTIONS.MULTIPLAYER_ROOMS);
  }

  async getRoomByCode(code: string): Promise<MultiplayerRoom | null> {
    const rooms = await this.getMany([
      where('code', '==', code),
      limit(1),
    ]);
    
    return rooms[0] || null;
  }

  async getActiveRooms(): Promise<MultiplayerRoom[]> {
    return this.getMany([
      where('status', 'in', ['waiting', 'playing']),
      orderBy('createdAt', 'desc'),
    ]);
  }
}

/**
 * Favorites Service
 */
export class FavoritesService extends FirestoreService<UserFavorites> {
  constructor() {
    super(COLLECTIONS.USER_FAVORITES);
  }

  async getUserFavorites(userId: string): Promise<string[]> {
    const favDoc = await this.getById(userId);
    return favDoc?.quizIds || [];
  }

  async addFavorite(userId: string, quizId: string): Promise<void> {
    const favDoc = await this.getById(userId);
    
    if (favDoc) {
      const currentFavs = favDoc.quizIds || [];
      if (!currentFavs.includes(quizId)) {
        await this.update(userId, {
          quizIds: [...currentFavs, quizId],
        } as any);
      }
    } else {
      await this.set(userId, {
        userId,
        quizIds: [quizId],
      } as any);
    }
  }

  async removeFavorite(userId: string, quizId: string): Promise<void> {
    const favDoc = await this.getById(userId);
    
    if (favDoc) {
      const currentFavs = favDoc.quizIds || [];
      await this.update(userId, {
        quizIds: currentFavs.filter(id => id !== quizId),
      } as any);
    }
  }
}

// ============= EXPORT INSTANCES =============
export const quizService = new QuizService();
export const quizResultsService = new QuizResultsService();
export const userService = new UserService();
export const learningSessionService = new LearningSessionService();
export const multiplayerRoomService = new MultiplayerRoomService();
export const favoritesService = new FavoritesService();

// Generic services for other collections
export const reviewService = new FirestoreService<QuizReview>(COLLECTIONS.QUIZ_REVIEWS);
export const categoryService = new FirestoreService<Category>(COLLECTIONS.CATEGORIES);
export const notificationService = new FirestoreService<SystemNotification>(COLLECTIONS.SYSTEM_NOTIFICATIONS);

// ============= UTILITY FUNCTIONS =============

/**
 * Check if user has permission
 */
export const hasPermission = async (
  userId: string,
  resourceOwnerId: string,
  requiredRole?: UserProfile['role']
): Promise<boolean> => {
  const user = await userService.getById(userId);
  
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (requiredRole && user.role !== requiredRole) return false;
  if (userId === resourceOwnerId) return true;
  
  return false;
};

/**
 * Clean data helper
 */
export const cleanDataForFirestore = (data: any): any => {
  const cleaned: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      // Skip undefined values
      continue;
    } else if (value === null) {
      cleaned[key] = null;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' ? cleanDataForFirestore(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = cleanDataForFirestore(value);
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};
