import { ethers } from 'ethers';
import { getProviderForNetwork } from '../utils/ens';

export interface BlockchainTransaction {
  hash: string;
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  gasLimit: string;
  timestamp: number;
  status: 'success' | 'failed';
  methodName: string;
  data: string;
  logs: any[];
  isExecuted: true;
  safeTxHash?: string;
}

export class BlockchainTransactionService {
  private provider: ethers.providers.Provider | null = null;
  private network: string = 'ethereum';

  constructor(network: string = 'ethereum') {
    this.network = network;
    this.provider = getProviderForNetwork(network);
  }

  /**
   * Test function to verify Etherscan API connectivity
   */
  async testEtherscanAPI(address: string): Promise<void> {
    const etherscanUrls = {
      ethereum: 'https://api.etherscan.io/api',
      sepolia: 'https://api-sepolia.etherscan.io/api',
      arbitrum: 'https://api.arbiscan.io/api'
    };

    const baseUrl = etherscanUrls[this.network as keyof typeof etherscanUrls];
    const testUrl = `${baseUrl}?module=account&action=txlist&address=${address}&page=1&offset=10&sort=desc`;

    console.log(`Testing Etherscan API for ${this.network}:`);
    console.log(`URL: ${testUrl}`);

    try {
      const response = await fetch(testUrl);
      const data = await response.json();
      console.log(`API Response:`, data);
    } catch (error) {
      console.error(`API Test failed:`, error);
    }
  }

  /**
   * Get all transactions for a Safe wallet directly from blockchain using provider
   */
  async getTransactionsFromBlockchain(
    safeAddress: string,
    limit: number = 50,
    fromBlock: number = 0
  ): Promise<BlockchainTransaction[]> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      console.log(`Fetching blockchain transactions for Safe: ${safeAddress} on ${this.network}`);

      // Get current block number
      const currentBlock = await this.provider.getBlockNumber();
      console.log(`Current block: ${currentBlock}`);

      // For Sepolia, scan the last 50,000 blocks (about 6 months of history)
      const startBlock = Math.max(0, currentBlock - 50000);
      const endBlock = currentBlock;

      console.log(`Scanning blocks ${startBlock} to ${endBlock} for transactions`);

      const transactions: BlockchainTransaction[] = [];

