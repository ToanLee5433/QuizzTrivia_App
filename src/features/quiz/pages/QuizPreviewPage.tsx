/**
 * 🎯 Quiz Overview Page - Modern Design
 * 
 * Inspired by: Moodle, Canvas, Quizlet
 * Features:
 * - Clean, modern layout with summary cards
 * - Password protection with unlock dialog
 * - Schedule & access control
 * - Learning resources preview
 * - Attempt state management (Start/Resume/Retake)
 * - Full i18n support
 * - Responsive design (mobile-first)
 * - Smooth animations with Framer Motion
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Clock, Target, Users, Lock, Unlock,
  BookOpen, Play, RotateCcw, AlertCircle, CheckCircle,
  FileText, Video, Image as ImageIcon, Music, Link as LinkIcon,
  Presentation, ChevronRight, Star, Trophy, Brain, TrendingUp,
  Info, ArrowLeft
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { Quiz, Question } from '../types';
import { reviewService } from '../services/reviewService';
import { QuizReviewStats } from '../types/review';
import PasswordModal from '../../../shared/components/ui/PasswordModal';
import RichTextViewer from '../../../shared/components/ui/RichTextViewer';

// 📌 Type for resource
type QuizResource = NonNullable<Quiz['resources']>[number];

// 📱 Loading skeleton
const OverviewSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3"></div>
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
          <div className="space-y-6">
            <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const QuizPreviewPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // State
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewStats, setReviewStats] = useState<QuizReviewStats | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [pendingAction, setPendingAction] = useState<'start' | 'resume' | null>(null);

  // 🔐 Password check
  const isLocked = useMemo(() => {
    if (!quiz) return false;
    return (
      (quiz.visibility === 'password' || quiz.havePassword === 'password') &&
      !passwordVerified
    );
  }, [quiz, passwordVerified]);

  // 📊 Fetch quiz data
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const quizDoc = await getDoc(doc(db, 'quizzes', id));
        
        if (!quizDoc.exists()) {
          setError(t('quizOverview.errors.notFound', 'Quiz not found'));
          return;
        }
        
        const quizData = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
        setQuiz(quizData);
        
        // Fetch review stats
        try {
          const stats = await reviewService.getQuizReviewStats(id);
          setReviewStats(stats);
        } catch (err) {
          console.error('Error fetching review stats:', err);
        }
      } catch (err) {
        console.error('Error fetching quiz:', err);
        setError(t('quizOverview.errors.loadFailed', 'Failed to load quiz'));
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [id, t]);

  // 🎯 Handle start quiz
  const handleStartQuiz = (action: 'start' | 'resume' = 'start') => {
    if (!quiz) return;

    if (isLocked) {
      setPendingAction(action);
      setShowPasswordModal(true);
      return;
    }

    // Navigate to quiz page
    navigate(`/quiz/${quiz.id}`);
  };

  // 🔓 Handle password success
  const handlePasswordSuccess = () => {
    setShowPasswordModal(false);
    setPasswordVerified(true);
    
    if (pendingAction && quiz) {
      navigate(`/quiz/${quiz.id}`);
      setPendingAction(null);
    }
  };

  // 🎨 Helper functions
  const getDifficultyConfig = (difficulty: 'easy' | 'medium' | 'hard' | undefined) => {
    const configs: Record<'easy' | 'medium' | 'hard', { label: string; icon: string; className: string }> = {
      easy: {
        label: t('quizOverview.difficulty.easy', 'Easy'),
        icon: '😊',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
      },
      medium: {
        label: t('quizOverview.difficulty.medium', 'Medium'),
        icon: '🤔',
        className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
      },
      hard: {
        label: t('quizOverview.difficulty.hard', 'Hard'),
        icon: '🔥',
        className: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
      }
    };
    return configs[difficulty || 'easy'];
  };

  const getResourceIcon = (type: string) => {
    const icons = {
      video: Video,
      pdf: FileText,
      image: ImageIcon,
      audio: Music,
      link: LinkIcon,
      slides: Presentation
    };
    return icons[type as keyof typeof icons] || FileText;
  };

  // ⏳ Loading state
  if (loading) {
    return <OverviewSkeleton />;
  }

  // 🚫 Early return - ensures quiz is not null below
  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-800"
        >
          <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t('quizOverview.errors.title', 'Quiz Not Found')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error || t('quizOverview.errors.description', 'The quiz you are looking for does not exist or has been removed.')}
          </p>
          <Link
            to="/quizzes"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('quizOverview.actions.backToQuizzes', 'Back to Quizzes')}
          </Link>
        </motion.div>
      </div>
    );
  }

  const difficultyConfig = getDifficultyConfig(quiz.difficulty);
  const hasResources = quiz.resources && quiz.resources.length > 0;
  const averageRating = reviewStats?.averageRating || 0;
  const totalReviews = reviewStats?.totalReviews || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      {/* 🍞 Breadcrumb */}
      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link
              to="/quizzes"
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {t('quizOverview.breadcrumb.quizzes', 'Quizzes')}
            </Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-slate-900 dark:text-white font-medium truncate">
              {quiz.title}
            </span>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* 🎯 Hero Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          {/* Category & Difficulty Badges */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800">
              {t(`categories.${quiz.category}`, quiz.category)}
            </span>
            <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${difficultyConfig.className}`}>
              {difficultyConfig.icon} {difficultyConfig.label}
            </span>
            {isLocked && (
              <span className="px-4 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                {t('quizOverview.status.locked', 'Password Protected')}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
            {quiz.title}
          </h1>

          {/* Description */}
          {quiz.description && (
            <div className="text-lg text-slate-600 dark:text-slate-300 mb-6 prose prose-slate dark:prose-invert max-w-none">
              <RichTextViewer content={quiz.description} />
            </div>
          )}

          {/* Rating & Stats */}
          <div className="flex flex-wrap items-center gap-6 text-sm">
            {totalReviews > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-slate-900 dark:text-white font-semibold">
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  ({t('quizOverview.stats.reviews', '{{count}} reviews', { count: totalReviews })})
                </span>
              </div>
            )}
            {quiz.totalPlayers !== undefined && quiz.totalPlayers > 0 && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Users className="w-4 h-4" />
                <span>
                  {t('quizOverview.stats.players', '{{count}} players', { count: quiz.totalPlayers })}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* 📊 Main Grid */}
        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          {/* Left Column */}
          <div className="space-y-6">
            {/* 📋 Instructions/Rules */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
            >
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                {t('quizOverview.sections.overview', 'Quiz Overview')}
              </h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Time Limit */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {quiz.duration}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {t('quizOverview.facts.minutes', 'minutes')}
                  </div>
                </div>

                {/* Questions */}
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {quiz.questions?.length || 0}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {t('quizOverview.facts.questions', 'questions')}
                  </div>
                </div>

                {/* Difficulty */}
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-100 dark:border-amber-900">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {difficultyConfig.icon}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {difficultyConfig.label}
                  </div>
                </div>

                {/* Players */}
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl border border-purple-100 dark:border-purple-900">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {quiz.totalPlayers || 0}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {t('quizOverview.facts.players', 'players')}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 📚 Learning Resources */}
            {hasResources && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
              >
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  {t('quizOverview.resources.title', 'Learning Materials')}
                  <span className="ml-auto text-sm font-normal text-slate-500">
                    {quiz.resources?.length} {t('quizOverview.resources.items', 'items')}
                  </span>
                </h2>

                <div className="space-y-3">
                  {quiz.resources?.map((resource: QuizResource, index: number) => {
                    const ResourceIcon = getResourceIcon(resource.type);
                    return (
                      <motion.a
                        key={resource.id || index}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 * index }}
                        whileHover={{ scale: 1.02 }}
                        className="group flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                          <ResourceIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {resource.title}
                          </h3>
                          {resource.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                              {resource.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="px-2 py-1 bg-white dark:bg-slate-700 rounded capitalize">
                              {resource.type}
                            </span>
                            {resource.estimatedTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {resource.estimatedTime} {t('quizOverview.resources.minutes', 'min')}
                              </span>
                            )}
                            {resource.required && (
                              <span className="px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded font-medium">
                                {t('quizOverview.resources.required', 'Required')}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex-shrink-0" />
                      </motion.a>
                    );
                  })}
                </div>

                {quiz.quizType === 'with-materials' && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl">
                    <p className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {t('quizOverview.resources.tip', 'Review these materials before taking the quiz for better results.')}
                      </span>
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* 📝 Questions Preview */}
            {quiz.questions && quiz.questions.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
              >
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  {t('quizOverview.sections.questionsPreview', 'Questions Preview')}
                  <span className="ml-auto text-sm font-normal text-slate-500">
                    {quiz.questions.length} {t('quizOverview.facts.total', 'total')}
                  </span>
                </h2>

                <div className="space-y-3">
                  {quiz.questions.slice(0, 3).map((question: Question, index: number) => (
                    <div
                      key={question.id || index}
                      className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-900 dark:text-white font-medium line-clamp-2">
                            {question.text}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="px-2 py-1 bg-white dark:bg-slate-700 rounded capitalize">
                              {question.type}
                            </span>
                            <span className="flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              {question.points} {t('quizOverview.facts.points', 'pts')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {quiz.questions.length > 3 && (
                    <div className="text-center py-3 text-sm text-slate-500 dark:text-slate-400">
                      {t('quizOverview.sections.moreQuestions', 'and {{count}} more questions...', {
                        count: quiz.questions.length - 3
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Sticky Sidebar */}
          <div className="space-y-6">
            {/* 🎯 CTA Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-6 sticky top-24"
            >
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                {t('quizOverview.cta.title', 'Ready to Start?')}
              </h3>

              {/* Unlock Section */}
              {isLocked ? (
                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
                        {t('quizOverview.access.locked', 'This quiz is password protected')}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        {t('quizOverview.access.unlockRequired', 'Enter password to start')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
                        {t('quizOverview.access.ready', 'Ready to start')}
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                        {t('quizOverview.access.noRestrictions', 'No restrictions')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Start Button */}
              <motion.button
                whileHover={{ scale: isLocked ? 1 : 1.02 }}
                whileTap={{ scale: isLocked ? 1 : 0.98 }}
                onClick={() => handleStartQuiz('start')}
                className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                  isLocked
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                }`}
              >
                {isLocked ? (
                  <>
                    <Unlock className="w-6 h-6" />
                    {t('quizOverview.cta.unlock', 'Unlock Quiz')}
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    {t('quizOverview.cta.start', 'Start Quiz')}
                  </>
                )}
              </motion.button>

              {/* Retake Button (if applicable) */}
              {!isLocked && quiz.allowRetake && (
                <button
                  onClick={() => handleStartQuiz('resume')}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                  {t('quizOverview.cta.retake', 'Retake Quiz')}
                </button>
              )}
            </motion.div>

            {/* 📊 Stats Card */}
            {(quiz.averageScore !== undefined || quiz.totalPlayers !== undefined) && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl shadow-sm border border-green-200 dark:border-green-900 p-6"
              >
                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  {t('quizOverview.stats.title', 'Statistics')}
                </h3>

                <div className="space-y-4">
                  {quiz.totalPlayers !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {t('quizOverview.stats.totalPlayers', 'Total Players')}
                        </span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          {quiz.totalPlayers}
                        </span>
                      </div>
                    </div>
                  )}

                  {quiz.averageScore !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {t('quizOverview.stats.avgScore', 'Average Score')}
                        </span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          {Math.round(quiz.averageScore)}%
                        </span>
                      </div>
                      <div className="w-full bg-green-200 dark:bg-green-900/30 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${quiz.averageScore}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* 🔐 Password Modal */}
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
