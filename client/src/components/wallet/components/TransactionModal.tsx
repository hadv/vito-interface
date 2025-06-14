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
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 32px;
  width: 95%;
  max-width: 800px;
  max-height: 95vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const ModalTitle = styled.h2`
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
  margin: 0;
`;

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: #334155;
  border-radius: 12px;
  border: 1px solid #475569;
  flex-wrap: nowrap;
  overflow-x: auto;
`;

const StepBadge = styled.div<{ active: boolean; completed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 16px;
  font-weight: 700;
  background: ${props =>
    props.completed ? '#10b981' :
    props.active ? '#3b82f6' :
    '#64748b'
  };
  color: #ffffff;
  flex-shrink: 0;
`;

const StepText = styled.span<{ active: boolean; completed: boolean }>`
  font-size: 18px;
  color: ${props =>
    props.completed ? '#34d399' :
    props.active ? '#60a5fa' : '#e5e7eb'
  };
  font-weight: ${props => props.active ? '700' : '600'};
  white-space: nowrap;
  flex-shrink: 0;
`;

const StepSeparator = styled.div`
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 8px;
  border-radius: 2px;
  flex-shrink: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #CBD5E1;
  font-size: 32px;
  cursor: pointer;
  padding: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
    color: #fff;
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(255, 107, 107, 0.4);
  }
`;

const FormGroup = styled.div`
  margin-bottom: 32px;
`;

const Label = styled.label`
  display: block;
  color: #4ECDC4;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  text-shadow: 0 0 10px rgba(78, 205, 196, 0.3);
`;

const ErrorMessage = styled.div`
  color: #FF6B6B;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
  padding: 16px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 12px;
  text-shadow: 0 0 10px rgba(255, 107, 107, 0.3);
`;

const SuccessMessage = styled.div`
  color: #96CEB4;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
  padding: 16px;
  background: rgba(150, 206, 180, 0.1);
  border: 1px solid rgba(150, 206, 180, 0.3);
  border-radius: 12px;
  text-shadow: 0 0 10px rgba(150, 206, 180, 0.3);
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 20px;
  justify-content: flex-end;
  margin-top: 40px;
  flex-wrap: wrap;
`;

const TransactionDetails = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(78, 205, 196, 0.3);
  border-radius: 16px;
  padding: 24px;
  margin: 24px 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-child {
    margin-bottom: 0;
    border-bottom: none;
  }
`;

const DetailLabel = styled.span`
  color: #4ECDC4;
  font-size: 16px;
  font-weight: 600;
  text-shadow: 0 0 8px rgba(78, 205, 196, 0.3);
`;

const DetailValue = styled.span`
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  word-break: break-all;
  text-align: right;
  max-width: 60%;
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
