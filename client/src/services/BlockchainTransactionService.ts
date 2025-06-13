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
   * Test function to verify Etherscan API connectivity with API key
   */
  async testEtherscanAPI(address: string): Promise<void> {
    // Use the new Etherscan API v2 unified endpoint with chainid
    const chainIds = {
      ethereum: '1',
      sepolia: '11155111',
      arbitrum: '42161'
    };

    const chainId = chainIds[this.network as keyof typeof chainIds];
    if (!chainId) {
      console.error(`Etherscan API not supported for network: ${this.network}`);
      return;
    }

    const baseUrl = `https://api.etherscan.io/v2/api?chainid=${chainId}`;
    const apiKey = process.env.REACT_APP_ETHERSCAN_API_KEY || 'YourApiKeyToken';
    const testUrl = `${baseUrl}&module=account&action=txlist&address=${address}&page=1&offset=5&sort=desc&apikey=${apiKey}`;

    console.log(`Testing Etherscan API for ${this.network}:`);
    console.log(`URL: ${testUrl}`);
    console.log(`API Key: ${apiKey.substring(0, 10)}...`);

    try {
      const response = await fetch(testUrl);
      const data = await response.json();
      console.log(`API Test Response:`, data);

      if (data.status === '1' && data.result && Array.isArray(data.result)) {
        console.log(`✅ API working! Found ${data.result.length} transactions`);
      } else {
        console.log(`❌ API issue:`, data.message || 'Unknown error');
      }
    } catch (error) {
      console.error(`❌ API Test failed:`, error);
    }
  }

  /**
   * Get all transactions for a Safe wallet using Etherscan API
   */
  async getTransactionsFromBlockchain(
    safeAddress: string,
    limit: number = 50,
    fromBlock: number = 0
  ): Promise<BlockchainTransaction[]> {
    try {
      console.log(`Fetching blockchain transactions for Safe: ${safeAddress} on ${this.network} using Etherscan API`);

      // Test the API first to debug any issues
      await this.testEtherscanAPI(safeAddress);

      // Use Etherscan API directly - it's fast and reliable
      const transactions = await this.getTransactionsFromEtherscanAPI(safeAddress, 0, 99999999);

      console.log(`Found ${transactions.length} total transactions from Etherscan API`);

      // Sort by block number (newest first)
      transactions.sort((a, b) => b.blockNumber - a.blockNumber);

      // Limit results
      const limitedTransactions = transactions.slice(0, limit);

      console.log(`Returning ${limitedTransactions.length} blockchain transactions for Safe ${safeAddress}`);
      return limitedTransactions;

    } catch (error) {
      console.error('Error fetching blockchain transactions:', error);
      throw error;
    }
  }

  /**
   * Fast method using Covalent API (no API key required for basic queries)
   */
  private async getTransactionsFromCovalent(
    address: string,
    limit: number
  ): Promise<BlockchainTransaction[]> {
    const chainIds = {
      ethereum: 1,
      sepolia: 11155111,
      arbitrum: 42161
    };

    const chainId = chainIds[this.network as keyof typeof chainIds];
    if (!chainId) {
      throw new Error(`Covalent not supported for network: ${this.network}`);
    }

    const url = `https://api.covalenthq.com/v1/${chainId}/address/${address}/transactions_v2/?page-size=${limit}&no-logs=true`;

    console.log(`Fetching from Covalent: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Covalent API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || !data.data.items) {
      throw new Error('No transaction data from Covalent');
    }

    const transactions: BlockchainTransaction[] = [];

    for (const tx of data.data.items) {
      if (tx.successful) {
        transactions.push({
          hash: tx.tx_hash,
          blockNumber: tx.block_height,
          blockHash: tx.block_hash || '',
          transactionIndex: tx.tx_offset || 0,
          from: tx.from_address,
          to: tx.to_address || '',
          value: tx.value || '0',
          gasPrice: tx.gas_price?.toString() || '0',
          gasUsed: tx.gas_spent?.toString() || '0',
          gasLimit: tx.gas_offered?.toString() || '0',
          timestamp: new Date(tx.block_signed_at).getTime() / 1000,
          status: 'success' as const,
          methodName: this.getMethodName(tx.log_events?.[0]?.raw_log_topics?.[0] || ''),
          data: '0x',
          logs: tx.log_events || [],
          isExecuted: true,
          safeTxHash: undefined
        });
      }
    }

    return transactions;
  }

  /**
   * Fast method using Alchemy API (free tier available)
   */
  private async getTransactionsFromAlchemy(
    address: string,
    limit: number
  ): Promise<BlockchainTransaction[]> {
    const alchemyUrls = {
      ethereum: 'https://eth-mainnet.g.alchemy.com/v2/demo',
      sepolia: 'https://eth-sepolia.g.alchemy.com/v2/demo',
      arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/demo'
    };

    const baseUrl = alchemyUrls[this.network as keyof typeof alchemyUrls];
    if (!baseUrl) {
      throw new Error(`Alchemy not supported for network: ${this.network}`);
    }

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromBlock: '0x0',
          toBlock: 'latest',
          fromAddress: address,
          toAddress: address,
          category: ['external', 'internal'],
          maxCount: `0x${limit.toString(16)}`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.result || !data.result.transfers) {
      throw new Error('No transfer data from Alchemy');
    }

    const transactions: BlockchainTransaction[] = [];

    for (const transfer of data.result.transfers) {
      transactions.push({
        hash: transfer.hash,
        blockNumber: parseInt(transfer.blockNum, 16),
        blockHash: '',
        transactionIndex: 0,
        from: transfer.from,
        to: transfer.to || '',
        value: (parseFloat(transfer.value || '0') * 1e18).toString(),
        gasPrice: '0',
        gasUsed: '0',
        gasLimit: '0',
        timestamp: 0, // Will be filled by block data
        status: 'success' as const,
        methodName: 'Transfer',
        data: '0x',
        logs: [],
        isExecuted: true,
        safeTxHash: undefined
      });
    }

    return transactions;
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
   * Get transactions using Etherscan API with proper error handling
   */
  private async getTransactionsFromEtherscanAPI(
    address: string,
    startBlock: number,
    endBlock: number
  ): Promise<BlockchainTransaction[]> {
    // Use the new Etherscan API v2 unified endpoint with chainid
    const chainIds = {
      ethereum: '1',
      sepolia: '11155111',
      arbitrum: '42161'
    };

    const chainId = chainIds[this.network as keyof typeof chainIds];
    if (!chainId) {
      throw new Error(`Etherscan API not supported for network: ${this.network}`);
    }

    const baseUrl = `https://api.etherscan.io/v2/api?chainid=${chainId}`;

    // Get API key from environment or use demo key
    const apiKey = process.env.REACT_APP_ETHERSCAN_API_KEY || 'YourApiKeyToken';
    console.log(`Environment API key: ${process.env.REACT_APP_ETHERSCAN_API_KEY ? 'Found' : 'Not found'}`);
    console.log(`Using API key: ${apiKey}`);

    // Build URLs with API key using v2 API format
    const normalTxUrl = `${baseUrl}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${apiKey}`;
    const internalTxUrl = `${baseUrl}&module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${apiKey}`;

    console.log(`Full API key for debugging: ${apiKey}`);
    console.log(`Normal TX URL: ${normalTxUrl}`);
    console.log(`Internal TX URL: ${internalTxUrl}`);

    console.log(`Fetching transactions from Etherscan for ${this.network}`);

    try {
      // Try to fetch both normal and internal transactions
      const responses = await Promise.allSettled([
        fetch(normalTxUrl),
        fetch(internalTxUrl)
      ]);

      const transactions: BlockchainTransaction[] = [];

      // Process normal transactions
      if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
        const normalData = await responses[0].value.json();
        console.log(`Normal transactions response:`, normalData);

        if (normalData.status === '1' && normalData.result && Array.isArray(normalData.result)) {
          console.log(`Processing ${normalData.result.length} normal transactions`);
          for (const tx of normalData.result) {
            console.log(`Normal TX: ${tx.hash}, txreceipt_status: ${tx.txreceipt_status}, isError: ${tx.isError}`);
            // Include all transactions (no status filtering)
            const formattedTx = await this.formatBlockchainTransaction(tx, 'normal');
            console.log(`Formatted normal TX: ${formattedTx.hash}, status: ${formattedTx.status}`);
            transactions.push(formattedTx);
          }
        } else {
          console.warn('Normal transactions API response indicates error or no data:', normalData);
          if (normalData.message) {
            console.warn('API Error message:', normalData.message);
          }
        }
      } else {
        console.warn('Failed to fetch normal transactions - network or HTTP error');
        if (responses[0].status === 'rejected') {
          console.error('Normal transactions request rejected:', responses[0].reason);
        }
      }

      // Process internal transactions
      if (responses[1].status === 'fulfilled' && responses[1].value.ok) {
        const internalData = await responses[1].value.json();
        console.log(`Internal transactions response:`, internalData);

        if (internalData.status === '1' && internalData.result && Array.isArray(internalData.result)) {
          console.log(`Processing ${internalData.result.length} internal transactions`);
          for (const tx of internalData.result) {
            // Include all internal transactions (no status filtering)
            transactions.push(await this.formatBlockchainTransaction(tx, 'internal'));
          }
        } else {
          console.warn('Internal transactions API response indicates error or no data:', internalData);
          if (internalData.message) {
            console.warn('API Error message:', internalData.message);
          }
        }
      } else {
        console.warn('Failed to fetch internal transactions - network or HTTP error');
        if (responses[1].status === 'rejected') {
          console.error('Internal transactions request rejected:', responses[1].reason);
        }
      }

      // Remove duplicates based on transaction hash
      const uniqueTransactions = transactions.filter((tx, index, self) =>
        index === self.findIndex(t => t.hash === tx.hash)
      );

      console.log(`Total unique transactions processed: ${uniqueTransactions.length}`);
      return uniqueTransactions;

    } catch (error) {
      console.error('Error fetching from Etherscan API:', error);

      // If Etherscan fails, try a simple provider-based approach for recent transactions
      console.log('Etherscan failed, trying provider-based approach...');
      return this.getRecentTransactionsFromProvider(address, 100); // Last 100 blocks
    }
  }

  /**
   * Fallback method using provider for recent transactions only
   */
  private async getRecentTransactionsFromProvider(
    address: string,
    blockRange: number = 100
  ): Promise<BlockchainTransaction[]> {
    if (!this.provider) {
      return [];
    }

    try {
      console.log(`Scanning last ${blockRange} blocks for transactions...`);

      const currentBlock = await this.provider.getBlockNumber();
      const startBlock = Math.max(0, currentBlock - blockRange);

      const transactions: BlockchainTransaction[] = [];

      // Scan recent blocks only (much faster)
      for (let blockNumber = currentBlock; blockNumber >= startBlock; blockNumber--) {
        try {
          const block = await this.provider.getBlockWithTransactions(blockNumber);

          if (block && block.transactions) {
            for (const tx of block.transactions) {
              if (tx.to?.toLowerCase() === address.toLowerCase() ||
                  tx.from?.toLowerCase() === address.toLowerCase()) {

                const receipt = await this.provider.getTransactionReceipt(tx.hash);

                if (receipt && receipt.status === 1) {
                  transactions.push({
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
                  });
                }
              }
            }
          }
        } catch (blockError) {
          console.warn(`Error processing block ${blockNumber}:`, blockError);
        }

        // Limit to prevent too many API calls
        if (transactions.length >= 50) {
          break;
        }
      }

      console.log(`Found ${transactions.length} transactions from provider scan`);
      return transactions;

    } catch (error) {
      console.error('Error in provider-based transaction scan:', error);
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
