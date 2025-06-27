/**
 * Production-ready wallet error handling utilities
 */

export enum WalletErrorCode {
  // Connection errors
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  WALLET_NOT_INSTALLED = 'WALLET_NOT_INSTALLED',
  CONNECTION_REJECTED = 'CONNECTION_REJECTED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  
  // Network errors
  UNSUPPORTED_CHAIN = 'UNSUPPORTED_CHAIN',
  CHAIN_SWITCH_FAILED = 'CHAIN_SWITCH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Transaction errors
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  
  // WalletConnect specific
  WALLETCONNECT_MODAL_CLOSED = 'WALLETCONNECT_MODAL_CLOSED',
  WALLETCONNECT_SESSION_EXPIRED = 'WALLETCONNECT_SESSION_EXPIRED',
  WALLETCONNECT_CONNECTION_FAILED = 'WALLETCONNECT_CONNECTION_FAILED',
  
  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
}

export interface WalletError {
  code: WalletErrorCode
  message: string
  userMessage: string
  retryable: boolean
  action?: {
    label: string
    handler: () => void
  }
}

export class WalletErrorHandler {
  /**
   * Parse and classify wallet errors
   */
  static parseError(error: any): WalletError {
    // Handle known error codes
    if (error?.code) {
      switch (error.code) {
        case 4001:
          return {
            code: WalletErrorCode.CONNECTION_REJECTED,
            message: error.message || 'User rejected the request',
            userMessage: 'Connection was cancelled. Please try again and approve the connection.',
            retryable: true
          }
        
        case -32002:
          return {
            code: WalletErrorCode.CONNECTION_TIMEOUT,
            message: error.message || 'Request already pending',
            userMessage: 'A connection request is already pending. Please check your wallet.',
            retryable: true
          }
        
        case 4902:
          return {
            code: WalletErrorCode.UNSUPPORTED_CHAIN,
            message: error.message || 'Unrecognized chain ID',
            userMessage: 'This network is not supported. Please switch to a supported network.',
            retryable: false
          }
      }
    }

    // Handle error messages
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    
    if (errorMessage.includes('MetaMask not installed')) {
      return {
        code: WalletErrorCode.WALLET_NOT_INSTALLED,
        message: errorMessage,
        userMessage: 'MetaMask is not installed. Please install MetaMask to continue.',
        retryable: false,
        action: {
          label: 'Install MetaMask',
          handler: () => window.open('https://metamask.io/', '_blank')
        }
      }
    }
    
    if (errorMessage.includes('connector not found') || errorMessage.includes('Connector not found')) {
      return {
        code: WalletErrorCode.WALLET_NOT_FOUND,
        message: errorMessage,
        userMessage: 'Wallet connector not available. Please ensure your wallet is properly installed.',
        retryable: true
      }
    }
    
    if (errorMessage.includes('User closed modal') || errorMessage.includes('Modal closed')) {
      return {
        code: WalletErrorCode.WALLETCONNECT_MODAL_CLOSED,
        message: errorMessage,
        userMessage: 'WalletConnect modal was closed. Please try again.',
        retryable: true
      }
    }
    
    if (errorMessage.includes('session') && errorMessage.includes('expired')) {
      return {
        code: WalletErrorCode.WALLETCONNECT_SESSION_EXPIRED,
        message: errorMessage,
        userMessage: 'WalletConnect session has expired. Please reconnect your wallet.',
        retryable: true
      }
    }
    
    if (errorMessage.includes('insufficient funds')) {
      return {
        code: WalletErrorCode.INSUFFICIENT_FUNDS,
        message: errorMessage,
        userMessage: 'Insufficient funds to complete this transaction.',
        retryable: false
      }
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('RPC')) {
      return {
        code: WalletErrorCode.NETWORK_ERROR,
        message: errorMessage,
        userMessage: 'Network error occurred. Please check your connection and try again.',
        retryable: true
      }
    }

    // Default unknown error
    return {
      code: WalletErrorCode.UNKNOWN_ERROR,
      message: errorMessage,
      userMessage: 'An unexpected error occurred. Please try again.',
      retryable: true
    }
  }

  /**
   * Create retry logic for retryable errors
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        const walletError = this.parseError(error)
        
        // Don't retry non-retryable errors
        if (!walletError.retryable || attempt === maxRetries) {
          throw error
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }
    
    throw lastError
  }

  /**
   * Handle connection timeout
   */
  static withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 30000,
    timeoutMessage: string = 'Operation timed out'
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(timeoutMessage))
        }, timeoutMs)
      })
    ])
  }
}

/**
 * Utility function to safely execute wallet operations
 */
export async function safeWalletOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    timeout?: number
    onError?: (error: WalletError) => void
  } = {}
): Promise<T> {
  const { maxRetries = 2, timeout = 30000, onError } = options
  
  try {
    const operationWithTimeout = WalletErrorHandler.withTimeout(
      operation(),
      timeout,
      'Wallet operation timed out'
    )
    
    return await WalletErrorHandler.withRetry(
      () => operationWithTimeout,
      maxRetries
    )
  } catch (error) {
    const walletError = WalletErrorHandler.parseError(error)
    onError?.(walletError)
    throw walletError
  }
}
