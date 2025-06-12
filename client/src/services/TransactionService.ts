import { ethers } from 'ethers';
import { safeWalletService, TransactionRequest, SafeTransactionResult, SafeTransactionData } from './SafeWalletService';

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
   * Send ETH or ERC20 tokens
   */
  async sendTransaction(params: SendTransactionParams): Promise<SafeTransactionResult> {
    try {
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
    } catch (error) {
      throw this.handleTransactionError(error);
    }
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
   * Get transaction history
   */
  async getTransactionHistory(): Promise<any[]> {
    try {
      return await safeWalletService.getTransactionHistory();
    } catch (error) {
      throw this.handleTransactionError(error);
    }
  }

  /**
   * Handle and format transaction errors
   */
  private handleTransactionError(error: any): TransactionError {
    console.error('Transaction error:', error);
    
    if (error.code) {
      return {
        code: error.code,
        message: error.message || 'Transaction failed',
        details: error
      };
    }
    
    if (error.message?.includes('insufficient funds')) {
      return {
        code: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient funds for transaction',
        details: error
      };
    }
    
    if (error.message?.includes('user rejected')) {
      return {
        code: 'USER_REJECTED',
        message: 'Transaction was rejected by user',
        details: error
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error
    };
  }
}

// Singleton instance
export const transactionService = new TransactionService();
