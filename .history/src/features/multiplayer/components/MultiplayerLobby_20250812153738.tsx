import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { 
  Users, 
  Settings, 
  Play, 
  Copy, 
  Crown, 
  Clock,
  ArrowLeft,
  UserPlus
} from 'lucide-react';
import { firestoreMultiplayerService } from '../services';
import { MultiplayerRoom } from '../types';
import { toast } from 'react-toastify';

const MultiplayerLobby: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  
  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }
    
    initializeLobby();
  }, [user]);

  useEffect(() => {
    if (room) {
      const unsubscribe = firestoreMultiplayerService.onRoomUpdate((updatedRoom: MultiplayerRoom) => {
        setRoom(updatedRoom);
        
        // Navigate to game when status changes to 'in-progress'
        if (updatedRoom.status === 'in-progress') {
          navigate(`/multiplayer/game/${updatedRoom.id}`);
        }
      });
      
      return unsubscribe;
    }
  }, [room?.id]);

  // Countdown effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const initializeLobby = async () => {
    try {
      const currentRoom = firestoreMultiplayerService.getCurrentRoom();
      if (!currentRoom) {
        navigate('/multiplayer');
        return;
      }
      
      setRoom(currentRoom);
    } catch (error) {
      console.error('Error initializing lobby:', error);
      toast.error('Lỗi khởi tạo lobby');
      navigate('/multiplayer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!room || !user || room.hostId !== user.uid) return;
    
    if (room.players.length < 1) {
      toast.error('Cần ít nhất 1 người chơi để bắt đầu');
      return;
    }
    
    setIsStarting(true);
    setCountdown(3);
    
    try {
      // Wait for countdown
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 3000);
        return timer;
      });
      
      await firestoreMultiplayerService.startGame();
      // Navigation will happen automatically via room status change
      
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error('Lỗi bắt đầu game');
      setIsStarting(false);
      setCountdown(0);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await firestoreMultiplayerService.leaveRoom();
      navigate('/multiplayer');
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Lỗi rời khỏi phòng');
    }
  };

  const handleCopyRoomCode = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id);
      toast.success('Đã sao chép mã phòng!');
    }
  };

  const isHost = user && room && room.hostId === user.uid;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Đang tải lobby...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Không tìm thấy phòng</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handleLeaveRoom}
            className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Rời khỏi
          </button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Lobby</h1>
            <p className="text-white/70">Chờ host bắt đầu game</p>
          </div>
          
          <div className="w-24" /> {/* Spacer for alignment */}
        </div>

        {/* Countdown overlay */}
        {countdown > 0 && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="text-8xl font-bold text-white mb-4">{countdown}</div>
              <div className="text-2xl text-white/70">Game bắt đầu...</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Room Info */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Thông tin phòng
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Mã phòng</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-white/5 border border-white/20 rounded-lg text-white font-mono">
                    {room.id}
                  </div>
                  <button
                    onClick={handleCopyRoomCode}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-white/70 text-sm mb-1">Quiz</label>
                <div className="p-3 bg-white/5 border border-white/20 rounded-lg text-white">
                  {room.quiz.title}
                </div>
              </div>
              
              <div>
                <label className="block text-white/70 text-sm mb-1">Số câu hỏi</label>
                <div className="p-3 bg-white/5 border border-white/20 rounded-lg text-white">
                  {room.quiz.questions.length} câu
                </div>
              </div>
              
              <div>
                <label className="block text-white/70 text-sm mb-1">Thời gian mỗi câu</label>
                <div className="p-3 bg-white/5 border border-white/20 rounded-lg text-white flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {room.settings.questionTimeLimit}s
                </div>
              </div>
            </div>
          </div>

          {/* Players */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Người chơi ({room.players.length}/{room.settings.maxPlayers})
            </h2>
            
            <div className="space-y-3 mb-6">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  {player.avatar ? (
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-10 h-10 rounded-full border-2 border-white/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="text-white font-medium">{player.name}</div>
                    <div className="text-white/50 text-sm">
                      {player.id === room.hostId ? 'Host' : 'Người chơi'}
                    </div>
                  </div>
                  
                  {player.id === room.hostId && (
                    <Crown className="w-5 h-5 text-yellow-400" />
                  )}
                </div>
              ))}
            </div>
            
            {/* Invite section */}
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center gap-2 text-white/70 mb-2">
                <UserPlus className="w-4 h-4" />
                <span className="text-sm">Mời bạn bè</span>
              </div>
              <p className="text-white/50 text-sm">
                Chia sẻ mã phòng <span className="font-mono font-bold">{room.id}</span> để mời bạn bè tham gia
              </p>
            </div>
          </div>
        </div>

        {/* Host Controls */}
        {isHost && (
          <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Điều khiển Host</h2>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleStartGame}
                disabled={isStarting || room.players.length < 1}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                {isStarting ? 'Đang bắt đầu...' : 'Bắt đầu game'}
              </button>
              
              <button
                onClick={() => navigate('/multiplayer')}
                className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium"
              >
                Huỷ phòng
              </button>
            </div>
            
            {room.players.length < 1 && (
              <p className="text-yellow-400 text-sm mt-2">
                Cần ít nhất 1 người chơi để bắt đầu game
              </p>
            )}
          </div>
        )}

        {/* Player waiting message */}
        {!isHost && (
          <div className="mt-6 bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 text-center">
            <p className="text-yellow-200 font-medium">
              Đang chờ host bắt đầu game...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerLobby;