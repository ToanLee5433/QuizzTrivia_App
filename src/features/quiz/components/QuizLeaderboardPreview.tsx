/**
 * 🏆 Quiz Leaderboard Preview Component
 * 
 * A compact leaderboard display for the Quiz Preview Page
 * Shows top 5 players with their scores and times
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { getQuizResults } from '../api/base';

interface LeaderboardEntry {
  id: string;
  rank: number;
  userId: string;
  userName: string;
  userPhotoURL: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  completedAt: Date;
}

interface QuizLeaderboardPreviewProps {
  quizId: string;
  maxDisplay?: number;
}

// Helper: format time in mm:ss or X h Y m Z s
const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

// Get medal/rank display
const getRankDisplay = (rank: number) => {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return `#${rank}`;
  }
};

// Get rank background styling
const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1: return 'bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-300 dark:from-yellow-900/30 dark:to-amber-900/30 dark:border-yellow-700';
    case 2: return 'bg-gradient-to-r from-slate-100 to-gray-100 border-slate-300 dark:from-slate-800/50 dark:to-gray-800/50 dark:border-slate-600';
    case 3: return 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-300 dark:from-orange-900/30 dark:to-amber-900/30 dark:border-orange-700';
    default: return 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700';
  }
};

export const QuizLeaderboardPreview: React.FC<QuizLeaderboardPreviewProps> = ({
  quizId,
  maxDisplay = 5
}) => {
  const { t } = useTranslation();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [uniqueParticipants, setUniqueParticipants] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!quizId) return;

      try {
        setLoading(true);
        console.log('📊 Fetching leaderboard for quiz preview:', quizId);

        const quizResults = await getQuizResults(quizId);
        
        if (!quizResults || quizResults.length === 0) {
          setLeaderboard([]);
          setUniqueParticipants(0);
          setTotalAttempts(0);
          return;
        }

        // Get unique participants
        const userIds = new Set(quizResults.map((r: any) => r.userId).filter(Boolean));
        setUniqueParticipants(userIds.size);
        setTotalAttempts(quizResults.length);

        // Transform and sort results
        const transformedResults: LeaderboardEntry[] = await Promise.all(
          quizResults.map(async (result: any) => {
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

            const percentage = result.totalQuestions > 0
              ? Math.round((result.correctAnswers / result.totalQuestions) * 100)
              : result.percentage || result.score || 0;

            return {
              id: result.id,
              rank: 0, // Will be set after sorting
              userId: result.userId,
              userName: result.userName || 'Anonymous',
              userPhotoURL,
              score: percentage,
              correctAnswers: result.correctAnswers || 0,
              totalQuestions: result.totalQuestions || 0,
              timeSpent: result.timeSpent || 0,
              completedAt: result.completedAt instanceof Date
                ? result.completedAt
                : new Date(result.completedAt)
            };
          })
        );

        // Sort by score (descending), then by time (ascending)
        const sortedResults = transformedResults.sort((a, b) => {
          if (a.score !== b.score) return b.score - a.score;
          return a.timeSpent - b.timeSpent;
        });

        // Assign ranks
        sortedResults.forEach((entry, index) => {
          entry.rank = index + 1;
        });

        console.log('📊 Leaderboard loaded:', sortedResults.length, 'entries');
        setLeaderboard(sortedResults);
      } catch (error) {
        console.error('❌ Error fetching leaderboard:', error);
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [quizId]);

  const displayedLeaderboard = showAll ? leaderboard : leaderboard.slice(0, maxDisplay);
  const hasMore = leaderboard.length > maxDisplay;

  if (loading) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('quizOverview.leaderboard.title', 'Bảng xếp hạng')}
          </h2>
        </div>
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <span className="ml-3 text-slate-500 dark:text-slate-400">
            {t('quizOverview.leaderboard.loading', 'Đang tải...')}
          </span>
        </div>
      </motion.div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('quizOverview.leaderboard.title', 'Bảng xếp hạng')}
          </h2>
        </div>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-slate-600 dark:text-slate-400">
            {t('quizOverview.leaderboard.noResults', 'Chưa có kết quả nào!')}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
            {t('quizOverview.leaderboard.beFirst', 'Hãy là người đầu tiên hoàn thành quiz này!')}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('quizOverview.leaderboard.title', 'Bảng xếp hạng')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('quizOverview.leaderboard.subtitle', 'Top {{count}} người chơi xuất sắc nhất', { count: maxDisplay })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {uniqueParticipants}
          </span>
          <span>•</span>
          <span>{totalAttempts} {t('quizOverview.leaderboard.attempts', 'lượt chơi')}</span>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        {displayedLeaderboard.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-md ${getRankStyle(entry.rank)}`}
          >
            {/* Rank */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
              entry.rank <= 3
                ? 'text-2xl'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm'
            }`}>
              {getRankDisplay(entry.rank)}
            </div>

            {/* Avatar */}
            {entry.userPhotoURL ? (
              <img
                src={entry.userPhotoURL}
                alt={entry.userName}
                className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white font-semibold text-sm">
                  {entry.userName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 dark:text-white truncate">
                {entry.userName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {entry.correctAnswers}/{entry.totalQuestions} {t('quizOverview.leaderboard.correct', 'đúng')}
              </p>
            </div>

            {/* Score & Time */}
            <div className="text-right flex-shrink-0">
              <p className={`font-bold text-lg ${
                entry.score >= 80 ? 'text-green-600 dark:text-green-400' :
                entry.score >= 60 ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {entry.score}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(entry.timeSpent)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4" />
                {t('quizOverview.leaderboard.showLess', 'Thu gọn')}
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {t('quizOverview.leaderboard.showMore', 'Xem thêm {{count}} người', {
                  count: leaderboard.length - maxDisplay
                })}
              </>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default QuizLeaderboardPreview;
