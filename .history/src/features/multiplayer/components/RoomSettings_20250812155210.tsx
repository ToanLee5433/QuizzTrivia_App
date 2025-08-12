import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { 
  Settings, 
  Users, 
  Crown,
  Clock,
  ArrowLeft,
  Eye,
  Volume2,
  Copy,
  ExternalLink
} from 'lucide-react';
// import { firestoreMultiplayerService } from '../services';
import { MultiplayerRoom } from '../types';
import { toast } from 'react-toastify';

const RoomSettings: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    maxPlayers: 8,
    questionTimeLimit: 30,
    showLeaderboard: true,
    allowSpectators: false,
    enableChat: true,
    autoAdvanceTime: 5,
    soundEnabled: true,
    showCorrectAnswer: true
  });

  useEffect(() => {
    if (!user || !roomId) {
      navigate('/multiplayer');
      return;
    }
    
    loadRoom();
  }, [user, roomId]);

  const loadRoom = async () => {
    if (!roomId) return;
    
    try {
      setIsLoading(true);
      // const roomData = await firestoreMultiplayerService.getRoomById(roomId);
      // Mock data for development
      const roomData = null;
      
      if (!roomData) {
        toast.error('Không tìm thấy phòng');
        navigate('/multiplayer');
        return;
      }

      if (roomData.hostId !== user?.uid) {
        toast.error('Chỉ host mới có thể thay đổi cài đặt');
        navigate(`/multiplayer/lobby/${roomId}`);
        return;
      }

      setRoom(roomData);
      setSettings({
        maxPlayers: roomData.settings.maxPlayers,
        questionTimeLimit: roomData.settings.questionTimeLimit,
        showLeaderboard: roomData.settings.showLeaderboard,
        allowSpectators: roomData.settings.allowSpectators,
        enableChat: (roomData.settings as any).enableChat ?? true,
        autoAdvanceTime: (roomData.settings as any).autoAdvanceTime ?? 5,
        soundEnabled: true,
        showCorrectAnswer: true
      });
      
    } catch (error) {
      console.error('Error loading room:', error);
      toast.error('Lỗi tải thông tin phòng');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!room || room.hostId !== user?.uid) return;

    try {
      setIsSaving(true);
      
      await firestoreMultiplayerService.updateRoomSettings({
        maxPlayers: settings.maxPlayers,
        questionTimeLimit: settings.questionTimeLimit,
        showLeaderboard: settings.showLeaderboard,
        allowSpectators: settings.allowSpectators,
        enableChat: settings.enableChat,
        autoAdvanceTime: settings.autoAdvanceTime
      });

      toast.success('Đã lưu cài đặt');
      navigate(`/multiplayer/lobby/${roomId}`);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Lỗi lưu cài đặt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyRoomCode = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id);
      toast.success('Đã sao chép mã phòng!');
    }
  };

  const handleShareRoom = async () => {
    if (!room) return;
    
    const shareData = {
      title: `Tham gia quiz "${room.quiz.title}"`,
      text: `Tham gia phòng multiplayer với mã: ${room.id}`,
      url: `${window.location.origin}/multiplayer/join/${room.id}`
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      toast.success('Đã sao chép link chia sẻ!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Đang tải cài đặt...</div>
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
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/multiplayer/lobby/${roomId}`)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại lobby
            </button>
            
            <div>
              <h1 className="text-3xl font-bold text-white">Cài đặt phòng</h1>
              <p className="text-white/70">Phòng #{room.id.slice(-6)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-medium">Host</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Room Info */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Thông tin phòng
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Quiz</label>
                <div className="p-3 bg-white/5 border border-white/20 rounded-lg text-white">
                  {room.quiz.title}
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Mã phòng</label>
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
                <label className="block text-white/70 text-sm mb-2">Người chơi hiện tại</label>
                <div className="p-3 bg-white/5 border border-white/20 rounded-lg text-white flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {room.players.length}/{settings.maxPlayers} người
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Trạng thái</label>
                <div className="p-3 bg-white/5 border border-white/20 rounded-lg text-white">
                  {room.status === 'waiting' ? 'Đang chờ' : 
                   room.status === 'in-progress' ? 'Đang chơi' : 'Đã kết thúc'}
                </div>
              </div>

              <button
                onClick={handleShareRoom}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Chia sẻ phòng
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-6">Cài đặt trò chơi</h2>

            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Số người chơi tối đa
                  </label>
                  <select
                    value={settings.maxPlayers}
                    onChange={(e) => setSettings({...settings, maxPlayers: parseInt(e.target.value)})}
                    disabled={room.status !== 'waiting'}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none disabled:opacity-50"
                  >
                    <option value={2} className="bg-gray-800">2 người</option>
                    <option value={4} className="bg-gray-800">4 người</option>
                    <option value={6} className="bg-gray-800">6 người</option>
                    <option value={8} className="bg-gray-800">8 người</option>
                    <option value={10} className="bg-gray-800">10 người</option>
                    <option value={15} className="bg-gray-800">15 người</option>
                    <option value={20} className="bg-gray-800">20 người</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Thời gian trả lời (giây)
                  </label>
                  <select
                    value={settings.questionTimeLimit}
                    onChange={(e) => setSettings({...settings, questionTimeLimit: parseInt(e.target.value)})}
                    disabled={room.status !== 'waiting'}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none disabled:opacity-50"
                  >
                    <option value={10} className="bg-gray-800">10 giây</option>
                    <option value={15} className="bg-gray-800">15 giây</option>
                    <option value={20} className="bg-gray-800">20 giây</option>
                    <option value={30} className="bg-gray-800">30 giây</option>
                    <option value={45} className="bg-gray-800">45 giây</option>
                    <option value={60} className="bg-gray-800">60 giây</option>
                  </select>
                </div>
              </div>

              {/* Advanced Settings */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Cài đặt nâng cao</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Hiển thị bảng xếp hạng
                      </div>
                      <div className="text-white/60 text-sm">Cho phép người chơi xem điểm của nhau</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.showLeaderboard}
                      onChange={(e) => setSettings({...settings, showLeaderboard: e.target.checked})}
                      className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Cho phép khán giả
                      </div>
                      <div className="text-white/60 text-sm">Người xem có thể tham gia mà không chơi</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.allowSpectators}
                      onChange={(e) => setSettings({...settings, allowSpectators: e.target.checked})}
                      className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <div className="text-white font-medium">Chat trong game</div>
                      <div className="text-white/60 text-sm">Cho phép chat giữa các người chơi</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enableChat}
                      onChange={(e) => setSettings({...settings, enableChat: e.target.checked})}
                      className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        <Volume2 className="w-4 h-4" />
                        Âm thanh
                      </div>
                      <div className="text-white/60 text-sm">Bật âm thanh thông báo</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => setSettings({...settings, soundEnabled: e.target.checked})}
                      className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <div className="text-white font-medium">Hiển thị đáp án đúng</div>
                      <div className="text-white/60 text-sm">Hiện đáp án sau mỗi câu hỏi</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.showCorrectAnswer}
                      onChange={(e) => setSettings({...settings, showCorrectAnswer: e.target.checked})}
                      className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Time Settings */}
              <div>
                <label className="block text-white/70 text-sm mb-2">
                  Thời gian chuyển câu tự động (giây)
                </label>
                <select
                  value={settings.autoAdvanceTime}
                  onChange={(e) => setSettings({...settings, autoAdvanceTime: parseInt(e.target.value)})}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value={3} className="bg-gray-800">3 giây</option>
                  <option value={5} className="bg-gray-800">5 giây</option>
                  <option value={7} className="bg-gray-800">7 giây</option>
                  <option value={10} className="bg-gray-800">10 giây</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => navigate(`/multiplayer/lobby/${roomId}`)}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium"
          >
            Huỷ bỏ
          </button>
          
          <button
            onClick={handleSaveSettings}
            disabled={isSaving || room.status !== 'waiting'}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>

        {room.status !== 'waiting' && (
          <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-center">
            <p className="text-yellow-200 font-medium">
              Không thể thay đổi cài đặt khi trò chơi đang diễn ra
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomSettings;
