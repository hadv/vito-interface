import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { SafeTxPoolTransaction, SafeTxPoolService } from '../../../services/SafeTxPoolService';
import { SafeWalletService } from '../../../services/SafeWalletService';
import { WalletConnectionService } from '../../../services/WalletConnectionService';
import { formatWalletAddress } from '../../../utils';
import { useToast } from '../../../hooks/useToast';

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  border: 1px solid #374151;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #374151;
`;

const ModalTitle = styled.h2`
  color: #f9fafb;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    color: #f9fafb;
    background-color: #374151;
  }
`;

const ModalContent = styled.div`
  padding: 24px;
`;

const TransactionDetails = styled.div`
  background: #374151;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  
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
  font-family: 'Monaco', 'Menlo', monospace;
`;

const SignersSection = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  color: #f9fafb;
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 12px;
`;

const SignersList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const SignerBadge = styled.span`
  background: #10b981;
  color: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const ProgressBar = styled.div`
  background: #374151;
  border-radius: 8px;
  height: 8px;
  margin-bottom: 8px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ progress: number }>`
  background: linear-gradient(90deg, #10b981, #059669);
  height: 100%;
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  color: #9ca3af;
  font-size: 0.875rem;
  text-align: center;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  
  ${props => props.variant === 'primary' ? `
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #2563eb, #1e40af);
      transform: translateY(-1px);
    }
    
    &:disabled {
      background: #374151;
      color: #9ca3af;
      cursor: not-allowed;
    }
  ` : `
    background: #374151;
    color: #d1d5db;
    
    &:hover {
      background: #4b5563;
    }
  `}
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #374151;
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const WarningBox = styled.div`
  background: #fbbf24;
  color: #92400e;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 0.875rem;
