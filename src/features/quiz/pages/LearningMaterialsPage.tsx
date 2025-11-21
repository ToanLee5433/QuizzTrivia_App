import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { 
  FileText, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  CheckCircle2, 
  Lock, 
  AlertCircle,
  ArrowRight,
  Clock,
  Search,
  Filter,
  Grid,
  List,
  Eye,
  Download,
  FileSpreadsheet,
  FileCode,
  Music,
  Video,
  File
} from 'lucide-react';
import { Quiz } from '../types';
import { getQuizById } from '../api';
import { 
  getLearningSession, 
  checkGatingStatus,
  updateResourceProgress
} from '../services/learningService';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { VideoViewer, PDFViewer, ImageSlidesViewer, LinkViewer } from '../components/ResourceViewers';

// Simplified resource type for UI
interface SimpleResource {
  id: string;
  type: 'video' | 'pdf' | 'image' | 'link' | 'slides' | 'word' | 'excel' | 'powerpoint' | 'audio' | 'code';
  title: string;
  description?: string;
  url: string;
  required: boolean;
  thumbnailUrl?: string;
  whyWatch?: string;
  estimatedTime?: number;
  order?: number;
  fileSize?: string;
  fileExtension?: string;
}

interface GatingResult {
  ready: boolean;
  requiredCount: number;
  completedCount: number;
  completionPercent: number;
  missingResources: any[];
  warnings: string[];
  viewedResources?: Record<string, any>;
}

