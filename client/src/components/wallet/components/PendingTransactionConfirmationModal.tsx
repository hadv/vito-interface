import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { SafeTxPoolTransaction } from '../../../services/SafeTxPoolService';
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

      if (address && safeInfo) {
        const isOwner = safeInfo.owners.includes(address.toLowerCase());
        const alreadySigned = transaction.signatures.some(sig =>
          sig.signer.toLowerCase() === address.toLowerCase()
        );

        setCanUserSign(isOwner && !alreadySigned);
        setHasUserSigned(alreadySigned);
      }
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

  const formatAmount = (amount: string): string => {
    try {
      return parseFloat(ethers.utils.formatEther(amount)).toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  const progress = safeInfo ? (transaction.signatures.length / safeInfo.threshold) * 100 : 0;
  const isFullySigned = safeInfo ? transaction.signatures.length >= safeInfo.threshold : false;

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

          {!canUserSign && !hasUserSigned && currentUserAddress && (
            <WarningBox>
              ⚠️ You are not authorized to sign this transaction or you're not connected to the correct wallet.
            </WarningBox>
          )}

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
          </ButtonGroup>
        </ModalContent>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default PendingTransactionConfirmationModal;
