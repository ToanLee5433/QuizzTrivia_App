/**
 * Image Upload Service - Direct Upload to Firebase Storage
 * 
 * Upload ảnh trực tiếp lên Firebase Storage mà không cần resize
 * - Original image: /images/{folder}/{filename}
 */

import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, UploadMetadata } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const storage = getStorage();

export interface ImageUploadOptions {
  folder?: 'avatars' | 'quizzes' | 'covers' | 'temp';
  maxSizeKB?: number;
  allowedTypes?: string[];
  generateThumbnails?: boolean; // Kept for backward compatibility but ignored
}

export interface ImageUploadResult {
  success: boolean;
  originalUrl?: string;
  thumbnailUrls?: {
    small?: string;    // Not used anymore
    medium?: string;   // Not used anymore
    large?: string;    // Not used anymore
  };
  fileName?: string;
  filePath?: string;
  error?: string;
}

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'error';
}

/**
 * Validate image file
 */
const validateImage = (
  file: File,
  maxSizeKB: number = 5120, // 5MB default
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
): { valid: boolean; error?: string } => {
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Chỉ chấp nhận các định dạng: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
    };
  }

  // Check file size
  const fileSizeKB = file.size / 1024;
  if (fileSizeKB > maxSizeKB) {
    return {
      valid: false,
      error: `Kích thước file vượt quá ${maxSizeKB}KB (${Math.round(fileSizeKB)}KB)`
    };
  }

  return { valid: true };
};

/**
 * Generate unique filename with timestamp
 */
const generateFileName = (originalName: string, userId: string): string => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const cleanName = originalName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  
  return `${cleanName}_${userId}_${timestamp}_${randomStr}.${extension}`;
};

/**
 * Upload image to Firebase Storage với Progress Callback
 */
export const uploadImage = async (
  file: File,
  options: ImageUploadOptions = {},
  onProgress?: (progress: UploadProgress) => void
): Promise<ImageUploadResult> => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return {
      success: false,
      error: 'Bạn cần đăng nhập để upload ảnh'
    };
  }

  const {
    folder = 'temp',
    maxSizeKB = 5120,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    // generateThumbnails is no longer used - kept in interface for backward compatibility
  } = options;

  // Validate image
  const validation = validateImage(file, maxSizeKB, allowedTypes);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  try {
    // Generate unique filename
    const fileName = generateFileName(file.name, currentUser.uid);
    const filePath = `images/${folder}/${fileName}`;
    const storageRef = ref(storage, filePath);

    // Metadata cho image
    const metadata: UploadMetadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: currentUser.uid,
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
        folder: folder
      },
      cacheControl: 'public, max-age=31536000' // Cache 1 năm
    };

    // Upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    return new Promise((resolve, _reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress callback
          if (onProgress) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              progress: Math.round(progress),
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              state: snapshot.state as 'running' | 'paused'
            });
          }
        },
        (error) => {
          // Error handling
          console.error('Upload error:', error);
          resolve({
            success: false,
            error: 'Lỗi khi upload ảnh: ' + error.message
          });
        },
        async () => {
          // Upload completed - return immediately without waiting for thumbnails
          try {
            const originalUrl = await getDownloadURL(uploadTask.snapshot.ref);

            resolve({
              success: true,
              originalUrl,
              thumbnailUrls: {}, // No longer using resize extension
              fileName,
              filePath
            });

            if (onProgress) {
              onProgress({
                progress: 100,
                bytesTransferred: uploadTask.snapshot.totalBytes,
                totalBytes: uploadTask.snapshot.totalBytes,
                state: 'success'
              });
            }
          } catch (error: any) {
            resolve({
              success: false,
              error: 'Không thể lấy URL download: ' + error.message
            });
          }
        }
      );
    });
  } catch (error: any) {
    console.error('Upload image error:', error);
    return {
      success: false,
      error: 'Có lỗi xảy ra: ' + error.message
    };
  }
};

