import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../../lib/store';
import { setCurrentQuiz } from '../../../store';
import { Quiz, Question } from '../../../types';
import { quizStatsService } from '../../../../../services/quizStatsService';
import { getQuizMetadata, QuizMetadata } from '../../../../../lib/services/quizAccessService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase/config';

type QuizResource = NonNullable<Quiz['resources']>[number];
type QuizPageMetadata = QuizMetadata & {
  resources?: QuizResource[];
};

const RESOURCE_TYPES: ReadonlyArray<QuizResource['type']> = ['video', 'pdf', 'image', 'link', 'slides'];

const isPermissionDeniedError = (error: unknown): error is { code: string } =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  typeof (error as { code?: unknown }).code === 'string' &&
  (error as { code: string }).code === 'permission-denied';

const toQuizResource = (raw: unknown): QuizResource | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const { id, type, title, url } = candidate;

  if (typeof id !== 'string' || typeof type !== 'string' || typeof title !== 'string' || typeof url !== 'string') {
    return null;
  }

  if (!RESOURCE_TYPES.includes(type as QuizResource['type'])) {
    return null;
  }

  const resource: QuizResource = {
    id,
    type: type as QuizResource['type'],
    title,
    url,
    required: candidate.required === undefined ? false : Boolean(candidate.required)
  };

  if (typeof candidate.description === 'string') {
    resource.description = candidate.description;
  }

  if (typeof candidate.thumbnailUrl === 'string') {
    resource.thumbnailUrl = candidate.thumbnailUrl;
  }

  if (typeof candidate.whyWatch === 'string') {
    resource.whyWatch = candidate.whyWatch;
  }

  if (typeof candidate.estimatedTime === 'number') {
    resource.estimatedTime = candidate.estimatedTime;
  }

  if (typeof candidate.order === 'number') {
    resource.order = candidate.order;
  }

  return resource;
};

const normalizeResources = (rawResources: unknown): QuizResource[] | undefined => {
  if (!Array.isArray(rawResources)) {
    return undefined;
  }

  const normalized = rawResources
    .map(toQuizResource)
    .filter((resource): resource is QuizResource => resource !== null);

  if (normalized.length === 0) {
    return undefined;
  }

  return normalized.sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
};

const enhanceMetadata = (metadata: QuizMetadata): QuizPageMetadata => {
  const rawResources = (metadata as { resources?: unknown }).resources;
  const normalizedResources = normalizeResources(rawResources);
  const base: Record<string, unknown> = { ...metadata };

  if ('resources' in base) {
    delete base.resources;
  }

  if (normalizedResources) {
    base.resources = normalizedResources;
  }

  // Convert Firestore Timestamps to serializable format
  if (base.stats && typeof base.stats === 'object') {
    const stats = base.stats as any;
    if (stats.lastUpdated?.toDate) {
      stats.lastUpdated = stats.lastUpdated.toDate().toISOString();
    }
  }
  if ((base.createdAt as any)?.toDate) {
    base.createdAt = (base.createdAt as any).toDate().toISOString();
  }
  if ((base.updatedAt as any)?.toDate) {
    base.updatedAt = (base.updatedAt as any).toDate().toISOString();
  }

  return base as QuizPageMetadata;
};

