/**
 * 💬 Message List Component
 * 
 * Displays chat messages with citations and quiz recommendations
 */

import { motion } from 'framer-motion';
import { User, Sparkles, BookOpen } from 'lucide-react';
import { CitationBadge } from './CitationBadge';
import { QuizRecommendationCard } from './QuizRecommendationCard';
import type { Citation, QuizRecommendation } from '../../lib/genkit/types';

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
}

export function MessageList({ messages, onQuizClick }: MessageListProps) {
  return (
    <>
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`flex gap-3 ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {message.role === 'assistant' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.05 + 0.1, type: 'spring' }}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg"
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
          )}

          <div
            className={`max-w-[85%] ${
              message.role === 'user'
                ? 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white shadow-lg rounded-2xl px-4 py-3'
                : ''
            }`}
          >
            {/* AI Message Answer */}
            {message.role === 'assistant' && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-md rounded-2xl px-4 py-3">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>

                {/* Citations */}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">
                      📚 Nguồn tham khảo:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {message.citations.map((citation, i) => (
                        <CitationBadge key={i} citation={citation} index={i + 1} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {message.processingTime && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>⚡ {message.processingTime}ms</span>
                    {message.usedChunks && message.usedChunks > 0 && (
                      <>
                        <span>•</span>
                        <span>📄 {message.usedChunks} chunks</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* User Message */}
            {message.role === 'user' && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            )}
          </div>

          {/* Quiz Recommendations - Separate Block */}
          {message.role === 'assistant' && message.quizRecommendations && message.quizRecommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-[85%] mt-3"
            >
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-bold text-purple-900 dark:text-purple-100">
                    🎯 Quiz gợi ý cho bạn
                  </h4>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
                  Click vào quiz để bắt đầu làm bài ngay! 👇
                </p>
                <div className="space-y-3">
                  {message.quizRecommendations.map((quiz, i) => (
                    <QuizRecommendationCard 
                      key={quiz.quizId} 
                      quiz={quiz} 
                      index={i} 
                      onNavigate={onQuizClick}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {message.role === 'user' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.05 + 0.1, type: 'spring' }}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center flex-shrink-0 shadow-lg"
            >
              <User className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </motion.div>
      ))}
    </>
  );
}
