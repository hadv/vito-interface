/**
 * Optimized transaction service with caching, pagination, and background loading
 */

import { transactionCacheService, TransactionPage } from './TransactionCacheService';
import { OnChainDataService } from './OnChainDataService';
import { SafeWalletService } from './SafeWalletService';
import { TransactionEnhancementService } from './TransactionEnhancementService';

export interface TransactionFilters {
  status?: 'all' | 'executed' | 'pending' | 'failed';
  dateRange?: {
    from: Date;
    to: Date;
  };
  minValue?: string;
  maxValue?: string;
  tokenAddress?: string;
}

export interface PaginatedTransactionResult {
  transactions: any[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
}

export class OptimizedTransactionService {
  private onChainService: OnChainDataService;
  private safeWalletService: SafeWalletService;
  private enhancementService: TransactionEnhancementService;
  private readonly PAGE_SIZE = 20;
  private readonly PRELOAD_PAGES = 2;

  constructor(network: string = 'ethereum') {
    this.onChainService = new OnChainDataService(network);
    this.safeWalletService = new SafeWalletService();

    const provider = this.onChainService.getProvider();
    if (!provider) {
      console.warn(`Failed to initialize provider for network: ${network}, token enhancement will be disabled`);
      // Create a mock enhancement service that doesn't enhance transactions
      this.enhancementService = {
        enhanceTransaction: async (tx: any) => tx,
        enhanceTransactions: async (txs: any[]) => txs
      } as any;
    } else {
      this.enhancementService = new TransactionEnhancementService(provider, network);
    }
  }

  /**
   * Get paginated transaction history with caching
   */
  async getTransactionHistory(
    safeAddress: string,
    page: number = 0,
    filters?: TransactionFilters
  ): Promise<TransactionPage> {
    const cacheKey = `tx_history_${safeAddress}_${page}`;
    
    // Try to get from cache first
    const cached = await transactionCacheService.getCachedTransactionPage(
      safeAddress, 
      page, 
      filters
    );
    
    if (cached) {
      // Start background preloading for next pages
      this.preloadNextPages(safeAddress, page, filters);
      return cached;
    }

    // Fetch from API with request deduplication
    return transactionCacheService.deduplicateRequest(
      cacheKey,
      async () => {
        const result = await this.fetchTransactionPage(safeAddress, page, filters);
        
        // Cache the result
        await transactionCacheService.cacheTransactionPage(
          safeAddress,
          page,
          result,
          filters
        );

        // Start background preloading
        this.preloadNextPages(safeAddress, page, filters);

        return result;
      }
    );
  }

  /**
   * Fetch transaction page from API
   */
  private async fetchTransactionPage(
    safeAddress: string,
    page: number,
    filters?: TransactionFilters
  ): Promise<TransactionPage> {
    const offset = page * this.PAGE_SIZE;
    const limit = this.PAGE_SIZE;

    try {
      // Fetch only executed transactions
      const executedTxs = await this.onChainService.getSafeTransactionHistory(
        safeAddress,
        limit + 1, // Fetch one extra to check if there are more
        offset
      );

      // Format executed transactions
      const formattedTransactions = executedTxs.slice(0, limit).map(tx =>
        this.formatExecutedTransaction(tx, safeAddress)
      );

      // Enhance transactions with token transfer information
      console.log('🚀 Starting transaction enhancement for', formattedTransactions.length, 'transactions');
      const enhancedTransactions = await this.enhancementService.enhanceTransactions(
        formattedTransactions,
        safeAddress
      );
      console.log('✅ Transaction enhancement completed');

      // Apply filters if provided
      const filteredTransactions = filters
        ? this.applyFilters(enhancedTransactions, filters)
        : enhancedTransactions;

      // Determine if there are more pages
      const hasMore = executedTxs.length > limit;

      return {
        transactions: filteredTransactions,
        totalCount: -1, // We don't know total count without fetching all
        hasMore,
        nextOffset: offset + limit,
        cacheKey: `${safeAddress}_${page}`
      };
    } catch (error) {
      console.error('Error fetching transaction page:', error);
      throw error;
    }
  }

  /**
   * Format pending transaction for display with stable status
   */
  private async formatPendingTransaction(tx: any, safeAddress: string): Promise<any> {
    // Create a stable ID that won't change between refreshes
    const stableId = tx.safeTxHash || `pending_${tx.nonce}_${safeAddress}`;

    const formattedTx = {
      id: stableId,
      safeTxHash: tx.safeTxHash,
      from: safeAddress,
      to: tx.to,
      value: tx.value || '0',
      amount: tx.value || '0',
      data: tx.data,
      operation: tx.operation,
      nonce: tx.nonce,
      submissionDate: tx.submissionDate,
      confirmations: Array.isArray(tx.confirmations) ? tx.confirmations.length : 0,
      threshold: tx.confirmationsRequired || 1,
      proposer: tx.proposer,
      executor: undefined, // Pending transactions don't have executors yet
      gasToken: tx.gasToken,
      safeTxGas: tx.safeTxGas,
      baseGas: tx.baseGas,
      gasPrice: tx.gasPrice,
      refundReceiver: tx.refundReceiver,
      signatures: Array.isArray(tx.confirmations) ? tx.confirmations.map((c: any) => c.signature) : [],
      status: 'pending' as const, // Always pending for this formatter
      isExecuted: false,
      timestamp: tx.timestamp || new Date(tx.submissionDate).getTime() / 1000,
      type: this.determineTransactionType(tx),
      blockNumber: undefined, // Pending transactions don't have block numbers
      transactionHash: undefined, // Pending transactions don't have execution hashes
      _isStable: true // Flag to indicate this is a stable status
    };

    // Enhance with token transfer information
    return await this.enhancementService.enhanceTransaction(formattedTx, safeAddress);
  }

