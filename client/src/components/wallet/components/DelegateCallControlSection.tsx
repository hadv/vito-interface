import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { theme } from '../../../theme';
import { SafeTxPoolService } from '../../../services/SafeTxPoolService';
import { walletConnectionService, WalletConnectionState } from '../../../services/WalletConnectionService';
import { safeWalletService } from '../../../services/SafeWalletService';
import { useToast } from '../../../hooks/useToast';
import { ErrorHandler } from '../../../utils/errorHandling';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import AddressDisplay from './AddressDisplay';
import WalletConnectionModal from '../../ui/WalletConnectionModal';

const Container = styled.div`
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

const ToggleSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing[4]};
  background: ${theme.colors.neutral[700]};
  border: 1px solid ${theme.colors.neutral[600]};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing[6]};
`;

const ToggleLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[1]};
`;

const ToggleTitle = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.primary};
`;

const ToggleDescription = styled.div`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.secondary};
`;

const Toggle = styled.button<{ enabled: boolean; disabled?: boolean }>`
  position: relative;
  width: 48px;
  height: 24px;
  border-radius: 12px;
  border: none;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  background: ${props => props.enabled 
    ? theme.colors.primary[500] 
    : theme.colors.neutral[600]};

  &:before {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.enabled ? '26px' : '2px'};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    transition: left 0.2s ease;
  }

  &:hover:not(:disabled) {
    background: ${props => props.enabled 
      ? theme.colors.primary[400] 
      : theme.colors.neutral[500]};
  }
`;

const TargetsSection = styled.div`
  margin-top: ${theme.spacing[6]};
`;

const TargetsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[3]};
  margin-bottom: ${theme.spacing[4]};
`;

const TargetItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing[3]};
  background: ${theme.colors.neutral[700]};
  border: 1px solid ${theme.colors.neutral[600]};
  border-radius: ${theme.borderRadius.md};
`;

const AddTargetForm = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
  align-items: flex-end;
  flex-wrap: nowrap;

  /* Ensure input takes available space and button doesn't wrap */
  > div:first-child {
    flex: 1;
    min-width: 0;
  }

  /* Prevent button from wrapping and maintain minimum width */
  > button {
    flex-shrink: 0;
    white-space: nowrap;
    min-width: fit-content;
  }
