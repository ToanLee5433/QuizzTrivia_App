import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../lib/firebase/config';
import { 
  Feedback, 
  CreateFeedbackInput, 
  UpdateFeedbackInput, 
  FeedbackStats,
  FeedbackType,
  FeedbackPriority,
  FeedbackStatus
} from '../types';

const FEEDBACK_COLLECTION = 'feedbacks';

/**
 * Upload screenshots to Firebase Storage
 */
async function uploadScreenshots(
  userId: string, 
  feedbackId: string, 
  screenshots: File[]
): Promise<string[]> {
  const uploadPromises = screenshots.map(async (file, index) => {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${feedbackId}_${index}.${fileExtension}`;
    const storageRef = ref(storage, `feedbacks/${userId}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  });

  return Promise.all(uploadPromises);
}

/**
 * Create new feedback
 */
export async function createFeedback(
  userId: string,
  userEmail: string,
  userName: string,
  input: CreateFeedbackInput
): Promise<string> {
  try {
    // Create feedback document first (without screenshots)
    const feedbackData = {
      userId,
      userEmail,
      userName,
      type: input.type,
      subject: input.subject,
      description: input.description,
      richDescription: input.richDescription || '',
      screenshots: [],
      status: 'pending',
      priority: 'medium',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), feedbackData);

    // Upload screenshots if provided
    if (input.screenshots && input.screenshots.length > 0) {
      const screenshotUrls = await uploadScreenshots(userId, docRef.id, input.screenshots);
      await updateDoc(doc(db, FEEDBACK_COLLECTION, docRef.id), {
        screenshots: screenshotUrls
      });
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating feedback:', error);
    throw new Error('Không thể gửi phản hồi. Vui lòng thử lại.');
  }
}

/**
 * Get user's feedbacks
 */
export async function getUserFeedbacks(userId: string): Promise<Feedback[]> {
  try {
    const q = query(
      collection(db, FEEDBACK_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
      updatedAt: (doc.data().updatedAt as Timestamp)?.toDate() || new Date(),
      resolvedAt: doc.data().resolvedAt ? (doc.data().resolvedAt as Timestamp).toDate() : undefined,
      adminResponseAt: doc.data().adminResponseAt ? (doc.data().adminResponseAt as Timestamp).toDate() : undefined
    } as Feedback));
  } catch (error) {
    console.error('Error getting user feedbacks:', error);
    throw new Error('Không thể tải phản hồi');
  }
}

/**
 * Get all feedbacks (Admin only)
 */
export async function getAllFeedbacks(): Promise<Feedback[]> {
  try {
    const q = query(
      collection(db, FEEDBACK_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
      updatedAt: (doc.data().updatedAt as Timestamp)?.toDate() || new Date(),
      resolvedAt: doc.data().resolvedAt ? (doc.data().resolvedAt as Timestamp).toDate() : undefined,
      adminResponseAt: doc.data().adminResponseAt ? (doc.data().adminResponseAt as Timestamp).toDate() : undefined
    } as Feedback));
  } catch (error) {
    console.error('Error getting all feedbacks:', error);
    throw new Error('Không thể tải danh sách phản hồi');
  }
}

/**
 * Get feedback by ID
 */
export async function getFeedbackById(feedbackId: string): Promise<Feedback | null> {
  try {
    const docRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
      resolvedAt: data.resolvedAt ? (data.resolvedAt as Timestamp).toDate() : undefined,
      adminResponseAt: data.adminResponseAt ? (data.adminResponseAt as Timestamp).toDate() : undefined
    } as Feedback;
  } catch (error) {
    console.error('Error getting feedback:', error);
    throw new Error('Không thể tải phản hồi');
  }
}

/**
 * Update feedback (Admin only)
 */
