import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  CheckCircle, 
  Clock,
  Copy,
  LogOut
  // Removed Crown - no more host distinction
} from 'lucide-react';

interface Player {
  id: string;
  username: string;
  isReady: boolean;
  // Removed isHost - all players are equal
  isOnline: boolean;
  joinedAt: Date;
}

interface Room {
  id: string;
  code: string;
  name: string;
  // Removed hostId - all players are equal
  players: Player[];
  maxPlayers: number;
  isPrivate: boolean;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  settings: {
    timeLimit: number;
    showLeaderboard: boolean;
    allowLateJoin: boolean;
  };
}

interface RoomLobbyProps {
  roomData?: Room;
  currentUserId: string;
  onLeaveRoom: () => void;
  multiplayerService?: any;
}

const RoomLobby: React.FC<RoomLobbyProps> = ({
  roomData,
  currentUserId,
  onLeaveRoom,
  multiplayerService
}) => {
  const { t } = useTranslation();
  const [copySuccess, setCopySuccess] = useState(false);
  const [readyCountdown, setReadyCountdown] = useState<number | null>(null);

  const players = roomData?.players || [];
  const readyCount = useMemo(() => players.filter(p => p.isReady).length, [players]);
  const allReady = useMemo(() => players.length >= 2 && players.every(p => p.isReady), [players]);
  const currentPlayer = players.find(p => p.id === currentUserId);
  // Removed isHost logic - all players are equal

  // Show countdown for everyone when all players are ready; any player can trigger start
  useEffect(() => {
    if (allReady && players.length >= 2) {
      setReadyCountdown(5);
      const interval = setInterval(() => {
        setReadyCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            // Any player can start the game when countdown reaches 0
            if (multiplayerService && roomData?.id) {
              multiplayerService.startGame(roomData.id);
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setReadyCountdown(null);
    }
  }, [allReady, players.length, multiplayerService, roomData?.id]);

  const handleCopyRoomCode = async () => {
    if (roomData?.code) {
      try {
        await navigator.clipboard.writeText(roomData.code);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy room code:', err);
      }
    }
  };

  const handleToggleReady = async () => {
    if (!multiplayerService || !roomData?.id) return;
    
    const newReadyState = !currentPlayer?.isReady;
    await multiplayerService.updatePlayerStatus(roomData.id, newReadyState);
  };

  if (!roomData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {roomData.name}
              </h2>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={18} className="text-blue-500" />
                  <span className="font-semibold">{players.length}</span>
                  <span className="text-sm">/{roomData.maxPlayers} {t('multiplayer.players')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle size={18} className="text-green-500" />
                  <span className="font-semibold">{readyCount}</span>
                  <span className="text-sm">{t('multiplayer.ready')}</span>
                </div>
                <button
                  onClick={handleCopyRoomCode}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                    copySuccess
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
                  }`}
                >
                  <Copy size={16} />
                  <span className="font-mono text-lg">{roomData.code}</span>
                  {copySuccess && <span className="text-xs">Copied!</span>}
                </button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Countdown */}
              {readyCountdown && (
                <div className="flex items-center justify-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-xl font-bold">
                  <Clock size={18} />
                  <span>{t('multiplayer.startingIn')} {readyCountdown}s</span>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={onLeaveRoom}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl border border-gray-300 transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} />
                  {t('multiplayer.leaveRoom')}
                </button>
                
                <button
                  onClick={handleToggleReady}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg ${
                    currentPlayer?.isReady
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                  }`}
                >
                  <CheckCircle size={18} />
                  {currentPlayer?.isReady 
                    ? t('multiplayer.notReady')
                    : t('multiplayer.ready')
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{players.length}</div>
              <div className="text-sm text-blue-700">{t('multiplayer.totalPlayers')}</div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{readyCount}</div>
              <div className="text-sm text-green-700">{t('multiplayer.readyPlayers')}</div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{roomData.settings.timeLimit}s</div>
              <div className="text-sm text-purple-700">{t('multiplayer.timePerQuestion')}</div>
            </div>
          </div>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {players.map(player => (
            <div
              key={player.id}
              className={`bg-white rounded-2xl p-6 shadow-lg border-2 transition-all duration-200 ${
                player.id === currentUserId
                  ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Player Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-blue-500 to-purple-600">
                    {player.username.charAt(0).toUpperCase()}
                    {/* Removed Crown icon - no more host distinction */}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-800 text-lg flex items-center gap-2">
                      <span className="truncate">{player.username}</span>
                      {player.id === currentUserId && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full shrink-0">
                          {t('common.you')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${player.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                      <span className="text-sm text-gray-600">
                        {player.isOnline ? t('common.online') : t('common.offline')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Player Status */}
              <div className="flex items-center justify-center">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium w-full justify-center ${
                  player.isReady
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  {player.isReady ? (
                    <>
                      <CheckCircle size={16} />
                      <span>{t('multiplayer.ready')}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={16} />
                      <span>{t('multiplayer.waiting')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Empty Slots */}
          {Array.from({ length: Math.max(0, roomData.maxPlayers - players.length) }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-6 flex items-center justify-center text-gray-400 min-h-[120px]"
            >
              <div className="text-center">
                <Users size={24} className="mx-auto mb-2 opacity-50" />
                <div className="text-sm font-medium">{t('multiplayer.waitingForPlayer')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;