`;

const StatusBadge = styled.div<{ enabled: boolean }>`
  padding: ${theme.spacing[1]} ${theme.spacing[3]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
  
  ${props => props.enabled ? `
    background: ${theme.colors.status.success}20;
    color: ${theme.colors.status.success};
    border: 1px solid ${theme.colors.status.success}30;
  ` : `
    background: ${theme.colors.neutral[700]};
    color: ${theme.colors.text.secondary};
    border: 1px solid ${theme.colors.neutral[600]};
  `}
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing[8]};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
`;

interface DelegateCallControlSectionProps {
  network: string;
}

const DelegateCallControlSection: React.FC<DelegateCallControlSectionProps> = ({ network }) => {
  const [isDelegateCallEnabled, setIsDelegateCallEnabled] = useState(false);
  const [allowedTargets, setAllowedTargets] = useState<string[]>([]);
  const [newTargetAddress, setNewTargetAddress] = useState('');
  const [addressError, setAddressError] = useState('');
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
  const [safeTxPoolService] = useState(() => new SafeTxPoolService(network));

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

  const loadDelegateCallSettings = useCallback(async () => {
    if (!connectionState.isConnected || !connectionState.safeAddress) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Check if SafeTxPoolService is initialized
      if (!safeTxPoolService.isInitialized()) {
        console.warn('SafeTxPoolService not initialized for network:', network);
        return;
      }

      const enabled = await safeTxPoolService.isDelegateCallEnabled(connectionState.safeAddress);
      setIsDelegateCallEnabled(enabled);

      // For now, we'll track targets in component state
      // In a full implementation, you might want to track them via events or additional contract methods
      setAllowedTargets([]);
    } catch (error) {
      console.error('Error loading delegate call settings:', error);
      const errorDetails = ErrorHandler.classifyError(error);
      addToast('Failed to load delegate call settings', {
        type: 'error',
        message: errorDetails.userMessage
      });
    } finally {
      setIsLoading(false);
    }
  }, [connectionState.isConnected, connectionState.safeAddress, network, addToast, safeTxPoolService]);

  useEffect(() => {
    loadDelegateCallSettings();
  }, [loadDelegateCallSettings]);

  const validateAddress = (address: string): string => {
    if (!address.trim()) {
      return '';
    }

    if (!ethers.utils.isAddress(address)) {
      return 'Invalid Ethereum address';
    }

    if (allowedTargets.includes(address.toLowerCase())) {
      return 'Target already exists';
    }

    return '';
  };

  const handleAddressChange = (value: string) => {
    setNewTargetAddress(value);
    const error = validateAddress(value);
    setAddressError(error);
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

  const handleToggleDelegateCall = () => {
    handleWalletConnectionRequired(async () => {
      if (!connectionState.safeAddress) return;

      setIsSubmitting(true);
      try {
        const newState = !isDelegateCallEnabled;

        // Create Safe transaction parameters
        const txParams = await safeTxPoolService.setDelegateCallEnabled(connectionState.safeAddress, newState);

        // Create and execute Safe transaction
        const transactionRequest = {
          to: txParams.to,
          value: txParams.value,
          data: txParams.data,
          operation: txParams.operation
        };

        // Create the Safe transaction (this will sign and propose it)
        await safeWalletService.createTransaction(transactionRequest);

        // Don't update local state immediately - wait for transaction execution
        addToast('Transaction Proposed', {
          type: 'success',
          message: `Delegate call ${newState ? 'enable' : 'disable'} transaction has been proposed. It will be executed when the required signatures are collected.`
        });

        // Optionally monitor transaction status and update UI when executed
        // For now, user can refresh or the status will update on next load
      } catch (error) {
        console.error('Error toggling delegate call:', error);
        const errorDetails = ErrorHandler.classifyError(error);
        addToast('Failed to update delegate call setting', {
          type: 'error',
          message: errorDetails.userMessage
        });
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const handleAddTarget = () => {
    handleWalletConnectionRequired(async () => {
      if (!connectionState.safeAddress || !newTargetAddress.trim() || addressError) return;

      setIsSubmitting(true);
      try {
        const targetAddress = newTargetAddress.trim();

        // Create Safe transaction parameters
        const txParams = await safeTxPoolService.addDelegateCallTarget(connectionState.safeAddress, targetAddress);

        // Create and execute Safe transaction
        const transactionRequest = {
          to: txParams.to,
          value: txParams.value,
          data: txParams.data,
          operation: txParams.operation
        };

        // Create the Safe transaction (this will sign and propose it)
        await safeWalletService.createTransaction(transactionRequest);

        // Don't update local state immediately - wait for transaction execution
        setNewTargetAddress('');
        addToast('Transaction Proposed', {
          type: 'success',
          message: 'Add delegate call target transaction has been proposed. It will be executed when the required signatures are collected.'
        });
      } catch (error) {
        console.error('Error adding delegate call target:', error);
        const errorDetails = ErrorHandler.classifyError(error);
        addToast('Failed to add target', {
          type: 'error',
          message: errorDetails.userMessage
        });
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const handleRemoveTarget = (target: string) => {
    handleWalletConnectionRequired(async () => {
      if (!connectionState.safeAddress) return;

      setIsSubmitting(true);
      try {
        // Create Safe transaction parameters
        const txParams = await safeTxPoolService.removeDelegateCallTarget(connectionState.safeAddress, target);

        // Create and execute Safe transaction
        const transactionRequest = {
          to: txParams.to,
          value: txParams.value,
          data: txParams.data,
          operation: txParams.operation
        };

        // Create the Safe transaction (this will sign and propose it)
        await safeWalletService.createTransaction(transactionRequest);

        // Don't update local state immediately - wait for transaction execution
        addToast('Transaction Proposed', {
          type: 'success',
          message: 'Remove delegate call target transaction has been proposed. It will be executed when the required signatures are collected.'
        });
      } catch (error) {
        console.error('Error removing delegate call target:', error);
        const errorDetails = ErrorHandler.classifyError(error);
        addToast('Failed to remove target', {
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
        <LoadingState>Loading delegate call settings...</LoadingState>
      </Container>
    );
  }

  if (!connectionState.isConnected) {
    return (
      <Container>
        <SectionTitle>Delegate Call Control</SectionTitle>
        <Description>
          Please connect to a Safe wallet to configure delegate call settings.
        </Description>
      </Container>
    );
  }

  return (
    <Container>
      <SectionTitle>Delegate Call Control</SectionTitle>
      <Description>
        Delegate calls allow your Safe to execute code in the context of another contract.
        This is a powerful but potentially dangerous feature that should be used with extreme caution.
        Only enable delegate calls to trusted contracts.
      </Description>

      <Description style={{
        color: theme.colors.text.muted,
        fontSize: theme.typography.fontSize.sm,
        fontStyle: 'italic',
        marginTop: theme.spacing[2],
        padding: theme.spacing[3],
        backgroundColor: theme.colors.neutral[800],
        borderRadius: theme.borderRadius.md,
        border: `1px solid ${theme.colors.neutral[700]}`
      }}>
        💡 Note: Changes to delegate call settings require Safe transaction execution.
        After proposing a transaction, the status will update once the transaction is executed on-chain.
        Use the refresh button (↻) to check for updates.
      </Description>

      {/* Delegate Call Toggle */}
      <ToggleSection>
        <ToggleLabel>
          <ToggleTitle>Enable Delegate Calls</ToggleTitle>
          <ToggleDescription>
            <StatusBadge enabled={isDelegateCallEnabled}>
              {isDelegateCallEnabled ? 'Enabled' : 'Disabled'}
            </StatusBadge>
            {isLoading && (
              <span style={{ marginLeft: theme.spacing[2], color: theme.colors.text.muted, fontSize: theme.typography.fontSize.sm }}>
                Loading...
              </span>
            )}
          </ToggleDescription>
        </ToggleLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadDelegateCallSettings}
            disabled={isLoading}
          >
            ↻
          </Button>
          <Toggle
            enabled={isDelegateCallEnabled}
            disabled={!isSignerConnected || isSubmitting}
            onClick={handleToggleDelegateCall}
          />
        </div>
      </ToggleSection>

      {/* Allowed Targets Section */}
      {isDelegateCallEnabled && (
        <TargetsSection>
          <SectionTitle style={{ fontSize: theme.typography.fontSize.lg, marginBottom: theme.spacing[4] }}>
            Allowed Delegate Call Targets
          </SectionTitle>
          <Description>
            Specify which contracts are allowed to receive delegate calls from this Safe. 
            If no targets are specified, delegate calls to any address will be allowed.
          </Description>

          {allowedTargets.length > 0 && (
            <TargetsList>
              {allowedTargets.map((target) => (
                <TargetItem key={target}>
                  <AddressDisplay
                    address={target}
                    network={network}
                    truncate={true}
                    truncateLength={6}
                    showCopy={true}
                    showExplorer={true}
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveTarget(target)}
                    disabled={!isSignerConnected || isSubmitting}
                  >
                    Remove
                  </Button>
                </TargetItem>
              ))}
            </TargetsList>
          )}

          <AddTargetForm>
            <Input
              label="Add Target Address"
              placeholder="0x..."
              value={newTargetAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              error={addressError}
              helperText="Enter the address of a contract that should be allowed for delegate calls"
              fullWidth
            />
            <Button
              variant="primary"
              onClick={handleAddTarget}
              disabled={!newTargetAddress.trim() || !!addressError || isSubmitting || !isSignerConnected}
              loading={isSubmitting}
            >
              Add Target
            </Button>
          </AddTargetForm>
        </TargetsSection>
      )}

      {!isSignerConnected && (
        <Description style={{ color: theme.colors.text.muted, fontStyle: 'italic', marginTop: theme.spacing[4] }}>
          Connect a signer wallet to configure delegate call settings.
        </Description>
      )}

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

export default DelegateCallControlSection;