export async function updateFeedback(
  feedbackId: string,
  _adminId: string,
  adminName: string,
  input: UpdateFeedbackInput
): Promise<void> {
  try {
    // Get the feedback first to access userId and subject
    const feedbackDoc = await getDoc(doc(db, FEEDBACK_COLLECTION, feedbackId));
    if (!feedbackDoc.exists()) {
      throw new Error('Feedback not found');
    }
    
    const feedbackData = feedbackDoc.data() as Feedback;
    
    const updateData: any = {
      ...input,
      updatedAt: serverTimestamp()
    };

    // If status changed to resolved
    if (input.status === 'resolved' && input.status !== undefined) {
      updateData.resolvedAt = serverTimestamp();
    }

    // If admin response provided
    if (input.adminResponse) {
      updateData.adminResponseBy = adminName;
      updateData.adminResponseAt = serverTimestamp();
    }

    await updateDoc(doc(db, FEEDBACK_COLLECTION, feedbackId), updateData);
    
    // Send notification to user
    if (input.status || input.adminResponse) {
      await sendFeedbackNotification(
        feedbackData.userId,
        feedbackData.subject,
        input.status || feedbackData.status,
        input.adminResponse
      );
    }
  } catch (error) {
    console.error('Error updating feedback:', error);
    throw new Error('Không thể cập nhật phản hồi');
  }
}

/**
 * Get feedback statistics (Admin only)
 */
export async function getFeedbackStats(): Promise<FeedbackStats> {
  try {
    const snapshot = await getDocs(collection(db, FEEDBACK_COLLECTION));
    const feedbacks = snapshot.docs.map(doc => doc.data());

    const stats: FeedbackStats = {
      total: feedbacks.length,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      byType: {
        bug: 0,
        feature: 0,
        improvement: 0,
        other: 0
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      }
    };

    feedbacks.forEach(feedback => {
      // Count by status
      switch (feedback.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'in-progress':
          stats.inProgress++;
          break;
        case 'resolved':
          stats.resolved++;
          break;
        case 'closed':
          stats.closed++;
          break;
      }

      // Count by type
      if (feedback.type in stats.byType) {
        stats.byType[feedback.type as FeedbackType]++;
      }

      // Count by priority
      if (feedback.priority in stats.byPriority) {
        stats.byPriority[feedback.priority as FeedbackPriority]++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error getting feedback stats:', error);
    throw new Error('Không thể tải thống kê');
  }
}

/**
 * Delete feedback (Admin only)
 */
export async function deleteFeedback(feedbackId: string): Promise<void> {
  try {
    // Note: This doesn't delete uploaded screenshots from Storage
    // You may want to add that functionality
    await updateDoc(doc(db, FEEDBACK_COLLECTION, feedbackId), {
      status: 'closed',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    throw new Error('Không thể xóa phản hồi');
  }
}

/**
 * Send notification to user when feedback status changes
 */
async function sendFeedbackNotification(
  userId: string,
  subject: string,
  status: FeedbackStatus,
  adminResponse?: string
): Promise<void> {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    
    const statusLabels: Record<FeedbackStatus, string> = {
      'pending': 'Chờ xử lý',
      'in-progress': 'Đang xử lý',
      'resolved': 'Đã giải quyết',
      'closed': 'Đã đóng'
    };

    const message = adminResponse 
      ? `Quản trị viên đã phản hồi về "${subject}": ${adminResponse}`
      : `Trạng thái phản hồi "${subject}" đã được cập nhật thành: ${statusLabels[status]}`;

    await addDoc(notificationsRef, {
      type: 'system',
      title: 'Cập nhật phản hồi',
      message,
      timestamp: serverTimestamp(),
      read: false,
      icon: '💬',
      action: {
        type: 'navigate',
        path: '/feedback',
        label: 'Xem phản hồi'
      },
      metadata: {
        feedbackSubject: subject,
        feedbackStatus: status
      }
    });
  } catch (error) {
    console.error('Error sending feedback notification:', error);
    // Don't throw - notification failure shouldn't fail the main operation
  }
}
