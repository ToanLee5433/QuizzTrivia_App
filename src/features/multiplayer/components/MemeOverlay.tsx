/**
 * 🎉 Meme Overlay Component
 * 
 * Hiển thị meme GIF tùy theo tình huống:
 * - thinking-meme.gif: Khi đang suy nghĩ (chưa trả lời, thời gian > 5s)
 * - success-meme.gif: Khi trả lời đúng
 * - fail-meme.gif: Khi trả lời sai
 * - winner-meme.gif: Khi thắng (top 1)
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type MemeType = 'thinking' | 'success' | 'fail' | 'winner';

interface MemeOverlayProps {
  type: MemeType;
  show: boolean;
  position?: 'top-right' | 'center' | 'top-left';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const memeConfig: Record<MemeType, { src: string; alt: string }> = {
  thinking: {
    src: '/images/memes/thinking-meme.gif',
    alt: 'Thinking...'
  },
  success: {
    src: '/images/memes/success-meme.gif',
    alt: 'Success!'
  },
  fail: {
    src: '/images/memes/fail-meme.gif',
    alt: 'Oh no!'
  },
  winner: {
    src: '/images/memes/winner-meme.gif',
    alt: 'Winner!'
  }
};

const sizeClasses = {
  small: 'w-16 h-16',
  medium: 'w-24 h-24',
  large: 'w-48 h-48'
};

const positionClasses = {
  'top-right': 'absolute top-4 right-4 z-10',
  'top-left': 'absolute top-4 left-4 z-10',
  'center': 'mx-auto'
};

export const MemeOverlay: React.FC<MemeOverlayProps> = ({
  type,
  show,
  position = 'top-right',
  size = 'medium',
  className = ''
}) => {
  const meme = memeConfig[type];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className={`${positionClasses[position]} ${className}`}
        >
          <img 
            src={meme.src}
            alt={meme.alt}
            className={`${sizeClasses[size]} rounded-2xl shadow-2xl border-4 border-white/20 object-cover`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MemeOverlay;
