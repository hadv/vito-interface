import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { VitoList } from '@components/vitoUI';
import { formatWalletAddress } from '@utils';
import OptimizedTransactionsPage from './OptimizedTransactionsPage';
import EnhancedTransactionsPage from './EnhancedTransactionsPage';
import { SafeTxPoolService, SafeTxPoolTransaction } from '../../../services/SafeTxPoolService';



// Tailwind CSS classes for the new tabbed interface
const containerClasses = "p-6 bg-gray-900 text-white min-h-screen";
const headingClasses = "text-2xl font-medium text-white mb-6";
const tabsContainerClasses = "flex border-b border-gray-700 mb-6";
const tabClasses = "px-4 py-2 text-sm font-medium cursor-pointer transition-colors";
const activeTabClasses = "text-blue-400 border-b-2 border-blue-400";
const inactiveTabClasses = "text-gray-400 hover:text-gray-300";
const tabContentClasses = "mt-6";



interface TransactionsPageProps {
  safeAddress?: string;
  network?: string;
}

const TransactionsPage: React.FC<TransactionsPageProps> = ({
  safeAddress,
  network = 'ethereum'
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('history'); // Default to history tab
  const [useEnhancedView, setUseEnhancedView] = useState(true); // Toggle for enhanced view
  const [pendingTxs, setPendingTxs] = useState<SafeTxPoolTransaction[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  // Initialize SafeTxPoolService for the current network
  const [safeTxPoolService] = useState(() => new SafeTxPoolService(network));

  // Load pending transactions from Safe TX pool smart contract
  const loadPendingTransactions = useCallback(async () => {
    if (!safeAddress) return;

    setPendingLoading(true);
    setPendingError(null);

    try {
      if (!safeTxPoolService.isConfigured()) {
        console.warn('SafeTxPool not configured for network:', network);
        setPendingTxs([]);
        return;
      }

      const pending = await safeTxPoolService.getPendingTransactions(safeAddress);
      setPendingTxs(pending);
    } catch (error) {
      console.error('Error loading pending transactions:', error);
      setPendingError('Failed to load pending transactions from Safe TX pool');
      setPendingTxs([]);
    } finally {
      setPendingLoading(false);
    }
  }, [safeAddress, network, safeTxPoolService]);

  // Load pending transactions when component mounts or dependencies change
  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingTransactions();
    }
  }, [activeTab, safeAddress, network, loadPendingTransactions]);

  // Auto-refresh pending transactions every 30 seconds
  useEffect(() => {
    if (activeTab === 'pending') {
      const interval = setInterval(loadPendingTransactions, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, safeAddress, network, loadPendingTransactions]);



  const formatAmount = (amount: string): string => {
    try {
      return parseFloat(ethers.utils.formatEther(amount)).toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  const handleRefreshPending = () => {
    loadPendingTransactions();
  };

  // Render pending transaction from Safe TX pool smart contract
  const renderPendingTxItem = (tx: SafeTxPoolTransaction, isSelected: boolean, isFocused: boolean) => {
    const confirmationProgress = `${tx.signatures.length}/${tx.signatures.length + 1}`; // Assuming threshold is signatures + 1

    return (
      <div className="flex flex-col p-4 border-b border-gray-700 last:border-b-0">
        {/* Transaction Header */}
        <div className="flex justify-between items-center mb-2">
          <div className="text-base font-medium flex items-center text-yellow-400">
            <span className="inline-block w-2 h-2 rounded-full mr-2 bg-yellow-400" />
            Pending Transaction
          </div>
          <div className="text-base font-medium text-yellow-400">
            {formatAmount(tx.value)} ETH
          </div>
        </div>

        {/* Transaction Details */}
        <div className="flex justify-between mb-2">
          <div>
            <div className="text-sm text-gray-400">To:</div>
            <div className="text-sm font-mono text-gray-300">{formatWalletAddress(tx.to)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Nonce:</div>
            <div className="text-sm text-gray-300">{tx.nonce}</div>
          </div>
        </div>

        {/* Status and Confirmations */}
        <div className="flex justify-between mb-2">
          <div className="inline-block text-xs px-2 py-1 rounded-full text-yellow-400 bg-yellow-400/20">
            Pending in Pool
          </div>
          <div className="text-sm text-gray-400">
            Signatures: {confirmationProgress}
          </div>
        </div>

        {/* Transaction metadata */}
        <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
          <div>
            <span>TX Hash: {formatWalletAddress(tx.txHash)}</span>
          </div>
          <div>
            <span>Proposer: {formatWalletAddress(tx.proposer)}</span>
          </div>
        </div>

        {/* Operation details */}
        {tx.data && tx.data !== '0x' && (
          <div className="text-xs text-gray-500 mt-1">
            <span>Data: {tx.data.slice(0, 20)}...</span>
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
          // Pending & Queue tab - transactions from Safe TX pool smart contract
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-400">
                Showing transactions from Safe TX pool smart contract
              </div>
              <button
                className="bg-gray-700 text-white border-none px-4 py-2 rounded-md cursor-pointer text-sm hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleRefreshPending}
                disabled={pendingLoading}
              >
                {pendingLoading ? 'Refreshing...' : 'Refresh Pool'}
              </button>
            </div>

            {pendingError && (
              <div className="text-red-400 mb-4 text-sm">
                {pendingError}
              </div>
            )}

            {!safeTxPoolService.isConfigured() && (
              <div className="text-yellow-400 mb-4 text-sm p-3 bg-yellow-400/10 rounded-md">
                SafeTxPool smart contract not configured for {network} network.
                Pending transactions from smart contract are not available.
              </div>
            )}

            {pendingLoading ? (
              <div className="text-gray-400">Loading pending transactions from Safe TX pool...</div>
            ) : pendingTxs.length === 0 ? (
              <div className="text-gray-400 text-center py-10">
                {safeTxPoolService.isConfigured()
                  ? "No pending transactions in Safe TX pool"
                  : "Safe TX pool not available"}
              </div>
            ) : (
              <VitoList
                items={pendingTxs}
                renderItem={renderPendingTxItem}
                onItemEnter={(tx) => {
                  // For pending transactions, we could open Safe app or show transaction details
                  console.log('Pending transaction selected:', tx.txHash);
                }}
              />
            )}
          </>
        ) : (
          // History tab - transaction history with enhanced human-friendly view
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-400">
                Transaction history with state changes and flow indicators
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setUseEnhancedView(!useEnhancedView)}
                  className={`
                    px-3 py-1 text-xs rounded-lg transition-colors
                    ${useEnhancedView
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }
                  `}
                >
                  {useEnhancedView ? '📊 Enhanced View' : '📋 Simple View'}
                </button>
              </div>
            </div>

            {safeAddress ? (
              useEnhancedView ? (
                <EnhancedTransactionsPage
                  safeAddress={safeAddress}
                  network={network}
                />
              ) : (
                <OptimizedTransactionsPage
                  safeAddress={safeAddress}
                  network={network}
                />
              )
            ) : (
              <div className="text-gray-400 text-center py-10">
                Safe address not available
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage; 