import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Star, Play, Eye, BookOpen, Target, Users } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { Quiz } from '../types';
import { reviewService } from '../services/reviewService';
import { QuizReviewStats } from '../types/review';
import QuickReviewSection from '../../../shared/components/QuickReviewSection';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { MultiplayerManager } from '../../multiplayer';

const QuizPreviewPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewStats, setReviewStats] = useState<QuizReviewStats | null>(null);
  const [showMultiplayer, setShowMultiplayer] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-4">{quiz.title}</h1>
              <p className="text-blue-100 text-lg mb-6">{quiz.description}</p>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5" />
                  <span>{t('quiz.questionsCount', { count: quiz.questions.length })}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>{(quiz as any).timeLimit ? t('quiz.timeLimit', { time: (quiz as any).timeLimit / 60 }) : t('quiz.noTimeLimit')}</span>
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
                    ({t('quiz.ratingCount', { count: reviewStats.totalReviews })})
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <Link
                  to={`/quiz/${quiz.id}`}
                  className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-md"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {t('quiz.startQuizButton')}
                </Link>
                
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
                          <span>{t('quiz.type', { type: t(`quiz.questionTypes.${question.type}`) })}</span>
                          <span>{t('quiz.points', { points: question.points })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {quiz.questions.length > 3 && (
                  <p className="text-center text-gray-600 py-4">
                    {t('quiz.moreQuestions', { count: quiz.questions.length - 3 })}
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
    </div>
  );
};

export default QuizPreviewPage;