`;

interface PendingTransactionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  transaction: SafeTxPoolTransaction;
  safeAddress: string;
  network: string;
}

const PendingTransactionConfirmationModal: React.FC<PendingTransactionConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  safeAddress,
  network
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [safeInfo, setSafeInfo] = useState<{ threshold: number; owners: string[] } | null>(null);
  const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(null);
  const [hasUserSigned, setHasUserSigned] = useState(false);
  const [canUserSign, setCanUserSign] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      loadSafeInfo();
      getCurrentUserAddress();
    }
  }, [isOpen, safeAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update user permissions when safeInfo or currentUserAddress changes
  useEffect(() => {
    if (currentUserAddress && safeInfo) {
      const isOwner = safeInfo.owners.includes(currentUserAddress.toLowerCase());
      const alreadySigned = transaction.signatures.some(sig =>
        sig.signer.toLowerCase() === currentUserAddress.toLowerCase()
      );

      setCanUserSign(isOwner && !alreadySigned);
      setHasUserSigned(alreadySigned);
    }
  }, [currentUserAddress, safeInfo, transaction.signatures]);

  // Listen for wallet connection changes while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const checkWalletConnection = () => {
      getCurrentUserAddress();
    };

    // Check wallet connection every 2 seconds while modal is open
    const interval = setInterval(checkWalletConnection, 2000);

    // Also listen for window focus (user might connect wallet in another tab)
    window.addEventListener('focus', checkWalletConnection);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkWalletConnection);
    };
  }, [isOpen]);

  const loadSafeInfo = async () => {
    try {
      const walletService = new SafeWalletService();
      await walletService.initialize({ safeAddress, network });
      const info = await walletService.getSafeInfo();
      setSafeInfo(info);
    } catch (error) {
      console.error('Error loading Safe info:', error);
    }
  };

  const getCurrentUserAddress = async () => {
    try {
      const walletConnection = new WalletConnectionService();
      const state = walletConnection.getState();
      const address = state.address;
      setCurrentUserAddress(address || null);
    } catch (error) {
      console.error('Error getting current user address:', error);
    }
  };

  const handleSign = async () => {
    if (!currentUserAddress || !canUserSign) return;

    setIsLoading(true);
    try {
      const walletService = new SafeWalletService();
      await walletService.initialize({ safeAddress, network });

      // Sign the transaction using the existing txHash and EIP-712 signature
      await walletService.signExistingTransaction({
        txHash: transaction.txHash,
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        operation: transaction.operation,
        nonce: transaction.nonce
      });

      toast.success('Transaction signed successfully!');
      await onConfirm();
    } catch (error) {
      console.error('Error signing transaction:', error);
      toast.error('Failed to sign transaction', {
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!currentUserAddress || !isFullySigned) return;

    setIsLoading(true);
    try {
      const walletService = new SafeWalletService();
      await walletService.initialize({ safeAddress, network });

      // Prepare Safe transaction data for execution
      const safeTransactionData = {
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        operation: transaction.operation,
        safeTxGas: '0',
        baseGas: '0',
        gasPrice: '0',
        gasToken: '0x0000000000000000000000000000000000000000',
        refundReceiver: '0x0000000000000000000000000000000000000000',
        nonce: transaction.nonce
      };

      // Execute the transaction with collected signatures
      const executionTx = await walletService.executeTransaction(
        safeTransactionData,
        transaction.signatures
      );

      // Wait for transaction confirmation
      await executionTx.wait();

      // Mark transaction as executed in SafeTxPool
      try {
        const safeTxPoolService = new SafeTxPoolService(network);
        await safeTxPoolService.markAsExecuted(transaction.txHash);
      } catch (markError) {
        console.warn('Failed to mark transaction as executed in SafeTxPool:', markError);
        // Don't fail the whole operation if marking fails
      }

      toast.success('Transaction executed successfully!', {
        message: `Transaction hash: ${executionTx.hash}`
      });

      await onConfirm();
    } catch (error) {
      console.error('Error executing transaction:', error);
      toast.error('Failed to execute transaction', {
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: string): string => {
    try {
      return parseFloat(ethers.utils.formatEther(amount)).toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  const progress = safeInfo ? (transaction.signatures.length / safeInfo.threshold) * 100 : 0;
  const isFullySigned = safeInfo ? transaction.signatures.length >= safeInfo.threshold : false;

  // Debug logging
  console.log('Modal Debug:', {
    isFullySigned,
    currentUserAddress,
    safeInfo,
    signatures: transaction.signatures.length,
    threshold: safeInfo?.threshold,
    canUserSign,
    hasUserSigned,
    showExecuteButton: isFullySigned && currentUserAddress,
    showSignButton: canUserSign && !isFullySigned
  });

  return (
    <ModalOverlay isOpen={isOpen} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>
            🔍 Review Transaction
          </ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <ModalContent>
          <TransactionDetails>
            <DetailRow>
              <DetailLabel>To:</DetailLabel>
              <DetailValue>{formatWalletAddress(transaction.to)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Amount:</DetailLabel>
              <DetailValue>{formatAmount(transaction.value)} ETH</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Nonce:</DetailLabel>
              <DetailValue>{transaction.nonce}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Transaction Hash:</DetailLabel>
              <DetailValue>{formatWalletAddress(transaction.txHash)}</DetailValue>
            </DetailRow>
            {transaction.data && transaction.data !== '0x' && (
              <DetailRow>
                <DetailLabel>Data:</DetailLabel>
                <DetailValue>{transaction.data.slice(0, 20)}...</DetailValue>
              </DetailRow>
            )}
          </TransactionDetails>

          <SignersSection>
            <SectionTitle>Signature Progress</SectionTitle>
            <ProgressBar>
              <ProgressFill progress={progress} />
            </ProgressBar>
            <ProgressText>
              {transaction.signatures.length} of {safeInfo?.threshold || '?'} required signatures
            </ProgressText>
            
            {transaction.signatures.length > 0 && (
              <>
                <SectionTitle style={{ marginTop: '16px' }}>Signed by:</SectionTitle>
                <SignersList>
                  {transaction.signatures.map((sig, index) => (
                    <SignerBadge key={index}>
                      {formatWalletAddress(sig.signer)}
                    </SignerBadge>
                  ))}
                </SignersList>
              </>
            )}
          </SignersSection>

          {isFullySigned && (
            <WarningBox>
              ✅ This transaction has enough signatures and can be executed!
            </WarningBox>
          )}

          {hasUserSigned && (
            <WarningBox>
              ✅ You have already signed this transaction.
            </WarningBox>
          )}

          {!currentUserAddress && (
            <WarningBox style={{ background: '#dc2626', color: '#fef2f2' }}>
              🔌 No wallet connected! Please connect your wallet to sign or execute transactions.
            </WarningBox>
          )}

          {!canUserSign && !hasUserSigned && currentUserAddress && (
            <WarningBox>
              ⚠️ You are not authorized to sign this transaction or you're not connected to the correct wallet.
            </WarningBox>
          )}

          {/* Debug info - remove this in production */}
          <WarningBox style={{ fontSize: '12px', background: '#374151', color: '#9ca3af' }}>
            🔍 Debug: isFullySigned={isFullySigned ? 'true' : 'false'},
            currentUserAddress={currentUserAddress ? 'connected' : 'none'},
            threshold={safeInfo?.threshold || 'loading'},
            signatures={transaction.signatures.length}
            <br />
            <button
              onClick={() => {
                getCurrentUserAddress();
                loadSafeInfo();
              }}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                background: '#4b5563',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              🔄 Refresh Wallet State
            </button>
          </WarningBox>

          <ButtonGroup>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {canUserSign && !isFullySigned && (
              <Button
                variant="primary"
                onClick={handleSign}
                disabled={isLoading}
              >
                {isLoading && <LoadingSpinner />}
                {isLoading ? 'Signing...' : 'Sign Transaction'}
              </Button>
            )}
            {/* Show execute button if transaction is fully signed OR if we have enough signatures (fallback) */}
            {(isFullySigned || (safeInfo && transaction.signatures.length >= safeInfo.threshold) || transaction.signatures.length >= 2) && (
              <Button
                variant="primary"
                onClick={handleExecute}
                disabled={isLoading || !currentUserAddress}
              >
                {isLoading && <LoadingSpinner />}
                {isLoading ? 'Executing...' : 'Execute Transaction'}
              </Button>
            )}
          </ButtonGroup>
        </ModalContent>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default PendingTransactionConfirmationModal;
