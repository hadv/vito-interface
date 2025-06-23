import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { safeWalletService } from '../../../services/SafeWalletService';
import SafeManagementService from '../../../services/SafeManagementService';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Modal from '../../ui/Modal';

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

interface AddSignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOwners: string[];
  currentThreshold: number;
  onSuccess: (message: string) => void;
}

const AddSignerModal: React.FC<AddSignerModalProps> = ({
  isOpen,
  onClose,
  currentOwners,
  currentThreshold,
  onSuccess
}) => {
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [newThreshold, setNewThreshold] = useState(currentThreshold + 1);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewOwnerAddress('');
      setNewThreshold(currentThreshold + 1);
      setError(null);
    }
  }, [isOpen, currentThreshold]);

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

      // Create transaction
      const txData = SafeManagementService.createAddOwnerTransaction(
        safeInfo.address,
        newOwnerAddress,
        newThreshold,
        safeInfo.nonce
      );

      // Create and propose transaction
      await safeWalletService.createTransaction({
        to: txData.to,
        value: txData.value,
        data: txData.data
      });

      onSuccess(`Transaction created to add signer ${newOwnerAddress.slice(0, 6)}...${newOwnerAddress.slice(-4)} with threshold ${newThreshold}`);
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
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <Title>Add New Signer</Title>
        <Description>
          Add a new signer to the Safe wallet. You can also update the threshold to reflect the new security requirements.
        </Description>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <FormGroup>
          <Label>New Signer Address</Label>
          <Input
            placeholder="0x... (Ethereum address)"
            value={newOwnerAddress}
            onChange={(e) => setNewOwnerAddress(e.target.value)}
            disabled={isCreating}
          />
        </FormGroup>

        <FormGroup>
          <Label>New Threshold</Label>
          <ThresholdGroup>
            <ThresholdInput
              type="number"
              min={1}
              max={newOwnerCount}
              value={newThreshold}
              onChange={(e) => setNewThreshold(parseInt(e.target.value) || 1)}
              disabled={isCreating}
            />
            <ThresholdLabel>out of {newOwnerCount} signers</ThresholdLabel>
          </ThresholdGroup>
          <Description style={{ marginTop: theme.spacing[2], marginBottom: 0 }}>
            Current: {currentThreshold} out of {currentOwners.length} signers
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
            variant="primary"
            onClick={handleSubmit}
            disabled={isCreating || !newOwnerAddress}
            loading={isCreating}
          >
            Add Signer
          </Button>
        </ButtonGroup>
      </ModalContent>
    </Modal>
  );
};

export default AddSignerModal;
