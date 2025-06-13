/**
 * Enhanced Transaction Item - Human-friendly transaction display
 * Focuses on what happened rather than technical details
 */

import React from 'react';
import { ethers } from 'ethers';
import { formatWalletAddress, getEtherscanTransactionUrl } from '@utils';
import { Transaction } from '../types';

interface EnhancedTransactionItemProps {
  transaction: Transaction;
  safeAddress: string;
  network: string;
  onClick?: (transaction: Transaction) => void;
}

// Transaction type detection and formatting
const getTransactionType = (tx: Transaction, safeAddress: string) => {
  const isIncoming = tx.to.toLowerCase() === safeAddress.toLowerCase();
  const isOutgoing = tx.from.toLowerCase() === safeAddress.toLowerCase();
  const hasData = tx.data && tx.data !== '0x' && tx.data.length > 2;
  const value = ethers.BigNumber.from(tx.value || tx.amount || '0');
  const hasValue = !value.isZero();

  // Check for token transfer information first
  if (tx.tokenTransfer) {
    const transfer = tx.tokenTransfer;
    const isReceive = transfer.direction === 'in';

    return {
      type: isReceive ? 'receive' : 'send',
      direction: transfer.direction,
      title: isReceive ? `Received ${transfer.tokenSymbol}` : `Sent ${transfer.tokenSymbol}`,
      description: isReceive
        ? `From ${formatWalletAddress(tx.from)}`
        : `To ${formatWalletAddress(tx.to)}`,
      icon: isReceive ? '↓' : '↑',
      color: isReceive ? 'text-green-400' : 'text-red-400',
      bgColor: isReceive ? 'bg-green-400/10' : 'bg-red-400/10',
      borderColor: isReceive ? 'border-green-400/20' : 'border-red-400/20'
    };
  }

  // Fallback to original logic for non-token transfers
  if (isIncoming && hasValue) {
    return {
      type: 'receive',
      direction: 'in',
      title: 'Received ETH',
      description: `From ${formatWalletAddress(tx.from)}`,
      icon: '↓',
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/20'
    };
  }

  if (isOutgoing && hasValue && !hasData) {
    return {
      type: 'send',
      direction: 'out',
      title: 'Sent ETH',
      description: `To ${formatWalletAddress(tx.to)}`,
      icon: '↑',
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400/20'
    };
  }

  if (hasData) {
    // Try to decode common method signatures
    const methodId = tx.data?.slice(0, 10);
    const methodNames: { [key: string]: string } = {
      '0xa9059cbb': 'Token Transfer',
      '0x23b872dd': 'Token Transfer From',
      '0x095ea7b3': 'Token Approval',
      '0x6a761202': 'Safe Execution',
      '0x40c10f19': 'Token Mint',
      '0x42842e0e': 'NFT Transfer',
      '0x1fad948c': 'Swap',
      '0x38ed1739': 'Swap Exact Tokens',
      '0x7ff36ab5': 'Swap Exact ETH'
    };

    const methodName = methodNames[methodId || ''] || 'Contract Interaction';

    return {
      type: 'contract',
      direction: hasValue ? (isOutgoing ? 'out' : 'in') : 'neutral',
      title: methodName,
      description: `With ${formatWalletAddress(tx.to)}`,
      icon: '⚙️',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-400/20'
    };
  }

  // Default case
  return {
    type: 'unknown',
    direction: 'neutral',
    title: 'Transaction',
    description: `${isOutgoing ? 'To' : 'From'} ${formatWalletAddress(isOutgoing ? tx.to : tx.from)}`,
    icon: '📄',
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    borderColor: 'border-gray-400/20'
  };
};

// Format amount with proper decimals
const formatAmount = (amount: string, decimals: number = 18): string => {
  try {
    const value = ethers.BigNumber.from(amount);
    if (value.isZero()) return '0';

    const formatted = ethers.utils.formatUnits(value, decimals);
    const num = parseFloat(formatted);

    if (num >= 1000) {
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } else if (num >= 1) {
      return num.toFixed(4);
    } else {
      return num.toFixed(6);
    }
  } catch {
    return '0';
  }
};