  /**
   * Format executed transaction for display with stable status
   */
  private formatExecutedTransaction(tx: any, safeAddress: string): any {
    // Note: Enhancement with token info happens in fetchTransactionPage
    return {
      id: tx.safeTxHash || tx.transactionHash,
      safeTxHash: tx.safeTxHash,
      executionTxHash: tx.transactionHash || undefined,
      from: safeAddress,
      to: tx.to,
      value: tx.value || '0',
      amount: tx.value || '0',
      data: tx.data,
      operation: tx.operation,
      gasToken: tx.gasToken,
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      nonce: tx.nonce,
      executor: tx.executor,
      blockNumber: tx.blockNumber,
      timestamp: tx.timestamp,
      status: 'executed' as const, // Always executed for this formatter
      isExecuted: true,
      confirmations: Array.isArray(tx.confirmations) ? tx.confirmations.length : tx.confirmationsRequired || 1,
      threshold: tx.confirmationsRequired || 1,
      type: this.determineTransactionType(tx),
      submissionDate: tx.submissionDate,
      logs: tx.logs || [], // Add logs for token transfer detection
      _isStable: true // Flag to indicate this is a stable status
    };
  }

  /**
   * Determine transaction type based on data
   */
  private determineTransactionType(tx: any): 'send' | 'receive' | 'contract' | 'swap' {
    if (!tx.data || tx.data === '0x') {
      return tx.value && tx.value !== '0' ? 'send' : 'receive';
    }
    
    // Check for common contract interactions
    if (tx.data.startsWith('0xa9059cbb')) return 'send'; // ERC20 transfer
    if (tx.data.startsWith('0x095ea7b3')) return 'contract'; // ERC20 approve
    if (tx.data.includes('swap') || tx.data.includes('exchange')) return 'swap';
    
    return 'contract';
  }

  /**
   * Apply filters to transactions
   */
  private applyFilters(transactions: any[], filters: TransactionFilters): any[] {
    return transactions.filter(tx => {
      // Status filter
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'executed' && tx.status !== 'executed') return false;
        if (filters.status === 'pending' && tx.status !== 'pending') return false;
        if (filters.status === 'failed' && tx.status !== 'failed') return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const txDate = new Date(tx.timestamp * 1000);
        if (txDate < filters.dateRange.from || txDate > filters.dateRange.to) {
          return false;
        }
      }

      // Value range filter
      if (filters.minValue || filters.maxValue) {
        const value = parseFloat(tx.value || '0');
        if (filters.minValue && value < parseFloat(filters.minValue)) return false;
        if (filters.maxValue && value > parseFloat(filters.maxValue)) return false;
      }

      return true;
    });
  }

  /**
   * Preload next pages in background
   */
  private async preloadNextPages(
    safeAddress: string,
    currentPage: number,
    filters?: TransactionFilters
  ): Promise<void> {
    const fetchPage = async (page: number): Promise<TransactionPage> => {
      return this.fetchTransactionPage(safeAddress, page, filters);
    };

    await transactionCacheService.preloadNextPages(
      safeAddress,
      currentPage,
      fetchPage,
      this.PRELOAD_PAGES
    );
  }

  /**
   * Get transaction status with caching
   */
  async getTransactionStatus(safeTxHash: string): Promise<any> {
    const cacheKey = `tx_status_${safeTxHash}`;
    
    return transactionCacheService.deduplicateRequest(cacheKey, async () => {
      // Implementation would call the existing transaction status logic
      // This is a placeholder for the actual implementation
      return { status: 'pending', confirmations: 0 };
    });
  }

  /**
   * Invalidate cache for a Safe address (call when new transaction is created)
   */
  invalidateCache(safeAddress: string): void {
    transactionCacheService.invalidateCache(safeAddress);
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return transactionCacheService.getCacheStats();
  }

  /**
   * Search transactions by hash, address, or value
   */
  async searchTransactions(
    safeAddress: string,
    query: string,
    maxResults: number = 50
  ): Promise<any[]> {
    // For now, search through cached data
    // In a full implementation, this could use a search API
    const results: any[] = [];
    let page = 0;
    
    while (results.length < maxResults) {
      const cached = await transactionCacheService.getCachedTransactionPage(safeAddress, page);
      if (!cached || !cached.hasMore) break;
      
      const matches = cached.transactions.filter(tx => 
        tx.safeTxHash?.toLowerCase().includes(query.toLowerCase()) ||
        tx.executionTxHash?.toLowerCase().includes(query.toLowerCase()) ||
        tx.to?.toLowerCase().includes(query.toLowerCase()) ||
        tx.value?.includes(query)
      );
      
      results.push(...matches);
      page++;
    }
    
    return results.slice(0, maxResults);
  }
}

// Create factory function instead of singleton to support multiple networks
export const createOptimizedTransactionService = (network: string = 'ethereum') =>
  new OptimizedTransactionService(network);

// Default instance for backward compatibility (will be deprecated)
export const optimizedTransactionService = new OptimizedTransactionService('ethereum');
