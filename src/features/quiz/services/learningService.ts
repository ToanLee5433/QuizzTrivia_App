/**
 * Learning Materials Service
 * Quản lý tiến độ xem tài liệu và gating logic
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import {
  LearningResource,
  LearningSession,
  ResourceViewProgress,
  LearningEvent
} from '../types/learning';

/**
 * Lấy learning session của user cho một quiz
 */
export const getLearningSession = async (
  userId: string,
  quizId: string
): Promise<LearningSession | null> => {
  try {
    const sessionId = `${quizId}_${userId}`;
    const sessionRef = doc(db, 'userQuizSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) {
      return null;
    }

    const data = sessionDoc.data();
    return {
      id: sessionDoc.id,
      userId,
      quizId,
      viewedResources: data.viewedResources || {},
      ready: data.ready || false,
      readyAt: data.readyAt?.toDate(),
      totalResourcesRequired: data.totalResourcesRequired || 0,
      completedResourcesRequired: data.completedResourcesRequired || 0,
      completionPercent: data.completionPercent || 0,
      startedAt: data.startedAt?.toDate() || new Date(),
      lastActivityAt: data.lastActivityAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('Error getting learning session:', error);
    return null;
  }
};

/**
 * Tạo hoặc cập nhật learning session
 */
export const initializeLearningSession = async (
  userId: string,
  quizId: string,
  resources: LearningResource[]
): Promise<LearningSession> => {
  const sessionId = `${quizId}_${userId}`;
  const sessionRef = doc(db, 'userQuizSessions', sessionId);

  const requiredResources = resources.filter(r => r.required);
  const now = new Date();

  const session: Partial<LearningSession> = {
    userId,
    quizId,
    viewedResources: {},
    ready: requiredResources.length === 0, // Nếu không có required → ready luôn
    totalResourcesRequired: requiredResources.length,
    completedResourcesRequired: 0,
    completionPercent: 0,
    startedAt: now,
    lastActivityAt: now,
    updatedAt: now
  };

  await setDoc(sessionRef, {
    ...session,
    startedAt: Timestamp.fromDate(now),
    lastActivityAt: Timestamp.fromDate(now),
    updatedAt: serverTimestamp()
  }, { merge: true });

  return session as LearningSession;
};

/**
 * Cập nhật tiến độ xem tài liệu
 */
export const updateResourceProgress = async (
  userId: string,
  quizId: string,
  resourceId: string,
  progress: Partial<ResourceViewProgress>
): Promise<void> => {
  try {
    const sessionId = `${quizId}_${userId}`;
    const sessionRef = doc(db, 'userQuizSessions', sessionId);

    // Get current session
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) {
      throw new Error('Session not found');
    }

    const sessionData = sessionDoc.data();
    const viewedResources = sessionData.viewedResources || {};
    const currentProgress = viewedResources[resourceId] || {};

    // Merge progress
    const updatedProgress: ResourceViewProgress = {
      ...currentProgress,
      ...progress,
      resourceId,
      lastActivityAt: new Date()
    };

    // Update session
    await updateDoc(sessionRef, {
      [`viewedResources.${resourceId}`]: {
        ...updatedProgress,
        startedAt: updatedProgress.startedAt ? Timestamp.fromDate(updatedProgress.startedAt) : serverTimestamp(),
        lastActivityAt: serverTimestamp(),
        completedAt: updatedProgress.completedAt ? Timestamp.fromDate(updatedProgress.completedAt) : null
      },
      lastActivityAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Resource progress updated:', resourceId, progress);
  } catch (error) {
    console.error('❌ Error updating resource progress:', error);
    throw error;
  }
};

/**
 * Kiểm tra resource đã hoàn thành threshold chưa
 */
export const validateResourceCompletion = (
  resource: LearningResource,
  progress: ResourceViewProgress
): { completed: boolean; reason?: string } => {
  const threshold = resource.threshold;

  switch (resource.type) {
    case 'video':
      // Check video completion
      if (threshold.minWatchSec && (!progress.secondsWatched || progress.secondsWatched < threshold.minWatchSec)) {
        return {
          completed: false,
          reason: `Cần xem tối thiểu ${Math.ceil(threshold.minWatchSec / 60)} phút`
        };
      }
      if (threshold.minWatchPercent && (!progress.watchPercent || progress.watchPercent < threshold.minWatchPercent)) {
        return {
          completed: false,
          reason: `Cần xem tối thiểu ${threshold.minWatchPercent}% video`
        };
      }
      return { completed: true };

    case 'pdf':
      const minTimePerPage = threshold.minTimePerPage || 1.5; // Default 1.5s per page
      
      if (threshold.mustReachLastPage) {
        const lastPage = resource.totalPages || 1;
        if (!progress.pagesViewed?.includes(lastPage)) {
          return {
            completed: false,
            reason: 'Cần đọc đến trang cuối'
          };
        }
      }

      if (threshold.minPages) {
        const viewedCount = progress.pagesViewed?.length || 0;
        if (viewedCount < threshold.minPages) {
          return {
            completed: false,
            reason: `Cần xem tối thiểu ${threshold.minPages} trang`
          };
        }

        // Check time per page (anti-skip)
        if (progress.pageViewTimes) {
          const validPages = Object.values(progress.pageViewTimes).filter(
            time => time >= minTimePerPage
          ).length;
          
          if (validPages < threshold.minPages) {
            return {
              completed: false,
              reason: `Cần dành ít nhất ${minTimePerPage}s cho mỗi trang`
            };
          }
        }
      }
      return { completed: true };

    case 'image':
    case 'slides':
      if (threshold.minViewedCount) {
        const viewedCount = progress.imagesViewed?.length || 0;
        if (viewedCount < threshold.minViewedCount) {
          return {
            completed: false,
            reason: `Cần xem tối thiểu ${threshold.minViewedCount} ảnh/slide`
          };
        }

        // Check min view time per image
        if (threshold.minViewTime && progress.imageViewTimes) {
          const validImages = Object.values(progress.imageViewTimes).filter(
            time => time >= (threshold.minViewTime || 0)
          ).length;
          
          if (validImages < threshold.minViewedCount) {
            return {
              completed: false,
              reason: `Cần xem mỗi ảnh ít nhất ${threshold.minViewTime}s`
            };
          }
        }
      }
      return { completed: true };

    case 'link':
      if (threshold.requireConfirm && !progress.confirmed) {
        return {
          completed: false,
          reason: 'Cần xác nhận đã đọc'
        };
      }

      if (threshold.miniCheck) {
        const passingScore = threshold.miniCheck.passingScore;
        if (!progress.miniCheckScore || progress.miniCheckScore < passingScore) {
          return {
            completed: false,
            reason: `Cần đạt tối thiểu ${passingScore} điểm mini-check`
          };
        }
      }
      return { completed: true };

    default:
      return { completed: false, reason: 'Unknown resource type' };
  }
};

/**
 * Kiểm tra gating - user có thể bắt đầu quiz không
 */
export const checkGatingStatus = async (
  userId: string,
  quizId: string,
  resources: LearningResource[]
): Promise<{
  ready: boolean;
  requiredCount: number;
  completedCount: number;
  missingResources: LearningResource[];
  warnings: string[];
}> => {
  try {
    const session = await getLearningSession(userId, quizId);
    
    if (!session) {
      // Chưa có session → init
      await initializeLearningSession(userId, quizId, resources);
      const requiredResources = resources.filter(r => r.required);
      return {
        ready: requiredResources.length === 0,
        requiredCount: requiredResources.length,
        completedCount: 0,
        missingResources: requiredResources,
        warnings: requiredResources.length > 0 
          ? ['Bạn chưa xem tài liệu bắt buộc']
          : []
      };
    }

    const requiredResources = resources.filter(r => r.required);
    const missingResources: LearningResource[] = [];
    const warnings: string[] = [];

    for (const resource of requiredResources) {
      const progress = session.viewedResources[resource.id];
      
      if (!progress) {
        missingResources.push(resource);
        warnings.push(`Chưa xem: ${resource.title}`);
        continue;
      }

      const validation = validateResourceCompletion(resource, progress);
      if (!validation.completed) {
        missingResources.push(resource);
        warnings.push(`${resource.title}: ${validation.reason}`);
      }
    }

    const completedCount = requiredResources.length - missingResources.length;
    const ready = missingResources.length === 0;

    // Update session ready status
    if (ready && !session.ready) {
      const sessionRef = doc(db, 'userQuizSessions', `${quizId}_${userId}`);
      await updateDoc(sessionRef, {
        ready: true,
        readyAt: serverTimestamp(),
        completedResourcesRequired: completedCount,
        completionPercent: 100,
        updatedAt: serverTimestamp()
      });
    } else {
      const completionPercent = requiredResources.length > 0
        ? Math.round((completedCount / requiredResources.length) * 100)
        : 100;
        
      const sessionRef = doc(db, 'userQuizSessions', `${quizId}_${userId}`);
      await updateDoc(sessionRef, {
        ready,
        completedResourcesRequired: completedCount,
        completionPercent,
        updatedAt: serverTimestamp()
      });
    }

    return {
      ready,
      requiredCount: requiredResources.length,
      completedCount,
      missingResources,
      warnings
    };
  } catch (error) {
    console.error('Error checking gating status:', error);
    return {
      ready: false,
      requiredCount: 0,
      completedCount: 0,
      missingResources: [],
      warnings: ['Có lỗi kiểm tra trạng thái']
    };
  }
};

/**
 * Log learning event
 */
export const logLearningEvent = async (event: Omit<LearningEvent, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const eventsRef = collection(db, 'learningEvents');
    await setDoc(doc(eventsRef), {
      ...event,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging learning event:', error);
  }
};

/**
 * Tính toán completion percentage cho progress bar
 */
export const calculateProgress = (
  resources: LearningResource[],
  viewedResources: Record<string, ResourceViewProgress>
): {
  totalRequired: number;
  completedRequired: number;
  totalRecommended: number;
  completedRecommended: number;
  overallPercent: number;
} => {
  const required = resources.filter(r => r.required);
  const recommended = resources.filter(r => !r.required);

  const completedRequired = required.filter(r => {
    const progress = viewedResources[r.id];
    if (!progress) return false;
    return validateResourceCompletion(r, progress).completed;
  }).length;

  const completedRecommended = recommended.filter(r => {
    const progress = viewedResources[r.id];
    if (!progress) return false;
    return validateResourceCompletion(r, progress).completed;
  }).length;

  const totalResources = resources.length;
  const completedTotal = completedRequired + completedRecommended;
  const overallPercent = totalResources > 0 
    ? Math.round((completedTotal / totalResources) * 100)
    : 0;

  return {
    totalRequired: required.length,
    completedRequired,
    totalRecommended: recommended.length,
    completedRecommended,
    overallPercent
  };
};

export default {
  getLearningSession,
  initializeLearningSession,
  updateResourceProgress,
  validateResourceCompletion,
  checkGatingStatus,
  logLearningEvent,
  calculateProgress
};
