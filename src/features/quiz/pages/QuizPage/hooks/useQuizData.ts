import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../../lib/store';
import { setCurrentQuiz } from '../../../store';
import { Quiz } from '../../../types';
import { quizStatsService } from '../../../../../services/quizStatsService';

export const useQuizData = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { quizzes, currentQuiz, loading, error } = useSelector((state: RootState) => state.quiz);
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    console.log('🔍 QuizPage: Looking for quiz:', id);
    console.log('🔍 Available quizzes:', quizzes.map(q => ({id: q.id, title: q.title})));
    
    if (!id) {
      console.log('❌ No quiz ID provided');
      navigate('/quiz-list');
      return;
    }
    
    // First check if quiz is already in Redux store
    const foundQuiz = quizzes.find(q => q.id === id);
    console.log('🔍 Found quiz in store:', foundQuiz ? foundQuiz.title : 'NOT FOUND');
    
    if (foundQuiz) {
      setQuiz(foundQuiz);
      // Initialize quiz timer in Redux store
      dispatch(setCurrentQuiz(foundQuiz));
      
      // Track view when quiz is loaded
      if (user) {
        console.log('📊 Tracking quiz view for user:', user.uid);
        quizStatsService.trackView(id, user.uid);
      } else {
        console.log('📊 Tracking anonymous quiz view');
        quizStatsService.trackView(id);
      }
    } else {
      // If not in store, show error for now
      console.log('❌ Quiz not found in store');
      navigate('/quiz-list');
    }
  }, [id, quizzes, navigate, dispatch, user]);
  
  // Handle currentQuiz from Redux (when fetched individually)
  useEffect(() => {
    if (currentQuiz && currentQuiz.id === id) {
      console.log('🔍 Using currentQuiz from Redux:', currentQuiz.title);
      setQuiz(currentQuiz);
    }
  }, [currentQuiz, id]);

  return { quiz, loading, error };
};
