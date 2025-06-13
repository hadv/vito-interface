/**
 * Optimized transaction service with caching, pagination, and background loading
 */

import { transactionCacheService, TransactionPage } from './TransactionCacheService';
import { OnChainDataService } from './OnChainDataService';
import { SafeWalletService } from './SafeWalletService';

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
  private readonly PAGE_SIZE = 20;
  private readonly PRELOAD_PAGES = 2;

  constructor(network: string = 'ethereum') {
    this.onChainService = new OnChainDataService(network);
    this.safeWalletService = new SafeWalletService();
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
      // Fetch executed transactions
      const executedTxs = await this.onChainService.getSafeTransactionHistory(
        safeAddress,
        limit + 1, // Fetch one extra to check if there are more
        offset
      );

      // Fetch pending transactions only for first page
      let pendingTxs: any[] = [];
      if (page === 0) {
        pendingTxs = await this.onChainService.getSafePendingTransactions(
          safeAddress,
          50, // Reasonable limit for pending transactions
          0
        );
      }

      // Combine and format transactions
      const allTransactions = [
        ...pendingTxs.map(tx => this.formatPendingTransaction(tx, safeAddress)),
        ...executedTxs.slice(0, limit).map(tx => this.formatExecutedTransaction(tx, safeAddress))
      ];

      // Apply filters if provided
      const filteredTransactions = filters 
        ? this.applyFilters(allTransactions, filters)
        : allTransactions;

      // Determine if there are more pages
      const hasMore = executedTxs.length > limit || (page === 0 && pendingTxs.length >= 50);

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
  private formatPendingTransaction(tx: any, safeAddress: string): any {
    // Create a stable ID that won't change between refreshes
    const stableId = tx.safeTxHash || `pending_${tx.nonce}_${safeAddress}`;

    return {
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
      confirmations: tx.confirmations?.length || 0,
      threshold: tx.confirmationsRequired || 1,
      proposer: tx.proposer,
      executor: tx.executor,
      gasToken: tx.gasToken,
      safeTxGas: tx.safeTxGas,
      baseGas: tx.baseGas,
      gasPrice: tx.gasPrice,
      refundReceiver: tx.refundReceiver,
      signatures: tx.confirmations?.map((c: any) => c.signature) || [],
      status: 'pending', // Always pending for this formatter
      isExecuted: false,
      timestamp: new Date(tx.submissionDate).getTime() / 1000,
      type: this.determineTransactionType(tx),
      _isStable: true // Flag to indicate this is a stable status
    };
  }

  /**
   * Format executed transaction for display with stable status
   */
  private formatExecutedTransaction(tx: any, safeAddress: string): any {
    return {
      id: tx.safeTxHash || tx.transactionHash,
      safeTxHash: tx.safeTxHash,
      executionTxHash: tx.transactionHash,
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
      status: 'executed', // Always executed for this formatter
      isExecuted: true,
      confirmations: 999, // Executed transactions are fully confirmed
      threshold: 1,
      type: this.determineTransactionType(tx),
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

// Create singleton instance
export const optimizedTransactionService = new OptimizedTransactionService();
