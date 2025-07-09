// Error handling utilities - ethers import removed as it's not used in this file

export interface ErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  category: 'network' | 'wallet' | 'transaction' | 'validation' | 'system';
}

/**
 * Comprehensive error classification and handling utilities
 */
export class ErrorHandler {
  /**
   * Classify and enhance error with additional context
   */
  static classifyError(error: any): ErrorDetails {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || 'UNKNOWN_ERROR';

    // User rejection errors
    if (errorMessage.includes('user rejected') || 
        errorMessage.includes('user denied') ||
        errorCode === 'ACTION_REJECTED') {
      return {
        code: 'USER_REJECTED',
        message: error.message,
        userMessage: 'Transaction was cancelled by user',
        severity: 'low',
        recoverable: true,
        category: 'wallet'
      };
    }

    // Insufficient funds
    if (errorMessage.includes('insufficient funds') ||
        errorMessage.includes('insufficient balance')) {
      return {
        code: 'INSUFFICIENT_FUNDS',
        message: error.message,
        userMessage: 'Insufficient funds to complete transaction',
        severity: 'medium',
        recoverable: false,
        category: 'wallet'
      };
    }

    // Gas estimation errors
    if (errorMessage.includes('gas') && 
        (errorMessage.includes('estimate') || errorMessage.includes('limit'))) {
      return {
        code: 'GAS_ESTIMATION_FAILED',
        message: error.message,
        userMessage: 'Unable to estimate gas fees. Transaction may fail.',
        severity: 'medium',
        recoverable: true,
        category: 'transaction'
      };
    }

    // Gas price too low
    if (errorMessage.includes('gas too low') ||
        errorMessage.includes('underpriced') ||
        errorMessage.includes('replacement transaction underpriced')) {
      return {
        code: 'GAS_PRICE_TOO_LOW',
        message: error.message,
        userMessage: 'Gas price too low. Try increasing gas price.',
        severity: 'medium',
        recoverable: true,
        category: 'transaction'
      };
    }

    // Nonce errors
    if (errorMessage.includes('nonce') && errorMessage.includes('too low')) {
      return {
        code: 'NONCE_TOO_LOW',
        message: error.message,
        userMessage: 'Transaction nonce error. Please refresh and try again.',
        severity: 'medium',
        recoverable: true,
        category: 'transaction'
      };
    }

    // Network connectivity errors
    if (errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorCode === 'NETWORK_ERROR') {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        userMessage: 'Network connection error. Please check your internet connection.',
        severity: 'high',
        recoverable: true,
        category: 'network'
      };
    }

    // RPC errors
    if (errorMessage.includes('rpc') || errorMessage.includes('provider')) {
      return {
        code: 'RPC_ERROR',
        message: error.message,
        userMessage: 'Blockchain network is temporarily unavailable. Please try again.',
        severity: 'high',
        recoverable: true,
        category: 'network'
      };
    }

    // WalletConnect errors
    if (errorMessage.includes('walletconnect') ||
        errorMessage.includes('pair') ||
        errorMessage.includes('no matching') ||
        errorMessage.includes('session')) {
      return {
        code: 'WALLETCONNECT_ERROR',
        message: error.message,
        userMessage: 'WalletConnect session error. Please try reconnecting your wallet.',
        severity: 'medium',
        recoverable: true,
        category: 'wallet'
      };
    }

    // Wallet connection errors
    if (errorMessage.includes('wallet') && 
        (errorMessage.includes('connect') || errorMessage.includes('not found'))) {
      return {
        code: 'WALLET_CONNECTION_ERROR',
        message: error.message,
        userMessage: 'Wallet connection error. Please reconnect your wallet.',
        severity: 'high',
        recoverable: true,
        category: 'wallet'
      };
    }

    // Contract interaction errors
    if (errorMessage.includes('contract') || errorMessage.includes('revert')) {
      return {
        code: 'CONTRACT_ERROR',
        message: error.message,
        userMessage: 'Smart contract interaction failed. Please try again.',
        severity: 'medium',
        recoverable: true,
        category: 'transaction'
      };
    }

