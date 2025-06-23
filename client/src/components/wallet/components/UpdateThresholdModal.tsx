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
  width: 120px;
  text-align: center;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
`;

const ThresholdLabel = styled.span`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
`;

const CurrentThreshold = styled.div`
  padding: ${theme.spacing[3]};
  background: ${theme.colors.neutral[800]};
  border: 1px solid ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing[4]};
`;

const CurrentLabel = styled.div`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.tertiary};
  margin-bottom: ${theme.spacing[1]};
`;

const CurrentValue = styled.div`
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const ThresholdBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing[1]};
  padding: ${theme.spacing[1]} ${theme.spacing[2]};
  background: ${theme.colors.primary[400]}20;
  color: ${theme.colors.primary[400]};
  border: 1px solid ${theme.colors.primary[400]}30;
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.fontSize.sm};
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

const InfoMessage = styled.div`
  padding: ${theme.spacing[3]};
  background: ${theme.colors.primary[400]}10;
  border: 1px solid ${theme.colors.primary[400]}30;
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.primary[400]};
  font-size: ${theme.typography.fontSize.sm};
  margin-bottom: ${theme.spacing[4]};
`;

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
  const [customNonce, setCustomNonce] = useState(currentNonce + 1);
  const recommendedNonce = currentNonce + 1;
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewThreshold(currentThreshold);
      setCustomNonce(currentNonce + 1);
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
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <Title>Update Threshold</Title>
        <Description>
          Change the number of required confirmations for Safe transactions. This affects how many signers must approve each transaction.
        </Description>

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
          <ThresholdGroup>
            <ThresholdInput
              type="number"
              min={1}
              max={ownerCount}
              value={newThreshold}
              onChange={(e) => setNewThreshold(parseInt(e.target.value) || 1)}
              disabled={isCreating}
            />
            <ThresholdLabel>out of {ownerCount} signers</ThresholdLabel>
          </ThresholdGroup>
        </FormGroup>

        <FormGroup>
          <Label>Transaction Nonce</Label>
          <ThresholdGroup>
            <ThresholdInput
              type="number"
              min={0}
              value={customNonce}
              onChange={(e) => setCustomNonce(parseInt(e.target.value) || 0)}
              disabled={isCreating}
            />
            <ThresholdLabel>
              (Recommended: {recommendedNonce})
            </ThresholdLabel>
          </ThresholdGroup>
          <Description style={{ marginTop: theme.spacing[2], marginBottom: 0 }}>
            Current Safe nonce: {currentNonce}. Recommended nonce is current + 1.
          </Description>
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
            Update Threshold
          </Button>
        </ButtonGroup>
      </ModalContent>
    </Modal>
  );
};

export default UpdateThresholdModal;
