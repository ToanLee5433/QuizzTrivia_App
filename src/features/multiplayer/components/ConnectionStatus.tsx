import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  isReconnecting?: boolean;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  isReconnecting = false,
  className = ''
}) => {
  const { t } = useTranslation();

  const getStatusConfig = () => {
    if (isReconnecting) {
      return {
        icon: Loader2,
        color: 'text-yellow-500',
        bg: 'bg-yellow-500/10',
        text: t('multiplayer.errors.reconnecting'),
        animate: 'animate-spin'
      };
    }

    switch (status) {
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bg: 'bg-red-500/10',
          text: t('multiplayer.errors.connectionLost'),
          animate: ''
        };
      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-yellow-500',
          bg: 'bg-yellow-500/10',
          text: t('multiplayer.connecting'),
          animate: 'animate-spin'
        };
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bg: 'bg-green-500/10',
          text: t('multiplayer.success.connectionRestored'),
          animate: ''
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bg: 'bg-red-500/10',
          text: t('multiplayer.errors.connectionFailed'),
          animate: ''
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-500',
          bg: 'bg-gray-500/10',
          text: 'Unknown',
          animate: ''
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 ${config.color} ${config.bg} px-3 py-2 rounded-lg text-sm ${className}`}>
      <Icon size={16} className={config.animate} />
      <span className="font-medium">{config.text}</span>
    </div>
  );
};

export default ConnectionStatus;
