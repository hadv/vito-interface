import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../../theme';
import { WalletProviderType } from '../../services/WalletProvider';
import { WalletProviderFactory } from '../../services/WalletProviderFactory';
import {
  MetaMaskIcon,
  WalletConnectIcon,
  CoinbaseWalletIcon,
  RainbowIcon,
  TrustWalletIcon,
  GenericWalletIcon
} from './WalletIcons';

interface WalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect: (providerType: WalletProviderType) => Promise<void>;
}

// Animation keyframes
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  backdrop-filter: blur(8px);
  padding: ${theme.spacing[4]};

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing[2]};
  }
`;

const ModalContent = styled.div`
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing[8]};
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  animation: ${fadeIn} 0.2s ease-out;
  position: relative;
  margin: auto;

  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing[6]};
    max-width: calc(100% - ${theme.spacing[8]});
    border-radius: ${theme.borderRadius.lg};
  }

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${theme.colors.background.primary};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border.primary};
    border-radius: 3px;

    &:hover {
      background: ${theme.colors.border.secondary};
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing[8]};
  padding-bottom: ${theme.spacing[4]};
  border-bottom: 1px solid ${theme.colors.border.primary};
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  background: linear-gradient(135deg, ${theme.colors.text.primary} 0%, ${theme.colors.primary[400]} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const ModalSubtitle = styled.p`
  margin: ${theme.spacing[2]} 0 0 0;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  font-weight: ${theme.typography.fontWeight.normal};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.text.secondary};
  cursor: pointer;
  padding: ${theme.spacing[2]};
  border-radius: ${theme.borderRadius.md};
  transition: all ${theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;

  &:hover:not(:disabled) {
    background: ${theme.colors.background.tertiary};
    color: ${theme.colors.text.primary};
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const WalletList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[3]};
  animation: ${slideUp} 0.3s ease-out;
`;

const WalletOption = styled.button<{ disabled?: boolean; connecting?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[4]};
  padding: ${theme.spacing[5]};
  background: ${theme.colors.background.primary};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.lg};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all ${theme.transitions.normal};
  text-align: left;
  width: 100%;
  opacity: ${props => props.disabled ? 0.6 : 1};
  position: relative;
  overflow: hidden;

  /* Subtle gradient overlay */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, transparent 0%, ${theme.colors.primary[500]}08 100%);
    opacity: 0;
    transition: opacity ${theme.transitions.fast};
  }

  &:hover:not(:disabled) {
    background: ${theme.colors.background.tertiary};
    border-color: ${theme.colors.primary[500]};
    transform: translateY(-2px);
    box-shadow:
      0 10px 25px -5px rgba(0, 0, 0, 0.1),
      0 0 0 1px ${theme.colors.primary[500]}20;

    &::before {
      opacity: 1;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(-1px);
  }

  ${props => props.connecting && `
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        ${theme.colors.primary[500]}20,
        transparent
      );
      animation: ${pulse} 1.5s infinite;
    }
  `}
`;

const WalletIconContainer = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${theme.borderRadius.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.primary};
  flex-shrink: 0;
  transition: all ${theme.transitions.fast};

  .wallet-option:hover & {
    border-color: ${theme.colors.primary[500]};
    box-shadow: 0 0 0 2px ${theme.colors.primary[500]}20;
  }
`;

const WalletInfo = styled.div`
  flex: 1;
  min-width: 0; /* Prevent flex item from overflowing */
`;

const WalletName = styled.div`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing[1]};
  line-height: 1.2;
`;

const WalletDescription = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  line-height: 1.4;
`;

const WalletStatus = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
  flex-shrink: 0;
`;

const StatusBadge = styled.div<{ variant: 'available' | 'unavailable' | 'popular' }>`
  padding: ${theme.spacing[1]} ${theme.spacing[2]};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${props => {
    switch (props.variant) {
      case 'available':
        return `
          background: ${theme.colors.status.success}20;
          color: ${theme.colors.status.success};
          border: 1px solid ${theme.colors.status.success}30;
        `;
      case 'unavailable':
        return `
          background: ${theme.colors.status.error}20;
          color: ${theme.colors.status.error};
          border: 1px solid ${theme.colors.status.error}30;
        `;
      case 'popular':
        return `
          background: ${theme.colors.primary[500]}20;
          color: ${theme.colors.primary[400]};
          border: 1px solid ${theme.colors.primary[500]}30;
        `;
      default:
        return '';
    }
  }}
`;

const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 2px solid ${theme.colors.border.primary};
  border-top: 2px solid ${theme.colors.primary[500]};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  flex-shrink: 0;
`;

const ErrorMessage = styled.div`
  background: ${theme.colors.status.error}15;
  border: 1px solid ${theme.colors.status.error}30;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing[4]};
  margin-bottom: ${theme.spacing[6]};
  color: ${theme.colors.status.error};
  font-size: ${theme.typography.fontSize.sm};
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing[3]};
  animation: ${slideUp} 0.3s ease-out;

  &::before {
    content: '⚠️';
    flex-shrink: 0;
    font-size: ${theme.typography.fontSize.base};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing[8]} ${theme.spacing[4]};
  color: ${theme.colors.text.secondary};

  svg {
    width: 64px;
    height: 64px;
    margin-bottom: ${theme.spacing[4]};
    opacity: 0.5;
  }

  h3 {
    margin: 0 0 ${theme.spacing[2]} 0;
    font-size: ${theme.typography.fontSize.lg};
    font-weight: ${theme.typography.fontWeight.semibold};
    color: ${theme.colors.text.primary};
  }

  p {
    margin: 0;
    font-size: ${theme.typography.fontSize.sm};
    line-height: 1.6;
    max-width: 300px;
    margin: 0 auto;
  }
