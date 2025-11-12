/**
 * Image Uploader Component với Preview và Progress Bar
 * Tích hợp với Resize Images Extension
 */

import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, Loader } from 'lucide-react';
import { uploadImage, compressImage, instantUploadImage, UploadProgress, ImageUploadOptions, ImageUploadResult } from '../services/imageUploadService';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

interface ImageUploaderProps {
  onUploadSuccess: (result: ImageUploadResult) => void;
  onUploadError?: (error: string) => void;
  options?: ImageUploadOptions;
  previewUrl?: string;
  className?: string;
  label?: string;
  showThumbnails?: boolean;
  compressBeforeUpload?: boolean;
  instantUpload?: boolean; // 🚀 Upload ngay 1-3s (không compress, không đợi)
  ultraFast?: boolean; // ⚡ Upload nhanh nhất có thể
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
  options = {},
  previewUrl,
  className = '',
  label = 'Tải ảnh lên',
  showThumbnails = false,
  compressBeforeUpload = true,
  instantUpload = false, // Mặc định false
  ultraFast = false // ⚡ Mode cực nhanh
}) => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | undefined>(previewUrl);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<{ small?: string; medium?: string; large?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Chỉ chấp nhận: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`);
      return;
    }

    // Validate file size
    const maxSizeKB = options.maxSizeKB || 5120;
    const fileSizeKB = file.size / 1024;
    if (fileSizeKB > maxSizeKB) {
      toast.error(`Kích thước file vượt quá ${maxSizeKB}KB`);
      return;
    }

    setSelectedFile(file);

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // ⚡ ULTRA FAST MODE: Upload ngay lập tức (1-3s)
    if (ultraFast || instantUpload) {
      handleInstantUpload(file);
    }
  };

  const handleInstantUpload = async (file: File) => {
    setUploading(true);
    setProgress(null);
    setThumbnails({});

    try {
      toast.info(t('imageUploader.uploading'), { autoClose: 1000 });

      // 🚀 Upload ngay - KHÔNG compress, KHÔNG đợi
      const result = await instantUploadImage(
        file,
        options,
        (uploadProgress: UploadProgress) => {
          setProgress(uploadProgress);
        }
      );

      if (result.success) {
        toast.success(t('imageUploader.uploadFast'), { autoClose: 2000 });
        
        if (result.thumbnailUrls && Object.keys(result.thumbnailUrls).length > 0) {
          setThumbnails(result.thumbnailUrls);
          toast.info(t('imageUploader.thumbnailsReady'), { autoClose: 1500 });
        }
        
        onUploadSuccess(result);
      } else {
        toast.error(result.error || 'Upload thất bại');
        if (onUploadError) {
          onUploadError(result.error || 'Upload failed');
        }
      }
    } catch (error: any) {
      console.error('Instant upload error:', error);
      toast.error(t('imageUploader.uploadError'));
      if (onUploadError) {
        onUploadError(error.message);
      }
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t('imageUploader.selectImageFirst'));
      return;
    }

    setUploading(true);
    setProgress(null);
    setThumbnails({});

    try {
      let fileToUpload = selectedFile;

      // Compress image if enabled
      if (compressBeforeUpload && selectedFile.type !== 'image/gif') {
        toast.info(t('imageUploader.compressing'), { autoClose: 1000 });
        fileToUpload = await compressImage(selectedFile, 1920, 1080, 0.85, true); // WebP
        toast.success(`Đã nén: ${Math.round(selectedFile.size / 1024)}KB → ${Math.round(fileToUpload.size / 1024)}KB`, { autoClose: 1500 });
      }

      // Upload with progress callback
      const result = await uploadImage(
        fileToUpload,
        options,
        (uploadProgress) => {
          setProgress(uploadProgress);
        }
      );

      if (result.success) {
        toast.success(t('imageUploader.uploadSuccess'));
        
        if (result.thumbnailUrls && Object.keys(result.thumbnailUrls).length > 0) {
          setThumbnails(result.thumbnailUrls);
          toast.info(t('imageUploader.thumbnailsGenerated'), { autoClose: 2000 });
        }
        
        onUploadSuccess(result);
      } else {
        toast.error(result.error || 'Upload thất bại');
        if (onUploadError) {
          onUploadError(result.error || 'Upload failed');
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(t('imageUploader.uploadErrorDetailed'));
      if (onUploadError) {
        onUploadError(error.message);
      }
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    setSelectedFile(null);
    setProgress(null);
    setThumbnails({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      // Simulate file input change
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileSelect({ target: { files: dataTransfer.files } } as any);
      }
    } else {
      toast.error('Vui lòng chọn file ảnh');
    }
  };

  return (
    <div className={`image-uploader ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg transition-colors ${
          preview ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Preview */}
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-64 object-cover rounded-lg"
            />
            {!uploading && (
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            {/* Progress Overlay */}
            {uploading && progress && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="text-white text-center">
                  <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-lg font-semibold">{progress.progress}%</p>
                  <p className="text-sm">
                    {t('imageUploader.uploadProgress', {
                      transferred: Math.round(progress.bytesTransferred / 1024),
                      total: Math.round(progress.totalBytes / 1024)
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Upload Prompt
          <div className="p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">{t('imageUploader.dragOrClick')}</p>
            <p className="text-sm text-gray-500">
              {t('imageUploader.maxSize', { size: options.maxSizeKB || 5120 })}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={options.allowedTypes?.join(',') || 'image/*'}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('imageUploader.selectImage')}
            </button>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {selectedFile && !uploading && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {uploading ? (
            <>
              <Loader className="w-5 h-5 animate-spin mr-2" />
              Đang upload...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              {t('imageUploader.uploadImage')}
            </>
          )}
        </button>
      )}

      {/* Thumbnails Preview */}
      {showThumbnails && Object.keys(thumbnails).length > 0 && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center mb-2">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <h4 className="font-semibold text-green-800">{t('imageUploader.thumbnailsCreated')}</h4>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {thumbnails.small && (
              <div className="text-center">
                <img src={thumbnails.small} alt="Small" className="w-full h-20 object-cover rounded border" />
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <p className="text-xs text-gray-600 mt-1">200x200</p>
              </div>
            )}
            {thumbnails.medium && (
              <div className="text-center">
                <img src={thumbnails.medium} alt="Medium" className="w-full h-20 object-cover rounded border" />
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <p className="text-xs text-gray-600 mt-1">400x400</p>
              </div>
            )}
            {thumbnails.large && (
              <div className="text-center">
                <img src={thumbnails.large} alt="Large" className="w-full h-20 object-cover rounded border" />
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <p className="text-xs text-gray-600 mt-1">800x800</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Info */}
      {selectedFile && (
        <div className="mt-2 text-sm text-gray-600">
          <p>{t('imageUploader.fileName', { name: selectedFile.name })}</p>
          <p>{t('imageUploader.fileSize', { size: Math.round(selectedFile.size / 1024) })}</p>
          <p>{t('imageUploader.fileType', { type: selectedFile.type })}</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
