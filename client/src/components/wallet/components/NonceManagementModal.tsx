import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';

import { SafeTxPoolService } from '../../../services/SafeTxPoolService';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Modal from '../../ui/Modal';

const ModalContent = styled.div`
  padding: ${theme.spacing[6]};
  max-width: 600px;
  width: 100%;
`;

const Title = styled.h2`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const Description = styled.p`
  margin: 0 0 ${theme.spacing[6]} 0;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  line-height: 1.5;
`;

const NonceInfo = styled.div`
  display: grid;
  gap: ${theme.spacing[4]};
  margin-bottom: ${theme.spacing[6]};
`;

const NonceItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing[3]};
  background: ${theme.colors.neutral[800]};
  border: 1px solid ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.md};
`;

const NonceLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.secondary};
`;

const NonceValue = styled.div`
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const FormGroup = styled.div`
  margin-bottom: ${theme.spacing[4]};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${theme.spacing[2]};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.secondary};
`;

const NonceInputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
`;

const NonceInput = styled(Input)`
  width: 120px;
  text-align: center;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
`;

const RecommendedBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing[1]};
  padding: ${theme.spacing[1]} ${theme.spacing[2]};
  background: ${theme.colors.primary[400]}20;
  color: ${theme.colors.primary[400]};
  border: 1px solid ${theme.colors.primary[400]}30;
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
  justify-content: flex-end;
  margin-top: ${theme.spacing[6]};
`;

const ErrorMessage = styled.div`
  padding: ${theme.spacing[3]};
  background: ${theme.colors.status.error}20;
  border: 1px solid ${theme.colors.status.error}30;
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.status.error};
  font-size: ${theme.typography.fontSize.sm};
  margin-bottom: ${theme.spacing[4]};
`;

const WarningMessage = styled.div`
  padding: ${theme.spacing[3]};
  background: ${theme.colors.status.warning}20;
  border: 1px solid ${theme.colors.status.warning}30;
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.status.warning};
  font-size: ${theme.typography.fontSize.sm};
  margin-bottom: ${theme.spacing[4]};
`;

const PendingTxList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: ${theme.spacing[4]};
`;

const PendingTxItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing[2]};
  background: ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.sm};
  margin-bottom: ${theme.spacing[2]};
  font-size: ${theme.typography.fontSize.sm};
`;

interface NonceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNonce: number;
  network: string;
  safeAddress: string;
  onSuccess: (message: string) => void;
}

interface PendingTransaction {
  txHash: string;
  nonce: number;
  to: string;
}

const NonceManagementModal: React.FC<NonceManagementModalProps> = ({
  isOpen,
  onClose,
  currentNonce,
  network,
  safeAddress,
  onSuccess
}) => {
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [maxPendingNonce, setMaxPendingNonce] = useState<number>(currentNonce - 1);
  const [recommendedNonce, setRecommendedNonce] = useState<number>(currentNonce);
  const [customNonce, setCustomNonce] = useState<number>(currentNonce);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load pending transactions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPendingTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, safeAddress, network]);

  const loadPendingTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize SafeTxPoolService
      const safeTxPoolService = new SafeTxPoolService(network);
      
      if (!safeTxPoolService.isConfigured()) {
        console.warn('SafeTxPool not configured for network:', network);
        setPendingTransactions([]);
        setMaxPendingNonce(currentNonce - 1);
        setRecommendedNonce(currentNonce);
        setCustomNonce(currentNonce);
        return;
      }

      // Get pending transactions
      const pending = await safeTxPoolService.getPendingTransactions(safeAddress);
      
      // Filter valid pending transactions (nonce >= currentNonce)
      const validPending = pending.filter(tx => tx.nonce >= currentNonce);
      
      // Extract nonces and find maximum
      const pendingNonces = validPending.map(tx => tx.nonce);
      const maxPending = pendingNonces.length > 0 ? Math.max(...pendingNonces) : currentNonce - 1;
      
      // Calculate recommended nonce: max(currentNonce, maxPendingNonce) + 1
      const recommended = Math.max(currentNonce, maxPending) + 1;

      setPendingTransactions(validPending.map(tx => ({
        txHash: tx.txHash,
        nonce: tx.nonce,
        to: tx.to
      })));
      setMaxPendingNonce(maxPending);
      setRecommendedNonce(recommended);
      setCustomNonce(recommended);
    } catch (err: any) {
      console.error('Error loading pending transactions:', err);
      setError(err.message || 'Failed to load pending transactions');
      // Set defaults on error
      setPendingTransactions([]);
      setMaxPendingNonce(currentNonce - 1);
      setRecommendedNonce(currentNonce);
      setCustomNonce(currentNonce);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseRecommended = () => {
    setCustomNonce(recommendedNonce);
  };

  const handleSubmit = () => {
    // For now, just show success message
    // In a real implementation, this would update the nonce for the next transaction
    onSuccess(`Next transaction will use nonce ${customNonce}`);
    onClose();
  };

  const hasConflict = customNonce <= maxPendingNonce && customNonce >= currentNonce;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <Title>Manage Transaction Nonce</Title>
        <Description>
          View current Safe nonce and pending transactions. You can set a custom nonce for the next transaction to avoid conflicts.
        </Description>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: theme.spacing[4] }}>
            Loading pending transactions...
          </div>
        ) : (
          <>
            <NonceInfo>
              <NonceItem>
                <NonceLabel>Current Safe Nonce</NonceLabel>
                <NonceValue>{currentNonce}</NonceValue>
              </NonceItem>
              <NonceItem>
                <NonceLabel>Pending Transactions</NonceLabel>
                <NonceValue>{pendingTransactions.length}</NonceValue>
              </NonceItem>
              <NonceItem>
                <NonceLabel>Highest Pending Nonce</NonceLabel>
                <NonceValue>{maxPendingNonce >= currentNonce ? maxPendingNonce : 'None'}</NonceValue>
              </NonceItem>
              <NonceItem>
                <NonceLabel>Recommended Next Nonce</NonceLabel>
                <NonceValue>
                  {recommendedNonce} <RecommendedBadge>Recommended</RecommendedBadge>
                </NonceValue>
              </NonceItem>
            </NonceInfo>

            {pendingTransactions.length > 0 && (
              <FormGroup>
                <Label>Pending Transactions</Label>
                <PendingTxList>
                  {pendingTransactions.map((tx, index) => (
                    <PendingTxItem key={tx.txHash}>
                      <span>Nonce {tx.nonce}</span>
                      <span>{tx.to.slice(0, 6)}...{tx.to.slice(-4)}</span>
                    </PendingTxItem>
                  ))}
                </PendingTxList>
              </FormGroup>
            )}

            <FormGroup>
              <Label>Custom Nonce for Next Transaction</Label>
              <NonceInputGroup>
                <NonceInput
                  type="number"
                  min={currentNonce}
                  value={customNonce}
                  onChange={(e) => setCustomNonce(parseInt(e.target.value) || currentNonce)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleUseRecommended}
                  disabled={customNonce === recommendedNonce}
                >
                  Use Recommended
                </Button>
              </NonceInputGroup>
              
              {hasConflict && (
                <WarningMessage style={{ marginTop: theme.spacing[2] }}>
                  <strong>Warning:</strong> This nonce conflicts with a pending transaction. 
                  Consider using nonce {recommendedNonce} or higher.
                </WarningMessage>
              )}
            </FormGroup>
          </>
        )}

        <ButtonGroup>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            Set Nonce
          </Button>
        </ButtonGroup>
      </ModalContent>
    </Modal>
  );
};

export default NonceManagementModal;
