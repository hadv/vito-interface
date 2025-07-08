import React from 'react';
import styled from 'styled-components';
import { SafeTxPoolTransaction } from '../../../services/SafeTxPoolService';
import { formatWalletAddress } from '../../../utils';

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #1f2937;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid #374151;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ModalTitle = styled.h2`
  color: #f9fafb;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #f9fafb;
  }
`;

const WarningSection = styled.div`
  background: #fbbf24;
  color: #92400e;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.875rem;
  display: flex;
  align-items: flex-start;
  gap: 8px;
`;

const WarningIcon = styled.div`
  font-size: 1.2rem;
  margin-top: -2px;
`;

const TransactionDetails = styled.div`
  background: #374151;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailLabel = styled.span`
  color: #9ca3af;
  font-size: 0.875rem;
`;

const DetailValue = styled.span`
  color: #f9fafb;
  font-size: 0.875rem;
  font-family: monospace;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${props => props.variant === 'primary' ? `
    background: #dc2626;
    color: white;
    
    &:hover {
      background: #b91c1c;
    }
  ` : `
    background: #374151;
    color: #f9fafb;
    border: 1px solid #4b5563;
    
    &:hover {
      background: #4b5563;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface DeleteTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  transaction: SafeTxPoolTransaction;
}

const DeleteTransactionModal: React.FC<DeleteTransactionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transaction
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Delete Transaction</ModalTitle>
          <CloseButton onClick={onClose} disabled={isDeleting}>
            ×
          </CloseButton>
        </ModalHeader>

        <WarningSection>
          <WarningIcon>⚠️</WarningIcon>
          <div>
            <strong>Warning:</strong> This action cannot be undone. The transaction will be permanently removed from the Safe TX pool and all signatures will be lost.
          </div>
        </WarningSection>

        <TransactionDetails>
          <DetailRow>
            <DetailLabel>Transaction Hash:</DetailLabel>
            <DetailValue>{formatWalletAddress(transaction.txHash)}</DetailValue>
          </DetailRow>
          <DetailRow>
            <DetailLabel>To Address:</DetailLabel>
            <DetailValue>{formatWalletAddress(transaction.to)}</DetailValue>
          </DetailRow>
          <DetailRow>
            <DetailLabel>Value:</DetailLabel>
            <DetailValue>{transaction.value} ETH</DetailValue>
          </DetailRow>
          <DetailRow>
            <DetailLabel>Nonce:</DetailLabel>
            <DetailValue>{transaction.nonce}</DetailValue>
          </DetailRow>
          <DetailRow>
            <DetailLabel>Proposer:</DetailLabel>
            <DetailValue>{formatWalletAddress(transaction.proposer)}</DetailValue>
          </DetailRow>
          <DetailRow>
            <DetailLabel>Signatures:</DetailLabel>
            <DetailValue>{transaction.signatures.length}</DetailValue>
          </DetailRow>
        </TransactionDetails>

        <ButtonGroup>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Transaction'}
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default DeleteTransactionModal;
