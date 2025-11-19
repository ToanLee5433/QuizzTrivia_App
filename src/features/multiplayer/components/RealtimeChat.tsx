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
}

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES_DISPLAY = 100;

const RealtimeChat: React.FC<RealtimeChatProps> = ({
  roomId,
  currentUserId,
  currentUsername,
  isMobile = false,
  onClose
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
    ? 'fixed inset-0 bg-white z-50 flex flex-col'
    : 'flex flex-col h-full bg-white rounded-lg shadow-lg';

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          💬 {t('multiplayer.chat.title')}
          {messages.length > 0 && (
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
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
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 bg-gray-50"
        style={{ maxHeight: isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 200px)', minHeight: '300px' }}
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">{t('common.loading')}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-center">
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
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs max-w-[80%] text-center">
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
                  className={`max-w-[70%] ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  } rounded-lg px-3 py-2 shadow-sm`}
                >
                  {!isOwnMessage && (
                    <div className="text-xs font-semibold text-blue-600 mb-1">
                      {msg.username}
                    </div>
                  )}
                  <div className="text-sm break-words">{msg.message}</div>
                  <div
                    className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-blue-200' : 'text-gray-400'
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
      <div className="p-3 sm:p-4 border-t bg-white">
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
            className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={!messageInput.trim() || isSending}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[44px] sm:gap-2"
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
          <div className="text-xs text-gray-400 mt-1 text-right">
            {messageInput.length}/{MAX_MESSAGE_LENGTH}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeChat;
