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
        
        // Add current result if provided and not already in the results
        const currentResultValue = currentResultRef.current;
        if (currentResultValue && user) {
          // Check if this exact result already exists in Firestore by comparing data
          const currentScore = currentResultValue.score?.percentage || 0;
          const currentCorrect = currentResultValue.correct || 0;
          const currentTotal = currentResultValue.total || 0;
          const currentTimeSpent = currentResultValue.timeSpent || 0;
          
          const alreadySaved = quizResults.some((result: any) => 
            result.userId === user.uid && 
            result.correctAnswers === currentCorrect &&
            result.totalQuestions === currentTotal &&
            Math.abs((result.timeSpent || 0) - currentTimeSpent) < 10 // Within 10 seconds difference
          );
          
          if (!alreadySaved) {
            console.log('➕ Adding current result to leaderboard:', currentResultValue);
            const currentEntry = {
              id: 'current-attempt',
              userId: user.uid,
              userName: user.displayName || user.email?.split('@')[0] || 'Bạn',
              userEmail: user.email || '',
              userPhotoURL: user.photoURL || '',
              quizId: quizId,
              score: currentScore,
              correctAnswers: currentCorrect,
              totalQuestions: currentTotal,
              timeSpent: currentTimeSpent,
              answers: [],
              completedAt: new Date() // Just completed
            };
            allResults.push(currentEntry);
          } else {
            console.log('📋 Current result already exists in leaderboard (matching data found), skipping duplicate add');
          }
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
              completedAt: result.completedAt instanceof Date ? result.completedAt : new Date(result.completedAt),
              isCurrentAttempt: result.id === 'current-attempt' // Mark if this is current attempt
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

        console.log('📊 Sorted leaderboard with all attempts:', sortedLeaderboard);
        
        // Mark the latest attempt by current user if not already marked
        if (currentResultValue && user && !sortedLeaderboard.some(e => e.isCurrentAttempt)) {
          const currentScore = currentResultValue.score?.percentage || 0;
          const currentCorrect = currentResultValue.correct || 0;
          const currentTotal = currentResultValue.total || 0;
          const currentTimeSpent = currentResultValue.timeSpent || 0;
          
          // Find matching entry (most recent with same data)
          const matchingIndex = sortedLeaderboard.findIndex((entry: LeaderboardEntry) => 
            entry.userId === user.uid &&
            entry.score === currentScore &&
            entry.correctAnswers === currentCorrect &&
            entry.totalQuestions === currentTotal &&
            Math.abs((entry.timeSpent || 0) - currentTimeSpent) < 10
          );
          
          if (matchingIndex >= 0) {
            sortedLeaderboard[matchingIndex].isCurrentAttempt = true;
            console.log('✅ Marked latest attempt at index:', matchingIndex, sortedLeaderboard[matchingIndex]);
          }
        }
        
        // Show ALL attempts (including multiple attempts from same user)
        // The current-attempt will be highlighted in the UI
        setLeaderboard(sortedLeaderboard);

        // Find current attempt's rank (if exists)
        if (currentResultValue && user) {
          // Try to find by resultId first (from currentResult object)
          let currentAttemptIndex = -1;
          const resultId = currentResultValue.id || currentResultValue.resultId;
          if (resultId) {
            currentAttemptIndex = sortedLeaderboard.findIndex((r: LeaderboardEntry) => r.id === resultId);
          }
          
          // If not found by resultId, try to find by 'current-attempt' id (for unsaved results)
          if (currentAttemptIndex < 0) {
            currentAttemptIndex = sortedLeaderboard.findIndex((r: LeaderboardEntry) => r.id === 'current-attempt');
          }
          
          // If still not found, find by matching data (score, correct answers, timeSpent)
          if (currentAttemptIndex < 0) {
            const currentScore = currentResultValue.score?.percentage || 0;
            const currentCorrect = currentResultValue.correct || 0;
            const currentTotal = currentResultValue.total || 0;
            const currentTimeSpent = currentResultValue.timeSpent || 0;
            
            currentAttemptIndex = sortedLeaderboard.findIndex((r: LeaderboardEntry) => 
              r.userId === user.uid &&
              r.score === currentScore &&
              r.correctAnswers === currentCorrect &&
              r.totalQuestions === currentTotal &&
              Math.abs((r.timeSpent || 0) - currentTimeSpent) < 10
            );
          }
          
          setUserRank(currentAttemptIndex >= 0 ? currentAttemptIndex + 1 : null);
          console.log('👤 Current attempt rank:', currentAttemptIndex >= 0 ? currentAttemptIndex + 1 : 'Not found', {
            foundBy: currentAttemptIndex >= 0 ? 
              (resultId && sortedLeaderboard[currentAttemptIndex]?.id === resultId ? 'resultId' : 
               sortedLeaderboard[currentAttemptIndex]?.id === 'current-attempt' ? 'current-attempt' : 'data-match') 
              : 'none',
            resultId,
            foundEntry: currentAttemptIndex >= 0 ? sortedLeaderboard[currentAttemptIndex] : null
          });
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