    // Validation errors
    if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.message,
        userMessage: 'Invalid input data. Please check your inputs.',
        severity: 'low',
        recoverable: false,
        category: 'validation'
      };
    }

    // Rate limiting
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return {
        code: 'RATE_LIMITED',
        message: error.message,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        severity: 'medium',
        recoverable: true,
        category: 'network'
      };
    }

    // Default unknown error
    return {
      code: errorCode,
      message: error.message || 'Unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again.',
      severity: 'medium',
      recoverable: true,
      category: 'system'
    };
  }

  /**
   * Get recovery suggestions based on error type
   */
  static getRecoverySuggestions(errorDetails: ErrorDetails): string[] {
    const suggestions: string[] = [];

    switch (errorDetails.code) {
      case 'USER_REJECTED':
        suggestions.push('Try the transaction again when ready');
        break;

      case 'INSUFFICIENT_FUNDS':
        suggestions.push('Add more funds to your wallet');
        suggestions.push('Reduce the transaction amount');
        break;

      case 'GAS_ESTIMATION_FAILED':
      case 'GAS_PRICE_TOO_LOW':
        suggestions.push('Try increasing the gas price');
        suggestions.push('Wait for network congestion to reduce');
        break;

      case 'NONCE_TOO_LOW':
        suggestions.push('Refresh the page and try again');
        suggestions.push('Wait for pending transactions to complete');
        break;

      case 'NETWORK_ERROR':
      case 'RPC_ERROR':
        suggestions.push('Check your internet connection');
        suggestions.push('Try switching to a different network');
        suggestions.push('Wait a few minutes and try again');
        break;

      case 'WALLET_CONNECTION_ERROR':
        suggestions.push('Reconnect your wallet');
        suggestions.push('Refresh the page');
        suggestions.push('Try using a different wallet');
        break;

      case 'CONTRACT_ERROR':
        suggestions.push('Check transaction parameters');
        suggestions.push('Ensure contract is deployed on current network');
        break;

      case 'VALIDATION_ERROR':
        suggestions.push('Check all input fields');
        suggestions.push('Ensure addresses are valid');
        suggestions.push('Verify amounts are correct');
        break;

      case 'RATE_LIMITED':
        suggestions.push('Wait a few minutes before trying again');
        suggestions.push('Reduce the frequency of requests');
        break;

      default:
        suggestions.push('Try again in a few minutes');
        suggestions.push('Refresh the page');
        suggestions.push('Contact support if the problem persists');
    }

    return suggestions;
  }

  /**
   * Check if error should trigger automatic retry
   */
  static shouldAutoRetry(errorDetails: ErrorDetails): boolean {
    const autoRetryableCodes = [
      'NETWORK_ERROR',
      'RPC_ERROR',
      'RATE_LIMITED',
      'GAS_PRICE_TOO_LOW'
    ];

    return errorDetails.recoverable && 
           autoRetryableCodes.includes(errorDetails.code) &&
           errorDetails.severity !== 'critical';
  }

  /**
   * Get appropriate retry delay based on error type
   */
  static getRetryDelay(errorDetails: ErrorDetails, attemptNumber: number): number {
    const baseDelays = {
      'NETWORK_ERROR': 2000,
      'RPC_ERROR': 3000,
      'RATE_LIMITED': 5000,
      'GAS_PRICE_TOO_LOW': 1000
    };

    const baseDelay = baseDelays[errorDetails.code as keyof typeof baseDelays] || 2000;
    
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Format error for logging
   */
  static formatErrorForLogging(error: any, context?: string): string {
    const errorDetails = this.classifyError(error);
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      context: context || 'unknown',
      code: errorDetails.code,
      category: errorDetails.category,
      severity: errorDetails.severity,
      message: errorDetails.message,
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href
    }, null, 2);
  }

  /**
   * Check if error is critical and requires immediate attention
   */
  static isCriticalError(errorDetails: ErrorDetails): boolean {
    return errorDetails.severity === 'critical' || 
           (errorDetails.category === 'system' && !errorDetails.recoverable);
  }
}

/**
 * Utility function to safely execute async operations with error handling
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  fallback?: T,
  onError?: (error: ErrorDetails) => void
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const errorDetails = ErrorHandler.classifyError(error);

    console.error('Safe async operation failed:', ErrorHandler.formatErrorForLogging(error));

    if (onError) {
      onError(errorDetails);
    }

    return fallback;
  }
}

/**
 * Utility function to safely execute WalletConnect operations with enhanced error handling
 */
export async function safeWalletConnectOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const errorDetails = ErrorHandler.classifyError(error);

    console.warn(`WalletConnect operation '${operationName}' failed:`, errorDetails.message);

    // For WalletConnect errors, log but don't throw to prevent uncaught errors
    if (errorDetails.code === 'WALLETCONNECT_ERROR') {
      console.warn('WalletConnect error handled gracefully:', errorDetails.userMessage);
      return fallback;
    }

    // For other errors, re-throw
    throw error;
  }
}

/**
 * Debounced error handler to prevent spam
 */
export class DebouncedErrorHandler {
  private errorCounts = new Map<string, number>();
  private lastErrorTime = new Map<string, number>();
  private readonly debounceMs: number;

  constructor(debounceMs = 5000) {
    this.debounceMs = debounceMs;
  }

  shouldHandle(errorCode: string): boolean {
    const now = Date.now();
    const lastTime = this.lastErrorTime.get(errorCode) || 0;
    const count = this.errorCounts.get(errorCode) || 0;

    if (now - lastTime > this.debounceMs) {
      // Reset counter if enough time has passed
      this.errorCounts.set(errorCode, 1);
      this.lastErrorTime.set(errorCode, now);
      return true;
    } else if (count < 3) {
      // Allow up to 3 errors within the debounce period
      this.errorCounts.set(errorCode, count + 1);
      return true;
    }

    return false;
  }
}
