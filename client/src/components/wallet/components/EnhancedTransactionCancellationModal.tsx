import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { SafeTxPoolTransaction } from '../../../services/SafeTxPoolService';
import { SafeTransactionCancellationService, CancellationEstimate, CancellationResult } from '../../../services/SafeTransactionCancellationService';
import { formatWalletAddress } from '../../../utils';

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
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 0;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalTitle = styled.h2`
  color: #ffffff;
  font-size: 24px;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ModalBody = styled.div`
  padding: 32px;
`;

const MethodSelector = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
`;

const MethodOption = styled.div<{ selected: boolean; disabled: boolean }>`
  flex: 1;
  padding: 20px;
  border-radius: 12px;
  border: 2px solid ${props => props.selected ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'};
  background-color: ${props => props.selected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.disabled ? 'rgba(255, 255, 255, 0.1)' : '#3b82f6'};
  }
`;

const MethodTitle = styled.h3`
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MethodDescription = styled.p`
  color: #9ca3af;
  font-size: 14px;
  margin: 0 0 12px 0;
  line-height: 1.5;
`;

const MethodBadge = styled.span<{ type: 'recommended' | 'secure' | 'simple' }>`
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 500;
  ${props => {
    switch (props.type) {
      case 'recommended':
        return 'background-color: rgba(34, 197, 94, 0.2); color: #22c55e;';
      case 'secure':
        return 'background-color: rgba(239, 68, 68, 0.2); color: #ef4444;';
      case 'simple':
        return 'background-color: rgba(251, 191, 36, 0.2); color: #f59e0b;';
    }
  }}
