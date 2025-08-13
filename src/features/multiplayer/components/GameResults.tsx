import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Medal, Award, Users, Clock, Target } from 'lucide-react';

interface Player {
  id: string;
  username: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  averageTime: number;
  rank: number;
}

interface GameResultsProps {
  results?: any;
  players?: Player[];
  currentUserId?: string;
  gameStats?: {
    totalQuestions: number;
    totalTime: number;
    averageScore: number;
  };
  roomData?: any;
  onPlayAgain?: () => void;
  onBackToLobby?: () => void;
  onBackToMenu?: () => void;
  onLeaveRoom?: () => void;
}

const GameResults: React.FC<GameResultsProps> = ({
  // results,
  players = [],
  currentUserId = '',
  gameStats = { totalQuestions: 0, totalTime: 0, averageScore: 0 },
  // roomData,
  onPlayAgain,
  onBackToLobby,
  // onBackToMenu,
  onLeaveRoom
}) => {
  const { t } = useTranslation();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500" />;
      default:
        return <div className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">#{rank}</div>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-orange-100 to-orange-200 border-orange-300';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const currentPlayer = players.find(p => p.id === currentUserId);
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-bold text-gray-900">
            {t('multiplayer.game.gameOver')}
          </h1>
        </div>
        
        {currentPlayer && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
            <div className="text-lg font-semibold text-blue-900">
              {t('multiplayer.yourResult')}
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-blue-800">
              <div className="text-center">
                <div className="text-2xl font-bold">{currentPlayer.score}</div>
                <div className="text-sm">{t('common.points')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">#{currentPlayer.rank}</div>
                <div className="text-sm">{t('common.rank')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Math.round((currentPlayer.correctAnswers / currentPlayer.totalAnswers) * 100)}%
                </div>
                <div className="text-sm">{t('common.accuracy')}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Final Leaderboard */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            {t('multiplayer.game.finalResults')}
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`p-4 flex items-center gap-4 ${getRankColor(index + 1)} ${
                player.id === currentUserId ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-12">
                {getRankIcon(index + 1)}
              </div>

              {/* Player Info */}
              <div className="flex-1">
                <div className="font-semibold text-gray-900 flex items-center gap-2">
                  {player.username}
                  {player.id === currentUserId && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {t('common.you')}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {player.correctAnswers}/{player.totalAnswers} {t('common.correct')} • 
                  {Math.round(player.averageTime)}s {t('common.avgTime')}
                </div>
              </div>

              {/* Score */}
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">
                  {player.score}
                </div>
                <div className="text-xs text-gray-500">
                  {t('common.points')}
                </div>
              </div>

              {/* Accuracy */}
              <div className="text-right w-16">
                <div className="text-lg font-semibold text-gray-700">
                  {Math.round((player.correctAnswers / player.totalAnswers) * 100)}%
                </div>
                <div className="text-xs text-gray-500">
                  {t('common.accuracy')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 text-center">
          <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {gameStats.totalQuestions}
          </div>
          <div className="text-sm text-gray-600">
            {t('multiplayer.totalQuestions')}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 text-center">
          <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(gameStats.totalTime / 60)}m
          </div>
          <div className="text-sm text-gray-600">
            {t('multiplayer.totalTime')}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 text-center">
          <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(gameStats.averageScore)}
          </div>
          <div className="text-sm text-gray-600">
            {t('multiplayer.avgScore')}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onPlayAgain && (
          <button
            onClick={onPlayAgain}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            {t('multiplayer.playAgain')}
          </button>
        )}
        
        {onBackToLobby && (
          <button
            onClick={onBackToLobby}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {t('multiplayer.backToLobby')}
          </button>
        )}
        
        {onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            {t('multiplayer.leaveRoom')}
          </button>
        )}
      </div>
    </div>
  );
};

export default GameResults;
