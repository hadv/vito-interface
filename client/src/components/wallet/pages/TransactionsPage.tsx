import React, { useState } from 'react';
import { ethers } from 'ethers';
import { VitoList } from '@components/vitoUI';
import { formatWalletAddress } from '@utils';
import { Transaction } from '../types';
import { useTransactionHistory, useMultipleTransactionStatus } from '../../../hooks/useTransactionStatus';
import OptimizedTransactionsPage from './OptimizedTransactionsPage';



// Tailwind CSS classes for the new tabbed interface
const containerClasses = "p-6 bg-gray-900 text-white min-h-screen";
const headingClasses = "text-2xl font-medium text-white mb-6";
const tabsContainerClasses = "flex border-b border-gray-700 mb-6";
const tabClasses = "px-4 py-2 text-sm font-medium cursor-pointer transition-colors";
const activeTabClasses = "text-blue-400 border-b-2 border-blue-400";
const inactiveTabClasses = "text-gray-400 hover:text-gray-300";
const tabContentClasses = "mt-6";

// Utility functions for dynamic styling
const getTransactionTypeColor = (txType: string) => {
  switch (txType) {
    case 'send': return 'text-red-400';
    case 'receive': return 'text-green-400';
    default: return 'text-white';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
    case 'executed': return 'text-green-400 bg-green-400/20';
    case 'pending': return 'text-yellow-400 bg-yellow-400/20';
    default: return 'text-red-400 bg-red-400/20';
  }
};

const getStatusIndicatorColor = (status: string) => {
  switch (status) {
    case 'executed': return 'bg-green-400';
    case 'confirmed': return 'bg-blue-400';
    case 'pending': return 'bg-yellow-400';
    default: return 'bg-red-400';
  }
};

const getConfirmationColor = (hasEnough: boolean) => {
  return hasEnough ? 'text-green-400' : 'text-yellow-400';
};

interface TransactionsPageProps {
  transactions?: Transaction[];
  isLoading?: boolean;
  safeAddress?: string;
  network?: string;
}

