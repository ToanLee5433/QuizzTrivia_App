/**
 * 🖼️ OfflineImage Component
 * ==========================
 * Component thông minh tự động fallback giữa:
 * 1. Network (nếu online)
 * 2. Cache API (nếu offline)
 * 3. Placeholder (nếu không tìm thấy)
 */

import React, { useState, useEffect, useRef } from 'react';
import { downloadManager } from '../../features/offline/DownloadManager';

// ============================================================================
// TYPES
// ============================================================================

interface OfflineImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string; // Custom fallback image
  showOfflineBadge?: boolean; // Show "Offline" badge when loaded from cache
  onLoadFromCache?: () => void; // Callback when loaded from cache
  onLoadFromNetwork?: () => void; // Callback when loaded from network
}

// ============================================================================
// PLACEHOLDER SVG
// ============================================================================

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%239ca3af"%3EImage%3C/text%3E%3C/svg%3E';

const ERROR_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23fef2f2"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%23dc2626"%3EImage not available%3C/text%3E%3C/svg%3E';

// ============================================================================
// COMPONENT
// ============================================================================

export const OfflineImage: React.FC<OfflineImageProps> = ({
  src,
  alt,
  fallbackSrc,
  showOfflineBadge = true,
  onLoadFromCache,
  onLoadFromNetwork,
  className = '',
  style = {},
  ...imgProps
}) => {
  const [imageSrc, setImageSrc] = useState<string>(PLACEHOLDER_IMAGE);
  const [isFromCache, setIsFromCache] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  // 🔧 FIX MEMORY LEAK: Track objectURL để revoke sau
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // 🧹 CLEANUP: Revoke objectURL khi component unmount
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
        console.log('[OfflineImage] 🧹 Revoked objectURL on unmount');
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadImage = async () => {
      // 🧹 Revoke old objectURL trước khi load ảnh mới
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      if (!src || src === PLACEHOLDER_IMAGE) {
        setImageSrc(PLACEHOLDER_IMAGE);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setHasError(false);

      try {
        // Try loading from network first
        if (navigator.onLine) {
          const response = await fetch(src, { method: 'HEAD' });

          if (response.ok && !cancelled && isMountedRef.current) {
            setImageSrc(src);
            setIsFromCache(false);
            setIsLoading(false);
            onLoadFromNetwork?.();
            return;
          }
        }

        // 🔥 Fallback to IndexedDB (Blob storage)
        const blob = await downloadManager.getCachedMediaBlob(src);

        if (blob && !cancelled && isMountedRef.current) {
          const objectUrl = URL.createObjectURL(blob);
          // 🔧 Track objectURL để revoke sau
          objectUrlRef.current = objectUrl;

          setImageSrc(objectUrl);
          setIsFromCache(true);
          setIsLoading(false);
          onLoadFromCache?.();
          console.log('[OfflineImage] Loaded from IndexedDB Blob:', src);
          return;
        }

        // Final fallback
        if (!cancelled && isMountedRef.current) {
          setImageSrc(fallbackSrc || ERROR_IMAGE);
          setHasError(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[OfflineImage] Failed to load image:', error);

        if (!cancelled && isMountedRef.current) {
          setImageSrc(fallbackSrc || ERROR_IMAGE);
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [src, fallbackSrc, onLoadFromCache, onLoadFromNetwork]);

  // Handle image load error
  const handleError = () => {
    if (imageSrc !== ERROR_IMAGE && imageSrc !== PLACEHOLDER_IMAGE) {
      setImageSrc(fallbackSrc || ERROR_IMAGE);
      setHasError(true);
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`} style={style}>
      <img
        {...imgProps}
        src={imageSrc}
        alt={alt}
        onError={handleError}
        className={`${isLoading ? 'animate-pulse' : ''}`}
        style={{
          opacity: isLoading ? 0.6 : 1,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Offline Badge */}
      {showOfflineBadge && isFromCache && !hasError && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
            />
          </svg>
          <span>Offline</span>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
          <svg
            className="animate-spin h-8 w-8 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HOOK FOR PROGRAMMATIC USE
// ============================================================================

interface UseOfflineImageResult {
  src: string;
  isLoading: boolean;
  isFromCache: boolean;
  hasError: boolean;
}

export function useOfflineImage(url: string): UseOfflineImageResult {
  const [result, setResult] = useState<UseOfflineImageResult>({
    src: PLACEHOLDER_IMAGE,
    isLoading: true,
    isFromCache: false,
    hasError: false,
  });

  useEffect(() => {
    let cancelled = false;

    const loadImage = async () => {
      if (!url) {
        setResult({
          src: PLACEHOLDER_IMAGE,
          isLoading: false,
          isFromCache: false,
          hasError: false,
        });
        return;
      }

      try {
        // Try network
        if (navigator.onLine) {
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok && !cancelled) {
            setResult({
              src: url,
              isLoading: false,
              isFromCache: false,
              hasError: false,
            });
            return;
          }
        }

        // 🔥 Try IndexedDB (Blob storage)
        const blob = await downloadManager.getCachedMediaBlob(url);

        if (blob && !cancelled) {
          const objectUrl = URL.createObjectURL(blob);

          setResult({
            src: objectUrl,
            isLoading: false,
            isFromCache: true,
            hasError: false,
          });

          return () => {
            URL.revokeObjectURL(objectUrl);
          };
        }

        // Error
        if (!cancelled) {
          setResult({
            src: ERROR_IMAGE,
            isLoading: false,
            isFromCache: false,
            hasError: true,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setResult({
            src: ERROR_IMAGE,
            isLoading: false,
            isFromCache: false,
            hasError: true,
          });
        }
      }
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return result;
}

export default OfflineImage;
