import React, { useState } from 'react';
import styled from 'styled-components';
import { formatWalletAddress, generateWalletAvatar } from '@utils';
import { theme } from '../../../theme';
import { Avatar } from '../../ui';

// Icons with Blue Theme - Updated QR Code Icon (Modern Style)
const QRCodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Top-left corner */}
    <path fillRule="evenodd" clipRule="evenodd" d="M6 1H2C1.44772 1 1 1.44772 1 2V6C1 6.55228 1.44772 7 2 7H6C6.55228 7 7 6.55228 7 6V2C7 1.44772 6.55228 1 6 1ZM3 5V3H5V5H3Z" fill="#3b82f6"/>
    {/* Bottom-left corner */}
    <path fillRule="evenodd" clipRule="evenodd" d="M6 9H2C1.44772 9 1 9.44772 1 10V14C1 14.5523 1.44772 15 2 15H6C6.55228 15 7 14.5523 7 14V10C7 9.44772 6.55228 9 6 9ZM3 13V11H5V13H3Z" fill="#3b82f6"/>
    {/* Top-right corner */}
    <path fillRule="evenodd" clipRule="evenodd" d="M14 1H10C9.44772 1 9 1.44772 9 2V6C9 6.55228 9.44772 7 10 7H14C14.5523 7 15 6.55228 15 6V2C15 1.44772 14.5523 1 14 1ZM11 5V3H13V5H11Z" fill="#3b82f6"/>
    {/* Bottom-right pattern dots */}
    <path d="M10.5 8.79999H9.50001C9.11341 8.79999 8.80001 9.11339 8.80001 9.49999V10.5C8.80001 10.8866 9.11341 11.2 9.50001 11.2H10.5C10.8866 11.2 11.2 10.8866 11.2 10.5V9.49999C11.2 9.11339 10.8866 8.79999 10.5 8.79999Z" fill="#3b82f6"/>
    <path d="M14.5 8.79999H13.5C13.1134 8.79999 12.8 9.11339 12.8 9.49999V10.5C12.8 10.8866 13.1134 11.2 13.5 11.2H14.5C14.8866 11.2 15.2 10.8866 15.2 10.5V9.49999C15.2 9.11339 14.8866 8.79999 14.5 8.79999Z" fill="#3b82f6"/>
    <path d="M14.5 12.8H13.5C13.1134 12.8 12.8 13.1134 12.8 13.5V14.5C12.8 14.8866 13.1134 15.2 13.5 15.2H14.5C14.8866 15.2 15.2 14.8866 15.2 14.5V13.5C15.2 13.1134 14.8866 12.8 14.5 12.8Z" fill="#3b82f6"/>
    <path d="M10.5 12.8H9.50001C9.11341 12.8 8.80001 13.1134 8.80001 13.5V14.5C8.80001 14.8866 9.11341 15.2 9.50001 15.2H10.5C10.8866 15.2 11.2 14.8866 11.2 14.5V13.5C11.2 13.1134 10.8866 12.8 10.5 12.8Z" fill="#3b82f6"/>
    <path d="M12.5 10.8H11.5C11.1134 10.8 10.8 11.1134 10.8 11.5V12.5C10.8 12.8866 11.1134 13.2 11.5 13.2H12.5C12.8866 13.2 13.2 12.8866 13.2 12.5V11.5C13.2 11.1134 12.8866 10.8 12.5 10.8Z" fill="#3b82f6"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="9" width="12" height="12" rx="2" stroke="#3b82f6" strokeWidth="2" fill="none"/>
    <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="#3b82f6" strokeWidth="2"/>
  </svg>
);

const EtherscanIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12L20 4M20 4H15M20 4V9" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 12V19C19 20.1046 18.1046 21 17 21H5C3.89543 21 3 20.1046 3 19V7C3 5.89543 3.89543 5 5 5H12" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Styled components
const Container = styled.div`
  padding: ${theme.spacing[5]} ${theme.spacing[6]};
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  border-bottom: 1px solid ${theme.colors.border.tertiary};
  margin-bottom: ${theme.spacing[2]};
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 2px;
    background: ${theme.colors.primary[500]};
    border-radius: 1px;
  }
`;

const WalletInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  margin-left: ${theme.spacing[4]};
`;

const ENSName = styled.div`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.semibold};
  margin-bottom: ${theme.spacing[1]};
  color: ${theme.colors.text.primary};
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ENSLoadingIndicator = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.tertiary};
  margin-bottom: ${theme.spacing[1]};
  text-align: left;
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};

  &::after {
    content: '';
    width: 12px;
    height: 12px;
    border: 2px solid ${theme.colors.primary[500]};
    border-top: 2px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const WalletAddressValue = styled.div`
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing[3]};
  text-align: left;
  font-family: ${theme.typography.fontFamily.mono.join(', ')};
  background: ${theme.colors.background.elevated};
  padding: ${theme.spacing[2]} ${theme.spacing[3]};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.tertiary};
`;

const WalletAddressActions = styled.div`
  display: flex;
  justify-content: flex-start;
  gap: ${theme.spacing[2]};
  margin-top: ${theme.spacing[1]};
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${theme.colors.border.tertiary};
  color: ${theme.colors.text.tertiary};
  cursor: pointer;
  padding: ${theme.spacing[2]};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.borderRadius.lg};
  transition: ${theme.transitions.normal};
  backdrop-filter: blur(10px);

  &:hover {
    background: ${theme.colors.primary[500]}20;
    border-color: ${theme.colors.primary[500]}40;
    color: ${theme.colors.primary[400]};
    transform: translateY(-1px);
    box-shadow: ${theme.shadows.md};
  }

  &:active {
    transform: translateY(0);
  }
`;

const CopyFeedback = styled.div`
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  animation: fadeOut 1.5s ease-in-out;
  
  @keyframes fadeOut {
    0% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }
`;

interface WalletHeaderProps {
  walletAddress: string;
  ensName?: string;
  network: string;
  isLoadingEns?: boolean;
  onShowQRCode: () => void;
}

const WalletHeader: React.FC<WalletHeaderProps> = ({
  walletAddress,
  ensName,
  network,
  isLoadingEns = false,
  onShowQRCode
}) => {
  const [showCopied, setShowCopied] = useState(false);
  const avatarUrl = generateWalletAvatar(walletAddress);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(walletAddress);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 1500);
  };
  
  const openEtherscan = () => {
    let baseUrl: string;

    switch (network.toLowerCase()) {
      case 'ethereum':
      case 'mainnet':
        baseUrl = 'https://etherscan.io';
        break;
      case 'sepolia':
        baseUrl = 'https://sepolia.etherscan.io';
        break;
      case 'arbitrum':
        baseUrl = 'https://arbiscan.io';
        break;
      case 'optimism':
        baseUrl = 'https://optimistic.etherscan.io';
        break;
      case 'polygon':
        baseUrl = 'https://polygonscan.com';
        break;
      case 'base':
        baseUrl = 'https://basescan.org';
        break;
      default:
        baseUrl = 'https://etherscan.io';
    }

    window.open(`${baseUrl}/address/${walletAddress}`, '_blank');
  };
  
  return (
    <Container>
      <Avatar
        src={avatarUrl}
        address={walletAddress}
        size="xl"
        alt="Wallet Avatar"
      />

      <WalletInfoContainer>
        {isLoadingEns ? (
          <ENSLoadingIndicator>Resolving ENS...</ENSLoadingIndicator>
        ) : ensName ? (
          <ENSName>{ensName}</ENSName>
        ) : null}

        <WalletAddressValue>
          {formatWalletAddress(walletAddress)}
        </WalletAddressValue>

        <WalletAddressActions>
          <ActionButton onClick={onShowQRCode} title="Show QR Code">
            <QRCodeIcon />
          </ActionButton>

          <ActionButton onClick={copyToClipboard} title="Copy Address" style={{ position: 'relative' }}>
            <CopyIcon />
            {showCopied && <CopyFeedback>Copied!</CopyFeedback>}
          </ActionButton>

          <ActionButton onClick={openEtherscan} title="View on Etherscan">
            <EtherscanIcon />
          </ActionButton>
        </WalletAddressActions>
      </WalletInfoContainer>
    </Container>
  );
};

export default WalletHeader; 