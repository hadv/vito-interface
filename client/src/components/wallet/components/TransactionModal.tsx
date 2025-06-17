import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { Button, Input } from '@components/ui';
import { isValidEthereumAddress } from '../../../utils/ens';
import EIP712SigningModal from './EIP712SigningModal';
import SafeTxPoolEIP712Modal from './SafeTxPoolEIP712Modal';
import {
  SafeTransactionData,
  SafeDomain,
  ProposeTxData,
  SignTxData,
  SafeTxPoolDomain,
  createSafeTxPoolDomain
} from '../../../utils/eip712';
import { safeWalletService } from '../../../services/SafeWalletService';
import { walletConnectionService, WalletConnectionState } from '../../../services/WalletConnectionService';
import { isSafeTxPoolConfigured } from '../../../contracts/abis';
import { useToast } from '../../../hooks/useToast';
import { ErrorHandler } from '../../../utils/errorHandling';
import { errorRecoveryService } from '../../../services/ErrorRecoveryService';

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
  const [error, setError] = useState(''); // Keep for critical validation errors only
  const [success, setSuccess] = useState(''); // Keep for success messages
  const [currentStep, setCurrentStep] = useState<'form' | 'signing' | 'proposing' | 'safetxpool-propose' | 'safetxpool-sign'>('form');
  const [showEIP712Modal, setShowEIP712Modal] = useState(false);
  const [showSafeTxPoolModal, setShowSafeTxPoolModal] = useState(false);
  const [safeTxPoolOperation, setSafeTxPoolOperation] = useState<'propose' | 'sign'>('propose');
  const [connectionState, setConnectionState] = useState<WalletConnectionState>({ isConnected: false });
  const [pendingTransaction, setPendingTransaction] = useState<{
    data: SafeTransactionData;
    domain: SafeDomain;
    txHash: string;
  } | null>(null);
  const [safeTxPoolData, setSafeTxPoolData] = useState<{
    proposeTxData?: ProposeTxData;
    signTxData?: SignTxData;
    domain?: SafeTxPoolDomain;
    safeTransactionSignature?: string;
  }>({});
  const [useEIP712Mode, setUseEIP712Mode] = useState(true); // Default to EIP-712 mode
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
        return await safeWalletService.createEIP712Transaction({
          to: toAddress,
          value: ethers.utils.parseEther(amount).toString(),
          data: '0x',
          operation: 0
        });
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

      if (useEIP712Mode) {
        // EIP-712 Mode: Show structured data in SafeTxPool modals
        setCurrentStep('safetxpool-propose');

        toast.info('Transaction Signed', {
          message: 'Now preparing SafeTxPool proposal...'
        });

        // Step 3a: Prepare SafeTxPool proposal with EIP-712
        const network = await safeWalletService.provider!.getNetwork();
        const safeTxPoolAddress = safeWalletService.safeTxPoolService!.contract!.address;
        const proposerAddress = await safeWalletService.signer!.getAddress();

        const safeTxPoolDomain = createSafeTxPoolDomain(network.chainId, safeTxPoolAddress);
        const proposeTxData: ProposeTxData = {
          safe: safeWalletService.config!.safeAddress,
          to: pendingTransaction.data.to,
          value: pendingTransaction.data.value,
          data: pendingTransaction.data.data,
          operation: pendingTransaction.data.operation,
          nonce: pendingTransaction.data.nonce,
          proposer: proposerAddress,
          deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        };

        setSafeTxPoolData({
          proposeTxData,
          domain: safeTxPoolDomain,
          safeTransactionSignature: signature
        });
        setSafeTxPoolOperation('propose');
        setShowSafeTxPoolModal(true);
      } else {
        // Legacy Mode: Use direct contract calls (shows hex data)
        setCurrentStep('proposing');

        toast.info('Transaction Signed', {
          message: 'Submitting to Safe TX Pool...'
        });

        // Step 3: Use signed transaction data to propose transaction on SafeTxPool contract (legacy)
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
          setSafeTxPoolData({});
          onClose();
        }, 2000);
      }

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

  const handleSafeTxPoolSign = async () => {
    if (!pendingTransaction || !safeTxPoolData.proposeTxData) return;

    try {
      if (safeTxPoolOperation === 'propose') {
        // Step 3b: Sign and submit SafeTxPool proposal
        setCurrentStep('safetxpool-propose');

        await errorRecoveryService.retry(async () => {
          return await safeWalletService.safeTxPoolService!.proposeTxWithEIP712(
            safeTxPoolData.proposeTxData!,
            (await safeWalletService.provider!.getNetwork()).chainId
          );
        }, {
          maxAttempts: 3,
          retryCondition: (error) => {
            const errorDetails = ErrorHandler.classifyError(error);
            return ErrorHandler.shouldAutoRetry(errorDetails);
          }
        });

        setShowSafeTxPoolModal(false);
        setCurrentStep('safetxpool-sign');

        toast.info('Proposal Submitted', {
          message: 'Now signing the transaction...'
        });

        // Step 4: Prepare SafeTxPool signing with EIP-712
        const proposerAddress = await safeWalletService.signer!.getAddress();
        const signTxData: SignTxData = {
          txHash: pendingTransaction.txHash,
          signer: proposerAddress,
          deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        };

        setSafeTxPoolData({
          ...safeTxPoolData,
          signTxData
        });
        setSafeTxPoolOperation('sign');
        setShowSafeTxPoolModal(true);

      } else if (safeTxPoolOperation === 'sign') {
        // Step 4b: Sign and submit SafeTxPool signature
        setCurrentStep('safetxpool-sign');

        // Use the Safe transaction signature we stored earlier
        if (!safeTxPoolData.safeTransactionSignature) {
          throw new Error('Safe transaction signature not found');
        }

        await errorRecoveryService.retry(async () => {
          return await safeWalletService.safeTxPoolService!.signTxWithEIP712(
            safeTxPoolData.signTxData!,
            safeTxPoolData.safeTransactionSignature!
          );
        }, {
          maxAttempts: 3,
          retryCondition: (error) => {
            const errorDetails = ErrorHandler.classifyError(error);
            return ErrorHandler.shouldAutoRetry(errorDetails);
          }
        });

        setShowSafeTxPoolModal(false);
        setSuccess(`Transaction flow completed! Hash: ${pendingTransaction.txHash}`);

        toast.transactionSuccess(pendingTransaction.txHash, 'Transaction submitted successfully');

        if (onTransactionCreated) {
          onTransactionCreated({
            ...pendingTransaction.data,
            txHash: pendingTransaction.txHash,
            signature: safeTxPoolData.safeTransactionSignature!
          });
        }

        // Reset form
        setTimeout(() => {
          setToAddress('');
          setAmount('');
          setSuccess('');
          setCurrentStep('form');
          setPendingTransaction(null);
          setSafeTxPoolData({});
          onClose();
        }, 2000);
      }

    } catch (error: any) {
      const errorDetails = ErrorHandler.classifyError(error);
      setError(errorDetails.userMessage);
      setShowSafeTxPoolModal(false);
      setCurrentStep('form');

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

          <StepBadge active={currentStep === 'signing'} completed={useEIP712Mode ? ['safetxpool-propose', 'safetxpool-sign'].includes(currentStep) : currentStep === 'proposing'}>
            2
          </StepBadge>
          <StepText active={currentStep === 'signing'} completed={useEIP712Mode ? ['safetxpool-propose', 'safetxpool-sign'].includes(currentStep) : currentStep === 'proposing'}>
            Sign Transaction
          </StepText>

          <StepSeparator />

          {useEIP712Mode ? (
            <>
              <StepBadge active={currentStep === 'safetxpool-propose'} completed={currentStep === 'safetxpool-sign'}>
                3
              </StepBadge>
              <StepText active={currentStep === 'safetxpool-propose'} completed={currentStep === 'safetxpool-sign'}>
                Propose to Pool (EIP-712)
              </StepText>

              <StepSeparator />

              <StepBadge active={currentStep === 'safetxpool-sign'} completed={false}>
                4
              </StepBadge>
              <StepText active={currentStep === 'safetxpool-sign'} completed={false}>
                Sign Pool Entry (EIP-712)
              </StepText>
            </>
          ) : (
            <>
              <StepBadge active={currentStep === 'proposing'} completed={false}>
                3
              </StepBadge>
              <StepText active={currentStep === 'proposing'} completed={false}>
                Propose to Pool (Legacy)
              </StepText>
            </>
          )}
        </StepIndicator>

        {/* EIP-712 Mode Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          padding: '12px',
          background: useEIP712Mode ? '#f0fff4' : '#fef5e7',
          borderRadius: '8px',
          border: `1px solid ${useEIP712Mode ? '#68d391' : '#f6ad55'}`
        }}>
          <label style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#4a5568',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <input
              type="checkbox"
              checked={useEIP712Mode}
              onChange={(e) => setUseEIP712Mode(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: '#667eea'
              }}
            />
            {useEIP712Mode ? '🔒 EIP-712 Mode (Structured Data)' : '⚠️ Legacy Mode (Hex Data)'}
          </label>
          <p style={{
            margin: '0',
            fontSize: '12px',
            color: '#718096',
            flex: '1'
          }}>
            {useEIP712Mode
              ? 'Shows readable transaction details in your wallet'
              : 'Shows raw hex data (legacy mode)'
            }
          </p>
        </div>

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

        {/* SafeTxPool EIP-712 Modal */}
        {safeTxPoolData.domain && (safeTxPoolData.proposeTxData || safeTxPoolData.signTxData) && (
          <SafeTxPoolEIP712Modal
            isOpen={showSafeTxPoolModal}
            onClose={() => {
              setShowSafeTxPoolModal(false);
              setSafeTxPoolData({});
              setCurrentStep('form');
              setIsLoading(false);
            }}
            onSign={handleSafeTxPoolSign}
            operationType={safeTxPoolOperation}
            data={safeTxPoolOperation === 'propose' ? safeTxPoolData.proposeTxData! : safeTxPoolData.signTxData!}
            domain={safeTxPoolData.domain}
          />
        )}
      </ModalContainer>
    </ModalOverlay>
  );
};

export default TransactionModal;
