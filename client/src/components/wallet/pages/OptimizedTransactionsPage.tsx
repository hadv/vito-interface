/**
 * Optimized Transactions Page with caching, pagination, and infinite scroll
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { formatWalletAddress, getEtherscanTransactionUrl, getSafeTransactionUrl } from '@utils';
import { Transaction } from '../types';
import { useInfiniteTransactionHistory } from '../../../hooks/useOptimizedTransactionHistory';
import { TransactionFilters } from '../../../services/OptimizedTransactionService';

// Tailwind CSS classes for styling
const containerClasses = "p-6 max-h-screen overflow-hidden flex flex-col bg-gray-900 text-white";
const headerClasses = "flex justify-between items-center mb-6 gap-4 flex-wrap";
const headingClasses = "text-2xl font-medium text-white m-0";
const controlsClasses = "flex gap-3 items-center flex-wrap";
const searchInputClasses = "bg-gray-700 text-white border border-gray-600 px-3 py-2 rounded-md text-sm w-48 focus:outline-none focus:border-blue-500 placeholder-gray-400";
const filterSelectClasses = "bg-gray-700 text-white border border-gray-600 px-3 py-2 rounded-md text-sm focus:outline-none focus:border-blue-500";
const refreshButtonClasses = "bg-gray-700 text-white border-none px-4 py-2 rounded-md cursor-pointer text-sm hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed";
const statsBarClasses = "flex justify-between items-center py-2 mb-4 text-sm text-gray-400";
const transactionListClasses = "flex-1 overflow-y-auto min-h-0";
const loadMoreButtonClasses = "w-full bg-gray-700 text-white border-none p-3 rounded-md cursor-pointer text-sm mt-4 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed";
const loadingSpinnerClasses = "flex justify-center items-center p-5 text-gray-400";
const errorMessageClasses = "text-red-400 bg-gray-800 border border-red-400 p-3 rounded-md mb-4 text-sm";
const emptyStateClasses = "text-center py-15 px-5 text-gray-400";
const cacheStatsClasses = "text-xs text-gray-500 ml-auto";

interface OptimizedTransactionsPageProps {
  safeAddress: string;
  network?: string;
}

const OptimizedTransactionsPage: React.FC<OptimizedTransactionsPageProps> = ({
  safeAddress,
  network = 'ethereum'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'executed'>('all');
  const [showCacheStats, setShowCacheStats] = useState(false);

  // Create filters object
  const filters = useMemo((): TransactionFilters => ({
    status: statusFilter === 'all' ? undefined : statusFilter
  }), [statusFilter]);

  // Use optimized transaction history hook
  const {
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
    cacheStats,
    loadMoreRef
  } = useInfiniteTransactionHistory(safeAddress, filters);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      await search(query);
    } else {
      // Clear search and reload normal view
      await search('');
    }
  }, [search]);

  // Handle filter change
  const handleFilterChange = useCallback((newStatus: typeof statusFilter) => {
    setStatusFilter(newStatus);
    applyFilters({ status: newStatus === 'all' ? undefined : newStatus });
  }, [applyFilters]);

  // Handle transaction click to open in block explorer
  const handleTransactionClick = useCallback((tx: Transaction) => {
    let url: string;

    if (tx.executionTxHash) {
      // For executed transactions, open the execution transaction in block explorer
      url = getEtherscanTransactionUrl(tx.executionTxHash, network);
    } else if (tx.safeTxHash) {
      // Fallback: open in Safe app
      url = getSafeTransactionUrl(safeAddress, tx.safeTxHash, network);
    } else {
      // Last fallback: open Safe address page
      url = `https://app.safe.global/home?safe=${network}:${safeAddress}`;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }, [safeAddress, network]);

  // Format transaction for display
  const formatTransaction = useCallback((tx: any): Transaction => ({
    id: tx.id,
    from: tx.from,
    to: tx.to,
    amount: tx.amount || tx.value || '0',
    status: tx.status,
    timestamp: tx.timestamp,
    type: tx.type || 'contract',
    safeTxHash: tx.safeTxHash,
    executionTxHash: tx.executionTxHash,
    confirmations: tx.confirmations,
    threshold: tx.threshold,
    gasUsed: tx.gasUsed,
    gasPrice: tx.gasPrice,
    blockNumber: tx.blockNumber,
    nonce: tx.nonce,
    operation: tx.operation,
    data: tx.data,
    executor: tx.executor,
    isExecuted: tx.isExecuted,
    submissionDate: tx.submissionDate,
    proposer: tx.proposer,
    signatures: tx.signatures
  }), []);

  // Render transaction item with proper Tailwind styling and click handler
  const renderTransactionItem = useCallback((tx: Transaction) => (
    <div
      key={tx.id}
      className="p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-800/50 transition-colors"
      onClick={() => handleTransactionClick(tx)}
      title="Click to view on block explorer"
    >
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="font-medium text-white flex items-center gap-2">
            {tx.type ? (tx.type.charAt(0).toUpperCase() + tx.type.slice(1)) : 'Transaction'}
            {/* Status indicator - all transactions are executed */}
            <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
          </div>
          <div className="text-sm text-gray-400 mt-1">
            To: {formatWalletAddress(tx.to)}
          </div>
          {tx.safeTxHash && (
            <div className="text-xs text-gray-500 mt-0.5">
              Safe TX: {formatWalletAddress(tx.safeTxHash)}
            </div>
          )}
          {tx.executionTxHash && (
            <div className="text-xs text-gray-500 mt-0.5">
              Execution TX: {formatWalletAddress(tx.executionTxHash)}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="font-medium text-white">
            {ethers.utils.formatEther(tx.amount || '0')} ETH
          </div>
          <div className="text-xs mt-1 font-medium text-green-400">
            Executed
          </div>
          {tx.blockNumber && (
            <div className="text-xs text-gray-500 mt-0.5">
              Block: {tx.blockNumber}
            </div>
          )}
        </div>
      </div>
    </div>
  ), [handleTransactionClick]);

  return (
    <div className={containerClasses}>
      <div className={headerClasses}>
        <h1 className={headingClasses}>Transactions</h1>
        <div className={controlsClasses}>
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className={searchInputClasses}
          />
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value as typeof statusFilter)}
            className={filterSelectClasses}
          >
            <option value="all">All Transactions</option>
            <option value="executed">Executed Only</option>
          </select>
          <button onClick={refresh} disabled={isLoading} className={refreshButtonClasses}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowCacheStats(!showCacheStats)}
            className="text-xs bg-transparent border-none text-gray-500 cursor-pointer"
          >
            Cache Stats
          </button>
        </div>
      </div>

      <div className={statsBarClasses}>
        <div>
          {totalCount > 0 ? `${totalCount} total transactions` : `${transactions.length} transactions`}
          {currentPage > 0 && ` (page ${currentPage + 1})`}
        </div>
        {showCacheStats && (
          <div className={cacheStatsClasses}>
            Memory: {cacheStats.memoryEntries} entries ({cacheStats.memorySize}) |
            Persistent: {cacheStats.persistentEntries} entries |
            Active: {cacheStats.activeRequests} requests
          </div>
        )}
      </div>

      {error && (
        <div className={errorMessageClasses}>
          {error}
        </div>
      )}

      <div className={transactionListClasses}>
        {isLoading && transactions.length === 0 ? (
          <div className={loadingSpinnerClasses}>Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className={emptyStateClasses}>
            <h3 className="m-0 mb-2 text-lg">No transactions found</h3>
            <p className="m-0 text-sm">
              {searchQuery
                ? `No transactions match "${searchQuery}"`
                : 'This Safe has no transactions yet'
              }
            </p>
          </div>
        ) : (
          <>
            {transactions.map(tx => renderTransactionItem(formatTransaction(tx)))}

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={loadMoreRef}>
                {isLoadingMore ? (
                  <div className={loadingSpinnerClasses}>Loading more transactions...</div>
                ) : (
                  <button onClick={loadMore} disabled={isLoadingMore} className={loadMoreButtonClasses}>
                    Load More Transactions
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OptimizedTransactionsPage;
