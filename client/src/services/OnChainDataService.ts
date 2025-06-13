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
   * Get Safe transaction history from Safe Transaction Service API
   */
  async getSafeTransactionHistory(
    safeAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<SafeTransactionEvent[]> {
    try {
      const url = `${this.safeServiceUrl}/api/v1/safes/${safeAddress}/multisig-transactions/?limit=${limit}&offset=${offset}&executed=true`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`Safe Transaction Service API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const transactions: SafeTransactionEvent[] = [];

      for (const tx of data.results || []) {
        if (tx.isExecuted && tx.transactionHash) {
          // Get additional on-chain data
          const receipt = await this.getTransactionReceipt(tx.transactionHash);

          transactions.push({
            safeTxHash: tx.safeTxHash || '',
            to: tx.to || '',
            value: tx.value || '0',
            data: tx.data || '0x',
            operation: tx.operation || 0,
            gasToken: tx.gasToken || ethers.constants.AddressZero,
            gasPrice: receipt?.gasPrice || '0',
            gasUsed: receipt?.gasUsed || '0',
            nonce: tx.nonce || 0,
            executor: tx.executor || '',
            blockNumber: receipt?.blockNumber || 0,
            transactionHash: tx.transactionHash,
            timestamp: new Date(tx.executionDate || tx.submissionDate).getTime() / 1000
          });
        }
      }

      return transactions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error fetching from Safe Transaction Service:', error);
      // Fallback to on-chain events
      return this.getSafeTransactionEventsFromChain(safeAddress);
    }
  }

  /**
   * Get pending Safe transactions from Safe Transaction Service API
   */
  async getSafePendingTransactions(
    safeAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const url = `${this.safeServiceUrl}/api/v1/safes/${safeAddress}/multisig-transactions/?limit=${limit}&offset=${offset}&executed=false`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`Safe Transaction Service API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching pending transactions from Safe Transaction Service:', error);
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
            timestamp: block.timestamp
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
