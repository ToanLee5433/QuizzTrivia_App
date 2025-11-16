import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, MessageSquare } from 'lucide-react';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'system';
}

interface MultiplayerChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentUserId: string;
  disabled?: boolean;
}

const MultiplayerChat: React.FC<MultiplayerChatProps> = ({
  messages,
  onSendMessage,
  currentUserId,
  disabled = false
}) => {
  const { t } = useTranslation();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || disabled) return;
    
    onSendMessage(inputMessage.trim());
    setInputMessage('');
    inputRef.current?.focus();
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-indigo-500">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white text-lg">
            {t('multiplayer.chat.title')}
          </h3>
          <span className="text-xs text-blue-100">
            {t('multiplayer.chat.messageCount', { count: messages.length })}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-gray-500 text-sm font-medium">
              {t('multiplayer.chat.noMessages')}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {t('multiplayer.chat.startConversation')}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${
                message.type === 'system'
                  ? 'items-center'
                  : message.userId === currentUserId
                  ? 'items-end'
                  : 'items-start'
              }`}
            >
              {message.type === 'system' ? (
                <div className="bg-gray-200 text-gray-600 text-xs px-4 py-1.5 rounded-full font-medium shadow-sm">
                  {message.message}
                </div>
              ) : (
                <div className="flex flex-col max-w-[75%]">
                  {message.userId !== currentUserId && (
                    <span className="text-xs text-gray-500 font-semibold mb-1 ml-3">
                      {message.username}
                    </span>
                  )}
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                      message.userId === currentUserId
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    <div className="break-words">{message.message}</div>
                    <div
                      className={`text-xs mt-1 ${
                        message.userId === currentUserId
                          ? 'text-blue-100'
                          : 'text-gray-400'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              disabled
                ? t('multiplayer.chat.disabled')
                : t('multiplayer.chat.placeholder')
            }
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition-all disabled:bg-gray-100 disabled:text-gray-400"
            disabled={disabled}
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || disabled}
            className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:shadow-none"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        {inputMessage.length > 150 && (
          <div className="flex items-center justify-end gap-2 mt-2">
            <div className={`w-12 h-1.5 rounded-full overflow-hidden bg-gray-200`}>
              <div 
                className={`h-full transition-all ${
                  inputMessage.length > 180 ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${(inputMessage.length / 200) * 100}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${
              inputMessage.length > 180 ? 'text-red-500' : 'text-gray-500'
            }`}>
              {inputMessage.length}/200
            </span>
          </div>
        )}
      </form>
    </div>
  );
};

export default MultiplayerChat;
