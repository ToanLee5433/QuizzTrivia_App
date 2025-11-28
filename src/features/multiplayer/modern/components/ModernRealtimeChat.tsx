import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, Loader2, MessageCircle, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  ref, 
  push, 
  onChildAdded, 
  serverTimestamp, 
  query, 
  orderByChild, 
  limitToLast, 
  off,
  remove,
  set,
  get
} from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import DOMPurify from 'dompurify';

interface ChatMessage {
  id: string;
  userId?: string;      // May be undefined for system messages
  username?: string;    // May be undefined for system messages
  photoURL?: string;
  message?: string;     // User messages
  content?: string;     // System messages (legacy field name)
  timestamp: number;
  type?: 'user' | 'system' | 'announcement';  // May be undefined for old messages
  senderId?: string;    // For system messages
  senderName?: string;  // For system messages
}

interface ModernRealtimeChatProps {
  roomId: string;
  currentUserId: string;
  currentUsername: string;
  currentUserPhoto?: string;
  isMobile?: boolean;
  onClose?: () => void;
  transparent?: boolean;
}

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES_DISPLAY = 100;

const ModernRealtimeChat: React.FC<ModernRealtimeChatProps> = ({
  roomId,
  currentUserId,
  currentUsername,
  currentUserPhoto,
  isMobile = false,
  onClose,
  transparent = false
}) => {
  const { t } = useTranslation('multiplayer');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const db = getDatabase();
  const auth = getAuth();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load initial messages
  useEffect(() => {
    if (!roomId || !db) return;
    
    // Clear messages when room changes
    setMessages([]);
    setIsLoading(true);
    
    // Track which message IDs we've already loaded to avoid duplicates
    const loadedMessageIds = new Set<string>();
    let initialLoadComplete = false;

    const messagesRef = ref(db, `rooms/${roomId}/chat/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(MAX_MESSAGES_DISPLAY));

    // ✅ Load existing messages first
    get(messagesQuery).then((snapshot: any) => {
      if (snapshot.exists()) {
        const messagesData: ChatMessage[] = [];
        snapshot.forEach((childSnapshot: any) => {
          const message = childSnapshot.val() as ChatMessage;
          const messageId = childSnapshot.key!;
          loadedMessageIds.add(messageId); // Track loaded IDs
          messagesData.push({ ...message, id: messageId });
        });
        setMessages(messagesData);
      }
      setIsLoading(false);
      initialLoadComplete = true; // Mark initial load as complete
      setTimeout(scrollToBottom, 100);
    });

    const handleNewMessage = (snapshot: any) => {
      const message = snapshot.val() as ChatMessage;
      if (message) {
        const messageId = snapshot.key!;
        
        // ✅ Skip messages that were already loaded in initial fetch
        // onChildAdded fires for existing children too, so we need to filter
        if (loadedMessageIds.has(messageId)) {
          return;
        }
        
        // ✅ Only add truly new messages (after initial load)
        if (!initialLoadComplete) {
          loadedMessageIds.add(messageId);
          return;
        }
        
        loadedMessageIds.add(messageId);
        setMessages(prev => {
          // Double-check for duplicates
          if (prev.some(m => m.id === messageId)) return prev;
          const newMessages = [...prev, { ...message, id: messageId }];
          return newMessages.slice(-MAX_MESSAGES_DISPLAY);
        });
        setTimeout(scrollToBottom, 100);
      }
    };

    onChildAdded(messagesQuery, handleNewMessage);

    return () => {
      off(messagesQuery, 'child_added', handleNewMessage);
    };
  }, [roomId, db, scrollToBottom]);

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      // Broadcast typing status
      const typingRef = ref(db, `rooms/${roomId}/chat/typing/${currentUserId}`);
      set(typingRef, {
        username: currentUsername,
        timestamp: serverTimestamp()
      });

      // Stop typing after 3 seconds of inactivity
      setTimeout(() => {
        setIsTyping(false);
        remove(typingRef);
      }, 3000);
    }
  }, [roomId, currentUserId, currentUsername, isTyping, db]);

  // Listen to other users typing
  useEffect(() => {
    if (!roomId || !db) return;

    const typingRef = ref(db, `rooms/${roomId}/chat/typing`);
    
    const handleTypingUpdate = (snapshot: any) => {
      const typingData = snapshot.val();
      if (typingData && typingData.userId !== currentUserId) {
        setTypingUsers(prev => [...prev, typingData.username]);
        
        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(name => name !== typingData.username));
        }, 3000);
      }
    };
    
    onChildAdded(typingRef, handleTypingUpdate);

    return () => off(typingRef, 'child_added', handleTypingUpdate);
  }, [roomId, currentUserId, db]);

  const sendMessage = useCallback(async () => {
    if (!messageInput.trim() || isSending || !db) {
      console.log('⚠️ sendMessage blocked:', { hasInput: !!messageInput.trim(), isSending, hasDb: !!db });
      return;
    }

    console.log('📤 Sending message:', {
      message: messageInput.trim(),
      roomId,
      currentUserId,
      currentUsername,
      authUser: auth.currentUser?.uid
    });
    setIsSending(true);
    
    try {
      const messagesRef = ref(db, `rooms/${roomId}/chat/messages`);
      
      // Build message object, only include photoURL if it exists
      const newMessage: any = {
        userId: currentUserId,
        username: currentUsername,
        message: messageInput.trim(),
        timestamp: Date.now(),
        type: 'user'
      };
      
      // Only add photoURL if it exists
      const photoUrl = currentUserPhoto || auth.currentUser?.photoURL;
      if (photoUrl) {
        newMessage.photoURL = photoUrl;
      }

      console.log('📝 Message data to send:', newMessage);
      await push(messagesRef, newMessage);
      console.log('✅ Message sent successfully');
      setMessageInput('');
      
      // Remove typing indicator
      const typingRef = ref(db, `rooms/${roomId}/chat/typing/${currentUserId}`);
      remove(typingRef);
      setIsTyping(false);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [messageInput, isSending, db, roomId, currentUserId, currentUsername, currentUserPhoto, auth]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Emoji picker data
  const emojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
    '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋',
    '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳',
    '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫',
    '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳',
    '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭',
    '👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️', '🤞', '🤟',
    '🤘', '🤙', '👊', '✊', '🤛', '🤜', '💪', '👋', '🤚', '🖐',
    '✋', '🖖', '👌', '🤌', '🤏', '✍️', '🙋', '💁', '🙆', '🙅',
    '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟'
  ];

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full ${transparent ? 'bg-transparent' : 'bg-gradient-to-br from-white/95 to-blue-50/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-200/50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-t-2xl border-b border-blue-200/50">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <MessageCircle className="w-5 h-5 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">{t('liveChat')}</h3>
            <p className="text-blue-100 text-xs">{t('messageCount', { count: messages.length })}</p>
          </div>
        </div>
        {onClose && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </motion.button>
        )}
      </div>

      {/* Typing Indicators */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4 py-2 bg-blue-50 border-b border-blue-100"
          >
            <p className="text-xs text-blue-600 italic">
              {typingUsers.join(', ')} {t('typing')}...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ maxHeight: isMobile ? '300px' : '400px' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">{t('noMessagesYet')}</p>
            <p className="text-gray-400 text-xs mt-1">{t('sendMessage')}!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              // Determine if this is a system message
              // System messages have: type='system' OR senderId='system' OR no userId
              const isSystemMessage = message.type === 'system' || 
                                       message.senderId === 'system' || 
                                       !message.userId;
              
              // Get message text (support both 'message' and 'content' fields)
              const messageText = message.message || message.content || '';
              
              // Skip empty messages
              if (!messageText.trim()) return null;
              
              return (
              <motion.div
                key={`msg-${message.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className={`flex ${!isSystemMessage && message.userId === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md ${!isSystemMessage && message.userId === currentUserId ? 'order-2' : 'order-1'}`}>
                  {isSystemMessage ? (
                    <div className="text-center">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                        ℹ️ {messageText}
                      </span>
                    </div>
                  ) : (
                    <div className={`flex ${message.userId === currentUserId ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                      {message.photoURL ? (
                        <img
                          src={message.photoURL}
                          alt={message.username || 'User'}
                          className="w-8 h-8 rounded-full object-cover border-2 border-blue-200"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {(message.username || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`flex-1 ${message.userId === currentUserId ? 'text-right' : 'text-left'}`}>
                        <p className="text-xs text-gray-500 mb-1">{message.username || 'Unknown'}</p>
                        <div className={`inline-block px-4 py-2 rounded-2xl ${
                          message.userId === currentUserId 
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' 
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          <p 
                            className="text-sm break-words"
                            dangerouslySetInnerHTML={{ 
                              __html: DOMPurify.sanitize(messageText) 
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{formatTime(message.timestamp)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-b-2xl border-t border-blue-200/50">
        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-3 p-3 bg-white rounded-xl shadow-lg border border-blue-200 max-h-48 overflow-y-auto"
            >
              <div className="grid grid-cols-10 gap-2">
                {emojis.map((emoji, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="text-2xl hover:bg-blue-50 rounded p-1 transition-colors"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 transition-colors ${
                showEmojiPicker 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:text-blue-600'
              }`}
              title={t('selectEmoji')}
            >
              <Smile className="w-5 h-5" />
            </motion.button>
          </div>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value);
                handleTypingStart();
              }}
              onKeyPress={handleKeyPress}
              placeholder={t('enterMessage')}
              maxLength={MAX_MESSAGE_LENGTH}
              className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isSending}
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
              {messageInput.length}/{MAX_MESSAGE_LENGTH}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            disabled={!messageInput.trim() || isSending}
            className="p-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ModernRealtimeChat;
