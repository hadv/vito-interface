import { useState, useCallback } from 'react';
import { ToastType, ToastProps } from '../components/ui/Toast';

interface ToastOptions {
  type?: ToastType;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface Toast extends Omit<ToastProps, 'onClose'> {
  id: string;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((title: string, options: ToastOptions = {}) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const toast: Toast = {
      id,
      title,
      type: options.type || 'info',
      message: options.message,
      duration: options.duration ?? 5000,
      action: options.action
    };

    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods for different toast types
  const success = useCallback((title: string, options: Omit<ToastOptions, 'type'> = {}) => {
    return addToast(title, { ...options, type: 'success' });
  }, [addToast]);

  const error = useCallback((title: string, options: Omit<ToastOptions, 'type'> = {}) => {
    return addToast(title, { ...options, type: 'error', duration: options.duration ?? 8000 });
  }, [addToast]);

  const warning = useCallback((title: string, options: Omit<ToastOptions, 'type'> = {}) => {
    return addToast(title, { ...options, type: 'warning' });
  }, [addToast]);

  const info = useCallback((title: string, options: Omit<ToastOptions, 'type'> = {}) => {
    return addToast(title, { ...options, type: 'info' });
  }, [addToast]);

  // Transaction-specific toast methods
  const transactionPending = useCallback((txHash: string) => {
    return addToast('Transaction Submitted', {
      type: 'info',
      message: `Transaction ${txHash.slice(0, 10)}... is being processed`,
      duration: 0, // Don't auto-dismiss
      action: {
        label: 'View Details',
        onClick: () => {
          // Could open transaction details modal or navigate to explorer
          console.log('View transaction details:', txHash);
        }
      }
    });
  }, [addToast]);

  const transactionSuccess = useCallback((txHash: string, message?: string) => {
    return addToast('Transaction Successful', {
      type: 'success',
      message: message || `Transaction ${txHash.slice(0, 10)}... completed successfully`,
      duration: 6000,
      action: {
        label: 'View on Explorer',
        onClick: () => {
          // Open block explorer
          const network = 'ethereum'; // This should come from context
          const explorerUrl = network === 'ethereum' 
            ? `https://etherscan.io/tx/${txHash}`
            : `https://sepolia.etherscan.io/tx/${txHash}`;
          window.open(explorerUrl, '_blank');
        }
      }
    });
  }, [addToast]);

  const transactionError = useCallback((error: string, details?: string) => {
    return addToast('Transaction Failed', {
      type: 'error',
      message: details || error,
      duration: 10000,
      action: {
        label: 'Retry',
        onClick: () => {
          // This would trigger a retry mechanism
          console.log('Retry transaction');
        }
      }
    });
  }, [addToast]);

  const networkError = useCallback((network: string, action?: () => void) => {
    return addToast('Network Connection Error', {
      type: 'error',
      message: `Failed to connect to ${network}. Please check your internet connection.`,
      duration: 8000,
      action: action ? {
        label: 'Retry',
        onClick: action
      } : undefined
    });
  }, [addToast]);

  const walletError = useCallback((message: string, action?: () => void) => {
    return addToast('Wallet Error', {
      type: 'error',
      message,
      duration: 8000,
      action: action ? {
        label: 'Reconnect',
        onClick: action
      } : undefined
    });
  }, [addToast]);

  const gasEstimationError = useCallback((action?: () => void) => {
    return addToast('Gas Estimation Failed', {
      type: 'warning',
      message: 'Unable to estimate gas fees. Transaction may fail or cost more than expected.',
      duration: 8000,
      action: action ? {
        label: 'Try Again',
        onClick: action
      } : undefined
    });
  }, [addToast]);

  const safeTxPoolError = useCallback((network: string) => {
    return addToast('Safe TX Pool Not Available', {
      type: 'warning',
      message: `Safe TX Pool contract is not configured for ${network}. Some features may be limited.`,
      duration: 8000,
      action: {
        label: 'Learn More',
        onClick: () => {
          // Could open documentation or settings
          console.log('Open Safe TX Pool documentation');
        }
      }
    });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    // Convenience methods
    success,
    error,
    warning,
    info,
    // Transaction-specific methods
    transactionPending,
    transactionSuccess,
    transactionError,
    networkError,
    walletError,
    gasEstimationError,
    safeTxPoolError
  };
};
