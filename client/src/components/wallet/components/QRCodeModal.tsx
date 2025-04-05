import React from 'react';
import styled from 'styled-components';
import { formatWalletAddress } from '@utils';

// Helper function to get QR code URL
const getQRCodeUrl = (address: string): string => {
  // Using QR code API to generate QR code for the address
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}`;
};

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
  padding: 24px;
  width: 300px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ModalTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
  color: #fff;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
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

const QRImage = styled.img`
  width: 200px;
  height: 200px;
  border-radius: 8px;
  margin-bottom: 16px;
  background-color: white;
`;

const AddressText = styled.div`
  font-family: monospace;
  font-size: 14px;
  color: #9ca3af;
  word-break: break-all;
  text-align: center;
`;

interface QRCodeModalProps {
  isOpen: boolean;
  walletAddress: string;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  walletAddress,
  onClose
}) => {
  // Close modal when clicking outside
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalTitle>Wallet Address QR Code</ModalTitle>
        <QRImage src={getQRCodeUrl(walletAddress)} alt="Wallet QR Code" />
        <AddressText>{walletAddress}</AddressText>
        <CloseButton onClick={onClose}>&times;</CloseButton>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default QRCodeModal; 