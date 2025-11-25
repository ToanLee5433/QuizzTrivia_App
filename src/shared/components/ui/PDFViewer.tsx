/**
 * PDFViewer - Component xem PDF fullscreen với navigation
 */

import React, { useEffect } from 'react';
import { X, Download, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

interface PDFViewerProps {
  pdfUrl: string;
  title?: string;
  onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl, title, onClose }) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Skip when user is editing text
        const activeElement = document.activeElement;
        const isEditingText = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true' ||
          activeElement.classList.contains('ql-editor') ||
          activeElement.closest('.ql-container') !== null
        );
        
        if (isEditingText) return;
        onClose();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [onClose]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = title || 'document.pdf';
    link.target = '_blank';
    link.click();
  };

  const handleOpenNewTab = () => {
    window.open(pdfUrl, '_blank');
  };

  const toggleFullscreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black bg-opacity-50">
        <div className="flex-1">
          {title && (
            <h2 className="text-white text-xl font-semibold truncate">
              📄 {title}
            </h2>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Open in New Tab */}
          <button
            onClick={handleOpenNewTab}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            title="Mở trong tab mới"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm">Mở tab mới</span>
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Tải xuống"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-red-600 rounded-lg transition-colors"
            title="Đóng (ESC)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div className="flex-1 bg-gray-900">
        <iframe
          src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          title={title || "PDF Document"}
          className="w-full h-full"
          style={{ border: 'none' }}
        />
      </div>

      {/* Footer */}
      <div className="p-4 text-center bg-black bg-opacity-50">
        <p className="text-white text-sm opacity-75">
          💡 Nhấn <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded">ESC</kbd> hoặc click bên ngoài để đóng
          • Sử dụng toolbar PDF để zoom, tìm kiếm, in ấn
        </p>
      </div>
    </div>
  );
};

export default PDFViewer;
