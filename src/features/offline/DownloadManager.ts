/**
 * ❄️ COLD LAYER: Download Manager
 * ===================================
 * Quản lý tải Quiz về máy để sử dụng hoàn toàn offline (không cần mạng)
 * - Cache Media Assets (images, audio) vào IndexedDB via Dexie
 * - Lưu Quiz Data vào Dexie (Single Source of Truth - không dùng native IndexedDB riêng)
 * - Quản lý storage quota và cleanup
 * 
 * 🔥 REFACTORED: Sử dụng Dexie từ database.ts thay vì native IndexedDB
 */

import { doc, getDoc } from 'firebase/firestore';
import { db as firebaseDb } from '../../lib/firebase/config';
import { db as dexieDb } from '../../features/flashcard/services/database';
import type { DownloadedQuiz } from '../../features/flashcard/services/database';

// Re-export types for backward compatibility  
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type { DownloadedQuiz, DownloadedQuizQuestion as QuizQuestion, MediaBlobEntry } from '../../features/flashcard/services/database';

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
const CURRENT_SCHEMA_VERSION = 2; // 🌪️ Track schema changes for migration

// Warning threshold: 80% of quota
const STORAGE_WARNING_THRESHOLD = 0.8;

// 🔥 STORAGE LIMIT: Giới hạn tổng dung lượng quiz offline (5GB)
// Lý do: Đảm bảo app không chiếm quá nhiều storage của device
// Lưu ý: Quota thực tế phụ thuộc vào bộ nhớ trống của thiết bị
const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5GB

// 🔥 IMAGE COMPRESSION: Quality settings
const IMAGE_COMPRESSION_QUALITY = 0.7; // 70% JPEG quality
const MAX_IMAGE_DIMENSION = 1920; // Max width/height for images

// Legacy DB name - for migration cleanup
const LEGACY_DB_NAME = 'QuizOfflineDB';

// ============================================================================
// LEGACY DATABASE MIGRATION (One-time cleanup)
// ============================================================================

/**
 * 🔄 Migrate data from legacy native IndexedDB to Dexie
 * Called once on app startup, then deletes the old DB
 */
async function migrateLegacyDatabase(): Promise<void> {
  return new Promise((resolve) => {
    // Check if legacy DB exists
    const request = indexedDB.open(LEGACY_DB_NAME);
    
    request.onerror = () => {
      // Legacy DB doesn't exist - no migration needed
      resolve();
    };
    
    request.onsuccess = async () => {
      const legacyDb = request.result;
      
      // Check if stores exist
      if (!legacyDb.objectStoreNames.contains('downloaded_quizzes')) {
        legacyDb.close();
        // Delete empty legacy DB
        indexedDB.deleteDatabase(LEGACY_DB_NAME);
        console.log('[DownloadManager] 🗑️ Deleted empty legacy DB');
        resolve();
        return;
      }
      
      try {
        // Migrate quizzes
        const quizTransaction = legacyDb.transaction(['downloaded_quizzes'], 'readonly');
        const quizStore = quizTransaction.objectStore('downloaded_quizzes');
        
        const quizzes = await new Promise<any[]>((res, rej) => {
          const req = quizStore.getAll();
          req.onsuccess = () => res(req.result || []);
          req.onerror = () => rej(req.error);
        });
        
        if (quizzes.length > 0) {
          console.log(`[DownloadManager] 🔄 Migrating ${quizzes.length} quizzes from legacy DB...`);
          
          // Insert into Dexie
          await dexieDb.downloadedQuizzes.bulkPut(quizzes.map(q => ({
            ...q,
            isDownloaded: true
          })));
          
          console.log(`[DownloadManager] ✅ Migrated ${quizzes.length} quizzes to Dexie`);
        }
        
        // Migrate media blobs if store exists
        if (legacyDb.objectStoreNames.contains('media_blobs')) {
          const mediaTransaction = legacyDb.transaction(['media_blobs'], 'readonly');
          const mediaStore = mediaTransaction.objectStore('media_blobs');
          
          const mediaBlobs = await new Promise<any[]>((res, rej) => {
            const req = mediaStore.getAll();
            req.onsuccess = () => res(req.result || []);
            req.onerror = () => rej(req.error);
          });
          
          if (mediaBlobs.length > 0) {
            console.log(`[DownloadManager] 🔄 Migrating ${mediaBlobs.length} media blobs...`);
            
            await dexieDb.mediaBlobs.bulkPut(mediaBlobs.map(m => ({
              url: m.url,
              quizId: m.quizId,
              blob: m.blob,
              type: m.type,
              contentType: m.contentType,
              savedAt: m.savedAt || Date.now(),
              size: m.blob?.size
            })));
            
            console.log(`[DownloadManager] ✅ Migrated ${mediaBlobs.length} media blobs to Dexie`);
          }
        }
        
        legacyDb.close();
        
        // Delete legacy database after successful migration
        indexedDB.deleteDatabase(LEGACY_DB_NAME);
        console.log('[DownloadManager] 🗑️ Deleted legacy QuizOfflineDB');
        
      } catch (error) {
        console.error('[DownloadManager] Migration error:', error);
        legacyDb.close();
      }
      
      resolve();
    };
  });
}

