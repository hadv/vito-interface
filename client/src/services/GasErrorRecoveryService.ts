import { ethers } from 'ethers';

export interface GasError {
  type: 'out_of_gas' | 'gas_estimation_failed' | 'gas_price_too_low' | 'insufficient_funds' | 'unknown';
  originalError: any;
  suggestedFix: string;
  retryable: boolean;
  gasLimit?: number;
  gasPrice?: string;
}

export interface RetryStrategy {
  maxAttempts: number;
  gasMultiplier: number;
  gasPriceMultiplier: number;
  delayMs: number;
}

/**
 * Service to handle gas-related errors and provide recovery strategies
 * Specifically designed for Safe wallet and WalletConnect transactions
 */
export class GasErrorRecoveryService {
  private provider: ethers.providers.Provider;
  private network: string;

  constructor(provider: ethers.providers.Provider, network: string = 'sepolia') {
    this.provider = provider;
    this.network = network;
  }

  /**
   * Analyze a gas-related error and provide recovery strategy
   */
  analyzeGasError(error: any): GasError {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;

    console.log('🔍 Analyzing gas error:', { message: errorMessage, code: errorCode });

    // Out of gas errors
    if (errorMessage.includes('out of gas') || 
        errorMessage.includes('gas required exceeds allowance') ||
        errorCode === 'UNPREDICTABLE_GAS_LIMIT') {
      return {
        type: 'out_of_gas',
        originalError: error,
        suggestedFix: 'Increase gas limit by 50-100%',
        retryable: true,
        gasLimit: this.calculateIncreasedGasLimit(error)
      };
    }

    // Gas estimation failed
    if (errorMessage.includes('cannot estimate gas') ||
        errorMessage.includes('gas estimation failed') ||
        errorMessage.includes('execution reverted')) {
      return {
        type: 'gas_estimation_failed',
        originalError: error,
        suggestedFix: 'Use fallback gas calculation or simulate transaction',
        retryable: true
      };
    }

    // Gas price too low
    if (errorMessage.includes('gas price too low') ||
        errorMessage.includes('replacement transaction underpriced') ||
        errorMessage.includes('transaction underpriced')) {
      return {
        type: 'gas_price_too_low',
        originalError: error,
        suggestedFix: 'Increase gas price by 10-20%',
        retryable: true
      };
    }

    // Insufficient funds
    if (errorMessage.includes('insufficient funds') ||
        errorMessage.includes('insufficient balance')) {
      return {
        type: 'insufficient_funds',
        originalError: error,
        suggestedFix: 'Check account balance or reduce gas limit',
        retryable: false
      };
    }

    // Unknown error
    return {
      type: 'unknown',
      originalError: error,
      suggestedFix: 'Review transaction parameters and try again',
      retryable: false
    };
  }

  /**
   * Get retry strategy based on error type
   */
  getRetryStrategy(gasError: GasError): RetryStrategy {
    switch (gasError.type) {
      case 'out_of_gas':
        return {
          maxAttempts: 3,
          gasMultiplier: 1.5, // Increase gas by 50%
          gasPriceMultiplier: 1.0,
          delayMs: 1000
        };

      case 'gas_estimation_failed':
        return {
          maxAttempts: 2,
          gasMultiplier: 2.0, // Double the gas limit
          gasPriceMultiplier: 1.1,
          delayMs: 2000
        };

      case 'gas_price_too_low':
        return {
          maxAttempts: 3,
          gasMultiplier: 1.0,
          gasPriceMultiplier: 1.2, // Increase gas price by 20%
          delayMs: 1000
        };

      default:
        return {
          maxAttempts: 1,
          gasMultiplier: 1.0,
          gasPriceMultiplier: 1.0,
          delayMs: 0
        };
    }
  }

  /**
   * Execute transaction with automatic retry on gas errors
   */
  async executeWithRetry<T>(
    transactionFunction: (gasLimit?: number, gasPrice?: string) => Promise<T>,
    initialGasLimit?: number,
    initialGasPrice?: string
  ): Promise<T> {
    let lastError: any;
    let currentGasLimit = initialGasLimit;
    let currentGasPrice = initialGasPrice;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔄 Transaction attempt ${attempt}/3`);
        if (currentGasLimit) console.log(`   Gas Limit: ${currentGasLimit}`);
        if (currentGasPrice) console.log(`   Gas Price: ${ethers.utils.formatUnits(currentGasPrice, 'gwei')} gwei`);

        return await transactionFunction(currentGasLimit, currentGasPrice);

      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Transaction attempt ${attempt} failed:`, error.message);

