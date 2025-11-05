/**
 * ⏳ Typing Indicator Component
 * 
 * Animated typing indicator while AI is thinking
 */

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 justify-start"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-5 h-5 text-white" />
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <motion.div
              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
            />
            <motion.div
              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
            />
            <motion.div
              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            AI đang suy nghĩ...
          </span>
        </div>
      </div>
    </motion.div>
  );
}
