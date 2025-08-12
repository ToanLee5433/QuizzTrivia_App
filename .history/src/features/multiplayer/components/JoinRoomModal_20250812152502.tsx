import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Users, 
  Clock, 
  Lock, 
  Globe,
  X,
  ChevronRight,
  Loader2,
  RefreshCw,
  UserPlus,
  Key
} from 'lucide-react';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomId: string, password?: string) => void;
}

interface RoomInfo {
  id: string;
  name: string;
  hostName: string;
  currentPlayers: number;
  maxPlayers: number;
  isPrivate: boolean;
  quizTitle: string;
  quizCategory: string;
  status: 'waiting' | 'in-progress' | 'finished';
  allowLateJoin: boolean;
  timePerQuestion: number;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'code'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  // Mock room data - replace with actual API call
  const mockRooms: RoomInfo[] = [
    {
      id: 'room-1',
      name: 'Friday Quiz Night',
      hostName: 'QuizMaster_John',
      currentPlayers: 3,
      maxPlayers: 6,
      isPrivate: false,
      quizTitle: 'General Knowledge Challenge',
      quizCategory: 'Mixed',
      status: 'waiting',
      allowLateJoin: true,
      timePerQuestion: 30
    },
    {
      id: 'room-2',
      name: 'Science Showdown',
      hostName: 'Dr_Emma',
      currentPlayers: 2,
      maxPlayers: 8,
      isPrivate: false,
      quizTitle: 'Advanced Physics',
      quizCategory: 'Science',
      status: 'waiting',
      allowLateJoin: false,
      timePerQuestion: 45
    },
    {
      id: 'room-3',
      name: 'Movie Buffs Unite',
      hostName: 'CinemaExpert',
      currentPlayers: 5,
      maxPlayers: 10,
      isPrivate: false,
      quizTitle: 'Hollywood Classics',
      quizCategory: 'Entertainment',
      status: 'in-progress',
      allowLateJoin: true,
      timePerQuestion: 30
    }
  ];

  useEffect(() => {
    if (isOpen && activeTab === 'browse') {
      loadRooms();
    }
  }, [isOpen, activeTab]);

  const loadRooms = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setRooms(mockRooms);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string, password?: string) => {
    setJoining(roomId);
    try {
      await onJoinRoom(roomId, password);
    } finally {
      setJoining(null);
    }
  };

  const handleJoinByCode = async () => {
    if (!roomCode.trim()) return;
    await handleJoinRoom(roomCode, roomPassword || undefined);
  };

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.hostName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.quizTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.quizCategory.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  const getStatusColor = (status: RoomInfo['status']) => {
    switch (status) {
      case 'waiting': return 'text-green-400';
      case 'in-progress': return 'text-yellow-400';
      case 'finished': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: RoomInfo['status']) => {
    switch (status) {
      case 'waiting': return 'Waiting for players';
      case 'in-progress': return 'Game in progress';
      case 'finished': return 'Game finished';
      default: return 'Unknown';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Join Room</h2>
              <p className="text-sm text-gray-400">Find and join a multiplayer quiz room</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'browse'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Browse Rooms
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'code'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/5'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Join by Code
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'browse' ? (
            <div className="space-y-4">
              {/* Search and Refresh */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search rooms by name, host, or quiz..."
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                  />
                </div>
                <button
                  onClick={loadRooms}
                  disabled={loading}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded-xl transition-all"
                >
                  <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Rooms List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading rooms...
                  </div>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">
                    {searchQuery ? 'No rooms found matching your search' : 'No rooms available'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              {room.isPrivate ? (
                                <Lock className="w-4 h-4 text-amber-400" />
                              ) : (
                                <Globe className="w-4 h-4 text-green-400" />
                              )}
                              <h3 className="font-semibold text-white truncate">{room.name}</h3>
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full bg-current/10 ${getStatusColor(room.status)}`}>
                              {getStatusText(room.status)}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-400">
                            <div>Host: {room.hostName}</div>
                            <div>Quiz: {room.quizTitle}</div>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {room.currentPlayers}/{room.maxPlayers} players
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {room.timePerQuestion}s per question
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleJoinRoom(room.id)}
                          disabled={
                            joining === room.id ||
                            (room.status === 'finished') ||
                            (room.status === 'in-progress' && !room.allowLateJoin) ||
                            (room.currentPlayers >= room.maxPlayers)
                          }
                          className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center gap-2"
                        >
                          {joining === room.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Joining...
                            </>
                          ) : (
                            <>
                              Join
                              <ChevronRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <Key className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Join with Room Code</h3>
                <p className="text-gray-400">Enter the room code shared by the host</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Room Code</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="Enter room code..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 transition-all text-center text-lg tracking-wider font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Password (if required)</label>
                  <input
                    type="password"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 transition-all"
                  />
                </div>

                <button
                  onClick={handleJoinByCode}
                  disabled={!roomCode.trim() || joining === roomCode}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  {joining === roomCode ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Joining Room...
                    </>
                  ) : (
                    <>
                      Join Room
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
