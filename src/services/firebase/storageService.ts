/**
 * 📁 Unified Storage Service
 * Centralized service layer cho tất cả Cloud Storage operations
 * Hỗ trợ: Upload, Download, Delete, URL generation
 */

import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
  StorageReference,
} from 'firebase/storage';
import { storage } from '../../firebase/config';
import { storagePaths, storageValidation, FILE_TYPES } from './storage';

// ============= UPLOAD OPTIONS =============
export interface UploadOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (url: string) => void;
  onError?: (error: Error) => void;
  
  // Compression settings
  compress?: boolean;
  quality?: number; // 0-1 for images
  maxWidth?: number;
  maxHeight?: number;
  
  // Metadata
  metadata?: {
    contentType?: string;
    customMetadata?: Record<string, string>;
  };
}

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  contentType: string;
  thumbnails?: {
    small: string;
    medium: string;
    large: string;
  };
}

// ============= STORAGE SERVICE =============
export class StorageService {
  /**
   * Upload file to Storage
   */
  async uploadFile(
    file: File,
    path: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Validate file
      this.validateFile(file);
      
      // Compress if needed
      const fileToUpload = options.compress
        ? await this.compressFile(file, options)
        : file;
      
      // Create storage reference
      const storageRef = ref(storage, path);
      
      // Set metadata
      const metadata = {
        contentType: file.type,
        ...options.metadata,
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          ...options.metadata?.customMetadata,
        },
      };
      
      // Upload
      if (options.onProgress) {
        // Resumable upload with progress
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload, metadata);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              options.onProgress?.(progress);
            },
            (error) => {
              options.onError?.(error);
              reject(error);
            },
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              const result: UploadResult = {
                url,
                path,
                size: uploadTask.snapshot.totalBytes,
                contentType: uploadTask.snapshot.metadata.contentType || file.type,
              };
              
              options.onComplete?.(url);
              resolve(result);
            }
          );
        });
      } else {
        // Simple upload
        const snapshot = await uploadBytes(storageRef, fileToUpload, metadata);
        const url = await getDownloadURL(snapshot.ref);
        
        return {
          url,
          path,
          size: snapshot.metadata.size,
          contentType: snapshot.metadata.contentType || file.type,
        };
      }
    } catch (error) {
      console.error('[Storage] Upload error:', error);
      throw error;
    }
  }

  /**
   * Upload with instant preview (WebP compression)
   */
  async uploadWithInstantPreview(
    file: File,
    path: string,
    options: UploadOptions = {}
  ): Promise<{ previewUrl: string; finalUrl: Promise<UploadResult> }> {
    // Create instant preview
    const previewUrl = URL.createObjectURL(file);
    
    // Start background upload
    const finalUrl = this.uploadFile(file, path, {
      ...options,
      compress: true,
      quality: 0.8,
    });
    
    return { previewUrl, finalUrl };
  }

  /**
   * Get download URL from path
   */
  async getDownloadUrl(path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('[Storage] Get URL error:', error);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error: any) {
      // Ignore if file doesn't exist
      if (error.code === 'storage/object-not-found') {
        console.warn('[Storage] File not found, already deleted:', path);
        return;
      }
      console.error('[Storage] Delete error:', error);
      throw error;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(paths: string[]): Promise<void> {
    await Promise.all(paths.map(path => this.deleteFile(path)));
  }

  /**
   * List all files in folder
   */
  async listFiles(folderPath: string): Promise<StorageReference[]> {
    try {
      const folderRef = ref(storage, folderPath);
      const result = await listAll(folderRef);
      return result.items;
    } catch (error) {
      console.error('[Storage] List files error:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(path: string): Promise<any> {
    try {
      const storageRef = ref(storage, path);
      return await getMetadata(storageRef);
    } catch (error) {
      console.error('[Storage] Get metadata error:', error);
      throw error;
    }
  }

  /**
   * Update file metadata
   */
  async updateMetadata(path: string, metadata: any): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await updateMetadata(storageRef, metadata);
    } catch (error) {
      console.error('[Storage] Update metadata error:', error);
      throw error;
    }
  }

  /**
   * Get thumbnail URLs (from Resize Images Extension)
   */
  async getThumbnailUrls(
    originalPath: string,
    maxRetries: number = 10,
    delayMs: number = 2000
  ): Promise<{ small: string; medium: string; large: string }> {
    const sizes = ['200x200', '400x400', '800x800'] as const;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const [small, medium, large] = await Promise.all(
          sizes.map(size => {
            const thumbnailPath = storagePaths.thumbnail(originalPath, size);
            return this.getDownloadUrl(thumbnailPath);
          })
        );
        
        return { small, medium, large };
      } catch (error) {
        if (attempt === maxRetries) {
          console.warn('[Storage] Thumbnails not generated yet, using original');
          const originalUrl = await this.getDownloadUrl(originalPath);
          return {
            small: originalUrl,
            medium: originalUrl,
            large: originalUrl,
          };
        }
        
        // Progressive delay
        const delay = delayMs * Math.pow(1.2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Failed to get thumbnails after max retries');
  }

  // ============= PRIVATE HELPERS =============

  /**
   * Validate file before upload
   */
  private validateFile(file: File): void {
    // Check file type
    const isImage = storageValidation.isValidImageType(file);
    const isVideo = storageValidation.isValidVideoType(file);
    const isPDF = storageValidation.isValidPDFType(file);
    const isAudio = storageValidation.isValidAudioType(file);
    
    if (!isImage && !isVideo && !isPDF && !isAudio) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }
    
    // Check file size
    let fileType: keyof typeof FILE_TYPES;
    if (isImage) fileType = 'IMAGE';
    else if (isVideo) fileType = 'VIDEO';
    else if (isPDF) fileType = 'PDF';
    else fileType = 'AUDIO';
    
    if (!storageValidation.isValidFileSize(file, fileType)) {
      const maxSize = FILE_TYPES[fileType].maxSize / (1024 * 1024);
      throw new Error(`File too large. Max size: ${maxSize}MB`);
    }
  }

  /**
   * Compress image file
   */
  private async compressFile(file: File, options: UploadOptions): Promise<File> {
    if (!file.type.startsWith('image/')) {
      return file; // Only compress images
    }
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // Calculate dimensions
          let width = img.width;
          let height = img.height;
          
          if (options.maxWidth && width > options.maxWidth) {
            height = (height * options.maxWidth) / width;
            width = options.maxWidth;
          }
          
          if (options.maxHeight && height > options.maxHeight) {
            width = (width * options.maxHeight) / height;
            height = options.maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/webp',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file); // Fallback to original
              }
            },
            'image/webp',
            options.quality || 0.8
          );
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.readAsDataURL(file);
    });
  }
}

