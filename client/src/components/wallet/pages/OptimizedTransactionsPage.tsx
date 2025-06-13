/**
 * Optimized Transactions Page with caching, pagination, and infinite scroll
 */

import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { VitoList } from '@components/vitoUI';
import { formatWalletAddress } from '@utils';
import { Transaction } from '../types';
import { useInfiniteTransactionHistory } from '../../../hooks/useOptimizedTransactionHistory';
import { TransactionFilters } from '../../../services/OptimizedTransactionService';

// Styled components (reusing from original)
const Container = styled.div`
  padding: 24px;
  max-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
`;

const Heading = styled.h1`
  font-size: 24px;
  font-weight: 500;
  color: #fff;
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  background: #374151;
  color: #fff;
  border: 1px solid #4b5563;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  width: 200px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const FilterSelect = styled.select`
  background: #374151;
  color: #fff;
  border: 1px solid #4b5563;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const RefreshButton = styled.button`
  background: #374151;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: #4b5563;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  margin-bottom: 16px;
  font-size: 14px;
  color: #9ca3af;
`;

const TransactionList = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 0;
`;

const LoadMoreButton = styled.button`
  width: 100%;
  background: #374151;
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 16px;
  
  &:hover {
    background: #4b5563;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  color: #9ca3af;
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  background: #1f2937;
  border: 1px solid #ef4444;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
  
  h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
`;

const CacheStats = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-left: auto;
`;

interface OptimizedTransactionsPageProps {
  safeAddress: string;
}

const OptimizedTransactionsPage: React.FC<OptimizedTransactionsPageProps> = ({
  safeAddress
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'executed' | 'pending' | 'failed'>('all');
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

  // Render transaction item (simplified version)
  const renderTransactionItem = useCallback((tx: Transaction) => (
    <div key={tx.id} style={{ 
      padding: '16px', 
      borderBottom: '1px solid #374151',
      cursor: 'pointer'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: '500', color: '#fff' }}>
            {tx.type ? (tx.type.charAt(0).toUpperCase() + tx.type.slice(1)) : 'Transaction'}
          </div>
          <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>
            To: {formatWalletAddress(tx.to)}
          </div>
          {tx.safeTxHash && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              Safe TX: {formatWalletAddress(tx.safeTxHash)}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: '500', color: '#fff' }}>
            {ethers.utils.formatEther(tx.amount || '0')} ETH
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: tx.status === 'executed' ? '#10b981' :
                   tx.status === 'pending' ? '#f59e0b' : '#ef4444',
            marginTop: '4px'
          }}>
            {tx.status ? (tx.status.charAt(0).toUpperCase() + tx.status.slice(1)) : 'Unknown'}
          </div>
          {tx.confirmations !== undefined && tx.threshold && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              {tx.confirmations}/{tx.threshold} confirmations
            </div>
          )}
        </div>
      </div>
    </div>
  ), []);

  return (
    <Container>
      <Header>
        <Heading>Transactions</Heading>
        <Controls>
          <SearchInput
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <FilterSelect
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value as typeof statusFilter)}
          >
            <option value="all">All Status</option>
            <option value="executed">Executed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </FilterSelect>
          <RefreshButton onClick={refresh} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </RefreshButton>
          <button 
            onClick={() => setShowCacheStats(!showCacheStats)}
            style={{ fontSize: '12px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
          >
            Cache Stats
          </button>
        </Controls>
      </Header>

      <StatsBar>
        <div>
          {totalCount > 0 ? `${totalCount} total transactions` : `${transactions.length} transactions`}
          {currentPage > 0 && ` (page ${currentPage + 1})`}
        </div>
        {showCacheStats && (
          <CacheStats>
            Memory: {cacheStats.memoryEntries} entries ({cacheStats.memorySize}) | 
            Persistent: {cacheStats.persistentEntries} entries | 
            Active: {cacheStats.activeRequests} requests
          </CacheStats>
        )}
      </StatsBar>

      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}

      <TransactionList>
        {isLoading && transactions.length === 0 ? (
          <LoadingSpinner>Loading transactions...</LoadingSpinner>
        ) : transactions.length === 0 ? (
          <EmptyState>
            <h3>No transactions found</h3>
            <p>
              {searchQuery 
                ? `No transactions match "${searchQuery}"`
                : 'This Safe has no transactions yet'
              }
            </p>
          </EmptyState>
        ) : (
          <>
            {transactions.map(tx => renderTransactionItem(formatTransaction(tx)))}
            
            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={loadMoreRef}>
                {isLoadingMore ? (
                  <LoadingSpinner>Loading more transactions...</LoadingSpinner>
                ) : (
                  <LoadMoreButton onClick={loadMore} disabled={isLoadingMore}>
                    Load More Transactions
                  </LoadMoreButton>
                )}
              </div>
            )}
          </>
        )}
      </TransactionList>
    </Container>
  );
};

export default OptimizedTransactionsPage;
