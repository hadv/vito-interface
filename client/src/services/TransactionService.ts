import { ethers } from 'ethers';
import { safeWalletService, TransactionRequest, SafeTransactionResult, SafeTransactionData } from './SafeWalletService';
import { errorRecoveryService } from './ErrorRecoveryService';
import { ErrorHandler } from '../utils/errorHandling';

export interface SendTransactionParams {
  to: string;
  amount: string;
  token?: string; // Token contract address, undefined for ETH
  data?: string;
}

export interface TransactionError {
  code: string;
  message: string;
  details?: any;
}

export class TransactionService {
  /**
   * Send ETH or ERC20 tokens with enhanced error handling and retry logic
   */
  async sendTransaction(params: SendTransactionParams): Promise<SafeTransactionResult> {
    return errorRecoveryService.retry(async () => {
      let transactionRequest: TransactionRequest;

      if (params.token) {
        // ERC20 token transfer
        transactionRequest = await this.createERC20TransferRequest(
          params.to,
          params.amount,
          params.token
        );
      } else {
        // ETH transfer
        transactionRequest = {
          to: params.to,
          value: ethers.utils.parseEther(params.amount).toString(),
          data: '0x'
        };
      }

      // Create Safe transaction
      const safeTransaction = await safeWalletService.createTransaction(transactionRequest);

      // Get transaction hash
      const safeTxHash = safeWalletService.getTransactionHash(safeTransaction);

      // Sign the transaction
      const signedTransaction = await safeWalletService.signTransaction(safeTransaction);

      // Get Safe info for threshold
      const safeInfo = await safeWalletService.getSafeInfo();

      return {
        safeTxHash,
        transaction: signedTransaction,
        isExecuted: false,
        confirmations: 1, // Current signer's confirmation
        threshold: safeInfo.threshold
      };
    }, {
      maxAttempts: 3,
      retryCondition: (error) => {
        const errorDetails = ErrorHandler.classifyError(error);
        return ErrorHandler.shouldAutoRetry(errorDetails);
      }
    });
  }

  /**
   * Create ERC20 transfer transaction request
   */
  private async createERC20TransferRequest(
    to: string,
    amount: string,
    tokenAddress: string
  ): Promise<TransactionRequest> {
    // ERC20 transfer function signature: transfer(address,uint256)
    const transferInterface = new ethers.utils.Interface([
      'function transfer(address to, uint256 amount) returns (bool)'
    ]);

    // Get token decimals (assuming 18 for now, should be fetched from contract)
    const decimals = 18;
    const parsedAmount = ethers.utils.parseUnits(amount, decimals);

    const data = transferInterface.encodeFunctionData('transfer', [to, parsedAmount]);

    return {
      to: tokenAddress,
      value: '0',
      data
    };
  }

  /**
   * Execute a Safe transaction (when threshold is met)
   */
  async executeTransaction(
    safeTransaction: SafeTransactionData,
    signatures: Array<{ signature: string; signer: string }>
  ): Promise<ethers.ContractTransaction> {
    try {
      return await safeWalletService.executeTransaction(safeTransaction, signatures);
    } catch (error) {
      throw this.handleTransactionError(error);
    }
  }

  /**
   * Get pending transactions
   */
  async getPendingTransactions(): Promise<any[]> {
    try {
      return await safeWalletService.getPendingTransactions();
    } catch (error) {
      throw this.handleTransactionError(error);
    }
  }

  /**
   * Get transaction history from on-chain data
   */
  async getTransactionHistory(): Promise<any[]> {
    try {
      return await safeWalletService.getTransactionHistory();
    } catch (error) {
      throw this.handleTransactionError(error);
    }
  }

  /**
   * Get transaction status from blockchain
   */
  async getTransactionStatus(safeTxHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'executed' | 'failed';
    confirmations: number;
    blockNumber?: number;
    gasUsed?: string;
    gasPrice?: string;
    executionTxHash?: string;
  }> {
    try {
      return await safeWalletService.getTransactionStatus(safeTxHash);
    } catch (error) {
      throw this.handleTransactionError(error);
    }
  }

  /**
   * Check if transaction can be executed (has enough confirmations)
   */
  async canExecuteTransaction(safeTxHash: string): Promise<boolean> {
    try {
      return await safeWalletService.canExecuteTransaction(safeTxHash);
    } catch (error) {
      console.error('Error checking if transaction can be executed:', error);
      return false;
    }
  }

  /**
   * Monitor transaction status with real-time updates
   */
  async monitorTransactionStatus(
    safeTxHash: string,
    onStatusUpdate: (status: any) => void,
    pollInterval: number = 5000
  ): Promise<() => void> {
    let isMonitoring = true;

    const poll = async () => {
      if (!isMonitoring) return;

      try {
        const status = await this.getTransactionStatus(safeTxHash);
        onStatusUpdate(status);

        // Continue polling if transaction is still pending
        if (status.status === 'pending' && isMonitoring) {
          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        console.error('Error monitoring transaction status:', error);
        if (isMonitoring) {
          setTimeout(poll, pollInterval);
        }
      }
    };

    // Start polling
    poll();

    // Return cleanup function
    return () => {
      isMonitoring = false;
    };
  }

  /**
   * Handle and format transaction errors with enhanced classification
   */
  private handleTransactionError(error: any): TransactionError {
    console.error('Transaction error:', error);

    // Use the enhanced error handler for classification
    const errorDetails = ErrorHandler.classifyError(error);

    return {
      code: errorDetails.code,
      message: errorDetails.userMessage,
      details: error
    };
  }

  /**
   * Enhanced transaction monitoring with error recovery
   */
  async monitorTransactionStatusWithRecovery(
    safeTxHash: string,
    onStatusUpdate: (status: any) => void,
    onError?: (error: any) => void,
    pollInterval: number = 5000
  ): Promise<() => void> {
    let isMonitoring = true;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    const poll = async () => {
      if (!isMonitoring) return;

      try {
        const status = await errorRecoveryService.retryNetworkOperation(
          () => this.getTransactionStatus(safeTxHash)
        );

        onStatusUpdate(status);
        consecutiveErrors = 0; // Reset error counter on success

        // Continue polling if transaction is still pending
        if (status.status === 'pending' && isMonitoring) {
          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        consecutiveErrors++;
        console.error(`Error monitoring transaction status (attempt ${consecutiveErrors}):`, error);

        if (onError) {
          onError(error);
        }

        // Stop monitoring after too many consecutive errors
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error('Too many consecutive errors, stopping transaction monitoring');
          isMonitoring = false;
          return;
        }

        // Continue polling with exponential backoff
        if (isMonitoring) {
          const backoffDelay = pollInterval * Math.pow(2, consecutiveErrors - 1);
          setTimeout(poll, Math.min(backoffDelay, 30000)); // Cap at 30 seconds
        }
      }
    };

    // Start polling
    poll();

    // Return cleanup function
    return () => {
      isMonitoring = false;
    };
  }
}

// Singleton instance
export const transactionService = new TransactionService();