`;

const SecurityWarning = styled.div<{ type: 'info' | 'warning' }>`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  background-color: ${props => props.type === 'warning' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  border: 1px solid ${props => props.type === 'warning' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'};
`;

const WarningIcon = styled.div<{ type: 'info' | 'warning' }>`
  font-size: 24px;
  color: ${props => props.type === 'warning' ? '#ef4444' : '#3b82f6'};
  flex-shrink: 0;
`;

const WarningContent = styled.div`
  color: #e5e7eb;
  line-height: 1.6;
`;

const TransactionDetails = styled.div`
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailLabel = styled.span`
  color: #9ca3af;
  font-size: 14px;
`;

const DetailValue = styled.span`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;

const CostEstimate = styled.div`
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
`;

const CostTitle = styled.h3`
  color: #60a5fa;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
`;

const ErrorMessage = styled.div`
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  color: #fca5a5;
  font-size: 14px;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 16px;
  justify-content: flex-end;
`;

const Button = styled.button<{ variant: 'primary' | 'secondary' | 'danger' }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background-color: #3b82f6;
          color: #ffffff;
          &:hover { background-color: #2563eb; }
        `;
      case 'danger':
        return `
          background-color: #ef4444;
          color: #ffffff;
          &:hover { background-color: #dc2626; }
        `;
      case 'secondary':
      default:
        return `
          background-color: rgba(255, 255, 255, 0.1);
          color: #e5e7eb;
          &:hover { background-color: rgba(255, 255, 255, 0.2); }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface EnhancedTransactionCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction: SafeTxPoolTransaction;
  network: string;
}

const EnhancedTransactionCancellationModal: React.FC<EnhancedTransactionCancellationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transaction,
  network
}) => {
  const [cancellationService] = useState(() => new SafeTransactionCancellationService(network));
  const [estimate, setEstimate] = useState<CancellationEstimate | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'simple_deletion' | 'secure_cancellation' | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEstimate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedMethod(null);

    try {
      await cancellationService.initialize(transaction.safe, network);
      const estimate = await cancellationService.estimateCancellation(transaction);
      setEstimate(estimate);

      // Auto-select the first available method
      if (estimate.canCancel) {
        if (estimate.simpleDeletion.available) {
          setSelectedMethod('simple_deletion');
        } else if (estimate.secureCancellation.available) {
          setSelectedMethod('secure_cancellation');
        }
      }

      if (!estimate.canCancel) {
        setError('No cancellation methods are available for this transaction');
      }
    } catch (err) {
      console.error('Error loading cancellation estimate:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cancellation estimate');
    } finally {
      setLoading(false);
    }
  }, [cancellationService, transaction, network]);

  useEffect(() => {
    if (isOpen && transaction) {
      loadEstimate();
    }
  }, [isOpen, transaction, loadEstimate]);

  const handleCancel = async () => {
    if (!estimate?.canCancel || !selectedMethod) return;

    setProcessing(true);
    setError(null);

    try {
      const result: CancellationResult = await cancellationService.cancelTransaction(transaction, selectedMethod);

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Cancellation failed');
      }
    } catch (err) {
      console.error('Error cancelling transaction:', err);
      setError(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !processing) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            Choose Cancellation Method
          </ModalTitle>
          <CloseButton onClick={onClose} disabled={processing}>
            ×
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
              <LoadingSpinner />
              Analyzing transaction...
            </div>
          ) : (
            <>
              {estimate && estimate.canCancel && (
                <>
                  <SecurityWarning type={estimate.isExecutable ? 'warning' : 'info'}>
                    <WarningIcon type={estimate.isExecutable ? 'warning' : 'info'}>
                      {estimate.isExecutable ? '⚠️' : 'ℹ️'}
                    </WarningIcon>
                    <WarningContent>
                      {estimate.isExecutable ? (
                        <>
                          <strong>Executable Transaction</strong>
                          <br />
                          This transaction has enough signatures to be executed on-chain. You can choose between
                          simple deletion (faster, but less secure) or secure cancellation (on-chain nonce consumption).
                        </>
                      ) : (
                        <>
                          <strong>Non-Executable Transaction</strong>
                          <br />
                          This transaction doesn't have enough signatures to be executed yet. You can safely delete
                          it from the pool or use secure cancellation for maximum security.
                        </>
                      )}
                    </WarningContent>
                  </SecurityWarning>

                  <MethodSelector>
                    {/* Simple Deletion Option */}
                    <MethodOption
                      selected={selectedMethod === 'simple_deletion'}
                      disabled={!estimate.simpleDeletion.available}
                      onClick={() => estimate.simpleDeletion.available && setSelectedMethod('simple_deletion')}
                    >
                      <MethodTitle>
                        🗑️ Simple Deletion
                        {!estimate.isExecutable && <MethodBadge type="recommended">Recommended</MethodBadge>}
                      </MethodTitle>
                      <MethodDescription>
                        Remove transaction from the pool. Fast and free, but executable transactions
                        could still be executed by others with the transaction data.
                      </MethodDescription>
                      {!estimate.simpleDeletion.available && (
                        <div style={{ color: '#ef4444', fontSize: '12px' }}>
                          {estimate.simpleDeletion.reason}
                        </div>
                      )}
                    </MethodOption>

                    {/* Secure Cancellation Option */}
                    <MethodOption
                      selected={selectedMethod === 'secure_cancellation'}
                      disabled={!estimate.secureCancellation.available}
                      onClick={() => estimate.secureCancellation.available && setSelectedMethod('secure_cancellation')}
                    >
                      <MethodTitle>
                        🔒 Secure Cancellation
                        {estimate.isExecutable && <MethodBadge type="recommended">Recommended</MethodBadge>}
                        <MethodBadge type="secure">On-Chain</MethodBadge>
                      </MethodTitle>
                      <MethodDescription>
                        Execute a nonce-consuming transaction on-chain to permanently invalidate
                        the original transaction. Maximum security but requires gas fees.
                      </MethodDescription>
                      {!estimate.secureCancellation.available && (
                        <div style={{ color: '#ef4444', fontSize: '12px' }}>
                          {estimate.secureCancellation.reason}
                        </div>
                      )}
                    </MethodOption>
                  </MethodSelector>
                </>
              )}

              <TransactionDetails>
                <DetailRow>
                  <DetailLabel>Transaction Hash:</DetailLabel>
                  <DetailValue>{formatWalletAddress(transaction.txHash)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>To:</DetailLabel>
                  <DetailValue>{formatWalletAddress(transaction.to)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Value:</DetailLabel>
                  <DetailValue>{transaction.value} ETH</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Nonce:</DetailLabel>
                  <DetailValue>{transaction.nonce}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Signatures:</DetailLabel>
                  <DetailValue>{transaction.signatures.length}</DetailValue>
                </DetailRow>
              </TransactionDetails>

              {selectedMethod === 'secure_cancellation' && estimate?.secureCancellation.available && estimate.secureCancellation.totalCost && (
                <CostEstimate>
                  <CostTitle>Estimated Cancellation Cost</CostTitle>
                  <DetailRow>
                    <DetailLabel>Gas Estimate:</DetailLabel>
                    <DetailValue>{estimate.secureCancellation.gasEstimate}</DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>Gas Price:</DetailLabel>
                    <DetailValue>{estimate.secureCancellation.gasPrice} wei</DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>Total Cost:</DetailLabel>
                    <DetailValue>{estimate.secureCancellation.totalCost} ETH</DetailValue>
                  </DetailRow>
                </CostEstimate>
              )}

              {error && (
                <ErrorMessage>
                  {error}
                </ErrorMessage>
              )}

              <ButtonGroup>
                <Button variant="secondary" onClick={onClose} disabled={processing}>
                  Cancel
                </Button>
                <Button
                  variant={selectedMethod === 'secure_cancellation' ? "danger" : "primary"}
                  onClick={handleCancel}
                  disabled={!estimate?.canCancel || !selectedMethod || processing}
                >
                  {processing && <LoadingSpinner />}
                  {processing ? 'Processing...' : (
                    selectedMethod === 'secure_cancellation' ? 'Execute Secure Cancellation' :
                    selectedMethod === 'simple_deletion' ? 'Delete Transaction' :
                    'Select Method'
                  )}
                </Button>
              </ButtonGroup>
            </>
          )}
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

export default EnhancedTransactionCancellationModal;
