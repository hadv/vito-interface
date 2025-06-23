import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { safeWalletService } from '../../../services/SafeWalletService';
import SafeManagementService from '../../../services/SafeManagementService';
import { SafeTxPoolService } from '../../../services/SafeTxPoolService';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Modal from '../../ui/Modal';
import AddressDisplay from './AddressDisplay';

const ModalContent = styled.div`
  padding: ${theme.spacing[6]};
  max-width: 500px;
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

const SignerToRemove = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
  padding: ${theme.spacing[3]};
  background: ${theme.colors.status.error}10;
  border: 1px solid ${theme.colors.status.error}30;
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing[4]};
`;

const RemoveIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: ${theme.colors.status.error};
  color: white;
  border-radius: 50%;
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.bold};
  flex-shrink: 0;
`;

const ThresholdGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
  margin-top: ${theme.spacing[2]};
`;

const ThresholdInput = styled(Input)`
  width: 80px;
  text-align: center;
`;

const ThresholdLabel = styled.span`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
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

interface RemoveSignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  signerToRemove: string | null;
  currentOwners: string[];
  currentThreshold: number;
  network: string;
  onSuccess: (message: string) => void;
}

const RemoveSignerModal: React.FC<RemoveSignerModalProps> = ({
  isOpen,
  onClose,
  signerToRemove,
  currentOwners,
  currentThreshold,
  network,
  onSuccess
}) => {
  const [newThreshold, setNewThreshold] = useState(Math.max(1, currentThreshold - 1));
  const [customNonce, setCustomNonce] = useState(0);
  const [recommendedNonce, setRecommendedNonce] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens and calculate recommended nonce
  useEffect(() => {
    if (isOpen) {
      setNewThreshold(Math.max(1, currentThreshold - 1));
      setError(null);
      calculateRecommendedNonce();
    }
  }, [isOpen, currentThreshold]);

  const calculateRecommendedNonce = async () => {
    try {
      // Get current Safe nonce
      const safeInfo = await safeWalletService.getEnhancedSafeInfo();
      const currentNonce = safeInfo.nonce;

      // Initialize SafeTxPoolService
      const safeTxPoolService = new SafeTxPoolService(network);

      if (!safeTxPoolService.isConfigured()) {
        setRecommendedNonce(currentNonce);
        setCustomNonce(currentNonce);
        return;
      }

      // Get pending transactions
      const pending = await safeTxPoolService.getPendingTransactions(safeInfo.address);

      // Filter valid pending transactions (nonce >= currentNonce)
      const validPending = pending.filter(tx => tx.nonce >= currentNonce);

      // Extract nonces and find maximum
      const pendingNonces = validPending.map(tx => tx.nonce);
      const maxPending = pendingNonces.length > 0 ? Math.max(...pendingNonces) : currentNonce - 1;

      // Calculate recommended nonce: max(currentNonce, maxPendingNonce) + 1
      const recommended = Math.max(currentNonce, maxPending) + 1;

      setRecommendedNonce(recommended);
      setCustomNonce(recommended);
    } catch (err) {
      console.warn('Error calculating recommended nonce:', err);
      // Fallback to current nonce
      try {
        const safeInfo = await safeWalletService.getEnhancedSafeInfo();
        setRecommendedNonce(safeInfo.nonce);
        setCustomNonce(safeInfo.nonce);
      } catch (fallbackErr) {
        console.error('Error getting Safe nonce:', fallbackErr);
      }
    }
  };

  const handleSubmit = async () => {
    if (!signerToRemove) return;

    try {
      setIsCreating(true);
      setError(null);

      const newOwnerCount = currentOwners.length - 1;

      // Check if removal is valid
      if (!SafeManagementService.canRemoveOwner(currentOwners.length, newThreshold)) {
        throw new Error(`Cannot remove signer: would leave ${newOwnerCount} signers but threshold is ${newThreshold}`);
      }

      // Validate threshold
      if (!SafeManagementService.validateThreshold(newThreshold, newOwnerCount)) {
        throw new Error(`Invalid threshold: must be between 1 and ${newOwnerCount}`);
      }

      // Find previous owner
      const prevOwner = SafeManagementService.findPrevOwner(currentOwners, signerToRemove);

      // Get Safe info for nonce
      const safeInfo = await safeWalletService.getEnhancedSafeInfo();

      // Create transaction with custom nonce
      const txData = SafeManagementService.createRemoveOwnerTransaction(
        safeInfo.address,
        prevOwner,
        signerToRemove,
        newThreshold,
        customNonce
      );

      // Create and propose transaction
      await safeWalletService.createTransaction({
        to: txData.to,
        value: txData.value,
        data: txData.data
      });

      onSuccess(`Transaction created to remove signer ${signerToRemove.slice(0, 6)}...${signerToRemove.slice(-4)} with threshold ${newThreshold} (nonce: ${customNonce})`);
      onClose();
    } catch (err: any) {
      console.error('Error creating remove owner transaction:', err);
      setError(err.message || 'Failed to create remove owner transaction');
    } finally {
      setIsCreating(false);
    }
  };

  const newOwnerCount = currentOwners.length - 1;
  const isLastOwner = currentOwners.length <= 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <Title>Remove Signer</Title>
        <Description>
          Remove a signer from the Safe wallet. You must also set the new threshold for the reduced number of signers.
        </Description>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {isLastOwner && (
          <WarningMessage>
            <strong>Cannot remove the last signer!</strong><br />
            A Safe must have at least one signer to remain functional.
          </WarningMessage>
        )}

        {signerToRemove && (
          <FormGroup>
            <Label>Signer to Remove</Label>
            <SignerToRemove>
              <RemoveIcon>−</RemoveIcon>
              <AddressDisplay
                address={signerToRemove}
                network={network}
                truncate={true}
                truncateLength={6}
                showCopy={true}
                showExplorer={true}
              />
            </SignerToRemove>
          </FormGroup>
        )}

        <FormGroup>
          <Label>New Threshold</Label>
          <ThresholdGroup>
            <ThresholdInput
              type="number"
              min={1}
              max={Math.max(1, newOwnerCount)}
              value={newThreshold}
              onChange={(e) => setNewThreshold(parseInt(e.target.value) || 1)}
              disabled={isCreating || isLastOwner}
            />
            <ThresholdLabel>out of {newOwnerCount} signers</ThresholdLabel>
          </ThresholdGroup>
          <Description style={{ marginTop: theme.spacing[2], marginBottom: 0 }}>
            Current: {currentThreshold} out of {currentOwners.length} signers
          </Description>
        </FormGroup>

        <FormGroup>
          <Label>Transaction Nonce</Label>
          <ThresholdGroup>
            <ThresholdInput
              type="number"
              min={0}
              value={customNonce}
              onChange={(e) => setCustomNonce(parseInt(e.target.value) || 0)}
              disabled={isCreating || isLastOwner}
            />
            <ThresholdLabel>
              (Recommended: {recommendedNonce})
            </ThresholdLabel>
          </ThresholdGroup>
          <Description style={{ marginTop: theme.spacing[2], marginBottom: 0 }}>
            Use recommended nonce to avoid conflicts with pending transactions.
          </Description>
        </FormGroup>

        <ButtonGroup>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={isCreating || !signerToRemove || isLastOwner}
            loading={isCreating}
          >
            Remove Signer
          </Button>
        </ButtonGroup>
      </ModalContent>
    </Modal>
  );
};

export default RemoveSignerModal;
