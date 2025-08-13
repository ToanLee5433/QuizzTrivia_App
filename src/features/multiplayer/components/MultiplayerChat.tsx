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
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <h3 className="font-medium text-gray-900">
          {t('multiplayer.chat.title')}
        </h3>
        <div className="ml-auto">
          <span className="text-xs text-gray-500">
            {messages.length} {t('common.messages')}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            {t('multiplayer.chat.noMessages')}
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
                <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {message.message}
                </div>
              ) : (
                <div
                  className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm ${
                    message.userId === currentUserId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.userId !== currentUserId && (
                    <div className="text-xs opacity-75 mb-1 font-medium">
                      {message.username}
                    </div>
                  )}
                  <div>{message.message}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.userId === currentUserId
                        ? 'text-blue-200'
                        : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200">
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
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:text-gray-500"
            disabled={disabled}
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || disabled}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {inputMessage.length > 150 && (
          <div className="text-xs text-gray-500 mt-1 text-right">
            {inputMessage.length}/200
          </div>
        )}
      </form>
    </div>
  );
};

export default MultiplayerChat;