// ============= SPECIALIZED UPLOAD SERVICES =============

/**
 * Avatar Upload Service
 */
export class AvatarUploadService extends StorageService {
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const path = storagePaths.userAvatar(userId, 'jpg');
    
    const result = await this.uploadFile(file, path, {
      compress: true,
      quality: 0.85,
      maxWidth: 400,
      maxHeight: 400,
    });
    
    return result.url;
  }
}

/**
 * Quiz Cover Upload Service
 */
export class QuizCoverUploadService extends StorageService {
  async uploadCover(quizId: string, file: File): Promise<UploadResult> {
    const path = storagePaths.quizCover(quizId, 'jpg');
    
    return await this.uploadFile(file, path, {
      compress: true,
      quality: 0.85,
      maxWidth: 1200,
      maxHeight: 630,
    });
  }
}

/**
 * Learning Resource Upload Service
 */
export class ResourceUploadService extends StorageService {
  async uploadVideo(
    quizId: string,
    resourceId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    const ext = storageValidation.getFileExtension(file.name);
    const path = storagePaths.learningVideo(quizId, resourceId, ext.slice(1));
    
    return await this.uploadFile(file, path, {
      onProgress,
      compress: false, // Don't compress videos
    });
  }

  async uploadPDF(
    quizId: string,
    resourceId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    const path = storagePaths.learningPDF(quizId, resourceId);
    
    return await this.uploadFile(file, path, {
      onProgress,
    });
  }

  async uploadImage(
    quizId: string,
    resourceId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    const ext = storageValidation.getFileExtension(file.name);
    const path = storagePaths.learningImage(quizId, resourceId, ext.slice(1));
    
    return await this.uploadFile(file, path, {
      onProgress,
      compress: true,
      quality: 0.85,
    });
  }

  async uploadAudio(
    quizId: string,
    resourceId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    const ext = storageValidation.getFileExtension(file.name);
    const path = storagePaths.learningAudio(quizId, resourceId, ext.slice(1));
    
    return await this.uploadFile(file, path, {
      onProgress,
    });
  }
}

// ============= EXPORT INSTANCES =============
export const storageService = new StorageService();
export const avatarUploadService = new AvatarUploadService();
export const quizCoverUploadService = new QuizCoverUploadService();
export const resourceUploadService = new ResourceUploadService();

// ============= CLEANUP UTILITIES =============

/**
 * Delete quiz and all related files
 */
export async function deleteQuizFiles(quizId: string): Promise<void> {
  const paths = [
    storagePaths.quizCover(quizId),
    // Add more paths as needed
  ];
  
  await storageService.deleteFiles(paths);
  
  // Delete resource folders
  const resourceFolders = [
    `${quizId}`,
  ];
  
  for (const folder of resourceFolders) {
    try {
      const files = await storageService.listFiles(`resources/videos/${folder}`);
      await Promise.all(files.map(file => storageService.deleteFile(file.fullPath)));
    } catch (error) {
      console.warn('[Storage] No files found in folder:', folder);
    }
  }
}

/**
 * Clean up temporary files older than 24h
 */
export async function cleanupTempFiles(): Promise<void> {
  try {
    const files = await storageService.listFiles('temp');
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const fileRef of files) {
      const metadata = await storageService.getMetadata(fileRef.fullPath);
      const uploadTime = new Date(metadata.timeCreated).getTime();
      
      if (now - uploadTime > maxAge) {
        await storageService.deleteFile(fileRef.fullPath);
        console.log('[Storage] Deleted temp file:', fileRef.name);
      }
    }
  } catch (error) {
    console.error('[Storage] Cleanup error:', error);
  }
}