const LearningMaterialsPage: React.FC = () => {
  const { id: quizId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [gatingStatus, setGatingStatus] = useState<GatingResult | null>(null);
  const [selectedResource, setSelectedResource] = useState<SimpleResource | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);

  const loadQuizAndSession = useCallback(async () => {
    if (!quizId || !currentUser?.uid) return;
    
    try {
      setLoading(true);
      
      // Load quiz data
      const quizData = await getQuizById(quizId);
      if (!quizData) {
        toast.error(t('quiz.errors.notFound'));
        navigate('/quizzes');
        return;
      }
      setQuiz(quizData);

      // Check if quiz has learning resources
      const resources = quizData.resources || [];
      if (resources.length === 0) {
        // No materials - redirect directly to quiz
        navigate(`/quiz/${quizId}/play`);
        return;
      }

      // Load learning session and check gating
      const session = await getLearningSession(quizId, currentUser.uid);
      const status = await checkGatingStatus(currentUser.uid, quizId, resources as any);
      
      // Add viewedResources and completionPercent
      const completionPercent = status.requiredCount > 0 
        ? Math.round((status.completedCount / status.requiredCount) * 100)
        : 100;
      
      setGatingStatus({
        ...status,
        completionPercent,
        viewedResources: session?.viewedResources
      });

      // Auto-select first incomplete required resource
      const firstIncomplete = resources.find((r: SimpleResource) => 
        r.required && !session?.viewedResources?.[r.id]?.completed
      );
      if (firstIncomplete) {
        setSelectedResource(firstIncomplete);
      } else if (resources.length > 0) {
        setSelectedResource(resources[0]);
      }

    } catch (error) {
      console.error('Failed to load learning materials:', error);
      toast.error(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [quizId, currentUser, t, navigate]);

  useEffect(() => {
    loadQuizAndSession();
  }, [loadQuizAndSession]);

  const handleStartQuiz = () => {
    if (!gatingStatus?.ready) {
      toast.warning(t('learning.gating.notReady'));
      return;
    }
    navigate(`/quiz/${quizId}/play`);
  };

  const handleResourceClick = (resource: SimpleResource) => {
    setSelectedResource(resource);
  };

  const handleResourceProgressUpdate = async (resourceId: string, progress: any) => {
    if (!quizId || !currentUser?.uid) return;
    
    try {
      await updateResourceProgress(quizId, currentUser.uid, resourceId, progress);
      // Reload gating status after progress update
      await loadQuizAndSession();
    } catch (error) {
      console.error('Failed to update resource progress:', error);
    }
  };

  const handleAudioProgress = (progress: number) => {
    setAudioProgress(progress);
    if (selectedResource && progress >= 80) { // Consider completed at 80%
      handleResourceProgressUpdate(selectedResource.id, {
        completed: true,
        watchTime: progress
      });
    }
  };

  const handleDownloadResource = (url: string, title: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = title;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewerError = (error: string) => {
    setViewerError(error);
    toast.error('Không thể tải tài liệu. Vui lòng thử tải xuống.');
  };

  const getThumbnailUrl = (resource: SimpleResource): string | undefined => {
    if (resource.thumbnailUrl) return resource.thumbnailUrl;
    
    // Generate thumbnail URLs for different document types
    switch (resource.type) {
      case 'pdf':
        return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(resource.url)}&thumbnail=1`;
      case 'image':
        return resource.url;
      case 'slides':
        return resource.url; // First slide as thumbnail
      default:
        return undefined;
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'image':
      case 'slides': return <ImageIcon className="w-5 h-5" />;
      case 'link': return <LinkIcon className="w-5 h-5" />;
      case 'word': return <FileText className="w-5 h-5" />;
      case 'excel': return <FileSpreadsheet className="w-5 h-5" />;
      case 'powerpoint': return <FileText className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      case 'code': return <FileCode className="w-5 h-5" />;
      default: return <File className="w-5 h-5" />;
    }
  };

  const getResourceTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      video: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
      pdf: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
      image: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
      slides: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700',
      link: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
      word: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700',
      excel: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
      powerpoint: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700',
      audio: 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-700',
      code: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
  };

  const formatEstimatedTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const filterResources = (resources: SimpleResource[]) => {
    return resources.filter(resource => {
      const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           resource.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || resource.type === filterType;
      return matchesSearch && matchesFilter;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  const resources = quiz.resources || [];
  const requiredResources = resources.filter((r: SimpleResource) => r.required);
  const optionalResources = resources.filter((r: SimpleResource) => !r.required);
  const filteredRequired = filterResources(requiredResources);
  const filteredOptional = filterResources(optionalResources);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Modern Header */}
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{quiz.title}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{t('learning.materials.title')}</p>
            </div>
            
            {/* Modern Progress & Start Button */}
            <div className="flex items-center gap-6">
              {gatingStatus && (
                <div className="text-center">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t('learning.progress')}: {gatingStatus.completionPercent}%
                    </div>
                    {gatingStatus.ready ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        gatingStatus.ready ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${gatingStatus.completionPercent}%` }}
                    />
                  </div>
                </div>
              )}
              
              <button
                onClick={handleStartQuiz}
                disabled={!gatingStatus?.ready}
                className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all transform hover:scale-105 ${
                  gatingStatus?.ready
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {gatingStatus?.ready ? (
                  <>
                    {t('quiz.start')}
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    {t('learning.locked')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('learning.searchPlaceholder') || 'Tìm kiếm tài liệu...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tất cả</option>
                <option value="video">Video</option>
                <option value="pdf">PDF</option>
                <option value="image">Hình ảnh</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
                <option value="powerpoint">PowerPoint</option>
                <option value="audio">Audio</option>
                <option value="code">Code</option>
                <option value="link">Link</option>
              </select>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              >
                <Grid className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              >
                <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Required Resources Section */}
        {filteredRequired.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('learning.required')} ({filteredRequired.length})
              </h2>
            </div>
            
            <div className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {filteredRequired.map((resource: SimpleResource, index: number) => {
                const progress = gatingStatus?.viewedResources?.[resource.id];
                const isCompleted = progress?.completed || false;
                const isSelected = selectedResource?.id === resource.id;
                
                return (
                  <div
                    key={resource.id}
                    onClick={() => handleResourceClick(resource)}
                    className={`group cursor-pointer bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 border border-white/20 dark:border-gray-700/50 transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-gray-800 ${
                      isSelected
                        ? 'ring-2 ring-blue-500/50 border-blue-500/50'
                        : 'hover:border-gray-300/50 dark:hover:border-gray-600/50'
                    }`}
                  >
                    {/* Thumbnail Preview for PDF, Image, Slides */}
                    {(resource.type === 'pdf' || resource.type === 'image' || resource.type === 'slides') && (
                      <div className="relative h-48 overflow-hidden rounded-t-2xl">
                        <img
                          src={getThumbnailUrl(resource)}
                          alt={resource.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => {
                            // Fallback to icon if thumbnail fails
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-gradient-to-br', 'from-blue-50', 'to-purple-50', 'dark:from-gray-700', 'dark:to-gray-800');
                          }}
                        />
                        
                        {/* Overlay with type badge */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute top-3 right-3">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase backdrop-blur-sm ${
                              getResourceTypeBadge(resource.type)
                            }`}>
                              {resource.type}
                            </span>
                          </div>
                          
                          {/* Expand button */}
                          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                            <div className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg">
                              <Eye className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Loading placeholder */}
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-800">
                          <div className={`p-4 rounded-xl ${
                            isCompleted 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-8 h-8" />
                            ) : (
                              getResourceIcon(resource.type)
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="p-6">
                      {/* Resource Header for non-preview types */}
                      {!(resource.type === 'pdf' || resource.type === 'image' || resource.type === 'slides') && (
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-xl backdrop-blur-sm ${
                            isCompleted 
                              ? 'bg-green-100/80 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                              : 'bg-gray-100/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-400'
                          } group-hover:scale-110 transition-transform`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-6 h-6" />
                            ) : (
                              getResourceIcon(resource.type)
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold border-2 uppercase backdrop-blur-sm ${
                            getResourceTypeBadge(resource.type)
                          }`}>
                            {resource.type}
                          </span>
                        </div>
                      )}
                      
                      {/* Resource Info */}
                      <div className="space-y-3">
                        <h3 className={`font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                          (resource.type === 'pdf' || resource.type === 'image' || resource.type === 'slides') ? 'text-lg' : 'text-base'
                        }`}>
                          {index + 1}. {resource.title}
                        </h3>
                        {resource.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                            {resource.description}
                          </p>
                        )}
                        
                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          {resource.estimatedTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatEstimatedTime(resource.estimatedTime)}
                            </div>
                          )}
                          {resource.fileSize && (
                            <div className="flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              {resource.fileSize}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="mt-4 pt-4 border-t border-gray-100/50 dark:border-gray-700/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Eye className="w-3 h-3" />
                            {isCompleted ? 'Đã xem' : 'Chưa xem'}
                          </div>
                          <button className="text-blue-600 dark:text-blue-400 text-sm font-bold hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                            {isSelected ? 'Đang xem' : 'Xem ngay'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

              {/* Optional Resources Section */}
        {filteredOptional.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('learning.optional')} ({filteredOptional.length})
              </h2>
            </div>
            
            <div className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {filteredOptional.map((resource: SimpleResource) => {
                const progress = gatingStatus?.viewedResources?.[resource.id];
                const isCompleted = progress?.completed || false;
                const isSelected = selectedResource?.id === resource.id;
                
                return (
                  <div
                    key={resource.id}
                    onClick={() => handleResourceClick(resource)}
                    className={`group cursor-pointer bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 border border-white/20 dark:border-gray-700/50 transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-gray-800 ${
                      isSelected
                        ? 'ring-2 ring-blue-500/50 border-blue-500/50'
                        : 'hover:border-gray-300/50 dark:hover:border-gray-600/50'
                    }`}
                  >
                    {/* Thumbnail Preview for PDF, Image, Slides */}
                    {(resource.type === 'pdf' || resource.type === 'image' || resource.type === 'slides') && (
                      <div className="relative h-48 overflow-hidden rounded-t-2xl">
                        <img
                          src={getThumbnailUrl(resource)}
                          alt={resource.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => {
                            // Fallback to icon if thumbnail fails
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-gradient-to-br', 'from-blue-50', 'to-purple-50', 'dark:from-gray-700', 'dark:to-gray-800');
                          }}
                        />
                        
                        {/* Overlay with type badge */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute top-3 right-3">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase backdrop-blur-sm ${
                              getResourceTypeBadge(resource.type)
                            }`}>
                              {resource.type}
                            </span>
                          </div>
                          
                          {/* Expand button */}
                          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                            <div className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg">
                              <Eye className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Loading placeholder */}
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-800">
                          <div className={`p-4 rounded-xl ${
                            isCompleted 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-8 h-8" />
                            ) : (
                              getResourceIcon(resource.type)
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="p-6">
                      {/* Resource Header for non-preview types */}
                      {!(resource.type === 'pdf' || resource.type === 'image' || resource.type === 'slides') && (
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-xl backdrop-blur-sm ${
                            isCompleted 
                              ? 'bg-green-100/80 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                              : 'bg-gray-100/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-400'
                          } group-hover:scale-110 transition-transform`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-6 h-6" />
                            ) : (
                              getResourceIcon(resource.type)
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold border-2 uppercase backdrop-blur-sm ${
                            getResourceTypeBadge(resource.type)
                          }`}>
                            {resource.type}
                          </span>
                        </div>
                      )}
                      
                      {/* Resource Info */}
                      <div className="space-y-3">
                        <h3 className={`font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                          (resource.type === 'pdf' || resource.type === 'image' || resource.type === 'slides') ? 'text-lg' : 'text-base'
                        }`}>
                          {resource.title}
                        </h3>
                        {resource.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                            {resource.description}
                          </p>
                        )}
                        
                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          {resource.estimatedTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatEstimatedTime(resource.estimatedTime)}
                            </div>
                          )}
                          {resource.fileSize && (
                            <div className="flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              {resource.fileSize}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="mt-4 pt-4 border-t border-gray-100/50 dark:border-gray-700/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Eye className="w-3 h-3" />
                            {isCompleted ? 'Đã xem' : 'Chưa xem'}
                          </div>
                          <button className="text-blue-600 dark:text-blue-400 text-sm font-bold hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                            {isSelected ? 'Đang xem' : 'Xem ngay'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Document Viewer Section */}
        {selectedResource && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            {/* Viewer Header */}
            <div className="border-b border-gray-200/50 dark:border-gray-700/50 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 uppercase ${
                      getResourceTypeBadge(selectedResource.type)
                    }`}>
                      {selectedResource.type}
                    </span>
                    {selectedResource.required && (
                      <span className="px-3 py-1 rounded-lg text-xs font-semibold border-2 bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700 uppercase">
                        {t('learning.required')}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedResource.title}
                  </h2>
                  {selectedResource.description && (
                    <p className="text-gray-600 dark:text-gray-300">{selectedResource.description}</p>
                  )}
                  {selectedResource.whyWatch && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>{t('learning.whyWatch')}:</strong> {selectedResource.whyWatch}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Viewer Content */}
            <div className="p-6">
              {selectedResource.type === 'video' && (
                <VideoViewer
                  url={selectedResource.url}
                  title={selectedResource.title}
                  onProgressUpdate={(progress) => 
                    handleResourceProgressUpdate(selectedResource.id, progress)
                  }
                  initialProgress={gatingStatus?.viewedResources?.[selectedResource.id]}
                />
              )}
              
              {selectedResource.type === 'pdf' && (
                <PDFViewer
                  url={selectedResource.url}
                  title={selectedResource.title}
                  onProgressUpdate={(progress) => 
                    handleResourceProgressUpdate(selectedResource.id, progress)
                  }
                  initialProgress={gatingStatus?.viewedResources?.[selectedResource.id]}
                />
              )}
              
              {(selectedResource.type === 'image' || selectedResource.type === 'slides') && (
                <ImageSlidesViewer
                  urls={[selectedResource.url]}
                  title={selectedResource.title}
                  onProgressUpdate={(progress) => 
                    handleResourceProgressUpdate(selectedResource.id, progress)
                  }
                  initialProgress={gatingStatus?.viewedResources?.[selectedResource.id]}
                />
              )}
              
              {selectedResource.type === 'link' && (
                <LinkViewer
                  url={selectedResource.url}
                  title={selectedResource.title}
                  description={selectedResource.description}
                  estimatedTime={selectedResource.estimatedTime}
                  onProgressUpdate={(progress) => 
                    handleResourceProgressUpdate(selectedResource.id, progress)
                  }
                  initialProgress={gatingStatus?.viewedResources?.[selectedResource.id]}
                />
              )}

              {/* Universal Document Viewer for Office files and other formats */}
              {(selectedResource.type === 'word' || selectedResource.type === 'excel' || 
                selectedResource.type === 'powerpoint' || selectedResource.type === 'audio' || 
                selectedResource.type === 'code') && (
                <div className="w-full">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          {getResourceIcon(selectedResource.type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Universal Document Viewer
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Opening {selectedResource.type} file in embedded viewer
                          </p>
                        </div>
                      </div>
                      
                      {/* Download Button */}
                      <button
                        onClick={() => handleDownloadResource(selectedResource.url, selectedResource.title)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Tải xuống
                      </button>
                    </div>
                    
                    {/* Error Display */}
                    {viewerError && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {viewerError}
                        </p>
                      </div>
                    )}
                    
                    {/* Google Docs Viewer for Office files */}
                    {(selectedResource.type === 'word' || selectedResource.type === 'excel' || 
                      selectedResource.type === 'powerpoint') && (
                      <div className="relative">
                        <iframe
                          src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(selectedResource.url)}`}
                          className="w-full h-96 lg:h-[600px] border-0 rounded-lg"
                          title={selectedResource.title}
                          onError={() => handleViewerError('Không thể tải tài liệu từ Google Docs Viewer')}
                          onLoad={() => setViewerError(null)}
                        />
                        {!viewerError && (
                          <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
                            Đang tải...
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Audio Player with Progress Tracking */}
                    {selectedResource.type === 'audio' && (
                      <div className="space-y-4">
                        <audio 
                          controls 
                          className="w-full"
                          onTimeUpdate={(e) => {
                            const audio = e.currentTarget;
                            const progress = (audio.currentTime / audio.duration) * 100;
                            handleAudioProgress(progress);
                          }}
                        >
                          <source src={selectedResource.url} type="audio/mpeg" />
                          <source src={selectedResource.url} type="audio/wav" />
                          <source src={selectedResource.url} type="audio/ogg" />
                          Your browser does not support the audio element.
                        </audio>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${audioProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          Tiến độ: {Math.round(audioProgress)}%
                        </p>
                      </div>
                    )}
                    
                    {/* Code Viewer */}
                    {selectedResource.type === 'code' && (
                      <div className="relative">
                        <iframe
                          src={selectedResource.url}
                          className="w-full h-96 lg:h-[600px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                          title={selectedResource.title}
                          onError={() => handleViewerError('Không thể tải file mã nguồn')}
                          onLoad={() => setViewerError(null)}
                        />
                        {!viewerError && (
                          <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
                            Đang tải...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningMaterialsPage;
