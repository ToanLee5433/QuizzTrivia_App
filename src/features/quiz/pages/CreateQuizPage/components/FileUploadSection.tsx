import React, { useCallback, useState, useRef } from 'react';
import { Upload, X, FileText, FileImage, File } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FileUploadSectionProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ACCEPTED_TYPES = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
};

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  onFileSelect,
  selectedFile,
}) => {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return t('fileUpload.errors.tooLarge', { max: '10MB' });
    }

    // Check file type
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const isValidType = Object.values(ACCEPTED_TYPES).some(exts =>
      exts.includes(extension)
    );

    if (!isValidType) {
      return t('fileUpload.errors.invalidType');
    }

    return null;
  }, [t]);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        onFileSelect(null);
        return;
      }

      setError('');
      onFileSelect(file);
    },
    [onFileSelect, validateFile]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const removeFile = () => {
    setError('');
    onFileSelect(null);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
      return <FileImage className="w-8 h-8 text-blue-500" aria-hidden="true" />;
    }
    if (ext === 'pdf') {
      return <FileText className="w-8 h-8 text-red-500" aria-hidden="true" />;
    }
    return <File className="w-8 h-8 text-gray-500" aria-hidden="true" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleChange}
            accept={Object.keys(ACCEPTED_TYPES).join(',')}
          />
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-12 h-12 text-gray-400" aria-hidden="true" />
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('fileUpload.dragDrop')}
              </p>
              <p className="text-xs text-gray-500">
                {t('fileUpload.supportedFormats')}
              </p>
              <p className="text-xs text-gray-400">
                {t('fileUpload.maxSize', { size: '10MB' })}
              </p>
            </div>
            <button
              type="button"
              onClick={handleButtonClick}
              className="px-4 py-2 text-sm font-medium border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('fileUpload.selectFile')}
            </button>
          </div>
        </div>
      ) : (
        <div className="border rounded-xl p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            {getFileIcon(selectedFile.name)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="px-3 py-1.5 text-sm font-medium border-2 border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              aria-label={t('fileUpload.removeFile')}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};
