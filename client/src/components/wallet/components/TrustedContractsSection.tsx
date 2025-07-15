import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { theme } from '../../../theme';
import { safeTxPoolService } from '../../../services/SafeTxPoolService';
import { walletConnectionService, WalletConnectionState } from '../../../services/WalletConnectionService';
import { useToast } from '../../../hooks/useToast';
import { ErrorHandler } from '../../../utils/errorHandling';
import { isValidAddress } from '../../../utils/addressUtils';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import AddressDisplay from './AddressDisplay';
import WalletConnectionModal from '../../ui/WalletConnectionModal';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: ${theme.spacing[8]};
`;

const Section = styled.div`
  margin-bottom: ${theme.spacing[8]};
  background: ${theme.colors.neutral[800]};
  border: 1px solid ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing[6]};
`;

const SectionTitle = styled.h3`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const Description = styled.p`
  margin: 0 0 ${theme.spacing[6]} 0;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  line-height: 1.5;
`;

const TrustedContractForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[4]};
  margin-bottom: ${theme.spacing[6]};
`;

const FormRow = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
  align-items: flex-end;
`;

const TrustedContractsList = styled.div`
  margin-top: ${theme.spacing[6]};
`;

const TrustedContractItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing[4]};
  background: ${theme.colors.neutral[700]};
  border: 1px solid ${theme.colors.neutral[600]};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing[3]};

  &:last-child {
    margin-bottom: 0;
  }
`;

const ContractInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[1]};
`;

const ContractLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.primary};
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing[8]};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing[8]};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
`;

const SuccessMessage = styled.div`
  padding: ${theme.spacing[3]} ${theme.spacing[4]};
  background: ${theme.colors.status.success}20;
  border: 1px solid ${theme.colors.status.success}30;
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.status.success};
  font-size: ${theme.typography.fontSize.sm};
  margin-bottom: ${theme.spacing[4]};
