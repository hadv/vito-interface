/**
 * Enhanced Transactions Page - Human-friendly transaction history
 * Focuses on what happened with clear state changes and flow indicators
 */

import React, { useState, useMemo } from 'react';
import { ethers } from 'ethers';
import { useInfiniteTransactionHistory } from '../../../hooks/useOptimizedTransactionHistory';
import { TransactionFilters } from '../../../services/OptimizedTransactionService';
import EnhancedTransactionList from '../components/EnhancedTransactionList';

interface EnhancedTransactionsPageProps {
  safeAddress: string;
  network: string;
}

// Filter options for transaction types
const FILTER_OPTIONS = [
  { value: 'all', label: 'All Activity', icon: '📋' },
  { value: 'in', label: 'Received', icon: '↓', color: 'text-sky-400' },
  { value: 'out', label: 'Sent', icon: '↑', color: 'text-red-400' },
  { value: 'contract', label: 'Contracts', icon: '⚙️', color: 'text-blue-400' },
  { value: 'failed', label: 'Failed', icon: '✗', color: 'text-red-400' }
];

const EnhancedTransactionsPage: React.FC<EnhancedTransactionsPageProps> = ({
  safeAddress,
  network
}) => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create filters for the hook
  const filters = useMemo((): TransactionFilters => ({
    status: selectedFilter === 'failed' ? 'failed' : undefined
  }), [selectedFilter]);

  // Use the optimized transaction history hook
  const {
    transactions,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    loadMoreRef
  } = useInfiniteTransactionHistory(safeAddress, network, filters);

  // Filter transactions based on selected filter and search
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply type filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(tx => {
        const isIncoming = tx.to.toLowerCase() === safeAddress.toLowerCase();
        const isOutgoing = tx.from.toLowerCase() === safeAddress.toLowerCase();
        const hasData = tx.data && tx.data !== '0x' && tx.data.length > 2;
        const value = ethers.BigNumber.from(tx.value || tx.amount || '0');
        const hasValue = !value.isZero();

        switch (selectedFilter) {
          case 'in':
            return isIncoming && hasValue;
          case 'out':
            return isOutgoing && hasValue && !hasData;
          case 'contract':
            return hasData;
          case 'failed':
            return tx.status === 'failed';
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.to.toLowerCase().includes(query) ||
        tx.from.toLowerCase().includes(query) ||
        tx.safeTxHash?.toLowerCase().includes(query) ||
        tx.executionTxHash?.toLowerCase().includes(query) ||
        tx.hash?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [transactions, selectedFilter, searchQuery, safeAddress]);

  // Calculate overview statistics
  const overview = useMemo(() => {
    const stats = {
      totalTransactions: transactions.length,
      totalReceived: ethers.BigNumber.from(0),
      totalSent: ethers.BigNumber.from(0),
      contractInteractions: 0,
      failedTransactions: 0
    };

    transactions.forEach(tx => {
      const value = ethers.BigNumber.from(tx.value || tx.amount || '0');
      const isIncoming = tx.to.toLowerCase() === safeAddress.toLowerCase();
      const hasData = tx.data && tx.data !== '0x' && tx.data.length > 2;

      if (isIncoming && !value.isZero()) {
        stats.totalReceived = stats.totalReceived.add(value);
      } else if (!value.isZero()) {
        stats.totalSent = stats.totalSent.add(value);
      }

      if (hasData) {
        stats.contractInteractions++;
      }

      if (tx.status === 'failed') {
        stats.failedTransactions++;
      }
    });

    return stats;
  }, [transactions, safeAddress]);

  const formatEthAmount = (amount: ethers.BigNumber): string => {
    if (amount.isZero()) return '0';
    const formatted = ethers.utils.formatEther(amount);
    const num = parseFloat(formatted);
    return num >= 1 ? num.toFixed(4) : num.toFixed(6);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">
            {overview.totalTransactions}
          </div>
          <div className="text-sm text-gray-400">Total Transactions</div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-sky-400">
            {formatEthAmount(overview.totalReceived)}
          </div>
          <div className="text-sm text-gray-400">ETH Received</div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">
            {formatEthAmount(overview.totalSent)}
          </div>
          <div className="text-sm text-gray-400">ETH Sent</div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            {overview.contractInteractions}
          </div>
          <div className="text-sm text-gray-400">Contract Calls</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="space-y-4">
        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedFilter(option.value)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
                transition-colors duration-200
                ${selectedFilter === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }
              `}
            >
              <span>{option.icon}</span>
              <span className={option.color || ''}>{option.label}</span>
              {option.value !== 'all' && (
                <span className="bg-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                  {option.value === 'in' ? transactions.filter(tx => 
                    tx.to.toLowerCase() === safeAddress.toLowerCase() && 
                    !ethers.BigNumber.from(tx.value || tx.amount || '0').isZero()
                  ).length :
                  option.value === 'out' ? transactions.filter(tx => 
                    tx.from.toLowerCase() === safeAddress.toLowerCase() && 
                    !ethers.BigNumber.from(tx.value || tx.amount || '0').isZero() &&
                    (!tx.data || tx.data === '0x' || tx.data.length <= 2)
                  ).length :
                  option.value === 'contract' ? overview.contractInteractions :
                  option.value === 'failed' ? overview.failedTransactions :
                  0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by address or transaction hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg
              text-white placeholder-gray-400 focus:outline-none focus:border-blue-500
              focus:ring-1 focus:ring-blue-500
            "
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div>
            {filteredTransactions.length === transactions.length 
              ? `${transactions.length} transactions`
              : `${filteredTransactions.length} of ${transactions.length} transactions`
            }
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
          
          <button
            onClick={refresh}
            className="flex items-center space-x-1 text-blue-400 hover:text-blue-300"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <div className="text-red-400 font-medium">Error loading transactions</div>
          <div className="text-red-300 text-sm mt-1">{error}</div>
        </div>
      )}

      {/* Transaction list */}
      <EnhancedTransactionList
        transactions={filteredTransactions}
        safeAddress={safeAddress}
        network={network}
        isLoading={isLoading}
      />

      {/* Load more trigger */}
      {hasMore && !isLoading && (
        <div ref={loadMoreRef} className="py-4">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="
              w-full py-3 bg-gray-800/50 hover:bg-gray-700/50 
              border border-gray-700 rounded-lg text-gray-300
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            {isLoadingMore ? 'Loading more...' : 'Load more transactions'}
          </button>
        </div>
      )}
    </div>
  );
};

export default EnhancedTransactionsPage;
