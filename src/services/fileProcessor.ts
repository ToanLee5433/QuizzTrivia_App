/**
 * 📁 File Processing Service - Secure Cloud Functions Implementation
 * 
 * This service calls Cloud Functions instead of directly calling Google AI APIs
 * to keep API keys secure and prevent exposure in the browser bundle.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../lib/firebase/config';

// Initialize Firebase Functions
const functions = getFunctions(app, 'us-central1');

export interface FileProcessingResult {
  content: string;
  type: 'text' | 'image' | 'document';
  error?: string;
}

interface ProcessFileResponse {
  success: boolean;
  content?: string;
  type?: string;
  error?: string;
}

export class FileProcessor {
  // No longer needs API key - uses Cloud Functions

  async processFile(file: File): Promise<FileProcessingResult> {
    const fileType = this.getFileType(file);
    
    // Text files can be processed locally
    if (fileType === 'text') {
      return this.processTextFile(file);
    }

    // For AI-processed files (images, PDFs, docs), use Cloud Function
    if (['image', 'pdf', 'doc'].includes(fileType)) {
      return this.processWithCloudFunction(file, fileType);
    }

    return {
      content: '',
      type: 'text',
      error: `Loại file không được hỗ trợ: ${file.type}`
    };
  }

  private getFileType(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf';
    if (mimeType.includes('word') || ['doc', 'docx'].includes(extension || '')) return 'doc';
    if (mimeType.startsWith('text/') || ['txt', 'md', 'csv'].includes(extension || '')) return 'text';
    
    return 'unknown';
  }

  private async processWithCloudFunction(
    file: File, 
    fileType: string
  ): Promise<FileProcessingResult> {
    try {
      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      
      // Call Cloud Function
      const processFileFunc = httpsCallable<
        { base64Data: string; mimeType: string; fileType: string },
        ProcessFileResponse
      >(functions, 'processFile');

      const result = await processFileFunc({
        base64Data,
        mimeType: file.type || this.getDefaultMimeType(fileType),
        fileType: fileType === 'doc' ? 'document' : fileType
      });

      if (result.data.success && result.data.content) {
        return {
          content: result.data.content,
          type: (result.data.type as 'text' | 'image' | 'document') || 'document'
        };
      } else {
        return {
          content: '',
          type: fileType === 'image' ? 'image' : 'document',
          error: result.data.error || 'Không thể xử lý file'
        };
      }

    } catch (error) {
      console.error('File processing error:', error);
      return {
        content: '',
        type: fileType === 'image' ? 'image' : 'document',
        error: `Lỗi xử lý file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private getDefaultMimeType(fileType: string): string {
    switch (fileType) {
      case 'image':
        return 'image/png';
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'application/octet-stream';
    }
  }

  private async processTextFile(file: File): Promise<FileProcessingResult> {
    try {
      const text = await this.readTextFile(file);
      return {
        content: text,
        type: 'text'
      };
    } catch (error) {
      return {
        content: '',
        type: 'text',
        error: `Lỗi đọc file text: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  }
}

export const getSupportedFileTypes = () => {
  return {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
    documents: ['.pdf', '.doc', '.docx'],
    text: ['.txt', '.md', '.csv', '.json'],
    mimeTypes: [
      'image/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/*'
    ]
  };
};
