import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  User, 
  Play, 
  Settings, 
  Wifi, 
  WifiOff, 
  AlertCircle,
  Crown,
  Trophy,
  Clock,
  Star,
  MessageSquare
} from 'lucide-react';

interface GameModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSinglePlayer: () => void;
  onSelectMultiplayer: (mode: 'create' | 'join') => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  isOpen,
  onClose,
  onSelectSinglePlayer,
  onSelectMultiplayer,
  connectionStatus
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const renderConnectionStatus = () => {
    const statusConfig = {
      disconnected: { icon: WifiOff, color: 'text-red-500', bg: 'bg-red-500/10', text: t('multiplayer.errors.connectionLost') },
      connecting: { icon: Wifi, color: 'text-yellow-500', bg: 'bg-yellow-500/10', text: t('multiplayer.errors.reconnecting') },
      connected: { icon: Wifi, color: 'text-green-500', bg: 'bg-green-500/10', text: t('multiplayer.success.connectionRestored') },
      error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', text: t('multiplayer.errors.connectionFailed') }
    };

    const config = statusConfig[connectionStatus];
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 ${config.color} ${config.bg} px-3 py-2 rounded-lg text-sm`}>
        <Icon size={16} />
        <span>{config.text}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">{t('multiplayer.title')}</h1>
              <p className="text-purple-100 text-sm sm:text-base">{t('multiplayer.subtitle')}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="p-3 sm:p-4 border-b border-gray-200">
          {renderConnectionStatus()}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Single Player Mode */}
            <div className="group cursor-pointer" onClick={onSelectSinglePlayer}>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 border-2 border-gray-200 hover:border-blue-300 rounded-xl p-4 sm:p-6 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs sm:text-sm text-gray-500">{t('common.recommended')}</div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{t('gameMode.singlePlayer')}</h3>
                <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">{t('gameMode.singlePlayerDesc')}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{t('gameMode.noPressure')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{t('gameMode.trackProgress')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{t('gameMode.customizable')}</span>
                  </div>
                </div>
                
                <div className="mt-4 sm:mt-6">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base">
                    {t('gameMode.startSolo')}
                  </button>
                </div>
              </div>
            </div>

            {/* Multiplayer Mode */}
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">{t('gameMode.multiplayer')}</h3>
                <p className="text-gray-600 text-sm sm:text-base">{t('gameMode.multiplayerDesc')}</p>
              </div>

              {/* Create Room */}
              <div 
                className={`group cursor-pointer ${connectionStatus === 'connected' ? '' : 'opacity-50 cursor-not-allowed'}`}
                onClick={() => connectionStatus === 'connected' && onSelectMultiplayer('create')}
              >
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 hover:from-green-100 hover:to-emerald-200 border-2 border-green-200 hover:border-green-400 rounded-xl p-4 sm:p-5 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg">
                  <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-gray-800">{t('gameMode.createRoom')}</h4>
                      <p className="text-xs sm:text-sm text-gray-600">{t('gameMode.createRoomDesc')}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{t('gameMode.becomeHost')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{t('gameMode.invitePlayers')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{t('gameMode.customizeSettings')}</span>
                    </div>
                  </div>
                  
                  <button 
                    className={`w-full font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base ${
                      connectionStatus === 'connected' 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                    disabled={connectionStatus !== 'connected'}
                  >
                    {connectionStatus === 'connected' ? t('gameMode.createRoom') : t('common.connecting')}
                  </button>
                </div>
              </div>

              {/* Join Room */}
              <div 
                className={`group cursor-pointer ${connectionStatus === 'connected' ? '' : 'opacity-50 cursor-not-allowed'}`}
                onClick={() => connectionStatus === 'connected' && onSelectMultiplayer('join')}
              >
                <div className="bg-gradient-to-br from-purple-50 to-indigo-100 hover:from-purple-100 hover:to-indigo-200 border-2 border-purple-200 hover:border-purple-400 rounded-xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">Join Room</h4>
                      <p className="text-sm text-gray-600">Enter a room code or browse public rooms</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Play className="w-4 h-4" />
                      <span>Quick join</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>Find active games</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Trophy className="w-4 h-4" />
                      <span>Compete with others</span>
                    </div>
                  </div>
                  
                  <button 
                    className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors ${
                      connectionStatus === 'connected' 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                    disabled={connectionStatus !== 'connected'}
                  >
                    {connectionStatus === 'connected' ? 'Join Room' : 'Connecting...'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Why Choose Multiplayer?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Real-time Competition</h4>
                <p className="text-sm text-gray-600">Compete with friends and players worldwide in real-time</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Leaderboards</h4>
                <p className="text-sm text-gray-600">Track your ranking and achievements on global leaderboards</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Live Chat</h4>
                <p className="text-sm text-gray-600">Communicate with other players during the game</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameModeSelector;
