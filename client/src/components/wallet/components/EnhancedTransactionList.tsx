/**
 * Enhanced Transaction List - Groups transactions by date with summaries
 * Provides human-friendly overview of daily activity
 */

import React, { useMemo } from 'react';
import { ethers } from 'ethers';
import { Transaction } from '../types';
import EnhancedTransactionItem from './EnhancedTransactionItem';

interface EnhancedTransactionListProps {
  transactions: Transaction[];
  safeAddress: string;
  network: string;
  isLoading?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
}

interface DayGroup {
  date: string;
  displayDate: string;
  transactions: Transaction[];
  summary: {
    totalIn: ethers.BigNumber;
    totalOut: ethers.BigNumber;
    netChange: ethers.BigNumber;
    transactionCount: number;
  };
}

// Group transactions by date
const groupTransactionsByDate = (transactions: Transaction[], safeAddress: string): DayGroup[] => {
  const groups: { [key: string]: Transaction[] } = {};
  
  transactions.forEach(tx => {
    const date = new Date(tx.timestamp * 1000);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(tx);
  });

  return Object.entries(groups)
    .map(([dateKey, txs]) => {
      const date = new Date(dateKey);
      const displayDate = formatDateHeader(date);
      
      // Calculate daily summary
      let totalIn = ethers.BigNumber.from(0);
      let totalOut = ethers.BigNumber.from(0);
      
      txs.forEach(tx => {
        const value = ethers.BigNumber.from(tx.value || tx.amount || '0');
        const isIncoming = tx.to.toLowerCase() === safeAddress.toLowerCase();
        
        if (isIncoming) {
          totalIn = totalIn.add(value);
        } else {
          totalOut = totalOut.add(value);
        }
      });
      
      const netChange = totalIn.sub(totalOut);
      
      return {
        date: dateKey,
        displayDate,
        transactions: txs.sort((a, b) => b.timestamp - a.timestamp), // Sort by newest first
        summary: {
          totalIn,
          totalOut,
          netChange,
          transactionCount: txs.length
        }
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date)); // Sort by newest date first
};

// Format date for group headers
const formatDateHeader = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  } else {
    return date.toLocaleDateString(undefined, { 
      month: 'long', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
};

// Format ETH amount for display
const formatEthAmount = (amount: ethers.BigNumber): string => {
  if (amount.isZero()) return '0';
  
  const formatted = ethers.utils.formatEther(amount);
  const num = parseFloat(formatted);
  
  if (num >= 1000) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else if (num >= 1) {
    return num.toFixed(4);
  } else {
    return num.toFixed(6);
  }
};

// Daily summary component
const DaySummary: React.FC<{ summary: DayGroup['summary'] }> = ({ summary }) => {
  const { totalIn, totalOut, netChange, transactionCount } = summary;
  
  if (totalIn.isZero() && totalOut.isZero()) {
    return (
      <div className="text-xs text-gray-500">
        {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
      </div>
    );
  }
  
  const isPositive = netChange.gte(0);
  const netChangeFormatted = formatEthAmount(netChange.abs());
  
  return (
    <div className="flex items-center space-x-4 text-xs">
      <span className="text-gray-500">
        {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
      </span>
      
      {!totalIn.isZero() && (
        <span className="text-green-400">
          +{formatEthAmount(totalIn)} ETH
        </span>
      )}
      
      {!totalOut.isZero() && (
        <span className="text-red-400">
          -{formatEthAmount(totalOut)} ETH
        </span>
      )}
      
      {!netChange.isZero() && (
        <span className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          Net: {isPositive ? '+' : '-'}{netChangeFormatted} ETH
        </span>
      )}
    </div>
  );
};

const EnhancedTransactionList: React.FC<EnhancedTransactionListProps> = ({
  transactions,
  safeAddress,
  network,
  isLoading = false,
  onTransactionClick
}) => {
  const dayGroups = useMemo(() => 
    groupTransactionsByDate(transactions, safeAddress), 
    [transactions, safeAddress]
  );

  if (isLoading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-lg font-medium text-white mb-2">No transactions yet</h3>
        <p className="text-gray-400">
          This Safe wallet hasn't made any transactions yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dayGroups.map((group) => (
        <div key={group.date} className="bg-gray-800/30 rounded-lg overflow-hidden">
          {/* Date header with summary */}
          <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">
                {group.displayDate}
              </h3>
              <DaySummary summary={group.summary} />
            </div>
          </div>
          
          {/* Transactions for this day */}
          <div className="divide-y divide-gray-700/30">
            {group.transactions.map((transaction) => (
              <EnhancedTransactionItem
                key={transaction.id}
                transaction={transaction}
                safeAddress={safeAddress}
                network={network}
                onClick={onTransactionClick}
              />
            ))}
          </div>
        </div>
      ))}
      
      {/* Loading more indicator */}
      {isLoading && transactions.length > 0 && (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mr-3"></div>
          <span className="text-gray-400">Loading more transactions...</span>
        </div>
      )}
    </div>
  );
};

export default EnhancedTransactionList;
