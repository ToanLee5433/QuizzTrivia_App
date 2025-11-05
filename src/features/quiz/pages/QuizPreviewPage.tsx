import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Star, Play, Eye, BookOpen, Target, FileText, Video, Image as ImageIcon, Music, Link as LinkIcon, Presentation, ExternalLink } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { Quiz } from '../types';
import RichTextViewer from '../../../shared/components/ui/RichTextViewer';
import { reviewService } from '../services/reviewService';
import { QuizReviewStats } from '../types/review';
import QuickReviewSection from '../../../shared/components/QuickReviewSection';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import GameModeSelector from '../../multiplayer/components/GameModeSelector';
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
  const [showGameModeSelector, setShowGameModeSelector] = useState(false);
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

  // Auto-open GameModeSelector if coming from QuizCard
  useEffect(() => {
    const locationState = location.state as any;
    if (locationState?.openGameModeSelector) {
      setShowGameModeSelector(true);
    }
  }, [location.state]);

  // 🔒 Handle start quiz with password check
  const handleStartQuiz = (mode: 'single' | 'multi') => {
    if (!quiz) return;
    
    const havePassword = (quiz as any).havePassword || 'public';
    
    // If password-protected and not verified yet, show password modal
    if (havePassword === 'password' && !passwordVerified) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('quiz.loading')}</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('quiz.notFound')}</h2>
          <Link to="/quizzes" className="text-blue-600 hover:underline">
            {t('quiz.backToQuizList')}
          </Link>
        </div>
      </div>
    );
  }

  // 🔒 Check if user has access to this quiz
  // Removed - All quizzes are accessible (password check happens when starting)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Dễ';
      case 'medium': return 'Trung bình';
      case 'hard': return 'Khó';
      default: return difficulty;
    }
  };

  // Helper để lấy icon theo loại tài liệu
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

  // Helper để lấy màu badge theo loại tài liệu
  const getResourceBadgeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'pdf': return 'bg-red-100 text-red-700 border-red-300';
      case 'image': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'audio': return 'bg-green-100 text-green-700 border-green-300';
      case 'link': return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case 'slides': return 'bg-orange-100 text-orange-700 border-orange-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-4">{quiz.title}</h1>
              <RichTextViewer
                content={quiz.description || ''}
                className="text-blue-100 text-lg mb-6"
              />
              
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5" />
                  <span>{t('quiz.questionsCount', {count: quiz.questions.length})}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>{(quiz as any).timeLimit ? t('quiz.timeLimit', {time: (quiz as any).timeLimit / 60}) : t('quiz.noTimeLimit')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span className={`px-2 py-1 rounded-full text-sm ${getDifficultyColor(quiz.difficulty)}`}>
                    {getDifficultyText(quiz.difficulty)}
                  </span>
                </div>
              </div>

              {/* Rating Display */}
              {reviewStats && reviewStats.totalReviews > 0 && (
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(reviewStats.averageRating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold">
                    {reviewStats.averageRating.toFixed(1)}
                  </span>
                  <span className="text-blue-200">
                    ({t('quiz.ratingCount', {count: reviewStats.totalReviews})})
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setShowGameModeSelector(true)}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  <Play className="w-6 h-6 mr-2" />
                  {t('quiz.startQuizButton')}
                </button>
                
                <Link
                  to={`/quiz/${quiz.id}/reviews`}
                  className="inline-flex items-center px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition-colors border border-blue-400"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  {t('quiz.viewReviews')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quiz Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('quiz.detailedInfo')}</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">{t('quiz.questions')}</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{quiz.questions.length}</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-gray-900">{t('quiz.duration')}</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {(quiz as any).timeLimit ? `${(quiz as any).timeLimit / 60}'` : '∞'}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {quiz.tags && quiz.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('quiz.topics')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {quiz.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Learning Resources Section - NEW */}
            {(quiz as any).learningResources && (quiz as any).learningResources.length > 0 && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl shadow-sm p-6 border-2 border-emerald-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-emerald-600" />
                    📚 Tài liệu học tập
                  </h2>
                  <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-sm font-semibold">
                    {(quiz as any).learningResources.length} tài liệu
                  </span>
                </div>

                <p className="text-emerald-700 text-sm mb-4">
                  💡 Xem tài liệu này trước khi làm bài để đạt kết quả tốt nhất!
                </p>

                <div className="space-y-3">
                  {(quiz as any).learningResources.map((resource: any, idx: number) => (
                    <div 
                      key={resource.id || idx} 
                      className="bg-white rounded-lg p-4 border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`flex items-center justify-center w-12 h-12 rounded-xl border-2 flex-shrink-0 ${getResourceBadgeColor(resource.type)}`}>
                          {getResourceIcon(resource.type)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-bold text-gray-900 text-base leading-tight">{resource.title}</h4>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 flex-shrink-0 ${getResourceBadgeColor(resource.type)}`}>
                              {resource.type.toUpperCase()}
                            </span>
                          </div>
                          
                          {resource.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{resource.description}</p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            {resource.required && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full font-bold border border-red-300">
                                <span className="text-base">⚠️</span> BẮT BUỘC
                              </span>
                            )}
                            {resource.estimatedTime && (
                              <span className="inline-flex items-center gap-1 text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">{resource.estimatedTime} phút</span>
                              </span>
                            )}
                            {resource.url && (
                              <a 
                                href={resource.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Xem tài liệu
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {(quiz as any).learningResources.some((r: any) => r.required) && (
                  <div className="mt-4 p-3 bg-amber-50 border-2 border-amber-300 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      <span>Lưu ý: Quiz này có tài liệu <strong>BẮT BUỘC</strong> phải xem trước khi làm bài!</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Questions Preview */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('quiz.questionType')}</h2>
              
              <div className="space-y-3">
                {quiz.questions.slice(0, 3).map((question, index) => (
                  <div key={question.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-sm font-semibold rounded-full">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-gray-800 font-medium">{question.text}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <span>{t('quiz.type', {type: t(`quiz.questionTypes.${question.type}`)})}</span>
                          <span>{t('quiz.points', {points: question.points})}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {quiz.questions.length > 3 && (
                  <p className="text-center text-gray-600 py-4">
                    {t('quiz.moreQuestions', {count: quiz.questions.length - 3})}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('quiz.stats')}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('quiz.category')}</span>
                  <span className="font-semibold text-gray-900">{quiz.category}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('quiz.difficulty')}</span>
                  <span className={`px-2 py-1 rounded-full text-sm ${getDifficultyColor(quiz.difficulty)}`}>
                    {getDifficultyText(quiz.difficulty)}
                  </span>
                </div>
                
                {reviewStats && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t('quiz.rating')}</span>
                      <span className="font-semibold text-gray-900">
                        {reviewStats.averageRating.toFixed(1)}/5 ⭐
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t('quiz.reviewCount')}</span>
                      <span className="font-semibold text-gray-900">{reviewStats.totalReviews}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Author */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('quiz.author')}</h3>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {quiz.createdBy?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{t('quiz.author')}</p>
                  <p className="text-sm text-gray-600">
                    {(quiz as any).createdAt && new Date((quiz as any).createdAt.seconds * 1000).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Review Section */}
        {user && (
          <QuickReviewSection quizId={quiz.id} quizTitle={quiz.title} />
        )}
      </div>
      
      {/* Game Mode Selector Modal */}
      <GameModeSelector
        isOpen={showGameModeSelector}
        onClose={() => setShowGameModeSelector(false)}
        onSelectMultiplayer={() => {
          setShowGameModeSelector(false);
          handleStartQuiz('multi');
        }}
        connectionStatus="connected"
      />

      {/* 🔒 Password Modal for password-protected quizzes */}
      {quiz && (quiz as any).havePassword === 'password' && (
        <PasswordModal
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setPendingAction(null);
          }}
          onSuccess={handlePasswordSuccess}
          correctPassword={(quiz as any).password || ''}
          quizTitle={quiz.title}
        />
      )}
    </div>
  );
};

export default QuizPreviewPage;
