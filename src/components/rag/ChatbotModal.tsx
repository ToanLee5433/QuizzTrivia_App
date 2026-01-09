/**
 * 🤖 AI Chatbot Widget Component v6.0
 * 
 * Modern chat widget inspired by Facebook Messenger
 * Features:
 * - 🚀 NEW: Streaming responses via Firestore (like ChatGPT)
 * - Compact mode: Small chat box at bottom-right corner
 * - Expanded mode: Larger modal for detailed conversations
 * - Smooth transitions between modes
 * - Fully responsive (mobile/tablet/desktop)
 * - Dark mode support
 * - Message history with quiz recommendations
 * - Fallback to non-streaming for reliability
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, Sparkles, Book, AlertCircle, 
  Maximize2, Minimize2, Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { auth } from '../../lib/firebase/config';
import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';
import type { RAGResponse, QuizRecommendation } from '../../lib/genkit/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: RAGResponse['citations'];
  quizRecommendations?: QuizRecommendation[];
  timestamp: number;
  usedChunks?: number;
  processingTime?: number;
}

interface ChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Constants for memory management
const MAX_MESSAGES = 50;
const REQUEST_TIMEOUT = 180000; // 3 minutes for complex queries (was 60s)

// Feature flags - Firestore streaming disabled (doesn't actually stream tokens)
// Using typewriter effect instead for better UX
const USE_STREAMING = false;

// Typewriter effect speed (ms per character)
const TYPEWRITER_SPEED = 5; // Fast typing effect

export function ChatbotModal({ isOpen, onClose }: ChatbotModalProps) {
  const { t } = useTranslation();
  const currentUser = auth.currentUser;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [streamingText, setStreamingText] = useState<string>(''); // For typewriter display
  const [isStreaming, setIsStreaming] = useState(false); // Track if typewriter is active
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null); // Store full message for typewriter
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const typewriterRef = useRef<NodeJS.Timeout | null>(null); // Typewriter timer

  // Typewriter effect - display text character by character
  useEffect(() => {
    if (!pendingMessage || !isStreaming) return;
    
    const fullText = pendingMessage.content;
    let currentIndex = 0;
    
    const typeNextChar = () => {
      if (currentIndex < fullText.length) {
        // Type in chunks of 3-5 characters for faster display
        const chunkSize = Math.min(5, fullText.length - currentIndex);
        currentIndex += chunkSize;
        setStreamingText(fullText.substring(0, currentIndex));
        typewriterRef.current = setTimeout(typeNextChar, TYPEWRITER_SPEED);
      } else {
        // Typing complete - add full message to list
        setMessages(prev => {
          const updated = [...prev, pendingMessage];
          return updated.length > MAX_MESSAGES 
            ? updated.slice(-MAX_MESSAGES) 
            : updated;
        });
        setIsStreaming(false);
        setStreamingText('');
        setPendingMessage(null);
      }
    };
    
    typeNextChar();
    
    return () => {
      if (typewriterRef.current) {
        clearTimeout(typewriterRef.current);
      }
    };
  }, [pendingMessage, isStreaming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (typewriterRef.current) {
        clearTimeout(typewriterRef.current);
      }
    };
  }, []);

  // Clear messages when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessages(prev => prev.slice(-10));
      setRetryCount(0);
      setIsExpanded(false);
      setStreamingText('');
      setIsStreaming(false);
      setPendingMessage(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }
  }, [isOpen]);

  // Auto-scroll only when USER sends a message (not when AI responds)
  // This lets user read AI response from top to bottom naturally
  const [shouldScrollOnNextMessage, setShouldScrollOnNextMessage] = useState(false);
  
  useEffect(() => {
    if (shouldScrollOnNextMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShouldScrollOnNextMessage(false);
    }
  }, [messages, shouldScrollOnNextMessage]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle send message with streaming support
  const handleSendMessage = async (retryMessage?: string) => {
    const messageToSend = retryMessage || input.trim();
    if (!messageToSend || isLoading || !currentUser) return;

    // Cleanup previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    abortControllerRef.current = new AbortController();

    if (!retryMessage) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: messageToSend,
        timestamp: Date.now(),
      };

      setMessages(prev => {
        const updated = [...prev, userMessage];
        return updated.length > MAX_MESSAGES 
          ? updated.slice(-MAX_MESSAGES) 
          : updated;
      });
      setInput('');
      // Scroll to show user's message
      setShouldScrollOnNextMessage(true);
    }
    
    setIsLoading(true);
    setError(null);
    setStreamingText('');
    setIsStreaming(false);

    const recentHistory = messages
      .slice(-5)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    // Try streaming first if enabled
    if (USE_STREAMING) {
      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const { getFirestore, doc, onSnapshot } = await import('firebase/firestore');
        const { app } = await import('../../lib/firebase/config');
        
        const functions = getFunctions(app);
        const db = getFirestore(app);
        
        // Create streaming session
        const askRAGStreaming = httpsCallable(functions, 'askRAGStreaming', {
          timeout: 60000,
        });
        
        setIsStreaming(true);
        setStreamingText('🔍 Đang phân tích câu hỏi...');
        
        const result = await askRAGStreaming({
          question: messageToSend,
          history: recentHistory,
          topK: 4,
          targetLang: 'vi'
        });
        
        const { sessionId, success } = (result as any).data as { sessionId: string; success: boolean };
        
        if (!success || !sessionId) {
          throw new Error('STREAMING_FAILED');
        }
        
        // Listen to Firestore session for real-time updates
        const sessionRef = doc(db, 'ragStreamingSessions', sessionId);
        
        unsubscribeRef.current = onSnapshot(
          sessionRef,
          (snapshot) => {
            if (!snapshot.exists()) return;
            
            const data = snapshot.data() as {
              status: 'pending' | 'processing' | 'completed' | 'error';
              currentText: string;
              citations?: any[];
              quizRecommendations?: any[];
              usedChunks?: number;
              processingTime?: number;
              error?: string;
            };
            
            // Update streaming text
            if (data.currentText) {
              setStreamingText(data.currentText);
            }
            
            // Handle completion
            if (data.status === 'completed') {
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.currentText || '',
                citations: data.citations || [],
                quizRecommendations: data.quizRecommendations || [],
                timestamp: Date.now(),
                usedChunks: data.usedChunks || 0,
                processingTime: data.processingTime || 0,
              };

              setMessages(prev => {
                const updated = [...prev, assistantMessage];
                return updated.length > MAX_MESSAGES 
                  ? updated.slice(-MAX_MESSAGES) 
                  : updated;
              });
              
              setIsLoading(false);
              setIsStreaming(false);
              setStreamingText('');
              setRetryCount(0);
              
              // Cleanup listener
              if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
              }
            }
            
            // Handle error
            if (data.status === 'error') {
              setError(data.error || t('chatbot.errorGeneric', 'Đã xảy ra lỗi.'));
              setIsLoading(false);
              setIsStreaming(false);
              setStreamingText('');
              
              if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
              }
            }
          },
          (err) => {
            console.error('Firestore listener error:', err);
            // Fallback to non-streaming
            handleNonStreamingRequest(messageToSend, recentHistory);
          }
        );
        
        return; // Streaming started successfully
        
      } catch (streamingError) {
        console.warn('Streaming failed, falling back to regular request:', streamingError);
        setIsStreaming(false);
        setStreamingText('');
        // Fall through to non-streaming
      }
    }
    
    // Non-streaming fallback
    await handleNonStreamingRequest(messageToSend, recentHistory);
  };

  // Non-streaming request handler (fallback)
  const handleNonStreamingRequest = async (
    messageToSend: string, 
    recentHistory: { role: string; content: string }[]
  ) => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutRef.current = setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, REQUEST_TIMEOUT);
    });

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const askRAG = httpsCallable(functions, 'askRAG', {
        timeout: REQUEST_TIMEOUT,
      });
      
      const result = await Promise.race([
        askRAG({
          question: messageToSend,
          history: recentHistory,
          topK: 4,
          targetLang: 'vi'
        }),
        timeoutPromise,
      ]);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      const responseData = (result as any).data as { success: boolean; data: any };
      
      if (!responseData.success) {
        throw new Error('Failed to get response from AI');
      }
      
      const aiResponse = responseData.data;
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.answer,
        citations: aiResponse.citations || [],
        quizRecommendations: aiResponse.quizRecommendations || [],
        timestamp: Date.now(),
        usedChunks: aiResponse.usedChunks || 0,
        processingTime: aiResponse.processingTime || 0,
      };

      // 🚀 Use typewriter effect for response display
      setIsLoading(false);
      setIsStreaming(true);
      setPendingMessage(assistantMessage);
      
      setRetryCount(0);

    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      console.error('Error sending message:', err);
      
      let errorMessage = t('chatbot.errorGeneric', 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
      let canRetry = true;
      
      if (err instanceof Error) {
        if (err.message === 'TIMEOUT' || err.message.includes('timed out') || err.message.includes('deadline-exceeded')) {
          errorMessage = t('chatbot.errorTimeout', 'Yêu cầu quá thời gian. Vui lòng thử câu hỏi ngắn hơn hoặc thử lại.');
        } else if (err.message.includes('rate') || err.message.includes('Too many requests')) {
          errorMessage = t('chatbot.errorRateLimit', 'Quá nhiều yêu cầu. Vui lòng đợi một chút rồi thử lại.');
          canRetry = false;
        } else if (err.message.includes('unauthenticated')) {
          errorMessage = t('chatbot.errorAuth', 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
          canRetry = false;
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = t('chatbot.errorNetwork', 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.');
        }
      }
      
      setError(errorMessage);
      
      if (canRetry && retryCount < 2) {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="sync">
      {/* Backdrop - only visible in expanded mode */}
      {isExpanded && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Chat Widget */}
      <motion.div
        key={isExpanded ? 'expanded' : 'compact'}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
        className={`
          fixed z-[70] bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden
          ${isExpanded 
            ? 'inset-3 sm:inset-4 md:inset-6 lg:inset-12 xl:inset-20 rounded-2xl' 
            : 'bottom-24 right-4 sm:right-6 w-[calc(100%-2rem)] sm:w-[380px] md:w-[420px] h-[70vh] sm:h-[520px] md:h-[580px] max-h-[calc(100vh-120px)] rounded-2xl'
          }
        `}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between ${isExpanded ? 'px-5 py-4' : 'px-4 py-3'} border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 relative overflow-hidden flex-shrink-0`}>
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M20 20v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          <div className="flex items-center gap-2.5 relative z-10 min-w-0 flex-1">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className={`${isExpanded ? 'w-10 h-10' : 'w-9 h-9'} bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 flex-shrink-0`}
            >
              <Sparkles className={`${isExpanded ? 'w-5 h-5' : 'w-4 h-4'} text-white`} />
            </motion.div>
            <div className="min-w-0">
              <h2 className={`${isExpanded ? 'text-base' : 'text-sm'} font-bold text-white flex items-center gap-1.5 truncate`}>
                {t('chatbot.title', 'AI Learning Assistant')}
                <span className="px-1.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-normal border border-white/30 flex-shrink-0">
                  {t('chatbot.beta', 'Beta')}
                </span>
              </h2>
              <p className={`${isExpanded ? 'text-xs' : 'text-[11px]'} text-white/80 leading-tight truncate`}>
                {t('chatbot.subtitle', 'Trợ lý học tập thông minh được hỗ trợ bởi Google AI')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 relative z-10 flex-shrink-0 ml-2">
            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
              title={isExpanded ? 'Thu nhỏ' : 'Phóng to'}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 text-white" />
              ) : (
                <Maximize2 className="w-4 h-4 text-white" />
              )}
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
              title="Đóng"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className={`flex-1 overflow-y-auto ${isExpanded ? 'p-4 sm:p-5 space-y-4' : 'p-3 space-y-3'} bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-0`}>
          {/* Welcome Screen */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className={`${isExpanded ? 'w-16 h-16' : 'w-12 h-12'} bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg`}
              >
                <Book className={`${isExpanded ? 'w-8 h-8' : 'w-6 h-6'} text-white`} />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h3 className={`${isExpanded ? 'text-xl' : 'text-base'} font-bold text-gray-900 dark:text-white mb-1`}>
                  {t('chatbot.welcome', 'Xin chào! 👋')}
                </h3>
                <p className={`${isExpanded ? 'text-sm' : 'text-xs'} text-gray-600 dark:text-gray-400 max-w-xs mx-auto px-2`}>
                  {t('chatbot.welcomeMessage', 'Hãy hỏi về nội dung bạn đã học trong các quiz đã mở khóa')}
                </p>
              </motion.div>
              
              {/* Quick Suggestions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="w-full space-y-2 mt-2 px-1"
              >
                {[
                  { emoji: '🔍', text: t('chatbot.suggestion1', 'Tìm quiz phù hợp với tôi') },
                  { emoji: '📚', text: t('chatbot.suggestion2', 'Gợi ý chủ đề học hôm nay') },
                  { emoji: '💡', text: t('chatbot.suggestion3', 'Giải thích khái niệm này') },
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion.text)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 rounded-xl 
                      hover:shadow-md transition-all text-left border border-gray-200 dark:border-gray-700 
                      hover:border-purple-400 dark:hover:border-purple-500 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{suggestion.emoji}</span>
                      <span className={`${isExpanded ? 'text-sm' : 'text-xs'} font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400`}>
                        {suggestion.text}
                      </span>
                    </div>
                  </button>
                ))}
              </motion.div>
            </div>
          )}

          {/* Message List */}
          <MessageList 
            messages={messages} 
            onQuizClick={onClose}
            compact={!isExpanded}
          />

          {/* 🚀 Streaming Response Display */}
          {isStreaming && streamingText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="px-3 py-2.5 bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {streamingText}
                    <span className="inline-block w-1.5 h-4 ml-0.5 bg-purple-500 animate-pulse rounded-sm" />
                  </div>
                </div>
                <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 ml-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {t('chatbot.streaming', 'Đang xử lý...')}
                </p>
              </div>
            </motion.div>
          )}

          {/* Loading Indicator (fallback) */}
          {isLoading && !isStreaming && <TypingIndicator />}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-red-900 dark:text-red-200">
                  {t('chatbot.error', 'Có lỗi xảy ra')}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5 break-words">
                  {error}
                </p>
                {retryCount < 2 && (
                  <button
                    onClick={handleRetry}
                    className="mt-1.5 px-2.5 py-1 text-xs bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700/50 transition-colors"
                  >
                    {t('common.retry', 'Thử lại')}
                  </button>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`${isExpanded ? 'p-4' : 'p-3'} border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 backdrop-blur-sm flex-shrink-0`}>
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chatbot.inputPlaceholder', 'Hỏi gì đó...')}
              className={`flex-1 resize-none px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white ${isExpanded ? 'text-sm' : 'text-xs'} placeholder:text-gray-400 dark:placeholder:text-gray-500 overflow-hidden`}
              rows={1}
              style={{ maxHeight: isExpanded ? '120px' : '80px', minHeight: isExpanded ? '44px' : '40px', overflow: 'hidden' }}
            />
            <button
              onClick={() => void handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className={`${isExpanded ? 'p-3' : 'p-2.5'} bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center flex-shrink-0`}
              title={t('common.send', 'Gửi')}
            >
              <Send className={`${isExpanded ? 'w-5 h-5' : 'w-4 h-4'}`} />
            </button>
          </div>
          <p className={`${isExpanded ? 'text-xs' : 'text-[10px]'} text-gray-500 dark:text-gray-400 mt-2 leading-tight`}>
            💡 {t('chatbot.tip', 'Tip: Hỏi về nội dung bạn đã học trong các quiz đã mở khóa')}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

