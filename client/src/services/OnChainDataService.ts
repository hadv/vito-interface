import { ethers } from 'ethers';
import { getProviderForNetwork } from '../utils/ens';
import { SAFE_ABI } from '../contracts/abis';

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  gasUsed: string;
  gasPrice: string;
  status: number;
  confirmations: number;
  timestamp: number;
}

export interface SafeTransactionEvent {
  safeTxHash: string;
  to: string;
  value: string;
  data: string;
  operation: number;
  gasToken: string;
  gasPrice: string;
  gasUsed: string;
  nonce: number;
  executor: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface OnChainTransactionStatus {
  status: 'pending' | 'confirmed' | 'executed' | 'failed';
  confirmations: number;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  executionTxHash?: string;
  timestamp?: number;
}

export class OnChainDataService {
  private provider: ethers.providers.Provider | null = null;
  private network: string = 'ethereum';

  constructor(network: string = 'ethereum') {
    this.network = network;
    this.provider = getProviderForNetwork(network);
  }

  /**
   * Get transaction receipt from blockchain
   */
  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) return null;

      const block = await this.provider.getBlock(receipt.blockNumber);
      const currentBlock = await this.provider.getBlockNumber();

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.effectiveGasPrice?.toString() || '0',
        status: receipt.status || 0,
        confirmations: currentBlock - receipt.blockNumber,
        timestamp: block.timestamp
      };
    } catch (error) {
      console.error('Error getting transaction receipt:', error);
      return null;
    }
  }

  /**
   * Get Safe transaction events from blockchain
   */
  async getSafeTransactionEvents(
    safeAddress: string,
    fromBlock: number = 0,
    toBlock: number | string = 'latest'
  ): Promise<SafeTransactionEvent[]> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const safeContract = new ethers.Contract(safeAddress, SAFE_ABI, this.provider);
      
      // Get ExecutionSuccess events (when transactions are executed)
      const filter = safeContract.filters.ExecutionSuccess();
      const events = await safeContract.queryFilter(filter, fromBlock, toBlock);

      const transactionEvents: SafeTransactionEvent[] = [];

      for (const event of events) {
        const block = await this.provider.getBlock(event.blockNumber);
        const receipt = await this.provider.getTransactionReceipt(event.transactionHash);

        if (event.args) {
          transactionEvents.push({
            safeTxHash: event.args.txHash || '',
            to: event.args.to || '',
            value: event.args.value?.toString() || '0',
            data: event.args.data || '0x',
            operation: event.args.operation || 0,
            gasToken: event.args.gasToken || ethers.constants.AddressZero,
            gasPrice: event.args.gasPrice?.toString() || '0',
            gasUsed: receipt.gasUsed.toString(),
            nonce: event.args.nonce?.toNumber() || 0,
            executor: event.args.executor || '',
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            timestamp: block.timestamp
          });
        }
      }

      return transactionEvents.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting Safe transaction events:', error);
      return [];
    }
  }

  /**
   * Get transaction status from on-chain data
   */
  async getTransactionStatus(txHash: string): Promise<OnChainTransactionStatus> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const receipt = await this.getTransactionReceipt(txHash);
      
      if (!receipt) {
        // Transaction not found on blockchain yet
        return {
          status: 'pending',
          confirmations: 0
        };
      }

      const status = receipt.status === 1 ? 'executed' : 'failed';
      
      return {
        status,
        confirmations: receipt.confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        gasPrice: receipt.gasPrice,
        executionTxHash: receipt.transactionHash,
        timestamp: receipt.timestamp
      };
    } catch (error) {
      console.error('Error getting transaction status:', error);
      return {
        status: 'pending',
        confirmations: 0
      };
    }
  }

  /**
   * Check if transaction has enough confirmations
   */
  async hasEnoughConfirmations(txHash: string, requiredConfirmations: number = 1): Promise<boolean> {
    try {
      const receipt = await this.getTransactionReceipt(txHash);
      return receipt ? receipt.confirmations >= requiredConfirmations : false;
    } catch (error) {
      console.error('Error checking confirmations:', error);
      return false;
    }
  }

  /**
   * Get current gas price
   */
  async getCurrentGasPrice(): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const gasPrice = await this.provider.getGasPrice();
      return gasPrice.toString();
    } catch (error) {
      console.error('Error getting gas price:', error);
      return '0';
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: {
    to: string;
    value?: string;
    data?: string;
  }): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const gasEstimate = await this.provider.estimateGas({
        to: transaction.to,
        value: transaction.value || '0',
        data: transaction.data || '0x'
      });
      return gasEstimate.toString();
    } catch (error) {
      console.error('Error estimating gas:', error);
      return '21000'; // Default gas limit for simple transfers
    }
  }

  /**
   * Listen for new blocks and execute callback
   */
  onNewBlock(callback: (blockNumber: number) => void): () => void {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    this.provider.on('block', callback);
    
    return () => {
      if (this.provider) {
        this.provider.off('block', callback);
      }
    };
  }

  /**
   * Listen for specific transaction confirmation
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 300000 // 5 minutes
  ): Promise<TransactionReceipt | null> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const receipt = await this.provider.waitForTransaction(txHash, confirmations, timeout);
      if (!receipt) return null;

      const block = await this.provider.getBlock(receipt.blockNumber);
      const currentBlock = await this.provider.getBlockNumber();

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.effectiveGasPrice?.toString() || '0',
        status: receipt.status || 0,
        confirmations: currentBlock - receipt.blockNumber,
        timestamp: block.timestamp
      };
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      return null;
    }
  }
}

// Create singleton instances for different networks
export const onChainDataService = new OnChainDataService();
export const createOnChainDataService = (network: string) => new OnChainDataService(network);
