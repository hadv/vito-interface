import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { theme } from '../../../theme';
import { createSafeTxPoolService } from '../../../services/SafeTxPoolService';
import { SafeWalletService } from '../../../services/SafeWalletService';
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
  name: string;
  dateAdded?: string;
}

interface TrustedContractsSectionProps {
  network: string;
}

const TrustedContractsSection: React.FC<TrustedContractsSectionProps> = ({ network }) => {
  const [trustedContracts, setTrustedContracts] = useState<TrustedContract[]>([]);
  const [newContractAddress, setNewContractAddress] = useState<string>('');
  const [newContractName, setNewContractName] = useState<string>('');
  const [addressError, setAddressError] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create network-specific SafeTxPoolService instance
  const [safeTxPoolService] = useState(() => createSafeTxPoolService(network));
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

  // Local storage key for trusted contract names
  const getStorageKey = useCallback((safeAddress: string) => `trustedContracts_${safeAddress.toLowerCase()}_${network}`, [network]);

  // Load trusted contract names from local storage
  const loadTrustedContractNames = useCallback((safeAddress: string): Record<string, { name: string; dateAdded: string }> => {
    try {
      const stored = localStorage.getItem(getStorageKey(safeAddress));
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading trusted contract names:', error);
      return {};
    }
  }, [getStorageKey]);

  // Save trusted contract names to local storage
  const saveTrustedContractNames = useCallback((safeAddress: string, names: Record<string, { name: string; dateAdded: string }>) => {
    try {
      localStorage.setItem(getStorageKey(safeAddress), JSON.stringify(names));
    } catch (error) {
      console.error('Error saving trusted contract names:', error);
    }
  }, [getStorageKey]);

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

      // Load stored contract names and metadata
      const storedNames = loadTrustedContractNames(connectionState.safeAddress);

      // Filter to only include contracts that are actually trusted on-chain
      const verifiedContracts: TrustedContract[] = [];

      for (const [address, data] of Object.entries(storedNames)) {
        try {
          // Check if contract is actually trusted on-chain
          const isTrusted = await safeTxPoolService.isTrustedContract(connectionState.safeAddress, address);
          if (isTrusted) {
            verifiedContracts.push({
              address,
              name: data.name,
              dateAdded: data.dateAdded
            });
          }
        } catch (error) {
          console.warn(`Failed to verify trusted status for ${address}:`, error);
          // Include in list anyway, but user will see if it's not actually trusted when they try to use it
          verifiedContracts.push({
            address,
            name: data.name,
            dateAdded: data.dateAdded
          });
        }
      }

      setTrustedContracts(verifiedContracts);
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
  }, [connectionState.isConnected, connectionState.safeAddress, addToast, loadTrustedContractNames, safeTxPoolService]);

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

  const validateContractName = (name: string): string => {
    if (!name.trim()) {
      return 'Contract name is required';
    }

    if (name.trim().length < 2) {
      return 'Contract name must be at least 2 characters';
    }

    if (name.trim().length > 50) {
      return 'Contract name must be less than 50 characters';
    }

    // Check if name already exists
    if (trustedContracts.some(contract => contract.name.toLowerCase() === name.trim().toLowerCase())) {
      return 'A contract with this name already exists';
    }

    return '';
  };

  const handleAddressChange = (value: string) => {
    setNewContractAddress(value);
    setSuccessMessage('');
    setAddressError(validateContractAddress(value));
  };

  const handleNameChange = (value: string) => {
    setNewContractName(value);
    setSuccessMessage('');
    setNameError(validateContractName(value));
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
      const addressValidationError = validateContractAddress(newContractAddress);
      const nameValidationError = validateContractName(newContractName);

      if (addressValidationError) {
        setAddressError(addressValidationError);
        return;
      }

      if (nameValidationError) {
        setNameError(nameValidationError);
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
        // Check if SafeTxPoolService is properly initialized
        if (!safeTxPoolService.isInitialized()) {
          throw new Error(`SafeTxPool contract is not configured for ${network} network. Please check the contract address configuration.`);
        }

        // Get signer
        const signer = walletConnectionService.getSigner();
        if (!signer) {
          throw new Error('No signer available. Please connect your wallet.');
        }

        // Initialize SafeWalletService
        const safeWalletService = new SafeWalletService();
        await safeWalletService.initialize({
          safeAddress: connectionState.safeAddress,
          network: network
        });
        safeWalletService.setSigner(signer);

        // Get SafeTxPool contract address
        const safeTxPoolAddress = safeTxPoolService.getContractAddress();
        if (!safeTxPoolAddress) {
          throw new Error('SafeTxPool contract address not available');
        }

        // Create transaction data for adding trusted contract
        const txData = safeTxPoolService.createAddTrustedContractTxData(
          connectionState.safeAddress,
          newContractAddress.trim()
        );

        // Create and execute Safe transaction
        const result = await safeWalletService.createTransaction({
          to: safeTxPoolAddress,
          value: '0',
          data: txData,
          operation: 0 // CALL
        });

        // Save name to local storage
        const contractNames = loadTrustedContractNames(connectionState.safeAddress);
        const currentDate = new Date().toISOString();
        contractNames[newContractAddress.trim().toLowerCase()] = {
          name: newContractName.trim(),
          dateAdded: currentDate
        };
        saveTrustedContractNames(connectionState.safeAddress, contractNames);

        // Add to local list
        const newContract: TrustedContract = {
          address: newContractAddress.trim(),
          name: newContractName.trim(),
          dateAdded: currentDate
        };
        setTrustedContracts(prev => [...prev, newContract]);

        // Clear form
        setNewContractAddress('');
        setNewContractName('');
        setSuccessMessage(`Trusted contract "${newContractName.trim()}" has been successfully added!`);

        addToast('Trusted Contract Added', {
          type: 'success',
          message: `"${newContractName.trim()}" has been added to your trusted contracts list.`
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

  const handleRemoveTrustedContract = (trustedContractAddress: string) => {
    handleWalletConnectionRequired(async () => {
      if (!connectionState.safeAddress) {
        addToast('No Safe Connected', {
          type: 'error',
          message: 'Please connect to a Safe wallet first.'
        });
        return;
      }

      // Find the contract to get its name
      const contractToRemove = trustedContracts.find(
        contract => contract.address.toLowerCase() === trustedContractAddress.toLowerCase()
      );

      if (!contractToRemove) {
        addToast('Contract Not Found', {
          type: 'error',
          message: 'The contract you are trying to remove was not found.'
        });
        return;
      }

      setIsSubmitting(true);
      try {
        // Check if SafeTxPoolService is properly initialized
        if (!safeTxPoolService.isInitialized()) {
          throw new Error(`SafeTxPool contract is not configured for ${network} network. Please check the contract address configuration.`);
        }

        // Get signer
        const signer = walletConnectionService.getSigner();
        if (!signer) {
          throw new Error('No signer available. Please connect your wallet.');
        }

        // Initialize SafeWalletService
        const safeWalletService = new SafeWalletService();
        await safeWalletService.initialize({
          safeAddress: connectionState.safeAddress,
          network: network
        });
        safeWalletService.setSigner(signer);

        // Get SafeTxPool contract address
        const safeTxPoolAddress = safeTxPoolService.getContractAddress();
        if (!safeTxPoolAddress) {
          throw new Error('SafeTxPool contract address not available');
        }

        // Create transaction data for removing trusted contract
        const txData = safeTxPoolService.createRemoveTrustedContractTxData(
          connectionState.safeAddress,
          trustedContractAddress
        );

        // Create and execute Safe transaction
        const result = await safeWalletService.createTransaction({
          to: safeTxPoolAddress,
          value: '0',
          data: txData,
          operation: 0 // CALL
        });

        // Remove from local storage
        const contractNames = loadTrustedContractNames(connectionState.safeAddress);
        delete contractNames[trustedContractAddress.toLowerCase()];
        saveTrustedContractNames(connectionState.safeAddress, contractNames);

        // Remove from local list
        setTrustedContracts(prev => prev.filter(contract =>
          contract.address.toLowerCase() !== trustedContractAddress.toLowerCase()
        ));

        setSuccessMessage(`Trusted contract "${contractToRemove.name}" has been successfully removed!`);

        addToast('Trusted Contract Removed', {
          type: 'success',
          message: `"${contractToRemove.name}" has been removed from your trusted contracts list.`
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
          <br /><br />
          <strong>Note:</strong> Adding or removing trusted contracts creates and executes a Safe transaction.
          This requires your signature and will be processed through the Safe's multi-signature workflow.
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
            label="Contract Name"
            placeholder="e.g., USDC Token, Uniswap V3 Router"
            value={newContractName}
            onChange={(e) => handleNameChange(e.target.value)}
            error={nameError}
            helperText="Enter a descriptive name for this contract"
            fullWidth
          />

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
              disabled={
                !newContractAddress.trim() ||
                !newContractName.trim() ||
                !!addressError ||
                !!nameError ||
                isSubmitting ||
                !isSignerConnected
              }
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
          <SectionTitle>Current Trusted Contracts ({trustedContracts.length})</SectionTitle>
          {trustedContracts.length === 0 ? (
            <EmptyState>
              No trusted contracts configured. Add contract addresses above to get started.
            </EmptyState>
          ) : (
            trustedContracts.map((contract, index) => (
              <TrustedContractItem key={index}>
                <ContractInfo>
                  <ContractLabel>{contract.name}</ContractLabel>
                  <AddressDisplay
                    address={contract.address}
                    network={network}
                    truncate={true}
                    truncateLength={8}
                    showCopy={true}
                    showExplorer={true}
                  />
                  {contract.dateAdded && (
                    <div style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.text.tertiary,
                      marginTop: theme.spacing[1]
                    }}>
                      Added: {new Date(contract.dateAdded).toLocaleDateString()}
                    </div>
                  )}
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