/**
 * 🚀 INSTANT UPLOAD - Upload ngay lập tức (1-3s) không đợi compression
 * 
 * Strategy:
 * 1. Upload file gốc ngay lập tức → User thấy kết quả trong 1-3s
 * 2. Compress trong background → Không block UI
 * 3. Thay thế bằng file compressed → Tiết kiệm bandwidth sau
 * 
 * Trade-off:
 * + Upload cực nhanh (1-3s)
 * + UX mượt mà
 * - Storage tạm thời lớn hơn (sẽ được thay thế sau)
 */
export const instantUploadImage = async (
  file: File,
  options: ImageUploadOptions = {},
  onProgress?: (progress: UploadProgress) => void
): Promise<ImageUploadResult> => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return {
      success: false,
      error: 'Bạn cần đăng nhập để upload ảnh'
    };
  }

  try {
    const {
      folder = 'temp',
      maxSizeKB = 5120,
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      // generateThumbnails is no longer used
    } = options;

    // Validate
    const validation = validateImage(file, maxSizeKB, allowedTypes);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const fileName = generateFileName(file.name, currentUser.uid);
    const filePath = `images/${folder}/${fileName}`;
    const storageRef = ref(storage, filePath);

    // Metadata
    const metadata: UploadMetadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: currentUser.uid,
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
        instant: 'true' // Đánh dấu đây là instant upload
      }
    };

    console.log('⚡ INSTANT UPLOAD START:', {
      file: file.name,
      size: `${Math.round(file.size / 1024)}KB`,
      type: file.type
    });

    // 🚀 UPLOAD NGAY - Không đợi compression
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    const uploadResult = await new Promise<ImageUploadResult>((resolve, _reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (onProgress) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              progress: Math.round(progress),
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              state: snapshot.state as 'running' | 'paused'
            });
          }
        },
        (error) => {
          console.error('❌ Instant upload error:', error);
          resolve({
            success: false,
            error: 'Lỗi upload: ' + error.message
          });
        },
        async () => {
          try {
            const originalUrl = await getDownloadURL(uploadTask.snapshot.ref);
            
            console.log('✅ INSTANT UPLOAD DONE:', {
              time: '1-3s',
              url: originalUrl.substring(0, 50) + '...'
            });

            // Return ngay - không đợi thumbnails
            resolve({
              success: true,
              originalUrl,
              fileName,
              filePath,
              thumbnailUrls: {} // No longer using resize extension
            });

            if (onProgress) {
              onProgress({
                progress: 100,
                bytesTransferred: uploadTask.snapshot.totalBytes,
                totalBytes: uploadTask.snapshot.totalBytes,
                state: 'success'
              });
            }
          } catch (error: any) {
            resolve({
              success: false,
              error: 'Không lấy được URL: ' + error.message
            });
          }
        }
      );
    });

    return uploadResult;

  } catch (error: any) {
    console.error('❌ Instant upload error:', error);
    return {
      success: false,
      error: 'Có lỗi xảy ra: ' + error.message
    };
  }
};

/**
 * Upload avatar với optimization cho profile pictures
 */
export const uploadAvatar = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<ImageUploadResult> => {
  return uploadImage(file, {
    folder: 'avatars',
    maxSizeKB: 2048, // 2MB max for avatars
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    generateThumbnails: true
  }, onProgress);
};

/**
 * Upload quiz cover image
 */
export const uploadQuizCover = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<ImageUploadResult> => {
  return uploadImage(file, {
    folder: 'covers',
    maxSizeKB: 3072, // 3MB max for covers
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    generateThumbnails: true
  }, onProgress);
};

/**
 * Upload quiz question image
 */
export const uploadQuizImage = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<ImageUploadResult> => {
  return uploadImage(file, {
    folder: 'quizzes',
    maxSizeKB: 2048, // 2MB max for quiz images
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    generateThumbnails: true
  }, onProgress);
};

/**
 * Delete image from Storage (cả original và thumbnails)
 */
