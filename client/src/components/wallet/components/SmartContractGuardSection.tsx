import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { theme } from '../../../theme';
import { safeWalletService } from '../../../services/SafeWalletService';
import { SafeGuardService } from '../../../services/SafeGuardService';
import { walletConnectionService, WalletConnectionState } from '../../../services/WalletConnectionService';
import { useToast } from '../../../hooks/useToast';
import { ErrorHandler } from '../../../utils/errorHandling';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import AddressDisplay from './AddressDisplay';
import WalletConnectionModal from '../../ui/WalletConnectionModal';
import GuardConfirmationModal from './GuardConfirmationModal';
import DelegateCallControlSection from './DelegateCallControlSection';

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

const InfoGrid = styled.div`
  display: grid;
  gap: ${theme.spacing[4]};
  margin-bottom: ${theme.spacing[6]};
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: ${theme.spacing[3]} 0;
  border-bottom: 1px solid ${theme.colors.neutral[700]};

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.secondary};
  min-width: 140px;
`;

const InfoValue = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.primary};
  text-align: right;
  flex: 1;
  word-break: break-all;
`;

const GuardForm = styled.div`
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

const StatusBadge = styled.div<{ hasGuard: boolean }>`
  padding: ${theme.spacing[1]} ${theme.spacing[3]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
  
  ${props => props.hasGuard ? `
    background: ${theme.colors.status.success}20;
    color: ${theme.colors.status.success};
    border: 1px solid ${theme.colors.status.success}30;
  ` : `
    background: ${theme.colors.neutral[700]};
    color: ${theme.colors.text.secondary};
    border: 1px solid ${theme.colors.neutral[600]};
  `}
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

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing[8]};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
`;

interface SmartContractGuardSectionProps {
  network: string;
}

