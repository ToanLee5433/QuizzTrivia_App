import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Crown, User, CheckCircle, Circle } from 'lucide-react';
import { ModernPlayer } from '../services/modernMultiplayerService';

interface MemoizedPlayerCardProps {
  player: ModernPlayer;
  isHost: boolean;
  currentUserId: string;
  hostId: string;
  onKickPlayer?: (player: ModernPlayer) => void;
  onTransferHost?: (player: ModernPlayer) => void;
  onToggleReady?: () => void;
}

const MemoizedPlayerCard: React.FC<MemoizedPlayerCardProps> = memo(({
  player,
  isHost,
  currentUserId,
  hostId,
  onKickPlayer,
  onTransferHost,
  onToggleReady
}) => {
  const isCurrentPlayer = player.id === currentUserId;
  const isPlayerHost = player.id === hostId;
  const canKick = isHost && !isCurrentPlayer && !isPlayerHost;
  const canTransferHost = isHost && !isCurrentPlayer && !isPlayerHost;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
        isCurrentPlayer 
          ? 'bg-blue-500/20 border border-blue-400/30' 
          : 'bg-white/5 border border-white/10'
      } ${player.isReady ? 'ring-2 ring-green-400/30' : ''}`}
    >
      <div className="flex items-center space-x-3">
        {/* Player Avatar */}
        <div className="relative">
          {player.photoURL ? (
            <img 
              src={player.photoURL} 
              alt={player.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-semibold">
              {player.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          )}
          
          {/* Host Crown */}
          {player.id === hostId && (
            <div className="absolute -top-1 -right-1">
              <Crown className="w-4 h-4 text-yellow-400" />
            </div>
          )}
        </div>

        {/* Player Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-white">
              {player.name}
              {isCurrentPlayer && <span className="text-blue-400 ml-1">(You)</span>}
            </span>
            {player.isReady ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <Circle className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <div className="text-sm text-gray-300">
            Score: {player.score || 0}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Ready Button (Current Player only, not host) */}
        {isCurrentPlayer && !isPlayerHost && onToggleReady && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleReady}
            className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
              player.isReady 
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                : 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
            }`}
            title={player.isReady ? 'Mark as not ready' : 'Mark as ready'}
          >
            {player.isReady ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
          </motion.button>
        )}
        
        {/* Transfer Host Button (Host only) */}
        {canTransferHost && onTransferHost && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onTransferHost(player)}
            className="p-2 bg-yellow-500/20 rounded-lg hover:bg-yellow-500/30 transition-colors text-yellow-400"
            title="Transfer host to this player"
          >
            <Crown className="w-4 h-4" />
          </motion.button>
        )}
        
        {/* Kick Button (Host only) */}
        {canKick && onKickPlayer && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onKickPlayer(player)}
            className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors text-red-400"
            title="Kick player"
          >
            <User className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  return (
    prevProps.player.id === nextProps.player.id &&
    prevProps.player.name === nextProps.player.name &&
    prevProps.player.score === nextProps.player.score &&
    prevProps.player.isReady === nextProps.player.isReady &&
    prevProps.player.isOnline === nextProps.player.isOnline &&
    prevProps.isHost === nextProps.isHost &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.hostId === nextProps.hostId
  );
});

MemoizedPlayerCard.displayName = 'MemoizedPlayerCard';

export default MemoizedPlayerCard;
