import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  title: string;
  onProgressUpdate: (progress: {
    pagesViewed: number[];
    pageViewTimes: Record<number, number>;
  }) => void;
  initialProgress?: {
    pagesViewed?: number[];
    pageViewTimes?: Record<number, number>;
  };
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  title,
  onProgressUpdate,
  initialProgress
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pagesViewed, setPagesViewed] = useState<Set<number>>(
    new Set(initialProgress?.pagesViewed || [])
  );
  const [pageViewTimes, setPageViewTimes] = useState<Record<number, number>>(
    initialProgress?.pageViewTimes || {}
  );
  const [pageStartTime] = useState<number>(Date.now());

  useEffect(() => {
    // Track page view time
    const interval = setInterval(() => {
      const newPageViewTimes = {
        ...pageViewTimes,
        [currentPage]: (pageViewTimes[currentPage] || 0) + 1
      };
      setPageViewTimes(newPageViewTimes);
      
      const newPagesViewed = new Set(pagesViewed).add(currentPage);
      setPagesViewed(newPagesViewed);
      
      onProgressUpdate({
        pagesViewed: Array.from(newPagesViewed),
        pageViewTimes: newPageViewTimes
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentPage, pageStartTime]);

  useEffect(() => {
    // Mark page as viewed
    const newPagesViewed = new Set(pagesViewed).add(currentPage);
    setPagesViewed(newPagesViewed);
  }, [currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.25, 0.5));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = title || 'document.pdf';
    link.click();
  };

  const progressPercent = totalPages > 0 ? Math.round((pagesViewed.size / totalPages) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-gray-100 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Navigation */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
            />
            <span className="text-gray-600">/ {totalPages || '?'}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom */}
          <button
            onClick={handleZoomOut}
            className="p-2 rounded hover:bg-gray-100"
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded hover:bg-gray-100"
            disabled={zoom >= 3}
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 rounded hover:bg-gray-100"
            title="Tải xuống"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-blue-50 px-4 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-700">
            📖 Đã xem: {pagesViewed.size}/{totalPages} trang ({progressPercent}%)
          </span>
          <span className="text-gray-600">
            ⏱️ Thời gian trang này: {pageViewTimes[currentPage] || 0}s
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s'
          }}
        >
          <iframe
            src={`${url}#page=${currentPage}&toolbar=0&navpanes=0`}
            className="w-full h-screen border border-gray-300 rounded shadow-lg"
            title={title}
            onLoad={() => {
              // Try to detect total pages (not always possible with iframe)
              // This is a simplified version
              if (!totalPages) {
                setTotalPages(10); // Default fallback
              }
            }}
          />
        </div>
      </div>

      {/* Page Thumbnails/Navigator */}
      <div className="bg-white border-t border-gray-200 p-2 overflow-x-auto">
        <div className="flex gap-2">
          {Array.from({ length: totalPages || 10 }, (_, i) => i + 1).map(pageNum => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`relative flex-shrink-0 w-12 h-16 border-2 rounded transition-all ${
                pageNum === currentPage
                  ? 'border-blue-500 bg-blue-50'
                  : pagesViewed.has(pageNum)
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-center h-full text-xs font-medium">
                {pageNum}
              </div>
              {pagesViewed.has(pageNum) && (
                <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
