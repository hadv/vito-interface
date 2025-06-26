import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { formatWalletAddress } from '@utils';
import OptimizedTransactionsPage from './OptimizedTransactionsPage';
import EnhancedTransactionsPage from './EnhancedTransactionsPage';
import { SafeTxPoolService, SafeTxPoolTransaction } from '../../../services/SafeTxPoolService';
import { SafeWalletService } from '../../../services/SafeWalletService';
import PendingTransactionConfirmationModal from '../components/PendingTransactionConfirmationModal';
import { TransactionDecoder, DecodedTransactionData } from '../../../utils/transactionDecoder';
import { TokenService } from '../../../services/TokenService';
import ParameterDisplay from '../components/ParameterDisplay';
import { getRpcUrl } from '../../../contracts/abis';



import styled from 'styled-components';
import { theme } from '../../../theme';

// Styled components with internal tab scrolling
const Container = styled.div`
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  margin-bottom: ${theme.spacing[8]};
`;

const Heading = styled.h1`
  font-size: ${theme.typography.fontSize['3xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  margin-bottom: ${theme.spacing[4]};
  color: ${theme.colors.primary[400]};
`;

// Styled components for professional tabs
const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${theme.colors.neutral[700]};
  margin-bottom: ${theme.spacing[6]};
  position: relative;
`;

const Tab = styled.button<{ isActive: boolean }>`
  padding: ${theme.spacing[4]} ${theme.spacing[6]};
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${props => props.isActive ? '700' : '600'};
  font-family: ${theme.typography.fontFamily.sans.join(', ')};
  letter-spacing: 0.025em;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  background: transparent;
  position: relative;
  color: ${props => props.isActive
    ? theme.colors.primary[400]
    : theme.colors.text.tertiary
  };

  /* Professional underline animation */
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, ${theme.colors.primary[400]}, ${theme.colors.primary[300]});
    transform: scaleX(${props => props.isActive ? '1' : '0'});
    transform-origin: center;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 1px;
  }

  /* Hover effects */
  &:hover {
    color: ${props => props.isActive
      ? theme.colors.primary[300]
      : theme.colors.text.secondary
    };

    &::after {
      transform: scaleX(${props => props.isActive ? '1' : '0.5'});
      opacity: ${props => props.isActive ? '1' : '0.6'};
    }
  }

  /* Focus states for accessibility */
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.primary[400]}40;
    border-radius: ${theme.borderRadius.sm};
  }

  /* Active press state */
  &:active {
    transform: translateY(1px);
  }
