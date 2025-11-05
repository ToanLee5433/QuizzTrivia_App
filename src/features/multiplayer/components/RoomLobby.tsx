import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  CheckCircle, 
  Clock,
  Copy,
  LogOut,
  Sparkles,
  Trophy,
  Zap,
  Shield,
  Star
} from 'lucide-react';
import type { MultiplayerServiceInterface } from '../services/enhancedMultiplayerService';

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
  multiplayerService?: MultiplayerServiceInterface;
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
  const onlineCount = useMemo(() => players.filter(p => p.isOnline).length, [players]);
  const allReady = useMemo(() => players.length >= 2 && players.every(p => p.isReady), [players]);
  const currentPlayer = players.find(p => p.id === currentUserId);
  
  // Log player updates for debugging
  useEffect(() => {
    console.log('🎮 RoomLobby - Players updated:', {
      total: players.length,
      ready: readyCount,
      allReady,
      playerList: players.map(p => ({ id: p.id, username: p.username, isReady: p.isReady }))
    });
  }, [players, readyCount, allReady]);
  
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>

      {/* Floating Geometric Shapes - Hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-20 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/2 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 p-3 sm:p-4 lg:p-6 xl:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Card */}
          <div className="bg-white rounded-2xl lg:rounded-3xl shadow-xl border border-gray-100 p-4 sm:p-5 lg:p-8 mb-4 lg:mb-6">
            {/* Room Title Section */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 lg:gap-6 mb-4 lg:mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 lg:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-800 mb-1 truncate">
                      {roomData.name}
                    </h1>
                    <p className="text-gray-500 text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-500 flex-shrink-0" />
                      <span className="truncate">Multiplayer Quiz Room</span>
                    </p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Player Count */}
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg transition-shadow">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                    <span className="text-white font-bold text-sm sm:text-base">{players.length}/{roomData.maxPlayers}</span>
                    <span className="text-blue-50 text-xs sm:text-sm font-medium hidden sm:inline">Players</span>
                    <div className="hidden md:flex items-center gap-1 ml-1 pl-1 border-l border-blue-300">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-blue-50 text-xs font-medium">{onlineCount} online</span>
                    </div>
                  </div>

                  {/* Ready Count */}
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg transition-shadow">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                    <span className="text-white font-bold text-sm sm:text-base">{readyCount}</span>
                    <span className="text-green-50 text-xs sm:text-sm font-medium hidden sm:inline">Ready</span>
                  </div>

                  {/* Room Code */}
                  <button
                    onClick={handleCopyRoomCode}
                    className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg transition-all hover:scale-105 ${
                      copySuccess
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                    }`}
                  >
                    <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                    <span className="text-white font-mono font-bold text-sm sm:text-base lg:text-lg">{roomData.code}</span>
                    {copySuccess && (
                      <span className="text-white text-xs font-semibold">✓</span>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-2 sm:gap-3 w-full lg:w-auto">
                {/* Countdown Timer */}
                {readyCountdown && (
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 shadow-lg animate-pulse">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white flex-shrink-0" />
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-black text-white">{readyCountdown}</div>
                      <div className="text-xs text-orange-50 font-semibold">Starting...</div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 sm:gap-3">
                  {/* Leave Button */}
                  <button
                    onClick={onLeaveRoom}
                    className="flex-1 lg:flex-none px-4 py-2.5 sm:px-5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-md text-sm sm:text-base"
                  >
                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span>Leave</span>
                  </button>
                  
                  {/* Ready Button */}
                  <button
                    onClick={handleToggleReady}
                    className={`flex-1 lg:flex-none px-5 py-2.5 sm:px-8 sm:py-3 rounded-xl font-bold transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base ${
                      currentPlayer?.isReady
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white'
                    }`}
                  >
                    {currentPlayer?.isReady ? (
                      <>
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="whitespace-nowrap">Not Ready</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="whitespace-nowrap">I'm Ready!</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              {/* Total Players */}
              <div className="group bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-blue-100 hover:border-blue-200 transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2">
                  <div className="text-center sm:text-left">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-0.5 sm:mb-1">{players.length}</div>
                    <div className="text-blue-600 text-xs sm:text-sm font-semibold">Total</div>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                </div>
              </div>

              {/* Ready Players */}
              <div className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-green-100 hover:border-green-200 transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2">
                  <div className="text-center sm:text-left">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-0.5 sm:mb-1">{readyCount}</div>
                    <div className="text-green-600 text-xs sm:text-sm font-semibold">Ready</div>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                </div>
              </div>

              {/* Time Limit */}
              <div className="group bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-purple-100 hover:border-purple-200 transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2">
                  <div className="text-center sm:text-left">
                    <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-0.5 sm:mb-1">{roomData.settings.timeLimit}s</div>
                    <div className="text-purple-600 text-xs sm:text-sm font-semibold">Time</div>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Players Grid */}
          <div className="bg-white rounded-2xl lg:rounded-3xl shadow-xl border border-gray-100 p-4 sm:p-5 lg:p-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Players</h2>
              <div className="ml-auto bg-gradient-to-r from-blue-100 to-indigo-100 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full">
                <span className="text-blue-700 font-bold text-xs sm:text-sm">{players.length}/{roomData.maxPlayers}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {players.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-400 text-lg mb-2">👥</div>
                  <p className="text-gray-500 font-medium">No players yet...</p>
                  <p className="text-gray-400 text-sm mt-1">Waiting for players to join</p>
                </div>
              ) : (
                players.map((player, index) => {
                const isCurrentUser = player.id === currentUserId;
                
                return (
                  <div
                    key={player.id}
                    className={`group relative bg-gradient-to-br rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border-2 transition-all hover:scale-105 hover:shadow-xl ${
                      isCurrentUser
                        ? 'from-blue-50 to-indigo-50 border-blue-200 shadow-blue-100 shadow-lg'
                        : player.isReady
                        ? 'from-green-50 to-emerald-50 border-green-200 shadow-green-100 shadow-md'
                        : 'from-gray-50 to-slate-50 border-gray-200'
                    }`}
                    style={{
                      animationDelay: `${index * 100}ms`
                    }}
                  >
                    {/* "You" Badge */}
                    {isCurrentUser && (
                      <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-10">
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1 sm:gap-1.5 shadow-lg animate-pulse">
                          <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white flex-shrink-0" />
                          <span className="text-xs font-black text-white">YOU</span>
                        </div>
                      </div>
                    )}

                    {/* Player Content */}
                    <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl lg:text-2xl font-bold shadow-lg ${
                          isCurrentUser
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
                            : player.isReady
                            ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                            : 'bg-gradient-to-br from-gray-400 to-slate-400 text-white'
                        }`}>
                          {player.username.charAt(0).toUpperCase()}
                        </div>
                        
                        {/* Online Indicator */}
                        {player.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full border-2 sm:border-3 border-white shadow-md">
                            <div className="w-full h-full bg-green-400 rounded-full animate-ping opacity-75"></div>
                          </div>
                        )}
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-sm sm:text-base lg:text-lg truncate mb-0.5 sm:mb-1 ${
                          isCurrentUser ? 'text-blue-700' : player.isReady ? 'text-green-700' : 'text-gray-700'
                        }`}>
                          {player.username}
                        </h3>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500">
                          <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${
                            player.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          <span className="truncate">{player.isOnline ? 'Online' : 'Offline'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {player.isReady ? (
                        <div className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm">
                          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-bounce flex-shrink-0" />
                          <span className="text-xs font-bold text-white">Ready!</span>
                        </div>
                      ) : (
                        <div className="flex-1 bg-gradient-to-r from-gray-400 to-slate-400 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white flex-shrink-0" />
                          <span className="text-xs font-bold text-white">Waiting</span>
                        </div>
                      )}
                    </div>

                    {/* Decorative Element */}
                    {player.isReady && (
                      <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 opacity-10">
                        <Trophy className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-green-600" />
                      </div>
                    )}
                  </div>
                );
              })
              )}

              {/* Empty Slots */}
              {Array.from({ length: Math.max(0, roomData.maxPlayers - players.length) }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border-2 border-dashed border-gray-200 hover:border-gray-300 transition-all"
                >
                  <div className="flex items-center gap-3 sm:gap-4 opacity-40 mb-2 sm:mb-3">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gray-200 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-3 sm:h-4 bg-gray-200 rounded-lg mb-1.5 sm:mb-2 w-3/4"></div>
                      <div className="h-2 sm:h-3 bg-gray-200 rounded-lg w-1/2"></div>
                    </div>
                  </div>
                  <div className="text-center text-gray-400 text-xs sm:text-sm font-medium">
                    Waiting for player...
                    <span className="inline-flex ml-1">
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;
