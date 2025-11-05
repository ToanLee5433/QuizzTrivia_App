import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../../lib/store';
import { setCurrentQuiz } from '../../../store';
import { Quiz } from '../../../types';
import { quizStatsService } from '../../../../../services/quizStatsService';
import { getQuizMetadata, QuizMetadata } from '../../../../../lib/services/quizAccessService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase/config';

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
  const [quizMetadata, setQuizMetadata] = useState<QuizMetadata | null>(null);

  useEffect(() => {
    if (!id) {
      console.log('❌ No quiz ID provided');
      navigate('/quiz-list');
      return;
    }
    
    loadQuizData();
  }, [id, user]);

  const loadQuizData = async () => {
    if (!id) return;
    
    console.log('🔍 QuizPage: Loading quiz:', id);
    setLoading(true);
    setError(null);
    
    try {
      // First, try to find quiz in Redux store
      const foundQuiz = quizzes.find(q => q.id === id);
      
      if (foundQuiz) {
        console.log('✅ Found quiz in Redux store:', foundQuiz.title);
        
        // 🔒 CHECK PASSWORD PROTECTION - Even if quiz is in Redux!
        // This is critical because Redux may have old quiz format with questions embedded
        const quizVisibility = (foundQuiz as any).visibility || (foundQuiz as any).havePassword;
        
        if (quizVisibility === 'password') {
          console.log('🔒 Quiz requires password, checking access...');
          
          // Load metadata to get pwd info
          const metadata = await getQuizMetadata(id);
          if (!metadata) {
            setError('Quiz không tồn tại');
            setLoading(false);
            return;
          }
          
          setQuizMetadata(metadata);
          
          // Try to access questions to verify permission
          try {
            const questionsRef = collection(db, 'quizzes', id, 'questions');
            await getDocs(questionsRef); // Just test permission, don't need result
            
            // If we can read questions, user has access
            console.log('✅ User has access to password-protected quiz');
            setQuiz(foundQuiz);
            dispatch(setCurrentQuiz(foundQuiz));
            
            // Track view
            if (user) {
              quizStatsService.trackView(id, user.uid);
            } else {
              quizStatsService.trackView(id);
            }
            
            setLoading(false);
          } catch (permissionError: any) {
            // Permission denied - need password
            if (permissionError.code === 'permission-denied') {
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
        
        // Public quiz - use from Redux
        setQuiz(foundQuiz);
        dispatch(setCurrentQuiz(foundQuiz));
        
        // Track view
        if (user) {
          quizStatsService.trackView(id, user.uid);
        } else {
          quizStatsService.trackView(id);
        }
        
        setLoading(false);
        return;
      }

      // Not in store, try to load from Firestore
      console.log('🔍 Quiz not in store, loading from Firestore...');
      
      // Load metadata first (always allowed)
      const metadata = await getQuizMetadata(id);
      
      if (!metadata) {
        setError('Quiz không tồn tại');
        setLoading(false);
        return;
      }
      
      console.log('� Loaded metadata:', metadata.title, 'visibility:', metadata.visibility);
      setQuizMetadata(metadata);

      // Try to load questions
      try {
        const questionsRef = collection(db, 'quizzes', id, 'questions');
        const questionsSnap = await getDocs(questionsRef);
        
        const questions = questionsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log('✅ Loaded questions:', questions.length);

        // Build complete quiz object
        const completeQuiz = {
          ...metadata,
          questions
        } as unknown as Quiz;

        setQuiz(completeQuiz);
        dispatch(setCurrentQuiz(completeQuiz));

        // Track view
        if (user) {
          quizStatsService.trackView(id, user.uid);
        } else {
          quizStatsService.trackView(id);
        }

        setLoading(false);
      } catch (questionsError: any) {
        console.error('❌ Error loading questions:', questionsError);
        
        // Check if it's a permission error (password-protected quiz)
        if (questionsError.code === 'permission-denied') {
          console.log('🔒 Quiz requires password');
          
          // Check if this is a password-protected quiz
          if (metadata.visibility === 'password') {
            setNeedsPassword(true);
            setError(null); // Clear error, will show password modal
          } else {
            setError('Không có quyền truy cập quiz này');
          }
        } else {
          setError('Lỗi khi tải câu hỏi');
        }
        
        setLoading(false);
      }
      
    } catch (err: any) {
      console.error('❌ Error loading quiz:', err);
      setError(err.message || 'Không thể tải quiz');
      setLoading(false);
    }
  };

  // Function to retry loading after password unlock
  const retryLoad = () => {
    setNeedsPassword(false);
    loadQuizData();
  };
  
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
