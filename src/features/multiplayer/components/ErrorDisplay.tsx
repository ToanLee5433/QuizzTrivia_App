import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, X, RefreshCw } from 'lucide-react';

interface ErrorDisplayProps {
  error?: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  type?: 'error' | 'warning' | 'info';
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  onRetry,
  type = 'error'
}) => {
  const { t } = useTranslation();

  if (!error) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-500',
          button: 'bg-red-100 hover:bg-red-200 text-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: 'text-yellow-500',
          button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-500',
          button: 'bg-blue-100 hover:bg-blue-200 text-blue-700'
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4 mb-4 animate-slideDown`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 ${config.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`${config.text} font-medium`}>{error}</p>
          {(onRetry || onDismiss) && (
            <div className="flex items-center gap-2 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${config.button}`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t('common.retry')}
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${config.button}`}
                >
                  <X className="w-3.5 h-3.5" />
                  {t('common.dismiss')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
