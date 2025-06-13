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
  executor: string | null;
  blockNumber: number;
  transactionHash: string | null;
  timestamp: number;
  isExecuted: boolean;
  status: 'executed' | 'pending' | 'failed';
  confirmations?: any[];
  confirmationsRequired?: number;
  submissionDate?: string;
  proposer?: string;
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
  private safeServiceUrl: string;

  constructor(network: string = 'ethereum') {
    this.network = network;
    this.provider = getProviderForNetwork(network);

    // Safe Transaction Service URLs for different networks
    this.safeServiceUrl = this.getSafeServiceUrl(network);
  }

  private getSafeServiceUrl(network: string): string {
    const urls = {
      ethereum: 'https://safe-transaction-mainnet.safe.global',
      sepolia: 'https://safe-transaction-sepolia.safe.global',
      arbitrum: 'https://safe-transaction-arbitrum.safe.global',
      gnosis: 'https://safe-transaction-gnosis-chain.safe.global'
    };

    return urls[network as keyof typeof urls] || urls.ethereum;
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
   * Get Safe transaction history from Safe Transaction Service API (optimized)
   */
  async getSafeTransactionHistory(
    safeAddress: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<SafeTransactionEvent[]> {
    try {
      const url = `${this.safeServiceUrl}/api/v1/safes/${safeAddress}/multisig-transactions/?limit=${limit}&offset=${offset}&ordering=-submissionDate`;

      // Add timeout for faster failure
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Safe Transaction Service API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const transactions: SafeTransactionEvent[] = [];

      // Process transactions in batches to avoid blocking
      const batchSize = 5;
      const txBatches = [];
      for (let i = 0; i < (data.results || []).length; i += batchSize) {
        txBatches.push((data.results || []).slice(i, i + batchSize));
      }

      for (const batch of txBatches) {
        const batchPromises = batch.map(async (tx: any) => {
          // Handle both executed and pending transactions
          if (tx.isExecuted && tx.transactionHash) {
            // Executed transaction
            let receipt = null;
            const isRecent = new Date(tx.executionDate).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000); // Last 7 days

            if (isRecent) {
              try {
                receipt = await this.getTransactionReceipt(tx.transactionHash);
              } catch (error) {
                console.warn(`Failed to get receipt for ${tx.transactionHash}:`, error);
              }
            }

            return {
              safeTxHash: tx.safeTxHash || '',
              to: tx.to || '',
              value: tx.value || '0',
              data: tx.data || '0x',
              operation: tx.operation || 0,
              gasToken: tx.gasToken || ethers.constants.AddressZero,
              gasPrice: receipt?.gasPrice || tx.gasPrice || '0',
              gasUsed: receipt?.gasUsed || tx.gasUsed || '0',
              nonce: tx.nonce || 0,
              executor: tx.executor || '',
              blockNumber: receipt?.blockNumber || 0,
              transactionHash: tx.transactionHash,
              timestamp: new Date(tx.executionDate || tx.submissionDate).getTime() / 1000,
              isExecuted: true,
              status: 'executed',
              confirmations: tx.confirmations || [],
              confirmationsRequired: tx.confirmationsRequired || 1
            };
          } else if (!tx.isExecuted) {
            // Pending transaction
            return {
              safeTxHash: tx.safeTxHash || '',
              to: tx.to || '',
              value: tx.value || '0',
              data: tx.data || '0x',
              operation: tx.operation || 0,
              gasToken: tx.gasToken || ethers.constants.AddressZero,
              gasPrice: tx.gasPrice || '0',
              gasUsed: '0',
              nonce: tx.nonce || 0,
              executor: null,
              blockNumber: 0,
              transactionHash: null,
              timestamp: new Date(tx.submissionDate).getTime() / 1000,
              isExecuted: false,
              status: 'pending',
              confirmations: tx.confirmations || [],
              confirmationsRequired: tx.confirmationsRequired || 1,
              submissionDate: tx.submissionDate,
              proposer: tx.proposer
            };
          }
          return null;
        });

        const batchResults = await Promise.all(batchPromises);
        transactions.push(...batchResults.filter(Boolean) as SafeTransactionEvent[]);
      }

      return transactions;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Safe Transaction Service request timed out');
      } else {
        console.error('Error fetching from Safe Transaction Service:', error);
      }

      // Fallback to on-chain events only for small ranges
      if (limit <= 50) {
        return this.getSafeTransactionEventsFromChain(safeAddress, -1000); // Last 1000 blocks
      }
      return [];
    }
  }

  /**
   * Get pending Safe transactions from Safe Transaction Service API (optimized)
   */
  async getSafePendingTransactions(
    safeAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const url = `${this.safeServiceUrl}/api/v1/safes/${safeAddress}/multisig-transactions/?limit=${limit}&offset=${offset}&executed=false&ordering=-submissionDate`;

      // Add timeout for faster failure
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for pending txs

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Safe Transaction Service API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Safe Transaction Service request for pending transactions timed out');
      } else {
        console.error('Error fetching pending transactions from Safe Transaction Service:', error);
      }
      return [];
    }
  }

  /**
   * Get Safe transaction events from blockchain (fallback method)
   */
  async getSafeTransactionEventsFromChain(
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
      const successFilter = safeContract.filters.ExecutionSuccess();
      const successEvents = await safeContract.queryFilter(successFilter, fromBlock, toBlock);

      // Get ExecutionFailure events (when transactions fail)
      const failureFilter = safeContract.filters.ExecutionFailure();
      const failureEvents = await safeContract.queryFilter(failureFilter, fromBlock, toBlock);

      const transactionEvents: SafeTransactionEvent[] = [];

      // Process successful executions
      for (const event of successEvents) {
        const block = await this.provider.getBlock(event.blockNumber);
        const receipt = await this.provider.getTransactionReceipt(event.transactionHash);
        const transaction = await this.provider.getTransaction(event.transactionHash);

        if (event.args) {
          // Parse the transaction input data to get Safe transaction details
          const txDetails = await this.parseSafeTransactionFromTx(transaction, safeContract);

          transactionEvents.push({
            safeTxHash: event.args.txHash || '',
            to: txDetails.to || '',
            value: txDetails.value || '0',
            data: txDetails.data || '0x',
            operation: txDetails.operation || 0,
            gasToken: txDetails.gasToken || ethers.constants.AddressZero,
            gasPrice: receipt.effectiveGasPrice?.toString() || '0',
            gasUsed: receipt.gasUsed.toString(),
            nonce: txDetails.nonce || 0,
            executor: transaction.from || '',
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            timestamp: block.timestamp,
            isExecuted: true,
            status: 'executed' as const
          });
        }
      }

      // Process failed executions
      for (const event of failureEvents) {
        const block = await this.provider.getBlock(event.blockNumber);
        const receipt = await this.provider.getTransactionReceipt(event.transactionHash);
        const transaction = await this.provider.getTransaction(event.transactionHash);

        if (event.args) {
          // Parse the transaction input data to get Safe transaction details
          const txDetails = await this.parseSafeTransactionFromTx(transaction, safeContract);

          transactionEvents.push({
            safeTxHash: event.args.txHash || '',
            to: txDetails.to || '',
            value: txDetails.value || '0',
            data: txDetails.data || '0x',
            operation: txDetails.operation || 0,
            gasToken: txDetails.gasToken || ethers.constants.AddressZero,
            gasPrice: receipt.effectiveGasPrice?.toString() || '0',
            gasUsed: receipt.gasUsed.toString(),
            nonce: txDetails.nonce || 0,
            executor: transaction.from || '',
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            timestamp: block.timestamp,
            isExecuted: true,
            status: 'failed' as const
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
   * Parse Safe transaction details from the execution transaction
   */
  private async parseSafeTransactionFromTx(
    transaction: ethers.providers.TransactionResponse,
    safeContract: ethers.Contract
  ): Promise<{
    to: string;
    value: string;
    data: string;
    operation: number;
    gasToken: string;
    nonce: number;
  }> {
    try {
      // Decode the execTransaction call data
      const iface = safeContract.interface;
      const decoded = iface.parseTransaction({ data: transaction.data });

      if (decoded.name === 'execTransaction') {
        return {
          to: decoded.args.to,
          value: decoded.args.value.toString(),
          data: decoded.args.data,
          operation: decoded.args.operation,
          gasToken: decoded.args.gasToken,
          nonce: 0 // We'll need to get this from the Safe contract state
        };
      }
    } catch (error) {
      console.error('Error parsing Safe transaction:', error);
    }

    // Return default values if parsing fails
    return {
      to: '',
      value: '0',
      data: '0x',
      operation: 0,
      gasToken: ethers.constants.AddressZero,
      nonce: 0
    };
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
        executionTxHash: receipt.transactionHash || undefined,
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