const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions: propTransactions,
  isLoading: propIsLoading,
  safeAddress,
  network = 'ethereum'
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  // Use real-time transaction history if no props provided
  const {
    transactions: realTimeTransactions,
    isLoading: realTimeLoading,
    error: historyError,
    refresh: refreshHistory
  } = useTransactionHistory(30000); // Refresh every 30 seconds

  // Get transaction hashes for status monitoring
  const transactionHashes = (propTransactions || realTimeTransactions)
    .filter(tx => tx.safeTxHash)
    .map(tx => tx.safeTxHash!);

  // Monitor transaction statuses
  const {
    statuses,
    isLoading: statusLoading,
    refresh: refreshStatuses
  } = useMultipleTransactionStatus(transactionHashes, 10000); // Poll every 10 seconds

  // Use prop data if provided, otherwise use real-time data
  const transactions = propTransactions || realTimeTransactions;
  const isLoading = propIsLoading !== undefined ? propIsLoading : realTimeLoading;

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAmount = (amount: string): string => {
    try {
      return parseFloat(ethers.utils.formatEther(amount)).toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  const handleRefresh = () => {
    refreshHistory();
    refreshStatuses();
  };

  const renderTransactionItem = (tx: Transaction, isSelected: boolean, isFocused: boolean) => {
    const txType = tx.type || 'contract';
    const currentStatus = tx.safeTxHash && statuses[tx.safeTxHash]
      ? statuses[tx.safeTxHash]
      : {
          status: tx.status,
          confirmations: tx.confirmations || 0,
          blockNumber: tx.blockNumber,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          executionTxHash: tx.executionTxHash,
          timestamp: tx.timestamp
        };

    const hasEnoughConfirmations = currentStatus.confirmations >= (tx.threshold || 1);

    return (
      <div className="flex flex-col p-4 border-b border-gray-700 last:border-b-0">
        {/* Transaction Header */}
        <div className="flex justify-between items-center mb-2">
          <div className={`text-base font-medium flex items-center ${getTransactionTypeColor(txType)}`}>
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getStatusIndicatorColor(currentStatus.status)}`} />
            {txType.charAt(0).toUpperCase() + txType.slice(1)}
          </div>
          <div className={`text-base font-medium ${getTransactionTypeColor(txType)}`}>
            {txType === 'send' ? '-' : '+'}{formatAmount(tx.amount || tx.value || '0')} {tx.token || 'ETH'}
          </div>
        </div>

        {/* Transaction Details */}
        <div className="flex justify-between mb-2">
          <div>
            <div className="text-sm text-gray-400">From:</div>
            <div className="text-sm font-mono text-gray-300">{formatWalletAddress(tx.from)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">To:</div>
            <div className="text-sm font-mono text-gray-300">{formatWalletAddress(tx.to)}</div>
          </div>
        </div>

        {/* Status and Date */}
        <div className="flex justify-between mb-2">
          <div className={`inline-block text-xs px-2 py-1 rounded-full ${getStatusColor(currentStatus.status)}`}>
            {currentStatus.status.charAt(0).toUpperCase() + currentStatus.status.slice(1)}
          </div>
          <div className="text-sm text-gray-400">{formatDate(tx.timestamp)}</div>
        </div>

        {/* Enhanced transaction metadata */}
        <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
          <div>
            {tx.safeTxHash && (
              <span>Safe TX: {formatWalletAddress(tx.safeTxHash)}</span>
            )}
            {tx.executionTxHash && (
              <span> | Execution TX: {formatWalletAddress(tx.executionTxHash)}</span>
            )}
          </div>
          <div>
            {tx.threshold && (
              <span className={`font-medium ${getConfirmationColor(hasEnoughConfirmations)}`}>
                {currentStatus.confirmations}/{tx.threshold} confirmations
              </span>
            )}
            {currentStatus.blockNumber && (
              <span> | Block: {currentStatus.blockNumber}</span>
            )}
          </div>
        </div>

        {/* Gas information */}
        {(currentStatus.gasUsed || tx.gasUsed) && (
          <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
            <span>
              Gas Used: {currentStatus.gasUsed || tx.gasUsed}
              {(currentStatus.gasPrice || tx.gasPrice) &&
                ` | Gas Price: ${ethers.utils.formatUnits(currentStatus.gasPrice || tx.gasPrice || '0', 'gwei')} gwei`
              }
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={containerClasses}>
      <h1 className={headingClasses}>Transactions</h1>

      {/* Tab Navigation */}
      <div className={tabsContainerClasses}>
        <button
          className={`${tabClasses} ${activeTab === 'pending' ? activeTabClasses : inactiveTabClasses}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending & Queue
        </button>
        <button
          className={`${tabClasses} ${activeTab === 'history' ? activeTabClasses : inactiveTabClasses}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {/* Tab Content */}
      <div className={tabContentClasses}>
        {activeTab === 'pending' ? (
          // Pending transactions tab (existing functionality)
          <>
            <button
              className="bg-gray-700 text-white border-none px-4 py-2 rounded-md cursor-pointer text-sm mb-4 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleRefresh}
              disabled={isLoading || statusLoading}
            >
              {isLoading || statusLoading ? 'Refreshing...' : 'Refresh'}
            </button>

            {historyError && (
              <div className="text-red-400 mb-4 text-sm">
                Error loading transactions: {historyError}
              </div>
            )}

            {isLoading ? (
              <div className="text-gray-400">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="text-gray-400 text-center py-10">
                No pending transactions found
              </div>
            ) : (
              <VitoList
                items={transactions}
                renderItem={renderTransactionItem}
                onItemEnter={(tx) => {
                  const txHash = tx.executionTxHash || tx.hash || tx.id;
                  if (txHash && txHash.startsWith('0x')) {
                    window.open(`https://etherscan.io/tx/${txHash}`, '_blank');
                  }
                }}
              />
            )}
          </>
        ) : (
          // History tab (executed transactions only)
          safeAddress ? (
            <OptimizedTransactionsPage
              safeAddress={safeAddress}
              network={network}
            />
          ) : (
            <div className="text-gray-400 text-center py-10">
              Safe address not available
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default TransactionsPage; 