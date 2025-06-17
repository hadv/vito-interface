import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { VitoList } from '@components/vitoUI';
import { formatWalletAddress } from '@utils';
import OptimizedTransactionsPage from './OptimizedTransactionsPage';
import EnhancedTransactionsPage from './EnhancedTransactionsPage';
import { SafeTxPoolService, SafeTxPoolTransaction } from '../../../services/SafeTxPoolService';
import { SafeWalletService } from '../../../services/SafeWalletService';
import PendingTransactionConfirmationModal from '../components/PendingTransactionConfirmationModal';



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
  const [safeInfo, setSafeInfo] = useState<{ threshold: number; owners: string[] } | null>(null);

  // Initialize SafeTxPoolService for the current network
  const [safeTxPoolService] = useState(() => new SafeTxPoolService(network));
  const [selectedPendingTx, setSelectedPendingTx] = useState<SafeTxPoolTransaction | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // Load Safe info to get threshold
  const loadSafeInfo = useCallback(async () => {
    if (!safeAddress) return;

    try {
      const walletService = new SafeWalletService();
      await walletService.initialize({ safeAddress, network });
      const info = await walletService.getSafeInfo();
      setSafeInfo(info);
    } catch (error) {
      console.error('Error loading Safe info:', error);
    }
  }, [safeAddress, network]);

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

      // Get all pending transactions from SafeTxPool
      const allPending = await safeTxPoolService.getPendingTransactions(safeAddress);
      console.log(`Found ${allPending.length} pending transactions in SafeTxPool`);

      // Get current Safe nonce to filter out stale transactions
      let currentNonce = -1; // Start with -1 to show all transactions if nonce fetch fails
      try {
        const walletService = new SafeWalletService();
        await walletService.initialize({ safeAddress, network });
        currentNonce = await walletService.getNonce();
        console.log(`Current Safe nonce: ${currentNonce}`);
      } catch (nonceError) {
        console.warn('Failed to get current Safe nonce, showing all pending transactions:', nonceError);
      }

      // Log all transaction nonces for debugging
      console.log('Transaction nonces:', allPending.map(tx => ({ txHash: tx.txHash.slice(0, 10), nonce: tx.nonce })));

      // Filter out transactions with nonce < current nonce (already executed)
      // Keep transactions with nonce >= current nonce (current and future transactions)
      const validPending = allPending.filter(tx => {
        const isValid = currentNonce === -1 || tx.nonce >= currentNonce;
        if (!isValid) {
          console.log(`Filtering out transaction ${tx.txHash.slice(0, 10)} with nonce ${tx.nonce} (current nonce: ${currentNonce})`);
        }
        return isValid;
      });

      console.log(`Showing ${validPending.length} valid transactions (filtered out ${allPending.length - validPending.length})`);
      setPendingTxs(validPending);
    } catch (error) {
      console.error('Error loading pending transactions:', error);
      setPendingError('Failed to load pending transactions from Safe TX pool');
      setPendingTxs([]);
    } finally {
      setPendingLoading(false);
    }
  }, [safeAddress, network, safeTxPoolService]);

  // Load Safe info and pending transactions when component mounts or dependencies change
  useEffect(() => {
    if (safeAddress) {
      loadSafeInfo();
    }
    if (activeTab === 'pending') {
      loadPendingTransactions();
    }
  }, [activeTab, safeAddress, network, loadPendingTransactions, loadSafeInfo]);

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
    // Use actual threshold from Safe info, fallback to 2 if not loaded yet
    const threshold = safeInfo?.threshold || 2;
    const confirmationProgress = `${tx.signatures.length} of ${threshold} signatures`;
    const hasEnoughSignatures = tx.signatures.length >= threshold;

    return (
      <div className="flex flex-col p-4 border-b border-gray-700 last:border-b-0">
        {/* Transaction Header */}
        <div className="flex justify-between items-center mb-2">
          <div className="text-base font-medium flex items-center text-yellow-400">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
              hasEnoughSignatures ? 'bg-green-400' : 'bg-yellow-400'
            }`} />
            {hasEnoughSignatures ? 'Ready to Execute' : 'Pending Transaction'}
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
        <div className="flex justify-between items-center mb-3">
          <div className={`inline-block text-xs px-2 py-1 rounded-full ${
            hasEnoughSignatures
              ? 'text-green-400 bg-green-400/20'
              : 'text-yellow-400 bg-yellow-400/20'
          }`}>
            {hasEnoughSignatures ? 'Ready to Execute' : 'Pending in Pool'}
          </div>
          <div className="text-sm text-gray-400">
            Signatures: {confirmationProgress}
          </div>
        </div>

        {/* Signers List */}
        {tx.signatures.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">Signed by:</div>
            <div className="flex flex-wrap gap-1">
              {tx.signatures.map((sig, index) => (
                <span key={index} className="text-xs px-2 py-1 bg-green-400/20 text-green-400 rounded">
                  {formatWalletAddress(sig.signer)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              hasEnoughSignatures
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPendingTx(tx);
              setShowConfirmationModal(true);
            }}
          >
            {hasEnoughSignatures ? 'Execute' : 'Review & Sign'}
          </button>
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
                Showing actionable transactions from Safe TX pool smart contract
                <br />
                <span className="text-xs text-gray-500">
                  Transactions with nonce &lt; current Safe nonce are automatically filtered out
                </span>
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

      {/* Pending Transaction Confirmation Modal */}
      {selectedPendingTx && (
        <PendingTransactionConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            setShowConfirmationModal(false);
            setSelectedPendingTx(null);
          }}
          onConfirm={async () => {
            // Refresh pending transactions after confirmation
            await loadPendingTransactions();
            setShowConfirmationModal(false);
            setSelectedPendingTx(null);
          }}
          transaction={selectedPendingTx}
          safeAddress={safeAddress!}
          network={network}
        />
      )}
    </div>
  );
};

export default TransactionsPage; 