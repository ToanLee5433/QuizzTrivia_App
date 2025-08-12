import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { 
  Settings, 
  MessageCircle,
  Crown,
  Volume2,
  VolumeX
} from 'lucide-react';
import { firestoreMultiplayerService } from '../services';
import { MultiplayerRoom, ChatMessage } from '../types';

const MultiplayerChat: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  useEffect(() => {
    const currentRoom = firestoreMultiplayerService.getCurrentRoom();
    if (currentRoom) {
      setRoom(currentRoom);
      // Initialize with some sample messages
      setMessages([
        {
          id: '1',
          playerId: 'system',
          playerName: 'System',
          message: 'Chào mừng đến với phòng chat!',
          timestamp: Date.now() - 60000,
          type: 'system'
        }
      ]);
    }
  }, []);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user || !room) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      playerId: user.uid,
      playerName: user.displayName || 'Ẩn danh',
      message: newMessage.trim(),
      timestamp: Date.now(),
      type: 'message'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    if (isSoundEnabled) {
      // Play sound effect
      const audio = new Audio('/sounds/message.mp3');
      audio.play().catch(() => {});
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageTypeStyles = (type: ChatMessage['type']) => {
    switch (type) {
      case 'system':
        return 'bg-blue-500/20 border-blue-500/30 text-blue-200';
      case 'emoji':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200';
      default:
        return 'bg-white/5 border-white/10 text-white';
    }
  };

  if (!room) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div className="text-white/70 text-center">Không có phòng</div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 h-96 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Chat ({room.players.length})
        </h3>
        
        <button
          onClick={() => setIsSoundEnabled(!isSoundEnabled)}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          {isSoundEnabled ? (
            <Volume2 className="w-4 h-4 text-white" />
          ) : (
            <VolumeX className="w-4 h-4 text-white/50" />
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded-lg border ${getMessageTypeStyles(message.type)}`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-sm">
                {message.type === 'system' ? (
                  <span className="flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    {message.playerName}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    {room.hostId === message.playerId && (
                      <Crown className="w-3 h-3 text-yellow-400" />
                    )}
                    {message.playerName}
                  </span>
                )}
              </span>
              <span className="text-xs opacity-70">
                {formatTime(message.timestamp)}
              </span>
            </div>
            <p className="text-sm break-words">{message.message}</p>
          </div>
        ))}
        
        {messages.length === 0 && (
          <div className="text-center text-white/50 py-8">
            Chưa có tin nhắn nào
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nhập tin nhắn..."
          maxLength={200}
          className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-400 focus:outline-none"
        />
        
        <button
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
          className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          Gửi
        </button>
      </div>

      {/* Character count */}
      <div className="text-right text-xs text-white/50 mt-1">
        {newMessage.length}/200
      </div>
    </div>
  );
};

export default MultiplayerChat;
