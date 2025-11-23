import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast provider component
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-hide toast after duration (unless persistent)
    if (!newToast.persistent && newToast.duration) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onHideToast={hideToast} />
    </ToastContext.Provider>
  );
};

// Custom hook for using toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast container component
const ToastContainer: React.FC<{ toasts: Toast[]; onHideToast: (id: string) => void }> = ({ 
  toasts, 
  onHideToast 
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm sm:max-w-md">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onHide={onHideToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Individual toast item component
const ToastItem: React.FC<{ toast: Toast; onHide: (id: string) => void }> = ({ 
  toast, 
  onHide 
}) => {
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-500 to-green-600',
          icon: CheckCircle,
          iconColor: 'text-white',
          borderColor: 'border-green-400'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-red-600',
          icon: XCircle,
          iconColor: 'text-white',
          borderColor: 'border-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
          icon: AlertCircle,
          iconColor: 'text-white',
          borderColor: 'border-yellow-400'
        };
      case 'info':
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
          icon: Info,
          iconColor: 'text-white',
          borderColor: 'border-blue-400'
        };
      default:
        return {
          bg: 'bg-gray-500',
          icon: Info,
          iconColor: 'text-white',
          borderColor: 'border-gray-400'
        };
    }
  };

  const styles = getToastStyles(toast.type);
  const Icon = styles.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      className={`
        ${styles.bg} ${styles.borderColor}
        border-2 shadow-xl rounded-xl p-4 text-white
        backdrop-blur-lg relative overflow-hidden
      `}
    >
      {/* Progress bar for non-persistent toasts */}
      {!toast.persistent && toast.duration && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          className="absolute bottom-0 left-0 h-1 bg-white/30"
        />
      )}

      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${styles.iconColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm sm:text-base leading-tight">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="text-sm text-white/90 mt-1 leading-relaxed">
              {toast.message}
            </p>
          )}
        </div>

        <button
          onClick={() => onHide(toast.id)}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4 text-white/80 hover:text-white" />
        </button>
      </div>
    </motion.div>
  );
};

export default ToastProvider;
