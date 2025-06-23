import React, { useState, useEffect } from 'react';
import { safeWalletService } from '../../../services/SafeWalletService';
import SafeManagementService from '../../../services/SafeManagementService';

import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import AddressDisplay from './AddressDisplay';
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
  WarningMessage,
  ButtonGroup,
  SignerToRemove,
  RemoveIcon
} from './ModalStyles';



interface RemoveSignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  signerToRemove: string | null;
  currentOwners: string[];
  currentThreshold: number;
  currentNonce: number;
  network: string;
  onSuccess: (message: string) => void;
}

const RemoveSignerModal: React.FC<RemoveSignerModalProps> = ({
  isOpen,
  onClose,
  signerToRemove,
  currentOwners,
  currentThreshold,
  currentNonce,
  network,
  onSuccess
}) => {
  const [newThreshold, setNewThreshold] = useState(Math.max(1, currentThreshold - 1));
  const [customNonce, setCustomNonce] = useState(currentNonce + 1);
  const recommendedNonce = currentNonce + 1;
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewThreshold(Math.max(1, currentThreshold - 1));
      setCustomNonce(currentNonce + 1);
      setError(null);
    }
  }, [isOpen, currentThreshold, currentNonce]);

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

      // Get Safe info
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
    <Modal isOpen={isOpen} onClose={onClose} title="Remove Signer">
      <ModalDescription>
        Remove a signer from the Safe wallet. You must also set the new threshold for the reduced number of signers.
      </ModalDescription>

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
        <InputGroup>
          <StyledInput
            type="number"
            min={1}
            max={Math.max(1, newOwnerCount)}
            value={newThreshold}
            onChange={(e) => setNewThreshold(parseInt(e.target.value) || 1)}
            disabled={isCreating || isLastOwner}
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
            min={0}
            value={customNonce}
            onChange={(e) => setCustomNonce(parseInt(e.target.value) || 0)}
            disabled={isCreating || isLastOwner}
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
          <DetailValue style={{ color: '#FF6B6B', fontWeight: 'bold' }}>
            Remove Owner with Threshold
          </DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>Removing Signer:</DetailLabel>
          <DetailValue>{signerToRemove || 'Not specified'}</DetailValue>
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
          variant="danger"
          onClick={handleSubmit}
          disabled={isCreating || !signerToRemove || isLastOwner}
          loading={isCreating}
        >
          {isCreating ? 'Creating Transaction...' : 'Remove Signer'}
        </Button>
      </ButtonGroup>
    </Modal>
  );
};

export default RemoveSignerModal;
