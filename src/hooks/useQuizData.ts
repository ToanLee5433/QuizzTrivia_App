/**
 * 🎯 useQuizData Hook
 * ====================
 * Hook thông minh tự động chọn nguồn dữ liệu:
 * 1. Firestore (Hot Layer) - online
 * 2. Downloaded Quiz (Cold Layer) - offline
 * 3. Firestore Cache - network failure
 */

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { downloadManager } from '../features/offline/DownloadManager';

// ============================================================================
// TYPES
// ============================================================================

interface QuizData {
  id: string;
  title: string;
  description?: string;
  category?: string;
  difficulty?: string;
  questions: any[];
  coverImage?: string;
  [key: string]: any;
}

interface UseQuizDataResult {
  quiz: QuizData | null;
  isLoading: boolean;
  error: string | null;
  source: 'firestore' | 'cache' | 'downloaded' | null;
  isFromOffline: boolean;
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * 🔐 Hook để fetch quiz data với automatic fallback
 * 
 * @param quizId - Quiz ID
 * @param userId - User ID (REQUIRED for security)
 * @param forceOffline - Force load từ downloaded (optional)
 */
export function useQuizData(
  quizId: string | null,
  userId: string | null,
  forceOffline: boolean = false
): UseQuizDataResult {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'firestore' | 'cache' | 'downloaded' | null>(null);

  useEffect(() => {
    if (!quizId || !userId) {
      setQuiz(null);
      setIsLoading(false);
      setError(!userId ? 'User ID required for security' : null);
      setSource(null);
      return;
    }

    loadQuizData();
  }, [quizId, userId, forceOffline]);

  const loadQuizData = async () => {
    if (!quizId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Strategy 1: Check if force offline or explicitly requested
      if (forceOffline) {
        console.log('[useQuizData] Force offline mode');
        const downloaded = await loadFromDownloaded(quizId);
        if (downloaded) {
          setQuiz(downloaded);
          setSource('downloaded');
          setIsLoading(false);
          return;
        }

        // If not downloaded, try Firestore cache
        console.log('[useQuizData] Not downloaded, trying Firestore cache');
      }

      // Strategy 2: Try Firestore (with automatic cache fallback)
      if (navigator.onLine) {
        try {
          const firestoreData = await loadFromFirestore(quizId);
          setQuiz(firestoreData);
          setSource('firestore');
          setIsLoading(false);
          return;
        } catch (firestoreError) {
          console.warn('[useQuizData] Firestore failed, trying alternatives');
        }
      }

      // Strategy 3: Try downloaded quiz (Cold Layer)
      const downloaded = await loadFromDownloaded(quizId);
      if (downloaded) {
        console.log('[useQuizData] Loaded from downloaded');
        setQuiz(downloaded);
        setSource('downloaded');
        setIsLoading(false);
        return;
      }

      // Strategy 4: Final fallback - Firestore with cache (Hot Layer)
      try {
        const cachedData = await loadFromFirestore(quizId);
        console.log('[useQuizData] Loaded from Firestore cache');
        setQuiz(cachedData);
        setSource('cache');
        setIsLoading(false);
        return;
      } catch (cacheError) {
        console.error('[useQuizData] All strategies failed');
        throw new Error('Không thể tải quiz. Vui lòng kiểm tra kết nối.');
      }
    } catch (err) {
      console.error('[useQuizData] Error:', err);
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  /**
   * Load from Firestore (Hot Layer)
   */
  const loadFromFirestore = async (quizId: string): Promise<QuizData> => {
    const docRef = doc(db, 'quizzes', quizId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      throw new Error('Quiz not found');
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as QuizData;
  };

  /**
   * 🔐 Load from Downloaded Quizzes (Cold Layer)
   * 🔥 NEW: Auto-check for updates when online
   */
  const loadFromDownloaded = async (quizId: string): Promise<QuizData | null> => {
    if (!userId) return null;
    
    const downloaded = await downloadManager.getDownloadedQuiz(quizId, userId);

    if (!downloaded) {
      return null;
    }

    // 🔥 Background update check (non-blocking)
    if (navigator.onLine && !forceOffline && userId) {
      downloadManager.checkForUpdate(quizId, userId).then((result) => {
        if (result.hasUpdate) {
          console.log('[useQuizData] Update available for quiz:', quizId);
          // Dispatch custom event để UI có thể hiển thị notification
          window.dispatchEvent(
            new CustomEvent('quiz-update-available', {
              detail: { quizId, result },
            })
          );
        }
      }).catch((err) => {
        console.warn('[useQuizData] Update check failed:', err);
      });
    }

    // Convert DownloadedQuiz to QuizData format
    return {
      id: downloaded.id,
      title: downloaded.title,
      description: downloaded.description,
      category: downloaded.category,
      difficulty: downloaded.difficulty,
      questions: downloaded.questions,
      coverImage: downloaded.coverImage,
    };
  };

  /**
   * Refresh data (force reload from network)
   */
  const refresh = async () => {
    if (!quizId) return;

    setIsLoading(true);
    setError(null);

    try {
      const firestoreData = await loadFromFirestore(quizId);
      setQuiz(firestoreData);
      setSource('firestore');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    quiz,
    isLoading,
    error,
    source,
    isFromOffline: source === 'downloaded' || source === 'cache',
    refresh,
  };
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Normal quiz page
 * 
 * ```tsx
 * const QuizPage = () => {
 *   const { quizId } = useParams();
 *   const { quiz, isLoading, error, source, isFromOffline } = useQuizData(quizId);
 * 
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 * 
 *   return (
 *     <div>
 *       {isFromOffline && (
 *         <Badge>Offline Mode - {source === 'downloaded' ? 'Downloaded' : 'Cached'}</Badge>
 *       )}
 *       <QuizPlayer quiz={quiz} />
 *     </div>
 *   );
 * };
 * ```
 * 
 * Example 2: Force offline mode
 * 
 * ```tsx
 * const OfflineQuizPage = () => {
 *   const { quizId } = useParams();
 *   const { quiz, isLoading, error } = useQuizData(quizId, true); // forceOffline=true
 * 
 *   // Will only load from downloaded quizzes
 * };
 * ```
 * 
 * Example 3: With refresh button
 * 
 * ```tsx
 * const QuizPage = () => {
 *   const { quiz, isLoading, refresh, isFromOffline } = useQuizData(quizId);
 * 
 *   return (
 *     <div>
 *       {isFromOffline && navigator.onLine && (
 *         <button onClick={refresh}>
 *           🔄 Refresh from server
 *         </button>
 *       )}
 *       <QuizPlayer quiz={quiz} />
 *     </div>
 *   );
 * };
 * ```
 */

export default useQuizData;
