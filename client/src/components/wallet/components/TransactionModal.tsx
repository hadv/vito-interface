import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Input } from '@components/ui';
import { sendTransaction } from '../../../models/SafeWallet';
import { isValidEthereumAddress } from '../../../utils/ens';
import EIP712SigningModal from './EIP712SigningModal';
import { SafeTransactionData } from '../../../utils/eip712';

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

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 1px solid #404040;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const ModalTitle = styled.h2`
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  color: #e5e7eb;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
`;

const SuccessMessage = styled.div`
  color: #10b981;
  font-size: 12px;
  margin-top: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`;

const TransactionDetails = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #404040;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailLabel = styled.span`
  color: #9ca3af;
  font-size: 14px;
`;

const DetailValue = styled.span`
  color: #fff;
  font-size: 14px;
  font-weight: 500;
`;

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated?: (transaction: any) => void;
  fromAddress?: string;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onTransactionCreated,
  fromAddress
}) => {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEIP712Modal, setShowEIP712Modal] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<{
    data: SafeTransactionData;
    safeAddress: string;
    chainId: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!toAddress.trim()) {
      setError('Recipient address is required');
      return;
    }

    if (!isValidEthereumAddress(toAddress)) {
      setError('Invalid recipient address');
      return;
    }

    if (!amount.trim() || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setIsLoading(true);

    try {
      // First create the transaction (this will show EIP-712 signing)
      const transaction = await sendTransaction(
        fromAddress || '',
        toAddress,
        amount
      );

      setSuccess(`Transaction created and signed! Hash: ${transaction.safeTxHash}`);

      if (onTransactionCreated) {
        onTransactionCreated(transaction);
      }

      // Reset form
      setTimeout(() => {
        setToAddress('');
        setAmount('');
        setSuccess('');
        onClose();
      }, 2000);

    } catch (error: any) {
      setError(error.message || 'Failed to create transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEIP712Sign = async () => {
    if (!pendingTransaction) return;

    try {
      // The actual signing will be handled by the SafeWalletService
      // This is just to close the modal
      setShowEIP712Modal(false);
      setPendingTransaction(null);
    } catch (error: any) {
      setError(error.message || 'Failed to sign transaction');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const estimatedGas = '0.001'; // Mock gas estimation
  const networkFee = '0.002'; // Mock network fee

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>Send Transaction</ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Recipient Address</Label>
            <Input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
              disabled={isLoading}
            />
          </FormGroup>

          <FormGroup>
            <Label>Amount (ETH)</Label>
            <Input
              type="number"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              disabled={isLoading}
            />
          </FormGroup>

          {(toAddress && amount && parseFloat(amount) > 0) && (
            <TransactionDetails>
              <DetailRow>
                <DetailLabel>Recipient:</DetailLabel>
                <DetailValue>{toAddress.slice(0, 6)}...{toAddress.slice(-4)}</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Amount:</DetailLabel>
                <DetailValue>{amount} ETH</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Estimated Gas:</DetailLabel>
                <DetailValue>{estimatedGas} ETH</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Network Fee:</DetailLabel>
                <DetailValue>{networkFee} ETH</DetailValue>
              </DetailRow>
            </TransactionDetails>
          )}

          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}

          <ButtonGroup>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !toAddress || !amount}
            >
              {isLoading ? 'Creating...' : 'Create Transaction'}
            </Button>
          </ButtonGroup>
        </form>

        {/* EIP-712 Signing Modal */}
        {pendingTransaction && (
          <EIP712SigningModal
            isOpen={showEIP712Modal}
            onClose={() => {
              setShowEIP712Modal(false);
              setPendingTransaction(null);
            }}
            onSign={handleEIP712Sign}
            transactionData={pendingTransaction.data}
            safeAddress={pendingTransaction.safeAddress}
            chainId={pendingTransaction.chainId}
          />
        )}
      </ModalContainer>
    </ModalOverlay>
  );
};

export default TransactionModal;
