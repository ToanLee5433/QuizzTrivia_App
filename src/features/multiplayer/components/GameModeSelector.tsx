import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Play, 
  Settings, 
  Wifi, 
  WifiOff, 
  AlertCircle,
  Crown,
  Trophy
} from 'lucide-react';

interface GameModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMultiplayer: (mode: 'create' | 'join') => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  isOpen,
  onClose,
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[95vh] flex flex-col">
        {/* Header - Compact */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 p-4 sm:p-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-1 flex items-center gap-2">
                <Users className="w-6 h-6 sm:w-7 sm:h-7" />
                {t('multiplayer.title')}
              </h1>
              <p className="text-purple-100 text-sm">{t('multiplayer.subtitle')}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Connection Status */}
          <div className="mt-3">
            {renderConnectionStatus()}
          </div>
        </div>

        {/* Content - Scrollable if needed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="text-center mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">{t('gameMode.multiplayerOptions')}</h2>
            <p className="text-gray-600 text-sm">{t('gameMode.selectOption')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {/* Create Room */}
            <div 
              className={`group cursor-pointer ${connectionStatus === 'connected' ? '' : 'opacity-50 cursor-not-allowed'}`}
              onClick={() => connectionStatus === 'connected' && onSelectMultiplayer('create')}
            >
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-2 border-green-300 hover:border-green-500 rounded-2xl p-5 transition-all duration-300 transform hover:scale-105 hover:shadow-xl h-full flex flex-col">
                <div className="flex flex-col items-center text-center flex-1">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">{t('gameMode.createRoom')}</h3>
                  <p className="text-gray-600 mb-3 text-sm">{t('gameMode.createRoomDesc')}</p>
                  
                  <div className="space-y-1.5 mb-4 text-left w-full">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Crown className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>{t('gameMode.becomeHost')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>{t('gameMode.invitePlayers')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Settings className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>{t('gameMode.customizeSettings')}</span>
                    </div>
                  </div>
                  
                  <button 
                    className={`w-full font-bold py-3 px-4 rounded-xl transition-all text-base shadow-md mt-auto ${
                      connectionStatus === 'connected' 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-green-500/30' 
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                    disabled={connectionStatus !== 'connected'}
                  >
                    {connectionStatus === 'connected' ? '🏗️ ' + t('gameMode.createRoom') : '⏳ ' + t('common.connecting')}
                  </button>
                </div>
              </div>
            </div>

            {/* Join Room */}
            <div 
              className={`group cursor-pointer ${connectionStatus === 'connected' ? '' : 'opacity-50 cursor-not-allowed'}`}
              onClick={() => connectionStatus === 'connected' && onSelectMultiplayer('join')}
            >
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border-2 border-purple-300 hover:border-purple-500 rounded-2xl p-5 transition-all duration-300 transform hover:scale-105 hover:shadow-xl h-full flex flex-col">
                <div className="flex flex-col items-center text-center flex-1">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">{t('gameMode.joinRoom')}</h3>
                  <p className="text-gray-600 mb-3 text-sm">{t('gameMode.joinRoomDesc')}</p>
                  
                  <div className="space-y-1.5 mb-4 text-left w-full">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Play className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span>{t('gameMode.quickJoin')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span>{t('gameMode.findActiveGames')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Trophy className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span>{t('gameMode.competeWithOthers')}</span>
                    </div>
                  </div>
                  
                  <button 
                    className={`w-full font-bold py-3 px-4 rounded-xl transition-all text-base shadow-md mt-auto ${
                      connectionStatus === 'connected' 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/30' 
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                    disabled={connectionStatus !== 'connected'}
                  >
                    {connectionStatus === 'connected' ? '🚪 ' + t('gameMode.joinRoom') : '⏳ ' + t('gameMode.connecting')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameModeSelector;
