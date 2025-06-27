import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { NETWORK_CONFIGS } from '../../../contracts/abis';
import { useWallet } from '../../../contexts/WalletContext';

interface NetworkMismatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNetwork: string;
  requiredNetwork: string;
  onNetworkSwitch?: () => void;
}

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${theme.colors.background.card};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing[6]};
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${theme.spacing[4]};
`;

const WarningIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${theme.colors.status.warning}20;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: ${theme.spacing[3]};
  font-size: 24px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.semibold};
`;

const ModalBody = styled.div`
  margin-bottom: ${theme.spacing[6]};
`;

const NetworkInfo = styled.div`
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.secondary};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing[4]};
  margin: ${theme.spacing[3]} 0;
`;

const NetworkLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing[1]};
`;

const NetworkName = styled.div`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.primary};
  display: flex;
  align-items: center;
`;

const NetworkBadge = styled.span<{ type: 'current' | 'required' }>`
  padding: ${theme.spacing[1]} ${theme.spacing[2]};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
  margin-left: ${theme.spacing[2]};
  
  ${props => props.type === 'current' ? `
    background: ${theme.colors.status.error}20;
    color: ${theme.colors.status.error};
    border: 1px solid ${theme.colors.status.error}30;
  ` : `
    background: ${theme.colors.status.success}20;
    color: ${theme.colors.status.success};
    border: 1px solid ${theme.colors.status.success}30;
  `}
`;

const Description = styled.p`
  color: ${theme.colors.text.secondary};
  line-height: 1.6;
  margin: ${theme.spacing[4]} 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
  justify-content: flex-end;
`;

const Button = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: ${theme.spacing[3]} ${theme.spacing[4]};
  border-radius: ${theme.borderRadius.md};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  
  ${props => props.variant === 'primary' ? `
    background: ${theme.colors.primary[500]};
    color: white;

    &:hover {
      background: ${theme.colors.primary[600]};
    }

    &:disabled {
      background: ${theme.colors.text.disabled};
      cursor: not-allowed;
    }
  ` : `
    background: transparent;
    color: ${theme.colors.text.secondary};
    border: 1px solid ${theme.colors.border.primary};
    
    &:hover {
      background: ${theme.colors.background.secondary};
    }
  `}
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: ${theme.spacing[2]};
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const NetworkMismatchModal: React.FC<NetworkMismatchModalProps> = ({
  isOpen,
  onClose,
  currentNetwork,
  requiredNetwork,
  onNetworkSwitch
}) => {
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { switchChain } = useWallet();

  const currentConfig = NETWORK_CONFIGS[currentNetwork as keyof typeof NETWORK_CONFIGS];
  const requiredConfig = NETWORK_CONFIGS[requiredNetwork as keyof typeof NETWORK_CONFIGS];

  const handleSwitchNetwork = async () => {
    setIsSwitching(true);
    setError(null);

    try {
      // Get the chain ID for the required network
      const chainId = requiredConfig?.chainId;
      if (!chainId) {
        throw new Error(`Chain ID not found for network: ${requiredNetwork}`);
      }

      await switchChain(chainId);

      onNetworkSwitch?.();
      onClose();
    } catch (error: any) {
      console.error('Error switching network:', error);
      setError(error.message || 'Failed to switch network');
    } finally {
      setIsSwitching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <WarningIcon>⚠️</WarningIcon>
          <ModalTitle>Network Mismatch</ModalTitle>
        </ModalHeader>

        <ModalBody>
          <Description>
            Your wallet is connected to a different network than required for this Safe wallet. 
            Please switch to the correct network to continue.
          </Description>

          <NetworkInfo>
            <NetworkLabel>Current Wallet Network</NetworkLabel>
            <NetworkName>
              {currentConfig?.name || currentNetwork}
              <NetworkBadge type="current">Wrong Network</NetworkBadge>
            </NetworkName>
          </NetworkInfo>

          <NetworkInfo>
            <NetworkLabel>Required Network</NetworkLabel>
            <NetworkName>
              {requiredConfig?.name || requiredNetwork}
              <NetworkBadge type="required">Required</NetworkBadge>
            </NetworkName>
          </NetworkInfo>

          {error && (
            <NetworkInfo style={{ background: `${theme.colors.status.error}10`, borderColor: `${theme.colors.status.error}30` }}>
              <NetworkLabel style={{ color: theme.colors.status.error }}>Error</NetworkLabel>
              <NetworkName style={{ color: theme.colors.status.error }}>
                {error}
              </NetworkName>
            </NetworkInfo>
          )}
        </ModalBody>

        <ButtonGroup>
          <Button variant="secondary" onClick={onClose} disabled={isSwitching}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSwitchNetwork} disabled={isSwitching}>
            {isSwitching && <LoadingSpinner />}
            Switch to {requiredConfig?.name || requiredNetwork}
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default NetworkMismatchModal;
