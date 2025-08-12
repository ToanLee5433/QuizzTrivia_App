import React, { useState } from 'react';
import { 
  Users, 
  Crown, 
  Settings, 
  Copy, 
  Check, 
  MessageCircle,
  Send,
  UserMinus,
  Play,
  Clock,
  Trophy
} from 'lucide-react';

interface RoomLobbyProps {
  room: {
    id: string;
    code: string;
    name: string;
    hostId: string;
    isPrivate: boolean;
    maxPlayers: number;
    timePerQuestion: number;
    allowLateJoin: boolean;
    showCorrectAnswers: boolean;
  };
  players: Player[];
  currentUserId: string;
  quiz: {
    title: string;
    category: string;
    questionCount: number;
  };
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onKickPlayer?: (playerId: string) => void;
  onSendMessage?: (message: string) => void;
  messages?: ChatMessage[];
}

interface Player {
  id: string;
  name: string;
  avatar?: string;
  isReady: boolean;
  isHost: boolean;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
}

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  room,
  players,
  currentUserId,
  quiz,
  onStartGame,
  onLeaveRoom,
  onKickPlayer,
  onSendMessage,
  messages = []
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(false);

  const isHost = room.hostId === currentUserId;
  const readyPlayersCount = players.filter(p => p.isReady).length;
  const canStartGame = players.length >= 2 && readyPlayersCount === players.length;

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      console.error('Failed to copy room code:', error);
    }
  };

  const sendMessage = () => {
    if (chatMessage.trim() && onSendMessage) {
      onSendMessage(chatMessage.trim());
      setChatMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getPlayerAvatar = (player: Player) => {
    if (player.avatar) {
      return player.avatar;
    }
    // Generate a simple avatar based on name
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'];
    const colorIndex = player.name.length % colors.length;
    return (
      <div className={`w-full h-full ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-bold`}>
        {player.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{room.name}</h1>
              <p className="text-gray-400">Waiting for players to join...</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Room Code */}
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
              <span className="text-sm text-gray-400">Room Code:</span>
              <span className="font-mono font-bold text-lg">{room.code}</span>
              <button
                onClick={copyRoomCode}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                {copiedCode ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>

            <button
              onClick={onLeaveRoom}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
            >
              Leave Room
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quiz Info & Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quiz Details */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Quiz Details
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Title</p>
                  <p className="font-medium">{quiz.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Category</p>
                  <p className="font-medium">{quiz.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Questions</p>
                  <p className="font-medium">{quiz.questionCount} questions</p>
                </div>
              </div>
            </div>

            {/* Room Settings */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" />
                Room Settings
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Players</span>
                  <span>{room.maxPlayers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time per Question</span>
                  <span>{room.timePerQuestion}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Late Join</span>
                  <span className={room.allowLateJoin ? 'text-green-400' : 'text-red-400'}>
                    {room.allowLateJoin ? 'Allowed' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Show Answers</span>
                  <span className={room.showCorrectAnswers ? 'text-green-400' : 'text-red-400'}>
                    {room.showCorrectAnswers ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Room Type</span>
                  <span className={room.isPrivate ? 'text-amber-400' : 'text-green-400'}>
                    {room.isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Toggle */}
            {onSendMessage && (
              <button
                onClick={() => setShowChat(!showChat)}
                className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                {showChat ? 'Hide Chat' : 'Show Chat'}
                {messages.length > 0 && !showChat && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {messages.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Players List */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Players ({players.length}/{room.maxPlayers})
              </h2>
              
              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        {getPlayerAvatar(player)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{player.name}</span>
                          {player.isHost && (
                            <Crown className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            player.isReady ? 'bg-green-400' : 'bg-gray-400'
                          }`} />
                          <span className="text-xs text-gray-400">
                            {player.isReady ? 'Ready' : 'Not Ready'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isHost && !player.isHost && onKickPlayer && (
                      <button
                        onClick={() => onKickPlayer(player.id)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Empty Slots */}
                {Array.from({ length: room.maxPlayers - players.length }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border-2 border-dashed border-white/20"
                  >
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-400" />
                    </div>
                    <span className="text-gray-400">Waiting for player...</span>
                  </div>
                ))}
              </div>

              {/* Ready Status */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Ready Players</span>
                  <span className="text-sm font-medium">
                    {readyPlayersCount}/{players.length}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(readyPlayersCount / players.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Start Game Button (Host Only) */}
              {isHost && (
                <button
                  onClick={onStartGame}
                  disabled={!canStartGame}
                  className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  {!canStartGame ? (
                    <>
                      <Clock className="w-5 h-5" />
                      Waiting for all players to be ready
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Start Game
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Chat (if enabled and shown) */}
          {showChat && onSendMessage && (
            <div className="lg:col-span-1">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-full flex flex-col">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                  Chat
                </h2>

                {/* Messages */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-80 mb-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-blue-400">
                            {message.playerName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm bg-white/5 rounded-lg px-3 py-2">
                          {message.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatMessage.trim()}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
