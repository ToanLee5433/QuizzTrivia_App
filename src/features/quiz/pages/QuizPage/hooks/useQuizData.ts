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
            let questions: Question[] = [];

            // Try subcollection first, fallback to parent doc
            console.log('🔐 Step 1: Loading questions for password-protected quiz...');
            const questionsRef = collection(db, 'quizzes', id, 'questions');
            const questionsSnap = await getDocs(questionsRef);

            console.log('📊 Password quiz subcollection result:', {
              size: questionsSnap.size,
              empty: questionsSnap.empty,
              docsLength: questionsSnap.docs.length
            });

            if (!questionsSnap.empty) {
              // NEW structure
              questions = questionsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })) as Question[];
              console.log('✅ [NEW] Password quiz from subcollection:', questions.length);
            } else {
              // OLD structure - check parent doc
              console.log('🔐 Step 2: Checking parent document...');
              if (foundQuiz.questions && Array.isArray(foundQuiz.questions)) {
                questions = foundQuiz.questions.map((q: any, index: number) => ({
                  id: q.id || `q${index}`,
                  text: q.text || q.questionText || '',
                  questionText: q.text || q.questionText || '',
                  type: q.type || 'multiple-choice',
                  answers: q.answers || [],
                  correctAnswer: q.correctAnswer || null,
                  acceptedAnswers: q.acceptedAnswers || [],
                  explanation: q.explanation || '',
                  points: q.points || 1,
                  imageUrl: q.imageUrl || null
                })) as Question[];
                console.log('✅ [OLD] Password quiz from parent doc:', questions.length);
              }
            }

            console.log('✅ User has access to password-protected quiz, questions:', questions.length);
            
            // Serialize timestamps
            const serializeQuiz = (quiz: any): Quiz => {
              const serialized = { ...quiz };
              if (serialized.stats?.lastUpdated?.toDate) {
                serialized.stats.lastUpdated = serialized.stats.lastUpdated.toDate().toISOString();
              }
              if (serialized.createdAt?.toDate) {
                serialized.createdAt = serialized.createdAt.toDate().toISOString();
              }
              if (serialized.updatedAt?.toDate) {
                serialized.updatedAt = serialized.updatedAt.toDate().toISOString();
              }
              if (serialized.approvedAt?.toDate) {
                serialized.approvedAt = serialized.approvedAt.toDate().toISOString();
              }
              return serialized;
            };
            
            setNeedsPassword(false);
            const quizWithResources: Quiz = enrichedMetadata.resources
              ? { ...foundQuiz, resources: enrichedMetadata.resources, questions }
              : { ...foundQuiz, questions };
            
            const serializedQuiz = serializeQuiz(quizWithResources);
            setQuiz(serializedQuiz);
            dispatch(setCurrentQuiz(serializedQuiz));

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

        // ⚠️ Load questions for quiz from store (it only has metadata)
        console.log('📝 Loading questions for public quiz from store:', foundQuiz.title);
        console.log('🔍 Quiz metadata:', {
          id: foundQuiz.id,
          status: foundQuiz.status,
          visibility: foundQuiz.visibility,
          createdBy: foundQuiz.createdBy,
          currentUser: user?.uid
        });
        
        try {
          let questions: Question[] = [];

          // Try subcollection first, fallback to parent doc
          console.log('📡 Step 1: Querying subcollection at:', `quizzes/${id}/questions`);
          const questionsRef = collection(db, 'quizzes', id, 'questions');
          const questionsSnap = await getDocs(questionsRef);
          
          console.log('📊 Subcollection result:', {
            size: questionsSnap.size,
            empty: questionsSnap.empty,
            docsLength: questionsSnap.docs.length
          });
          
          if (!questionsSnap.empty) {
            // NEW structure
            questions = questionsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Question[];
            console.log('✅ [NEW] Store quiz from subcollection:', questions.length);
          } else {
            // OLD structure - check parent doc
            console.log('📡 Step 2: Checking parent document...');
            if (foundQuiz.questions && Array.isArray(foundQuiz.questions)) {
              questions = foundQuiz.questions.map((q: any, index: number) => ({
                id: q.id || `q${index}`,
                text: q.text || q.questionText || '',
                questionText: q.text || q.questionText || '',
                type: q.type || 'multiple-choice',
                answers: q.answers || [],
                correctAnswer: q.correctAnswer || null,
                acceptedAnswers: q.acceptedAnswers || [],
                explanation: q.explanation || '',
                points: q.points || 1,
                imageUrl: q.imageUrl || null
              })) as Question[];
              console.log('✅ [OLD] Store quiz from parent doc:', questions.length);
            } else {
              console.error('⚠️ WARNING: No questions found in either location!');
            }
          }
          
          console.log('✅ Final loaded questions for stored quiz:', questions.length);
          
          // Serialize timestamps
          const serializeQuiz = (quiz: any): Quiz => {
            const serialized = { ...quiz };
            if (serialized.stats?.lastUpdated?.toDate) {
              serialized.stats.lastUpdated = serialized.stats.lastUpdated.toDate().toISOString();
            }
            if (serialized.createdAt?.toDate) {
              serialized.createdAt = serialized.createdAt.toDate().toISOString();
            }
            if (serialized.updatedAt?.toDate) {
              serialized.updatedAt = serialized.updatedAt.toDate().toISOString();
            }
            if (serialized.approvedAt?.toDate) {
              serialized.approvedAt = serialized.approvedAt.toDate().toISOString();
            }
            return serialized;
          };
          
          const completeQuiz = serializeQuiz({
            ...foundQuiz,
            questions
          }) as Quiz;
          
          setNeedsPassword(false);
          setQuiz(completeQuiz);
          dispatch(setCurrentQuiz(completeQuiz));

          if (user) {
            quizStatsService.trackView(id, user.uid);
          } else {
            quizStatsService.trackView(id);
          }

          setLoading(false);
          return;
          
        } catch (questionsError) {
          console.error('❌ Error loading questions for stored quiz:', questionsError);
          setError('Lỗi khi tải câu hỏi');
          setLoading(false);
          return;
        }
      }

      console.log('🔍 Quiz not in store, loading from Firestore...');

      const metadata = await getQuizMetadata(id);

      if (!metadata) {
        setError('Quiz không tồn tại');
        setLoading(false);
        return;
      }

      console.log('✅ Loaded metadata:', metadata.title, 'visibility:', metadata.visibility);
      console.log('🔍 Metadata details:', {
        id: metadata.id,
        status: metadata.status,
        visibility: metadata.visibility,
        createdBy: metadata.createdBy,
        currentUser: user?.uid
      });
      const enrichedMetadata = enhanceMetadata(metadata);
      setQuizMetadata(enrichedMetadata);

      try {
        let questions: Question[] = [];

        // STRATEGY: Try subcollection first (NEW structure), fallback to parent doc (OLD structure)
        console.log('📡 Step 1: Checking subcollection at:', `quizzes/${id}/questions`);
        const questionsRef = collection(db, 'quizzes', id, 'questions');
        const questionsSnap = await getDocs(questionsRef);

        console.log('📊 Subcollection result:', {
          size: questionsSnap.size,
          empty: questionsSnap.empty,
          docsLength: questionsSnap.docs.length
        });

        if (!questionsSnap.empty) {
          // NEW structure - questions in subcollection
          questions = questionsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Question[];
          console.log('✅ [NEW] Loaded from subcollection:', questions.length, 'questions');
        } else {
          // OLD structure - questions in parent document
          console.log('📡 Step 2: Subcollection empty, checking parent document...');
          if (metadata.questions && Array.isArray(metadata.questions)) {
            questions = metadata.questions.map((q: any, index: number) => ({
              id: q.id || `q${index}`,
              text: q.text || q.questionText || '',
              questionText: q.text || q.questionText || '',
              type: q.type || 'multiple-choice',
              answers: q.answers || [],
              correctAnswer: q.correctAnswer || null,
              acceptedAnswers: q.acceptedAnswers || [],
              explanation: q.explanation || '',
              points: q.points || 1,
              imageUrl: q.imageUrl || null
            })) as Question[];
            console.log('✅ [OLD] Loaded from parent doc:', questions.length, 'questions');
          } else {
            console.error('⚠️ CRITICAL: No questions found in either location!');
            console.log('Quiz metadata status:', metadata.status);
            console.log('User is owner?', user?.uid === metadata.createdBy);
          }
        }

        console.log('✅ Final questions count:', questions.length);

        console.log('✅ Final questions count:', questions.length);
        
        // Serialize Firestore Timestamps before Redux
        const serializeQuiz = (quiz: any): Quiz => {
          const serialized = { ...quiz };
          
          // Convert Timestamp in stats.lastUpdated
          if (serialized.stats?.lastUpdated?.toDate) {
            serialized.stats.lastUpdated = serialized.stats.lastUpdated.toDate().toISOString();
          }
          
          // Convert Timestamp in createdAt
          if (serialized.createdAt?.toDate) {
            serialized.createdAt = serialized.createdAt.toDate().toISOString();
          }
          
          // Convert Timestamp in updatedAt
          if (serialized.updatedAt?.toDate) {
            serialized.updatedAt = serialized.updatedAt.toDate().toISOString();
          }
          
          // Convert Timestamp in approvedAt
          if (serialized.approvedAt?.toDate) {
            serialized.approvedAt = serialized.approvedAt.toDate().toISOString();
          }
          
          return serialized;
        };

        const completeQuiz = serializeQuiz({
          ...enrichedMetadata,
          questions
        }) as Quiz;

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
