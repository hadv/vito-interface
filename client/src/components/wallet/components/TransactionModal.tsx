import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { Button, Input } from '@components/ui';
import { isValidEthereumAddress } from '../../../utils/ens';
import EIP712SigningModal from './EIP712SigningModal';
import { SafeTransactionData, SafeDomain } from '../../../utils/eip712';
import { safeWalletService } from '../../../services/SafeWalletService';
import { walletConnectionService, WalletConnectionState } from '../../../services/WalletConnectionService';
import { isSafeTxPoolConfigured } from '../../../contracts/abis';

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
  background: #1a1a1a;
  border: 1px solid #404040;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
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

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
`;

const StepBadge = styled.div<{ active: boolean; completed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  background: ${props =>
    props.completed ? '#10b981' :
    props.active ? '#3b82f6' : '#374151'
  };
  color: ${props => props.active || props.completed ? '#fff' : '#9ca3af'};
`;

const StepText = styled.span<{ active: boolean; completed: boolean }>`
  font-size: 16px;
  color: ${props =>
    props.completed ? '#10b981' :
    props.active ? '#3b82f6' : '#d0d0d0'
  };
  font-weight: ${props => props.active ? '600' : '500'};
`;

const StepSeparator = styled.div`
  width: 20px;
  height: 2px;
  background: #374151;
  margin: 0 4px;
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
  const [currentStep, setCurrentStep] = useState<'form' | 'signing' | 'proposing'>('form');
  const [showEIP712Modal, setShowEIP712Modal] = useState(false);
  const [connectionState, setConnectionState] = useState<WalletConnectionState>({ isConnected: false });
  const [pendingTransaction, setPendingTransaction] = useState<{
    data: SafeTransactionData;
    domain: SafeDomain;
    txHash: string;
  } | null>(null);

  // Subscribe to wallet connection state changes
  useEffect(() => {
    setConnectionState(walletConnectionService.getState());

    const unsubscribe = walletConnectionService.subscribe((state) => {
      setConnectionState(state);
    });

    return unsubscribe;
  }, []);

  const handleConnectSigner = async () => {
    try {
      await walletConnectionService.connectSignerWallet();
    } catch (error: any) {
      setError(`Failed to connect signer wallet: ${error.message}`);
    }
  };

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

    // Check if signer is connected
    if (!connectionState.signerConnected) {
      setError('Please connect your wallet to sign transactions');
      return;
    }

    // Check if Safe TX Pool is configured for the current network
    if (!isSafeTxPoolConfigured(connectionState.network || 'ethereum')) {
      setError(`Safe TX Pool contract is not configured for ${connectionState.network}. Please configure the contract address to enable transactions.`);
      return;
    }

    setIsLoading(true);
    setCurrentStep('form');

    try {
      // Step 1: Create domain type EIP-712 transaction
      const { safeTransactionData, domain, txHash } = await safeWalletService.createEIP712Transaction({
        to: toAddress,
        value: ethers.utils.parseEther(amount).toString(),
        data: '0x',
        operation: 0
      });

      // Set up for Step 2: Request user to sign
      setPendingTransaction({
        data: safeTransactionData,
        domain,
        txHash
      });
      setCurrentStep('signing');
      setShowEIP712Modal(true);

    } catch (error: any) {
      setError(error.message || 'Failed to create EIP-712 transaction');
      setIsLoading(false);
    }
  };

  const handleEIP712Sign = async () => {
    if (!pendingTransaction) return;

    setCurrentStep('signing');

    try {
      // Step 2: Request user to sign
      const signature = await safeWalletService.signEIP712Transaction(
        pendingTransaction.data,
        pendingTransaction.domain
      );

      setShowEIP712Modal(false);
      setCurrentStep('proposing');

      // Step 3: Use signed transaction data to propose transaction on SafeTxPool contract
      await safeWalletService.proposeSignedTransaction(
        pendingTransaction.data,
        pendingTransaction.txHash,
        signature
      );

      setSuccess(`Transaction flow completed! Hash: ${pendingTransaction.txHash}`);

      if (onTransactionCreated) {
        onTransactionCreated({
          ...pendingTransaction.data,
          txHash: pendingTransaction.txHash,
          signature
        });
      }

      // Reset form
      setTimeout(() => {
        setToAddress('');
        setAmount('');
        setSuccess('');
        setCurrentStep('form');
        setPendingTransaction(null);
        onClose();
      }, 2000);

    } catch (error: any) {
      setError(error.message || 'Failed to complete transaction flow');
      setShowEIP712Modal(false);
      setCurrentStep('form');
    } finally {
      setIsLoading(false);
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

        <StepIndicator>
          <StepBadge active={currentStep === 'form'} completed={currentStep !== 'form'}>
            1
          </StepBadge>
          <StepText active={currentStep === 'form'} completed={currentStep !== 'form'}>
            Create EIP-712 Transaction
          </StepText>

          <StepSeparator />

          <StepBadge active={currentStep === 'signing'} completed={currentStep === 'proposing'}>
            2
          </StepBadge>
          <StepText active={currentStep === 'signing'} completed={currentStep === 'proposing'}>
            Sign Transaction
          </StepText>

          <StepSeparator />

          <StepBadge active={currentStep === 'proposing'} completed={false}>
            3
          </StepBadge>
          <StepText active={currentStep === 'proposing'} completed={false}>
            Propose to SafeTxPool
          </StepText>
        </StepIndicator>

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
            {!connectionState.signerConnected ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleConnectSigner}
                disabled={isLoading}
              >
                Connect Wallet to Sign
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || !toAddress || !amount}
              >
                {isLoading ?
                  (currentStep === 'form' ? 'Creating EIP-712 Transaction...' :
                   currentStep === 'signing' ? 'Waiting for Signature...' :
                   'Proposing to SafeTxPool...') :
                  'Create EIP-712 Transaction'
                }
              </Button>
            )}
          </ButtonGroup>
        </form>

        {/* EIP-712 Signing Modal */}
        {pendingTransaction && (
          <EIP712SigningModal
            isOpen={showEIP712Modal}
            onClose={() => {
              setShowEIP712Modal(false);
              setPendingTransaction(null);
              setCurrentStep('form');
              setIsLoading(false);
            }}
            onSign={handleEIP712Sign}
            transactionData={pendingTransaction.data}
            safeAddress={pendingTransaction.domain.verifyingContract}
            chainId={pendingTransaction.domain.chainId}
          />
        )}
      </ModalContainer>
    </ModalOverlay>
  );
};

export default TransactionModal;
