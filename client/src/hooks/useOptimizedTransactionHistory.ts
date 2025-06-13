/**
 * Optimized React hook for transaction history with caching and pagination
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { optimizedTransactionService, TransactionFilters } from '../services/OptimizedTransactionService';

export interface UseOptimizedTransactionHistoryResult {
  transactions: any[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
  
  // Actions
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  search: (query: string) => Promise<void>;
  applyFilters: (filters: TransactionFilters) => void;
  
  // Cache info
  cacheStats: any;
}

export const useOptimizedTransactionHistory = (
  safeAddress: string | null,
  initialFilters?: TransactionFilters,
  autoLoad: boolean = true
): UseOptimizedTransactionHistoryResult => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<TransactionFilters | undefined>(initialFilters);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitialLoadRef = useRef(true);

  /**
   * Load transaction page
   */
  const loadPage = useCallback(async (
    page: number, 
    append: boolean = false,
    showLoading: boolean = true
  ) => {
    if (!safeAddress) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (showLoading) {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }
      }
      setError(null);

      const result = await optimizedTransactionService.getTransactionHistory(
        safeAddress,
        page,
        filters
      );

      if (append) {
        setTransactions(prev => [...prev, ...result.transactions]);
      } else {
        setTransactions(result.transactions);
      }

      setHasMore(result.hasMore);
      setCurrentPage(page);
      
      if (result.totalCount > 0) {
        setTotalCount(result.totalCount);
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load transactions');
        console.error('Error loading transactions:', err);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [safeAddress, filters]);

  /**
   * Load more transactions (next page)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    await loadPage(currentPage + 1, true);
  }, [hasMore, isLoadingMore, currentPage, loadPage]);

  /**
   * Refresh transaction history (reload from page 0)
   */
  const refresh = useCallback(async () => {
    if (!safeAddress) return;
    
    // Invalidate cache for this Safe
    optimizedTransactionService.invalidateCache(safeAddress);
    
    setCurrentPage(0);
    setHasMore(true);
    await loadPage(0, false);
  }, [safeAddress, loadPage]);

  /**
   * Search transactions
   */
  const search = useCallback(async (query: string) => {
    if (!safeAddress) return;

    setSearchQuery(query);
    
    if (!query.trim()) {
      // If search is cleared, reload normal view
      await loadPage(0, false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const results = await optimizedTransactionService.searchTransactions(
        safeAddress,
        query,
        100
      );

      setTransactions(results);
      setHasMore(false); // Search results don't support pagination
      setCurrentPage(0);
      
    } catch (err: any) {
      setError(err.message || 'Search failed');
      console.error('Error searching transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [safeAddress, loadPage]);

  /**
   * Apply filters and reload
   */
  const applyFilters = useCallback((newFilters: TransactionFilters) => {
    setFilters(newFilters);
    setCurrentPage(0);
    setHasMore(true);
    // loadPage will be called by useEffect when filters change
  }, []);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return optimizedTransactionService.getCacheStats();
  }, []);

  // Initial load and filter changes
  useEffect(() => {
    if (safeAddress && autoLoad && !searchQuery) {
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        loadPage(0, false);
      } else {
        // Filters changed, reload
        loadPage(0, false);
      }
    }
  }, [safeAddress, autoLoad, filters, searchQuery, loadPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Background refresh every 60 seconds for first page (reduced frequency)
  useEffect(() => {
    if (!safeAddress || searchQuery) return;

    const interval = setInterval(async () => {
      // Only refresh if we're on the first page and not loading
      if (currentPage === 0 && !isLoading && !isLoadingMore) {
        try {
          // Load first page in background without showing loading state
          await loadPage(0, false, false);
        } catch (error) {
          // Ignore background refresh errors
        }
      }
    }, 60000); // 60 seconds (reduced from 30s to prevent flickering)

    return () => clearInterval(interval);
  }, [safeAddress, currentPage, isLoading, isLoadingMore, searchQuery, loadPage]);

  return {
    transactions,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    currentPage,
    totalCount,
    loadMore,
    refresh,
    search,
    applyFilters,
    cacheStats: getCacheStats()
  };
};

/**
 * Hook for infinite scroll implementation
 */
export const useInfiniteTransactionHistory = (
  safeAddress: string | null,
  filters?: TransactionFilters
) => {
  const result = useOptimizedTransactionHistory(safeAddress, filters);
  
  // Intersection Observer for infinite scroll with debouncing
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadMoreRef = useCallback((node: HTMLElement | null) => {
    if (result.isLoadingMore) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && result.hasMore && !result.isLoading && !result.isLoadingMore) {
        // Debounce the load more to prevent rapid firing
        if (loadMoreTimeoutRef.current) {
          clearTimeout(loadMoreTimeoutRef.current);
        }

        loadMoreTimeoutRef.current = setTimeout(() => {
          result.loadMore();
        }, 300); // 300ms debounce
      }
    }, {
      threshold: 0.1,
      rootMargin: '200px' // Start loading 200px before the element is visible
    });

    if (node) observerRef.current.observe(node);
  }, [result]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...result,
    loadMoreRef
  };
};

/**
 * Hook for virtual scrolling (for very large transaction lists)
 */
export const useVirtualizedTransactionHistory = (
  safeAddress: string | null,
  itemHeight: number = 80,
  containerHeight: number = 600
) => {
  const result = useOptimizedTransactionHistory(safeAddress);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const bufferSize = Math.floor(visibleCount / 2);

  const updateVisibleRange = useCallback((scrollTop: number) => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
    const end = Math.min(
      result.transactions.length,
      start + visibleCount + bufferSize * 2
    );

    setVisibleRange({ start, end });

    // Load more if we're near the end
    if (end > result.transactions.length - 10 && result.hasMore && !result.isLoadingMore) {
      result.loadMore();
    }
  }, [itemHeight, bufferSize, visibleCount, result]);

  const visibleTransactions = result.transactions.slice(visibleRange.start, visibleRange.end);
  const totalHeight = result.transactions.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    ...result,
    visibleTransactions,
    visibleRange,
    totalHeight,
    offsetY,
    updateVisibleRange
  };
};
