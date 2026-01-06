/**
 * 📸🎵🎬 Media Uploader Component
 * Upload images, audio, and video files for quiz questions
 * Supports video/audio trimming
 */

import { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Music, Video, Scissors, Edit2 } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { storageService } from '../../../services/firebase/storageService';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { VideoPlayer } from '../../../shared/components/ui/VideoPlayer';
import { MediaTrimmerModal } from './MediaTrimmer';
import { MediaTrimSettings } from '../types';
import { getTrimDisplayString, canTrimMedia } from '../../../utils/mediaTrimUtils';

interface MediaUploaderProps {
  type: 'image' | 'audio' | 'video';
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
  maxSizeMB?: number;
  label?: string;
  /** Current trim settings */
  trimSettings?: MediaTrimSettings;
  /** Called when trim settings change */
  onTrimChange?: (trim: MediaTrimSettings | undefined) => void;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  type,
  currentUrl,
  onUploadComplete,
  onRemove,
  maxSizeMB = type === 'video' ? 100 : 10,
  label,
  trimSettings,
  onTrimChange,
}) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [showTrimModal, setShowTrimModal] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔧 Sync previewUrl when currentUrl changes from parent
  useEffect(() => {
    if (currentUrl && currentUrl.length > 0) {
      setPreviewUrl(currentUrl);
    }
  }, [currentUrl]);

  // 🚀 Debounced URL submit - only trigger after 500ms of no typing
  const debouncedUrlSubmit = useDebouncedCallback(
    (url: string) => {
      if (url && isValidUrl(url)) {
        setPreviewUrl(url);
        onUploadComplete(url);
      }
    },
    500
  );

  // Simple URL validation
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Check if current media can be trimmed
  const canTrim = (type === 'video' || type === 'audio') && previewUrl && canTrimMedia(previewUrl);
  const trimDisplayString = getTrimDisplayString(trimSettings);

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

    // Clear previous trim settings when uploading new file
    onTrimChange?.(undefined);

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
    onTrimChange?.(undefined); // Clear trim settings
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleTrimSave = (newTrim: MediaTrimSettings) => {
    onTrimChange?.(newTrim);
    setShowTrimModal(false);
    if (newTrim.isTrimmed) {
      toast.success(t('mediaTrimmer.trimSaved', 'Đã lưu cài đặt cắt'));
    }
  };

  const handleClearTrim = () => {
    onTrimChange?.(undefined);
    toast.info(t('mediaTrimmer.trimCleared', 'Đã xóa cài đặt cắt'));
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
              <VideoPlayer 
                url={previewUrl} 
                className="w-full" 
                style={{ maxHeight: '256px' }}
              />
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

          {/* Trim button - only for video/audio */}
          {canTrim && (
            <button
              type="button"
              onClick={() => setShowTrimModal(true)}
              className="absolute bottom-2 left-2 px-3 py-1 bg-blue-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 shadow-lg text-sm font-medium flex items-center gap-1"
              title={t('mediaTrimmer.trim', 'Cắt')}
            >
              <Scissors className="w-4 h-4" />
              {trimSettings?.isTrimmed 
                ? t('mediaTrimmer.editTrim', 'Chỉnh sửa') 
                : t('mediaTrimmer.trim', 'Cắt')
              }
            </button>
          )}
        </div>
      )}

      {/* Trim info display */}
      {trimDisplayString && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {t('mediaTrimmer.trimmed', 'Đã cắt')}: <strong>{trimDisplayString}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTrimModal(true)}
              className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
              title={t('mediaTrimmer.editTrim', 'Chỉnh sửa')}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleClearTrim}
              className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
              title={t('mediaTrimmer.clearTrim', 'Xóa cắt')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* URL input fallback - with debounce for performance */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('mediaUploader.orUseUrl')}
        </span>
        <input
          type="url"
          placeholder={t(`mediaUploader.urlPlaceholder.${type}`)}
          value={urlInputValue}
          onChange={(e) => {
            const url = e.target.value;
            setUrlInputValue(url);
            // Debounce the actual submission
            debouncedUrlSubmit(url.trim());
          }}
          onBlur={(e) => {
            // Also submit on blur for immediate feedback when user tabs away
            const url = e.target.value.trim();
            if (url && isValidUrl(url)) {
              debouncedUrlSubmit.cancel();
              setPreviewUrl(url);
              onUploadComplete(url);
            }
          }}
          onKeyDown={(e) => {
            // Submit immediately on Enter
            if (e.key === 'Enter') {
              const url = urlInputValue.trim();
              if (url && isValidUrl(url)) {
                debouncedUrlSubmit.cancel();
                setPreviewUrl(url);
                onUploadComplete(url);
              }
            }
          }}
          className="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        />
      </div>

      {/* Trim Modal */}
      {canTrim && previewUrl && (
        <MediaTrimmerModal
          mediaUrl={previewUrl}
          initialTrim={trimSettings}
          onSave={handleTrimSave}
          onClose={() => setShowTrimModal(false)}
          isOpen={showTrimModal}
        />
      )}
    </div>
  );
};
