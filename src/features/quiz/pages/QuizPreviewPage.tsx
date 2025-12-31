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
  ArrowLeft, Settings, FileText, Video, Image as ImageIcon, Music, Link as LinkIcon, Presentation, Trophy, ChevronDown, ChevronUp,
  Eye, Activity, Percent, Share2, Repeat, ShieldCheck, Globe
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { Quiz, Question } from '../types';
import { reviewService } from '../services/reviewService';
import { QuizReviewStats } from '../types/review';
import RichTextViewer from '../../../shared/components/ui/RichTextViewer';
import QuizSettingsModal, { QuizSettings } from '../components/QuizSettingsModal';
import ImageViewer from '../../../shared/components/ui/ImageViewer';
import PDFViewer from '../../../shared/components/ui/PDFViewer';
import AudioPlayer from '../../../shared/components/ui/AudioPlayer';

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
  video: 'Video comprehension',
  multimedia: 'Multimedia',
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
  const { t, i18n, ready } = useTranslation('common', { useSuspense: false });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = React.useState(() => new URLSearchParams(window.location.search));
  const isOfflineMode = searchParams.get('offline') === 'true';
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
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [creatorDisplayName, setCreatorDisplayName] = useState<string>('');
  const [creatorPhotoURL, setCreatorPhotoURL] = useState<string>('');
  const [currentViewers, setCurrentViewers] = useState<number>(0);
  const [activePlayers, setActivePlayers] = useState<number>(0);
  const [realAverageScore, setRealAverageScore] = useState<number>(0); // Real average from quizResults
  
  // Resource viewer state
  const [selectedResource, setSelectedResource] = useState<QuizResource | null>(null);
  const [resourceViewerType, setResourceViewerType] = useState<string | null>(null);

  const handleViewResource = (resource: QuizResource) => {
    setSelectedResource(resource);
    setResourceViewerType(resource.type);
  };

  const closeResourceViewer = () => {
    setSelectedResource(null);
    setResourceViewerType(null);
  };

  const shareUrl = useMemo(() => {
    if (!quiz) return '';
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    const tokenPart = quiz.shareToken ? `?token=${quiz.shareToken}` : '';
    return `${baseUrl}/quiz/${quiz.id}/preview${tokenPart}`;
  }, [quiz]);

  useEffect(() => {
    setLinkCopied(false);
  }, [shareUrl]);

  // 🔥 Real-time presence tracking
  useEffect(() => {
    if (!id) return;
    
    let unsubscribe: (() => void) | undefined;
    
    const setupPresence = async () => {
      try {
        const { quizPresenceService } = await import('../../../services/quizPresenceService');
        const { auth } = await import('../../../lib/firebase/config');
        
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Join as viewer
          const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous';
          await quizPresenceService.joinQuiz(id, currentUser.uid, userName, false);
          
          // Subscribe to presence updates
          unsubscribe = quizPresenceService.subscribeToQuizPresence(id, (presence) => {
            setCurrentViewers(presence.currentViewers);
            setActivePlayers(presence.activePlayers);
          });
          
          // Track view in stats (only once)
          const { quizStatsService } = await import('../../../services/quizStatsService');
          await quizStatsService.trackView(id, currentUser.uid);
        } else {
          // Anonymous viewer - just subscribe
          unsubscribe = quizPresenceService.subscribeToQuizPresence(id, (presence) => {
            setCurrentViewers(presence.currentViewers);
            setActivePlayers(presence.activePlayers);
          });
          
          // Track anonymous view
          const { quizStatsService } = await import('../../../services/quizStatsService');
          await quizStatsService.trackView(id);
        }
      } catch (error) {
        console.error('Error setting up presence:', error);
      }
    };
    
    setupPresence();
    
    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      
      // Leave quiz
      const cleanup = async () => {
        try {
          const { quizPresenceService } = await import('../../../services/quizPresenceService');
          const { auth } = await import('../../../lib/firebase/config');
          const currentUser = auth.currentUser;
          if (currentUser && id) {
            await quizPresenceService.leaveQuiz(id, currentUser.uid);
          }
        } catch (error) {
          console.error('Error leaving quiz:', error);
        }
      };
      cleanup();
    };
  }, [id]);

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
        
        // 🔍 Debug: Log quiz stats
        console.log('📊 Quiz stats loaded:', {
          quizId: quizData.id,
          stats: quizData.stats,
          views: quizData.stats?.views,
          attempts: quizData.stats?.attempts,
          completions: quizData.stats?.completions,
          averageScore: quizData.stats?.averageScore,
          completionRate: quizData.stats?.completionRate
        });
        
        setQuiz(quizData);
        
        // Fetch creator's displayName and photoURL from users collection
        if (quizData.createdBy) {
          try {
            const creatorDoc = await getDoc(doc(db, 'users', quizData.createdBy));
            if (creatorDoc.exists()) {
              const creatorData = creatorDoc.data();
              setCreatorDisplayName(creatorData.displayName || creatorData.email || 'Anonymous');
              setCreatorPhotoURL(creatorData.photoURL || '');
            } else {
              setCreatorDisplayName(quizData.author || 'Anonymous');
              setCreatorPhotoURL('');
            }
          } catch (err) {
            console.error('Error fetching creator info:', err);
            setCreatorDisplayName(quizData.author || 'Anonymous');
            setCreatorPhotoURL('');
          }
        }
        
        // Fetch review stats
        try {
          const stats = await reviewService.getQuizReviewStats(id);
          setReviewStats(stats);
        } catch (err) {
          console.error('Error fetching review stats:', err);
        }
        
        // Fetch real average score from quizResults (most accurate)
        try {
          const { quizStatsService } = await import('../../../services/quizStatsService');
          const realStats = await quizStatsService.getRealAverageScore(id);
          setRealAverageScore(realStats.averageScore);
          console.log('📊 Real average score from quizResults:', realStats);
        } catch (err) {
          console.error('Error fetching real average score:', err);
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

    // Navigate to quiz page, preserve offline mode if present
    const quizUrl = isOfflineMode ? `/quiz/${quiz.id}?offline=true` : `/quiz/${quiz.id}`;
    navigate(quizUrl);
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

      // ⚠️ REMOVED: Don't check for serverTimestamp placeholder
      // Let Firestore SDK handle it - if it's still a placeholder, skip it
      // This can happen if document was just created and not refetched
      if (typeof value === 'object' && value !== null && (value as any)._methodName === 'serverTimestamp') {
        // Don't return N/A immediately - try to handle it as timestamp
        console.warn('⚠️ Found serverTimestamp placeholder, this should not happen in read operations');
      }

      let dateValue: Date | null = null;

      if (value instanceof Date) {
        dateValue = value;
      } else if (typeof value === 'object' && value !== null) {
        const typedValue = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
        
        // Try toDate() method first
        if (typeof typedValue.toDate === 'function') {
          try {
            dateValue = typedValue.toDate();
          } catch (err) {
            console.error('toDate() failed:', err);
          }
        }
        
        // Fallback to seconds property
        if (!dateValue && typeof typedValue.seconds === 'number') {
          dateValue = new Date(typedValue.seconds * 1000);
        }
        
        // Additional check for Firestore Timestamp structure
        if (!dateValue && typedValue.seconds && typedValue.nanoseconds !== undefined) {
          dateValue = new Date(typedValue.seconds * 1000 + typedValue.nanoseconds / 1000000);
        }
      }

      if (!dateValue && (typeof value === 'string' || typeof value === 'number')) {
        dateValue = new Date(value);
      }

      if (!dateValue || Number.isNaN(dateValue.getTime())) {
        console.log('Failed to convert to date:', value);
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

  // Ensure namespace is loaded before rendering to avoid missing-key fallbacks
  if (!ready) {
    return <OverviewSkeleton />;
  }

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
    avatarUrl: creatorPhotoURL || '/images/default-avatar.png',
    lastUpdated: formatDateLabel(quiz.updatedAt)
  };

  const tags = quiz.tags?.filter(Boolean) ?? [];
  const visibilityValue = quiz.visibility || quiz.privacy || 'public';
  const visibilityLabel = t(`quizOverview.visibility.${visibilityValue}`, visibilityValue);
  const quizTypeLabel = quiz.quizType === 'with-materials'
    ? t('quizOverview.quizType.withMaterials', 'With study materials')
    : t('quizOverview.quizType.standard', 'Standard quiz');
  const formattedCreatedAt = formatDateLabel(quiz.createdAt || quiz.updatedAt);
  const formattedUpdatedAt = formatDateLabel(quiz.updatedAt || quiz.createdAt);
  
  // Debug log
  console.log('📅 Date values:', {
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
    formattedCreatedAt,
    formattedUpdatedAt
  });
    
  // ✅ FIX: "Lượt làm" should be completions (người hoàn thành), not attempts
  const completionsValue = quiz.stats?.completions ?? 0;
  
  // ✅ FIX: Ensure percentage values are valid numbers between 0-100 (prevent NaN, Infinity, or 500%)
  const safePercentage = (value: any): number => {
    const num = Number(value);
    if (!isFinite(num) || isNaN(num)) return 0;
    return Math.min(100, Math.max(0, Math.round(num)));
  };
  
  const completionRateValue = safePercentage(quiz.stats?.completionRate);
  // Use realAverageScore if available (from quizResults), fallback to stats
  const averageScoreValue = realAverageScore > 0 ? realAverageScore : safePercentage(quiz.stats?.averageScore);
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
      value: formatNumber(quiz.stats?.views ?? quiz.views ?? 0),
      icon: Eye,
      accent: 'text-sky-500',
      background: 'bg-sky-50 dark:bg-sky-900/20',
      subLabel: t('quizOverview.insights.viewsSub', 'All-time')
    },
    {
      label: t('quizOverview.insights.completions', 'Completions'),
      value: formatNumber(completionsValue),
      icon: Repeat,
      accent: 'text-emerald-500',
      background: 'bg-emerald-50 dark:bg-emerald-900/20',
      subLabel: t('quizOverview.insights.completionsSub', 'Finished attempts')
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
      label: t('quizOverview.insights.completionRate', 'Tỷ lệ hoàn thành'),
      value: formatPercentage(completionRateValue),
      icon: Percent,
      accent: 'text-fuchsia-500',
      background: 'bg-fuchsia-50 dark:bg-fuchsia-900/20',
      subLabel: t('quizOverview.insights.completionRateSub', 'Đạt >= 50% điểm')
    }
  ];

  const metaInfoItems = [
    {
      label: t('quizOverview.meta.category', 'Category'),
      value: t(`categories.${quiz.category}`, quiz.category)
    },
    {
      label: t('quizOverview.meta.quizType', 'Quiz type'),
      value: quizTypeLabel
    },
    {
      label: t('quizOverview.meta.created', 'Created on'),
      value: formattedCreatedAt
    },
    {
      label: t('quizOverview.meta.updated', 'Last updated'),
      value: formattedUpdatedAt
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
              <div className="relative rounded-2xl overflow-hidden shadow-lg h-64 bg-gray-100 dark:bg-slate-900">
                <img 
                  src={quiz.imageUrl || quiz.coverImage || COVER_PLACEHOLDER} 
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
                    {creatorPhotoURL ? (
                      <img 
                        src={creatorPhotoURL} 
                        alt={t('quizOverview.meta.creatorAvatar', '{{name}}\'s avatar', { name: creator.name })} 
                        className="w-10 h-10 rounded-full object-cover bg-slate-200" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {(creator.name || 'A').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
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
                      <motion.div
                        key={resource.id || index}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 * index }}
                        className="group flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ResourceIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
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
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleViewResource(resource)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              {t('common.view', 'Xem')}
                            </button>
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm"
                            >
                              <LinkIcon className="w-4 h-4" />
                              {t('common.openExternal', 'Mở')}
                            </a>
                          </div>
                        </div>
                      </motion.div>
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
                    {quiz.questions.slice(0, showAllQuestions ? quiz.questions.length : 5).map((question: Question, index: number) => {
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
                              {/* Ordering Questions Preview */}
                              {question.type === 'ordering' && question.orderingItems && question.orderingItems.length > 0 ? (
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                                    {t('quizOverview.sections.orderingItems', 'Items to order')}
                                  </p>
                                  <div className="space-y-2">
                                    {[...question.orderingItems]
                                      .sort((a, b) => a.correctOrder - b.correctOrder)
                                      .map((item, idx) => (
                                        <div
                                          key={item.id}
                                          className="p-3 rounded-lg border border-green-300 dark:border-green-600 bg-green-50/70 dark:bg-green-900/20 flex items-center gap-3"
                                        >
                                          <span className="text-sm font-bold text-green-700 dark:text-green-400">{idx + 1}.</span>
                                          <p className="text-sm text-slate-700 dark:text-slate-200">{item.text}</p>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              ) : question.type === 'matching' && question.matchingPairs && question.matchingPairs.length > 0 ? (
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                                    {t('quizOverview.sections.matchingPairs', 'Pairs to match')}
                                  </p>
                                  <div className="space-y-2">
                                    {question.matchingPairs.map((pair) => (
                                      <div
                                        key={pair.id}
                                        className="p-3 rounded-lg border border-purple-300 dark:border-purple-600 bg-purple-50/70 dark:bg-purple-900/20 flex items-center gap-3"
                                      >
                                        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">{pair.left}</span>
                                        <span className="text-purple-500">↔</span>
                                        <span className="text-sm text-slate-700 dark:text-slate-200">{pair.right}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : question.type === 'fill_blanks' && question.blanks && question.blanks.length > 0 ? (
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                                    {t('quizOverview.sections.fillBlanks', 'Fill in the blanks')}
                                  </p>
                                  {question.textWithBlanks && (
                                    <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-600 bg-blue-50/70 dark:bg-blue-900/20 mb-3">
                                      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                                        {question.textWithBlanks.split('{blank}').map((text, idx) => (
                                          <span key={idx}>
                                            {text}
                                            {idx < (question.blanks?.length || 0) && (
                                              <span className="inline-block px-3 py-1 mx-1 bg-blue-200 dark:bg-blue-700 rounded text-blue-900 dark:text-blue-100 font-mono text-xs">
                                                ___
                                              </span>
                                            )}
                                          </span>
                                        ))}
                                      </p>
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    {question.blanks.map((blank, idx) => (
                                      <div
                                        key={blank.id}
                                        className="p-3 rounded-lg border border-green-300 dark:border-green-600 bg-green-50/70 dark:bg-green-900/20"
                                      >
                                        <p className="text-sm text-slate-700 dark:text-slate-200">
                                          <span className="font-semibold text-green-700 dark:text-green-400">
                                            {t('quizOverview.sections.blankNumber', 'Blank {{number}}', { number: idx + 1 })}:
                                          </span>{' '}
                                          {blank.correctAnswer}
                                          {blank.acceptedAnswers && blank.acceptedAnswers.length > 0 && (
                                            <span className="text-xs text-slate-600 dark:text-slate-400">
                                              {' '}({t('quizOverview.sections.or', 'or')}: {blank.acceptedAnswers.join(', ')})
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : answers.length > 0 ? (
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
                    
                    {/* Show More/Less Button */}
                    {quiz.questions.length > 5 && (
                      <div className="text-center pt-6">
                        <div className="inline-flex flex-col items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setShowAllQuestions(!showAllQuestions)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setShowAllQuestions(!showAllQuestions);
                              }
                            }}
                            aria-expanded={showAllQuestions}
                            aria-label={showAllQuestions 
                              ? t('quizOverview.sections.showLess', 'Thu gọn')
                              : t('quizOverview.sections.showMore', 'Hiển thị thêm ({{count}} câu)', {
                                  count: quiz.questions.length - 5
                                })
                            }
                            className="group relative inline-flex items-center gap-3 px-6 py-3 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-all duration-300 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:border-slate-300/70 dark:hover:border-slate-500/70 hover:scale-[1.02] focus:outline-none focus:ring-1 focus:ring-slate-400/50 dark:focus:ring-slate-500/50"
                          >
                            {/* Animated background effect */}
                            <div className="absolute inset-0 bg-white/20 dark:bg-slate-700/20 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            
                            {/* Icon with animation */}
                            <span className="relative flex items-center justify-center">
                              {showAllQuestions ? (
                                <ChevronUp className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-1" />
                              ) : (
                                <ChevronDown className="w-5 h-5 transition-transform duration-300 group-hover:translate-y-1" />
                              )}
                            </span>
                            
                            {/* Text with counter */}
                            <span className="relative flex items-center gap-2">
                              {showAllQuestions ? (
                                t('quizOverview.sections.showLess', 'Thu gọn')
                              ) : (
                                t('quizOverview.sections.showMore', 'Hiển thị thêm ({{count}} câu)', {
                                  count: quiz.questions.length - 5
                                })
                              )}
                            </span>
                            
                            {/* Keyboard hint - only show on desktop */}
                            {!showAllQuestions && (
                              <span className="hidden md:inline-flex absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                {t('quizOverview.sections.keyboardHint', 'Nhấn Enter để mở rộng')}
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45" />
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
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
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(currentViewers)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t('quizOverview.facts.viewers', 'viewers')}
                    {activePlayers > 0 && (
                      <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                        ({activePlayers} {t('quizOverview.facts.playing', 'playing')})
                      </span>
                    )}
                  </div>
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

      {/* Resource Viewers */}
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

      {/* Modals */}
      {quiz && showSettingsModal && (
        <QuizSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSettingsSave}
          currentSettings={quizSettings || undefined}
          quizId={quiz.id}
          quiz={{
            duration: quiz.duration || 0,
            questions: quiz.questions || []
          }}
        />
      )}
    </div>
  );
};

export default QuizPreviewPage;
