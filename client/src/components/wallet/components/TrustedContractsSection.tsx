import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { theme } from '../../../theme';
import { createSafeTxPoolService } from '../../../services/SafeTxPoolService';
import { SafeTransactionService } from '../../../services/SafeTransactionService';
import { walletConnectionService, WalletConnectionState } from '../../../services/WalletConnectionService';
import { getRpcUrl } from '../../../contracts/abis';
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

  // Load trusted contracts for the current Safe from on-chain data
  const loadTrustedContracts = useCallback(async () => {
    if (!connectionState.isConnected || !connectionState.safeAddress) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get trusted contracts directly from the blockchain
      const onChainContracts = await safeTxPoolService.getTrustedContracts(connectionState.safeAddress);

      // Convert to our TrustedContract format
      const trustedContractsList: TrustedContract[] = onChainContracts.map(contract => ({
        address: contract.contractAddress,
        name: contract.name,
        dateAdded: new Date().toISOString() // We don't have dateAdded on-chain, use current date
      }));

      setTrustedContracts(trustedContractsList);
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
  }, [connectionState.isConnected, connectionState.safeAddress, addToast, safeTxPoolService]);

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
          throw new Error(`SafeTxPoolRegistry contract is not configured for ${network} network. Please check the contract address configuration.`);
        }

        // Check if SafeTxPoolRegistry is configured
        if (!safeTxPoolService.isConfigured()) {
          throw new Error(`SafeTxPoolRegistry contract is not deployed or configured for ${network} network. Please deploy the SafeTxPoolRegistry contract and configure the address in environment variables.`);
        }

        // Additional check: The SafeTxPoolRegistry contract may be deployed but not properly initialized
        // The manager contracts need to have their registry address set to the SafeTxPoolRegistry address
        console.warn('Note: If this transaction fails, it may be because the SafeTxPoolRegistry manager contracts are not properly initialized. Each manager contract (TrustedContractManager, AddressBookManager, etc.) needs to have setRegistry() called with the SafeTxPoolRegistry address.');

        // Set signer for SafeTxPoolService
        const signer = walletConnectionService.getSigner();
        if (!signer) {
          throw new Error('No signer available. Please connect your wallet.');
        }

        safeTxPoolService.setSigner(signer);

        // Create transaction data for adding trusted contract
        const txData = safeTxPoolService.createAddTrustedContractTxData(
          connectionState.safeAddress,
          newContractAddress.trim(),
          newContractName.trim()
        );

        // Get current nonce from Safe contract
        const rpcUrl = getRpcUrl(network);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const safeTransactionService = new SafeTransactionService(network);
        safeTransactionService.initialize(provider, signer);
        const nonce = await safeTransactionService.getSafeNonce(connectionState.safeAddress);

        // Get SafeTxPool contract address
        const safeTxPoolAddress = safeTxPoolService.getContractAddress();
        if (!safeTxPoolAddress) {
          throw new Error('SafeTxPool contract address not available');
        }

        // Propose the transaction to the Safe
        await safeTxPoolService.proposeTx({
          safe: connectionState.safeAddress,
          to: safeTxPoolAddress, // SafeTxPool contract address
          value: '0', // value as string
          data: txData, // encoded function call
          operation: 0, // operation (CALL)
          nonce: nonce
        });

        // Note: Contract will appear in the list after the Safe transaction is executed
        // The UI will refresh automatically when the transaction is completed

        // Clear form
        setNewContractAddress('');
        setNewContractName('');
        setSuccessMessage(`Transaction to add trusted contract "${newContractName.trim()}" has been proposed! Please check the Transactions tab to execute it.`);

        addToast('Transaction Proposed', {
          type: 'success',
          message: `Transaction to add "${newContractName.trim()}" has been proposed. Check the Transactions tab to execute it.`
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
          throw new Error(`SafeTxPoolRegistry contract is not configured for ${network} network. Please check the contract address configuration.`);
        }

        // Check if SafeTxPoolRegistry is configured
        if (!safeTxPoolService.isConfigured()) {
          throw new Error(`SafeTxPoolRegistry contract is not deployed or configured for ${network} network. Please deploy the SafeTxPoolRegistry contract and configure the address in environment variables.`);
        }

        // Set signer for SafeTxPoolService
        const signer = walletConnectionService.getSigner();
        if (!signer) {
          throw new Error('No signer available. Please connect your wallet.');
        }

        safeTxPoolService.setSigner(signer);

        // Create transaction data for removing trusted contract
        const txData = safeTxPoolService.createRemoveTrustedContractTxData(
          connectionState.safeAddress,
          trustedContractAddress
        );

        // Get current nonce from Safe contract
        const rpcUrl = getRpcUrl(network);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const safeTransactionService = new SafeTransactionService(network);
        safeTransactionService.initialize(provider, signer);
        const nonce = await safeTransactionService.getSafeNonce(connectionState.safeAddress);

        // Get SafeTxPool contract address
        const safeTxPoolAddress = safeTxPoolService.getContractAddress();
        if (!safeTxPoolAddress) {
          throw new Error('SafeTxPool contract address not available');
        }

        // Propose the transaction to the Safe
        await safeTxPoolService.proposeTx({
          safe: connectionState.safeAddress,
          to: safeTxPoolAddress, // SafeTxPool contract address
          value: '0', // value as string
          data: txData, // encoded function call
          operation: 0, // operation (CALL)
          nonce: nonce
        });

        setSuccessMessage(`Transaction to remove trusted contract "${contractToRemove.name}" has been proposed! Please check the Transactions tab to execute it.`);

        addToast('Transaction Proposed', {
          type: 'success',
          message: `Transaction to remove "${contractToRemove.name}" has been proposed. Check the Transactions tab to execute it.`
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
          <strong>Note:</strong> Adding or removing trusted contracts requires a Safe transaction.
          After proposing changes here, you'll need to execute the transaction through the Transactions tab.
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
