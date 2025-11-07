import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Clock, Star, Play, Eye, BookOpen, Target, FileText, Video, 
  Image as ImageIcon, Music, Link as LinkIcon, Presentation, 
  ExternalLink, Users, Lock, Trophy, Brain, Check, X,
  ChevronRight, Calendar, Award, TrendingUp, Heart
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { Quiz } from '../types';
import RichTextViewer from '../../../shared/components/ui/RichTextViewer';
import { reviewService } from '../services/reviewService';
import { QuizReviewStats } from '../types/review';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import PasswordModal from '../../../shared/components/ui/PasswordModal';

const QuizPreviewPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewStats, setReviewStats] = useState<QuizReviewStats | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [pendingAction, setPendingAction] = useState<'single' | 'multi' | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!id) return;
      
      try {
        const quizDoc = await getDoc(doc(db, 'quizzes', id));
        if (quizDoc.exists()) {
          const quizData = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
          setQuiz(quizData);
          
          // Fetch review stats
          try {
            const stats = await reviewService.getQuizReviewStats(id);
            setReviewStats(stats);
          } catch (error) {
            console.error('Error fetching review stats:', error);
          }
        } else {
          navigate('/quizzes');
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
        navigate('/quizzes');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [id, navigate]);

  // 🔒 Password check
  const requiresPassword = useMemo(() => {
    if (!quiz) return false;
    return (
      quiz.visibility === 'password' ||
      quiz.havePassword === 'password' ||
      quiz.havePassword === true
    );
  }, [quiz]);

  const quizId = quiz?.id;

  useEffect(() => {
    setPasswordVerified(false);
    setPendingAction(null);
    setShowPasswordModal(false);
  }, [quizId]);

  const handleStartQuiz = (mode: 'single' | 'multi') => {
    if (!quiz) return;

    // If password-protected and not verified yet, show password modal
    if (requiresPassword && !passwordVerified) {
      setPendingAction(mode);
      setShowPasswordModal(true);
      return;
    }
    
    // Otherwise, proceed with starting quiz
    if (mode === 'single') {
      navigate(`/quiz/${quiz.id}`);
    } else {
      navigate('/multiplayer', { state: { selectedQuiz: quiz } });
    }
  };

  // 🔒 Handle password verification success
  const handlePasswordSuccess = () => {
    if (!quiz) return;
    
    setShowPasswordModal(false);
    setPasswordVerified(true);
    
    // Execute pending action
    if (pendingAction === 'single') {
      navigate(`/quiz/${quiz.id}`);
    } else if (pendingAction === 'multi') {
      navigate('/multiplayer', { state: { selectedQuiz: quiz } });
    }
    setPendingAction(null);
  };

  // Helper functions
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'hard': return 'bg-rose-100 text-rose-700 border-rose-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

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
      case 'video': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pdf': return 'bg-red-50 text-red-700 border-red-200';
      case 'image': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'audio': return 'bg-green-50 text-green-700 border-green-200';
      case 'link': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'slides': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-lg font-medium text-gray-700">{t('preview.loading')}</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <X className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">{t('preview.notFound')}</h2>
          <p className="text-gray-600 mb-6">{t('preview.notFoundDesc')}</p>
          <Link 
            to="/quizzes" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all hover:shadow-lg"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            {t('preview.backToQuizzes')}
          </Link>
        </div>
      </div>
    );
  }

  const hasResources = quiz.resources && quiz.resources.length > 0;
  const averageRating = reviewStats?.averageRating || 0;
  const totalReviews = reviewStats?.totalReviews || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-white/80 mb-6">
            <Link to="/quizzes" className="hover:text-white transition-colors">
              {t('preview.quizzes')}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">{quiz.title}</span>
          </div>

          {/* Title & Category */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                {t(`categories.${quiz.category}`, quiz.category)}
              </span>
              {requiresPassword && (
                <span className="px-4 py-1.5 bg-yellow-400/30 backdrop-blur-sm rounded-full text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {t('preview.passwordProtected')}
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="text-lg text-white/90 max-w-3xl">
                {quiz.description}
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{quiz.questions?.length || 0}</p>
                  <p className="text-sm text-white/80">{t('preview.questions')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{quiz.duration}</p>
                  <p className="text-sm text-white/80">{t('preview.minutes')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Brain className={`w-6 h-6`} />
                </div>
                <div>
                  <p className="text-2xl font-bold capitalize">{t(`difficulties.${quiz.difficulty}`)}</p>
                  <p className="text-sm text-white/80">{t('preview.difficulty')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{quiz.totalPlayers || 0}</p>
                  <p className="text-sm text-white/80">{t('preview.players')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button
              onClick={() => handleStartQuiz('single')}
              className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:shadow-2xl transition-all hover:scale-105 group"
            >
              <Play className="w-6 h-6 group-hover:scale-110 transition-transform" />
              {t('preview.playSolo')}
            </button>
            <button
              onClick={() => handleStartQuiz('multi')}
              className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all hover:scale-105 group border-2 border-white/30"
            >
              <Users className="w-6 h-6 group-hover:scale-110 transition-transform" />
              {t('preview.playMultiplayer')}
            </button>
          </div>

          {/* Rating */}
          {totalReviews > 0 && (
            <div className="flex items-center gap-4 mt-6">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-white/40'
                    }`}
                  />
                ))}
              </div>
              <span className="text-lg font-medium">
                {averageRating.toFixed(1)} ({totalReviews} {t('preview.reviews')})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Quiz */}
            {quiz.description && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                  {t('preview.about')}
                </h2>
                <div className="prose prose-blue max-w-none">
                  <RichTextViewer content={quiz.description} />
                </div>
              </div>
            )}

            {/* Learning Materials */}
            {hasResources && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                  {t('preview.learningMaterials')}
                  <span className="ml-auto text-sm font-normal text-gray-500">
                    {quiz.resources?.length} {t('preview.resources')}
                  </span>
                </h2>
                <div className="space-y-3">
                  {quiz.resources?.map((resource, index) => (
                    <div
                      key={resource.id || index}
                      className="group border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getResourceBadgeColor(resource.type)} border-2`}>
                          {getResourceIcon(resource.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {resource.title}
                          </h3>
                          {resource.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {resource.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              {t(`resourceTypes.${resource.type}`, resource.type)}
                            </span>
                            {resource.estimatedTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {resource.estimatedTime} {t('preview.min')}
                              </span>
                            )}
                            {resource.required && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-medium">
                                {t('preview.required')}
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
                {quiz.quizType === 'with-materials' && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">{t('preview.tip')}:</span>{' '}
                      {t('preview.withMaterialsTip')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Questions Preview */}
            {quiz.questions && quiz.questions.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-green-600" />
                  {t('preview.questionsPreview')}
                  <span className="ml-auto text-sm font-normal text-gray-500">
                    {quiz.questions.length} {t('preview.totalQuestions')}
                  </span>
                </h2>
                <div className="space-y-3">
                  {quiz.questions.slice(0, 3).map((question, index) => (
                    <div
                      key={question.id || index}
                      className="border-2 border-gray-200 rounded-xl p-4 hover:border-green-300 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 line-clamp-2">
                            {question.text}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              {t(`questionTypes.${question.type}`, question.type)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              {question.points} {t('preview.points')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {quiz.questions.length > 3 && (
                    <div className="text-center py-3 text-gray-500 text-sm">
                      {t('preview.andMore', { count: quiz.questions.length - 3 })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="font-bold text-gray-900 mb-4">{t('preview.quickInfo')}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 text-sm">{t('preview.category')}</span>
                  <span className="font-medium text-gray-900">
                    {t(`categories.${quiz.category}`, quiz.category)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 text-sm">{t('preview.difficulty')}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getDifficultyColor(quiz.difficulty)}`}>
                    {t(`difficulties.${quiz.difficulty}`)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 text-sm">{t('preview.duration')}</span>
                  <span className="font-medium text-gray-900">{quiz.duration} {t('preview.min')}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 text-sm">{t('preview.questions')}</span>
                  <span className="font-medium text-gray-900">{quiz.questions?.length || 0}</span>
                </div>
                {quiz.totalPlayers !== undefined && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 text-sm">{t('preview.players')}</span>
                    <span className="font-medium text-gray-900">{quiz.totalPlayers}</span>
                  </div>
                )}
                {quiz.averageScore !== undefined && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600 text-sm">{t('preview.avgScore')}</span>
                    <span className="font-medium text-green-600">{Math.round(quiz.averageScore)}%</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => handleStartQuiz('single')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:scale-105"
                >
                  <Play className="w-5 h-5" />
                  {t('preview.startQuiz')}
                </button>
                <button
                  onClick={() => handleStartQuiz('multi')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-purple-600 text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all"
                >
                  <Users className="w-5 h-5" />
                  {t('preview.playWithFriends')}
                </button>
              </div>
            </div>

            {/* Stats Card */}
            {(quiz.totalPlayers || quiz.averageScore) && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-sm border border-green-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  {t('preview.stats')}
                </h3>
                <div className="space-y-3">
                  {quiz.totalPlayers !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{t('preview.totalPlayers')}</span>
                        <span className="font-bold text-green-600">{quiz.totalPlayers}</span>
                      </div>
                    </div>
                  )}
                  {quiz.averageScore !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{t('preview.avgScore')}</span>
                        <span className="font-bold text-green-600">{Math.round(quiz.averageScore)}%</span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${quiz.averageScore}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {quiz && showPasswordModal && (
        <PasswordModal
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setPendingAction(null);
          }}
          onSuccess={handlePasswordSuccess}
          passwordData={quiz.pwd}
          quizTitle={quiz.title}
        />
      )}
    </div>
  );
};

export default QuizPreviewPage;
