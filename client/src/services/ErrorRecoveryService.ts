import { ethers } from 'ethers';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

export interface TransactionRecoveryOptions extends RetryOptions {
  gasMultiplier?: number;
  maxGasPrice?: string;
}

export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;

  static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  /**
   * Generic retry mechanism with exponential backoff
   */
  async retry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryCondition = this.defaultRetryCondition
    } = options;

    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, error);
        
        // Don't retry if condition is not met or it's the last attempt
        if (!retryCondition(error) || attempt === maxAttempts) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay
        );
        
        console.log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Retry transaction with gas price adjustment
   */
  async retryTransaction(
    transactionFunction: (gasPrice?: string) => Promise<ethers.ContractTransaction>,
    provider: ethers.providers.Provider,
    options: TransactionRecoveryOptions = {}
  ): Promise<ethers.ContractTransaction> {
    const {
      maxAttempts = 3,
      gasMultiplier = 1.2,
      maxGasPrice,
      ...retryOptions
    } = options;

    let currentGasPrice: ethers.BigNumber | undefined;

    return this.retry(async () => {
      try {
        // Get current gas price if not set
        if (!currentGasPrice) {
          currentGasPrice = await provider.getGasPrice();
        }

        // Apply gas multiplier for retry attempts
        const adjustedGasPrice = currentGasPrice.mul(
          Math.floor(gasMultiplier * 100)
        ).div(100);

        // Check if gas price exceeds maximum
        if (maxGasPrice && adjustedGasPrice.gt(ethers.utils.parseUnits(maxGasPrice, 'gwei'))) {
          throw new Error(`Gas price ${ethers.utils.formatUnits(adjustedGasPrice, 'gwei')} gwei exceeds maximum ${maxGasPrice} gwei`);
        }

        return await transactionFunction(adjustedGasPrice.toString());
      } catch (error) {
        // Increase gas price for next attempt
        if (currentGasPrice) {
          currentGasPrice = currentGasPrice.mul(
            Math.floor(gasMultiplier * 100)
          ).div(100);
        }
        throw error;
      }
    }, {
      maxAttempts,
      retryCondition: (error) => this.isTransactionRetryable(error),
      ...retryOptions
    });
  }

  /**
   * Retry network operations (RPC calls, API requests)
   */
  async retryNetworkOperation<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    return this.retry(operation, {
      maxAttempts: 5,
      baseDelay: 2000,
      retryCondition: this.isNetworkRetryable,
      ...options
    });
  }

  /**
   * Handle stuck transactions by attempting replacement
   */
  async handleStuckTransaction(
    originalTx: ethers.ContractTransaction,
    signer: ethers.Signer,
    options: {
      gasMultiplier?: number;
      timeoutMs?: number;
    } = {}
  ): Promise<ethers.ContractTransaction> {
    const { gasMultiplier = 1.5, timeoutMs = 300000 } = options; // 5 minutes default

    // Wait for original transaction with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Transaction timeout')), timeoutMs);
    });

    try {
      // Race between transaction completion and timeout
      return await Promise.race([
        originalTx.wait(),
        timeoutPromise
      ]).then(() => originalTx);
    } catch (error) {
      console.warn('Transaction appears stuck, attempting replacement:', error);

      // Create replacement transaction with higher gas price
      const provider = signer.provider!;
      const currentGasPrice = await provider.getGasPrice();
      const newGasPrice = currentGasPrice.mul(Math.floor(gasMultiplier * 100)).div(100);

      // Create a simple ETH transfer to self to replace the stuck transaction
      const replacementTx = await signer.sendTransaction({
        to: await signer.getAddress(),
        value: '0',
        gasPrice: newGasPrice,
        nonce: originalTx.nonce
      });

      console.log('Replacement transaction sent:', replacementTx.hash);
      return replacementTx;
    }
  }

  /**
   * Default retry condition - retries on network and temporary errors
   */
  private defaultRetryCondition(error: any): boolean {
    return this.isNetworkRetryable(error) || this.isTemporaryError(error);
  }

  /**
   * Check if error is network-related and retryable
   */
  private isNetworkRetryable(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;

    // Network connectivity issues
    if (errorMessage.includes('network') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('fetch')) {
      return true;
    }

    // Specific error codes
    if (errorCode === 'NETWORK_ERROR' || 
        errorCode === 'TIMEOUT' ||
        errorCode === 'SERVER_ERROR') {
      return true;
    }

    // HTTP status codes
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    return false;
  }

  /**
   * Check if transaction error is retryable
   */
  private isTransactionRetryable(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';

    // Gas-related issues that can be resolved with higher gas price
    if (errorMessage.includes('gas too low') ||
        errorMessage.includes('underpriced') ||
        errorMessage.includes('replacement transaction underpriced')) {
      return true;
    }

    // Network congestion
    if (errorMessage.includes('nonce too low') ||
        errorMessage.includes('already known')) {
      return false; // Don't retry these
    }

    // Check for network errors
    return this.isNetworkRetryable(error);
  }

  /**
   * Check if error is temporary and might resolve on retry
   */
  private isTemporaryError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';

    // Rate limiting
    if (errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests')) {
      return true;
    }

    // Service unavailable
    if (errorMessage.includes('service unavailable') ||
        errorMessage.includes('temporarily unavailable')) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyError(error: any): string {
    const errorMessage = error.message?.toLowerCase() || '';

    if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
      return 'Transaction was cancelled by user';
    }

    if (errorMessage.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }

    if (errorMessage.includes('gas')) {
      return 'Transaction failed due to gas estimation error';
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'Network connection error. Please check your internet connection';
    }

    if (errorMessage.includes('nonce')) {
      return 'Transaction nonce error. Please try again';
    }

    if (errorMessage.includes('timeout')) {
      return 'Transaction timed out. Please try again';
    }

    return error.message || 'An unexpected error occurred';
  }
}

// Export singleton instance
export const errorRecoveryService = ErrorRecoveryService.getInstance();
