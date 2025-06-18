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
import { useToast } from '../../../hooks/useToast';
import { ErrorHandler } from '../../../utils/errorHandling';
import { errorRecoveryService } from '../../../services/ErrorRecoveryService';
import { Asset } from '../types';

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
  gap: 12px;
  margin-bottom: 24px;
  padding: 20px;
  background: #334155;
  border-radius: 12px;
  border: 1px solid #475569;
  flex-wrap: nowrap;
  overflow-x: auto;
  justify-content: space-between;
  min-width: 100%;
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
  font-size: 14px;
  color: ${props =>
    props.completed ? '#34d399' :
    props.active ? '#60a5fa' : '#e5e7eb'
  };
  font-weight: ${props => props.active ? '700' : '600'};
  white-space: nowrap;
  flex-shrink: 1;
  text-align: center;
  min-width: 0;
`;

const StepSeparator = styled.div`
  width: 24px;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
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
  preSelectedAsset?: Asset | null; // Pre-selected asset for sending
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onTransactionCreated,
  fromAddress,
  preSelectedAsset
}) => {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(''); // Keep for critical validation errors only
  const [success, setSuccess] = useState(''); // Keep for success messages
  const [currentStep, setCurrentStep] = useState<'form' | 'signing' | 'proposing'>('form');
  const [showEIP712Modal, setShowEIP712Modal] = useState(false);
  const [connectionState, setConnectionState] = useState<WalletConnectionState>({ isConnected: false });
  const [pendingTransaction, setPendingTransaction] = useState<{
    data: SafeTransactionData;
    domain: SafeDomain;
    txHash: string;
  } | null>(null);
  // const [retryCount, setRetryCount] = useState(0); // Reserved for future retry functionality

  // Initialize toast system
  const toast = useToast();

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
      toast.success('Wallet Connected', {
        message: 'Signer wallet connected successfully'
      });
    } catch (error: any) {
      const errorDetails = ErrorHandler.classifyError(error);
      // Only show toast for wallet connection errors, not duplicate in modal
      toast.walletError(errorDetails.userMessage, handleConnectSigner);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation - show these in modal only (immediate feedback)
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
      // Step 1: Create domain type EIP-712 transaction with retry logic
      const result = await errorRecoveryService.retry(async () => {
        // Handle ERC-20 token transfers vs ETH transfers
        if (preSelectedAsset && preSelectedAsset.type === 'erc20' && preSelectedAsset.contractAddress) {
          // ERC-20 token transfer
          const transferInterface = new ethers.utils.Interface([
            'function transfer(address to, uint256 amount) returns (bool)'
          ]);

          const decimals = preSelectedAsset.decimals || 18;
          const parsedAmount = ethers.utils.parseUnits(amount, decimals);
          const data = transferInterface.encodeFunctionData('transfer', [toAddress, parsedAmount]);

          return await safeWalletService.createEIP712Transaction({
            to: preSelectedAsset.contractAddress,
            value: '0',
            data,
            operation: 0
          });
        } else {
          // ETH transfer
          return await safeWalletService.createEIP712Transaction({
            to: toAddress,
            value: ethers.utils.parseEther(amount).toString(),
            data: '0x',
            operation: 0
          });
        }
      }, {
        maxAttempts: 3,
        retryCondition: (error) => {
          const errorDetails = ErrorHandler.classifyError(error);
          return ErrorHandler.shouldAutoRetry(errorDetails);
        }
      });

      // Set up for Step 2: Request user to sign
      setPendingTransaction({
        data: result.safeTransactionData,
        domain: result.domain,
        txHash: result.txHash
      });
      setCurrentStep('signing');
      setShowEIP712Modal(true);

      toast.info('Transaction Created', {
        message: 'Please sign the transaction in your wallet'
      });

    } catch (error: any) {
      const errorDetails = ErrorHandler.classifyError(error);
      // Show error in modal for critical validation issues, toast for others
      if (errorDetails.category === 'validation') {
        setError(errorDetails.userMessage);
      }
      setIsLoading(false);

      toast.transactionError(errorDetails.userMessage, errorDetails.message);
    }
  };

  const handleEIP712Sign = async () => {
    if (!pendingTransaction) return;

    setCurrentStep('signing');

    try {
      // Step 2: Request user to sign with retry logic
      const signature = await errorRecoveryService.retry(async () => {
        return await safeWalletService.signEIP712Transaction(
          pendingTransaction.data,
          pendingTransaction.domain
        );
      }, {
        maxAttempts: 2, // Fewer retries for user actions
        retryCondition: (error) => {
          const errorDetails = ErrorHandler.classifyError(error);
          // Don't retry user rejections
          return errorDetails.code !== 'USER_REJECTED' && ErrorHandler.shouldAutoRetry(errorDetails);
        }
      });

      setShowEIP712Modal(false);
      setCurrentStep('proposing');

      toast.info('Transaction Signed', {
        message: 'Submitting to Safe TX Pool...'
      });

      // Step 3: Use signed transaction data to propose transaction on SafeTxPool contract
      await errorRecoveryService.retry(async () => {
        return await safeWalletService.proposeSignedTransaction(
          pendingTransaction.data,
          pendingTransaction.txHash,
          signature
        );
      }, {
        maxAttempts: 3,
        retryCondition: (error) => {
          const errorDetails = ErrorHandler.classifyError(error);
          return ErrorHandler.shouldAutoRetry(errorDetails);
        }
      });

      setSuccess(`Transaction flow completed! Hash: ${pendingTransaction.txHash}`);

      toast.transactionSuccess(pendingTransaction.txHash, 'Transaction submitted successfully');

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
        // setRetryCount(0); // Reset retry count when transaction completes
        onClose();
      }, 2000);

    } catch (error: any) {
      const errorDetails = ErrorHandler.classifyError(error);
      // Only show in modal for critical errors, use toast for others
      if (errorDetails.severity === 'critical' || errorDetails.category === 'validation') {
        setError(errorDetails.userMessage);
      }
      setShowEIP712Modal(false);
      setCurrentStep('form');

      // Show appropriate toast based on error type
      if (errorDetails.code === 'USER_REJECTED') {
        toast.warning('Transaction Cancelled', {
          message: 'Transaction was cancelled by user'
        });
      } else {
        toast.transactionError(errorDetails.userMessage, errorDetails.message);
      }
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
            Create EIP-712
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
            Propose to Pool
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

          {preSelectedAsset && (
            <FormGroup>
              <Label>Sending Asset</Label>
              <div style={{
                padding: '12px 16px',
                background: '#334155',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #007bff, #0056b3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {preSelectedAsset.symbol.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: '600' }}>{preSelectedAsset.name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    Balance: {preSelectedAsset.balance} {preSelectedAsset.symbol}
                  </div>
                </div>
              </div>
            </FormGroup>
          )}

          <FormGroup>
            <Label>Amount ({preSelectedAsset?.symbol || 'ETH'})</Label>
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
                <DetailValue>{amount} {preSelectedAsset?.symbol || 'ETH'}</DetailValue>
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
