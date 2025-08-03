import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../lib/store';
import { Quiz } from '../../../types';
import { getQuizById } from '../../../services/quiz';
import { toast } from 'react-toastify';
import { ResultState } from '../types';

export const useResultData = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { quizzes } = useSelector((state: RootState) => state.quiz);
  
  const [result, setResult] = useState<ResultState | null>(location.state as ResultState || null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    console.log('🔍 ResultPage useEffect - attemptId:', attemptId, 'location.state:', location.state);
    
    if (location.state) {
      // Có state từ navigation - sử dụng ngay
      const resultData = location.state as ResultState;
      console.log('✅ Using state from navigation:', resultData);
      setResult(resultData);
      setQuizId(resultData.quizId || attemptId || null);
    } else if (attemptId) {
      // Không có state, cần fetch từ Firestore
      console.log('📡 Fetching result from Firestore for attemptId:', attemptId);
      // Đã xoá dòng getQuizResultById(attemptId).then(...)
      // Đã xoá các dòng setError(true);
      if (quizId) {
        getQuizById(quizId).then((qz: Quiz) => {
          setQuiz(qz);
        }).catch(() => {
          // Xử lý lỗi nếu cần
        });
      }
    } else {
      console.error('❌ No attemptId or state provided');
      navigate('/quiz-list');
    }
  }, [attemptId, location.state, navigate]);

  useEffect(() => {
    if (!quizId) return;
    
    console.log('🔍 Looking for quiz with ID:', quizId);
    const foundQuiz = quizzes.find(q => q.id === quizId);
    
    if (foundQuiz) {
      console.log('✅ Found quiz in store:', foundQuiz.title);
      setQuiz(foundQuiz);
    } else {
      console.log('📡 Quiz not in store, fetching from Firestore...');
      // Nếu không có trong store, fetch từ Firestore
      getQuizById(quizId).then(qz => {
        if (qz) {
          console.log('✅ Fetched quiz from Firestore:', qz.title);
          setQuiz(qz);
        } else {
          console.error('❌ Quiz not found:', quizId);
          toast.error('Không tìm thấy quiz!');
          navigate('/quiz-list');
        }
      }).catch(error => {
        console.error('❌ Error fetching quiz:', error);
        toast.error('Không thể tải quiz!');
        navigate('/quiz-list');
      });
    }
  }, [quizId, quizzes, navigate]);

  return {
    result,
    quiz,
    quizId,
    isLoading: !result || !quiz
  };
};
