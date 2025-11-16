/**
 * 🎯 Quiz Overview Page - Modern Design
 * 
 * Inspired by: Quizizz, Kahoot
 * Features:
 * - Modern, 2-column layout with a sticky sidebar
 * - Prominent cover image
 * - Creator info (avatar, name, last updated)
 * - Clear stat cards for key quiz metrics
 * - Centralized and improved Call-to-Action (CTA) section
 * - Full i18n support & responsive design
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Clock, Target, Users,
  BookOpen, Play, AlertCircle, Star, Brain,
  ArrowLeft, Settings, FileText, Video, Image as ImageIcon, Music, Link as LinkIcon, Presentation, Trophy, ChevronRight, ChevronDown,
  Eye, Activity, Percent, Share2, Repeat, ShieldCheck, Globe
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { Quiz, Question } from '../types';
import { reviewService } from '../services/reviewService';
import { QuizReviewStats } from '../types/review';
import RichTextViewer from '../../../shared/components/ui/RichTextViewer';
import QuizSettingsModal, { QuizSettings } from '../components/QuizSettingsModal';

type QuizResource = NonNullable<Quiz['resources']>[number];

const COVER_PLACEHOLDER = '/images/quiz-cover-placeholder.svg';

const QUESTION_TYPE_FALLBACKS: Record<Question['type'], string> = {
  multiple: 'Multiple choice',
  boolean: 'True/False',
  short_answer: 'Short answer',
  image: 'Image choice',
  checkbox: 'Multiple answers',
  rich_content: 'Rich content',
  audio: 'Audio comprehension',
  ordering: 'Ordering',
  matching: 'Matching pairs',
  fill_blanks: 'Fill in the blanks'
};

// 📱 Modern Loading Skeleton
const OverviewSkeleton: React.FC = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl space-y-4">
              <div className="h-8 bg-slate-300 dark:bg-slate-700 rounded w-3/4"></div>
              <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-full"></div>
              <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-5/6"></div>
              <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-slate-300 dark:bg-slate-700 rounded"></div>
                    <div className="h-3 w-32 bg-slate-300 dark:bg-slate-700 rounded"></div>
                  </div>
                </div>
                <div className="h-6 w-28 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-white dark:bg-slate-900 rounded-xl"></div>
              <div className="h-24 bg-white dark:bg-slate-900 rounded-xl"></div>
              <div className="h-24 bg-white dark:bg-slate-900 rounded-xl"></div>
              <div className="h-24 bg-white dark:bg-slate-900 rounded-xl"></div>
            </div>
            <div className="h-64 bg-white dark:bg-slate-900 rounded-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const QuizPreviewPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activeLocale = useMemo(
    () => i18n.language || (typeof navigator !== 'undefined' ? navigator.language : 'en'),
    [i18n.language]
  );
  
  // State
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewStats, setReviewStats] = useState<QuizReviewStats | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [quizSettings, setQuizSettings] = useState<QuizSettings | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [creatorDisplayName, setCreatorDisplayName] = useState<string>('');

  const shareUrl = useMemo(() => {
    if (!quiz) return '';
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    const tokenPart = quiz.shareToken ? `?token=${quiz.shareToken}` : '';
    return `${baseUrl}/quiz/${quiz.id}${tokenPart}`;
  }, [quiz]);

  useEffect(() => {
    setLinkCopied(false);
  }, [shareUrl]);

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
        
        // Fetch creator's displayName from users collection
        if (quizData.createdBy) {
          try {
            const creatorDoc = await getDoc(doc(db, 'users', quizData.createdBy));
            if (creatorDoc.exists()) {
              const creatorData = creatorDoc.data();
              setCreatorDisplayName(creatorData.displayName || creatorData.email || 'Anonymous');
            } else {
              setCreatorDisplayName(quizData.author || 'Anonymous');
            }
          } catch (err) {
            console.error('Error fetching creator info:', err);
            setCreatorDisplayName(quizData.author || 'Anonymous');
          }
        }
        
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
  const handleStartQuiz = () => {
    if (!quiz) return;

    // Save settings to pass to quiz page
    if (quizSettings && quiz.id) {
      localStorage.setItem(`quiz_settings_${quiz.id}`, JSON.stringify(quizSettings));
    }

    // Navigate to quiz page (password already unlocked at QuizList)
    navigate(`/quiz/${quiz.id}`);
  };

  // 🎨 Handle settings save
  const handleSettingsSave = (settings: QuizSettings) => {
    setQuizSettings(settings);
    if (quiz?.id) {
      localStorage.setItem(`quiz_settings_${quiz.id}`, JSON.stringify(settings));
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else if (typeof document !== 'undefined') {
        const tempInput = document.createElement('textarea');
        tempInput.value = shareUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (copyError) {
      console.error('Failed to copy share link', copyError);
    }
  };

  const handleQuestionToggle = (questionId: string | number) => {
    setExpandedQuestionId((prev) => (prev === String(questionId) ? null : String(questionId)));
  };
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      try {
        return new Intl.NumberFormat(activeLocale, options).format(value);
      } catch (err) {
        console.error('Error formatting number:', err);
        return value.toString();
      }
    },
    [activeLocale]
  );

  const formatPercentage = useCallback(
    (value?: number | null, options?: Intl.NumberFormatOptions) => {
      if (typeof value !== 'number') {
        return '—';
      }
      return `${formatNumber(value, { maximumFractionDigits: 1, ...options })}%`;
    },
    [formatNumber]
  );

  const formatDateLabel = useCallback(
    (value?: unknown, options?: Intl.DateTimeFormatOptions) => {
      if (!value) {
        return t('quizOverview.meta.notAvailable', 'N/A');
      }

      let dateValue: Date | null = null;

      if (value instanceof Date) {
        dateValue = value;
      } else if (typeof value === 'object' && value !== null) {
        const typedValue = value as { toDate?: () => Date; seconds?: number };
        if (typeof typedValue.toDate === 'function') {
          dateValue = typedValue.toDate();
        } else if (typeof typedValue.seconds === 'number') {
          dateValue = new Date(typedValue.seconds * 1000);
        }
      }

      if (!dateValue && (typeof value === 'string' || typeof value === 'number')) {
        dateValue = new Date(value);
      }

      if (!dateValue || Number.isNaN(dateValue.getTime())) {
        return t('quizOverview.meta.notAvailable', 'N/A');
      }

      try {
        return new Intl.DateTimeFormat(activeLocale, options ?? { dateStyle: 'medium' }).format(dateValue);
      } catch (err) {
        console.error('Error formatting date:', err);
        return dateValue.toLocaleDateString();
      }
    },
    [activeLocale, t]
  );

  const getQuestionTypeLabel = (type?: Question['type']) => {
    if (!type) {
      return t('quizOverview.questionTypes.unknown', 'Question');
    }
    return t(`quizOverview.questionTypes.${type}`, QUESTION_TYPE_FALLBACKS[type] || type);
  };

  const getQuestionDifficultyLabel = (difficulty?: Question['difficulty']) => {
    if (!difficulty) {
      return t('quizOverview.meta.notAvailable', 'N/A');
    }
    return t(`quizOverview.difficulty.${difficulty}`, difficulty);
  };

  // 🎨 Helper functions
  const getDifficultyConfig = (difficulty: 'easy' | 'medium' | 'hard' | undefined) => {
    const configs: Record<'easy' | 'medium' | 'hard', { label: string; icon: string; className: string; textClass: string }> = {
      easy: {
        label: t('quizOverview.difficulty.easy', 'Easy'),
        icon: '😊',
        className: 'border-emerald-300 dark:border-emerald-700',
        textClass: 'text-emerald-600 dark:text-emerald-400'
      },
      medium: {
        label: t('quizOverview.difficulty.medium', 'Medium'),
        icon: '🤔',
        className: 'border-amber-400 dark:border-amber-700',
        textClass: 'text-amber-600 dark:text-amber-400'
      },
      hard: {
        label: t('quizOverview.difficulty.hard', 'Hard'),
        icon: '🔥',
        className: 'border-rose-400 dark:border-rose-700',
        textClass: 'text-rose-600 dark:text-rose-400'
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

  const getResourceTypeLabel = (type: QuizResource['type']) => {
    return t(`quizOverview.resources.type.${type}`, t(`quizOverview.resources.type.default`, 'Resource'));
  };

  // ⏳ Loading state
  if (loading) {
    return <OverviewSkeleton />;
  }

  // 🚫 Error state
  if (!quiz) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
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

  const anonymousLabel = t('quizOverview.meta.anonymous', 'Anonymous');
  const creator = {
    name: creatorDisplayName || quiz.author || anonymousLabel,
    avatarUrl: `https://api.dicebear.com/8.x/lorelei/svg?seed=${quiz.createdBy || quiz.authorId || 'anonymous'}`,
    lastUpdated: formatDateLabel(quiz.updatedAt)
  };

  const tags = quiz.tags?.filter(Boolean) ?? [];
  const visibilityValue = quiz.visibility || quiz.privacy || 'public';
  const visibilityLabel = t(`quizOverview.visibility.${visibilityValue}`, visibilityValue);
  const quizTypeLabel = quiz.quizType === 'with-materials'
    ? t('quizOverview.quizType.withMaterials', 'With study materials')
    : t('quizOverview.quizType.standard', 'Standard quiz');
  const formattedCreatedAt = formatDateLabel(quiz.createdAt);
  const attemptsValue = quiz.attempts ?? quiz.totalPlayers ?? 0;
  const completionRateValue = quiz.completionRate;
  const averageScoreValue = quiz.averageScore;
  const questionCount = quiz.questions?.length ?? 0;
  const hasQuestions = questionCount > 0;

  const statusBadges = [
    quiz.featured
      ? {
          label: t('quizOverview.badges.featured', 'Featured'),
          className: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800'
        }
      : null,
    quiz.status
      ? {
          label: t(`quizOverview.status.${quiz.status}`, quiz.status),
          className: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700'
        }
      : null,
    quiz.quizType
      ? {
          label: quizTypeLabel,
          className: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800'
        }
      : null,
    visibilityValue
      ? {
          label: visibilityLabel,
          className: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800'
        }
      : null
  ].filter(Boolean) as Array<{ label: string; className: string }>;

  const insightStats = [
    {
      label: t('quizOverview.insights.views', 'Views'),
      value: formatNumber(quiz.views ?? 0),
      icon: Eye,
      accent: 'text-sky-500',
      background: 'bg-sky-50 dark:bg-sky-900/20',
      subLabel: t('quizOverview.insights.viewsSub', 'All-time')
    },
    {
      label: t('quizOverview.insights.attempts', 'Attempts'),
      value: formatNumber(attemptsValue),
      icon: Repeat,
      accent: 'text-emerald-500',
      background: 'bg-emerald-50 dark:bg-emerald-900/20',
      subLabel: quiz.allowRetake
        ? t('quizOverview.insights.retakeAllowed', 'Retakes allowed')
        : t('quizOverview.insights.singleAttempt', 'Single attempt')
    },
    {
      label: t('quizOverview.insights.avgScore', 'Avg. Score'),
      value: formatPercentage(averageScoreValue),
      icon: Activity,
      accent: 'text-orange-500',
      background: 'bg-orange-50 dark:bg-orange-900/20',
      subLabel: t('quizOverview.insights.outOfHundred', 'Out of 100')
    },
    {
      label: t('quizOverview.insights.completion', 'Completion'),
      value: formatPercentage(completionRateValue),
      icon: Percent,
      accent: 'text-fuchsia-500',
      background: 'bg-fuchsia-50 dark:bg-fuchsia-900/20',
      subLabel: t('quizOverview.insights.completionSub', 'Completion rate')
    }
  ];

  const metaInfoItems = [
    {
      label: t('quizOverview.meta.category', 'Category'),
      value: t(`categories.${quiz.category}`, quiz.category)
    },
    {
      label: t('quizOverview.meta.created', 'Created on'),
      value: formattedCreatedAt
    },
    {
      label: t('quizOverview.meta.updated', 'Last updated'),
      value: creator.lastUpdated
    },
    {
      label: t('quizOverview.meta.quizType', 'Quiz type'),
      value: quizTypeLabel
    }
  ];

  const accessDetails = [
    {
      label: t('quizOverview.access.visibility', 'Visibility'),
      value: visibilityLabel,
      icon: Globe
    },
    {
      label: t('quizOverview.access.security', 'Security'),
      value: (quiz.visibility === 'password' || quiz.havePassword === 'password')
        ? t('quizOverview.access.password', 'Password protected')
        : t('quizOverview.access.open', 'Open access'),
      icon: ShieldCheck
    },
    {
      label: t('quizOverview.access.retake', 'Retake policy'),
      value: quiz.allowRetake
        ? t('quizOverview.access.retakeAllowed', 'Retakes allowed')
        : t('quizOverview.access.retakeDisabled', 'Single attempt'),
      icon: Repeat
    },
    {
      label: t('quizOverview.access.type', 'Mode'),
      value: quizTypeLabel,
      icon: BookOpen
    }
  ];
  const coverAltText = t('quizOverview.cover.alt', '{{title}} cover image', { title: quiz.title });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container max-w-5xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            to="/quizzes"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('quizOverview.actions.backToQuizzes', 'Back to Quizzes')}
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              <div className="relative rounded-2xl overflow-hidden shadow-lg h-64">
                <img 
                  src={quiz.coverImage || COVER_PLACEHOLDER} 
                  alt={coverAltText}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    if (e.currentTarget.src !== COVER_PLACEHOLDER) {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = COVER_PLACEHOLDER;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium border border-white/30">
                    {t(`categories.${quiz.category}`, quiz.category)}
                  </span>
                  {quiz.featured && (
                    <span className="px-3 py-1 bg-amber-400/90 text-amber-950 rounded-full text-sm font-semibold shadow-lg">
                      {t('quizOverview.badges.featured', 'Featured')}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3 leading-tight">
                  {quiz.title}
                </h1>
                {quiz.description && (
                  <div className="text-slate-600 dark:text-slate-300 prose prose-slate dark:prose-invert max-w-none">
                    <RichTextViewer content={quiz.description} />
                  </div>
                )}

                {statusBadges.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {statusBadges.map((badge, index) => (
                      <span
                        key={`${badge.label}-${index}`}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                )}

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <img 
                      src={creator.avatarUrl} 
                      alt={t('quizOverview.meta.creatorAvatar', '{{name}}\'s avatar', { name: creator.name })} 
                      className="w-10 h-10 rounded-full bg-slate-200" 
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{creator.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('quizOverview.stats.lastUpdated', 'Last updated')}: {creator.lastUpdated}
                      </p>
                    </div>
                  </div>
                  {totalReviews > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= Math.round(averageRating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-slate-900 dark:text-white font-semibold">
                        {formatNumber(averageRating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        ({t('quizOverview.stats.reviews', '{{count}} reviews', { count: totalReviews })})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t('quizOverview.insights.titleSub', 'Performance overview')}
                    </p>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {t('quizOverview.insights.title', 'Key insights')}
                    </h2>
                  </div>
                  <Trophy className="w-6 h-6 text-amber-500" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {insightStats.map((stat) => {
                    const StatIcon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className={`rounded-xl border border-slate-200 dark:border-slate-800 p-4 ${stat.background}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{stat.label}</p>
                          <StatIcon className={`w-5 h-5 ${stat.accent}`} />
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.subLabel}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-dashed border-slate-200 dark:border-slate-800">
                  {metaInfoItems.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {item.label}
                      </p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>

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
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ResourceIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {resource.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              {getResourceTypeLabel(resource.type)}
                            </span>
                            {resource.estimatedTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {t('quizOverview.resources.estimated', '{{minutes}} min', {
                                  minutes: formatNumber(resource.estimatedTime)
                                })}
                              </span>
                            )}
                          </div>
                          {resource.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                              {resource.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex-shrink-0 self-center" />
                      </motion.a>
                    );
                  })}
                </div>
                </motion.div>
              )}

              {hasQuestions && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
                >
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t('quizOverview.sections.questionsPreview', 'Questions Preview')}
                        </p>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                          {t('quizOverview.sections.questionsFull', 'All questions')}
                        </h2>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {t('quizOverview.sections.totalQuestions', '{{countFormatted}} questions', {
                        count: questionCount,
                        countFormatted: formatNumber(questionCount)
                      })}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {quiz.questions.map((question: Question, index: number) => {
                      const questionKey = question.id || `question-${index}`;
                      const normalizedQuestionId = String(questionKey);
                      const isExpanded = expandedQuestionId === normalizedQuestionId;
                      const answers = question.answers || [];
                      return (
                        <div
                          key={normalizedQuestionId}
                          className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                                {formatNumber(index + 1)}
                              </div>
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="text-slate-900 dark:text-white font-medium">
                                  {question.richText ? (
                                    <RichTextViewer content={question.richText} />
                                  ) : (
                                    <p className="text-slate-900 dark:text-white">
                                      {question.text || t('quizOverview.sections.emptyQuestion', 'Untitled question')}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="px-2 py-1 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                                    {getQuestionTypeLabel(question.type)}
                                  </span>
                                  {question.difficulty && (
                                    <span className="px-2 py-1 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                                      {t('quizOverview.sections.questionDifficulty', 'Difficulty')}: {getQuestionDifficultyLabel(question.difficulty)}
                                    </span>
                                  )}
                                  <span className="px-2 py-1 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                                    <Trophy className="w-3 h-3" />
                                    {formatNumber(question.points ?? 0)} {t('quizOverview.facts.points', 'pts')}
                                  </span>
                                  {answers.length > 0 && (
                                    <span className="px-2 py-1 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                                      {t('quizOverview.sections.answerCount', '{{countFormatted}} answers', {
                                        count: answers.length,
                                        countFormatted: formatNumber(answers.length)
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleQuestionToggle(normalizedQuestionId)}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                              aria-expanded={isExpanded}
                            >
                              <span>
                                {isExpanded
                                  ? t('quizOverview.sections.collapseQuestion', 'Hide details')
                                  : t('quizOverview.sections.expandQuestion', 'Show details')}
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700 space-y-4">
                              {answers.length > 0 ? (
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    {t('quizOverview.sections.answersLabel', 'Answer choices')}
                                  </p>
                                  <div className="mt-2 space-y-2">
                                    {answers.map((answer, answerIndex) => (
                                      <div
                                        key={answer.id || answerIndex}
                                        className={`p-3 rounded-lg border ${
                                          answer.isCorrect
                                            ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50/70 dark:bg-emerald-900/20'
                                            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800'
                                        }`}
                                      >
                                        <div className="flex flex-col gap-2">
                                          {answer.richText ? (
                                            <RichTextViewer content={answer.richText} />
                                          ) : (
                                            <p className="text-sm text-slate-700 dark:text-slate-200">
                                              {answer.text || t('quizOverview.sections.answerPlaceholder', 'No answer text provided')}
                                            </p>
                                          )}
                                          {answer.isCorrect && (
                                            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                              <ShieldCheck className="w-3 h-3" />
                                              {t('quizOverview.sections.correctAnswer', 'Correct answer')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {t('quizOverview.sections.noAnswers', 'No answers provided for this question.')}
                                </p>
                              )}

                              {(question.explanation || question.richExplanation) && (
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                                    {t('quizOverview.sections.explanationLabel', 'Explanation')}
                                  </p>
                                  {question.richExplanation ? (
                                    <RichTextViewer content={question.richExplanation} />
                                  ) : (
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                      {question.explanation}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6 sticky top-8 self-start">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                  <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(quiz.duration ?? 0)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t('quizOverview.facts.minutes', 'minutes')}</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                  <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(questionCount)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t('quizOverview.facts.questions', 'questions')}</div>
                </div>
                <div className={`p-4 bg-white dark:bg-slate-900 rounded-xl border-2 ${difficultyConfig.className} shadow-sm text-center`}>
                  <span className="text-3xl">{difficultyConfig.icon}</span>
                  <div className={`font-bold ${difficultyConfig.textClass}`}>{difficultyConfig.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t('quizOverview.difficulty.title', 'Difficulty')}</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(quiz.totalPlayers ?? 0)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t('quizOverview.facts.players', 'players')}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 text-center">
                  {t('quizOverview.cta.title', 'Ready to Start?')}
                </h3>

                <div className="space-y-3">
                  {/* Primary Action: Start Quiz */}
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleStartQuiz}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  >
                    <Play className="w-6 h-6" />
                    <span>{t('quizOverview.cta.start', 'Start Quiz')}</span>
                  </motion.button>

                  {/* Secondary Actions: Flashcards */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/quiz/${quiz.id}/flashcards`)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border-2 border-purple-200 dark:border-purple-900 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-300 rounded-xl font-semibold transition-all"
                  >
                    <Brain className="w-5 h-5" />
                    <span>{t('quizOverview.cta.flashcards', 'Flashcards')}</span>
                  </motion.button>

                  {/* Settings */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowSettingsModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-all"
                  >
                    <Settings className="w-5 h-5" />
                    <span>{t('quizOverview.cta.settings', 'Settings')}</span>
                  </motion.button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t('quizOverview.access.title', 'Access & Sharing')}
                    </p>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                      {t('quizOverview.access.subtitle', 'Control how players join')}
                    </h4>
                  </div>
                  <ShieldCheck className="w-6 h-6 text-emerald-500" />
                </div>

                <div className="space-y-4">
                  {accessDetails.map((detail) => {
                    const DetailIcon = detail.icon;
                    return (
                      <div key={detail.label} className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <DetailIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {detail.label}
                          </p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {detail.value}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                    {t('quizOverview.access.shareLabel', 'Share link')}
                  </p>
                  <p className="text-sm font-mono text-slate-700 dark:text-slate-100 break-all">
                    {shareUrl && quiz.isPublished !== false
                      ? shareUrl
                      : t('quizOverview.access.noShareLink', 'Share link will be available after publishing')}
                  </p>
                  {shareUrl && quiz.isPublished !== false && (
                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                    >
                      <Share2 className="w-4 h-4" />
                      {linkCopied
                        ? t('quizOverview.access.copied', 'Copied!')
                        : t('quizOverview.access.copyLink', 'Copy share link')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      {quiz && showSettingsModal && (
        <QuizSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSettingsSave}
          currentSettings={quizSettings || undefined}
          quizId={quiz.id}
        />
      )}
    </div>
  );
};

export default QuizPreviewPage;