        if (attempt === 3) break; // Don't retry on last attempt

        const gasError = this.analyzeGasError(error);
        if (!gasError.retryable) {
          console.log('❌ Error is not retryable, stopping attempts');
          break;
        }

        const strategy = this.getRetryStrategy(gasError);
        
        // Adjust gas parameters for retry
        if (currentGasLimit) {
          currentGasLimit = Math.floor(currentGasLimit * strategy.gasMultiplier);
        }
        
        if (currentGasPrice) {
          const currentPriceBN = ethers.BigNumber.from(currentGasPrice);
          const newPriceBN = currentPriceBN.mul(Math.floor(strategy.gasPriceMultiplier * 100)).div(100);
          currentGasPrice = newPriceBN.toString();
        }

        console.log(`🔧 Adjusting parameters for retry:`);
        console.log(`   New Gas Limit: ${currentGasLimit}`);
        console.log(`   New Gas Price: ${currentGasPrice ? ethers.utils.formatUnits(currentGasPrice, 'gwei') + ' gwei' : 'unchanged'}`);

        // Wait before retry
        if (strategy.delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, strategy.delayMs));
        }
      }
    }

    // All attempts failed
    const finalError = this.analyzeGasError(lastError);
    throw new Error(`Transaction failed after 3 attempts. ${finalError.suggestedFix}. Original error: ${lastError.message}`);
  }

  /**
   * Calculate increased gas limit based on error
   */
  private calculateIncreasedGasLimit(error: any): number {
    // Try to extract gas limit from error message
    const gasLimitMatch = error.message?.match(/gas limit (\d+)/i);
    if (gasLimitMatch) {
      const originalLimit = parseInt(gasLimitMatch[1]);
      return Math.floor(originalLimit * 1.5); // Increase by 50%
    }

    // Default fallback gas limits based on network
    const networkDefaults = {
      mainnet: 300000,
      sepolia: 250000,
      goerli: 250000,
      arbitrum: 200000
    };

    return networkDefaults[this.network as keyof typeof networkDefaults] || 250000;
  }

  /**
   * Get current network gas price with buffer
   */
  async getOptimalGasPrice(bufferPercent: number = 10): Promise<string> {
    try {
      const feeData = await this.provider.getFeeData();
      
      if (feeData.maxFeePerGas) {
        // EIP-1559 network
        const bufferedFee = feeData.maxFeePerGas.mul(100 + bufferPercent).div(100);
        return bufferedFee.toString();
      } else if (feeData.gasPrice) {
        // Legacy network
        const bufferedPrice = feeData.gasPrice.mul(100 + bufferPercent).div(100);
        return bufferedPrice.toString();
      }
    } catch (error) {
      console.warn('Failed to get gas price, using fallback:', error);
    }

    // Fallback gas price (2 gwei)
    return ethers.utils.parseUnits('2', 'gwei').toString();
  }

  /**
   * Validate transaction parameters before execution
   */
  async validateTransactionGas(
    transaction: ethers.providers.TransactionRequest,
    fromAddress: string
  ): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if account has sufficient balance
      const balance = await this.provider.getBalance(fromAddress);
      const gasLimit = ethers.BigNumber.from(transaction.gasLimit || 21000);
      const gasPrice = ethers.BigNumber.from(transaction.gasPrice || await this.getOptimalGasPrice());
      const gasCost = gasLimit.mul(gasPrice);
      const totalCost = gasCost.add(transaction.value || 0);

      if (balance.lt(totalCost)) {
        issues.push(`Insufficient balance: need ${ethers.utils.formatEther(totalCost)} ETH, have ${ethers.utils.formatEther(balance)} ETH`);
      }

      // Check if gas limit is reasonable
      if (gasLimit.gt(10000000)) {
        issues.push(`Gas limit too high: ${gasLimit.toString()}`);
      }

      if (gasLimit.lt(21000)) {
        issues.push(`Gas limit too low: ${gasLimit.toString()}`);
      }

      // Try to simulate the transaction
      try {
        await this.provider.call({
          to: transaction.to,
          value: transaction.value,
          data: transaction.data,
          from: fromAddress
        });
      } catch (callError: any) {
        issues.push(`Transaction simulation failed: ${callError.message}`);
      }

    } catch (error: any) {
      issues.push(`Validation error: ${error.message}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// Create singleton instance
export const gasErrorRecoveryService = new GasErrorRecoveryService(
  new ethers.providers.JsonRpcProvider(), // Will be replaced with actual provider
  'sepolia'
);
