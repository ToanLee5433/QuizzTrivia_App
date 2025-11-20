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
        
        // Get all quiz results
        let allResults = [...quizResults];
        
        // Add current result if provided
        const currentResultValue = currentResultRef.current;
        if (currentResultValue && user) {
          console.log('➕ Adding current result to leaderboard:', currentResultValue);
          const currentEntry = {
            id: 'current-attempt',
            userId: user.uid,
            userName: user.displayName || user.email?.split('@')[0] || 'Bạn',
            userEmail: user.email || '',
            userPhotoURL: user.photoURL || '',
            quizId: quizId,
            score: currentResultValue.score?.percentage || 0,
            correctAnswers: currentResultValue.correct || 0,
            totalQuestions: currentResultValue.total || 0,
            timeSpent: currentResultValue.timeSpent || 0,
            answers: [],
            completedAt: new Date() // Just completed
          };
          allResults.push(currentEntry);
        }
        
        // Transform QuizResult data to LeaderboardEntry format with photoURL
        const transformedLeaderboard: LeaderboardEntry[] = await Promise.all(
          allResults.map(async (result: any) => {
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
            
            // Calculate percentage from correctAnswers/totalQuestions
            const percentage = result.totalQuestions > 0 
              ? Math.round((result.correctAnswers / result.totalQuestions) * 100)
              : result.percentage || result.score || 0;
            
            return {
              id: result.id,
              userId: result.userId,
              userName: result.userName,
              userEmail: result.userEmail,
              userPhotoURL,
              score: percentage, // Use percentage (0-100) not raw score
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
        
        // Show top 10 entries
        setLeaderboard(sortedLeaderboard);

        // Find current attempt's rank (if exists)
        if (currentResultValue && user) {
          const currentAttemptIndex = sortedLeaderboard.findIndex((r: LeaderboardEntry) => r.id === 'current-attempt');
          setUserRank(currentAttemptIndex >= 0 ? currentAttemptIndex + 1 : null);
          console.log('👤 Current attempt rank:', currentAttemptIndex >= 0 ? currentAttemptIndex + 1 : 'Not found');
        } else if (user) {
          // If no current result, find user's best rank
          const userResultIndex = sortedLeaderboard.findIndex((r: LeaderboardEntry) => r.userId === user.uid);
          setUserRank(userResultIndex >= 0 ? userResultIndex + 1 : null);
          console.log('👤 User best rank:', userResultIndex >= 0 ? userResultIndex + 1 : 'Not found');
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
