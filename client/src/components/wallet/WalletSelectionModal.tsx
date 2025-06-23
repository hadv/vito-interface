import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../../theme';
import { WalletProviderType } from '../../services/WalletProvider';
import { WalletProviderFactory } from '../../services/WalletProviderFactory';

interface WalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect: (providerType: WalletProviderType) => Promise<void>;
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
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing[6]};
  max-width: 400px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing[6]};
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.text.secondary};
  cursor: pointer;
  padding: ${theme.spacing[2]};
  border-radius: ${theme.borderRadius.md};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${theme.colors.background.tertiary};
    color: ${theme.colors.text.primary};
  }
`;

const WalletList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[3]};
`;

const WalletOption = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[4]};
  padding: ${theme.spacing[4]};
  background: ${theme.colors.background.primary};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.md};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  &:hover:not(:disabled) {
    background: ${theme.colors.background.tertiary};
    border-color: ${theme.colors.primary[500]};
    transform: translateY(-1px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const WalletIcon = styled.img`
  width: 40px;
  height: 40px;
  border-radius: ${theme.borderRadius.md};
`;

const WalletInfo = styled.div`
  flex: 1;
`;

const WalletName = styled.div`
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing[1]};
`;

const WalletDescription = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
`;

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid ${theme.colors.border.primary};
  border-top: 2px solid ${theme.colors.primary[500]};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const WalletSelectionModal: React.FC<WalletSelectionModalProps> = ({
  isOpen,
  onClose,
  onWalletSelect
}) => {
  const [connecting, setConnecting] = useState<WalletProviderType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableProviders = WalletProviderFactory.getAvailableProviderInfo();
  console.log('💼 WalletSelectionModal available providers:', availableProviders);

  const handleWalletSelect = async (providerType: WalletProviderType) => {
    setConnecting(providerType);
    setError(null);

    try {
      await onWalletSelect(providerType);
      onClose();
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setConnecting(null);
    }
  };

  const handleClose = () => {
    if (connecting) return; // Prevent closing while connecting
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Connect Wallet</ModalTitle>
          <CloseButton onClick={handleClose} disabled={!!connecting}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </CloseButton>
        </ModalHeader>

        {error && (
          <div style={{
            background: theme.colors.status.error + '20',
            border: `1px solid ${theme.colors.status.error}30`,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing[3],
            marginBottom: theme.spacing[4],
            color: theme.colors.status.error
          }}>
            {error}
          </div>
        )}

        <WalletList>
          {availableProviders.map((provider) => (
            <WalletOption
              key={provider.type}
              onClick={() => handleWalletSelect(provider.type)}
              disabled={!!connecting}
            >
              <WalletIcon src={provider.icon} alt={provider.name} />
              <WalletInfo>
                <WalletName>{provider.name}</WalletName>
                <WalletDescription>{provider.description}</WalletDescription>
              </WalletInfo>
              {connecting === provider.type && <LoadingSpinner />}
            </WalletOption>
          ))}
        </WalletList>

        {availableProviders.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: theme.spacing[6],
            color: theme.colors.text.secondary 
          }}>
            No wallet providers available. Please install MetaMask or use a WalletConnect compatible wallet.
          </div>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default WalletSelectionModal;
