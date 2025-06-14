import React, { useState } from 'react';
import styled from 'styled-components';
import { generateWalletAvatar } from '@utils';
// import { formatWalletAddress } from '@utils';

// Helper function to get QR code URL
const getQRCodeUrl = (address: string): string => {
  // Using QR code API to generate QR code for the address
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}`;
};

// Icons
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
const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: ${(props) => (props.isOpen ? 'flex' : 'none')};
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background-color: #1e1e1e;
  border-radius: 8px;
  padding: 0;
  width: 650px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  width: 100%;
  padding: 24px 32px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalBody = styled.div`
  padding: 32px;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 24px;
  color: #fff;
  font-weight: 700;
`;

const DescriptionText = styled.p`
  color: #d0d0d0;
  font-size: 16px;
  font-weight: 500;
  text-align: left;
  margin-bottom: 36px;
  line-height: 1.6;
  width: 100%;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const QRCodeContainer = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  margin-bottom: 36px;
`;

const QRImage = styled.img`
  width: 220px;
  height: 220px;
  border-radius: 8px;
  background-color: white;
`;

const WalletAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 12px;
  background-color: #333;
  flex-shrink: 0;
`;

const AddressContainer = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 16px;
  box-sizing: border-box;
`;

const AddressGroup = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  border: 1px solid #333;
  border-radius: 4px;
  overflow: hidden;
  max-width: 100%;
`;

const AddressText = styled.div`
  font-family: monospace;
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
  padding: 12px;
  overflow-x: auto;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`;

const AddressActions = styled.div`
  display: flex;
  background: #2a2a2a;
`;

const ActionButton = styled.button`
  background: transparent;
  border: none;
  border-left: 1px solid #333;
  color: #d0d0d0;
  cursor: pointer;
  padding: 12px 14px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-weight: 500;

  &:hover {
    background-color: #333;
    color: #fff;
  }
`;

const CopyFeedback = styled.div`
  position: absolute;
  bottom: -28px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  animation: fadeOut 1.5s ease-in-out;

  @keyframes fadeOut {
    0% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }
`;

interface QRCodeModalProps {
  isOpen: boolean;
  walletAddress: string;
  network?: string;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  walletAddress,
  network = 'ethereum',
  onClose
}) => {
  const [showCopied, setShowCopied] = useState(false);
  const avatarUrl = generateWalletAvatar(walletAddress);
  
  // Close modal when clicking outside
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
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
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>Receive assets</ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>
        <ModalBody>
          <DescriptionText>
            This is the address of your Safe Account. Deposit funds by scanning the QR code or copying the address below. Only send ETH and tokens (e.g. ERC20, ERC721) to this address.
          </DescriptionText>
          <QRCodeContainer>
            <QRImage src={getQRCodeUrl(walletAddress)} alt="Wallet QR Code" />
          </QRCodeContainer>
          <AddressContainer>
            <WalletAvatar src={avatarUrl} alt="Wallet Avatar" />
            <AddressGroup>
              <AddressText>{walletAddress}</AddressText>
              <AddressActions>
                <ActionButton onClick={copyToClipboard} title="Copy Address" style={{ position: 'relative' }}>
                  <CopyIcon />
                  {showCopied && <CopyFeedback>Copied!</CopyFeedback>}
                </ActionButton>
                <ActionButton onClick={openEtherscan} title="View on Etherscan">
                  <EtherscanIcon />
                </ActionButton>
              </AddressActions>
            </AddressGroup>
          </AddressContainer>
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default QRCodeModal; 