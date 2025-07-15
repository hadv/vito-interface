import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { theme } from '../../../theme';
import { SafeWalletService } from '../../../services/SafeWalletService';
import { walletConnectionService } from '../../../services/WalletConnectionService';
import { useToast } from '../../../hooks/useToast';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${theme.colors.background.primary};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing[8]};
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing[6]};
`;

const ModalTitle = styled.h2`
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  margin: 0;
`;

const CloseButton = styled.button`
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.primary};
  width: 32px;
  height: 32px;
  border-radius: ${theme.borderRadius.full};
  color: ${theme.colors.text.secondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.typography.fontSize.lg};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${theme.colors.background.tertiary};
    color: ${theme.colors.text.primary};
    border-color: ${theme.colors.border.secondary};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const FormGroup = styled.div`
  margin-bottom: ${theme.spacing[6]};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${theme.spacing[2]};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.primary};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
  justify-content: flex-end;
  margin-top: ${theme.spacing[8]};
`;

const InfoMessage = styled.div`
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing[4]};
  margin-bottom: ${theme.spacing[6]};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
`;

const InputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
  margin-top: ${theme.spacing[2]};
`;

const InputLabel = styled.span`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  white-space: nowrap;
`;

const NonceDescription = styled.p`
  margin: ${theme.spacing[2]} 0 0 0;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  line-height: 1.5;
`;

const WarningBox = styled.div`
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing[4]};
  margin-bottom: ${theme.spacing[6]};
`;

const WarningTitle = styled.h3`
  color: #ffc107;
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.semibold};
  margin: 0 0 ${theme.spacing[2]} 0;
`;

const WarningText = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
  margin: 0;
  line-height: 1.5;
`;

interface GuardTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  safeAddress: string;
  network: string;
  isRemoving?: boolean;
  currentGuardAddress?: string;
}

const GuardTransactionModal: React.FC<GuardTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  safeAddress,
  network,
  isRemoving = false,
  currentGuardAddress = ''
}) => {
  const [guardAddress, setGuardAddress] = useState('');
  const [guardError, setGuardError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Nonce management state
  const [currentNonce, setCurrentNonce] = useState(0);
  const [customNonce, setCustomNonce] = useState(0);
  const [nonceLoading, setNonceLoading] = useState(false);
  const recommendedNonce = currentNonce;
  
  const { success, error: showError } = useToast();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setGuardAddress(isRemoving ? currentGuardAddress : '');
      setGuardError('');
      setIsSubmitting(false);
    }
  }, [isOpen, isRemoving, currentGuardAddress]);

  // Fetch current nonce when modal opens and Safe address is available
  useEffect(() => {
    const fetchNonce = async () => {
      if (!isOpen || !safeAddress || !network) {
        return;
      }

      setNonceLoading(true);
      try {
        // Initialize SafeWalletService to get current nonce
        const walletService = new SafeWalletService();
        await walletService.initialize({ 
          safeAddress, 
          network 
        });
        
        const nonce = await walletService.getNonce();
        setCurrentNonce(nonce);
        setCustomNonce(nonce);
        console.log(`Current Safe nonce: ${nonce}`);
      } catch (error) {
        console.error('Failed to fetch Safe nonce:', error);
        // Set default values if nonce fetch fails
        setCurrentNonce(0);
        setCustomNonce(0);
      } finally {
        setNonceLoading(false);
      }
    };

    fetchNonce();
  }, [isOpen, safeAddress, network]);

  const validateForm = (): boolean => {
    let isValid = true;

    if (!isRemoving) {
      // Validate guard address for set operations
      if (!guardAddress.trim()) {
        setGuardError('Guard address is required');
        isValid = false;
      } else if (!ethers.utils.isAddress(guardAddress)) {
        setGuardError('Invalid guard address format');
        isValid = false;
      } else if (guardAddress === ethers.constants.AddressZero) {
        setGuardError('Cannot use zero address as guard');
        isValid = false;
      } else {
        setGuardError('');
      }
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Get wallet connection state
      const connectionState = walletConnectionService.getState();
      
      if (!connectionState.signerConnected) {
        throw new Error('Please connect your wallet to sign transactions');
      }

      // Initialize SafeWalletService
      const walletService = new SafeWalletService();
      await walletService.initialize({ safeAddress, network });
      
      // Set the signer from wallet connection service
      const signer = walletConnectionService.getSigner();
      if (!signer) {
        throw new Error('No wallet signer available. Please connect your wallet first.');
      }
      
      await walletService.setSigner(signer);

      let result;
      if (isRemoving) {
        result = await walletService.removeGuard(customNonce);
        success('Guard removal transaction created successfully!');
        onSuccess(`Guard removed successfully (nonce: ${customNonce})`);
      } else {
        result = await walletService.setGuard(guardAddress.trim(), customNonce);
        success('Guard set transaction created successfully!');
        onSuccess(`Guard set to ${guardAddress.slice(0, 6)}...${guardAddress.slice(-4)} (nonce: ${customNonce})`);
      }

      console.log('Guard transaction result:', result);
      onClose();
    } catch (error: any) {
      console.error('Error creating guard transaction:', error);
      showError(`Failed to create transaction: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            {isRemoving ? 'Remove Smart Contract Guard' : 'Set Smart Contract Guard'}
          </ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <InfoMessage>
          This will create a Safe transaction that needs to be signed and executed by the required number of owners.
        </InfoMessage>

        {!isRemoving && (
          <WarningBox>
            <WarningTitle>⚠️ Security Warning</WarningTitle>
            <WarningText>
              Guards have full power to block Safe transaction execution. A malicious or buggy guard can permanently lock your Safe. 
              Always verify guard contract code before setting and test on testnets first.
            </WarningText>
          </WarningBox>
        )}

        <form onSubmit={handleSubmit}>
          {!isRemoving && (
            <FormGroup>
              <Label htmlFor="guardAddress">Guard Contract Address</Label>
              <Input
                id="guardAddress"
                type="text"
                value={guardAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGuardAddress(e.target.value)}
                placeholder="0x..."
                disabled={isSubmitting}
                error={guardError || undefined}
              />
            </FormGroup>
          )}

          <FormGroup>
            <Label>Transaction Nonce</Label>
            <InputGroup>
              <Input
                type="number"
                min={currentNonce}
                value={customNonce}
                onChange={(e) => setCustomNonce(parseInt(e.target.value) || currentNonce)}
                disabled={isSubmitting || nonceLoading}
                style={{ width: '120px', textAlign: 'center' }}
              />
              <InputLabel>
                {nonceLoading ? 'Loading...' : `(Recommended: ${recommendedNonce})`}
              </InputLabel>
            </InputGroup>
            <NonceDescription>
              Current Safe nonce: {nonceLoading ? 'Loading...' : currentNonce}. Use current nonce for new transactions.
            </NonceDescription>
          </FormGroup>

          <ButtonGroup>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isRemoving ? "danger" : "primary"}
              disabled={isSubmitting || nonceLoading}
            >
              {isSubmitting ? 'Creating...' : (isRemoving ? 'Remove Guard' : 'Set Guard')}
            </Button>
          </ButtonGroup>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default GuardTransactionModal;
