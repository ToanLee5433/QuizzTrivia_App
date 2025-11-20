import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, X, Loader2 } from 'lucide-react';
import { ref, push, onChildAdded, serverTimestamp, query, orderByChild, limitToLast, off } from 'firebase/database';
import { rtdb } from '../../../lib/firebase/config';
import { logger } from '../utils/logger';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'user' | 'system';
}

interface RealtimeChatProps {
  roomId: string;
  currentUserId: string;
  currentUsername: string;
  isMobile?: boolean;
  onClose?: () => void;
  transparent?: boolean;
}

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES_DISPLAY = 100;

const RealtimeChat: React.FC<RealtimeChatProps> = ({
  roomId,
  currentUserId,
  currentUsername,
  isMobile = false,
  onClose,
  transparent = false
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Listen to realtime chat messages
  useEffect(() => {
    if (!roomId) return;

    logger.info('💬 RealtimeChat: Setting up listener', { roomId });
    
    const chatRef = ref(rtdb, `rooms/${roomId}/chat`);
    const chatQuery = query(
      chatRef,
      orderByChild('timestamp'),
      limitToLast(MAX_MESSAGES_DISPLAY)
    );

    setIsLoading(true);
    let isInitialLoad = true;

    const unsubscribe = onChildAdded(chatQuery, (snapshot) => {
      const messageData = snapshot.val();
      const messageId = snapshot.key;
      
      if (messageId && messageData) {
        const message: ChatMessage = {
          id: messageId,
          userId: messageData.userId || 'system',
          username: messageData.username || 'System',
          message: messageData.message || '',
          timestamp: messageData.timestamp || Date.now(),
          type: messageData.type || 'user'
        };

        setMessages(prev => {
          // Avoid duplicates
          const exists = prev.find(m => m.id === message.id);
          if (exists) return prev;
          
          const updated = [...prev, message];
          
          // Keep only last MAX_MESSAGES_DISPLAY messages
          if (updated.length > MAX_MESSAGES_DISPLAY) {
            return updated.slice(-MAX_MESSAGES_DISPLAY);
          }
          
          return updated;
        });
      }
      
      if (isInitialLoad) {
        isInitialLoad = false;
        setIsLoading(false);
      }
    });

    return () => {
      logger.debug('💬 RealtimeChat: Cleaning up listener');
      if (unsubscribe) unsubscribe();
      off(chatQuery);
    };
  }, [roomId]);

  // Auto-scroll when messages change (debounced)
  useEffect(() => {
    if (messages.length > 0) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, scrollToBottom]);

  // Send message to Realtime Database
  const sendMessage = async () => {
    const trimmedMessage = messageInput.trim();
    
    if (!trimmedMessage || isSending) return;
    
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      logger.warn('Message too long', { length: trimmedMessage.length });
      return;
    }

    try {
      setIsSending(true);
      
      const chatRef = ref(rtdb, `rooms/${roomId}/chat`);
      await push(chatRef, {
        userId: currentUserId,
        username: currentUsername,
        message: trimmedMessage,
        timestamp: serverTimestamp(),
        type: 'user'
      });

      setMessageInput('');
      inputRef.current?.focus();
      
      logger.debug('💬 Message sent', { messageLength: trimmedMessage.length });
    } catch (error) {
      logger.error('Failed to send message', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Container classes based on mobile/desktop
  const containerClasses = isMobile
    ? 'fixed inset-0 bg-gray-900 z-50 flex flex-col'
    : transparent
      ? 'flex flex-col h-full bg-black/20 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden'
      : 'flex flex-col h-full bg-white rounded-lg shadow-lg';

  const headerClasses = transparent
    ? 'flex items-center justify-between p-4 border-b border-white/10 bg-white/5'
    : 'flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600';

  const messagesContainerClasses = transparent
    ? 'flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent'
    : 'flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 bg-gray-50';

  const inputContainerClasses = transparent
    ? 'p-3 sm:p-4 border-t border-white/10 bg-white/5'
    : 'p-3 sm:p-4 border-t bg-white';

  const inputClasses = transparent
    ? 'flex-1 px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all'
    : 'flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed';

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className={headerClasses}>
        <h3 className={`text-lg font-bold flex items-center gap-2 ${transparent ? 'text-white' : 'text-white'}`}>
          💬 {t('multiplayer.chat.title')}
          {messages.length > 0 && (
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full text-white">
              {messages.length}
            </span>
          )}
        </h3>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className={messagesContainerClasses}
        style={{ maxHeight: isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 200px)', minHeight: '300px' }}
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">{t('common.loading')}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className={`flex items-center justify-center h-full text-center ${transparent ? 'text-white/40' : 'text-gray-400'}`}>
            <div>
              <p className="text-sm">{t('multiplayer.noMessages')}</p>
              <p className="text-xs mt-1">{t('multiplayer.startConversation')}</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.userId === currentUserId;
            const isSystemMessage = msg.type === 'system';

            if (isSystemMessage) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-blue-500/20 text-blue-200 px-3 py-1 rounded-full text-xs max-w-[80%] text-center border border-blue-500/30">
                    {msg.message}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] ${
                    isOwnMessage
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                      : transparent
                        ? 'bg-white/10 backdrop-blur-md text-white border border-white/10'
                        : 'bg-white text-gray-900 border border-gray-200'
                  } rounded-2xl px-4 py-2.5 shadow-sm`}
                >
                  {!isOwnMessage && (
                    <div className={`text-xs font-bold mb-1 ${transparent ? 'text-purple-300' : 'text-blue-600'}`}>
                      {msg.username}
                    </div>
                  )}
                  <div className="text-sm break-words leading-relaxed">{msg.message}</div>
                  <div
                    className={`text-[10px] mt-1 text-right ${
                      isOwnMessage ? 'text-white/60' : transparent ? 'text-white/40' : 'text-gray-400'
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={inputContainerClasses}>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('multiplayer.typeMessage')}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={isSending}
            className={inputClasses}
          />
          <button
            onClick={sendMessage}
            disabled={!messageInput.trim() || isSending}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center min-w-[48px]"
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        {messageInput.length > 0 && (
          <div className={`text-xs mt-1 text-right ${transparent ? 'text-white/40' : 'text-gray-400'}`}>
            {messageInput.length}/{MAX_MESSAGE_LENGTH}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeChat;
