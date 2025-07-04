import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { theme } from '../../../theme';
import { safeWalletService } from '../../../services/SafeWalletService';
import { getSafeTxPoolAddress, getRpcUrl } from '../../../contracts/abis';
import { walletConnectionService } from '../../../services/WalletConnectionService';
import { useToast } from '../../../hooks/useToast';
import Button from '../../ui/Button';
import AddressDisplay from './AddressDisplay';

const Container = styled.div`
  margin: ${theme.spacing[6]} 0;
  padding: ${theme.spacing[6]};
  background: ${theme.colors.neutral[800]};
  border: 1px solid ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.lg};
`;

const Title = styled.h3`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const StatusSection = styled.div`
  margin-bottom: ${theme.spacing[4]};
  padding: ${theme.spacing[4]};
  background: ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.md};
`;

const StatusRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing[2]};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const StatusLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
`;

const StatusValue = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.primary};
  font-family: monospace;
`;

const StatusBadge = styled.div<{ status: 'success' | 'warning' | 'error' }>`
  padding: ${theme.spacing[1]} ${theme.spacing[3]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
  
  ${props => {
    switch (props.status) {
      case 'success':
        return `
          background: ${theme.colors.status.success}20;
          color: ${theme.colors.status.success};
          border: 1px solid ${theme.colors.status.success}30;
        `;
      case 'warning':
        return `
          background: ${theme.colors.status.warning}20;
          color: ${theme.colors.status.warning};
          border: 1px solid ${theme.colors.status.warning}30;
        `;
      case 'error':
        return `
          background: ${theme.colors.status.error}20;
          color: ${theme.colors.status.error};
          border: 1px solid ${theme.colors.status.error}30;
        `;
    }
  }}
`;

const ActionSection = styled.div`
  margin-top: ${theme.spacing[4]};
  padding: ${theme.spacing[4]};
  background: ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.md};
