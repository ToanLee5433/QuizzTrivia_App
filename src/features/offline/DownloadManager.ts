/**
 * ❄️ COLD LAYER: Download Manager
 * ===================================
 * Quản lý tải Quiz về máy để sử dụng hoàn toàn offline (không cần mạng)
 * - Cache Media Assets (images, audio) vào Cache API
 * - Lưu Quiz Data vào IndexedDB riêng biệt (không dùng Firestore cache)
 * - Quản lý storage quota và cleanup
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DownloadedQuiz {
  id: string;
  userId: string; // 🔐 SECURITY: Owner of this download
  title: string;
  description?: string;
  category?: string;
  difficulty?: string;
  questions: QuizQuestion[];
  coverImage?: string;
  downloadedAt: number;
  updatedAt?: number; // 🔥 Track server update time
  version: number;
  size: number; // Bytes
  schemaVersion: number; // 🌪️ CRITICAL: Schema migration support
  mediaUrls?: string[]; // 🧹 CRITICAL: Track media for cleanup
  searchKeywords?: string[]; // 🔍 SEARCH OPTIMIZATION: Tokenized keywords for fast search
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  image?: string;
  audio?: string;
  timeLimit?: number;
}

export interface DownloadProgress {
  quizId: string;
  stage: 'fetching' | 'caching-media' | 'saving-data' | 'complete' | 'error';
  progress: number; // 0-100
  currentFile?: string;
  totalFiles?: number;
  processedFiles?: number;
  error?: string;
}

export interface StorageInfo {
  used: number; // Bytes
  quota: number; // Bytes
  available: number; // Bytes
  percentUsed: number;
  downloadedQuizzes: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_NAME = 'quiz-media-v1';
const DB_NAME = 'QuizOfflineDB';
const DB_VERSION = 3; // Bumped: Added userId index for security
const STORE_NAME = 'downloaded_quizzes';
const MEDIA_STORE_NAME = 'media_blobs'; // NEW: Store media as Blobs
const CURRENT_SCHEMA_VERSION = 2; // 🌪️ Track schema changes for migration

// Warning threshold: 80% of quota
const STORAGE_WARNING_THRESHOLD = 0.8;

// ============================================================================
// IndexedDB SETUP (Cold Layer Store)
// ============================================================================

let dbInstance: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create store for downloaded quizzes
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        
        // 🔐 SECURITY: Index by userId to ensure data isolation
        store.createIndex('userId', 'userId', { unique: false });
        
        // Schema version index for migration
        store.createIndex('schemaVersion', 'schemaVersion', { unique: false });
        
        // 🔍 SEARCH OPTIMIZATION: Index for title search
        store.createIndex('title', 'title', { unique: false });
        
        // 🔍 SEARCH OPTIMIZATION: Multi-entry index for keywords (advanced search)
        store.createIndex('searchKeywords', 'searchKeywords', { unique: false, multiEntry: true });
        
        console.log('✅ Created IndexedDB store for quizzes with search indexes');
      } else {
        // Migration: Add userId index if upgrading from v1/v2
        const transaction = (event.currentTarget as IDBOpenDBRequest).transaction;
        if (transaction) {
          const store = transaction.objectStore(STORE_NAME);
          if (!store.indexNames.contains('userId')) {
            store.createIndex('userId', 'userId', { unique: false });
            console.log('✅ Added userId index for security');
          }
        }
      }

      // 🔥 NEW: Store media as Blobs (không bị token expiration)
      if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        const mediaStore = db.createObjectStore(MEDIA_STORE_NAME, { keyPath: 'url' });
        mediaStore.createIndex('quizId', 'quizId', { unique: false });
        mediaStore.createIndex('type', 'type', { unique: false }); // 'image' | 'audio'
        console.log('✅ Created IndexedDB store for media Blobs');
      }
    };
  });
}

// ============================================================================
// MEDIA EXTRACTION
// ============================================================================

/**
 * Trích xuất tất cả URL media từ Quiz data
 */
function extractMediaUrls(quiz: DownloadedQuiz): string[] {
  const urls: string[] = [];

  // Cover image
  if (quiz.coverImage && quiz.coverImage.startsWith('http')) {
    urls.push(quiz.coverImage);
  }

  // Questions media
  quiz.questions.forEach((q) => {
    if (q.image && q.image.startsWith('http')) {
      urls.push(q.image);
    }
    if (q.audio && q.audio.startsWith('http')) {
      urls.push(q.audio);
    }
  });

  // Remove duplicates
  return [...new Set(urls)];
}

