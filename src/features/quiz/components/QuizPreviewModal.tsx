import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Quiz } from '../types';
import SafeHTML from '../../../shared/components/ui/SafeHTML';
import { Video, FileText, Image as ImageIcon, Music, Link as LinkIcon, Presentation, Eye, ExternalLink, BookOpen } from 'lucide-react';
import ImageViewer from '../../../shared/components/ui/ImageViewer';
import PDFViewer from '../../../shared/components/ui/PDFViewer';
import AudioPlayer from '../../../shared/components/ui/AudioPlayer';

interface QuizPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Partial<Quiz>;
  onProceedToPublish: () => void;
}

export const QuizPreviewModal: React.FC<QuizPreviewModalProps> = ({
  isOpen,
  onClose,
  quiz,
  onProceedToPublish
}) => {
  const { t } = useTranslation();
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [resourceViewerType, setResourceViewerType] = useState<string | null>(null);

  if (!isOpen) return null;

  const questionCount = quiz.questions?.length || 0;
  const hasResources = (quiz as any).resources && (quiz as any).resources.length > 0;
  const resources = (quiz as any).resources || [];
  const estimatedTime = questionCount * 1.5; // 1.5 phút/câu

  // Helper functions for resources
  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      case 'link': return <LinkIcon className="w-5 h-5" />;
      case 'slides': return <Presentation className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getResourceBadgeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pdf': return 'bg-red-100 text-red-700 border-red-200';
      case 'image': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'audio': return 'bg-green-100 text-green-700 border-green-200';
      case 'link': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'slides': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleViewResource = (resource: any) => {
    setSelectedResource(resource);
    setResourceViewerType(resource.type);
  };

  const closeResourceViewer = () => {
    setSelectedResource(null);
    setResourceViewerType(null);
  };

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <h2 className="text-2xl font-bold flex items-center gap-2">
                👁️ {t('quiz.preview.title') || 'Preview Quiz'}
              </h2>
              <p className="text-indigo-100 mt-1">
                {t('quiz.preview.subtitle') || 'Review before publishing'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              {t('quiz.previewPage.closeButton')}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Quiz Header */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {quiz.title || t('quiz.untitled')}
            </h3>
            {quiz.description ? (
              <SafeHTML content={quiz.description} className="text-gray-600 leading-relaxed" />
            ) : (
              <p className="text-gray-600 leading-relaxed">{t('quiz.noDescription')}</p>
            )}
          </div>

          {/* Quiz Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 mb-1">{t('quiz.questions') || 'Questions'}</p>
              <p className="text-2xl font-bold text-blue-900">{questionCount}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 mb-1">{t('buildOverview.difficulty') || 'Difficulty'}</p>
              <p className="text-lg font-bold text-purple-900">
                {quiz.difficulty === 'easy' ? `🟢 ${t('quiz.difficulty.easy')}` :
                 quiz.difficulty === 'medium' ? `🟡 ${t('quiz.difficulty.medium')}` :
                 quiz.difficulty === 'hard' ? `🔴 ${t('quiz.difficulty.hard')}` : '❓'}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 mb-1">{t('quiz.timeLimit') || 'Time Limit'}</p>
              <p className="text-lg font-bold text-green-900">
                {(quiz as any).timeLimit ? `${(quiz as any).timeLimit} min` : '∞ Unlimited'}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-600 mb-1">{t('quiz.estimatedTime') || 'Est. Time'}</p>
              <p className="text-lg font-bold text-orange-900">~{estimatedTime} {t('quiz.previewPage.estimatedTimeUnit')}</p>
            </div>
          </div>

          {/* Quiz Settings */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <h4 className="font-semibold text-gray-900 mb-3">
              ⚙️ {t('quiz.settings') || 'Settings'}
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={(quiz as any).visibility === 'public' ? 'text-green-600' : 'text-orange-600'}>
                  {(quiz as any).visibility === 'public' ? '🌐 Public' : '🔒 Password Protected'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-700">
                  {quiz.category || t('quiz.noCategory')}
                </span>
              </div>
              {hasResources && (
                <div className="flex items-center gap-2 text-blue-600">
                  📚 {t('quiz.hasResources') || 'Has Learning Materials'}
                </div>
              )}
              {(quiz as any).showResults && (
                <div className="flex items-center gap-2 text-green-600">
                  ✅ {t('quiz.showResults') || 'Show Results'}
                </div>
              )}
            </div>
          </div>

          {/* Learning Resources Section */}
          {hasResources && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border-2 border-emerald-200">
              <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {t('quiz.learningResources', '📚 Tài liệu học tập')}
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full text-xs font-bold">
                  {resources.length} {t('common.files', 'tệp')}
                </span>
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resources.map((resource: any, idx: number) => (
                  <div
                    key={resource.id || idx}
                    className="bg-white rounded-lg p-3 border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg border ${getResourceBadgeColor(resource.type)}`}>
                        {getResourceIcon(resource.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 text-sm truncate">{resource.title}</h5>
                        <p className="text-xs text-gray-500 capitalize">{resource.type}</p>
                        {resource.required && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                            {t('common.required', 'Bắt buộc')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleViewResource(resource)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium"
                      >
                        <Eye className="w-3 h-3" />
                        {t('common.view', 'Xem')}
                      </button>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-2 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions Preview */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              📝 {t('quiz.questionsPreview') || 'Questions Preview'}
              <span className="text-sm font-normal text-gray-500">
                ({questionCount} {t('quiz.total') || 'total'})
              </span>
            </h4>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {quiz.questions && quiz.questions.length > 0 ? (
                quiz.questions.slice(0, 5).map((q: any, index: number) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium mb-2">{q.question}</p>
                        <div className="space-y-1">
                          {q.options.map((opt: string, optIndex: number) => (
                            <div
                              key={optIndex}
                              className={`text-sm px-3 py-1.5 rounded ${
                                optIndex === q.correctAnswer
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-gray-50 text-gray-600'
                              }`}
                            >
                              {opt}
                              {optIndex === q.correctAnswer && ' ✓'}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {t('quiz.noQuestions') || 'No questions added yet'}
                </div>
              )}

              {questionCount > 5 && (
                <p className="text-center text-sm text-gray-500 py-2">
                  ... {t('quiz.andMore', { count: questionCount - 5 }) || `and ${questionCount - 5} more questions`}
                </p>
              )}
            </div>
          </div>

          {/* Validation Warnings */}
          {questionCount < 3 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <p className="text-yellow-800 flex items-center gap-2">
                ⚠️ <span className="font-medium">
                  {t('quiz.validation.minQuestions') || 'Recommended: At least 3 questions for a good quiz'}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← {t('common.back') || 'Back to Edit'}
          </button>
          <button
            onClick={onProceedToPublish}
            disabled={questionCount === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {t('quiz.preview.proceedPublish') || 'Proceed to Publish'} →
          </button>
        </div>
      </div>
    </div>

      {/* Resource Viewers - Rendered outside modal for proper z-index */}
      {/* Universal Video Viewer - supports both YouTube and direct video */}
      {selectedResource && resourceViewerType === 'video' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4">
          <div className="relative w-full max-w-6xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex-1">
                {selectedResource.title && (
                  <h2 className="text-white text-xl font-semibold truncate">
                    {selectedResource.title}
                  </h2>
                )}
              </div>
              <button
                onClick={closeResourceViewer}
                className="p-2 text-white hover:bg-red-600 rounded-lg transition-colors"
                title={t('common.close')}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Video Player */}
            <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
              {(() => {
                const url = selectedResource.url;
                // Check if YouTube URL
                const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
                const youtubeMatch = url.match(youtubeRegex);
                
                if (youtubeMatch) {
                  const videoId = youtubeMatch[1];
                  return (
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                      title={selectedResource.title || "Video"}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      style={{ border: 'none' }}
                    />
                  );
                }
                
                // Check if Google Drive URL
                const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
                const driveMatch = url.match(driveRegex);
                
                if (driveMatch) {
                  const fileId = driveMatch[1];
                  return (
                    <iframe
                      src={`https://drive.google.com/file/d/${fileId}/preview`}
                      title={selectedResource.title || "Video"}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      style={{ border: 'none' }}
                    />
                  );
                }
                
                // Direct video file
                return (
                  <video
                    src={url}
                    controls
                    autoPlay
                    className="absolute inset-0 w-full h-full"
                  >
                    {t('common.videoNotSupported', 'Trình duyệt của bạn không hỗ trợ video')}
                  </video>
                );
              })()}
            </div>

            {/* Instructions */}
            <div className="mt-4 text-center">
              <p className="text-white text-sm opacity-75">
                💡 Nhấn <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded">ESC</kbd> hoặc click bên ngoài để đóng
              </p>
            </div>
          </div>
        </div>
      )}
      {selectedResource && resourceViewerType === 'pdf' && (
        <PDFViewer
          pdfUrl={selectedResource.url}
          title={selectedResource.title}
          onClose={closeResourceViewer}
        />
      )}
      {selectedResource && resourceViewerType === 'image' && (
        <ImageViewer
          imageUrl={selectedResource.url}
          title={selectedResource.title}
          onClose={closeResourceViewer}
        />
      )}
      {selectedResource && resourceViewerType === 'audio' && (
        <AudioPlayer
          audioUrl={selectedResource.url}
          title={selectedResource.title}
          onClose={closeResourceViewer}
        />
      )}
      {selectedResource && (resourceViewerType === 'link' || resourceViewerType === 'slides') && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-6xl h-[90vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <LinkIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{selectedResource.title}</h3>
                  {selectedResource.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{selectedResource.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(selectedResource.url, '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <LinkIcon className="w-4 h-4" />
                  {t('common.openInNewTab', 'Mở tab mới')}
                </button>
                <button
                  onClick={closeResourceViewer}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title={t('common.close')}
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Smart Iframe Content - Auto-detect URL type */}
            <div className="flex-1 bg-gray-100 dark:bg-slate-800">
              {(() => {
                const url = selectedResource.url;
                
                // YouTube URL - convert to embed
                const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
                const youtubeMatch = url.match(youtubeRegex);
                if (youtubeMatch) {
                  const videoId = youtubeMatch[1];
                  return (
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                      className="w-full h-full border-0"
                      title={selectedResource.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  );
                }
                
                // Google Drive - convert to preview
                const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
                const driveMatch = url.match(driveRegex);
                if (driveMatch) {
                  const fileId = driveMatch[1];
                  return (
                    <iframe
                      src={`https://drive.google.com/file/d/${fileId}/preview`}
                      className="w-full h-full border-0"
                      title={selectedResource.title}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  );
                }
                
                // Google Slides/Docs/Sheets - convert to embed
                const googleDocsRegex = /docs\.google\.com\/(presentation|document|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/;
                const googleDocsMatch = url.match(googleDocsRegex);
                if (googleDocsMatch) {
                  const type = googleDocsMatch[1];
                  const docId = googleDocsMatch[2];
                  let embedUrl = '';
                  if (type === 'presentation') {
                    embedUrl = `https://docs.google.com/presentation/d/${docId}/embed?start=false&loop=false&delayms=3000`;
                  } else if (type === 'document') {
                    embedUrl = `https://docs.google.com/document/d/${docId}/preview`;
                  } else if (type === 'spreadsheets') {
                    embedUrl = `https://docs.google.com/spreadsheets/d/${docId}/preview`;
                  }
                  return (
                    <iframe
                      src={embedUrl}
                      className="w-full h-full border-0"
                      title={selectedResource.title}
                      allowFullScreen
                    />
                  );
                }
                
                // Vimeo - convert to embed
                const vimeoRegex = /vimeo\.com\/(\d+)/;
                const vimeoMatch = url.match(vimeoRegex);
                if (vimeoMatch) {
                  const videoId = vimeoMatch[1];
                  return (
                    <iframe
                      src={`https://player.vimeo.com/video/${videoId}`}
                      className="w-full h-full border-0"
                      title={selectedResource.title}
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }
                
                // Default - try regular iframe
                return (
                  <iframe
                    src={url}
                    className="w-full h-full border-0"
                    title={selectedResource.title}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
