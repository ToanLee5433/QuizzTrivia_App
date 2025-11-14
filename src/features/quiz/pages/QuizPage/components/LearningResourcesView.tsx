/**
 * LearningResourcesView - Component hiển thị tài liệu học tập trước khi làm quiz
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Video, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Link as LinkIcon,
  Play,
  CheckCircle,
  Clock,
  BookOpen
} from 'lucide-react';
import YouTubePlayer from '../../../../../shared/components/ui/YouTubePlayer';
import ImageViewer from '../../../../../shared/components/ui/ImageViewer';
import PDFViewer from '../../../../../shared/components/ui/PDFViewer';
import AudioPlayer from '../../../../../shared/components/ui/AudioPlayer';
import { Quiz } from '../../../types';

type LearningResource = NonNullable<Quiz['resources']>[number];

interface LearningResourcesViewProps {
  resources: LearningResource[];
  onComplete: () => void;
  onSkip?: () => void;
}

const LearningResourcesView: React.FC<LearningResourcesViewProps> = ({ 
  resources, 
  onComplete,
  onSkip 
}) => {
  const { t } = useTranslation();
  const [viewedResources, setViewedResources] = useState<Set<string>>(new Set());
  const [activeVideo, setActiveVideo] = useState<LearningResource | null>(null);
  const [activeImage, setActiveImage] = useState<LearningResource | null>(null);
  const [activePDF, setActivePDF] = useState<LearningResource | null>(null);
  const [activeAudio, setActiveAudio] = useState<LearningResource | null>(null);

  const requiredResources = resources.filter(r => r.required);
  const optionalResources = resources.filter(r => !r.required);

  const allRequiredViewed = requiredResources.every(r => viewedResources.has(r.id));
  const viewedRequiredCount = requiredResources.filter(r => viewedResources.has(r.id)).length;
  const remainingRequired = requiredResources.length - viewedRequiredCount;
  const totalEstimatedTime = resources.reduce((sum, r) => sum + (r.estimatedTime || 0), 0);
  const progressPercentage = resources.length > 0
    ? (viewedResources.size / resources.length) * 100
    : 0;

  const handleViewResource = (resourceId: string) => {
    setViewedResources(prev => new Set([...prev, resourceId]));
  };

  const isYouTubeUrl = (url: string): boolean => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const isImageUrl = (url: string): boolean => {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(url);
  };

  const isPDFUrl = (url: string): boolean => {
    return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf');
  };

  const isAudioUrl = (url: string): boolean => {
    return /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(url);
  };

  const handleOpenResource = (resource: LearningResource) => {
    handleViewResource(resource.id);

    // Kiểm tra loại file dựa trên URL và type
    if (isYouTubeUrl(resource.url)) {
      // YouTube video
      setActiveVideo(resource);
    } else if (resource.type === 'image' || isImageUrl(resource.url)) {
      // Image
      setActiveImage(resource);
    } else if (resource.type === 'pdf' || isPDFUrl(resource.url)) {
      // PDF
      setActivePDF(resource);
    } else if (isAudioUrl(resource.url)) {
      // Audio
      setActiveAudio(resource);
    } else {
      // Các loại khác (link thường), mở trong tab mới
      window.open(resource.url, '_blank');
    }
  };

  const getResourceIcon = (type: LearningResource['type']) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'link': return <LinkIcon className="w-5 h-5" />;
      case 'slides': return <FileText className="w-5 h-5" />;
      default: return <Music className="w-5 h-5" />;
    }
  };

  const defaultTypeLabels: Record<LearningResource['type'], string> = {
    video: 'Video',
    pdf: 'PDF',
    image: 'Ảnh/Slide',
    link: 'Link',
    slides: 'Slides'
  };

  const getTypeLabel = (type: LearningResource['type']) =>
    t(`quiz.learningResources.typeLabels.${type}`, {
      defaultValue: defaultTypeLabels[type] ?? type
    });

  const renderResource = (resource: LearningResource) => {
    const isViewed = viewedResources.has(resource.id);

    return (
      <div
        key={resource.id}
        className={`border-2 rounded-xl p-5 transition-all ${
          resource.required 
            ? isViewed 
              ? 'border-green-300 bg-green-50' 
              : 'border-red-300 bg-red-50'
            : isViewed
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`p-3 rounded-lg ${
            resource.type === 'video' ? 'bg-purple-100 text-purple-600' :
            resource.type === 'pdf' ? 'bg-red-100 text-red-600' :
            resource.type === 'image' ? 'bg-blue-100 text-blue-600' :
            'bg-green-100 text-green-600'
          }`}>
            {getResourceIcon(resource.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-1">
                  {resource.title}
                </h3>
                {resource.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    {resource.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    {getResourceIcon(resource.type)}
                    {getTypeLabel(resource.type)}
                  </span>
                  {resource.estimatedTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t('quiz.learningResources.estimatedTimeShort', {
                        minutes: resource.estimatedTime,
                        defaultValue: '{{minutes}} phút'
                      })}
                    </span>
                  )}
                  {resource.required ? (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                      {t('quiz.learningResources.badges.required', 'Bắt buộc')}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {t('quiz.learningResources.badges.recommended', 'Khuyến nghị')}
                    </span>
                  )}
                  {isViewed && (
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle className="w-4 h-4" />
                      {t('quiz.learningResources.badges.viewed', 'Đã xem')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {resource.whyWatch && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                <p className="text-sm text-yellow-800">
                  <span role="img" aria-hidden="true">💡</span>{' '}
                  <strong>{t('quiz.learningResources.whyWatchTitle', 'Vì sao nên xem')}:</strong>{' '}
                  {resource.whyWatch}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleOpenResource(resource)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isViewed
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isViewed ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {t('quiz.learningResources.actions.review', 'Xem lại')}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {t('quiz.learningResources.actions.view', 'Xem ngay')}
                  </>
                )}
              </button>

              {!isViewed && (
                <button
                  onClick={() => handleViewResource(resource.id)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('quiz.learningResources.actions.markViewed', 'Đánh dấu đã xem')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('quiz.learningResources.headerTitle', '📚 Tài liệu học tập')}
            </h1>
            <p className="text-gray-600">
              {t('quiz.learningResources.headerSubtitle', 'Xem qua tài liệu để chuẩn bị tốt hơn cho bài quiz')}
            </p>
          </div>

          {/* Progress */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-blue-900">
                {t('quiz.learningResources.progressTitle', 'Tiến độ học tập')}
              </span>
              <span className="text-sm text-blue-700">
                {t('quiz.learningResources.progressCount', {
                  viewed: viewedResources.size,
                  total: resources.length,
                  defaultValue: '{{viewed}}/{{total}} tài liệu'
                })}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            {totalEstimatedTime > 0 && (
              <p className="text-xs text-blue-600 mt-2">
                {t('quiz.learningResources.totalEstimatedTime', {
                  minutes: totalEstimatedTime,
                  defaultValue: '⏱️ Thời gian ước tính: {{minutes}} phút'
                })}
              </p>
            )}
          </div>

          {!allRequiredViewed && requiredResources.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                {t('quiz.learningResources.warningMessage', {
                  count: requiredResources.length,
                  defaultValue: '⚠️ Lưu ý: Bạn cần xem tất cả {{count}} tài liệu bắt buộc trước khi làm quiz'
                })}
              </p>
            </div>
          )}
        </div>

        {/* Required Resources */}
        {requiredResources.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-8 bg-red-500 rounded"></span>
              {t('quiz.learningResources.requiredSectionTitle', {
                count: requiredResources.length,
                defaultValue: 'Tài liệu bắt buộc ({{count}})'
              })}
            </h2>
            <div className="space-y-4">
              {requiredResources.map(renderResource)}
            </div>
          </div>
        )}

        {/* Optional Resources */}
        {optionalResources.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-8 bg-blue-500 rounded"></span>
              {t('quiz.learningResources.optionalSectionTitle', {
                count: optionalResources.length,
                defaultValue: 'Tài liệu khuyến nghị ({{count}})'
              })}
            </h2>
            <div className="space-y-4">
              {optionalResources.map(renderResource)}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between gap-4">
            {onSkip && (
              <button
                onClick={onSkip}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                {t('quiz.learningResources.actions.skip', 'Bỏ qua')}
              </button>
            )}

            <button
              onClick={onComplete}
              disabled={!allRequiredViewed}
              className={`flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all ${
                allRequiredViewed
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {allRequiredViewed ? (
                <>
                  <CheckCircle className="w-6 h-6" />
                  {t('quiz.learningResources.actions.startQuiz', 'Bắt đầu làm Quiz')}
                </>
              ) : (
                <>
                  <span className="w-6 h-6 border-2 border-gray-400 rounded-full" />
                  {t('quiz.learningResources.actions.completeRequired', 'Xem tài liệu bắt buộc để tiếp tục')}
                </>
              )}
            </button>
          </div>

          {!allRequiredViewed && (
            <p className="text-center text-sm text-gray-500 mt-3">
              {t('quiz.learningResources.remainingRequired', {
                count: remainingRequired,
                defaultValue: 'Còn {{count}} tài liệu bắt buộc chưa xem'
              })}
            </p>
          )}
        </div>
      </div>

      {/* YouTube Player Modal */}
      {activeVideo && (
        <YouTubePlayer
          videoUrl={activeVideo.url}
          title={activeVideo.title}
          onClose={() => setActiveVideo(null)}
          isFullscreen={true}
        />
      )}

      {/* Image Viewer Modal */}
      {activeImage && (
        <ImageViewer
          imageUrl={activeImage.url}
          title={activeImage.title}
          onClose={() => setActiveImage(null)}
        />
      )}

      {/* PDF Viewer Modal */}
      {activePDF && (
        <PDFViewer
          pdfUrl={activePDF.url}
          title={activePDF.title}
          onClose={() => setActivePDF(null)}
        />
      )}

      {/* Audio Player Modal */}
      {activeAudio && (
        <AudioPlayer
          audioUrl={activeAudio.url}
          title={activeAudio.title}
          onClose={() => setActiveAudio(null)}
        />
      )}
    </div>
  );
};

export default LearningResourcesView;