`;

// Helper function to get the appropriate wallet icon component
const getWalletIcon = (iconType: string, size: number = 40) => {
  switch (iconType) {
    case 'metamask':
      return <MetaMaskIcon size={size} />;
    case 'walletconnect':
      return <WalletConnectIcon size={size} />;
    case 'coinbase':
      return <CoinbaseWalletIcon size={size} />;
    case 'rainbow':
      return <RainbowIcon size={size} />;
    case 'trust':
      return <TrustWalletIcon size={size} />;
    default:
      return <GenericWalletIcon size={size} />;
  }
};

// Helper function to determine if a wallet is popular
const isPopularWallet = (walletType: WalletProviderType): boolean => {
  return [
    WalletProviderType.METAMASK,
    WalletProviderType.WALLETCONNECT,
    WalletProviderType.COINBASE_WALLET
  ].includes(walletType);
};

const WalletSelectionModal: React.FC<WalletSelectionModalProps> = ({
  isOpen,
  onClose,
  onWalletSelect
}) => {
  const [connecting, setConnecting] = useState<WalletProviderType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allProviders = WalletProviderFactory.getProviderInfo();
  const availableProviders = WalletProviderFactory.getAvailableProviderInfo();

  console.log('💼 WalletSelectionModal available providers:', availableProviders);

  const handleClose = useCallback(() => {
    if (connecting) return; // Prevent closing while connecting
    setError(null);
    onClose();
  }, [connecting, onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !connecting) {
      handleClose();
    }
  }, [connecting, handleClose]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !connecting) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, connecting, handleClose]);

  const handleWalletSelect = async (providerType: WalletProviderType) => {
    // Don't allow selection if already connecting or wallet is not available
    const provider = allProviders.find(p => p.type === providerType);
    if (connecting || !provider?.isAvailable) return;

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



  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <div>
            <ModalTitle>Connect Wallet</ModalTitle>
            <ModalSubtitle>Choose your preferred wallet to connect to Vito</ModalSubtitle>
          </div>
          <CloseButton onClick={handleClose} disabled={!!connecting}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </CloseButton>
        </ModalHeader>

        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        <WalletList>
          {allProviders.map((provider) => (
            <WalletOption
              key={provider.type}
              className="wallet-option"
              onClick={() => handleWalletSelect(provider.type)}
              disabled={!!connecting || !provider.isAvailable}
              connecting={connecting === provider.type}
            >
              <WalletIconContainer>
                {getWalletIcon(provider.icon, 32)}
              </WalletIconContainer>
              <WalletInfo>
                <WalletName>{provider.name}</WalletName>
                <WalletDescription>{provider.description}</WalletDescription>
              </WalletInfo>
              <WalletStatus>
                {!provider.isAvailable && (
                  <StatusBadge variant="unavailable">Not Installed</StatusBadge>
                )}
                {provider.isAvailable && isPopularWallet(provider.type) && (
                  <StatusBadge variant="popular">Popular</StatusBadge>
                )}
                {connecting === provider.type && <LoadingSpinner />}
              </WalletStatus>
            </WalletOption>
          ))}
        </WalletList>

        {availableProviders.length === 0 && (
          <EmptyState>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 15H7.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3>No Wallets Available</h3>
            <p>
              Please install a supported wallet like MetaMask, or use a WalletConnect compatible mobile wallet to continue.
            </p>
          </EmptyState>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default WalletSelectionModal;
