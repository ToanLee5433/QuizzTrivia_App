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
            await getDocs(questionsRef);

            console.log('✅ User has access to password-protected quiz');
            setNeedsPassword(false);
            const quizWithResources: Quiz = enrichedMetadata.resources
              ? { ...foundQuiz, resources: enrichedMetadata.resources }
              : foundQuiz;
            setQuiz(quizWithResources);
            dispatch(setCurrentQuiz(quizWithResources));

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
        setQuiz(foundQuiz);
        dispatch(setCurrentQuiz(foundQuiz));

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

      console.log('✅ Loaded metadata:', metadata.title, 'visibility:', metadata.visibility);
      const enrichedMetadata = enhanceMetadata(metadata);
      setQuizMetadata(enrichedMetadata);

      try {
        const questionsRef = collection(db, 'quizzes', id, 'questions');
        const questionsSnap = await getDocs(questionsRef);

        const questions = questionsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Question[];

        console.log('✅ Loaded questions:', questions.length);

        const completeQuiz = {
          ...enrichedMetadata,
          questions
        } as Quiz;

        setNeedsPassword(false);
        setQuiz(completeQuiz);
        dispatch(setCurrentQuiz(completeQuiz));

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
  useEffect(() => {
    if (currentQuiz && currentQuiz.id === id) {
      console.log('🔍 Using currentQuiz from Redux:', currentQuiz.title);
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
