import React, { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle, Clock } from 'lucide-react';

interface LinkViewerProps {
  url: string;
  title: string;
  description?: string;
  estimatedTime?: number;
  onProgressUpdate: (progress: {
    confirmed: boolean;
    timeSpent: number;
  }) => void;
  initialProgress?: {
    confirmed?: boolean;
    timeSpent?: number;
  };
}

export const LinkViewer: React.FC<LinkViewerProps> = ({
  url,
  title,
  description,
  estimatedTime,
  onProgressUpdate,
  initialProgress
}) => {
  const [confirmed, setConfirmed] = useState(initialProgress?.confirmed || false);
  const [timeSpent, setTimeSpent] = useState(initialProgress?.timeSpent || 0);
  const [isIframeSupported, setIsIframeSupported] = useState(true);

  useEffect(() => {
    // Track time spent
    const interval = setInterval(() => {
      const newTimeSpent = timeSpent + 1;
      setTimeSpent(newTimeSpent);
      
      onProgressUpdate({
        confirmed,
        timeSpent: newTimeSpent
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeSpent, confirmed]);

  const handleConfirm = () => {
    setConfirmed(true);
    onProgressUpdate({
      confirmed: true,
      timeSpent
    });
  };

  const handleOpenExternal = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        {description && (
          <p className="text-gray-600 mb-4">{description}</p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-gray-700">
          {estimatedTime && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Thời gian đọc: ~{estimatedTime} phút</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Đã xem: {formatTime(timeSpent)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {isIframeSupported ? (
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={title}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            onError={() => setIsIframeSupported(false)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <ExternalLink className="w-16 h-16 text-gray-400 mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Không thể xem trực tiếp
            </h4>
            <p className="text-gray-600 mb-6 max-w-md">
              Trang web này không hỗ trợ xem nhúng. Vui lòng nhấn nút bên dưới để mở trong tab mới.
            </p>
            <button
              onClick={handleOpenExternal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Mở trong tab mới
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        {!confirmed ? (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-700 mb-1">
                📖 Đã đọc xong tài liệu này?
              </p>
              <p className="text-xs text-gray-500">
                Xác nhận để tiếp tục (hoặc mở trong tab mới để đọc)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenExternal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Mở tab mới
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                ✓ Đã đọc xong
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-green-600 py-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Đã xác nhận hoàn thành</span>
          </div>
        )}
      </div>
    </div>
  );
};