// Render transaction amount with proper token information
const renderTransactionAmount = (transaction: Transaction, txInfo: any) => {
  // Use token transfer info if available
  if (transaction.tokenTransfer) {
    const transfer = transaction.tokenTransfer;
    if (transfer.formattedAmount !== '0') {
      return (
        <div className={`font-medium text-sm ${txInfo.color} flex items-center space-x-1`}>
          {transfer.direction === 'out' && <span>-</span>}
          {transfer.direction === 'in' && <span>+</span>}
          <span>{transfer.formattedAmount} {transfer.tokenSymbol}</span>
        </div>
      );
    }
    return null;
  }

  // Fallback to original amount display for ETH
  const amount = formatAmount(transaction.value || transaction.amount || '0');
  if (amount !== '0') {
    return (
      <div className={`font-medium text-sm ${txInfo.color} flex items-center space-x-1`}>
        {txInfo.direction === 'out' && <span>-</span>}
        {txInfo.direction === 'in' && <span>+</span>}
        <span>{amount} ETH</span>
      </div>
    );
  }

  return null;
};

// Format timestamp to human-readable date
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
  }
};

const EnhancedTransactionItem: React.FC<EnhancedTransactionItemProps> = ({
  transaction,
  safeAddress,
  network,
  onClick
}) => {
  // Debug logging to see transaction data
  console.log('🎯 EnhancedTransactionItem received transaction:', {
    id: transaction.id,
    tokenTransfer: transaction.tokenTransfer,
    value: transaction.value,
    data: transaction.data?.slice(0, 20),
    hasTokenTransfer: !!transaction.tokenTransfer
  });

  const txInfo = getTransactionType(transaction, safeAddress);
  const timeStr = formatTimestamp(transaction.timestamp);
  
  const handleClick = () => {
    if (onClick) {
      onClick(transaction);
    } else {
      // Default: open in block explorer
      const url = getEtherscanTransactionUrl(
        transaction.executionTxHash || transaction.hash || transaction.safeTxHash || '',
        network
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`
        p-4 border-l-4 ${txInfo.borderColor} ${txInfo.bgColor}
        cursor-pointer hover:bg-opacity-20 transition-all duration-200
        border-b border-gray-700/50 last:border-b-0
      `}
      onClick={handleClick}
      title="Click to view on block explorer"
    >
      <div className="flex items-center justify-between">
        {/* Left side: Icon, title, and description */}
        <div className="flex items-center space-x-3 flex-1">
          {/* Transaction icon */}
          <div className={`
            w-10 h-10 rounded-full ${txInfo.bgColor} 
            flex items-center justify-center text-lg
          `}>
            {txInfo.icon}
          </div>
          
          {/* Transaction details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className={`font-medium ${txInfo.color} text-sm`}>
                {txInfo.title}
              </h3>
              {/* Status indicator */}
              <span className={`
                inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                ${transaction.status === 'executed' 
                  ? 'bg-green-400/20 text-green-400' 
                  : transaction.status === 'failed'
                  ? 'bg-red-400/20 text-red-400'
                  : 'bg-yellow-400/20 text-yellow-400'
                }
              `}>
                {transaction.status === 'executed' ? '✓ Success' : 
                 transaction.status === 'failed' ? '✗ Failed' : 
                 '⏳ Pending'}
              </span>
            </div>
            
            <p className="text-gray-400 text-xs mt-0.5 truncate">
              {txInfo.description}
            </p>
            
            {/* Additional context */}
            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
              <span>{timeStr}</span>
              {transaction.blockNumber && (
                <span>Block {transaction.blockNumber.toLocaleString()}</span>
              )}
              {transaction.executor && transaction.executor !== transaction.from && (
                <span>Executed by {formatWalletAddress(transaction.executor)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Amount and direction */}
        <div className="text-right flex-shrink-0">
          {renderTransactionAmount(transaction, txInfo)}

          {/* Gas information */}
          {transaction.gasUsed && (
            <div className="text-xs text-gray-500 mt-0.5">
              Gas: {parseInt(transaction.gasUsed).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedTransactionItem;
