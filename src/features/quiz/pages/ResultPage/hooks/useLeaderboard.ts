import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../lib/store';
import { toast } from 'react-toastify';
import { LeaderboardEntry } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase/config';

export const useLeaderboard = (quizId: string | null, currentResult?: any) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const isFetchingRef = useRef(false);
  const currentResultRef = useRef(currentResult);
  
  // Update ref when currentResult changes
  useEffect(() => {
    currentResultRef.current = currentResult;
  }, [currentResult]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!quizId || isFetchingRef.current) return;
      
      try {
        isFetchingRef.current = true;
        setLoadingStats(true);
        console.log('📊 Fetching leaderboard for quiz:', quizId);
        
        // Fetch leaderboard from Firestore using quiz results
        const { getQuizResults } = await import('../../../api/base');
        const quizResults = await getQuizResults(quizId);
        
        console.log('📊 Raw quiz results:', quizResults);
        
        // Use only real data
        const leaderboardData = quizResults;
        
        // Add current result to leaderboard if provided
        const currentResultValue = currentResultRef.current;
        if (currentResultValue && user) {
          console.log('➕ Adding current result to leaderboard:', currentResultValue);
          const currentEntry = {
            id: 'current-attempt',
            userId: user.uid,
            userName: user.displayName || user.email?.split('@')[0] || 'Bạn',
            userEmail: user.email || '',
            quizId: quizId,
            score: currentResultValue.score?.percentage || 0,
            correctAnswers: currentResultValue.correct || 0,
            totalQuestions: currentResultValue.total || 0,
            timeSpent: currentResultValue.timeSpent || 0,
            answers: [],
            completedAt: new Date() // Just completed
          };
          leaderboardData.push(currentEntry);
        }
        
        // Transform QuizResult data to LeaderboardEntry format with photoURL
        const transformedLeaderboard: LeaderboardEntry[] = await Promise.all(
          leaderboardData.map(async (result: any) => {
            let userPhotoURL = '';
            if (result.userId) {
              try {
                const userDoc = await getDoc(doc(db, 'users', result.userId));
                if (userDoc.exists()) {
                  userPhotoURL = userDoc.data().photoURL || '';
                }
              } catch (err) {
                console.error('Error fetching user photo:', err);
              }
            }
            
            return {
              id: result.id,
              userId: result.userId,
              userName: result.userName,
              userEmail: result.userEmail,
              userPhotoURL,
              score: result.score,
              correctAnswers: result.correctAnswers,
              totalQuestions: result.totalQuestions,
              timeSpent: result.timeSpent,
              completedAt: result.completedAt instanceof Date ? result.completedAt : new Date(result.completedAt)
            };
          })
        );
        
        // Sort by score (descending) then by time (ascending) for same scores
        const sortedLeaderboard = transformedLeaderboard.sort((a, b) => {
          if (a.score !== b.score) {
            return b.score - a.score; // Higher score first
          }
          return a.timeSpent - b.timeSpent; // Faster time first if same score
        });

        console.log('📊 Sorted leaderboard:', sortedLeaderboard);
        setLeaderboard(sortedLeaderboard.slice(0, 10)); // Top 10

        // Find current user's rank
        if (user) {
          const userResultIndex = sortedLeaderboard.findIndex((r: LeaderboardEntry) => r.userId === user.uid);
          setUserRank(userResultIndex >= 0 ? userResultIndex + 1 : null);
          console.log('👤 User rank:', userResultIndex >= 0 ? userResultIndex + 1 : 'Not found');
        }

        console.log('📊 Leaderboard loaded:', sortedLeaderboard.length, 'entries');
      } catch (error) {
        console.error('❌ Failed to fetch leaderboard:', error);
        toast.error('Không thể tải bảng xếp hạng!');
      } finally {
        setLoadingStats(false);
        isFetchingRef.current = false;
      }
    };

    fetchLeaderboard();
  }, [quizId, user]);

  return {
    leaderboard,
    userRank,
    loadingStats
  };
};
