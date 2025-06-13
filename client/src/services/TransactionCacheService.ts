/**
 * High-performance caching service for Safe transaction data
 * Implements multi-level caching with automatic invalidation
 */

export interface CachedTransaction {
  id: string;
  safeTxHash: string;
  data: any;
  timestamp: number;
  blockNumber?: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
}

export interface TransactionPage {
  transactions: any[];
  totalCount: number;
  hasMore: boolean;
  nextOffset: number;
  cacheKey: string;
}

export class TransactionCacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private persistentCache: Storage | null = null;
  private requestCache = new Map<string, Promise<any>>();
  
  // Cache configuration
  private readonly MEMORY_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly PERSISTENT_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_MEMORY_ENTRIES = 1000;
  private readonly PAGE_SIZE = 20;

  constructor() {
    // Use localStorage for persistent caching if available
    if (typeof window !== 'undefined' && window.localStorage) {
      this.persistentCache = window.localStorage;
    }
    
    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Generate cache key for Safe transaction history
   */
  private getCacheKey(safeAddress: string, page: number = 0, filters?: any): string {
    const filterStr = filters ? JSON.stringify(filters) : '';
    return `tx_history_${safeAddress}_${page}_${filterStr}`;
  }

  /**
   * Get cached transaction page
   */
  async getCachedTransactionPage(
    safeAddress: string, 
    page: number = 0,
    filters?: any
  ): Promise<TransactionPage | null> {
    const cacheKey = this.getCacheKey(safeAddress, page, filters);
    
    // Check memory cache first (fastest)
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.data;
    }

    // Check persistent cache (slower but still fast)
    if (this.persistentCache) {
      try {
        const persistentData = this.persistentCache.getItem(cacheKey);
        if (persistentData) {
          const entry: CacheEntry<TransactionPage> = JSON.parse(persistentData);
          if (entry.expiresAt > Date.now()) {
            // Restore to memory cache for faster access
            this.setMemoryCache(cacheKey, entry.data, this.MEMORY_TTL);
            return entry.data;
          }
        }
      } catch (error) {
        console.warn('Error reading from persistent cache:', error);
      }
    }

    return null;
  }

  /**
   * Cache transaction page with multi-level storage
   */
  async cacheTransactionPage(
    safeAddress: string,
    page: number,
    data: TransactionPage,
    filters?: any
  ): Promise<void> {
    const cacheKey = this.getCacheKey(safeAddress, page, filters);
    
    // Store in memory cache
    this.setMemoryCache(cacheKey, data, this.MEMORY_TTL);
    
    // Store in persistent cache
    if (this.persistentCache) {
      try {
        const entry: CacheEntry<TransactionPage> = {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.PERSISTENT_TTL,
          key: cacheKey
        };
        this.persistentCache.setItem(cacheKey, JSON.stringify(entry));
      } catch (error) {
        console.warn('Error writing to persistent cache:', error);
      }
    }
  }

  /**
   * Set memory cache with automatic cleanup
   */
  private setMemoryCache(key: string, data: any, ttl: number): void {
    // Cleanup if cache is getting too large
    if (this.memoryCache.size >= this.MAX_MEMORY_ENTRIES) {
      this.cleanupMemoryCache();
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      key
    });
  }

  /**
   * Deduplicate concurrent requests for the same data
   */
  async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If request is already in progress, return the existing promise
    if (this.requestCache.has(key)) {
      return this.requestCache.get(key)!;
    }

    // Start new request and cache the promise
    const promise = requestFn().finally(() => {
      // Remove from request cache when completed
      this.requestCache.delete(key);
    });

    this.requestCache.set(key, promise);
    return promise;
  }

  /**
   * Invalidate cache for a specific Safe address
   */
  invalidateCache(safeAddress: string): void {
    const pattern = `tx_history_${safeAddress}_`;
    
    // Clear memory cache
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((_, key) => {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Clear persistent cache
    if (this.persistentCache) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < this.persistentCache.length; i++) {
          const key = this.persistentCache.key(i);
          if (key && key.startsWith(pattern)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => this.persistentCache!.removeItem(key));
      } catch (error) {
        console.warn('Error clearing persistent cache:', error);
      }
    }
  }

  /**
   * Preload next pages in background
   */
  async preloadNextPages(
    safeAddress: string,
    currentPage: number,
    fetchFn: (page: number) => Promise<TransactionPage>,
    pagesToPreload: number = 2
  ): Promise<void> {
    const preloadPromises: Promise<void>[] = [];

    for (let i = 1; i <= pagesToPreload; i++) {
      const nextPage = currentPage + i;
      const cacheKey = this.getCacheKey(safeAddress, nextPage);
      
      // Only preload if not already cached
      if (!this.memoryCache.has(cacheKey)) {
        const preloadPromise = this.deduplicateRequest(
          `preload_${cacheKey}`,
          () => fetchFn(nextPage)
        ).then(data => {
          this.cacheTransactionPage(safeAddress, nextPage, data);
        }).catch(error => {
          console.warn(`Error preloading page ${nextPage}:`, error);
        });
        
        preloadPromises.push(preloadPromise);
      }
    }

    // Run preloading in background without blocking
    Promise.all(preloadPromises).catch(() => {
      // Ignore preload errors
    });
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    memoryEntries: number;
    persistentEntries: number;
    activeRequests: number;
    memorySize: string;
  } {
    let persistentEntries = 0;
    if (this.persistentCache) {
      try {
        persistentEntries = this.persistentCache.length;
      } catch (error) {
        // Ignore errors
      }
    }

    return {
      memoryEntries: this.memoryCache.size,
      persistentEntries,
      activeRequests: this.requestCache.size,
      memorySize: `${Math.round(JSON.stringify(Array.from(this.memoryCache.values())).length / 1024)}KB`
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    this.cleanupMemoryCache();
    this.cleanupPersistentCache();
  }

  /**
   * Cleanup expired memory cache entries
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.memoryCache.delete(key));
  }

  /**
   * Cleanup expired persistent cache entries
   */
  private cleanupPersistentCache(): void {
    if (!this.persistentCache) return;

    try {
      const now = Date.now();
      const keysToRemove: string[] = [];

      for (let i = 0; i < this.persistentCache.length; i++) {
        const key = this.persistentCache.key(i);
        if (key && key.startsWith('tx_history_')) {
          try {
            const data = this.persistentCache.getItem(key);
            if (data) {
              const entry = JSON.parse(data);
              if (entry.expiresAt <= now) {
                keysToRemove.push(key);
              }
            }
          } catch (error) {
            // Remove corrupted entries
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => this.persistentCache!.removeItem(key));
    } catch (error) {
      console.warn('Error during persistent cache cleanup:', error);
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.memoryCache.clear();
    this.requestCache.clear();
    
    if (this.persistentCache) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < this.persistentCache.length; i++) {
          const key = this.persistentCache.key(i);
          if (key && key.startsWith('tx_history_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => this.persistentCache!.removeItem(key));
      } catch (error) {
        console.warn('Error clearing persistent cache:', error);
      }
    }
  }
}

// Singleton instance
export const transactionCacheService = new TransactionCacheService();