`;

const ActionDescription = styled.p`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  line-height: 1.5;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing[8]};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
`;

interface SafeGuardDiagnosticProps {
  safeAddress: string;
  network: string;
}

const SafeGuardDiagnostic: React.FC<SafeGuardDiagnosticProps> = ({ safeAddress, network }) => {
  const [currentGuard, setCurrentGuard] = useState<string>('');
  const [safeTxPoolAddress, setSafeTxPoolAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingGuard, setIsSettingGuard] = useState(false);
  const [error, setError] = useState<string>('');

  const { addToast } = useToast();

  useEffect(() => {
    loadGuardStatus();
  }, [safeAddress, network]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGuardStatus = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Get SafeTxPool address for current network
      const poolAddress = getSafeTxPoolAddress(network);
      setSafeTxPoolAddress(poolAddress || '');

      if (!poolAddress) {
        setError(`SafeTxPool not configured for ${network} network`);
        return;
      }

      // Initialize SafeWalletService with read-only provider for guard status check
      // We don't need a wallet connection just to read the guard status
      const rpcUrl = getRpcUrl(network);
      if (!rpcUrl) {
        setError(`RPC URL not configured for ${network} network`);
        return;
      }

      // SafeWalletService will create its own read-only provider internally

      await safeWalletService.initialize({
        safeAddress,
        network,
        rpcUrl
      });

      // Get current guard
      const guard = await safeWalletService.getCurrentGuard();
      setCurrentGuard(guard);

    } catch (err: any) {
      console.error('Error loading guard status:', err);
      setError(err.message || 'Failed to load guard status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetSafeTxPoolAsGuard = async () => {
    try {
      setIsSettingGuard(true);

      const signer = walletConnectionService.getSigner();
      if (!signer) {
        throw new Error('Please connect your wallet first');
      }

      await safeWalletService.setSigner(signer);
      
      // Set SafeTxPool as guard
      await safeWalletService.setGuard(safeTxPoolAddress);

      addToast('Guard Set Successfully', {
        type: 'success',
        message: 'SafeTxPool has been set as the guard for this Safe. Address book transactions should now work properly.'
      });

      // Reload status
      await loadGuardStatus();

    } catch (err: any) {
      console.error('Error setting guard:', err);
      addToast('Failed to Set Guard', {
        type: 'error',
        message: err.message || 'Failed to set SafeTxPool as guard'
      });
    } finally {
      setIsSettingGuard(false);
    }
  };

  const getGuardStatus = () => {
    if (!currentGuard || currentGuard === ethers.constants.AddressZero) {
      return { status: 'error' as const, text: 'No Guard Set' };
    }

    if (currentGuard.toLowerCase() === safeTxPoolAddress.toLowerCase()) {
      return { status: 'success' as const, text: 'SafeTxPool Guard Active' };
    }

    return { status: 'warning' as const, text: 'Different Guard Set' };
  };

  const isGuardCorrect = currentGuard && safeTxPoolAddress && 
    currentGuard.toLowerCase() === safeTxPoolAddress.toLowerCase();

  if (isLoading) {
    return (
      <Container>
        <LoadingState>Loading guard status...</LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Title>Safe Guard Diagnostic</Title>
        <StatusSection>
          <StatusBadge status="error">Error: {error}</StatusBadge>
        </StatusSection>
      </Container>
    );
  }

  const guardStatus = getGuardStatus();

  return (
    <Container>
      <Title>Safe Guard Diagnostic</Title>
      
      <StatusSection>
        <StatusRow>
          <StatusLabel>Safe Address:</StatusLabel>
          <StatusValue>
            <AddressDisplay
              address={safeAddress}
              network={network}
              truncate={true}
              truncateLength={6}
              showCopy={true}
            />
          </StatusValue>
        </StatusRow>
        
        <StatusRow>
          <StatusLabel>Network:</StatusLabel>
          <StatusValue>{network}</StatusValue>
        </StatusRow>
        
        <StatusRow>
          <StatusLabel>SafeTxPool Address:</StatusLabel>
          <StatusValue>
            {safeTxPoolAddress ? (
              <AddressDisplay
                address={safeTxPoolAddress}
                network={network}
                truncate={true}
                truncateLength={6}
                showCopy={true}
              />
            ) : (
              'Not configured'
            )}
          </StatusValue>
        </StatusRow>
        
        <StatusRow>
          <StatusLabel>Current Guard:</StatusLabel>
          <StatusValue>
            {currentGuard && currentGuard !== ethers.constants.AddressZero ? (
              <AddressDisplay
                address={currentGuard}
                network={network}
                truncate={true}
                truncateLength={6}
                showCopy={true}
              />
            ) : (
              'None'
            )}
          </StatusValue>
        </StatusRow>
        
        <StatusRow>
          <StatusLabel>Guard Status:</StatusLabel>
          <StatusBadge status={guardStatus.status}>
            {guardStatus.text}
          </StatusBadge>
        </StatusRow>
      </StatusSection>

      {!isGuardCorrect && safeTxPoolAddress && (
        <ActionSection>
          <ActionDescription>
            <strong>Issue Detected:</strong> Your Safe doesn't have the SafeTxPool set as its guard contract.
            This is why address book transactions are failing. Click the button below to set the SafeTxPool
            as your Safe's guard contract.
          </ActionDescription>

          <Button
            variant="primary"
            onClick={handleSetSafeTxPoolAsGuard}
            loading={isSettingGuard}
            disabled={isSettingGuard}
          >
            Set SafeTxPool as Guard
          </Button>
        </ActionSection>
      )}

      {isGuardCorrect && (
        <ActionSection>
          <ActionDescription>
            ✅ <strong>Configuration Correct:</strong> Your Safe has the SafeTxPool properly set as its guard contract. 
            Address book transactions should work correctly.
          </ActionDescription>
        </ActionSection>
      )}
    </Container>
  );
};

export default SafeGuardDiagnostic;