export const useQuizData = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { quizzes, currentQuiz } = useSelector((state: RootState) => state.quiz);
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [quizMetadata, setQuizMetadata] = useState<QuizPageMetadata | null>(null);

  const loadQuizData = useCallback(async () => {
    if (!id) {
      return;
    }

    console.log('🔍 QuizPage: Loading quiz:', id);
    setLoading(true);
    setError(null);

    try {
      // Strategy: Check Redux first for performance (avoid Firestore read)
      // Redux contains quiz metadata but NOT questions/resources
      // Load questions from Firestore if missing
      const foundQuiz = quizzes.find(q => q.id === id);

      if (foundQuiz) {
        console.log('✅ Found quiz in Redux store:', foundQuiz.title);

        const hasPasswordProtection =
          foundQuiz.visibility === 'password' ||
          foundQuiz.havePassword === true ||
          foundQuiz.havePassword === 'password';

        if (hasPasswordProtection) {
          console.log('🔒 Quiz requires password, checking access...');

          const metadata = await getQuizMetadata(id);
          if (!metadata) {
            setError('Quiz không tồn tại');
            setLoading(false);
            return;
          }

          const enrichedMetadata = enhanceMetadata(metadata);
          setQuizMetadata(enrichedMetadata);

          try {
            const questionsRef = collection(db, 'quizzes', id, 'questions');
            const questionsSnap = await getDocs(questionsRef);
            
            // Load questions from Firestore subcollection
            let questions = questionsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Question[];

            console.log('✅ User has access to password-protected quiz, loaded', questions.length, 'questions from subcollection');
            
            // 🔄 Fallback: If no questions in subcollection, try document field
            if (questions.length === 0 && foundQuiz.questions && foundQuiz.questions.length > 0) {
              console.log('📋 Using questions from document field (legacy format):', foundQuiz.questions.length);
              questions = foundQuiz.questions;
            }
            
            if (questions.length === 0) {
              setError('Quiz này chưa có câu hỏi. Vui lòng quay lại sau!');
              setLoading(false);
              return;
            }
            
            setNeedsPassword(false);
            const quizWithQuestionsAndResources: Quiz = {
              ...foundQuiz,
              questions,
              ...(enrichedMetadata.resources ? { resources: enrichedMetadata.resources } : {})
            };
            
            // Convert Timestamps/Dates to ISO strings for Redux serialization
            const serializableQuiz = {
              ...quizWithQuestionsAndResources,
              createdAt: quizWithQuestionsAndResources.createdAt instanceof Date ? quizWithQuestionsAndResources.createdAt.toISOString() : 
                (quizWithQuestionsAndResources.createdAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
              updatedAt: quizWithQuestionsAndResources.updatedAt instanceof Date ? quizWithQuestionsAndResources.updatedAt.toISOString() : 
                (quizWithQuestionsAndResources.updatedAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
              approvedAt: quizWithQuestionsAndResources.approvedAt ? 
                (quizWithQuestionsAndResources.approvedAt instanceof Date ? quizWithQuestionsAndResources.approvedAt.toISOString() : 
                  (quizWithQuestionsAndResources.approvedAt as any)?.toDate?.()?.toISOString() || new Date().toISOString()) : undefined
            };
            
            setQuiz(serializableQuiz);
            dispatch(setCurrentQuiz(serializableQuiz));

            if (user) {
              quizStatsService.trackView(id, user.uid);
            } else {
              quizStatsService.trackView(id);
            }

            setLoading(false);
          } catch (permissionError) {
            if (isPermissionDeniedError(permissionError)) {
              console.log('🔒 Access denied - showing password modal');
              setNeedsPassword(true);
              setError(null);
            } else {
              setError('Lỗi khi kiểm tra quyền truy cập');
            }
            setLoading(false);
          }

          return;
        }

        setNeedsPassword(false);
        
        // Check if quiz has questions, if not, load them from Firestore
        if (!foundQuiz.questions || foundQuiz.questions.length === 0) {
          console.log('⚠️ Quiz from Redux has no questions, loading from Firestore...');
          
          // Check status before loading questions
          // Allow quiz creator and admins to access quiz regardless of status
          const isCreator = user && (foundQuiz.createdBy === user.uid || foundQuiz.authorId === user.uid);
          const isAdmin = user && user.role === 'admin';
          const canAccess = foundQuiz.status === 'approved' || isCreator || isAdmin;
          
          if (!canAccess) {
            console.error('❌ Quiz not approved:', foundQuiz.status);
            setError('Quiz này đang chờ phê duyệt hoặc chưa có câu hỏi. Vui lòng quay lại sau!');
            setLoading(false);
            return;
          }
          
          try {
            const questionsRef = collection(db, 'quizzes', id, 'questions');
            const questionsSnap = await getDocs(questionsRef);
            
            let questions = questionsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Question[];
            
            console.log('✅ Loaded questions from Firestore subcollection:', questions.length);
            
            // 🔄 Fallback: If no questions in subcollection, try document field
            if (questions.length === 0 && foundQuiz.questions && foundQuiz.questions.length > 0) {
              console.log('📋 Using questions from document field (legacy format):', foundQuiz.questions.length);
              questions = foundQuiz.questions;
            }
            
            // 🎬 Debug: Check mediaTrim in loaded questions
            if (questions.length > 0) {
              console.log('🎬 [DEBUG] First question mediaTrim:', questions[0].mediaTrim);
              console.log('🎬 [DEBUG] First question videoUrl:', questions[0].videoUrl);
              if (questions[0].answers?.length > 0) {
                console.log('🎬 [DEBUG] First answer mediaTrim:', questions[0].answers[0].mediaTrim);
              }
            }
            
            if (questions.length === 0) {
              setError('Quiz này chưa có câu hỏi. Vui lòng quay lại sau!');
              setLoading(false);
              return;
            }
            
            // Update quiz with questions
            const quizWithQuestions = { ...foundQuiz, questions };
            
            // Convert Timestamps/Dates to ISO strings for Redux serialization
            const serializableQuiz = {
              ...quizWithQuestions,
              createdAt: quizWithQuestions.createdAt instanceof Date ? quizWithQuestions.createdAt.toISOString() : 
                (quizWithQuestions.createdAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
              updatedAt: quizWithQuestions.updatedAt instanceof Date ? quizWithQuestions.updatedAt.toISOString() : 
                (quizWithQuestions.updatedAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
              approvedAt: quizWithQuestions.approvedAt ? 
                (quizWithQuestions.approvedAt instanceof Date ? quizWithQuestions.approvedAt.toISOString() : 
                  (quizWithQuestions.approvedAt as any)?.toDate?.()?.toISOString() || new Date().toISOString()) : undefined
            };
            
            setQuiz(serializableQuiz);
            dispatch(setCurrentQuiz(serializableQuiz));
            
          } catch (questionsError) {
            console.error('❌ Error loading questions:', questionsError);
            if (isPermissionDeniedError(questionsError)) {
              setError('Không có quyền truy cập câu hỏi của quiz này');
            } else {
              setError('Không thể tải câu hỏi. Vui lòng thử lại sau!');
            }
            setLoading(false);
            return;
          }
        } else {
          // Quiz already has questions from Redux
          console.log('✅ Quiz has questions from Redux:', foundQuiz.questions.length);
          
          // Convert Timestamps/Dates to ISO strings for Redux serialization
          const serializableQuiz = {
            ...foundQuiz,
            createdAt: foundQuiz.createdAt instanceof Date ? foundQuiz.createdAt.toISOString() : 
              (foundQuiz.createdAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: foundQuiz.updatedAt instanceof Date ? foundQuiz.updatedAt.toISOString() : 
              (foundQuiz.updatedAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
            approvedAt: foundQuiz.approvedAt ? 
              (foundQuiz.approvedAt instanceof Date ? foundQuiz.approvedAt.toISOString() : 
                (foundQuiz.approvedAt as any)?.toDate?.()?.toISOString() || new Date().toISOString()) : undefined
          };
          
          setQuiz(serializableQuiz);
          dispatch(setCurrentQuiz(serializableQuiz));
        }

        if (user) {
          quizStatsService.trackView(id, user.uid);
        } else {
          quizStatsService.trackView(id);
        }

        setLoading(false);
        return;
      }

      console.log('🔍 Quiz not in store, loading from Firestore...');

      const metadata = await getQuizMetadata(id);

      if (!metadata) {
        setError('Quiz không tồn tại');
        setLoading(false);
        return;
      }

      console.log('✅ Loaded metadata:', metadata.title, 'visibility:', metadata.visibility, 'status:', metadata.status);
      const enrichedMetadata = enhanceMetadata(metadata);
      setQuizMetadata(enrichedMetadata);

      // Check quiz status before loading questions
      // Allow quiz creator and admins to access quiz regardless of status
      const isCreator = user && (metadata.createdBy === user.uid || metadata.authorId === user.uid);
      const isAdmin = user && user.role === 'admin';
      const canAccess = metadata.status === 'approved' || isCreator || isAdmin;
      
      if (!canAccess) {
        console.error('❌ Quiz not approved:', metadata.status);
        setError('Quiz này đang chờ phê duyệt hoặc chưa có câu hỏi. Vui lòng quay lại sau!');
        setLoading(false);
        return;
      }

      try {
        const questionsRef = collection(db, 'quizzes', id, 'questions');
        const questionsSnap = await getDocs(questionsRef);

        let questions = questionsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Question[];

        console.log('✅ Loaded questions from subcollection:', questions.length);
        
        // 🔄 Fallback: If no questions in subcollection, try document field from metadata
        if (questions.length === 0 && (enrichedMetadata as any).questions && (enrichedMetadata as any).questions.length > 0) {
          console.log('📋 Using questions from document field (legacy format):', (enrichedMetadata as any).questions.length);
          questions = (enrichedMetadata as any).questions;
        }

        if (questions.length === 0) {
          console.error('❌ No questions found in subcollection or document field');
          setError('Quiz này chưa có câu hỏi. Vui lòng quay lại sau!');
          setLoading(false);
          return;
        }

        const completeQuiz = {
          ...enrichedMetadata,
          questions
        } as Quiz;

        // Convert Timestamps/Dates to ISO strings for Redux serialization
        const serializableQuiz = {
          ...completeQuiz,
          createdAt: completeQuiz.createdAt instanceof Date ? completeQuiz.createdAt.toISOString() : 
            (completeQuiz.createdAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: completeQuiz.updatedAt instanceof Date ? completeQuiz.updatedAt.toISOString() : 
            (completeQuiz.updatedAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
          approvedAt: completeQuiz.approvedAt ? 
            (completeQuiz.approvedAt instanceof Date ? completeQuiz.approvedAt.toISOString() : 
              (completeQuiz.approvedAt as any)?.toDate?.()?.toISOString() || new Date().toISOString()) : undefined
        };

        setNeedsPassword(false);
        setQuiz(serializableQuiz);
        dispatch(setCurrentQuiz(serializableQuiz));

        if (user) {
          quizStatsService.trackView(id, user.uid);
        } else {
          quizStatsService.trackView(id);
        }

        setLoading(false);
      } catch (questionsError) {
        console.error('❌ Error loading questions:', questionsError);

        if (isPermissionDeniedError(questionsError)) {
          console.log('🔒 Quiz requires password');

          if (metadata.visibility === 'password') {
            setNeedsPassword(true);
            setError(null);
          } else {
            setError('Không có quyền truy cập quiz này');
          }
        } else {
          setError('Lỗi khi tải câu hỏi');
        }

        setLoading(false);
      }
    } catch (err) {
      console.error('❌ Error loading quiz:', err);
      setError(err instanceof Error ? err.message : 'Không thể tải quiz');
      setLoading(false);
    }
  }, [dispatch, id, quizzes, user]);

  useEffect(() => {
    if (!id) {
      console.log('❌ No quiz ID provided');
      navigate('/quiz-list');
      return;
    }

    loadQuizData();
  }, [id, navigate, loadQuizData]);

  // Function to retry loading after password unlock
  const retryLoad = useCallback(() => {
    setNeedsPassword(false);
    loadQuizData();
  }, [loadQuizData]);
  
  // Handle currentQuiz from Redux (when fetched individually)
  // Only use currentQuiz if it has questions (to avoid overriding loaded quiz)
  useEffect(() => {
    if (currentQuiz && currentQuiz.id === id && currentQuiz.questions && currentQuiz.questions.length > 0) {
      console.log('🔍 Using currentQuiz from Redux (has', currentQuiz.questions.length, 'questions):', currentQuiz.title);
      setQuiz(currentQuiz);
    }
  }, [currentQuiz, id]);

  return { 
    quiz, 
    loading, 
    error, 
    needsPassword, 
    quizMetadata, 
    retryLoad 
  };
};