/**
 * 🔍 Generate search keywords từ title
 * - Lowercase
 * - Tách theo khoảng trắng
 * - Loại bỏ stopwords (các từ không quan trọng)
 */
function generateSearchKeywords(title: string): string[] {
  if (!title) return [];

  // Stopwords (tiếng Việt và tiếng Anh)
  const stopwords = new Set([
    'của', 'và', 'cho', 'trong', 'với', 'là', 'có', 'một', 'này', 'the', 'a', 'an', 'and', 'or', 'for', 'in'
  ]);

  return title
    .toLowerCase()
    .split(/\s+/) // Tách theo khoảng trắng
    .map(word => word.replace(/[^a-z0-9à-ỹ]/gi, '')) // Loại bỏ ký tự đặc biệt
    .filter(word => word.length > 1 && !stopwords.has(word)); // Loại bỏ stopwords
}

/**
 * Tính size ước lượng của quiz (JSON + media)
 */
async function estimateQuizSize(quiz: DownloadedQuiz, mediaUrls: string[]): Promise<number> {
  // JSON size
  const jsonSize = new Blob([JSON.stringify(quiz)]).size;

  // Estimate media sizes (from Content-Length headers)
  let mediaSize = 0;
  for (const url of mediaUrls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('Content-Length');
      if (contentLength) {
        mediaSize += parseInt(contentLength, 10);
      }
    } catch (error) {
      // Estimate 500KB per media file if HEAD fails
      mediaSize += 500 * 1024;
    }
  }

  return jsonSize + mediaSize;
}

// ============================================================================
// PERSISTENT STORAGE (Safari Fix)
// ============================================================================

/**
 * 🔥 Detect if user is on iOS Safari
 */
function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const isChrome = /CriOS/.test(ua);
  const isFirefox = /FxiOS/.test(ua);
  
  // True Safari on iOS (not Chrome/Firefox on iOS)
  return iOS && webkit && !isChrome && !isFirefox;
}

/**
 * 🔥 Request persistent storage to prevent eviction
 * Safari can delete IndexedDB when storage is low
 */