`;

interface TrustedContract {
  address: string;
  name?: string;
}

interface TrustedContractsSectionProps {
  network: string;
}

const TrustedContractsSection: React.FC<TrustedContractsSectionProps> = ({ network }) => {
  const [trustedContracts, setTrustedContracts] = useState<TrustedContract[]>([]);
  const [newContractAddress, setNewContractAddress] = useState<string>('');
  const [addressError, setAddressError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionState, setConnectionState] = useState<WalletConnectionState>({
    isConnected: false,
    signerConnected: false,
    readOnlyMode: true,
    safeAddress: '',
    signerAddress: '',
    network: ''
  });
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const { addToast } = useToast();

  // Subscribe to wallet connection state
  useEffect(() => {
    const updateConnectionState = () => {
      const state = walletConnectionService.getConnectionState();
      setConnectionState(state);
    };

    updateConnectionState();
    const unsubscribe = walletConnectionService.subscribe(updateConnectionState);
    return unsubscribe;
  }, []);

  // Load trusted contracts for the current Safe
  const loadTrustedContracts = useCallback(async () => {
    if (!connectionState.isConnected || !connectionState.safeAddress) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Note: Since we don't have a direct method to get all trusted contracts,
      // we'll need to implement this differently or track them locally
      // For now, we'll start with an empty list and add contracts as they're added
      setTrustedContracts([]);
    } catch (error) {
      console.error('Error loading trusted contracts:', error);
      const errorDetails = ErrorHandler.classifyError(error);
      addToast('Failed to load trusted contracts', {
        type: 'error',
        message: errorDetails.userMessage
      });
    } finally {
      setIsLoading(false);
    }
  }, [connectionState.isConnected, connectionState.safeAddress, addToast]);

  useEffect(() => {
    loadTrustedContracts();
  }, [loadTrustedContracts]);

  const validateContractAddress = (address: string): string => {
    if (!address.trim()) {
      return '';
    }

    if (!isValidAddress(address)) {
      return 'Invalid Ethereum address format';
    }

    if (address === ethers.constants.AddressZero) {
      return 'Cannot add zero address as trusted contract';
    }

    // Check if already in the list
    if (trustedContracts.some(contract => contract.address.toLowerCase() === address.toLowerCase())) {
      return 'Contract is already in the trusted list';
    }

    return '';
  };

  const handleAddressChange = (value: string) => {
    setNewContractAddress(value);
    setSuccessMessage('');
    setAddressError(validateContractAddress(value));
  };

  const handleWalletConnectionRequired = (action: () => void) => {
    const isSignerConnected = connectionState.signerConnected && !connectionState.readOnlyMode;
    if (isSignerConnected) {
      action();
    } else {
      setShowWalletModal(true);
    }
  };

  const handleWalletSelect = async (walletType: string) => {
    try {
      await walletConnectionService.connectSignerWallet();
      setShowWalletModal(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleAddTrustedContract = () => {
    handleWalletConnectionRequired(async () => {
      const validationError = validateContractAddress(newContractAddress);
      if (validationError) {
        setAddressError(validationError);
        return;
      }

      if (!connectionState.safeAddress) {
        addToast('No Safe Connected', {
          type: 'error',
          message: 'Please connect to a Safe wallet first.'
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const service = safeTxPoolService;
        service.setSigner(walletConnectionService.getSigner());

        await service.addTrustedContract(connectionState.safeAddress, newContractAddress.trim());

        // Add to local list
        setTrustedContracts(prev => [...prev, { address: newContractAddress.trim() }]);
        setNewContractAddress('');
        setSuccessMessage('Trusted contract has been successfully added!');

        addToast('Trusted Contract Added', {
          type: 'success',
          message: 'The contract has been added to your trusted contracts list.'
        });
      } catch (error) {
        console.error('Error adding trusted contract:', error);
        const errorDetails = ErrorHandler.classifyError(error);
        addToast('Failed to add trusted contract', {
          type: 'error',
          message: errorDetails.userMessage
        });
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const handleRemoveTrustedContract = (contractAddress: string) => {
    handleWalletConnectionRequired(async () => {
      if (!connectionState.safeAddress) {
        addToast('No Safe Connected', {
          type: 'error',
          message: 'Please connect to a Safe wallet first.'
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const service = safeTxPoolService;
        service.setSigner(walletConnectionService.getSigner());

        await service.removeTrustedContract(connectionState.safeAddress, contractAddress);

        // Remove from local list
        setTrustedContracts(prev => prev.filter(contract =>
          contract.address.toLowerCase() !== contractAddress.toLowerCase()
        ));
        setSuccessMessage('Trusted contract has been successfully removed!');

        addToast('Trusted Contract Removed', {
          type: 'success',
          message: 'The contract has been removed from your trusted contracts list.'
        });
      } catch (error) {
        console.error('Error removing trusted contract:', error);
        const errorDetails = ErrorHandler.classifyError(error);
        addToast('Failed to remove trusted contract', {
          type: 'error',
          message: errorDetails.userMessage
        });
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const isSignerConnected = connectionState.signerConnected && !connectionState.readOnlyMode;

  if (isLoading) {
    return (
      <Container>
        <LoadingState>Loading trusted contracts...</LoadingState>
      </Container>
    );
  }

  if (!connectionState.isConnected) {
    return (
      <Container>
        <Section>
          <SectionTitle>Trusted Contracts</SectionTitle>
          <Description>
            Please connect to a Safe wallet to manage trusted contracts.
          </Description>
        </Section>
      </Container>
    );
  }

  return (
    <Container>
      <Section>
        <SectionTitle>Trusted Contracts</SectionTitle>
        <Description>
          Trusted contracts are pre-approved contract addresses that can be called without requiring 
          them to be in your address book. This streamlines interactions with frequently used contracts 
          while maintaining security through the Safe's multi-signature requirements.
        </Description>

        {/* Success Message */}
        {successMessage && (
          <SuccessMessage>
            ✅ {successMessage}
          </SuccessMessage>
        )}

        {/* Add Trusted Contract Form */}
        <TrustedContractForm>
          <Input
            label="Contract Address"
            placeholder="0x..."
            value={newContractAddress}
            onChange={(e) => handleAddressChange(e.target.value)}
            error={addressError}
            helperText="Enter the address of a smart contract you want to trust"
            fullWidth
          />

          <FormRow>
            <Button
              variant="primary"
              onClick={handleAddTrustedContract}
              disabled={!newContractAddress.trim() || !!addressError || isSubmitting || !isSignerConnected}
              loading={isSubmitting}
              allowClickWhenDisabled={!isSignerConnected}
              className={!isSignerConnected ? 'opacity-50' : ''}
            >
              Add Trusted Contract
            </Button>
          </FormRow>
        </TrustedContractForm>

        {!isSignerConnected && (
          <Description style={{ color: theme.colors.text.muted, fontStyle: 'italic' }}>
            Connect a signer wallet to manage trusted contracts.
          </Description>
        )}

        {/* Trusted Contracts List */}
        <TrustedContractsList>
          <SectionTitle>Current Trusted Contracts</SectionTitle>
          {trustedContracts.length === 0 ? (
            <EmptyState>
              No trusted contracts configured. Add contract addresses above to get started.
            </EmptyState>
          ) : (
            trustedContracts.map((contract, index) => (
              <TrustedContractItem key={index}>
                <ContractInfo>
                  <ContractLabel>Contract Address</ContractLabel>
                  <AddressDisplay
                    address={contract.address}
                    network={network}
                    truncate={true}
                    truncateLength={8}
                    showCopy={true}
                    showExplorer={true}
                  />
                </ContractInfo>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveTrustedContract(contract.address)}
                  disabled={isSubmitting || !isSignerConnected}
                  allowClickWhenDisabled={!isSignerConnected}
                  className={!isSignerConnected ? 'opacity-50' : ''}
                >
                  Remove
                </Button>
              </TrustedContractItem>
            ))
          )}
        </TrustedContractsList>
      </Section>

      {/* Wallet Connection Modal */}
      {showWalletModal && (
        <WalletConnectionModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onWalletSelect={handleWalletSelect}
        />
      )}
    </Container>
  );
};

export default TrustedContractsSection;
