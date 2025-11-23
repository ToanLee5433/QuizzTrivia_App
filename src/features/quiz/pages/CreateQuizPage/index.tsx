import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../lib/store';
import { ROUTES } from '../../../../config/routes';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../lib/firebase/config';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Button from '../../../../shared/components/ui/Button';
import ConfirmDialog from '../../../../shared/components/ui/ConfirmDialog';
import ShareLinkModal from '../../../../shared/components/ui/ShareLinkModal';

import { QuizFormData, Question } from './types';
import { defaultQuiz, stepKeys } from './constants';
import { generateId } from './utils';
import { createPasswordHash } from '../../../../lib/utils/passwordHash'; // 🔒 Password hash utility
import { cleanDoublePTags } from '../../../../utils/htmlUtils';
import QuizTypeStep from './components/QuizTypeStep'; // 🆕
import QuizInfoStep from './components/QuizInfoStep';
import ResourcesStep from './components/ResourcesStep';
import QuestionsStep from './components/QuestionsStep';
import ReviewStep from './components/ReviewStep';

const CreateQuizPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [quiz, setQuiz] = useState<QuizFormData>(defaultQuiz);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // 🔗 Share Link Modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [publishedQuizId, setPublishedQuizId] = useState<string>('');
  const [publishedQuizTitle, setPublishedQuizTitle] = useState<string>('');
  const [publishedQuizHasPassword, setPublishedQuizHasPassword] = useState<boolean>(false);
  const [publishedQuizPassword, setPublishedQuizPassword] = useState<string>('');

  // Auto scroll to top when step changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Track unsaved changes
  React.useEffect(() => {
    const hasChanges = !!(
      quiz.quizType ||
      quiz.title ||
      quiz.description ||
      quiz.questions.length > 0 ||
      (quiz.resources && quiz.resources.length > 0)
    );
    setHasUnsavedChanges(hasChanges);
  }, [quiz]);

  // Warn before leaving page
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !submitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, submitting]);

  const maxStepIndex = React.useMemo(() => {
    if (quiz.quizType === 'standard') {
      return stepKeys.length - 2; // Skip resources step
    }
    return stepKeys.length - 1;
  }, [quiz.quizType]);

  // Handle back navigation with confirmation
  const handleBackNavigation = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      navigate(ROUTES.CREATOR_MY_QUIZZES);
    }
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    navigate(ROUTES.CREATOR_MY_QUIZZES);
  };

  // Kiểm tra quyền truy cập
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.loginRequired')}</h2>
          <p className="text-gray-600">{t('createQuiz.loginRequired')}</p>
        </div>
      </div>
    );
  }

  if (currentUser.role !== 'creator' && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('messages.unauthorized')}</h2>
          <p className="text-gray-600">{t('creator.roleRequired')}</p>
        </div>
      </div>
    );
  }

  // Thêm câu hỏi mới
  const addQuestion = () => {
    const newQuestion = {
      id: generateId(),
      text: '',
      type: 'multiple' as const,
      answers: [
        { id: generateId(), text: '', isCorrect: true },
        { id: generateId(), text: '', isCorrect: false },
        { id: generateId(), text: '', isCorrect: false },
        { id: generateId(), text: '', isCorrect: false },
      ],
      points: 1,
      correctAnswer: '',
      acceptedAnswers: [],
    };
    
    setQuiz(q => ({
      ...q,
      questions: [newQuestion, ...q.questions], // Add to beginning
    }));
  };

  // Sửa câu hỏi
  const updateQuestion = (idx: number, q: Question) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((item, i) => i === idx ? q : item),
    }));
  };

  // Xóa câu hỏi
  const deleteQuestion = (idx: number) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  };

  // Di chuyển câu hỏi
  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= quiz.questions.length) return;
    
    setQuiz(prev => {
      const newQuestions = [...prev.questions];
      const [moved] = newQuestions.splice(fromIndex, 1);
      newQuestions.splice(toIndex, 0, moved);
      return { ...prev, questions: newQuestions };
    });
  };

  // Validate từng step
  const validateStep = (stepIndex: number): boolean => {
    // Dynamic step mapping based on quiz type
    const getActualStep = (index: number) => {
      if (!quiz.quizType) return -1; // Step 0: Quiz Type must be selected
      if (quiz.quizType === 'standard') {
        // For standard quiz: Type → Info (with password) → Questions → Review (skip Resources)
        if (index === 0) return 'type';
        if (index === 1) return 'info';
        if (index === 2) return 'questions';
        if (index === 3) return 'review';
      } else {
        // For with-materials quiz: Type → Info (with password) → Resources → Questions → Review
        if (index === 0) return 'type';
        if (index === 1) return 'info';
        if (index === 2) return 'resources';
        if (index === 3) return 'questions';
        if (index === 4) return 'review';
      }
      return 'unknown';
    };

    const actualStep = getActualStep(stepIndex);

    switch (actualStep) {
      case 'type': // Step 0: Quiz Type Selection
        return !!quiz.quizType;
      case 'info': { // Quiz Info step (includes password now)
        const basicInfoValid = !!(quiz.title && quiz.description && quiz.category && quiz.difficulty);
        const durationValid = quiz.duration >= 5 && quiz.duration <= 120;
        const passwordValid = quiz.havePassword === 'password'
          ? !!(quiz.password && quiz.password.length >= 6)
          : true;
        
        return basicInfoValid && durationValid && passwordValid;
      }
      case 'resources': // Resources step - Only for with-materials type
        return !!(quiz.resources && quiz.resources.length > 0);
      case 'questions': // Questions step
        if (quiz.questions.length === 0) {
          return false;
        }
        
        const invalidQuestion = quiz.questions.find(q => {
          // Kiểm tra text câu hỏi
          if (!q.text) return true;
          
          // Kiểm tra points (must be 1-100)
          if (!q.points || q.points < 1 || q.points > 100) return true;
          
          // Kiểm tra theo từng loại câu hỏi
          switch (q.type) {
            case 'short_answer':
              return !q.correctAnswer;
            case 'boolean':
            case 'multiple':
            case 'checkbox':
              // Standard types: Must have text for all answers
              return !q.answers.some(a => a.isCorrect) || !q.answers.every(a => a.text);
            case 'image':
            case 'audio':
            case 'video':
              // Legacy media types: Must have text
              return !q.answers.some(a => a.isCorrect) || !q.answers.every(a => a.text);
            case 'multimedia': // 🆕 Multimedia: Answer must have text OR media
              if (!q.answers.some(a => a.isCorrect)) return true; // Must have correct answer
              // Each answer must have either text OR media (image/audio/video)
              return !q.answers.every(a => a.text || a.imageUrl || a.audioUrl || a.videoUrl);
            case 'ordering':
              return !q.orderingItems || q.orderingItems.length < 2;
            case 'matching':
              return !q.matchingPairs || q.matchingPairs.length < 2;
            case 'fill_blanks':
              return !q.textWithBlanks || !q.blanks || q.blanks.length === 0;
            default:
              return false; // Allow other types
          }
        });
        
        return !invalidQuestion;
      case 'review': // Review step
        return true;
      default:
        return false;
    }
  };

  const deepCleanValue = (value: unknown): unknown => {
    if (value === undefined || value === null) {
      return null;
    }

    if (Array.isArray(value)) {
      return (value as unknown[]).map((item) => deepCleanValue(item));
    }

    if (typeof value === 'object') {
      const cleaned: Record<string, unknown> = {};
      Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
        const cleanedVal = deepCleanValue(nestedValue);
        if (cleanedVal !== undefined) {
          cleaned[key] = cleanedVal;
        }
      });
      return cleaned;
    }

    return value;
  };

  // Submit quiz
  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error(t('createQuiz.loginRequired'));
      return;
    }

    if (!validateStep(1)) {
      toast.error(t('createQuiz.completeAllInfo'));
      return;
    }

    setSubmitting(true);
    try {

      // 🔒 Generate password hash if visibility is password
      let pwdData = undefined;
      if (quiz.havePassword === 'password' && quiz.password) {
        const { salt, hash } = await createPasswordHash(quiz.password);
        pwdData = {
          enabled: true,
          algo: 'SHA256',
          salt,
          hash
        };
        console.log('🔒 [PUBLISH] Password data generated:', {
          havePassword: quiz.havePassword,
          passwordLength: quiz.password.length,
          salt: salt.substring(0, 20) + '...',
          hash: hash.substring(0, 20) + '...'
        });
      }

    // Clean up undefined values - Firestore doesn't accept undefined
    const baseQuizData = {
        title: quiz.title || '',
        description: cleanDoublePTags(quiz.description || ''), // Clean double <p> tags
        category: quiz.category || 'general',
        difficulty: quiz.difficulty || 'easy',
        duration: quiz.duration || 15,
        quizType: quiz.quizType || 'standard', // 🆕 Save quiz type
        
        // 🔒 New Password Protection System
        visibility: quiz.havePassword === 'password' ? 'password' : 'public',
        ...(pwdData ? { pwd: pwdData } : {}), // Only add pwd if it exists
        
        questions: (quiz.questions || []).map(q => ({
          id: q.id || '',
          text: q.text || '',
          type: q.type || 'multiple',
          answers: (q.answers || []).map(a => ({
            id: a.id || '',
            text: a.text || '',
            isCorrect: a.isCorrect !== undefined ? a.isCorrect : false,
            ...(a.imageUrl && { imageUrl: a.imageUrl }),
            ...(a.audioUrl && { audioUrl: a.audioUrl }),
            ...(a.videoUrl && { videoUrl: a.videoUrl }),
            ...(a.richText && { richText: a.richText })
          })),
          explanation: q.explanation || '',
          points: q.points !== undefined ? q.points : 1,
          correctAnswer: q.correctAnswer || null,
          acceptedAnswers: q.acceptedAnswers || [],
          // 🆕 Support for multimedia question types - only save media URLs if they exist
          ...(q.imageUrl && { imageUrl: q.imageUrl }),
          ...(q.audioUrl && { audioUrl: q.audioUrl }),
          ...(q.videoUrl && { videoUrl: q.videoUrl }),
          ...(q.richText && { richText: q.richText }),
          ...(q.richExplanation && { richExplanation: q.richExplanation }),
          // 🆕 Support for ordering questions
          ...(q.orderingItems && q.orderingItems.length > 0 && {
            orderingItems: q.orderingItems.map(item => ({
              id: item.id || '',
              text: item.text || '',
              correctOrder: item.correctOrder || 0,
              ...(item.imageUrl && { imageUrl: item.imageUrl })
            }))
          }),
          // 🆕 Support for matching questions
          ...(q.matchingPairs && q.matchingPairs.length > 0 && {
            matchingPairs: q.matchingPairs.map(pair => ({
              id: pair.id || '',
              left: pair.left || '',
              right: pair.right || '',
              ...(pair.leftImageUrl && { leftImageUrl: pair.leftImageUrl }),
              ...(pair.rightImageUrl && { rightImageUrl: pair.rightImageUrl })
            }))
          }),
          // 🆕 Support for fill_blanks questions
          ...(q.textWithBlanks && { textWithBlanks: q.textWithBlanks }),
          ...(q.blanks && q.blanks.length > 0 && {
            blanks: q.blanks.map(blank => ({
              id: blank.id || '',
              position: blank.position || 0,
              correctAnswer: blank.correctAnswer || '',
              acceptedAnswers: blank.acceptedAnswers || [],
              caseSensitive: blank.caseSensitive || false
            }))
          })
        })),
        resources: (quiz.resources || []).map(r => ({
          id: r.id || '',
          type: r.type || 'video',
          title: r.title || '',
          description: r.description || '',
          url: r.url || '',
          required: r.required !== undefined ? r.required : false,
          threshold: r.threshold || {},
          learningOutcomes: r.learningOutcomes || [],
          order: r.order !== undefined ? r.order : 0,
          thumbnailUrl: r.thumbnailUrl || null,
          whyWatch: r.whyWatch || null,
          estimatedTime: r.estimatedTime || null,
          createdAt: r.createdAt || new Date(),
          updatedAt: r.updatedAt || new Date()
        })),
        createdBy: currentUser.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isPublished: true,
        tags: quiz.tags || [],
        imageUrl: quiz.imageUrl || null,
        isPublic: quiz.isPublic !== undefined ? quiz.isPublic : false,
        allowRetake: quiz.allowRetake !== undefined ? quiz.allowRetake : true,
        status: 'pending' // 📤 Submit for admin approval
      };

      console.log('🔍 [PUBLISH] Quiz data BEFORE clean - sample question:', baseQuizData.questions[0]);
      console.log('🔍 [PUBLISH] Sample question media fields:', {
        imageUrl: baseQuizData.questions[0]?.imageUrl,
        audioUrl: baseQuizData.questions[0]?.audioUrl,
        videoUrl: baseQuizData.questions[0]?.videoUrl,
        answers: baseQuizData.questions[0]?.answers?.map((a: any) => ({
          text: a.text,
          imageUrl: a.imageUrl,
          audioUrl: a.audioUrl,
          videoUrl: a.videoUrl
        }))
      });

      const cleanQuizData = deepCleanValue(baseQuizData) as Record<string, unknown>;

      console.log('🔍 [PUBLISH] Clean quiz data:', {
        ...cleanQuizData,
        pwd: cleanQuizData.pwd || 'NOT SET',
        visibility: cleanQuizData.visibility,
        havePassword: cleanQuizData.havePassword
      });

      const docRef = await addDoc(collection(db, 'quizzes'), cleanQuizData);

      toast.success(t('createQuiz.createSuccess'));
      
      // 🔗 Show share link modal
      setPublishedQuizId(docRef.id);
      setPublishedQuizTitle(quiz.title);
      setPublishedQuizHasPassword(quiz.havePassword === 'password');
      setPublishedQuizPassword(quiz.password || '');
      setShowShareModal(true);
      
      setQuiz(defaultQuiz);
      setStep(0);
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error(t('createQuiz.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  // 📝 Save as draft
  const handleSaveDraft = async () => {
    if (!currentUser) {
      toast.error(t('createQuiz.loginRequired'));
      return;
    }

    // Validate at least title and quiz type
    if (!quiz.title || !quiz.quizType) {
      toast.error(t('createQuiz.draft.validationError'));
      return;
    }

    setSubmitting(true);
    try {

      // 🔒 Generate password hash if visibility is password
      let pwdData = undefined;
      if (quiz.havePassword === 'password' && quiz.password) {
        const { salt, hash } = await createPasswordHash(quiz.password);
        pwdData = {
          enabled: true,
          algo: 'SHA256',
          salt,
          hash
        };
        console.log('🔒 [DRAFT] Password data generated:', {
          havePassword: quiz.havePassword,
          passwordLength: quiz.password.length,
          salt: salt.substring(0, 20) + '...',
          hash: hash.substring(0, 20) + '...'
        });
      }

    const baseDraftData = {
        title: quiz.title || '',
        description: cleanDoublePTags(quiz.description || ''), // Clean double <p> tags
        category: quiz.category || 'general',
        difficulty: quiz.difficulty || 'easy',
        duration: quiz.duration || 15,
        quizType: quiz.quizType || 'standard',
        
        // 🔒 New Password Protection System
        visibility: quiz.havePassword === 'password' ? 'password' : 'public',
        ...(pwdData ? { pwd: pwdData } : {}), // Only add pwd if it exists
        
        questions: (quiz.questions || []).map(q => ({
          id: q.id || '',
          text: q.text || '',
          type: q.type || 'multiple',
          answers: (q.answers || []).map(a => ({
            id: a.id || '',
            text: a.text || '',
            isCorrect: a.isCorrect !== undefined ? a.isCorrect : false,
            ...(a.imageUrl && { imageUrl: a.imageUrl }),
            ...(a.audioUrl && { audioUrl: a.audioUrl }),
            ...(a.videoUrl && { videoUrl: a.videoUrl }),
            ...(a.richText && { richText: a.richText })
          })),
          explanation: q.explanation || '',
          points: q.points !== undefined ? q.points : 1,
          correctAnswer: q.correctAnswer || null,
          acceptedAnswers: q.acceptedAnswers || [],
          // 🆕 Support for multimedia question types - only save media URLs if they exist
          ...(q.imageUrl && { imageUrl: q.imageUrl }),
          ...(q.audioUrl && { audioUrl: q.audioUrl }),
          ...(q.videoUrl && { videoUrl: q.videoUrl }),
          ...(q.richText && { richText: q.richText }),
          ...(q.richExplanation && { richExplanation: q.richExplanation }),
          // 🆕 Support for ordering questions
          ...(q.orderingItems && q.orderingItems.length > 0 && {
            orderingItems: q.orderingItems.map(item => ({
              id: item.id || '',
              text: item.text || '',
              correctOrder: item.correctOrder || 0,
              ...(item.imageUrl && { imageUrl: item.imageUrl })
            }))
          }),
          // 🆕 Support for matching questions
          ...(q.matchingPairs && q.matchingPairs.length > 0 && {
            matchingPairs: q.matchingPairs.map(pair => ({
              id: pair.id || '',
              left: pair.left || '',
              right: pair.right || '',
              ...(pair.leftImageUrl && { leftImageUrl: pair.leftImageUrl }),
              ...(pair.rightImageUrl && { rightImageUrl: pair.rightImageUrl })
            }))
          }),
          // 🆕 Support for fill_blanks questions
          ...(q.textWithBlanks && { textWithBlanks: q.textWithBlanks }),
          ...(q.blanks && q.blanks.length > 0 && {
            blanks: q.blanks.map(blank => ({
              id: blank.id || '',
              position: blank.position || 0,
              correctAnswer: blank.correctAnswer || '',
              acceptedAnswers: blank.acceptedAnswers || [],
              caseSensitive: blank.caseSensitive || false
            }))
          })
        })),
        resources: (quiz.resources || []).map(r => ({
          id: r.id || '',
          type: r.type || 'video',
          title: r.title || '',
          description: r.description || '',
          url: r.url || '',
          required: r.required !== undefined ? r.required : false,
          threshold: r.threshold || {},
          learningOutcomes: r.learningOutcomes || [],
          order: r.order !== undefined ? r.order : 0,
          thumbnailUrl: r.thumbnailUrl || null,
          whyWatch: r.whyWatch || null,
          estimatedTime: r.estimatedTime || null,
          createdAt: r.createdAt || new Date(),
          updatedAt: r.updatedAt || new Date()
        })),
        createdBy: currentUser.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isPublished: false,
        tags: quiz.tags || [],
        imageUrl: quiz.imageUrl || null,
        isPublic: quiz.isPublic !== undefined ? quiz.isPublic : false,
        allowRetake: quiz.allowRetake !== undefined ? quiz.allowRetake : true,
        status: 'draft', // 📝 Mark as draft
        isDraft: true
      };

      const draftQuizData = deepCleanValue(baseDraftData) as Record<string, unknown>;

      console.log('📝 Saving draft:', draftQuizData);

      await addDoc(collection(db, 'quizzes'), draftQuizData);

      toast.success(`${t('emoji.floppyDisk')} ${t('createQuiz.draft.success')}`);
      setQuiz(defaultQuiz);
      setStep(0);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error(t('createQuiz.draft.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    const actualStep = (() => {
      if (!quiz.quizType) return 'type';
      if (quiz.quizType === 'standard') {
        if (step === 0) return 'type';
        if (step === 1) return 'info';
        if (step === 2) return 'questions';
        if (step === 3) return 'review';
      } else {
        if (step === 0) return 'type';
        if (step === 1) return 'info';
        if (step === 2) return 'resources';
        if (step === 3) return 'questions';
        if (step === 4) return 'review';
      }
      return 'unknown';
    })();

    // Show specific error messages when clicking Next
    if (actualStep === 'info') {
      const basicInfoValid = !!(quiz.title && quiz.description && quiz.category && quiz.difficulty);
      const durationValid = quiz.duration >= 5 && quiz.duration <= 120;
      const passwordValid = quiz.havePassword === 'password'
        ? !!(quiz.password && quiz.password.length >= 6)
        : true;
      
      if (!basicInfoValid) {
        toast.error(t('createQuiz.completeAllInfo'));
        return;
      }
      if (!durationValid) {
        toast.error(t('quizCreation.from5to120minutes'));
        return;
      }
      if (!passwordValid) {
        toast.error(t('quizCreation.passwordMinLength'));
        return;
      }
    }

    if (actualStep === 'questions') {
      if (quiz.questions.length === 0) {
        toast.error(t('createQuiz.addQuestionFirst'));
        return;
      }
      
      const invalidQuestion = quiz.questions.find(q => {
        if (!q.text) return true;
        if (!q.points || q.points < 1 || q.points > 100) return true;
        
        switch (q.type) {
          case 'short_answer':
            return !q.correctAnswer;
          case 'boolean':
          case 'multiple':
          case 'checkbox':
          case 'image':
          case 'audio':
          case 'video':
            return !q.answers.some(a => a.isCorrect) || !q.answers.every(a => a.text);
          case 'ordering':
            return !q.orderingItems || q.orderingItems.length < 2;
          case 'matching':
            return !q.matchingPairs || q.matchingPairs.length < 2;
          case 'fill_blanks':
            return !q.textWithBlanks || !q.blanks || q.blanks.length === 0;
          default:
            return false; // Allow other types
        }
      });
      
      if (invalidQuestion) {
        toast.error('⚠️ Please check all questions have valid text, points (1-100), and answers');
        return;
      }
    }

    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, maxStepIndex));
    } else {
      toast.error(t('createQuiz.completeInfoFirst'));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 0));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-10 md:py-14">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
        {/* Back to Creator Button */}
        <button
          onClick={handleBackNavigation}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
          <span className="font-medium">{t('createQuiz.backToCreator')}</span>
        </button>

        {/* Header - Sticky Navigation */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md rounded-2xl shadow-md border border-gray-200 p-4 sm:p-6 mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-3 sm:mb-4">
            ✨ {t('createQuiz.title')}
          </h1>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {(() => {
              const displayStepKeys = (() => {
                if (quiz.quizType === 'standard') {
                  return [
                    'createQuiz.steps.selectType',
                    'createQuiz.steps.info',
                    'createQuiz.steps.questions',
                    'createQuiz.steps.review',
                  ] as const;
                }
                if (quiz.quizType === 'with-materials') {
                  return stepKeys;
                }
                return stepKeys;
              })();

              return displayStepKeys.map((stepKey, idx) => (
                <div key={stepKey} className="flex items-center flex-shrink-0">
                  <div className={`
                    w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold
                    transition-all duration-300 transform
                    ${idx <= step 
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg scale-110' 
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {idx < step ? '✓' : idx + 1}
                  </div>
                  <span className={`
                    ml-1 sm:ml-2 text-xs sm:text-sm whitespace-nowrap hidden sm:inline
                    ${idx <= step ? 'text-purple-600 font-semibold' : 'text-gray-500'}
                  `}>
                    {t(stepKey)}
                  </span>
                  {idx < displayStepKeys.length - 1 && (
                    <div className={`
                      w-6 sm:w-12 md:w-16 h-1 mx-1 sm:mx-2 md:mx-4 rounded-full transition-all duration-300
                      ${idx < step ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {/* Step content */}
          {step === 0 && (
            <QuizTypeStep
              selectedType={quiz.quizType}
              onTypeSelect={(type) => setQuiz(prev => ({ ...prev, quizType: type }))}
            />
          )}
          {step === 1 && <QuizInfoStep quiz={quiz} setQuiz={setQuiz} />}
          {step === 2 && quiz.quizType === 'with-materials' && (
            <ResourcesStep
              resources={quiz.resources || []}
              onResourcesChange={(resources) => setQuiz(prev => ({ ...prev, resources }))}
            />
          )}
          {((step === 2 && quiz.quizType === 'standard') || (step === 3 && quiz.quizType === 'with-materials')) && (
            <QuestionsStep
              quiz={quiz}
              setQuiz={setQuiz}
              addQuestion={addQuestion}
              updateQuestion={updateQuestion}
              deleteQuestion={deleteQuestion}
              moveQuestion={moveQuestion}
            />
          )}
          {((step === 3 && quiz.quizType === 'standard') || (step === 4 && quiz.quizType === 'with-materials')) && (
            <ReviewStep quiz={quiz} />
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              onClick={prevStep}
              disabled={step === 0}
              variant="outline"
              className="h-11"
            >
              ← {t('createQuiz.back')}
            </Button>

            <div className="flex gap-3">
              {/* Check if it's the last step based on quiz type */}
              {((quiz.quizType === 'standard' && step === 3) || (quiz.quizType === 'with-materials' && step === 4)) ? (
                <>
                  <Button
                    onClick={handleSaveDraft}
                    disabled={submitting || !quiz.title || !quiz.quizType}
                    loading={submitting}
                    variant="outline"
                    className="h-11 border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    {`${t('emoji.floppyDisk')} ${t('createQuiz.draft.button')}`}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !validateStep(step)}
                    loading={submitting}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-11"
                  >
                    🚀 {t('createQuiz.publish')}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={nextStep}
                  disabled={!validateStep(step)}
                  className="h-11"
                >
                  {t('createQuiz.continue')} →
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={confirmExit}
        title={`${t('emoji.warning')} ${t('createQuiz.exitConfirm.title')}`}
        message={t('createQuiz.exitConfirm.message')}
        confirmText={t('createQuiz.exitConfirm.confirm')}
        cancelText={t('createQuiz.exitConfirm.cancel')}
        type="warning"
      />

      {/* 🔗 Share Link Modal */}
      <ShareLinkModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        quizId={publishedQuizId}
        quizTitle={publishedQuizTitle}
        hasPassword={publishedQuizHasPassword}
        password={publishedQuizPassword}
      />
    </div>
  );
};

export default CreateQuizPage;