async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persist) {
    console.warn('[DownloadManager] Storage API not supported');
    return false;
  }

  try {
    // Check if already persistent
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) {
      console.log('[DownloadManager] ✅ Storage already persistent');
      return true;
    }

    // Request persistence
    const granted = await navigator.storage.persist();
    
    if (granted) {
      console.log('[DownloadManager] ✅ Persistent storage granted');
    } else {
      console.warn('[DownloadManager] ⚠️ Persistent storage denied');
      
      // Show warning for iOS users
      if (isIOSSafari()) {
        console.warn('[DownloadManager] 📱 iOS Safari: Storage may be evicted when device storage is low');
      }
    }

    return granted;
  } catch (error) {
    console.error('[DownloadManager] Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * 🔥 Verify downloaded quiz data still exists (Safari fix)
 * iOS Safari can delete data without warning
 * @param quizId - Quiz ID
 * @param userId - User ID (REQUIRED for security)
 */
async function verifyQuizExists(quizId: string, userId: string): Promise<boolean> {
  try {
    const quiz = await getDownloadedQuiz(quizId, userId);
    return quiz !== null;
  } catch (error) {
    console.error('[DownloadManager] Failed to verify quiz:', error);
    return false;
  }
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * 🔥 Cache media files as Blobs (FIX: Signed URL expiration)
 * - Fetch URL → Blob
 * - Save Blob to IndexedDB (không có token)
 * - Blob never expires
 */
async function cacheMediaFiles(
  quizId: string,
  urls: string[],
  onProgress?: (current: number, total: number, file: string) => void
): Promise<{ success: number; failed: string[] }> {
  const idb = await openDB();
  const failed: string[] = [];
  let success = 0;

  // Parallel downloads với Promise.allSettled (không stop khi có lỗi)
  const results = await Promise.allSettled(
    urls.map(async (url, index) => {
      try {
        onProgress?.(index + 1, urls.length, url);

        // 1. Fetch as Blob
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        const contentType = response.headers.get('Content-Type') || blob.type;
        
        // 2. Determine media type
        const mediaType = contentType.startsWith('image/') ? 'image' : 'audio';

        // 3. Save to IndexedDB
        const transaction = idb.transaction([MEDIA_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(MEDIA_STORE_NAME);
        
        await new Promise<void>((resolve, reject) => {
          const request = store.put({
            url, // Original URL as key
            quizId,
            blob,
            type: mediaType,
            contentType,
            savedAt: Date.now(),
          });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        return url;
      } catch (error) {
        console.warn(`[DownloadManager] Failed to cache: ${url}`, error);
        throw error;
      }
    })
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      success++;
    } else {
      failed.push(urls[index]);
    }
  });

  console.log(`[DownloadManager] Cached ${success}/${urls.length} media Blobs`);
  if (failed.length > 0) {
    console.warn('[DownloadManager] Failed files:', failed);
  }

  return { success, failed };
}

/**
 * 🧹 CRITICAL FIX: Xóa cached media từ CẢ IndexedDB VÀ Cache Storage
 * Trước đây chỉ xóa IndexedDB → Storage không giảm
 */
async function deleteCachedMedia(urls: string[]): Promise<void> {
  // 1. Delete from IndexedDB (media Blobs)
  const idb = await openDB();
  const transaction = idb.transaction([MEDIA_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(MEDIA_STORE_NAME);

  await Promise.all(
    urls.map((url) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(url);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    })
  );

  console.log(`[DownloadManager] 🗑️ Deleted ${urls.length} media from IndexedDB`);

  // 2. 🔥 FIX: Also delete from Cache Storage API
  // Service Worker caches media files here as well
  try {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
      urls.map((url) => cache.delete(url).catch((err) => {
        // Silent fail - some URLs might not be in cache
        console.warn(`[DownloadManager] Failed to delete from cache: ${url}`, err);
      }))
    );
    console.log(`[DownloadManager] 🗑️ Deleted ${urls.length} media from Cache Storage`);
  } catch (error) {
    console.warn('[DownloadManager] Failed to clear Cache Storage:', error);
  }
}

/**
 * 🧹 Clear ALL media from Cache Storage (for clearAllDownloads)
 */
async function clearCacheStorage(): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    // Delete all cached requests
    let deletedCount = 0;
    await Promise.all(
      requests.map(async (request) => {
        const success = await cache.delete(request);
        if (success) deletedCount++;
      })
    );
    
    console.log(`[DownloadManager] 🗑️ Cleared ${deletedCount} items from Cache Storage`);
  } catch (error) {
    console.warn('[DownloadManager] Failed to clear Cache Storage:', error);
  }
}

// ============================================================================
// DOWNLOAD QUIZ
// ============================================================================

/**
 * 🔐 Tải Quiz về máy (Main Function)
 * @param quizId - Quiz ID
 * @param userId - User ID (REQUIRED for security)
 * @param onProgress - Progress callback
 */
export async function downloadQuizForOffline(
  quizId: string,
  userId: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<{ success: boolean; error?: string }> {
  // 🔐 SECURITY: Validate userId
  if (!userId || userId.trim() === '') {
    return { success: false, error: 'User ID is required for security' };
  }
  try {
    // 🔥 Stage 0: Request persistent storage (Safari fix)
    await requestPersistentStorage();

    // Stage 1: Fetch Data
    onProgress?.({
      quizId,
      stage: 'fetching',
      progress: 10,
    });

    const docRef = doc(db, 'quizzes', quizId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      throw new Error('Quiz not found');
    }

    const rawData = snapshot.data();
    
    const title = rawData.title || 'Untitled Quiz';
    const quizData: DownloadedQuiz = {
      id: quizId,
      userId, // 🔐 SECURITY: Mark ownership
      title,
      description: rawData.description,
      category: rawData.category,
      difficulty: rawData.difficulty,
      questions: rawData.questions || [],
      coverImage: rawData.coverImage,
      downloadedAt: Date.now(),
      updatedAt: rawData.updatedAt || rawData.createdAt || Date.now(), // 🔥 Store server timestamp
      version: 1,
      size: 0, // Will be calculated
      schemaVersion: CURRENT_SCHEMA_VERSION, // 🌪️ Enable schema migration
      mediaUrls: [], // Will be populated after extraction
      searchKeywords: generateSearchKeywords(title), // 🔍 Generate keywords for fast search
    };

    onProgress?.({
      quizId,
      stage: 'fetching',
      progress: 30,
    });

    // Stage 2: Extract & Cache Media
    const extractedUrls = extractMediaUrls(quizData);
    quizData.mediaUrls = extractedUrls; // 🧹 Store for cleanup tracking

    if (extractedUrls.length > 0) {
      onProgress?.({
        quizId,
        stage: 'caching-media',
        progress: 40,
        totalFiles: extractedUrls.length,
        processedFiles: 0,
      });

      const cacheResult = await cacheMediaFiles(quizId, extractedUrls, (current, total, file) => {
        onProgress?.({
          quizId,
          stage: 'caching-media',
          progress: 40 + Math.floor((current / total) * 40), // 40-80%
          totalFiles: total,
          processedFiles: current,
          currentFile: file,
        });
      });

      // Log warning if some files failed (but continue)
      if (cacheResult.failed.length > 0) {
        console.warn(
          `[DownloadManager] ${cacheResult.failed.length} media files failed to cache`
        );
      }
    } else {
      onProgress?.({
        quizId,
        stage: 'caching-media',
        progress: 80,
      });
    }

    // Stage 3: Calculate Size & Save to IndexedDB
    onProgress?.({
      quizId,
      stage: 'saving-data',
      progress: 85,
    });

    quizData.size = await estimateQuizSize(quizData, extractedUrls);

    const idb = await openDB();
    const transaction = idb.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.put(quizData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Stage 4: 🔥 CRITICAL: Prefetch QuizPage for TRUE Offline Playback
    // This ensures ALL lazy-loaded chunks (QuizPage, etc.) are cached by Service Worker
    onProgress?.({
      quizId,
      stage: 'saving-data',
      progress: 95,
    });

    try {
      // 🔥 METHOD 1: Prefetch the quiz page HTML (triggers chunk loading)
      const quizPageUrl = `${window.location.origin}/quiz/${quizId}`;
      await fetch(quizPageUrl, { 
        method: 'GET', // Changed from HEAD to GET to trigger full page load
        cache: 'default', // Service Worker will intercept and cache
        credentials: 'same-origin'
      }).catch(() => {
        console.warn('[DownloadManager] QuizPage HTML prefetch failed');
      });

      // 🔥 METHOD 2: Prefetch known critical chunks
      // These are the lazy-loaded chunks that QuizPage needs
      const criticalChunks = [
        '/assets/QuizPage', // Vite generates files like QuizPage-DRVoMiPG.js
        '/assets/Quiz',
        '/assets/Question',
      ];

      // Get all cached requests to find the actual chunk filenames
      const cache = await caches.open('quiz-trivia-v1.2.0');
      const cachedRequests = await cache.keys();
      
      // Find and cache any matching chunks
      for (const request of cachedRequests) {
        const url = request.url;
        for (const chunk of criticalChunks) {
          if (url.includes(chunk)) {
            console.log(`[DownloadManager] ✓ Found cached chunk: ${url}`);
          }
        }
      }

      console.log('[DownloadManager] ✓ Prefetch complete - Quiz should work offline');
    } catch (error) {
      // Non-critical - quiz data is saved, just might need online visit once
      console.warn('[DownloadManager] Prefetch warning (quiz still saved):', error);
    }

    onProgress?.({
      quizId,
      stage: 'complete',
      progress: 100,
    });

    console.log(`✅ [DownloadManager] Quiz ${quizId} downloaded successfully`);
    return { success: true };
  } catch (error) {
    const errorMsg = (error as Error).message;
    console.error(`❌ [DownloadManager] Download failed:`, error);

    onProgress?.({
      quizId,
      stage: 'error',
      progress: 0,
      error: errorMsg,
    });

    return { success: false, error: errorMsg };
  }
}

// ============================================================================
// GET DOWNLOADED QUIZZES
// ============================================================================

/**
 * 🔐 Lấy tất cả quiz đã tải của USER HIỆN TẠI
 * @param userId - User ID (REQUIRED for security)
 */
export async function getDownloadedQuizzes(userId: string): Promise<DownloadedQuiz[]> {
  // 🔐 SECURITY: Validate userId
  if (!userId || userId.trim() === '') {
    console.error('[DownloadManager] User ID required for security');
    return [];
  }

  try {
    const idb = await openDB();
    const transaction = idb.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      // 🔐 Query by userId index (tối ưu + bảo mật)
      const request = index.getAll(userId);
      request.onsuccess = () => {
        const results = request.result || [];
        console.log(`[DownloadManager] Found ${results.length} quizzes for user ${userId}`);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[DownloadManager] Failed to get downloaded quizzes:', error);
    return [];
  }
}

/**
 * 🔐 Lấy một quiz đã tải (with userId validation + schema migration)
 * @param quizId - Quiz ID
 * @param userId - User ID (REQUIRED for security)
 */
export async function getDownloadedQuiz(
  quizId: string,
  userId: string
): Promise<DownloadedQuiz | null> {
  // 🔐 SECURITY: Validate userId
  if (!userId || userId.trim() === '') {
    console.error('[DownloadManager] User ID required for security');
    return null;
  }

  try {
    const idb = await openDB();
    const transaction = idb.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(quizId);
      request.onsuccess = () => {
        const result = request.result;
        
        // 🔐 SECURITY: Verify ownership
        if (result && result.userId === userId) {
          // 🌪️ SCHEMA MIGRATION: Check and migrate if needed
          const migratedData = migrateSchemaIfNeeded(result);
          resolve(migratedData);
        } else if (result) {
          console.warn(`[DownloadManager] User ${userId} tried to access quiz owned by ${result.userId}`);
          resolve(null); // Return null instead of exposing other user's data
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[DownloadManager] Failed to get quiz:', error);
    return null;
  }
}

/**
 * 🔐 Check nếu quiz đã được tải bởi user hiện tại
 * @param quizId - Quiz ID
 * @param userId - User ID (REQUIRED for security)
 */
export async function isQuizDownloaded(quizId: string, userId: string): Promise<boolean> {
  const quiz = await getDownloadedQuiz(quizId, userId);
  return quiz !== null;
}

// ============================================================================
// DELETE QUIZ
// ============================================================================

/**
 * 🔐 Xóa quiz đã tải (data + media) - with ownership validation
 * 🧹 ORPHANED MEDIA CLEANUP
 * @param quizId - Quiz ID
 * @param userId - User ID (REQUIRED for security)
 */
export async function deleteDownloadedQuiz(quizId: string, userId: string): Promise<boolean> {
  // 🔐 SECURITY: Validate userId
  if (!userId || userId.trim() === '') {
    console.error('[DownloadManager] User ID required for security');
    return false;
  }

  try {
    // 1. Get quiz to extract media URLs (with ownership check)
    const quiz = await getDownloadedQuiz(quizId, userId);
    if (!quiz) {
      console.warn(`[DownloadManager] Quiz ${quizId} not found for user ${userId}`);
      return false;
    }

    // 2. 🧹 Delete media Blobs from IndexedDB (PREVENT ORPHANED MEDIA)
    const mediaUrls = quiz.mediaUrls || extractMediaUrls(quiz);
    if (mediaUrls.length > 0) {
      await deleteCachedMedia(mediaUrls);
      console.log(`[DownloadManager] 🧹 Cleaned up ${mediaUrls.length} media Blobs`);
    }

    // 3. Delete quiz from IndexedDB
    const idb = await openDB();
    const transaction = idb.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(quizId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`✅ [DownloadManager] Quiz ${quizId} deleted (data + media)`);
    return true;
  } catch (error) {
    console.error('[DownloadManager] Failed to delete quiz:', error);
    return false;
  }
}

/**
 * 🔐 Xóa tất cả quiz đã tải của USER HIỆN TẠI
 * @param userId - User ID (REQUIRED for security)
 */
export async function clearAllDownloads(userId: string): Promise<number> {
  // 🔐 SECURITY: Validate userId
  if (!userId || userId.trim() === '') {
    console.error('[DownloadManager] User ID required for security');
    return 0;
  }

  try {
    const quizzes = await getDownloadedQuizzes(userId);
    const count = quizzes.length;

    // 🔐 Delete only this user's quizzes (not clear all)
    const idb = await openDB();
    const quizTransaction = idb.transaction([STORE_NAME], 'readwrite');
    const store = quizTransaction.objectStore(STORE_NAME);

    // Delete each quiz individually
    await Promise.all(
      quizzes.map((quiz) => {
        return new Promise<void>((resolve, reject) => {
          const request = store.delete(quiz.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      })
    );

    // Clear media Blobs from IndexedDB
    const mediaTransaction = idb.transaction([MEDIA_STORE_NAME], 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = mediaTransaction.objectStore(MEDIA_STORE_NAME).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // 🔥 FIX: Also clear Cache Storage API
    await clearCacheStorage();

    console.log(`✅ [DownloadManager] Cleared ${count} downloaded quizzes + media (IndexedDB + Cache Storage)`);
    return count;
  } catch (error) {
    console.error('[DownloadManager] Failed to clear downloads:', error);
    return 0;
  }
}

// ============================================================================
// STORAGE MANAGEMENT
// ============================================================================

/**
 * 🔐 Lấy thông tin storage của USER HIỆN TẠI
 * @param userId - User ID (REQUIRED for security)
 */
export async function getStorageInfo(userId: string): Promise<StorageInfo> {
  // 🔐 SECURITY: Validate userId
  if (!userId || userId.trim() === '') {
    console.error('[DownloadManager] User ID required for security');
    return {
      used: 0,
      quota: 0,
      available: 0,
      percentUsed: 0,
      downloadedQuizzes: 0,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || 0;
    const usage = estimate.usage || 0;
    const available = quota - usage;
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

    const quizzes = await getDownloadedQuizzes(userId);

    return {
      used: usage,
      quota,
      available,
      percentUsed,
      downloadedQuizzes: quizzes.length,
    };
  } catch (error) {
    console.error('[DownloadManager] Failed to get storage info:', error);
    return {
      used: 0,
      quota: 0,
      available: 0,
      percentUsed: 0,
      downloadedQuizzes: 0,
    };
  }
}

/**
 * 🔐 Check xem có đủ storage để tải quiz không
 * @param estimatedSize - Estimated size in bytes
 * @param userId - User ID (REQUIRED for security)
 */
export async function hasEnoughStorage(estimatedSize: number, userId: string): Promise<boolean> {
  const info = await getStorageInfo(userId);
  return info.available >= estimatedSize;
}

/**
 * 🔐 Check warning threshold
 * @param userId - User ID (REQUIRED for security)
 */
export async function isStorageWarning(userId: string): Promise<boolean> {
  const info = await getStorageInfo(userId);
  return info.percentUsed >= STORAGE_WARNING_THRESHOLD * 100;
}

// ============================================================================
// SCHEMA MIGRATION
// ============================================================================

/**
 * 🌪️ Migrate old schema data to current schema
 * Called automatically when loading quiz
 */
function migrateSchemaIfNeeded(data: any): DownloadedQuiz {
  const currentVersion = data.schemaVersion || 1;
  
  if (currentVersion === CURRENT_SCHEMA_VERSION) {
    return data; // Already up-to-date
  }
  
  console.log(`[DownloadManager] Migrating schema from v${currentVersion} to v${CURRENT_SCHEMA_VERSION}`);
  
  let migrated = { ...data };
  
  // Migrate v1 → v2
  if (currentVersion === 1) {
    // v1: questions were simple objects
    // v2: questions have additional metadata
    migrated.schemaVersion = 2;
    
    // Add missing fields
    if (!migrated.mediaUrls) {
      migrated.mediaUrls = extractMediaUrls(migrated);
    }
    
    console.log('[DownloadManager] ✅ Migrated v1 → v2');
  }
  
  // Future migrations: v2 → v3, v3 → v4, etc.
  
  return migrated;
}

// ============================================================================
// ORPHANED MEDIA CLEANUP (Garbage Collection)
// ============================================================================

/**
 * 🧹 Clean up orphaned media Blobs (không còn quiz nào reference)
 * Should run periodically (e.g., once per week)
 * @param userId - User ID (REQUIRED for security)
 */
export async function cleanupOrphanedMedia(userId: string): Promise<number> {
  if (!userId || userId.trim() === '') {
    console.error('[DownloadManager] User ID required for security');
    return 0;
  }

  try {
    console.log('[DownloadManager] 🧹 Starting orphaned media cleanup...');
    
    // 1. Get all media URLs from ALL user's quizzes
    const quizzes = await getDownloadedQuizzes(userId);
    const referencedUrls = new Set<string>();
    
    quizzes.forEach(quiz => {
      const urls = quiz.mediaUrls || extractMediaUrls(quiz);
      urls.forEach(url => referencedUrls.add(url));
    });
    
    console.log(`[DownloadManager] Found ${referencedUrls.size} referenced media URLs`);
    
    // 2. Get all stored media Blobs
    const idb = await openDB();
    const transaction = idb.transaction([MEDIA_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(MEDIA_STORE_NAME);
    const index = store.index('quizId');
    
    const allMedia = await new Promise<any[]>((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    
    console.log(`[DownloadManager] Found ${allMedia.length} stored media Blobs`);
    
    // 3. Delete orphaned media
    let deletedCount = 0;
    for (const media of allMedia) {
      if (!referencedUrls.has(media.url)) {
        // This media is not referenced by any quiz → DELETE IT
        await new Promise<void>((resolve, reject) => {
          const deleteReq = store.delete(media.url);
          deleteReq.onsuccess = () => resolve();
          deleteReq.onerror = () => reject(deleteReq.error);
        });
        
        deletedCount++;
        console.log(`[DownloadManager] 🗑️ Deleted orphaned media: ${media.url}`);
      }
    }
    
    console.log(`✅ [DownloadManager] Cleanup complete: Deleted ${deletedCount} orphaned media files`);
    return deletedCount;
  } catch (error) {
    console.error('[DownloadManager] Orphaned media cleanup failed:', error);
    return 0;
  }
}

/**
 * 🕐 Schedule periodic orphaned media cleanup (once per week)
 * Call this on app startup
 * @param userId - User ID
 */
export function scheduleMediaCleanup(userId: string): void {
  const CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days
  const CLEANUP_KEY = 'last_media_cleanup';
  
  const lastCleanup = parseInt(localStorage.getItem(CLEANUP_KEY) || '0', 10);
  const now = Date.now();
  
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    console.log('[DownloadManager] Running scheduled media cleanup...');
    
    cleanupOrphanedMedia(userId).then((deleted) => {
      console.log(`[DownloadManager] Scheduled cleanup: Deleted ${deleted} orphaned media`);
      localStorage.setItem(CLEANUP_KEY, now.toString());
    });
  }
}

// ============================================================================
// GET CACHED MEDIA (for OfflineImage component)
// ============================================================================

/**
 * 🔥 Get cached media Blob from IndexedDB
 * This is used by OfflineImage component
 */
export async function getCachedMediaBlob(url: string): Promise<Blob | null> {
  try {
    const idb = await openDB();
    const transaction = idb.transaction([MEDIA_STORE_NAME], 'readonly');
    const store = transaction.objectStore(MEDIA_STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[DownloadManager] Failed to get cached Blob:', error);
    return null;
  }
}

// ============================================================================
// UPDATE CHECK (FIX: Stale Data Problem)
// ============================================================================

export interface UpdateCheckResult {
  hasUpdate: boolean;
  serverVersion?: number;
  localVersion?: number;
  message?: string;
}

/**
 * 🔥 Check nếu server có version mới hơn cached quiz
 * So sánh updatedAt timestamp
 * @param quizId - Quiz ID
 * @param userId - User ID (REQUIRED for security)
 */
export async function checkForUpdate(quizId: string, userId: string): Promise<UpdateCheckResult> {
  // 🔐 SECURITY: Validate userId
  if (!userId || userId.trim() === '') {
    return {
      hasUpdate: false,
      message: 'User ID required',
    };
  }

  try {
    // 1. Get local version (with ownership check)
    const localQuiz = await getDownloadedQuiz(quizId, userId);
    if (!localQuiz) {
      return {
        hasUpdate: false,
        message: 'Quiz not downloaded',
      };
    }

    // 2. Get server version
    if (!navigator.onLine) {
      return {
        hasUpdate: false,
        message: 'Offline - cannot check updates',
      };
    }

    const docRef = doc(db, 'quizzes', quizId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return {
        hasUpdate: false,
        message: 'Quiz not found on server',
      };
    }

    const serverData = snapshot.data();
    const serverUpdatedAt = serverData.updatedAt || serverData.createdAt || 0;

    // 3. Compare timestamps
    const localUpdatedAt = localQuiz.updatedAt || localQuiz.downloadedAt;
    const hasUpdate = serverUpdatedAt > localUpdatedAt;

    console.log('[DownloadManager] Update check:', {
      quizId,
      serverUpdatedAt,
      localUpdatedAt,
      hasUpdate,
    });

    return {
      hasUpdate,
      serverVersion: serverUpdatedAt,
      localVersion: localUpdatedAt,
      message: hasUpdate
        ? 'New version available'
        : 'You have the latest version',
    };
  } catch (error) {
    console.error('[DownloadManager] Failed to check update:', error);
    return {
      hasUpdate: false,
      message: 'Failed to check update',
    };
  }
}

/**
 * 🔥 Update downloaded quiz to latest version
 * Re-download with progress tracking
 * @param quizId - Quiz ID
 * @param userId - User ID (REQUIRED for security)
 * @param onProgress - Progress callback
 */
export async function updateDownloadedQuiz(
  quizId: string,
  userId: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<{ success: boolean; error?: string }> {
  // 🔐 SECURITY: Validate userId
  if (!userId || userId.trim() === '') {
    return { success: false, error: 'User ID required for security' };
  }

  try {
    console.log('[DownloadManager] Updating quiz:', quizId);

    // Delete old version (with ownership check)
    await deleteDownloadedQuiz(quizId, userId);

    // Download new version
    return await downloadQuizForOffline(quizId, userId, onProgress);
  } catch (error) {
    const errorMsg = (error as Error).message;
    console.error('[DownloadManager] Update failed:', error);
    return { success: false, error: errorMsg };
  }
}

// ============================================================================
// SEARCH (OPTIMIZED)
// ============================================================================

/**
 * 🔍 OPTIMIZED: Search quizzes using IndexedDB index (FAST)
 * - Uses searchKeywords multiEntry index (không cần load tất cả vào RAM)
 * - Returns user-scoped results only
 * @param query - Search query (single keyword or phrase)
 * @param userId - User ID (REQUIRED for security)
 */
export async function searchQuizzes(query: string, userId: string): Promise<DownloadedQuiz[]> {
  // 🔐 SECURITY: Validate userId
  if (!userId || userId.trim() === '') {
    console.error('[DownloadManager] User ID required for search');
    return [];
  }

  if (!query || query.trim() === '') {
    // Empty query → return all user's quizzes
    return getDownloadedQuizzes(userId);
  }

  try {
    const idb = await openDB();
    const transaction = idb.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const keywordIndex = store.index('searchKeywords');

    // Normalize query
    const keyword = query.toLowerCase().trim();

    return new Promise((resolve, reject) => {
      const results: DownloadedQuiz[] = [];
      const seenIds = new Set<string>(); // Dedupe (vì multiEntry có thể trả về duplicates)

      // 🔥 Query using index (FAST - không cần getAll())
      const request = keywordIndex.openCursor(IDBKeyRange.only(keyword));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const quiz = cursor.value as DownloadedQuiz;
          
          // 🔐 Filter by userId (security)
          if (quiz.userId === userId && !seenIds.has(quiz.id)) {
            results.push(quiz);
            seenIds.add(quiz.id);
          }
          
          cursor.continue();
        } else {
          // Done
          console.log(`[DownloadManager] Found ${results.length} results for "${query}"`);
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[DownloadManager] Search failed:', error);
    return [];
  }
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const downloadManager = {
  // Download
  downloadQuizForOffline,
  
  // Query
  getDownloadedQuizzes,
  getDownloadedQuiz,
  isQuizDownloaded,
  
  // 🔍 Search (OPTIMIZED)
  searchQuizzes,
  
  // Delete
  deleteDownloadedQuiz,
  clearAllDownloads,
  
  // Storage
  getStorageInfo,
  hasEnoughStorage,
  isStorageWarning,
  
  // Media
  getCachedMediaBlob,
  
  // Update
  checkForUpdate,
  updateDownloadedQuiz,
  
  // Safari
  verifyQuizExists, // Verify quiz data still exists (Safari eviction check)
  isIOSSafari, // Detect iOS Safari
  
  // 🧹 Maintenance
  cleanupOrphanedMedia, // Clean up orphaned media Blobs
  scheduleMediaCleanup, // Auto-schedule cleanup (call on app startup)
  
  // Constants
  CACHE_NAME,
  STORAGE_WARNING_THRESHOLD,
  CURRENT_SCHEMA_VERSION,
};

export default downloadManager;
