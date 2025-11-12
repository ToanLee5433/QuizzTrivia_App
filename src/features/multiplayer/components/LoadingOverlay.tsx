import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message,
  fullScreen = false
}) => {
  const { t } = useTranslation();

  if (!isLoading) return null;

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
        {/* Spinning ring */}
        <div className="relative w-16 h-16 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-gray-700 font-semibold text-lg">
          {message || t('common.loading')}
        </p>
        <div className="flex items-center justify-center gap-1 mt-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-40">
      {content}
    </div>
  );
};

export default LoadingOverlay;