      // Scan blocks in batches to find transactions
      const batchSize = 1000;
      for (let blockStart = startBlock; blockStart <= endBlock; blockStart += batchSize) {
        const blockEnd = Math.min(blockStart + batchSize - 1, endBlock);

        console.log(`Scanning blocks ${blockStart} to ${blockEnd}`);

        try {
          // Get all transactions in this block range
          const blockTxs = await this.scanBlocksForTransactions(safeAddress, blockStart, blockEnd);
          transactions.push(...blockTxs);

          if (transactions.length >= limit) {
            break;
          }
        } catch (error) {
          console.warn(`Error scanning blocks ${blockStart}-${blockEnd}:`, error);
          // Continue with next batch
        }

        // Add delay to avoid overwhelming the provider
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Sort by block number (newest first)
      transactions.sort((a, b) => b.blockNumber - a.blockNumber);

      // Limit results
      const limitedTransactions = transactions.slice(0, limit);

      console.log(`Found ${limitedTransactions.length} blockchain transactions for Safe ${safeAddress}`);
      return limitedTransactions;

    } catch (error) {
      console.error('Error fetching blockchain transactions:', error);
      throw error;
    }
  }

  /**
   * Scan blocks for transactions involving the Safe address
   */
  private async scanBlocksForTransactions(
    address: string,
    startBlock: number,
    endBlock: number
  ): Promise<BlockchainTransaction[]> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const transactions: BlockchainTransaction[] = [];

    try {
      // Get blocks in this range and check for transactions
      for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
        try {
          const block = await this.provider.getBlockWithTransactions(blockNumber);

          if (block && block.transactions) {
            for (const tx of block.transactions) {
              // Check if transaction involves our Safe address
              if (tx.to?.toLowerCase() === address.toLowerCase() ||
                  tx.from?.toLowerCase() === address.toLowerCase()) {

                // Get transaction receipt to check if it was successful
                const receipt = await this.provider.getTransactionReceipt(tx.hash);

                if (receipt && receipt.status === 1) {
                  // Format the transaction
                  const formattedTx: BlockchainTransaction = {
                    hash: tx.hash,
                    blockNumber: tx.blockNumber || 0,
                    blockHash: tx.blockHash || '',
                    transactionIndex: receipt.transactionIndex || 0,
                    from: tx.from,
                    to: tx.to || '',
                    value: tx.value.toString(),
                    gasPrice: tx.gasPrice?.toString() || '0',
                    gasUsed: receipt.gasUsed.toString(),
                    gasLimit: tx.gasLimit.toString(),
                    timestamp: block.timestamp,
                    status: 'success' as const,
                    methodName: this.getMethodName(tx.data.slice(0, 10)),
                    data: tx.data,
                    logs: receipt.logs,
                    isExecuted: true,
                    safeTxHash: undefined
                  };

                  transactions.push(formattedTx);
                }
              }
            }
          }
        } catch (blockError) {
          console.warn(`Error processing block ${blockNumber}:`, blockError);
          // Continue with next block
        }

        // Add small delay every 10 blocks to avoid overwhelming the provider
        if (blockNumber % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } catch (error) {
      console.error('Error scanning blocks:', error);
    }

    return transactions;
  }

  /**
   * Get transactions using Etherscan API (more efficient than scanning blocks)
   */
  private async getTransactionsFromEtherscanAPI(
    address: string,
    startBlock: number,
    endBlock: number
  ): Promise<BlockchainTransaction[]> {
    const etherscanUrls = {
      ethereum: 'https://api.etherscan.io/api',
      sepolia: 'https://api-sepolia.etherscan.io/api',
      arbitrum: 'https://api.arbiscan.io/api'
    };

    const baseUrl = etherscanUrls[this.network as keyof typeof etherscanUrls];
    if (!baseUrl) {
      throw new Error(`Etherscan API not supported for network: ${this.network}`);
    }

    // Get normal transactions (no API key needed for basic queries)
    const normalTxUrl = `${baseUrl}?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=${endBlock}&page=1&offset=100&sort=desc`;

    // Get internal transactions (no API key needed for basic queries)
    const internalTxUrl = `${baseUrl}?module=account&action=txlistinternal&address=${address}&startblock=${startBlock}&endblock=${endBlock}&page=1&offset=100&sort=desc`;

    console.log(`Fetching normal transactions: ${normalTxUrl}`);
    console.log(`Fetching internal transactions: ${internalTxUrl}`);

    try {
      const [normalResponse, internalResponse] = await Promise.all([
        fetch(normalTxUrl),
        fetch(internalTxUrl)
      ]);

      console.log(`Normal response status: ${normalResponse.status}`);
      console.log(`Internal response status: ${internalResponse.status}`);

      const normalData = await normalResponse.json();
      const internalData = await internalResponse.json();

      console.log(`Normal data:`, normalData);
      console.log(`Internal data:`, internalData);

      const transactions: BlockchainTransaction[] = [];

      // Process normal transactions
      if (normalData.status === '1' && normalData.result) {
        console.log(`Processing ${normalData.result.length} normal transactions`);
        for (const tx of normalData.result) {
          // Only include successful transactions
          if (tx.txreceipt_status === '1') {
            transactions.push(await this.formatBlockchainTransaction(tx, 'normal'));
          }
        }
      } else {
        console.warn('No normal transactions found or API error:', normalData);
      }

      // Process internal transactions (these are often Safe executions)
      if (internalData.status === '1' && internalData.result) {
        console.log(`Processing ${internalData.result.length} internal transactions`);
        for (const tx of internalData.result) {
          // Only include successful transactions
          if (tx.isError === '0') {
            transactions.push(await this.formatBlockchainTransaction(tx, 'internal'));
          }
        }
      } else {
        console.warn('No internal transactions found or API error:', internalData);
      }

      console.log(`Total transactions processed: ${transactions.length}`);
      return transactions;
    } catch (error) {
      console.error('Error fetching from Etherscan API:', error);
      return [];
    }
  }

  /**
   * Format transaction data from Etherscan API
   */
  private async formatBlockchainTransaction(
    tx: any,
    type: 'normal' | 'internal'
  ): Promise<BlockchainTransaction> {
    // Decode method name from input data
    let methodName = 'Transfer';
    if (tx.input && tx.input.length > 10) {
      const methodId = tx.input.slice(0, 10);
      methodName = this.getMethodName(methodId);
    }

    return {
      hash: tx.hash,
      blockNumber: parseInt(tx.blockNumber),
      blockHash: tx.blockHash || '',
      transactionIndex: parseInt(tx.transactionIndex || '0'),
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      gasLimit: tx.gas,
      timestamp: parseInt(tx.timeStamp),
      status: (tx.txreceipt_status === '1' || tx.isError === '0') ? 'success' : 'failed',
      methodName,
      data: tx.input || '0x',
      logs: [],
      isExecuted: true,
      safeTxHash: undefined // Will be populated if we can decode it from logs
    };
  }

  /**
   * Get human-readable method name from method ID
   */
  private getMethodName(methodId: string): string {
    const methodNames: { [key: string]: string } = {
      '0x6a761202': 'Exec Transaction',
      '0xa9059cbb': 'Transfer',
      '0x23b872dd': 'Transfer From',
      '0x095ea7b3': 'Approve',
      '0x40c10f19': 'Mint',
      '0x42842e0e': 'Safe Transfer From',
      '0xb88d4fde': 'Safe Transfer From',
      '0x': 'Transfer'
    };

    return methodNames[methodId] || 'Contract Call';
  }

  /**
   * Get transaction receipt with full details
   */
  async getTransactionDetails(txHash: string): Promise<any> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash)
      ]);

      return {
        transaction: tx,
        receipt: receipt,
        block: await this.provider.getBlock(tx.blockNumber!)
      };
    } catch (error) {
      console.error('Error getting transaction details:', error);
      return null;
    }
  }

  /**
   * Check if address is a Safe wallet by looking for Safe-specific transactions
   */
  async isSafeWallet(address: string): Promise<boolean> {
    try {
      const transactions = await this.getTransactionsFromBlockchain(address, 5);
      
      // Look for Safe-specific method calls
      const safeMethodIds = ['0x6a761202', '0x468721a7', '0x0d582f13'];
      return transactions.some(tx => 
        safeMethodIds.some(methodId => tx.data.startsWith(methodId))
      );
    } catch (error) {
      console.error('Error checking if address is Safe wallet:', error);
      return false;
    }
  }
}

// Create singleton instances for different networks
export const blockchainTransactionService = new BlockchainTransactionService();
export const createBlockchainTransactionService = (network: string) => new BlockchainTransactionService(network);
