import React, { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../../../lib/store';
import { LeaderboardEntry } from '../types';
import { safeNumber, formatDetailedTime, formatDateTime, getRankDisplay, getRankBackgroundColor } from '../utils';
import soundService from '../../../../../services/soundService';

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  loadingStats: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ 
  leaderboard, 
  userRank, 
  loadingStats 
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showAll, setShowAll] = React.useState(false);
  const [hasPlayedApplause, setHasPlayedApplause] = React.useState(false);
  const leaderboardRef = useRef<HTMLDivElement>(null);

  // 🎉 Play applause sound when user scrolls to leaderboard and rank is top 5
  useEffect(() => {
    if (hasPlayedApplause || loadingStats || !userRank || userRank > 5) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasPlayedApplause) {
          console.log('🎉 Top 5 leaderboard visible! Playing applause for rank:', userRank);
          soundService.play('applause');
          setHasPlayedApplause(true);
        }
      },
      { threshold: 0.3 } // Trigger when 30% of leaderboard is visible
    );
    
    if (leaderboardRef.current) {
      observer.observe(leaderboardRef.current);
    }
    
    return () => observer.disconnect();
  }, [userRank, loadingStats, hasPlayedApplause]);

  // Debug logging
  console.log('🏆 Leaderboard render:', {
    leaderboardLength: leaderboard.length,
    loadingStats,
    userRank,
    hasUser: !!user,
    leaderboard: leaderboard.slice(0, 3) // Show first 3 entries for debug
  });

  // Filter leaderboard by search query
  const filteredLeaderboard = React.useMemo(() => {
    if (!searchQuery.trim()) return leaderboard;
    const query = searchQuery.toLowerCase();
    return leaderboard.filter(entry => 
      entry.userName.toLowerCase().includes(query)
    );
  }, [leaderboard, searchQuery]);

  // Limit display to top 10 unless "Show All" is clicked
  const displayedLeaderboard = React.useMemo(() => {
    if (showAll || searchQuery.trim()) return filteredLeaderboard;
    return filteredLeaderboard.slice(0, 10);
  }, [filteredLeaderboard, showAll, searchQuery]);

  // Get medal icon for top 3
  const getMedalIcon = (rank: number) => {
    switch(rank) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return null;
    }
  };

  // Calculate unique participants (count distinct users)
  const uniqueParticipants = React.useMemo(() => {
    const userIds = new Set(leaderboard.map(entry => entry.userId).filter(Boolean));
    return userIds.size;
  }, [leaderboard]);

  // Total attempts
  const totalAttempts = leaderboard.length;

  return (
    <div ref={leaderboardRef} className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          🏆 {t('result.leaderboard', 'Bảng xếp hạng')}
        </h2>
        
        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder={t('result.search_username', 'Tìm kiếm tên người chơi...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <svg 
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Rank summary */}
      {user && userRank && totalAttempts > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-center">
            <span className="text-lg font-semibold text-gray-800">
              {t('result.your_current_rank', 'Your rank this time: #{{rank}}', { rank: userRank })}
              {' • '}
              {t('result.total_stats', '{{attempts}} lượt chơi từ {{players}} người', { attempts: totalAttempts, players: uniqueParticipants })}
            </span>
            {userRank <= 3 && (
              <span className="ml-3 text-2xl">{getMedalIcon(userRank - 1)}</span>
            )}
          </div>
        </div>
      )}
      {loadingStats ? (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">{t('result.loading_leaderboard', 'Đang tải bảng xếp hạng...')}</span>
        </div>
      ) : filteredLeaderboard.length > 0 ? (
        <>
        <div className="space-y-3">
          {displayedLeaderboard.map((entry) => {
            // Find original rank for medal display
            const originalIndex = leaderboard.findIndex(e => e.id === entry.id);
            const medal = getMedalIcon(originalIndex);
            
            return (
            <div 
              key={entry.id}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border gap-3 ${
                entry.isCurrentAttempt
                  ? 'bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-green-400 shadow-xl ring-2 sm:ring-4 ring-green-200 ring-opacity-50' 
                  : entry.userId === user?.uid 
                    ? 'bg-blue-50 border-blue-200 shadow-md' 
                    : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                  entry.isCurrentAttempt 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform scale-110 text-lg sm:text-2xl' 
                    : medal 
                      ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-xl sm:text-3xl'
                      : `${getRankBackgroundColor(originalIndex)} text-xs sm:text-sm`
                }`}>
                  {entry.isCurrentAttempt ? '★' : medal || getRankDisplay(originalIndex)}
                </div>
                {entry.userPhotoURL ? (
                  <img 
                    src={entry.userPhotoURL} 
                    alt={entry.userName}
                    className="w-8 h-8 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm sm:text-lg">
                      {entry.userName ? entry.userName.charAt(0).toUpperCase() : 'A'}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 text-sm sm:text-base truncate">
                    {entry.userName}
                    {entry.userId === user?.uid && !entry.isCurrentAttempt && (
                      <span className="text-gray-500 ml-1 sm:ml-2 text-xs sm:text-sm">({t('result.previous_attempt', 'Lượt trước đó')})</span>
                    )}
                  </div>
                  {entry.isCurrentAttempt && (
                    <div className="mt-1">
                      <span className="text-white font-bold bg-gradient-to-r from-green-500 to-emerald-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm shadow-lg animate-pulse inline-block">
                        ⭐ {t('result.latest_attempt_rank', 'LƯỢT MỚI NHẤT - XẾP HẠNG #{{rank}}', { rank: originalIndex + 1 })}
                      </span>
                    </div>
                  )}
                  <div className="text-xs sm:text-sm text-gray-500">
                    {entry.correctAnswers}/{entry.totalQuestions} {t('result.correct', 'đúng')}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 sm:mt-1 hidden sm:block">
                    📅 {formatDateTime(entry.completedAt instanceof Date ? entry.completedAt.getTime() : new Date(entry.completedAt).getTime())}
                  </div>
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:text-right pl-10 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                <div className="font-bold text-lg sm:text-xl text-gray-900">
                  {Math.round((entry.correctAnswers / entry.totalQuestions) * 100)}%
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  ⏱️ {formatDetailedTime(safeNumber(entry.timeSpent))}
                </div>
              </div>
            </div>
          );
          })}
        </div>
        
        {/* Show All / Show Less button */}
        {!searchQuery && filteredLeaderboard.length > 10 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              {showAll 
                ? `↑ ${t('result.show_less', 'Show less')}`
                : `↓ ${t('result.show_more', 'Show more')} (${filteredLeaderboard.length - 10} ${t('result.more_attempts', 'more attempts')})`
              }
            </button>
          </div>
        )}
        
        {/* No results from search */}
        {searchQuery && filteredLeaderboard.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-3">🔍</div>
            <p>{t('result.no_search_results', 'No players found matching "{{query}}"', { query: searchQuery })}</p>
          </div>
        )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-lg">{t('result.no_results_yet', 'No results yet!')}</p>
          <p>{t('result.be_first', 'Be the first to complete this quiz!')}</p>
        </div>
      )}
    </div>
  );
};
