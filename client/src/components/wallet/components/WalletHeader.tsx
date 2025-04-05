import React, { useState } from 'react';
import styled from 'styled-components';
import { formatWalletAddress, generateWalletAvatar } from '@utils';

// Icons
const QRCodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3H9V9H3V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 3H21V9H15V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M3 15H9V21H3V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 15H21V21H15V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const EtherscanIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12L20 4M20 4H15M20 4V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 12V19C19 20.1046 18.1046 21 17 21H5C3.89543 21 3 20.1046 3 19V7C3 5.89543 3.89543 5 5 5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Styled components
const Container = styled.div`
  padding: 12px 16px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  border-bottom: 1px solid #333;
  margin-bottom: 6px;
`;

const WalletAvatar = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin-right: 16px;
  background-color: #333;
  flex-shrink: 0;
`;

const WalletInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
`;

const ENSName = styled.div`
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 2px;
  color: #fff;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ENSLoadingIndicator = styled.div`
  font-size: 13px;
  color: #9ca3af;
  margin-bottom: 2px;
  text-align: left;
`;

const WalletAddressValue = styled.div`
  font-size: 13px;
  color: #9ca3af;
  margin-bottom: 8px;
  text-align: left;
`;

const WalletAddressActions = styled.div`
  display: flex;
  justify-content: flex-start;
  gap: 6px;
  margin-top: 2px;
`;

const ActionButton = styled.button`
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  
  &:hover {
    background-color: #333;
    color: #fff;
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
    const baseUrl = network === 'ethereum' ? 'https://etherscan.io' : 
                    `https://${network}.etherscan.io`;
    window.open(`${baseUrl}/address/${walletAddress}`, '_blank');
  };
  
  return (
    <Container>
      <WalletAvatar 
        src={avatarUrl} 
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