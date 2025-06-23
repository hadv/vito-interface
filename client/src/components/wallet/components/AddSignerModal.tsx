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
  ButtonGroup
} from './ModalStyles';



interface AddSignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOwners: string[];
  currentThreshold: number;
  currentNonce: number;
  network: string;
  safeAddress: string;
  onSuccess: (message: string) => void;
}

const AddSignerModal: React.FC<AddSignerModalProps> = ({
  isOpen,
  onClose,
  currentOwners,
  currentThreshold,
  currentNonce,
  network,
  safeAddress,
  onSuccess
}) => {
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [newThreshold, setNewThreshold] = useState(currentThreshold + 1);
  const [customNonce, setCustomNonce] = useState(currentNonce + 1);
  const recommendedNonce = currentNonce + 1;
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewOwnerAddress('');
      setNewThreshold(currentThreshold + 1);
      setCustomNonce(currentNonce + 1);
      setError(null);
    }
  }, [isOpen, currentThreshold, currentNonce]);

  const handleSubmit = async () => {
    if (!newOwnerAddress) return;

    try {
      setIsCreating(true);
      setError(null);

      // Validate address
      if (!newOwnerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid Ethereum address');
      }

      // Check if owner already exists
      if (currentOwners.some(owner => owner.toLowerCase() === newOwnerAddress.toLowerCase())) {
        throw new Error('Address is already an owner');
      }

      // Validate threshold
      if (!SafeManagementService.validateThreshold(newThreshold, currentOwners.length + 1)) {
        throw new Error(`Invalid threshold: must be between 1 and ${currentOwners.length + 1}`);
      }

      // Get Safe info for nonce
      const safeInfo = await safeWalletService.getEnhancedSafeInfo();

      // Create transaction with custom nonce
      const txData = SafeManagementService.createAddOwnerTransaction(
        safeInfo.address,
        newOwnerAddress,
        newThreshold,
        customNonce
      );

      // Create and propose transaction
      await safeWalletService.createTransaction({
        to: txData.to,
        value: txData.value,
        data: txData.data
      });

      onSuccess(`Transaction created to add signer ${newOwnerAddress.slice(0, 6)}...${newOwnerAddress.slice(-4)} with threshold ${newThreshold} (nonce: ${customNonce})`);
      onClose();
    } catch (err: any) {
      console.error('Error creating add owner transaction:', err);
      setError(err.message || 'Failed to create add owner transaction');
    } finally {
      setIsCreating(false);
    }
  };

  const newOwnerCount = currentOwners.length + 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Signer">
      <ModalDescription>
        Add a new signer to the Safe wallet. You can also update the threshold to reflect the new security requirements.
      </ModalDescription>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <FormGroup>
        <Label>New Signer Address</Label>
        <StyledInput
          placeholder="0x... (Ethereum address)"
          value={newOwnerAddress}
          onChange={(e) => setNewOwnerAddress(e.target.value)}
          disabled={isCreating}
        />
      </FormGroup>

      <FormGroup>
        <Label>New Threshold</Label>
        <InputGroup>
          <StyledInput
            type="number"
            min={1}
            max={newOwnerCount}
            value={newThreshold}
            onChange={(e) => setNewThreshold(parseInt(e.target.value) || 1)}
            disabled={isCreating}
            style={{ width: '120px', textAlign: 'center' }}
          />
          <InputLabel>out of {newOwnerCount} signers</InputLabel>
        </InputGroup>
        <ModalDescription style={{ marginTop: '8px', marginBottom: 0, fontSize: '14px' }}>
          Current: {currentThreshold} out of {currentOwners.length} signers
        </ModalDescription>
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
          Current Safe nonce: {currentNonce}. Recommended nonce is current + 1.
        </ModalDescription>
      </FormGroup>

      <TransactionDetails>
        <DetailRow>
          <DetailLabel>Operation:</DetailLabel>
          <DetailValue style={{ color: '#4ECDC4', fontWeight: 'bold' }}>
            Add Owner with Threshold
          </DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>New Signer:</DetailLabel>
          <DetailValue>{newOwnerAddress || 'Not specified'}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>New Threshold:</DetailLabel>
          <DetailValue>{newThreshold} out of {newOwnerCount} signers</DetailValue>
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
          disabled={isCreating || !newOwnerAddress}
          loading={isCreating}
        >
          {isCreating ? 'Creating Transaction...' : 'Add Signer'}
        </Button>
      </ButtonGroup>
    </Modal>
  );
};

export default AddSignerModal;
