import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../lib/store';
import { LeaderboardEntry } from '../types';
import { safeNumber, formatDetailedTime, formatDateTime, getRankDisplay, getRankBackgroundColor } from '../utils';

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

  // Debug logging
  console.log('🏆 Leaderboard render:', {
    leaderboardLength: leaderboard.length,
    loadingStats,
    userRank,
    hasUser: !!user,
    leaderboard: leaderboard.slice(0, 3) // Show first 3 entries for debug
  });

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">🏆 Leaderboard</h2>
      {loadingStats ? (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading leaderboard...</span>
        </div>
      ) : leaderboard.length > 0 ? (
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <div 
              key={entry.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                entry.id === 'current-attempt'
                  ? 'bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-green-400 shadow-xl ring-4 ring-green-200 ring-opacity-50' 
                  : entry.userId === user?.uid 
                    ? 'bg-blue-50 border-blue-200 shadow-md' 
                    : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                  entry.id === 'current-attempt' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform scale-110' 
                    : getRankBackgroundColor(index)
                }`}>
                  {entry.id === 'current-attempt' ? '�' : getRankDisplay(index)}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {entry.userName}
                    {entry.id === 'current-attempt' && (
                      <div className="flex items-center mt-1">
                        <span className="text-white ml-2 font-bold bg-gradient-to-r from-green-500 to-emerald-600 px-3 py-1 rounded-full text-sm shadow-lg animate-pulse">
                          � LƯỢT MỚI NHẤT - XẾP HẠNG #{index + 1}
                        </span>
                      </div>
                    )}
                    {entry.userId === user?.uid && entry.id !== 'current-attempt' && (
                      <span className="text-gray-500 ml-2 text-sm">(Lượt trước đó)</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {entry.correctAnswers}/{entry.totalQuestions} correct
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    📅 {formatDateTime(entry.completedAt instanceof Date ? entry.completedAt.getTime() : new Date(entry.completedAt).getTime())}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-xl text-gray-900">{safeNumber(entry.score)}%</div>
                <div className="text-sm text-gray-500">
                  ⏱️ {formatDetailedTime(safeNumber(entry.timeSpent))}
                </div>
              </div>
            </div>
          ))}
          
          {/* Show user rank if not in top 10 */}
          {user && userRank && userRank > 10 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-center">
                  <span className="text-blue-800 font-medium">Your Rank: #{userRank}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-lg">No results yet!</p>
          <p>Be the first to complete this quiz and claim the top spot!</p>
        </div>
      )}
    </div>
  );
};
