/**
 * 🤖 AI Chatbot Modal Component
 * 
 * Modern full-screen chatbot interface similar to ChatGPT
 * Features:
 * - Full-screen overlay
 * - Message history
 * - Streaming-style typing animation
 * - Citation badges
 * - Mobile responsive
 * - Dark mode support
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Book, AlertCircle } from 'lucide-react';
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

// v4.3.1: Constants for memory management
const MAX_MESSAGES = 50; // Limit messages to prevent memory leaks

export function ChatbotModal({ isOpen, onClose }: ChatbotModalProps) {
  const { t } = useTranslation();
  const currentUser = auth.currentUser;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // v4.3.1: Cleanup on unmount or close
  useEffect(() => {
    return () => {
      // Cancel any pending requests when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // v4.3.1: Clear messages when modal closes to free memory
  useEffect(() => {
    if (!isOpen) {
      // Keep last 10 messages for context when reopening
      setMessages(prev => prev.slice(-10));
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !currentUser) return;

    // v4.3.1: Cancel any previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    // v4.3.1: Limit messages to prevent memory leaks
    setMessages(prev => {
      const updated = [...prev, userMessage];
      return updated.length > MAX_MESSAGES 
        ? updated.slice(-MAX_MESSAGES) 
        : updated;
    });
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Call Cloud Function
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const askRAG = httpsCallable(functions, 'askRAG');
      
      // NEW v4.2: Build conversation history for contextual queries
      // Get last 5 messages (excluding the current one we just added)
      const recentHistory = messages
        .slice(-5)
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ 
          role: m.role, 
          content: m.content 
        }));
      
      const result = await askRAG({
        question: userMessage.content,
        history: recentHistory,  // NEW v4.2: Send conversation history
        topK: 4,
        targetLang: 'vi'
      });
      
      // v4.3.1: Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      const responseData = result.data as { success: boolean; data: any };
      
      if (!responseData.success) {
        throw new Error('Failed to get response from AI');
      }
      
      const aiResponse = responseData.data;
      
      // Debug logging
      console.log('🤖 AI Response:', aiResponse);
      console.log('📊 Quiz Recommendations:', aiResponse.quizRecommendations);
      
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

      // v4.3.1: Limit messages when adding assistant response
      setMessages(prev => {
        const updated = [...prev, assistantMessage];
        return updated.length > MAX_MESSAGES 
          ? updated.slice(-MAX_MESSAGES) 
          : updated;
      });

    } catch (err) {
      // v4.3.1: Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Error sending message:', err);
      setError('Đã xảy ra lỗi. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="fixed inset-4 md:inset-8 lg:inset-16 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>
            
            <div className="flex items-center gap-3 relative z-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30"
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {t('chatbot.title')}
                  <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-normal border border-white/30">
                    {t('chatbot.beta')}
                  </span>
                </h2>
                <p className="text-xs text-white/90">{t('chatbot.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm relative z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.6 }}
                  className="w-24 h-24 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 rounded-3xl flex items-center justify-center shadow-2xl"
                >
                  <Book className="w-12 h-12 text-white" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {t('chatbot.welcome')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
                    {t('chatbot.welcomeMessage')}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl"
                >
                  <button
                    onClick={() => setInput('Giải thích cho tôi về chủ đề này')}
                    className="group px-4 py-3 bg-white dark:bg-gray-800 rounded-xl hover:shadow-lg transition-all text-left border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">💡</div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                          {t('chatbot.suggestions.explain.title')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('chatbot.suggestions.explain.description')}
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setInput('Tóm tắt nội dung về chủ đề này')}
                    className="group px-4 py-3 bg-white dark:bg-gray-800 rounded-xl hover:shadow-lg transition-all text-left border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">📝</div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {t('chatbot.suggestions.summarize.title')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('chatbot.suggestions.summarize.description')}
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setInput('Cho tôi ví dụ thực tế về chủ đề này')}
                    className="group px-4 py-3 bg-white dark:bg-gray-800 rounded-xl hover:shadow-lg transition-all text-left border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🎯</div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">
                          {t('chatbot.suggestions.examples.title')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('chatbot.suggestions.examples.description')}
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setInput('Gợi ý quiz để tôi luyện tập')}
                    className="group px-4 py-3 bg-white dark:bg-gray-800 rounded-xl hover:shadow-lg transition-all text-left border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🎓</div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {t('chatbot.suggestions.recommend.title')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('chatbot.suggestions.recommend.description')}
                        </div>
                      </div>
                    </div>
                  </button>
                </motion.div>
              </div>
            )}

            <MessageList messages={messages} onQuizClick={onClose} />

            {isLoading && <TypingIndicator />}

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900 dark:text-red-200">
                    {t('chatbot.error')}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('placeholders.askQuestion')}
                className="flex-1 resize-none px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                rows={1}
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                <Send className="w-5 h-5" />
                {t('common.send')}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t('chatbot.tip')}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
