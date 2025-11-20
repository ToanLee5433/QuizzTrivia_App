/**
 * 📸🎵🎬 Media Uploader Component
 * Upload images, audio, and video files for quiz questions
 */

import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Music, Video } from 'lucide-react';
import { storageService } from '../../../services/firebase/storageService';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

interface MediaUploaderProps {
  type: 'image' | 'audio' | 'video';
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
  maxSizeMB?: number;
  label?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  type,
  currentUrl,
  onUploadComplete,
  onRemove,
  maxSizeMB = type === 'video' ? 100 : 10,
  label,
}) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptTypes = {
    image: 'image/*',
    audio: 'audio/*',
    video: 'video/*',
  };

  const Icon = {
    image: ImageIcon,
    audio: Music,
    video: Video,
  }[type];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(t('mediaUploader.fileTooLarge', { max: maxSizeMB, size: fileSizeMB.toFixed(1) }));
      return;
    }

    // Create instant preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setUploading(true);
    setProgress(0);

    try {
      // Generate unique path
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const path = `questions/${type}s/${timestamp}.${ext}`;

      // Upload with progress
      const result = await storageService.uploadFile(file, path, {
        onProgress: (p) => setProgress(Math.round(p)),
        compress: type === 'image',
        quality: 0.85,
      });

      onUploadComplete(result.url);
      toast.success(t('mediaUploader.uploadSuccess'));
    } catch (error: any) {
      console.error('[MediaUploader] Upload error:', error);
      toast.error(t('mediaUploader.uploadError'));
      setPreviewUrl(currentUrl || null);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onRemove?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes[type]}
        onChange={handleFileSelect}
        className="hidden"
      />

      {!previewUrl ? (
        // Upload button
        <button
          type="button"
          onClick={handleClick}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('mediaUploader.uploading')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {progress}%
                </p>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <Icon className="w-10 h-10 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t(`mediaUploader.clickToUpload.${type}`)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('mediaUploader.maxSize', { size: maxSizeMB })}
                </p>
              </div>
            </>
          )}
        </button>
      ) : (
        // Preview with remove button
        <div className="relative group">
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {type === 'image' && (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-48 object-cover"
              />
            )}
            {type === 'audio' && (
              <div className="p-4 bg-white dark:bg-gray-800">
                <audio controls className="w-full">
                  <source src={previewUrl} />
                  {t('mediaUploader.audioNotSupported')}
                </audio>
              </div>
            )}
            {type === 'video' && (
              <video controls className="w-full max-h-64">
                <source src={previewUrl} />
                {t('mediaUploader.videoNotSupported')}
              </video>
            )}
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
            title={t('mediaUploader.remove')}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Change button */}
          <button
            type="button"
            onClick={handleClick}
            disabled={uploading}
            className="absolute bottom-2 right-2 px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-700 shadow-lg text-sm font-medium border border-gray-200 dark:border-gray-600"
          >
            <Upload className="w-4 h-4 inline mr-1" />
            {t('mediaUploader.change')}
          </button>
        </div>
      )}

      {/* URL input fallback */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('mediaUploader.orUseUrl')}
        </span>
        <input
          type="url"
          placeholder={t(`mediaUploader.urlPlaceholder.${type}`)}
          value={!uploading && !previewUrl && currentUrl ? currentUrl : ''}
          onChange={(e) => {
            const url = e.target.value.trim();
            if (url) {
              setPreviewUrl(url);
              onUploadComplete(url);
            }
          }}
          className="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        />
      </div>
    </div>
  );
};