const SmartContractGuardSection: React.FC<SmartContractGuardSectionProps> = ({ network }) => {
  const [currentGuard, setCurrentGuard] = useState<string>('');
  const [newGuardAddress, setNewGuardAddress] = useState<string>('');
  const [addressError, setAddressError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
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
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'set' | 'remove' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const { addToast } = useToast();

  // Subscribe to wallet connection state
  useEffect(() => {
    const updateConnectionState = () => {
      const state = walletConnectionService.getConnectionState();
      setConnectionState(state);
    };

    // Get initial state
    updateConnectionState();

    // Listen for connection state changes
    const unsubscribe = walletConnectionService.subscribe(updateConnectionState);
    return unsubscribe;
  }, []);

  const loadCurrentGuard = useCallback(async () => {
    if (!connectionState.isConnected) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const guard = await safeWalletService.getCurrentGuard();
      setCurrentGuard(guard);
    } catch (error) {
      console.error('Error loading current guard:', error);
      const errorDetails = ErrorHandler.classifyError(error);
      addToast('Failed to load guard information', {
        type: 'error',
        message: errorDetails.userMessage
      });
    } finally {
      setIsLoading(false);
    }
  }, [connectionState.isConnected, addToast]);

  // Load current guard when component mounts or Safe changes
  useEffect(() => {
    loadCurrentGuard();
  }, [connectionState.safeAddress, loadCurrentGuard]);

  const validateAddress = async (address: string): Promise<string> => {
    if (!address.trim()) {
      return '';
    }

    const validation = SafeGuardService.validateGuardAddress(address);
    if (validation.error) {
      return validation.error;
    }

    // Advanced contract validation
    try {
      const provider = safeWalletService.getProvider();
      if (provider) {
        const contractValidation = await SafeGuardService.validateGuardContract(address, provider);
        if (!contractValidation.isValid) {
          return contractValidation.error || 'Contract validation failed';
        }
      }
    } catch (error) {
      return `Contract validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Additional security check
    if (connectionState.safeAddress) {
      const securityValidation = SafeGuardService.validateGuardSecurity(address, connectionState.safeAddress);
      if (!securityValidation.isValid) {
        return securityValidation.warnings[0] || 'Security validation failed';
      }
    }

    return '';
  };

  const handleAddressChange = async (value: string) => {
    setNewGuardAddress(value);
    setSuccessMessage('');

    // Clear previous error immediately for better UX
    setAddressError('');

    // Only validate if there's a value
    if (value.trim()) {
      setIsValidating(true);
      try {
        const error = await validateAddress(value);
        setAddressError(error);
      } catch (error) {
        setAddressError(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsValidating(false);
      }
    }
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

  const handleSetGuard = () => {
    handleWalletConnectionRequired(async () => {
      const validationError = await validateAddress(newGuardAddress);
      if (validationError) {
        setAddressError(validationError);
        return;
      }

      setPendingAction('set');
      setShowConfirmationModal(true);
    });
  };

  const handleConfirmSetGuard = async () => {
    setShowConfirmationModal(false);
    setIsSubmitting(true);

    try {
      await safeWalletService.setGuard(newGuardAddress.trim());
      setCurrentGuard(newGuardAddress.trim());
      setNewGuardAddress('');
      setSuccessMessage('Smart contract guard has been successfully set!');

      addToast('Guard Set Successfully', {
        type: 'success',
        message: 'The smart contract guard has been configured for your Safe wallet.'
      });
    } catch (error) {
      console.error('Error setting guard:', error);
      const errorDetails = ErrorHandler.classifyError(error);
      addToast('Failed to set guard', {
        type: 'error',
        message: errorDetails.userMessage
      });
    } finally {
      setIsSubmitting(false);
      setPendingAction(null);
    }
  };

  const handleRemoveGuard = () => {
    handleWalletConnectionRequired(() => {
      setPendingAction('remove');
      setShowConfirmationModal(true);
    });
  };

  const handleConfirmRemoveGuard = async () => {
    setShowConfirmationModal(false);
    setIsSubmitting(true);

    try {
      await safeWalletService.removeGuard();
      setCurrentGuard(ethers.constants.AddressZero);
      setSuccessMessage('Smart contract guard has been successfully removed!');

      addToast('Guard Removed Successfully', {
        type: 'success',
        message: 'The smart contract guard has been removed from your Safe wallet.'
      });
    } catch (error) {
      console.error('Error removing guard:', error);
      const errorDetails = ErrorHandler.classifyError(error);
      addToast('Failed to remove guard', {
        type: 'error',
        message: errorDetails.userMessage
      });
    } finally {
      setIsSubmitting(false);
      setPendingAction(null);
    }
  };

  const isSignerConnected = connectionState.signerConnected && !connectionState.readOnlyMode;
  const hasGuard = currentGuard && !SafeGuardService.isGuardRemoved(currentGuard);

  if (isLoading) {
    return (
      <Container>
        <LoadingState>Loading guard configuration...</LoadingState>
      </Container>
    );
  }

  if (!connectionState.isConnected) {
    return (
      <Container>
        <Section>
          <SectionTitle>Smart Contract Guard</SectionTitle>
          <Description>
            Please connect to a Safe wallet to configure smart contract guards.
          </Description>
        </Section>
      </Container>
    );
  }

  return (
    <Container>
      <Section>
        <SectionTitle>Smart Contract Guard</SectionTitle>
        <Description>
          Smart contract guards provide an additional layer of security by validating all transactions
          before execution. Guards can implement custom logic to restrict certain operations, validate
          transaction parameters, or enforce business rules.
        </Description>

        {/* Current Guard Status */}
        <InfoGrid>
          <InfoItem>
            <InfoLabel>Current Guard</InfoLabel>
            <InfoValue>
              <StatusBadge hasGuard={!!hasGuard}>
                {hasGuard ? 'Active' : 'Not Set'}
              </StatusBadge>
            </InfoValue>
          </InfoItem>

          {hasGuard && (
            <InfoItem>
              <InfoLabel>Guard Address</InfoLabel>
              <InfoValue>
                <AddressDisplay
                  address={currentGuard}
                  network={network}
                  truncate={true}
                  truncateLength={6}
                  showCopy={true}
                  showExplorer={true}
                />
              </InfoValue>
            </InfoItem>
          )}
        </InfoGrid>

        <Description>
          {SafeGuardService.getGuardStatusDescription(currentGuard)}
        </Description>

        {/* Success Message */}
        {successMessage && (
          <SuccessMessage>
            ✅ {successMessage}
          </SuccessMessage>
        )}

        {/* Guard Configuration Form */}
        <GuardForm>
          <Input
            label="Guard Contract Address"
            placeholder="0x..."
            value={newGuardAddress}
            onChange={(e) => handleAddressChange(e.target.value)}
            error={addressError}
            helperText={isValidating ? "Validating contract..." : "Enter the address of a smart contract that implements the Guard interface"}
            fullWidth
          />

          <FormRow>
            <Button
              variant="primary"
              onClick={handleSetGuard}
              disabled={!newGuardAddress.trim() || !!addressError || isSubmitting || isValidating || !isSignerConnected}
              loading={isSubmitting || isValidating}
              allowClickWhenDisabled={!isSignerConnected}
              className={!isSignerConnected ? 'opacity-50' : ''}
            >
              {isValidating ? 'Validating...' : 'Set Guard'}
            </Button>

            {hasGuard && (
              <Button
                variant="danger"
                onClick={handleRemoveGuard}
                disabled={isSubmitting || !isSignerConnected}
                loading={isSubmitting}
                allowClickWhenDisabled={!isSignerConnected}
                className={!isSignerConnected ? 'opacity-50' : ''}
              >
                Remove Current Guard
              </Button>
            )}
          </FormRow>
        </GuardForm>

        {!isSignerConnected && (
          <Description style={{ color: theme.colors.text.muted, fontStyle: 'italic' }}>
            Connect a signer wallet to configure smart contract guards.
          </Description>
        )}
      </Section>

      {/* Delegate Call Control Section */}
      <DelegateCallControlSection network={network} />

      {/* Wallet Connection Modal */}
      {showWalletModal && (
        <WalletConnectionModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onWalletSelect={handleWalletSelect}
        />
      )}

      {/* Guard Confirmation Modal */}
      {showConfirmationModal && (
        <GuardConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            setShowConfirmationModal(false);
            setPendingAction(null);
          }}
          onConfirm={pendingAction === 'set' ? handleConfirmSetGuard : handleConfirmRemoveGuard}
          guardAddress={newGuardAddress}
          safeAddress={connectionState.safeAddress || ''}
          network={network}
          isRemoving={pendingAction === 'remove'}
        />
      )}
    </Container>
  );
};

export default SmartContractGuardSection;
