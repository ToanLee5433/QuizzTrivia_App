import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Grid } from 'lucide-react';

interface ImageSlidesViewerProps {
  urls: string[]; // Array of image URLs
  title: string;
  onProgressUpdate: (progress: {
    imagesViewed: number[];
    imageViewTimes: Record<number, number>;
  }) => void;
  initialProgress?: {
    imagesViewed?: number[];
    imageViewTimes?: Record<number, number>;
  };
}

export const ImageSlidesViewer: React.FC<ImageSlidesViewerProps> = ({
  urls,
  title,
  onProgressUpdate,
  initialProgress
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imagesViewed, setImagesViewed] = useState<Set<number>>(
    new Set(initialProgress?.imagesViewed || [])
  );
  const [imageViewTimes, setImageViewTimes] = useState<Record<number, number>>(
    initialProgress?.imageViewTimes || {}
  );
  const [imageStartTime, setImageStartTime] = useState<number>(Date.now());
  const [showGrid, setShowGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Track image view time
    const interval = setInterval(() => {
      const newImageViewTimes = {
        ...imageViewTimes,
        [currentIndex]: (imageViewTimes[currentIndex] || 0) + 1
      };
      setImageViewTimes(newImageViewTimes);
      
      const newImagesViewed = new Set(imagesViewed).add(currentIndex);
      setImagesViewed(newImagesViewed);
      
      onProgressUpdate({
        imagesViewed: Array.from(newImagesViewed),
        imageViewTimes: newImageViewTimes
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, imageStartTime, imageViewTimes, imagesViewed, onProgressUpdate]);

  useEffect(() => {
    // Reset timer when image changes
    setImageStartTime(Date.now());
    
    // Mark image as viewed
    const newImagesViewed = new Set(imagesViewed).add(currentIndex);
    setImagesViewed(newImagesViewed);
  }, [currentIndex, imagesViewed]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(urls.length - 1, prev + 1));
  }, [urls.length]);

  const handleImageClick = (index: number) => {
    setCurrentIndex(index);
    setShowGrid(false);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') setIsFullscreen(false);
  }, [handlePrevious, handleNext]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const progressPercent = urls.length > 0 ? Math.round((imagesViewed.size / urls.length) * 100) : 0;

  return (
    <div className={`flex flex-col bg-gray-900 rounded-lg overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-50' : 'h-full'
    }`}>
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-gray-400">
            Slide {currentIndex + 1} / {urls.length}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="p-2 rounded hover:bg-gray-700 transition-colors"
            title={showGrid ? 'Xem slide' : 'Xem tổng quan'}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded hover:bg-gray-700 transition-colors"
            title="Toàn màn hình"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm text-white mb-1">
          <span>
            📊 Đã xem: {imagesViewed.size}/{urls.length} slides ({progressPercent}%)
          </span>
          <span className="text-gray-400">
            ⏱️ Thời gian slide này: {imageViewTimes[currentIndex] || 0}s
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      {showGrid ? (
        // Grid View
        <div className="flex-1 overflow-auto p-4 bg-gray-900">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {urls.map((url, index) => (
              <button
                key={index}
                onClick={() => handleImageClick(index)}
                className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-blue-500 ring-2 ring-blue-500'
                    : imagesViewed.has(index)
                    ? 'border-green-500'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <img
                  src={url}
                  alt={`Slide ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold">
                  {index + 1}
                </div>
                {imagesViewed.has(index) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Slide View
        <div className="flex-1 flex items-center justify-center bg-black relative">
          {/* Navigation Arrows */}
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="absolute left-4 z-10 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === urls.length - 1}
            className="absolute right-4 z-10 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Current Image */}
          <img
            src={urls[currentIndex]}
            alt={`Slide ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />

          {/* Slide Number Overlay */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
            {currentIndex + 1} / {urls.length}
          </div>
        </div>
      )}

      {/* Thumbnail Strip */}
      {!showGrid && (
        <div className="bg-gray-800 p-2 overflow-x-auto">
          <div className="flex gap-2">
            {urls.map((url, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`relative flex-shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-blue-500 ring-2 ring-blue-500'
                    : imagesViewed.has(index)
                    ? 'border-green-500'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <img
                  src={url}
                  alt={`Slide ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {imagesViewed.has(index) && (
                  <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
