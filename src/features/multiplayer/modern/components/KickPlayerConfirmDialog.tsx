import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, User, X } from 'lucide-react';
import { ModernPlayer } from '../services/modernMultiplayerService';

interface KickPlayerConfirmDialogProps {
  isOpen: boolean;
  player: ModernPlayer | null;
  onConfirm: () => void;
  onCancel: () => void;
  isKicking: boolean;
}

const KickPlayerConfirmDialog: React.FC<KickPlayerConfirmDialogProps> = ({
  isOpen,
  player,
  onConfirm,
  onCancel,
  isKicking
}) => {
  if (!player || !isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="bg-gradient-to-br from-red-900/90 to-orange-900/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full relative border border-red-500/20 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-500/20 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Kick Player</h3>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              disabled={isKicking}
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Player Info */}
          <div className="bg-white/5 rounded-2xl p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-semibold">
                {player.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <p className="font-semibold text-white text-lg">{player.name}</p>
                <p className="text-red-200 text-sm">This player will be removed from the room</p>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-200 text-sm font-medium mb-1">Warning</p>
                <p className="text-yellow-300 text-xs">
                  The kicked player will not be able to rejoin this room unless invited again.
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCancel}
              disabled={isKicking}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onConfirm}
              disabled={isKicking}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isKicking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Kicking...</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4" />
                  <span>Kick Player</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default KickPlayerConfirmDialog;
