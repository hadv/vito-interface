/**
 * Transaction Modal Component
 * Updated to use separated transaction proposal and signing flows
 * Provides users with choice between proposing or signing transactions
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import Button from '../../ui/Button';
import { useToast } from '../../../hooks/useToast';
import { useWalletConnection } from '../../../hooks/useWalletConnection';
import TransactionProposalModal from './TransactionProposalModal';
import TransactionSigningModal from './TransactionSigningModal';
import { SafeTxPoolService, SafeTxPoolTransaction } from '../../../services/SafeTxPoolService';
import { walletConnectionService } from '../../../services/WalletConnectionService';
import { Asset } from '../types';

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 20px;
  width: 95%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
`;

const ModalTitle = styled.h2`
  color: #f8fafc;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    color: #f8fafc;
    background-color: rgba(148, 163, 184, 0.1);
  }
`;

const ModalContent = styled.div`
  padding: 32px;
`;

const FlowSelector = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
`;

const FlowOption = styled.div<{ selected: boolean }>`
  flex: 1;
  padding: 20px;
  border: 2px solid ${props => props.selected ? '#3b82f6' : 'rgba(148, 163, 184, 0.2)'};
  border-radius: 12px;
  background: ${props => props.selected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(148, 163, 184, 0.05)'};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }
`;

const FlowTitle = styled.h3`
  color: #f8fafc;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FlowDescription = styled.p`
  color: #cbd5e1;
  font-size: 0.875rem;
  line-height: 1.4;
  margin: 0;
`;

const PendingTransactionsList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 24px;
`;

const PendingTransactionItem = styled.div`
  background: rgba(148, 163, 184, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(148, 163, 184, 0.1);
    border-color: rgba(148, 163, 184, 0.2);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const TransactionSummary = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const TransactionTo = styled.span`
  color: #f8fafc;
  font-size: 0.875rem;
  font-weight: 500;
`;

const TransactionValue = styled.span`
  color: #10b981;
  font-size: 0.875rem;
  font-weight: 600;
`;

const TransactionHash = styled.div`
  color: #94a3b8;
  font-size: 0.75rem;
  font-family: 'Monaco', 'Menlo', monospace;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 16px;
`;

const EmptyStateText = styled.p`
  font-size: 1rem;
  margin: 0;
`;

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated?: (transaction: any) => void;
  fromAddress: string;
  preSelectedAsset?: Asset | null;
}

type FlowType = 'propose' | 'sign';

interface PendingTransaction {
  txHash: string;
  to: string;
  value: string;
  data: string;
  operation: number;
  nonce: number;
  signatures: Array<{ signer: string; signature: string }>;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onTransactionCreated,
  fromAddress,
  preSelectedAsset
}) => {
  const [selectedFlow, setSelectedFlow] = useState<FlowType>('propose');
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showSigningModal, setShowSigningModal] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<PendingTransaction | null>(null);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  
  const toast = useToast();
  const { connectionState } = useWalletConnection();

  const loadPendingTransactions = useCallback(async () => {
    if (!connectionState.signerConnected || !fromAddress) return;

    setIsLoadingPending(true);
    try {
      // Initialize SafeTxPoolService to fetch pending transactions
      const safeTxPoolService = new SafeTxPoolService(connectionState.network || 'ethereum');

      // Get signer from wallet connection service
      const signer = walletConnectionService.getSigner();
      if (signer) {
        safeTxPoolService.setSigner(signer);
      }

      // Get pending transactions for this Safe
      const transactions = await safeTxPoolService.getPendingTransactions(fromAddress);
      
      // Convert to our interface format
      const pendingTxs: PendingTransaction[] = transactions.map((tx: SafeTxPoolTransaction) => ({
        txHash: tx.txHash,
        to: tx.to,
        value: tx.value,
        data: tx.data,
        operation: tx.operation,
        nonce: tx.nonce,
        signatures: tx.signatures
      }));

      setPendingTransactions(pendingTxs);
    } catch (error) {
      console.error('Error loading pending transactions:', error);
      toast.error('Failed to load pending transactions');
    } finally {
      setIsLoadingPending(false);
    }
  }, [connectionState.signerConnected, connectionState.network, fromAddress, toast]);

  // Load pending transactions when modal opens and signing flow is selected
  useEffect(() => {
    if (isOpen && selectedFlow === 'sign') {
      loadPendingTransactions();
    }
  }, [isOpen, selectedFlow, loadPendingTransactions]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFlowSelection = (flow: FlowType) => {
    setSelectedFlow(flow);
    if (flow === 'propose') {
      setShowProposalModal(true);
    }
  };

  const handleTransactionProposed = (transaction: any) => {
    if (onTransactionCreated) {
      onTransactionCreated(transaction);
    }
    setShowProposalModal(false);
    onClose();
  };

  const handleTransactionSelected = (transaction: PendingTransaction) => {
    setSelectedTransaction(transaction);
    setShowSigningModal(true);
  };

  const handleTransactionSigned = (signature: string) => {
    // Refresh pending transactions list
    loadPendingTransactions();
    setShowSigningModal(false);
    setSelectedTransaction(null);
    
    toast.success('Transaction signed successfully');
  };

  const formatValue = (value: string) => {
    if (value === '0') return '0 ETH';
    try {
      const ethValue = parseFloat(value) / 1e18;
      return `${ethValue.toFixed(6)} ETH`;
    } catch {
      return value;
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isOpen) return null;

  return (
    <>
      <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
        <ModalContainer>
          <ModalHeader>
            <ModalTitle>
              🔄 Transaction Flow
            </ModalTitle>
            <CloseButton onClick={onClose}>&times;</CloseButton>
          </ModalHeader>

          <ModalContent>
            <FlowSelector>
              <FlowOption
                selected={selectedFlow === 'propose'}
                onClick={() => handleFlowSelection('propose')}
              >
                <FlowTitle>
                  📝 Propose Transaction
                </FlowTitle>
                <FlowDescription>
                  Create a new transaction proposal without requiring signatures.
                  The transaction will be added to the pending queue for later signing.
                </FlowDescription>
              </FlowOption>

              <FlowOption
                selected={selectedFlow === 'sign'}
                onClick={() => setSelectedFlow('sign')}
              >
                <FlowTitle>
                  🔐 Sign Transaction
                </FlowTitle>
                <FlowDescription>
                  Sign pending transactions that have been proposed by you or other Safe owners.
                </FlowDescription>
              </FlowOption>
            </FlowSelector>

            {selectedFlow === 'sign' && (
              <>
                {isLoadingPending ? (
                  <EmptyState>
                    <EmptyStateIcon>⏳</EmptyStateIcon>
                    <EmptyStateText>Loading pending transactions...</EmptyStateText>
                  </EmptyState>
                ) : pendingTransactions.length === 0 ? (
                  <EmptyState>
                    <EmptyStateIcon>📭</EmptyStateIcon>
                    <EmptyStateText>No pending transactions found</EmptyStateText>
                  </EmptyState>
                ) : (
                  <PendingTransactionsList>
                    {pendingTransactions.map((tx) => (
                      <PendingTransactionItem
                        key={tx.txHash}
                        onClick={() => handleTransactionSelected(tx)}
                      >
                        <TransactionSummary>
                          <TransactionTo>To: {formatAddress(tx.to)}</TransactionTo>
                          <TransactionValue>{formatValue(tx.value)}</TransactionValue>
                        </TransactionSummary>
                        <TransactionHash>
                          Hash: {formatAddress(tx.txHash)}
                        </TransactionHash>
                      </PendingTransactionItem>
                    ))}
                  </PendingTransactionsList>
                )}

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={loadPendingTransactions} disabled={isLoadingPending}>
                    🔄 Refresh
                  </Button>
                </div>
              </>
            )}
          </ModalContent>
        </ModalContainer>
      </ModalOverlay>

      {/* Transaction Proposal Modal */}
      <TransactionProposalModal
        isOpen={showProposalModal}
        onClose={() => setShowProposalModal(false)}
        onTransactionProposed={handleTransactionProposed}
        fromAddress={fromAddress}
        preSelectedAsset={preSelectedAsset || undefined}
      />

      {/* Transaction Signing Modal */}
      {selectedTransaction && (
        <TransactionSigningModal
          isOpen={showSigningModal}
          onClose={() => {
            setShowSigningModal(false);
            setSelectedTransaction(null);
          }}
          onTransactionSigned={handleTransactionSigned}
          transaction={selectedTransaction as any} // Type conversion for compatibility
          safeAddress={fromAddress}
          network={connectionState.network || 'ethereum'}
        />
      )}
    </>
  );
};

export default TransactionModal;