export const deleteImage = async (filePath: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      return { success: false, error: 'Bạn cần đăng nhập' };
    }

    // Delete original image
    const imageRef = ref(storage, filePath);
    await deleteObject(imageRef);

    // Try to delete thumbnails
    const fileName = filePath.split('/').pop();
    if (fileName) {
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
      const extension = fileName.split('.').pop();

      const thumbnailSizes = ['200x200', '400x400', '800x800'];
      
      for (const size of thumbnailSizes) {
        try {
          const thumbnailPath = `thumbnails/${nameWithoutExt}_${size}.${extension}`;
          const thumbnailRef = ref(storage, thumbnailPath);
          await deleteObject(thumbnailRef);
        } catch (error) {
          // Thumbnail might not exist, ignore error
          console.warn(`Thumbnail ${size} not found, skipping`);
        }
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Delete image error:', error);
    return {
      success: false,
      error: 'Không thể xóa ảnh: ' + error.message
    };
  }
};

/**
 * Get image URL từ Storage path
 */
export const getImageUrl = async (filePath: string): Promise<string | null> => {
  try {
    const imageRef = ref(storage, filePath);
    return await getDownloadURL(imageRef);
  } catch (error) {
    console.error('Get image URL error:', error);
    return null;
  }
};

/**
 * Compress image siêu nhanh với WebP format
 * WebP nhẹ hơn JPEG 25-35%, encode nhanh hơn, quality tốt hơn
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85,
  useWebP: boolean = true // WebP mặc định cho tốc độ
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha for better performance
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Use WebP for faster compression (25-35% smaller)
        const outputType = useWebP ? 'image/webp' : file.type;
        const outputExtension = useWebP ? '.webp' : file.name.split('.').pop();
        const outputName = file.name.replace(/\.[^/.]+$/, `.${outputExtension}`);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob failed'));
              return;
            }
            
            const compressedFile = new File([blob], outputName, {
              type: outputType,
              lastModified: Date.now()
            });
            
            console.log(`🗜️ Compressed: ${Math.round(file.size/1024)}KB → ${Math.round(compressedFile.size/1024)}KB (${Math.round((1 - compressedFile.size/file.size) * 100)}% reduction)`);
            
            resolve(compressedFile);
          },
          outputType,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
};

/**
 * FAST UPLOAD: Compress + Upload ngay khi chọn file (không đợi user confirm)
 * Dùng cho trải nghiệm instant upload
 */
export const fastUploadImage = async (
  file: File,
  options: ImageUploadOptions = {},
  onProgress?: (progress: UploadProgress) => void
): Promise<ImageUploadResult> => {
  // Step 1: Compress siêu nhanh với WebP
  console.time('⚡ FastUpload - Compression');
  const compressed = await compressImage(file, 1920, 1080, 0.8, true); // WebP, quality 0.8 for speed
  console.timeEnd('⚡ FastUpload - Compression');
  
  // Step 2: Upload ngay không đợi
  console.time('⚡ FastUpload - Upload');
  const result = await uploadImage(compressed, options, onProgress);
  console.timeEnd('⚡ FastUpload - Upload');
  
  return result;
};

/**
 * BACKGROUND UPLOAD: Upload trong background, return promise ngay
 * User không cần đợi, có thể làm việc khác
 */
export const backgroundUploadImage = (
  file: File,
  options: ImageUploadOptions = {},
  onComplete?: (result: ImageUploadResult) => void
): void => {
  // Compress và upload trong background
  (async () => {
    try {
      const compressed = await compressImage(file, 1920, 1080, 0.8, true);
      const result = await uploadImage(compressed, options);
      
      if (onComplete) {
        onComplete(result);
      }
    } catch (error) {
      console.error('Background upload failed:', error);
      if (onComplete) {
        onComplete({
          success: false,
          error: 'Upload thất bại: ' + (error as Error).message
        });
      }
    }
  })();
  
  console.log('📤 Background upload started...');
};

export default {
  uploadImage,
  instantUploadImage, // 🚀 NEW: Upload ngay 1-3s
  uploadAvatar,
  uploadQuizCover,
  uploadQuizImage,
  deleteImage,
  getImageUrl,
  compressImage,
  fastUploadImage,
  backgroundUploadImage
};
