import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { 
  Play, 
  FileText, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  CheckCircle2, 
  Lock, 
  AlertCircle,
  ArrowRight,
  Clock
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
  type: 'video' | 'pdf' | 'image' | 'link' | 'slides';
  title: string;
  description?: string;
  url: string;
  required: boolean;
  thumbnailUrl?: string;
  whyWatch?: string;
  estimatedTime?: number;
  order?: number;
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

  useEffect(() => {
    loadQuizAndSession();
  }, [quizId]);

  const loadQuizAndSession = async () => {
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
  };

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

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'image':
      case 'slides': return <ImageIcon className="w-5 h-5" />;
      case 'link': return <LinkIcon className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getResourceTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      video: 'bg-red-100 text-red-700 border-red-300',
      pdf: 'bg-blue-100 text-blue-700 border-blue-300',
      image: 'bg-green-100 text-green-700 border-green-300',
      slides: 'bg-purple-100 text-purple-700 border-purple-300',
      link: 'bg-yellow-100 text-yellow-700 border-yellow-300'
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const formatEstimatedTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  const resources = quiz.resources || [];
  const requiredResources = resources.filter((r: SimpleResource) => r.required);
  const optionalResources = resources.filter((r: SimpleResource) => !r.required);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-sm text-gray-600 mt-1">{t('learning.materials.title')}</p>
            </div>
            
            {/* Progress & Start Button */}
            <div className="flex items-center gap-4">
              {gatingStatus && (
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-gray-700">
                      {t('learning.progress')}: {gatingStatus.completionPercent}%
                    </div>
                    {gatingStatus.ready ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
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
                className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                  gatingStatus?.ready
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Resource List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('learning.materials.list')}
              </h2>

              {/* Required Resources */}
              {requiredResources.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    {t('learning.required')} ({requiredResources.length})
                  </h3>
                  <div className="space-y-2">
                    {requiredResources.map((resource: SimpleResource, index: number) => {
                      const progress = gatingStatus?.viewedResources?.[resource.id];
                      const isCompleted = progress?.completed || false;
                      const isSelected = selectedResource?.id === resource.id;
                      
                      return (
                        <button
                          key={resource.id}
                          onClick={() => handleResourceClick(resource)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                getResourceIcon(resource.type)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {index + 1}. {resource.title}
                              </p>
                              {resource.estimatedTime && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                  <Clock className="w-3 h-3" />
                                  {formatEstimatedTime(resource.estimatedTime)}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Resources */}
              {optionalResources.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {t('learning.optional')} ({optionalResources.length})
                  </h3>
                  <div className="space-y-2">
                    {optionalResources.map((resource: SimpleResource) => {
                      const progress = gatingStatus?.viewedResources?.[resource.id];
                      const isCompleted = progress?.completed || false;
                      const isSelected = selectedResource?.id === resource.id;
                      
                      return (
                        <button
                          key={resource.id}
                          onClick={() => handleResourceClick(resource)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                getResourceIcon(resource.type)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {resource.title}
                              </p>
                              {resource.estimatedTime && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                  <Clock className="w-3 h-3" />
                                  {formatEstimatedTime(resource.estimatedTime)}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Resource Viewer */}
          <div className="lg:col-span-2">
            {selectedResource ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Resource Header */}
                <div className="border-b border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 uppercase ${
                          getResourceTypeBadge(selectedResource.type)
                        }`}>
                          {selectedResource.type}
                        </span>
                        {selectedResource.required && (
                          <span className="px-3 py-1 rounded-lg text-xs font-semibold border-2 bg-red-100 text-red-700 border-red-300 uppercase">
                            {t('learning.required')}
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedResource.title}
                      </h2>
                      {selectedResource.description && (
                        <p className="text-gray-600">{selectedResource.description}</p>
                      )}
                      {selectedResource.whyWatch && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-900">
                            <strong>{t('learning.whyWatch')}:</strong> {selectedResource.whyWatch}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resource Content */}
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
                      urls={[selectedResource.url]} // TODO: Support multiple images
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
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">{t('learning.selectResource')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningMaterialsPage;
