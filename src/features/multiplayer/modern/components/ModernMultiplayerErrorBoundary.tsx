import React, { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ModernMultiplayerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Multiplayer Error Boundary caught:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
    
    // Log to analytics service (Firebase Analytics, Sentry, etc.)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        component: errorInfo.componentStack
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Reload page to reset state
    window.location.href = '/multiplayer';
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

// Error Fallback Component
const ErrorFallback: React.FC<{ error: Error | null; onReset: () => void }> = ({ error, onReset }) => {
  const { t } = useTranslation('multiplayer');
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full border border-white/20 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Error Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center"
          >
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </motion.div>

          {/* Error Title */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {t('errors.title', 'Oops! Something went wrong')}
            </h1>
            <p className="text-white/70">
              {t('errors.subtitle', 'An unexpected error occurred in the multiplayer game')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-black/30 rounded-xl p-4 text-left"
            >
              <p className="text-red-300 text-sm font-mono break-all">
                {error.message}
              </p>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onReset}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              <span>{t('errors.tryAgain', 'Try Again')}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGoHome}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center space-x-2 border border-white/20 transition-all"
            >
              <Home className="w-5 h-5" />
              <span>{t('errors.goHome', 'Go Home')}</span>
            </motion.button>
          </div>

          {/* Help Text */}
          <p className="text-white/50 text-sm">
            {t('errors.helpText', 'If the problem persists, please try refreshing the page or contact support.')}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ModernMultiplayerErrorBoundary;
