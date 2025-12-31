import React, { useState } from 'react';
import { Question } from '../../quiz/types';
import RichTextViewer from '../../../shared/components/ui/RichTextViewer';
import { useTranslation } from 'react-i18next';
import SafeHTML from '../../../shared/components/ui/SafeHTML';
import { Clock, Lock, Globe, Tag, Calendar, User, BookOpen, Award, FileText, BarChart2, Star, TrendingUp, Percent, Key, Video, Image as ImageIcon, Music, Link as LinkIcon, Presentation, ExternalLink, Eye } from 'lucide-react';
import ImageViewer from '../../../shared/components/ui/ImageViewer';
import PDFViewer from '../../../shared/components/ui/PDFViewer';
import AudioPlayer from '../../../shared/components/ui/AudioPlayer';

// Helper to detect and convert YouTube URLs to embed format
const getVideoEmbedUrl = (url: string): { type: 'youtube' | 'direct'; embedUrl: string } => {
  if (!url) return { type: 'direct', embedUrl: '' };
  
  // YouTube patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(youtubeRegex);
  
  if (match && match[1]) {
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${match[1]}` };
  }
  
  return { type: 'direct', embedUrl: url };
};

// VideoPlayer component that handles both YouTube and direct video URLs
const VideoPlayer: React.FC<{ url: string; className?: string }> = ({ url, className = '' }) => {
  const videoInfo = getVideoEmbedUrl(url);
  
  if (videoInfo.type === 'youtube') {
    return (
      <iframe
        src={videoInfo.embedUrl}
        className={`rounded-lg ${className}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    );
  }
  
  return (
    <video controls className={`rounded-lg ${className}`}>
      <source src={url} />
      Your browser does not support video playback.
    </video>
  );
};

// Admin-specific Quiz type that has optional fields
interface AdminQuiz {
  id: string;
  title: string;
  description?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  questions: any[];
  duration?: number;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  tags?: string[];
  status?: 'pending' | 'approved' | 'rejected';
  authorName?: string;
  displayName?: string;
  creatorName?: string;
  password?: string;
  havePassword?: string;
  visibility?: string;
  resources?: any[];
  learningResources?: any[];
  averageScore?: number;
  avgScore?: number;
  rating?: number;
  averageRating?: number;
  ratingCount?: number;
  ratingsCount?: number;
}

interface QuizPreviewProps {
  quiz: AdminQuiz | null;
  isOpen: boolean;
  onClose: () => void;
}

// Modal component với khả năng cuộn tốt hơn
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {children}
      </div>
    </div>
  );
};

