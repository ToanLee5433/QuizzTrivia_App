import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../lib/store';
import { Quiz } from '../../../types';
import { getQuizById } from '../../../services/quiz';
import { toast } from 'react-toastify';
import { ResultState } from '../types';
import { getQuizResultById } from '../../../api/base';

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
    console.log('🔍 URL attemptId type and value:', typeof attemptId, attemptId);
    console.log('🔍 Current URL:', window.location.href);
    
    if (location.state) {
      // Có state từ navigation - sử dụng ngay
      const resultData = location.state as ResultState;
      console.log('✅ Using state from navigation:', resultData);
      setResult(resultData);
      setQuizId(resultData.quizId || attemptId || null);
    } else if (attemptId) {
      // Không có state, fetch từ Firestore bằng attemptId (quizResults doc id)
      (async () => {
        try {
          console.log('📡 Fetching quizResult document for attemptId:', attemptId);
          console.log('📡 This should be a Firestore document ID, not a quiz ID');
          const raw = await getQuizResultById(attemptId);
          if (!raw) {
            console.error('❌ No quizResult found for attemptId:', attemptId);
            console.error('❌ This might mean attemptId is not a valid Firestore document ID');
            navigate('/quiz-list');
            return;
          }
          // Map Firestore quizResult -> ResultState shape
          const totalQuestions = (raw.totalQuestions ?? (raw.answers?.length || 0));
          let correctAnswers = (raw.correctAnswers ?? 0);
          // Heuristic: if correctAnswers missing/zero but score >0, derive from score percentage
          if ((correctAnswers === 0 || correctAnswers === undefined) && typeof raw.score === 'number' && raw.score > 0 && totalQuestions > 0) {
            const derived = Math.round(((raw.score <= 1 ? raw.score * 100 : raw.score) / 100) * totalQuestions);
            console.log('🛠️ Deriving correctAnswers from score since legacy record lacks it:', { derived, rawScore: raw.score, totalQuestions });
            correctAnswers = derived;
          }
          const mapped: ResultState = {
            score: typeof raw.score === 'number' ? (raw.score <= 1 ? raw.score * 100 : raw.score) : 0,
            correct: correctAnswers,
            total: totalQuestions,
            answers: (raw.answers || []).reduce((acc: Record<string,string>, ans: any) => {
              acc[ans.questionId] = ans.selectedAnswerId;
              return acc;
            }, {}),
            timeSpent: raw.timeSpent,
            quizId: raw.quizId
          };
          console.log('✅ Mapped quizResult -> ResultState:', mapped);
          setResult(mapped);
          setQuizId(raw.quizId || null);
        } catch (e) {
          console.error('❌ Error fetching quiz result by attemptId:', e);
          navigate('/quiz-list');
        }
      })();
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

  // Secondary reconciliation: once quiz loaded, if result.correct seems inconsistent with quiz + answers, recompute.
  useEffect(() => {
    if (!quiz || !result) return;
    if (!quiz.questions?.length) return;
    // Only attempt if (a) result.correct is 0 but score > 0 OR (b) percentage mismatch > 5%.
    const currentPct = result.total > 0 ? (result.correct / result.total) * 100 : 0;
    const storedPct = result.score;
    const needsRecompute = (result.correct === 0 && storedPct > 0) || Math.abs(currentPct - storedPct) > 5;
    if (!needsRecompute) return;
    console.log('🛠️ Recomputing correct count from quiz questions for legacy result');
    // Build reverse map of user answers
    const userAnswers = result.answers;
    let computedCorrect = 0;
    quiz.questions.forEach(q => {
      const userVal = userAnswers[q.id];
      if (userVal === undefined) return;
      switch (q.type) {
        case 'multiple':
        case 'boolean':
        case 'image': {
          const correctId = q.answers.find(a => a.isCorrect)?.id;
          if (userVal === correctId) computedCorrect++;
          break;
        }
        case 'checkbox': {
          try {
            const parsed = JSON.parse(userVal);
            if (Array.isArray(parsed)) {
              const correctIds = q.answers.filter(a => a.isCorrect).map(a => a.id).sort();
              const userIds = [...parsed].sort();
              if (JSON.stringify(correctIds) === JSON.stringify(userIds)) computedCorrect++;
            }
          } catch {}
          break;
        }
        case 'short_answer': {
          // Simplistic: compare lowercased trimmed text with any correct answer text flagged isCorrect
          const normalized = (val: string) => val?.trim().toLowerCase();
          const userText = normalized(userVal);
            const acceptable = q.answers.filter(a => a.isCorrect).map(a => normalized(a.text));
            if (acceptable.includes(userText)) computedCorrect++;
          break;
        }
      }
    });
    if (computedCorrect !== result.correct && result.total > 0) {
      const recomputedScore = Math.round((computedCorrect / result.total) * 100);
      console.log('✅ Recomputed correctness for legacy result:', { computedCorrect, recomputedScore });
      setResult(prev => prev ? { ...prev, correct: computedCorrect, score: recomputedScore } : prev);
    }
  }, [quiz, result]);

  return {
    result,
    quiz,
    quizId,
    isLoading: !result || !quiz
  };
};
