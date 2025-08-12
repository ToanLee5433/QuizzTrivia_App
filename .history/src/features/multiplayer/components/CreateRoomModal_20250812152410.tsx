import React, { useState } from 'react';
import { 
  Plus, 
  Users, 
  Clock, 
  Lock, 
  Globe,
  X,
  ChevronRight,
  Settings
} from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomConfig: RoomConfig) => void;
  selectedQuiz?: {
    id: string;
    title: string;
    category: string;
    questionCount: number;
  };
}

interface RoomConfig {
  maxPlayers: number;
  timeLimit: number;
  isPrivate: boolean;
  allowLateJoin: boolean;
  showCorrectAnswers: boolean;
  roomName: string;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  selectedQuiz
}) => {
  const [roomConfig, setRoomConfig] = useState<RoomConfig>({
    maxPlayers: 4,
    timeLimit: 30,
    isPrivate: false,
    allowLateJoin: true,
    showCorrectAnswers: true,
    roomName: ''
  });

  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreateRoom = async () => {
    if (!roomConfig.roomName.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreateRoom(roomConfig);
    } finally {
      setIsCreating(false);
    }
  };

  const playerLimits = [2, 4, 6, 8, 10, 12];
  const timeLimits = [15, 30, 45, 60, 90, 120];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Room</h2>
              <p className="text-sm text-gray-400">Set up your multiplayer quiz room</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Selected Quiz Info */}
          {selectedQuiz && (
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{selectedQuiz.title}</h3>
                  <p className="text-sm text-gray-400">
                    {selectedQuiz.category} • {selectedQuiz.questionCount} questions
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Room Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Room Name</label>
            <input
              type="text"
              value={roomConfig.roomName}
              onChange={(e) => setRoomConfig(prev => ({ ...prev, roomName: e.target.value }))}
              placeholder="Enter room name..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
            />
          </div>

          {/* Room Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Max Players */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-300">Max Players</label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {playerLimits.map((limit) => (
                  <button
                    key={limit}
                    onClick={() => setRoomConfig(prev => ({ ...prev, maxPlayers: limit }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      roomConfig.maxPlayers === limit
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {limit}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Limit */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-300">Time per Question (seconds)</label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {timeLimits.map((limit) => (
                  <button
                    key={limit}
                    onClick={() => setRoomConfig(prev => ({ ...prev, timeLimit: limit }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      roomConfig.timeLimit === limit
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {limit}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Room Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Room Options
            </h3>
            
            <div className="space-y-3">
              {/* Privacy Setting */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  {roomConfig.isPrivate ? (
                    <Lock className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Globe className="w-5 h-5 text-green-400" />
                  )}
                  <div>
                    <p className="font-medium text-white">
                      {roomConfig.isPrivate ? 'Private Room' : 'Public Room'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {roomConfig.isPrivate 
                        ? 'Only players with room code can join' 
                        : 'Anyone can find and join this room'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRoomConfig(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
                  className={`w-12 h-6 rounded-full transition-all duration-200 ${
                    roomConfig.isPrivate ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                    roomConfig.isPrivate ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Allow Late Join */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <p className="font-medium text-white">Allow Late Join</p>
                  <p className="text-sm text-gray-400">Players can join after the quiz starts</p>
                </div>
                <button
                  onClick={() => setRoomConfig(prev => ({ ...prev, allowLateJoin: !prev.allowLateJoin }))}
                  className={`w-12 h-6 rounded-full transition-all duration-200 ${
                    roomConfig.allowLateJoin ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                    roomConfig.allowLateJoin ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Show Correct Answers */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <p className="font-medium text-white">Show Correct Answers</p>
                  <p className="text-sm text-gray-400">Display correct answers after each question</p>
                </div>
                <button
                  onClick={() => setRoomConfig(prev => ({ ...prev, showCorrectAnswers: !prev.showCorrectAnswers }))}
                  className={`w-12 h-6 rounded-full transition-all duration-200 ${
                    roomConfig.showCorrectAnswers ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                    roomConfig.showCorrectAnswers ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Create Button */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={!roomConfig.roomName.trim() || isCreating}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Room
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
