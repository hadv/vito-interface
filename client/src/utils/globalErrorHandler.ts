import { ErrorHandler } from './errorHandling';

/**
 * Global error handler that intercepts WalletConnect errors and prevents
 * the ugly full-screen error overlay from showing
 */
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private originalConsoleError: typeof console.error;
  private originalWindowError: typeof window.onerror;
  private originalUnhandledRejection: typeof window.onunhandledrejection;
  private toastMethods?: {
    warning: (title: string, options?: any) => string;
    error: (title: string, options?: any) => string;
  };

  private constructor() {
    this.originalConsoleError = console.error;
    this.originalWindowError = window.onerror;
    this.originalUnhandledRejection = window.onunhandledrejection;
  }

  public static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * Set the toast methods to show nice error messages
   */
  public setToastMethods(toastMethods: { warning: (title: string, options?: any) => string; error: (title: string, options?: any) => string }): void {
    this.toastMethods = toastMethods;
  }

  /**
   * Check if an error is a WalletConnect "No matching key" error
   */
  private isWalletConnectError(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('no matching key') ||
           lowerMessage.includes('session or pairing topic doesn\'t exist') ||
           lowerMessage.includes('isvalidsessionorpairingtopic') ||
           lowerMessage.includes('isvaliddisconnect') ||
           lowerMessage.includes('onsessiondeleterequest') ||
           lowerMessage.includes('deletesession');
  }

  /**
   * Show a nice toast message for WalletConnect errors
   */
  private showWalletConnectErrorToast(): void {
    if (this.toastMethods) {
      this.toastMethods.warning('WalletConnect sync issue - functionality not affected', {
        message: 'This is a harmless internal issue that does not affect functionality',
        duration: 3000
      });
    }
  }

  /**
   * Initialize global error handling
   */
  public initialize(): void {
    // Handle console.error calls
    console.error = (...args: any[]) => {
      const errorMessage = args.join(' ');
      
      if (this.isWalletConnectError(errorMessage)) {
        // Log as debug instead of error for WalletConnect issues
        console.debug('[WalletConnect Internal Error]', ...args);
        this.showWalletConnectErrorToast();
        return;
      }
      
      // Call original console.error for other errors
      this.originalConsoleError.call(console, ...args);
    };

    // Handle uncaught JavaScript errors
    window.onerror = (message, source, lineno, colno, error) => {
      const errorMessage = typeof message === 'string' ? message : message?.toString() || '';
      
      if (this.isWalletConnectError(errorMessage)) {
        console.debug('[WalletConnect Uncaught Error]', { message, source, lineno, colno, error });
        this.showWalletConnectErrorToast();
        return true; // Prevent default error handling (no red overlay)
      }
      
      // For other errors, use the existing error handler
      if (error && this.toastMethods) {
        const errorDetails = ErrorHandler.classifyError(error);
        this.toastMethods.error(errorDetails.userMessage);
      }
      
      // Call original handler for other errors
      if (this.originalWindowError) {
        return this.originalWindowError.call(window, message, source, lineno, colno, error);
      }
      return false;
    };

    // Handle unhandled promise rejections
    window.onunhandledrejection = (event) => {
      const errorMessage = event.reason?.message || event.reason?.toString() || '';
      
      if (this.isWalletConnectError(errorMessage)) {
        console.debug('[WalletConnect Unhandled Rejection]', event.reason);
        this.showWalletConnectErrorToast();
        event.preventDefault(); // Prevent default error handling (no red overlay)
        return;
      }
      
      // For other promise rejections, use the existing error handler
      if (event.reason && this.toastMethods) {
        const errorDetails = ErrorHandler.classifyError(event.reason);
        this.toastMethods.error(errorDetails.userMessage);
      }
      
      // Call original handler for other rejections
      if (this.originalUnhandledRejection) {
        return this.originalUnhandledRejection.call(window, event);
      }
    };

    console.log('🛡️ Global error handler initialized - WalletConnect errors will show as toast messages');
  }

  /**
   * Restore original error handlers (for cleanup)
   */
  public cleanup(): void {
    console.error = this.originalConsoleError;
    window.onerror = this.originalWindowError;
    window.onunhandledrejection = this.originalUnhandledRejection;
  }
}

// Export singleton instance
export const globalErrorHandler = GlobalErrorHandler.getInstance();
