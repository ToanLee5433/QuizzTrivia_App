/**
 * 🎯 Floating Chatbot Button
 * 
 * Floating action button to open the AI chatbot
 * Positioned in bottom-right corner
 * Only visible for authenticated users
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { ChatbotModal } from './ChatbotModal';
import { useSelector } from 'react-redux';
import { RootState } from '../../lib/store';
import { useTranslation } from 'react-i18next';

export function ChatbotButton() {
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Floating Button - Positioned at bottom-left of scroll button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-6 right-24 z-40 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all flex items-center justify-center group"
        aria-label="Open AI Chatbot"
        style={{ 
          position: 'fixed',
          bottom: '24px',
          right: '96px', // 24px (right) + 56px (scroll button width) + 16px (gap) = 96px
        }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <MessageCircle className="w-6 h-6 text-white" />
          )}
        </motion.div>

        {/* Sparkle effect on hover */}
        {isHovered && !isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </motion.div>
        )}

        {/* Pulse animation */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-purple-600 animate-ping opacity-20" />
        )}
      </motion.button>

      {/* Tooltip */}
      {isHovered && !isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed bottom-6 z-40 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '168px', // 96px (button right) + 56px (button width) + 16px (gap)
          }}
        >
          {t('chatbot.askAssistant')}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-45 w-2 h-2 bg-gray-900" />
        </motion.div>
      )}

      {/* Chatbot Modal */}
      <ChatbotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
