import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../lib/store';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import QuizList from './QuizList';
import { Quiz } from '../types';
import { fetchQuizzes } from '../store';

const FavoritesPage: React.FC = () => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const allQuizzes = useSelector((state: RootState) => state.quiz.quizzes);
  const quizLoading = useSelector((state: RootState) => state.quiz.loading || state.quiz.isLoading);
  const dispatch = useDispatch();
  const [favoriteQuizzes, setFavoriteQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (allQuizzes.length === 0 && !quizLoading) {
      dispatch(fetchQuizzes({ user }) as any)
        .unwrap()
        .catch(() => {
          setError(t('favorites.loadError'));
          setLoading(false);
        });
      return;
    }
    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const favRef = doc(db, 'user_favorites', user.uid);
        const favSnap = await getDoc(favRef);
        if (favSnap.exists()) {
          const quizIds = favSnap.data().quizIds || [];
          setFavoriteQuizzes(allQuizzes.filter(q => quizIds.includes(q.id)));
        } else {
          setFavoriteQuizzes([]);
        }
        setError(null);
      } catch (e) {
        setError(t('favorites.fetchError'));
      }
      setLoading(false);
    };
    fetchFavorites();
  }, [user, allQuizzes, quizLoading, dispatch, t]);

  if (!user) return <div className="p-8 text-center">{t('favorites.loginRequired')}</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (loading || quizLoading) return <div className="p-8 text-center">{t('loading')}</div>;

  return <QuizList quizzes={favoriteQuizzes} title={t('favorites.title')} />;
};

export default FavoritesPage; 