const QuizPreview: React.FC<QuizPreviewProps> = ({ quiz, isOpen, onClose }) => {
  const { t } = useTranslation();
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [resourceViewerType, setResourceViewerType] = useState<string | null>(null);
  
  // Guard clause to prevent null quiz errors
  if (!quiz) {
    return null;
  }

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

  // Helper to format date
  const formatDate = (date: any) => {
    if (!date) return t('common.unknown');
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('vi-VN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if quiz has password protection
  const hasPassword = quiz.havePassword === 'password' || quiz.visibility === 'password';
  
  // Get resources - check both fields
  const quizResources = quiz.resources || quiz.learningResources || [];
  
  // Get quiz type
  const quizType = (quiz as any).quizType || (quizResources.length > 0 ? 'with-materials' : 'standard');
  
  // Get resources count
  const resourcesCount = quizResources.length;
  
  // Calculate average score if available
  const avgScore = (quiz as any).averageScore || (quiz as any).avgScore || null;
  
  // Get rating info
  const rating = (quiz as any).rating || (quiz as any).averageRating || null;
  const ratingCount = (quiz as any).ratingCount || (quiz as any).ratingsCount || 0;

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Header - Sticky */}
      <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 z-10 p-4 sm:p-6 border-b border-gray-200 rounded-t-lg">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-2 sm:pr-4 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h2 className="text-lg sm:text-2xl font-bold text-white break-words">{quiz.title}</h2>
              {hasPassword && (
                <span className="px-2 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {t('quiz.myQuizzes.badge.password')}
                </span>
              )}
              {quizType === 'with-materials' && (
                <span className="px-2 py-1 bg-blue-400 text-blue-900 rounded-full text-xs font-bold flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {t('quiz.hasResources')}
                </span>
              )}
            </div>
            <RichTextViewer content={quiz.description || ''} className="text-indigo-100 mt-2" />
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 transition-colors flex-shrink-0 p-2 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quiz Meta Info */}
      <div className="bg-white p-3 sm:p-4 border-b border-gray-200">
        {/* Row 1: Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="font-medium">{t('admin.preview.createdBy')}:</span>
            <span className="text-gray-900 truncate">{(quiz as any).authorName || (quiz as any).displayName || (quiz as any).creatorName || t('common.unknown')}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="font-medium">{t('admin.preview.createdAt')}:</span>
            <span className="text-gray-900">{formatDate(quiz.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Tag className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="font-medium">{t('quiz.category')}:</span>
            <span className="text-gray-900 truncate">{quiz.category || t('common.unknown')}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            {hasPassword ? (
              <Lock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            ) : (
              <Globe className="w-4 h-4 text-green-500 flex-shrink-0" />
            )}
            <span className="font-medium">{t('admin.preview.visibility')}:</span>
            <span className="text-gray-900">
              {hasPassword ? t('quiz.visibility.password') : t('quiz.visibility.public')}
            </span>
          </div>
        </div>
        
        {/* Row 2: Additional info - without Quiz ID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm mt-3 pt-3 border-t border-gray-100">
          {hasPassword && quiz.password && (
            <div className="flex items-center gap-2 text-gray-600">
              <Key className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <span className="font-medium">{t('admin.preview.password', 'Mật khẩu')}:</span>
              <span className="text-gray-900 font-mono bg-yellow-50 px-2 py-0.5 rounded text-xs">{quiz.password}</span>
            </div>
          )}
          {resourcesCount > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="font-medium">{t('admin.preview.learningMaterials', 'Tài liệu')}:</span>
              <span className="text-gray-900">{resourcesCount} {t('admin.preview.files', 'tệp')}</span>
            </div>
          )}
          {avgScore !== null && (
            <div className="flex items-center gap-2 text-gray-600">
              <Percent className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="font-medium">{t('admin.preview.avgScore', 'Điểm TB')}:</span>
              <span className="text-gray-900 font-semibold">{avgScore.toFixed(1)}%</span>
            </div>
          )}
          {rating !== null && (
            <div className="flex items-center gap-2 text-gray-600">
              <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <span className="font-medium">{t('admin.preview.rating', 'Đánh giá')}:</span>
              <span className="text-gray-900">
                {rating.toFixed(1)}/5 ({ratingCount} {t('admin.preview.reviews', 'đánh giá')})
              </span>
            </div>
          )}
          {(quiz as any).updatedAt && (
            <div className="flex items-center gap-2 text-gray-600">
              <TrendingUp className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="font-medium">{t('admin.preview.updatedAt', 'Cập nhật')}:</span>
              <span className="text-gray-900">{formatDate((quiz as any).updatedAt)}</span>
            </div>
          )}
        </div>
        
        {/* Tags */}
        {quiz.tags && quiz.tags.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">{t('quiz.tags')}:</span>
            {quiz.tags.map((tag: string, index: number) => (
              <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quiz Stats - Sticky */}
      <div className="sticky top-[100px] sm:top-[120px] bg-gray-50 p-3 sm:p-6 border-b border-gray-200 z-10">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
          <div className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200 text-center">
            <FileText className="w-4 sm:w-5 h-4 sm:h-5 text-blue-500 mx-auto mb-1" />
            <div className="text-lg sm:text-2xl font-bold text-blue-600">{quiz.questions?.length || 0}</div>
            <div className="text-[10px] sm:text-xs text-gray-600">{t('quiz.questions', 'Câu hỏi')}</div>
          </div>
          <div className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200 text-center">
            <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-green-500 mx-auto mb-1" />
            <div className="text-lg sm:text-2xl font-bold text-green-600">{quiz.duration || '∞'}</div>
            <div className="text-[10px] sm:text-xs text-gray-600">{t('minutes', 'phút')}</div>
          </div>
          <div className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200 text-center">
            <Award className="w-4 sm:w-5 h-4 sm:h-5 text-purple-500 mx-auto mb-1" />
            <div className="text-sm sm:text-lg font-bold text-purple-600">
              {quiz.difficulty === 'easy' ? `🟢 ${t('quiz.difficulty.easy')}` :
               quiz.difficulty === 'medium' ? `🟡 ${t('quiz.difficulty.medium')}` :
               quiz.difficulty === 'hard' ? `🔴 ${t('quiz.difficulty.hard')}` : '❓'}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-600">{t('common.difficulty')}</div>
          </div>
          <div className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200 text-center">
            <BarChart2 className="w-4 sm:w-5 h-4 sm:h-5 text-orange-500 mx-auto mb-1" />
            <div className={`text-sm sm:text-lg font-bold ${
              quiz.status === 'approved' ? 'text-green-600' : 
              quiz.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {quiz.status === 'approved' ? `✅ ${t('status.approved', 'Đã duyệt')}` : 
               quiz.status === 'rejected' ? `❌ ${t('status.rejected', 'Từ chối')}` : `⏳ ${t('status.pending', 'Chờ duyệt')}`}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-600">{t('status.label', 'Trạng thái')}</div>
          </div>
          <div className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200 text-center col-span-3 sm:col-span-1">
            <Award className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-500 mx-auto mb-1" />
            <div className="text-lg sm:text-2xl font-bold text-indigo-600">
              {quiz.questions?.reduce((sum: number, q: Question) => sum + (q.points || 1), 0) || 0}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-600">{t('common.totalPoints', 'Tổng điểm')}</div>
          </div>
        </div>
      </div>

      {/* Learning Resources Section */}
      {quizResources && quizResources.length > 0 && (
        <div className="p-3 sm:p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-200">
          <h3 className="text-base sm:text-lg font-semibold mb-4 text-emerald-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('admin.preview.learningResources', '📚 Tài liệu học tập')}
            <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full text-xs font-bold">
              {quizResources.length} {t('admin.preview.files', 'tệp')}
            </span>
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quizResources.map((resource: any, idx: number) => (
              <div
                key={resource.id || idx}
                className="bg-white rounded-xl p-4 border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl border-2 ${getResourceBadgeColor(resource.type)}`}>
                    {getResourceIcon(resource.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{resource.title}</h4>
                    <p className="text-xs text-gray-500 capitalize">{resource.type}</p>
                    {resource.required && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                        {t('createQuiz.review.requiredBadge', 'Bắt buộc')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleViewResource(resource)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    {t('common.view', 'Xem')}
                  </button>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="p-3 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-gray-900 flex items-center gap-2">
          📝 {t('admin.preview.questionList', 'Danh sách câu hỏi')}
          <span className="text-xs sm:text-sm font-normal text-gray-500">
            ({quiz.questions?.length || 0} {t('quiz.total', 'Tổng')})
          </span>
        </h3>
        
        <div className="space-y-4 sm:space-y-6">
          {quiz.questions && quiz.questions.length > 0 ? quiz.questions.map((question: Question, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                  <span className="flex-shrink-0 w-6 sm:w-8 h-6 sm:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {/* Question text - support both plain text and rich text */}
                    {question.richText ? (
                      <div className="font-semibold text-gray-900 text-sm sm:text-lg break-words">
                        <SafeHTML content={question.richText} className="prose prose-sm max-w-none" />
                      </div>
                    ) : (
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-lg break-words">
                        {question.text}
                      </h4>
                    )}
                    
                    {/* Question media attachments */}
                    <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-3">
                      {/* Question Image */}
                      {question.imageUrl && (
                        <div className="relative">
                          <img 
                            src={question.imageUrl} 
                            alt={`Question ${index + 1}`}
                            className="max-w-full sm:max-w-sm max-h-32 sm:max-h-48 rounded-lg border border-gray-200 object-contain"
                          />
                          <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 sm:px-1.5 py-0.5 rounded">🖼️</span>
                        </div>
                      )}
                      
                      {/* Question Audio */}
                      {question.audioUrl && (
                        <div className="p-2 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2 text-amber-800 mb-2">
                            <span>🎵</span>
                            <span className="text-xs sm:text-sm font-medium">{t('quiz.hasAudio', 'Có âm thanh')}</span>
                          </div>
                          <audio controls className="w-48 sm:w-64 h-8">
                            <source src={question.audioUrl} />
                          </audio>
                        </div>
                      )}
                      
                      {/* Question Video */}
                      {question.videoUrl && (
                        <div className="p-2 sm:p-3 bg-violet-50 border border-violet-200 rounded-lg">
                          <div className="flex items-center gap-2 text-violet-800 mb-2">
                            <span>🎬</span>
                            <span className="text-xs sm:text-sm font-medium">{t('quiz.hasVideo', 'Có video')}</span>
                          </div>
                          <VideoPlayer url={question.videoUrl} className="max-w-full sm:max-w-md w-full aspect-video" />
                        </div>
                      )}
                    </div>
                    
                    {/* Multiple attachments */}
                    {question.attachments && question.attachments.length > 0 && (
                      <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('quiz.mediaAttachments', 'Tệp đính kèm')}:</div>
                        <div className="flex flex-wrap gap-2">
                          {question.attachments.map((att: any, i: number) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                              {att.type === 'image' && att.url && (
                                <img src={att.url} alt={att.name || 'Image'} className="w-20 h-20 object-cover rounded border" />
                              )}
                              {att.type === 'audio' && att.url && (
                                <audio controls className="w-40 h-8">
                                  <source src={att.url} />
                                </audio>
                              )}
                              {att.type === 'video' && att.url && (
                                <VideoPlayer url={att.url} className="w-40 h-28 sm:w-48 sm:h-32" />
                              )}
                              <span className="text-xs text-gray-500">{att.name || att.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                    question.type === 'multiple' ? 'bg-blue-100 text-blue-800' :
                    question.type === 'checkbox' ? 'bg-green-100 text-green-800' :
                    question.type === 'boolean' ? 'bg-purple-100 text-purple-800' :
                    question.type === 'short_answer' ? 'bg-yellow-100 text-yellow-800' :
                    question.type === 'ordering' ? 'bg-orange-100 text-orange-800' :
                    question.type === 'fill_blanks' || (question.type as string) === 'fill_blank' ? 'bg-pink-100 text-pink-800' :
                    question.type === 'matching' ? 'bg-cyan-100 text-cyan-800' :
                    question.type === 'multimedia' ? 'bg-indigo-100 text-indigo-800' :
                    question.type === 'rich_content' ? 'bg-teal-100 text-teal-800' :
                    question.type === 'image' ? 'bg-rose-100 text-rose-800' :
                    question.type === 'audio' ? 'bg-amber-100 text-amber-800' :
                    question.type === 'video' ? 'bg-violet-100 text-violet-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {question.type === 'multiple' ? `🔘 ${t('quiz.questionTypes.multiple', 'Trắc nghiệm')}` :
                     question.type === 'checkbox' ? `☑️ ${t('quiz.questionTypes.checkbox', 'Nhiều lựa chọn')}` :
                     question.type === 'boolean' ? `✓✗ ${t('quiz.questionTypes.boolean', 'Đúng/Sai')}` :
                     question.type === 'short_answer' ? `✏️ ${t('quiz.questionTypes.short_answer', 'Trả lời ngắn')}` :
                     question.type === 'ordering' ? `🔢 ${t('quiz.questionTypes.ordering', 'Sắp xếp')}` :
                     question.type === 'fill_blanks' || (question.type as string) === 'fill_blank' ? `📝 ${t('quiz.questionTypes.fill_blank', 'Điền chỗ trống')}` :
                     question.type === 'matching' ? `🔗 ${t('quiz.questionTypes.matching', 'Ghép cặp')}` :
                     question.type === 'multimedia' ? `🎬 ${t('quiz.questionTypes.multimedia', 'Đa phương tiện')}` :
                     question.type === 'rich_content' ? `📄 ${t('quiz.questionTypes.rich_content', 'Nội dung phức hợp')}` :
                     question.type === 'image' ? `🖼️ ${t('quiz.questionTypes.image', 'Hình ảnh')}` :
                     question.type === 'audio' ? `🎵 ${t('quiz.questionTypes.audio', 'Âm thanh')}` :
                     question.type === 'video' ? `📹 ${t('quiz.questionTypes.video', 'Video')}` :
                     `❓ ${question.type}`}
                  </span>
                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-indigo-100 text-indigo-800 rounded-full text-[10px] sm:text-xs font-medium">
                    {question.points || 1} {t('common.points', 'Điểm')}
                  </span>
                  {question.difficulty && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                      question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {question.difficulty === 'easy' ? '🟢' : question.difficulty === 'medium' ? '🟡' : '🔴'}
                    </span>
                  )}
                </div>
              </div>

              {/* Answers */}
              <div className="space-y-2 sm:space-y-3 ml-8 sm:ml-11">
                {/* Boolean (True/False) */}
                {question.type === 'boolean' ? (
                  <div className="p-2 sm:p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm ${
                        String(question.correctAnswer) === 'true'
                          ? 'bg-green-100 text-green-800 border-2 border-green-400'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        ✓ {t('quiz.boolean.true', 'Đúng')}
                        {String(question.correctAnswer) === 'true' && <span className="ml-2">✓</span>}
                      </div>
                      <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm ${
                        String(question.correctAnswer) === 'false'
                          ? 'bg-green-100 text-green-800 border-2 border-green-400'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        ✗ {t('quiz.boolean.false', 'Sai')}
                        {String(question.correctAnswer) === 'false' && <span className="ml-2">✓</span>}
                      </div>
                    </div>
                  </div>
                ) : question.type === 'short_answer' ? (
                  <div className="p-2 sm:p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-medium text-green-800 text-xs sm:text-sm">{t('quiz.correctAnswer', 'Đáp án đúng')}: </span>
                      <span className="text-green-700 font-semibold bg-green-100 px-2 py-1 rounded text-xs sm:text-sm">{question.correctAnswer}</span>
                      <span className="text-green-600 text-lg sm:text-xl">✓</span>
                    </div>
                    {question.acceptedAnswers && question.acceptedAnswers.length > 0 && (
                      <div className="mt-2 text-xs sm:text-sm text-green-600">
                        <span className="font-medium">{t('quiz.acceptedAnswers', 'Đáp án chấp nhận')}: </span>
                        {question.acceptedAnswers.map((ans: string, i: number) => (
                          <span key={i} className="bg-green-100 px-2 py-0.5 rounded mx-1">{ans}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : question.type === 'ordering' ? (
                  <div className="p-2 sm:p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                    <div className="font-medium text-orange-800 mb-2 text-xs sm:text-sm">{t('quiz.correctOrder', 'Thứ tự đúng')}:</div>
                    <div className="space-y-1">
                      {question.orderingItems ? (
                        [...question.orderingItems]
                          .sort((a: any, b: any) => a.correctOrder - b.correctOrder)
                          .map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-orange-700 bg-orange-100 p-1.5 sm:p-2 rounded text-xs sm:text-sm">
                              <span className="w-5 sm:w-6 h-5 sm:h-6 bg-orange-300 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0">{i + 1}</span>
                              <span className="break-words">{item.text}</span>
                              {item.imageUrl && <img src={item.imageUrl} alt="" className="w-6 sm:w-8 h-6 sm:h-8 rounded flex-shrink-0" />}
                            </div>
                          ))
                      ) : (question as any).correctOrder ? (
                        (question as any).correctOrder.map((item: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-orange-700 bg-orange-100 p-1.5 sm:p-2 rounded text-xs sm:text-sm">
                            <span className="w-5 sm:w-6 h-5 sm:h-6 bg-orange-300 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0">{i + 1}</span>
                            <span className="break-words">{item}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-500 text-xs sm:text-sm">{t('common.notAvailable', 'Không có sẵn')}</span>
                      )}
                    </div>
                  </div>
                ) : question.type === 'fill_blanks' || (question.type as string) === 'fill_blank' ? (
                  <div className="p-2 sm:p-4 bg-pink-50 border-2 border-pink-300 rounded-lg">
                    {question.textWithBlanks && (
                      <div className="mb-2 sm:mb-3 p-2 bg-pink-100 rounded text-pink-800 text-xs sm:text-sm">
                        <span className="font-medium">{t('quiz.template', 'Mẫu')}: </span>
                        <span>{question.textWithBlanks}</span>
                      </div>
                    )}
                    <div className="font-medium text-pink-800 mb-2 text-xs sm:text-sm">{t('quiz.blanks', 'Chỗ trống')}:</div>
                    <div className="space-y-1">
                      {question.blanks ? (
                        question.blanks.map((blank: any, i: number) => (
                          <div key={i} className="flex flex-wrap items-center gap-1 sm:gap-2 text-pink-700 bg-pink-100 p-1.5 sm:p-2 rounded text-xs sm:text-sm">
                            <span className="font-medium bg-pink-300 px-1.5 sm:px-2 py-0.5 rounded">[{blank.position !== undefined ? blank.position + 1 : i + 1}]</span>
                            <span className="font-semibold">{blank.correctAnswer}</span>
                            {blank.acceptedAnswers && blank.acceptedAnswers.length > 0 && (
                              <span className="text-[10px] sm:text-xs text-pink-500">
                                ({t('quiz.alsoAccepts', 'cũng chấp nhận')}: {blank.acceptedAnswers.join(', ')})
                              </span>
                            )}
                          </div>
                        ))
                      ) : (question as any).blanks ? (
                        (question as any).blanks.map((blank: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-pink-700 bg-pink-100 p-1.5 sm:p-2 rounded text-xs sm:text-sm">
                            <span className="font-medium">[{i + 1}]:</span> {blank.answer || blank.correctAnswer || blank}
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-500 text-xs sm:text-sm">{t('common.notAvailable', 'Không có')}</span>
                      )}
                    </div>
                  </div>
                ) : question.type === 'matching' ? (
                  <div className="p-2 sm:p-4 bg-cyan-50 border-2 border-cyan-300 rounded-lg">
                    <div className="font-medium text-cyan-800 mb-2 text-xs sm:text-sm">{t('quiz.matchingPairs', 'Cặp ghép')}:</div>
                    <div className="space-y-2">
                      {question.matchingPairs ? (
                        question.matchingPairs.map((pair: any, i: number) => (
                          <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2">
                            <div className="flex-1 p-1.5 sm:p-2 bg-cyan-100 rounded text-cyan-800 flex items-center gap-2 text-xs sm:text-sm">
                              {pair.leftImageUrl && <img src={pair.leftImageUrl} alt="" className="w-6 sm:w-8 h-6 sm:h-8 rounded flex-shrink-0" />}
                              <span className="break-words">{pair.left}</span>
                            </div>
                            <span className="text-cyan-600 font-bold text-center">↔</span>
                            <div className="flex-1 p-1.5 sm:p-2 bg-cyan-200 rounded text-cyan-900 flex items-center gap-2 text-xs sm:text-sm">
                              {pair.rightImageUrl && <img src={pair.rightImageUrl} alt="" className="w-6 sm:w-8 h-6 sm:h-8 rounded flex-shrink-0" />}
                              <span className="break-words">{pair.right}</span>
                            </div>
                          </div>
                        ))
                      ) : (question as any).pairs ? (
                        (question as any).pairs.map((pair: any, i: number) => (
                          <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2">
                            <div className="flex-1 p-1.5 sm:p-2 bg-cyan-100 rounded text-cyan-800 text-xs sm:text-sm">{pair.left}</div>
                            <span className="text-cyan-600 font-bold text-center">↔</span>
                            <div className="flex-1 p-1.5 sm:p-2 bg-cyan-200 rounded text-cyan-900 text-xs sm:text-sm">{pair.right}</div>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-500 text-xs sm:text-sm">{t('common.notAvailable', 'Không có')}</span>
                      )}
                    </div>
                  </div>
                ) : question.type === 'multimedia' || question.type === 'image' || question.type === 'audio' || question.type === 'video' ? (
                  <div className="space-y-2 sm:space-y-3">
                    {/* Show media attachments */}
                    {question.attachments && question.attachments.length > 0 && (
                      <div className="p-2 sm:p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <div className="font-medium text-indigo-800 mb-2 text-xs sm:text-sm">{t('quiz.mediaAttachments', 'Tệp đính kèm')}:</div>
                        <div className="flex flex-wrap gap-2">
                          {question.attachments.map((att: any, i: number) => (
                            <div key={i} className="flex items-center gap-1 bg-indigo-100 px-2 py-1 rounded text-[10px] sm:text-xs">
                              {att.type === 'image' && '🖼️'}
                              {att.type === 'audio' && '🎵'}
                              {att.type === 'video' && '🎬'}
                              <span>{att.name || att.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Show video if exists */}
                    {question.videoUrl && (
                      <div className="p-2 sm:p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <span className="text-indigo-800 text-xs sm:text-sm">🎬 {t('quiz.hasVideo', 'Có video')}</span>
                      </div>
                    )}
                    {/* Show audio if exists */}
                    {question.audioUrl && (
                      <div className="p-2 sm:p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <span className="text-indigo-800 text-xs sm:text-sm">🎵 {t('quiz.hasAudio', 'Có âm thanh')}</span>
                      </div>
                    )}
                    {/* Show answers like multiple choice */}
                    {question.answers?.map((answer: any, answerIndex: number) => (
                      <div
                        key={answerIndex}
                        className={`p-2 sm:p-4 rounded-lg border-2 ${
                          answer.isCorrect
                            ? 'bg-green-50 border-green-300 text-green-800'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-medium text-xs sm:text-sm">
                              {String.fromCharCode(65 + answerIndex)}. {answer.text}
                            </span>
                            {answer.imageUrl && (
                              <img src={answer.imageUrl} alt="" className="w-8 sm:w-12 h-8 sm:h-12 object-cover rounded flex-shrink-0" />
                            )}
                            {answer.audioUrl && <span className="text-blue-500">🎵</span>}
                            {answer.videoUrl && <span className="text-purple-500">🎬</span>}
                          </div>
                          {answer.isCorrect && (
                            <span className="text-green-600 text-lg sm:text-xl flex-shrink-0">✓</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : question.type === 'rich_content' ? (
                  <div className="space-y-2 sm:space-y-3">
                    {question.richText && (
                      <div className="p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <SafeHTML content={question.richText} className="prose prose-sm max-w-none text-xs sm:text-sm" />
                      </div>
                    )}
                    {question.answers?.map((answer: any, answerIndex: number) => (
                      <div
                        key={answerIndex}
                        className={`p-2 sm:p-4 rounded-lg border-2 ${
                          answer.isCorrect
                            ? 'bg-green-50 border-green-300 text-green-800'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0 text-xs sm:text-sm">
                            <span className="font-medium">{String.fromCharCode(65 + answerIndex)}. </span>
                            {answer.richText ? (
                              <SafeHTML content={answer.richText} className="inline" />
                            ) : (
                              answer.text
                            )}
                          </div>
                          {answer.isCorrect && (
                            <span className="text-green-600 text-lg sm:text-xl ml-2 flex-shrink-0">✓</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : question.type === 'checkbox' ? (
                  <div className="space-y-2 sm:space-y-3">
                    <div className="text-xs sm:text-sm text-gray-500 mb-2">({t('quiz.multipleAnswersAllowed', 'Cho phép chọn nhiều đáp án')})</div>
                    {question.answers?.map((answer: any, answerIndex: number) => (
                      <div
                        key={answerIndex}
                        className={`p-4 rounded-lg border-2 ${
                          answer.isCorrect
                            ? 'bg-green-50 border-green-300 text-green-800'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 sm:gap-3">
                          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                            <span className={`w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0 mt-0.5 border-2 rounded flex items-center justify-center ${
                              answer.isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-300'
                            }`}>
                              {answer.isCorrect && <span className="text-white text-[10px] sm:text-xs">✓</span>}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-xs sm:text-sm">{String.fromCharCode(65 + answerIndex)}. </span>
                              {answer.richText ? (
                                <SafeHTML content={answer.richText} className="inline text-xs sm:text-sm" />
                              ) : (
                                <span className="text-xs sm:text-sm break-words">{answer.text}</span>
                              )}
                              {/* Answer media */}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {answer.imageUrl && (
                                  <img src={answer.imageUrl} alt="" className="w-16 sm:w-24 h-16 sm:h-24 object-cover rounded border" />
                                )}
                                {answer.audioUrl && (
                                  <audio controls className="h-8 w-40 sm:w-auto"><source src={answer.audioUrl} /></audio>
                                )}
                                {answer.videoUrl && (
                                  <VideoPlayer url={answer.videoUrl} className="w-32 sm:w-40 h-20 sm:h-28" />
                                )}
                              </div>
                            </div>
                          </div>
                          {answer.isCorrect && (
                            <span className="text-green-600 text-lg sm:text-xl flex-shrink-0">✓</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Default: multiple choice with full media support */
                  question.answers?.map((answer: any, answerIndex: number) => (
                    <div
                      key={answerIndex}
                      className={`p-2 sm:p-4 rounded-lg border-2 ${
                        answer.isCorrect
                          ? 'bg-green-50 border-green-300 text-green-800'
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-xs sm:text-sm">{String.fromCharCode(65 + answerIndex)}. </span>
                          {answer.richText ? (
                            <SafeHTML content={answer.richText} className="inline text-xs sm:text-sm" />
                          ) : (
                            <span className="text-xs sm:text-sm break-words">{answer.text}</span>
                          )}
                          {/* Answer media */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {answer.imageUrl && (
                              <img src={answer.imageUrl} alt="" className="w-16 sm:w-24 h-16 sm:h-24 object-cover rounded border" />
                            )}
                            {answer.audioUrl && (
                              <audio controls className="h-8 w-40 sm:w-auto"><source src={answer.audioUrl} /></audio>
                            )}
                            {answer.videoUrl && (
                              <VideoPlayer url={answer.videoUrl} className="w-32 sm:w-40 h-20 sm:h-28" />
                            )}
                          </div>
                        </div>
                        {answer.isCorrect && (
                          <span className="text-green-600 text-lg sm:text-xl flex-shrink-0">✓</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Question Details */}
              {question.explanation && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 ml-8 sm:ml-11">
                  <div className="flex items-start gap-2 text-xs sm:text-sm bg-blue-50 p-2 sm:p-3 rounded-lg">
                    <span className="text-blue-500">💡</span>
                    <div className="min-w-0">
                      <span className="font-medium text-blue-800">{t('quiz.explanation', 'Giải thích')}: </span>
                      <SafeHTML content={question.explanation} className="text-blue-700" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )) : (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <FileText className="w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm sm:text-base">{t('quiz.noQuestions', 'Chưa có câu hỏi')}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 bg-gray-50 -mx-3 sm:-mx-6 px-3 sm:px-6 pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
              {t('quiz.questions', 'Câu hỏi')}: <span className="font-semibold">{quiz.questions.length}</span> - 
              <span className="font-semibold ml-1">{quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0)} {t('common.points', 'điểm')}</span>
            </div>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
            >
              {t('close', 'Đóng')}
            </button>
          </div>
        </div>
      </div>
    </Modal>

    {/* Resource Viewers - Rendered outside Modal for proper z-index */}
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

export default QuizPreview;
