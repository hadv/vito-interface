import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useWallet } from '../../../contexts/WalletContext';
import { theme } from '../../../theme';

const BannerContainer = styled.div`
  background: ${theme.colors.secondary[500]}15;
  border: 1px solid ${theme.colors.secondary[500]}30;
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing[3]} ${theme.spacing[4]};
  margin: ${theme.spacing[4]} 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
`;

const IconContainer = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.secondary[500]}20;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.secondary[500]};
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[1]};
  flex: 1;
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

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid ${theme.colors.secondary[500]}30;
  border-radius: 50%;
  border-top-color: ${theme.colors.secondary[500]};
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const NetworkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface NetworkSwitchingBannerProps {
  targetNetwork?: string;
  className?: string;
}

const NetworkSwitchingBanner: React.FC<NetworkSwitchingBannerProps> = ({
  targetNetwork,
  className
}) => {
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);
  const { state: walletState } = useWallet();

  useEffect(() => {
    // Check if we're in the middle of a network switch
    if (targetNetwork && walletState.network !== targetNetwork && walletState.isConnected) {
      setIsNetworkSwitching(true);
    } else {
      setIsNetworkSwitching(false);
    }
  }, [targetNetwork, walletState.network, walletState.isConnected]);

  // Only show banner if we're switching networks
  if (!isNetworkSwitching || !targetNetwork) {
    return null;
  }

  return (
    <BannerContainer className={className}>
      <IconContainer>
        <NetworkIcon />
      </IconContainer>
      <TextContainer>
        <Title>Switching Network</Title>
        <Description>
          Switching to {targetNetwork}... Please wait while we reconnect your Safe wallet.
        </Description>
      </TextContainer>
      <LoadingSpinner />
    </BannerContainer>
  );
};

export default NetworkSwitchingBanner;
