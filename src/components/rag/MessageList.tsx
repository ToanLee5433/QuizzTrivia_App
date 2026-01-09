/**
 * 💬 Message List Component
 * 
 * Displays chat messages with citations and quiz recommendations
 * v5.2: Improved URL parsing, word-wrap fix, and clickable links
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Sparkles, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { CitationBadge } from './CitationBadge';
import { QuizRecommendationCard } from './QuizRecommendationCard';
import type { Citation, QuizRecommendation } from '../../lib/genkit/types';
import { useTranslation } from 'react-i18next';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  quizRecommendations?: QuizRecommendation[];
  timestamp: number;
  usedChunks?: number;
  processingTime?: number;
}

interface MessageListProps {
  messages: Message[];
  onQuizClick?: () => void;
  compact?: boolean; // v5.0: Compact mode for smaller chat widget
}

/**
 * Truncate URL for display but keep full URL for href
 */
function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;
  
  try {
    const urlObj = new URL(url);
    const display = `${urlObj.hostname}${urlObj.pathname.substring(0, 20)}...`;
    return display.length > maxLength ? url.substring(0, maxLength) + '...' : display;
  } catch {
    return url.substring(0, maxLength) + '...';
  }
}

/**
 * Parse text and convert URLs to clickable links
 * Handles raw URLs and preserves line breaks
 */
