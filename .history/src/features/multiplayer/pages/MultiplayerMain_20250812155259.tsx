import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { 
  Plus, 
  Users, 
  Search, 
  RefreshCw,
  Clock,
  Crown,
  ArrowLeft,
  Play
} from 'lucide-react';
// import { firestoreMultiplayerService } from '../services';
import { MultiplayerRoom } from '../types';
import { toast } from 'react-toastify';

const MultiplayerMain: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [rooms, setRooms] = useState<MultiplayerRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    loadAvailableRooms();
  }, [user]);

  const loadAvailableRooms = async () => {
    try {
      setIsLoading(true);
      // const availableRooms = await firestoreMultiplayerService.getAvailableRooms();
      // Mock empty rooms for now
      const availableRooms: MultiplayerRoom[] = [];
      setRooms(availableRooms);
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast.error('Lỗi tải danh sách phòng');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = () => {
    navigate('/multiplayer/create');
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return;

    try {
      setJoiningRoom(true);
      // await firestoreMultiplayerService.joinRoom(roomId, user.uid, user.displayName || 'Ẩn danh', user.photoURL || '');
      // Mock join for now
      toast.success('Joining room (mock)');
      navigate(`/multiplayer/lobby/${roomId}`);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error(error.message || 'Lỗi tham gia phòng');
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!joinRoomId.trim()) {
      toast.error('Vui lòng nhập mã phòng');
      return;
    }

    await handleJoinRoom(joinRoomId.trim());
    setShowJoinDialog(false);
    setJoinRoomId('');
  };

  const filteredRooms = rooms.filter(room => 
    room.quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Vừa tạo';
    if (minutes < 60) return `${minutes} phút trước`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
            
            <div>
              <h1 className="text-3xl font-bold text-white">Multiplayer</h1>
              <p className="text-white/70">Chơi quiz với bạn bè</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinDialog(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              Tham gia bằng mã
            </button>
            
            <button
              onClick={handleCreateRoom}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Tạo phòng
            </button>
          </div>
        </div>

        {/* Search and Refresh */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              placeholder="Tìm kiếm phòng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-400 focus:outline-none"
            />
          </div>
          
          <button
            onClick={loadAvailableRooms}
            disabled={isLoading}
            className="px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Rooms Grid */}
        {isLoading ? (
          <div className="text-center text-white py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            Đang tải phòng...
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
              <Users className="w-16 h-16 text-white/50 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                {searchTerm ? 'Không tìm thấy phòng' : 'Chưa có phòng nào'}
              </h3>
              <p className="text-white/70 mb-6">
                {searchTerm 
                  ? 'Thử tìm kiếm với từ khóa khác hoặc tạo phòng mới'
                  : 'Hãy tạo phòng đầu tiên để bắt đầu chơi với bạn bè'
                }
              </p>
              <button
                onClick={handleCreateRoom}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Tạo phòng mới
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1 truncate">
                      {room.quiz.title}
                    </h3>
                    <p className="text-white/70 text-sm">Phòng #{room.id.slice(-6)}</p>
                  </div>
                  
                  {room.status === 'waiting' && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">
                      Đang chờ
                    </span>
                  )}
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/70">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">
                        {room.players.length}/{room.settings.maxPlayers} người chơi
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-white/70">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{room.settings.questionTimeLimit}s</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-white/70">
                    <Crown className="w-4 h-4" />
                    <span className="text-sm">
                      Host: {room.players.find(p => p.id === room.hostId)?.name || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="text-white/50 text-xs">
                    {formatTimeAgo(room.createdAt)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={
                      joiningRoom || 
                      room.players.length >= room.settings.maxPlayers ||
                      room.status !== 'waiting'
                    }
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    {joiningRoom ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {room.players.length >= room.settings.maxPlayers 
                      ? 'Đầy' 
                      : room.status !== 'waiting'
                      ? 'Đang chơi'
                      : 'Tham gia'
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Join Room Dialog */}
        {showJoinDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">Tham gia phòng</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Mã phòng</label>
                  <input
                    type="text"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    placeholder="Nhập mã phòng..."
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-400 focus:outline-none"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowJoinDialog(false);
                      setJoinRoomId('');
                    }}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Huỷ
                  </button>
                  
                  <button
                    onClick={handleJoinByCode}
                    disabled={!joinRoomId.trim() || joiningRoom}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                  >
                    {joiningRoom ? 'Đang tham gia...' : 'Tham gia'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerMain;