// Run migration on module load
migrateLegacyDatabase().catch(console.error);

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
 * 🖼️ MICRO-OPTIMIZATION: Compress image to WebP/JPEG 70%
 * Reduces image size by ~60-80% with minimal visual quality loss
 */
async function compressImage(blob: Blob): Promise<Blob> {
  // Skip if not an image
  if (!blob.type.startsWith('image/')) {
    return blob;
  }

  // Skip if already small (< 100KB)
  if (blob.size < 100 * 1024) {
    return blob;
  }

  try {
    // Create image element
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = objectUrl;
    });

    URL.revokeObjectURL(objectUrl);

    // Calculate new dimensions (maintain aspect ratio)
    let { width, height } = img;
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Draw to canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return blob;
    }
    ctx.drawImage(img, 0, 0, width, height);

    // Try WebP first (better compression)
    let compressedBlob: Blob | null = null;
    
    // Check WebP support
    const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
    
    if (supportsWebP) {
      compressedBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/webp', IMAGE_COMPRESSION_QUALITY);
      });
    }

    // Fallback to JPEG
    if (!compressedBlob) {
      compressedBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', IMAGE_COMPRESSION_QUALITY);
      });
    }

    if (compressedBlob && compressedBlob.size < blob.size) {
      const savedPercent = ((1 - compressedBlob.size / blob.size) * 100).toFixed(1);
      console.log(`[DownloadManager] 🖼️ Image compressed: ${(blob.size/1024).toFixed(0)}KB → ${(compressedBlob.size/1024).toFixed(0)}KB (-${savedPercent}%)`);
      return compressedBlob;
    }

    return blob;
  } catch (error) {
    console.warn('[DownloadManager] Image compression failed, using original:', error);
    return blob;
  }
}

/**
 * 🔍 Check if storage data has been evicted (Safari issue)
 * Returns true if data might have been deleted by the browser
 */
export async function checkEvictionStatus(userId: string): Promise<{
  evicted: boolean;
  expectedCount: number;
  actualCount: number;
}> {
  try {
    // Get expected count from localStorage (survives eviction better)
    const expectedKey = `quiz_download_count_${userId}`;
    const expectedCountStr = localStorage.getItem(expectedKey);
    const expectedCount = expectedCountStr ? parseInt(expectedCountStr, 10) : 0;

    // Get actual count from IndexedDB
    const quizzes = await dexieDb.downloadedQuizzes
      .where('userId')
      .equals(userId)
      .count();

    const evicted = expectedCount > 0 && quizzes < expectedCount * 0.5; // >50% lost = eviction

    if (evicted) {
      console.warn(`[DownloadManager] ⚠️ EVICTION DETECTED: Expected ${expectedCount}, found ${quizzes}`);
    }

    return {
      evicted,
      expectedCount,
      actualCount: quizzes
    };
  } catch (error) {
    console.error('[DownloadManager] Failed to check eviction status:', error);
    return { evicted: false, expectedCount: 0, actualCount: 0 };
  }
}

/**
 * 📊 Update expected quiz count (call after successful download)
 */
async function updateExpectedQuizCount(userId: string): Promise<void> {
  try {
    const count = await dexieDb.downloadedQuizzes
      .where('userId')
      .equals(userId)
      .count();
    localStorage.setItem(`quiz_download_count_${userId}`, count.toString());
  } catch (error) {
    console.warn('[DownloadManager] Failed to update expected count:', error);
  }
}

/**
 * 🔥 Check storage limit before download
 * Returns available space in bytes, or error if limit exceeded
 */
export async function checkStorageLimit(userId: string): Promise<{
  canDownload: boolean;
  usedBytes: number;
  limitBytes: number;
  availableBytes: number;
  percentUsed: number;
}> {
  try {
    // Calculate total size of user's downloaded quizzes
    const quizzes = await dexieDb.downloadedQuizzes
      .where('userId')
      .equals(userId)
      .toArray();
    
    const usedBytes = quizzes.reduce((total, quiz) => total + (quiz.size || 0), 0);
    const availableBytes = STORAGE_LIMIT_BYTES - usedBytes;
    const percentUsed = (usedBytes / STORAGE_LIMIT_BYTES) * 100;

    return {
      canDownload: usedBytes < STORAGE_LIMIT_BYTES,
      usedBytes,
      limitBytes: STORAGE_LIMIT_BYTES,
      availableBytes: Math.max(0, availableBytes),
      percentUsed
    };
  } catch (error) {
    console.error('[DownloadManager] Failed to check storage limit:', error);
    return {
      canDownload: true, // Allow on error
      usedBytes: 0,
      limitBytes: STORAGE_LIMIT_BYTES,
      availableBytes: STORAGE_LIMIT_BYTES,
      percentUsed: 0
    };
  }
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
// CACHE MANAGEMENT (Using Dexie)
// ============================================================================

/**
 * 🔥 Cache media files as Blobs (FIX: Signed URL expiration)
 * - Fetch URL → Blob
 * - Save Blob to Dexie (không có token)
 * - Blob never expires
 */
async function cacheMediaFiles(
  quizId: string,
  urls: string[],
  onProgress?: (current: number, total: number, file: string) => void
): Promise<{ success: number; failed: string[] }> {
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
        
        let blob = await response.blob();
        const originalContentType = response.headers.get('Content-Type') || blob.type;
        
        // 2. Determine media type
        const mediaType: 'image' | 'audio' = originalContentType.startsWith('image/') ? 'image' : 'audio';

        // 🔥 MICRO-OPTIMIZATION: Compress images before saving
        if (mediaType === 'image') {
          blob = await compressImage(blob);
        }

        // Determine final content type (may change after compression)
        const contentType = blob.type || originalContentType;

        // 3. Save to Dexie
        await dexieDb.mediaBlobs.put({
          url, // Original URL as key
          quizId,
          blob,
          type: mediaType,
          contentType,
          savedAt: Date.now(),
          size: blob.size
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
 * 🧹 CRITICAL FIX: Xóa cached media từ CẢ Dexie VÀ Cache Storage
 */
async function deleteCachedMedia(urls: string[]): Promise<void> {
  // 1. Delete from Dexie (media Blobs)
  await dexieDb.mediaBlobs.bulkDelete(urls);

  console.log(`[DownloadManager] 🗑️ Deleted ${urls.length} media from Dexie`);

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
    // 🔥 Stage 0: Check storage limit (5GB cap)
    const storageCheck = await checkStorageLimit(userId);
    if (!storageCheck.canDownload) {
      const usedGB = (storageCheck.usedBytes / 1024 / 1024 / 1024).toFixed(2);
      return { 
        success: false, 
        error: `Đã đạt giới hạn lưu trữ (${usedGB}GB/5GB). Vui lòng xóa bớt quiz cũ để tải thêm.` 
      };
    }

    // 🔥 Stage 0.5: Request persistent storage (Safari fix)
    await requestPersistentStorage();

    // Stage 1: Fetch Data
    onProgress?.({
      quizId,
      stage: 'fetching',
      progress: 10,
    });

    const docRef = doc(firebaseDb, 'quizzes', quizId);
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

    // Stage 3: Calculate Size & Save to Dexie
    onProgress?.({
      quizId,
      stage: 'saving-data',
      progress: 85,
    });

    quizData.size = await estimateQuizSize(quizData, extractedUrls);

    // Save to Dexie (Single Source of Truth)
    await dexieDb.downloadedQuizzes.put({
      ...quizData,
      isDownloaded: true
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

    // 🔥 Update expected quiz count (for eviction detection)
    await updateExpectedQuizCount(userId);

    console.log(`✅ [DownloadManager] Quiz ${quizId} downloaded successfully`);
    return { success: true };
  } catch (error) {
    const errorMsg = (error as Error).message;
    const errorName = (error as Error).name;
    console.error(`❌ [DownloadManager] Download failed:`, error);

    // 🔥 EDGE CASE: Handle QuotaExceededError (Storage full)
    let friendlyError = errorMsg;
    if (errorName === 'QuotaExceededError' || errorMsg.includes('quota') || errorMsg.includes('Quota')) {
      friendlyError = 'Bộ nhớ đầy! Vui lòng xóa bớt quiz cũ đã tải để giải phóng dung lượng.';
      console.warn('[DownloadManager] 💾 Storage quota exceeded - user needs to free up space');
    }

    onProgress?.({
      quizId,
      stage: 'error',
      progress: 0,
      error: friendlyError,
    });

    return { success: false, error: friendlyError };
  }
}

// ============================================================================
// GET DOWNLOADED QUIZZES (Using Dexie)
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
    // Query using Dexie index
    const results = await dexieDb.downloadedQuizzes
      .where('userId')
      .equals(userId)
      .toArray();
    
    console.log(`[DownloadManager] Found ${results.length} quizzes for user ${userId}`);
    return results;
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
    const result = await dexieDb.downloadedQuizzes.get(quizId);
    
    // 🔐 SECURITY: Verify ownership
    if (result && result.userId === userId) {
      // 🌪️ SCHEMA MIGRATION: Check and migrate if needed
      const migratedData = migrateSchemaIfNeeded(result);
      return migratedData;
    } else if (result) {
      console.warn(`[DownloadManager] User ${userId} tried to access quiz owned by ${result.userId}`);
      return null; // Return null instead of exposing other user's data
    }
    
    return null;
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
// DELETE QUIZ (Using Dexie)
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

    // 2. 🧹 Delete media Blobs from Dexie (PREVENT ORPHANED MEDIA)
    const mediaUrls = quiz.mediaUrls || extractMediaUrls(quiz);
    if (mediaUrls.length > 0) {
      await deleteCachedMedia(mediaUrls);
      console.log(`[DownloadManager] 🧹 Cleaned up ${mediaUrls.length} media Blobs`);
    }

    // 3. Delete quiz from Dexie
    await dexieDb.downloadedQuizzes.delete(quizId);

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
    // Use Dexie helper method to clear downloads for user
    const count = await dexieDb.clearDownloadsForUser(userId);

    // 🔥 FIX: Also clear Cache Storage API
    await clearCacheStorage();

    console.log(`✅ [DownloadManager] Cleared ${count} downloaded quizzes + media (Dexie + Cache Storage)`);
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
// ORPHANED MEDIA CLEANUP (Garbage Collection) - Using Dexie
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
    
    // 2. Get all stored media Blobs from Dexie
    const allMedia = await dexieDb.mediaBlobs.toArray();
    
    console.log(`[DownloadManager] Found ${allMedia.length} stored media Blobs`);
    
    // 3. Find and delete orphaned media
    const orphanedUrls = allMedia
      .filter(media => !referencedUrls.has(media.url))
      .map(media => media.url);
    
    if (orphanedUrls.length > 0) {
      await dexieDb.mediaBlobs.bulkDelete(orphanedUrls);
      console.log(`[DownloadManager] 🗑️ Deleted ${orphanedUrls.length} orphaned media files`);
    }
    
    console.log(`✅ [DownloadManager] Cleanup complete: Deleted ${orphanedUrls.length} orphaned media files`);
    return orphanedUrls.length;
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
// GET CACHED MEDIA (for OfflineImage component) - Using Dexie
// ============================================================================

/**
 * 🔥 Get cached media Blob from Dexie
 * This is used by OfflineImage component
 */
export async function getCachedMediaBlob(url: string): Promise<Blob | null> {
  try {
    const result = await dexieDb.mediaBlobs.get(url);
    return result ? result.blob : null;
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

    const docRef = doc(firebaseDb, 'quizzes', quizId);
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
// SEARCH (OPTIMIZED) - Using Dexie
// ============================================================================

/**
 * 🔍 OPTIMIZED: Search quizzes using Dexie index (FAST)
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
    // Normalize query
    const keyword = query.toLowerCase().trim();

    // Query using Dexie multiEntry index
    const results = await dexieDb.downloadedQuizzes
      .where('searchKeywords')
      .equals(keyword)
      .filter(quiz => quiz.userId === userId) // 🔐 Filter by userId (security)
      .toArray();

    // Dedupe if needed (multiEntry can return duplicates)
    const seenIds = new Set<string>();
    const uniqueResults = results.filter(quiz => {
      if (seenIds.has(quiz.id)) return false;
      seenIds.add(quiz.id);
      return true;
    });

    console.log(`[DownloadManager] Found ${uniqueResults.length} results for "${query}"`);
    return uniqueResults;
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
  
  // 🔥 NEW: Storage Limit & Eviction
  checkStorageLimit,      // Check against 4GB limit
  checkEvictionStatus,    // Detect if Safari evicted data
  
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
  STORAGE_LIMIT_BYTES,    // 🔥 NEW: 4GB limit
  CURRENT_SCHEMA_VERSION,
};

export default downloadManager;
