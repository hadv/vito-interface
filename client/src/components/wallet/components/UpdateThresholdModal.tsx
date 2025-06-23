import React, { useState, useEffect } from 'react';
import { safeWalletService } from '../../../services/SafeWalletService';
import SafeManagementService from '../../../services/SafeManagementService';

import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import {
  ModalDescription,
  FormGroup,
  Label,
  StyledInput,
  InputGroup,
  InputLabel,
  TransactionDetails,
  DetailRow,
  DetailLabel,
  DetailValue,
  ErrorMessage,
  InfoMessage,
  ButtonGroup,
  CurrentThreshold,
  CurrentLabel,
  CurrentValue,
  ThresholdBadge
} from './ModalStyles';



interface UpdateThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThreshold: number;
  ownerCount: number;
  currentNonce: number;
  network: string;
  safeAddress: string;
  onSuccess: (message: string) => void;
}

const UpdateThresholdModal: React.FC<UpdateThresholdModalProps> = ({
  isOpen,
  onClose,
  currentThreshold,
  ownerCount,
  currentNonce,
  network,
  safeAddress,
  onSuccess
}) => {
  const [newThreshold, setNewThreshold] = useState(currentThreshold);
  const [customNonce, setCustomNonce] = useState(currentNonce);
  const recommendedNonce = currentNonce;
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewThreshold(currentThreshold);
      setCustomNonce(currentNonce);
      setError(null);
    }
  }, [isOpen, currentThreshold, currentNonce]);

  const handleSubmit = async () => {
    try {
      setIsCreating(true);
      setError(null);

      // Validate threshold
      if (!SafeManagementService.validateThreshold(newThreshold, ownerCount)) {
        throw new Error(`Invalid threshold: must be between 1 and ${ownerCount}`);
      }

      if (newThreshold === currentThreshold) {
        throw new Error('New threshold is the same as current threshold');
      }

      // Get Safe info
      const safeInfo = await safeWalletService.getEnhancedSafeInfo();

      // Create transaction with custom nonce
      const txData = SafeManagementService.createChangeThresholdTransaction(
        safeInfo.address,
        newThreshold,
        customNonce
      );

      // Create and propose transaction
      await safeWalletService.createTransaction({
        to: txData.to,
        value: txData.value,
        data: txData.data
      });

      onSuccess(`Transaction created to change threshold to ${newThreshold} out of ${ownerCount} signers (nonce: ${customNonce})`);
      onClose();
    } catch (err: any) {
      console.error('Error creating change threshold transaction:', err);
      setError(err.message || 'Failed to create change threshold transaction');
    } finally {
      setIsCreating(false);
    }
  };

  const isThresholdChanged = newThreshold !== currentThreshold;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Threshold">
      <ModalDescription>
        Change the number of required confirmations for Safe transactions. This affects how many signers must approve each transaction.
      </ModalDescription>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <FormGroup>
        <Label>Current Threshold</Label>
        <CurrentThreshold>
          <CurrentLabel>Required confirmations</CurrentLabel>
          <CurrentValue>
            <ThresholdBadge>
              {currentThreshold} out of {ownerCount} signers
            </ThresholdBadge>
          </CurrentValue>
        </CurrentThreshold>
      </FormGroup>

      <FormGroup>
        <Label>New Threshold</Label>
        <InputGroup>
          <StyledInput
            type="number"
            min={1}
            max={ownerCount}
            value={newThreshold}
            onChange={(e) => setNewThreshold(parseInt(e.target.value) || 1)}
            disabled={isCreating}
            style={{ width: '120px', textAlign: 'center', fontSize: '18px', fontWeight: '600' }}
          />
          <InputLabel>out of {ownerCount} signers</InputLabel>
        </InputGroup>
      </FormGroup>

      <FormGroup>
        <Label>Transaction Nonce</Label>
        <InputGroup>
          <StyledInput
            type="number"
            min={currentNonce}
            value={customNonce}
            onChange={(e) => setCustomNonce(parseInt(e.target.value) || currentNonce)}
            disabled={isCreating}
            style={{ width: '120px', textAlign: 'center' }}
          />
          <InputLabel>(Recommended: {recommendedNonce})</InputLabel>
        </InputGroup>
        <ModalDescription style={{ marginTop: '8px', marginBottom: 0, fontSize: '14px' }}>
          Current Safe nonce: {currentNonce}. Use current nonce for new transactions.
        </ModalDescription>
      </FormGroup>

      {isThresholdChanged && (
        <InfoMessage>
          <strong>Threshold Change:</strong><br />
          {newThreshold > currentThreshold
            ? `Increasing security: ${newThreshold - currentThreshold} more signature(s) will be required`
            : `Decreasing security: ${currentThreshold - newThreshold} fewer signature(s) will be required`
          }
        </InfoMessage>
      )}

      <TransactionDetails>
        <DetailRow>
          <DetailLabel>Operation:</DetailLabel>
          <DetailValue style={{ color: '#4ECDC4', fontWeight: 'bold' }}>
            Change Threshold
          </DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>Current Threshold:</DetailLabel>
          <DetailValue>{currentThreshold} out of {ownerCount} signers</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>New Threshold:</DetailLabel>
          <DetailValue>{newThreshold} out of {ownerCount} signers</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>Transaction Nonce:</DetailLabel>
          <DetailValue>{customNonce}</DetailValue>
        </DetailRow>
      </TransactionDetails>

      <ButtonGroup>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isCreating}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isCreating || !isThresholdChanged}
          loading={isCreating}
        >
          {isCreating ? 'Creating Transaction...' : 'Update Threshold'}
        </Button>
      </ButtonGroup>
    </Modal>
  );
};

export default UpdateThresholdModal;
