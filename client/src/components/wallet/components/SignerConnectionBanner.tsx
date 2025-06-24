import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { walletConnectionService, WalletConnectionState } from '../../../services/WalletConnectionService';
import { WalletProviderType } from '../../../services/WalletProvider';
import { theme } from '../../../theme';
import WalletSelectionModal from '../WalletSelectionModal';

const BannerContainer = styled.div`
  background: ${theme.colors.primary[500]}15;
  border: 1px solid ${theme.colors.primary[500]}30;
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing[4]};
  margin: ${theme.spacing[4]} 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing[3]};
`;

const InfoSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
`;

const IconContainer = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.primary[500]}20;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.primary[500]};
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[1]};
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const Description = styled.p`
  margin: 0;
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.secondary};
  line-height: 1.4;
`;

const ConnectButton = styled.button`
  background: ${theme.colors.primary[500]};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing[2]} ${theme.spacing[4]};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${theme.colors.primary[600]};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: ${theme.colors.text.tertiary};
    cursor: not-allowed;
    transform: none;
  }
`;

const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 15H7.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface SignerConnectionBannerProps {
  className?: string;
}

const SignerConnectionBanner: React.FC<SignerConnectionBannerProps> = ({ className }) => {
  const [connectionState, setConnectionState] = useState<WalletConnectionState>({ isConnected: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletSelection, setShowWalletSelection] = useState(false);

  useEffect(() => {
    // Get initial state
    setConnectionState(walletConnectionService.getState());

    // Subscribe to state changes
    const unsubscribe = walletConnectionService.subscribe((state) => {
      setConnectionState(state);
    });

    return unsubscribe;
  }, []);

  const handleConnectSigner = () => {
    // Show wallet selection modal instead of automatically connecting to MetaMask
    setShowWalletSelection(true);
  };

  const handleWalletSelect = async (providerType: WalletProviderType) => {
    setIsConnecting(true);
    try {
      await walletConnectionService.connectSignerWalletWithProvider(providerType);
      setShowWalletSelection(false);
    } catch (error: any) {
      console.error('Failed to connect signer wallet:', error);
      // Error will be shown by the modal
      throw error; // Re-throw to let modal handle it
    } finally {
      setIsConnecting(false);
    }
  };

  // Only show banner if Safe is connected but signer is not
  if (!connectionState.isConnected || connectionState.signerConnected || !connectionState.readOnlyMode) {
    return null;
  }

  return (
    <>
      <BannerContainer className={className}>
        <InfoSection>
          <IconContainer>
            <WalletIcon />
          </IconContainer>
          <TextContainer>
            <Title>Read-Only Mode</Title>
            <Description>
              Connect your wallet to sign transactions and interact with the Safe
            </Description>
          </TextContainer>
        </InfoSection>
        <ConnectButton
          onClick={handleConnectSigner}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </ConnectButton>
      </BannerContainer>

      {/* Wallet Selection Modal */}
      <WalletSelectionModal
        isOpen={showWalletSelection}
        onClose={() => setShowWalletSelection(false)}
        onWalletSelect={handleWalletSelect}
      />
    </>
  );
};

export default SignerConnectionBanner;