function parseContentWithLinks(content: string, compact: boolean): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  
  // Regex for URLs - matches http/https URLs
  const urlRegex = /(https?:\/\/[^\s<>"')\]]+)/g;
  
  // Split by newlines first to preserve formatting
  const lines = content.split('\n');
  
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      elements.push(<br key={`br-${lineIndex}`} />);
    }
    
    // Reset regex
    urlRegex.lastIndex = 0;
    
    let lastIndex = 0;
    let match;
    
    while ((match = urlRegex.exec(line)) !== null) {
      // Add text before the URL
      if (match.index > lastIndex) {
        elements.push(
          <span key={`text-${lineIndex}-${lastIndex}`}>
            {line.substring(lastIndex, match.index)}
          </span>
        );
      }
      
      const url = match[0];
      // Clean up URL - remove trailing punctuation that might have been captured
      const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
      
      elements.push(
        <a
          key={`link-${lineIndex}-${match.index}`}
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 
                      hover:underline font-medium inline
                      ${compact ? 'text-[11px]' : 'text-sm'}`}
          onClick={(e) => e.stopPropagation()}
          style={{ wordBreak: 'break-all' }}
        >
          🔗 {truncateUrl(cleanUrl, compact ? 35 : 50)}
        </a>
      );
      
      lastIndex = match.index + url.length;
    }
    
    // Add remaining text after last URL
    if (lastIndex < line.length) {
      elements.push(
        <span key={`text-${lineIndex}-end`}>
          {line.substring(lastIndex)}
        </span>
      );
    }
  });
  
  return elements;
}

export function MessageList({ messages, onQuizClick, compact = false }: MessageListProps) {
  const { t } = useTranslation();
  // Track which messages have expanded quiz recommendations
  const [expandedQuizzes, setExpandedQuizzes] = useState<Record<string, boolean>>({});
  
  const toggleQuizExpand = (messageId: string) => {
    setExpandedQuizzes(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };
  
  return (
    <>
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className={`flex ${compact ? 'gap-2' : 'gap-3'} ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {message.role === 'assistant' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.03 + 0.05, type: 'spring' }}
              className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg`}
            >
              <Sparkles className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
            </motion.div>
          )}

          <div
            className={`${compact ? 'max-w-[88%]' : 'max-w-[85%]'} ${
              message.role === 'user'
                ? `bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white shadow-lg rounded-2xl ${compact ? 'px-3 py-2' : 'px-4 py-3'}`
                : `${compact ? 'space-y-2' : 'space-y-3'}`
            }`}
          >
            {/* AI Message Answer */}
            {message.role === 'assistant' && (
              <div className={`bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-md rounded-2xl ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}
                   style={{ maxWidth: '100%', overflow: 'hidden' }}>
                <div className={`prose ${compact ? 'prose-xs' : 'prose-sm'} dark:prose-invert max-w-none`}
                     style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  <div className={`whitespace-pre-wrap leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}
                       style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                    {parseContentWithLinks(message.content, compact)}
                  </div>
                </div>

                {/* Citations */}
                {message.citations && message.citations.length > 0 && (
                  <div className={`${compact ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t border-gray-200 dark:border-gray-700`}>
                    <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium mb-1.5 text-gray-600 dark:text-gray-400`}>
                      {t('chatbot.citations')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {message.citations.slice(0, compact ? 3 : 5).map((citation, i) => (
                        <CitationBadge key={i} citation={citation} index={i + 1} compact={compact} />
                      ))}
                      {compact && message.citations.length > 3 && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 self-center">
                          +{message.citations.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {message.processingTime && (
                  <div className={`${compact ? 'mt-1.5' : 'mt-2'} flex items-center gap-2 ${compact ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400`}>
                    <span>⚡ {message.processingTime}ms</span>
                    {message.usedChunks && message.usedChunks > 0 && (
                      <>
                        <span>•</span>
                        <span>{message.usedChunks} nguồn</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quiz Recommendations - Inside AI message block */}
            {message.role === 'assistant' && message.quizRecommendations && message.quizRecommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className={`bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl ${compact ? 'p-3' : 'p-4'}`}>
                  <div className={`flex items-center gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
                    <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center`}>
                      <BookOpen className={`${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-white`} />
                    </div>
                    <h4 className={`font-bold text-purple-900 dark:text-purple-100 ${compact ? 'text-xs' : 'text-sm'}`}>
                      {t('chatbot.quizSuggestions')}
                    </h4>
                  </div>
                  <p className={`${compact ? 'text-[11px] mb-2' : 'text-sm mb-4'} text-purple-700 dark:text-purple-300`}>
                    {t('chatbot.clickToStart')}
                  </p>
                  <div className={`${compact ? 'space-y-2' : 'space-y-3'}`}>
                    {/* Show limited quizzes initially, all when expanded */}
                    {(() => {
                      const maxInitial = compact ? 3 : 5;
                      const isExpanded = expandedQuizzes[message.id];
                      const quizzesToShow = isExpanded 
                        ? message.quizRecommendations 
                        : message.quizRecommendations.slice(0, maxInitial);
                      const hiddenCount = message.quizRecommendations.length - maxInitial;
                      
                      return (
                        <>
                          <AnimatePresence mode="sync">
                            {quizzesToShow.map((quiz, i) => (
                              <motion.div
                                key={quiz.quizId}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: i >= maxInitial ? (i - maxInitial) * 0.05 : 0 }}
                              >
                                <QuizRecommendationCard 
                                  quiz={quiz} 
                                  index={i} 
                                  onNavigate={onQuizClick}
                                  compact={compact}
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          
                          {/* Expand/Collapse button */}
                          {hiddenCount > 0 && (
                            <motion.button
                              onClick={() => toggleQuizExpand(message.id)}
                              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl 
                                bg-purple-100 dark:bg-purple-900/30 
                                hover:bg-purple-200 dark:hover:bg-purple-800/40 
                                text-purple-700 dark:text-purple-300 
                                transition-all duration-200 group
                                ${compact ? 'text-[11px]' : 'text-xs'}`}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} transition-transform group-hover:-translate-y-0.5`} />
                                  <span>{t('chatbot.showLess', 'Thu gọn')}</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} transition-transform group-hover:translate-y-0.5`} />
                                  <span>+{hiddenCount} {t('chatbot.moreQuizzes', 'quiz khác')}</span>
                                </>
                              )}
                            </motion.button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            )}

            {/* User Message */}
            {message.role === 'user' && (
              <div className={`prose ${compact ? 'prose-xs' : 'prose-sm'} dark:prose-invert max-w-none`}>
                <p className={`whitespace-pre-wrap leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>{message.content}</p>
              </div>
            )}
          </div>

          {message.role === 'user' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.03 + 0.05, type: 'spring' }}
              className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center flex-shrink-0 shadow-lg`}
            >
              <User className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
            </motion.div>
          )}
        </motion.div>
      ))}
    </>
  );
}