`;

// Tab content with internal scrolling
const TabContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-bottom: ${theme.spacing[6]};

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${theme.colors.neutral[800]};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.neutral[600]};
    border-radius: 4px;

    &:hover {
      background: ${theme.colors.neutral[500]};
    }
  }

  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: ${theme.colors.neutral[600]} ${theme.colors.neutral[800]};
`;



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
  const [decodedTransactions, setDecodedTransactions] = useState<Map<string, DecodedTransactionData>>(new Map());

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

  // Decode pending transactions for better display
  const decodePendingTransactions = useCallback(async (transactions: SafeTxPoolTransaction[]) => {
    try {
      const rpcUrl = getRpcUrl(network);
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const tokenService = new TokenService(provider, network);
      const decoder = new TransactionDecoder(tokenService, network);

      const newDecodedTransactions = new Map<string, DecodedTransactionData>();

      for (const tx of transactions) {
        try {
          const decoded = await decoder.decodeTransactionData(
            tx.to,
            tx.value,
            tx.data || '0x'
          );

          newDecodedTransactions.set(tx.txHash, decoded);
        } catch (error) {
          // Silent error handling - no console logs
        }
      }

      setDecodedTransactions(newDecodedTransactions);
    } catch (error) {
      // Silent error handling - no console logs
    }
  }, [network]);

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

      // Decode transactions for better display
      if (validPending.length > 0) {
        decodePendingTransactions(validPending);
      }
    } catch (error) {
      console.error('Error loading pending transactions:', error);
      setPendingError('Failed to load pending transactions from Safe TX pool');
      setPendingTxs([]);
    } finally {
      setPendingLoading(false);
    }
  }, [safeAddress, network, safeTxPoolService, decodePendingTransactions]);

  // Load Safe info and pending transactions when component mounts or dependencies change
  useEffect(() => {
    if (safeAddress) {
      loadSafeInfo();
    }
    if (activeTab === 'pending') {
      loadPendingTransactions();
    }
  }, [activeTab, safeAddress, network, loadPendingTransactions, loadSafeInfo]);

  // Auto-refresh removed - users can manually refresh using the "Refresh Pool" button

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

    // Get decoded transaction data
    const decodedTx = decodedTransactions.get(tx.txHash);

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
            {decodedTx?.details.formattedAmount || `${formatAmount(tx.value)} ETH`}
          </div>
        </div>

        {/* Transaction Type and Description */}
        {decodedTx && (
          <div className="mb-2">
            <div className="text-sm font-semibold text-blue-400 mb-1">
              {decodedTx.description}
            </div>
            {decodedTx.details.token && (
              <div className="text-xs text-gray-400">
                Token: {decodedTx.details.token.name} ({decodedTx.details.token.symbol})
                <br />
                Contract: {decodedTx.details.token.address.slice(0, 6)}...{decodedTx.details.token.address.slice(-4)}
              </div>
            )}
          </div>
        )}

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
          <div className="text-xs mt-2 space-y-1">
            <div className="text-gray-400">
              Function: {decodedTx ? (
                decodedTx.type === 'ERC20_TRANSFER' ? (
                  <span className="text-green-400">ERC-20 Transfer</span>
                ) : decodedTx.description && decodedTx.description !== 'Contract Interaction' ? (
                  <span className="text-blue-400">{decodedTx.description}</span>
                ) : decodedTx.details.methodName ? (
                  <span className="text-blue-400">{decodedTx.details.methodName}</span>
                ) : (
                  <span className="text-blue-400">Contract Interaction</span>
                )
              ) : (
                <span className="text-yellow-400">Contract Call</span>
              )}
            </div>

            {/* Show decoded parameters if available */}
            {decodedTx?.details.decodedInputs && decodedTx.details.decodedInputs.length > 0 && (
              <div className="mt-2">
                <ParameterDisplay
                  parameters={decodedTx.details.decodedInputs}
                  network={network}
                  compact={true}
                />
              </div>
            )}

            <div className="text-gray-500">
              <span className="text-gray-400">Raw Data:</span>
              <div
                className="font-mono text-xs bg-gray-800 p-2 rounded mt-1 cursor-pointer hover:bg-gray-700 transition-colors max-w-full overflow-hidden"
                onClick={() => {
                  navigator.clipboard.writeText(tx.data);
                  console.log('Transaction data copied to clipboard');
                }}
                title="Click to copy raw transaction data"
                style={{
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {tx.data.length > 100 ? `${tx.data.slice(0, 100)}...` : tx.data}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };



  return (
    <Container>
      <Header>
        <Heading>Transactions</Heading>
      </Header>

      {/* Tab Navigation */}
      <TabsContainer>
        <Tab
          isActive={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
        >
          Pending & Queue
        </Tab>
        <Tab
          isActive={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        >
          History
        </Tab>
      </TabsContainer>

      {/* Tab Content */}
      <TabContent>
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
              <div>
                {pendingTxs.map((tx, index) => (
                  <div key={tx.txHash || index} onClick={() => {
                    // For pending transactions, we could open Safe app or show transaction details
                    console.log('Pending transaction selected:', tx.txHash);
                  }}>
                    {renderPendingTxItem(tx, false, false)}
                  </div>
                ))}
              </div>
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
      </TabContent>

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
    </Container>
  );
};

export default TransactionsPage; 