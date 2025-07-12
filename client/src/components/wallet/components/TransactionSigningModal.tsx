/**
 * Transaction Signing Modal
 * Dedicated interface for signing pending transactions
 * This is the second step in the separated transaction flow
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import Button from '../../ui/Button';
import { useToast } from '../../../hooks/useToast';
import { SafeWalletService } from '../../../services/SafeWalletService';
import { SafeTxPoolTransaction } from '../../../services/SafeTxPoolService';
import { walletConnectionService } from '../../../services/WalletConnectionService';
import { ErrorHandler } from '../../../utils/errorHandling';
import { formatWalletAddress } from '../../../utils/wallet';
import AddressDisplay from './AddressDisplay';

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
  backdrop-filter: blur(8px);
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 20px;
  width: 95%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
`;

const ModalTitle = styled.h2`
  color: #f8fafc;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    color: #f8fafc;
    background-color: rgba(148, 163, 184, 0.1);
  }
`;

const ModalContent = styled.div`
  padding: 32px;
`;

const SigningBadge = styled.div`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  margin-bottom: 24px;
`;

const InfoSection = styled.div`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
`;

const InfoTitle = styled.h3`
  color: #10b981;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const InfoText = styled.p`
  color: #cbd5e1;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
`;

const TransactionDetails = styled.div`
  background: rgba(148, 163, 184, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);

  &:last-child {
    border-bottom: none;
  }
`;

const DetailLabel = styled.span`
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 500;
`;

const DetailValue = styled.span`
  color: #f8fafc;
  font-size: 0.875rem;
  font-family: 'Monaco', 'Menlo', monospace;
`;

const SignatureProgress = styled.div`
  background: rgba(148, 163, 184, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
`;

const ProgressBar = styled.div`
  background: rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  height: 8px;
  margin: 12px 0;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ progress: number }>`
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  height: 100%;
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  color: #cbd5e1;
  font-size: 0.875rem;
  text-align: center;
  margin-top: 8px;
`;

const SignersList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const SignerBadge = styled.div`
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 0.875rem;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
`;

const WarningBox = styled.div`
  background: #fbbf24;
  color: #92400e;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 0.875rem;
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

interface TransactionSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionSigned: (signature: string) => void;
  transaction: SafeTxPoolTransaction;
  safeAddress: string;
  network: string;
}

const TransactionSigningModal: React.FC<TransactionSigningModalProps> = ({
  isOpen,
  onClose,
  onTransactionSigned,
  transaction,
  safeAddress,
  network
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(null);
  const [hasUserSigned, setHasUserSigned] = useState(false);
  const [canUserSign, setCanUserSign] = useState(false);
  const [safeInfo, setSafeInfo] = useState<{ threshold: number; owners: string[] } | null>(null);
  
  const toast = useToast();

  const initializeSigningModal = useCallback(async () => {
    try {
      const signer = walletConnectionService.getSigner();
      if (!signer) return;

      // Get current user address
      const userAddress = await signer.getAddress();
      setCurrentUserAddress(userAddress);

      // Check if user has already signed
      const userHasSigned = transaction.signatures.some(
        sig => sig.signer.toLowerCase() === userAddress.toLowerCase()
      );
      setHasUserSigned(userHasSigned);

      // For now, assume user can sign if they haven't signed yet
      // In production, you'd check if user is a Safe owner
      setCanUserSign(!userHasSigned);

      // Mock safe info - in production, fetch from Safe contract
      setSafeInfo({
        threshold: 2, // This should be fetched from the Safe contract
        owners: [userAddress] // This should be fetched from the Safe contract
      });

    } catch (error) {
      console.error('Error initializing signing modal:', error);
      setError('Failed to initialize signing interface');
    }
  }, [transaction]);

  // Initialize component state
  useEffect(() => {
    if (isOpen && transaction) {
      initializeSigningModal();
    }
  }, [isOpen, transaction, initializeSigningModal]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSign = async () => {
    const signer = walletConnectionService.getSigner();
    if (!signer || !currentUserAddress) {
      setError('Wallet not connected');
      return;
    }

    if (hasUserSigned) {
      setError('You have already signed this transaction');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Initialize SafeWalletService
      const safeWalletService = new SafeWalletService();
      await safeWalletService.initialize({
        safeAddress,
        network
      }, signer);

      // Create EIP-712 transaction data from the pending transaction
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

      // Create EIP-712 domain
      const provider = walletConnectionService.getProvider();
      const domain = {
        chainId: provider ? (await provider.getNetwork()).chainId : 1,
        verifyingContract: safeAddress
      };

      // Sign the transaction
      const signature = await safeWalletService.signEIP712Transaction(safeTransactionData, domain);

      // Submit signature to SafeTxPool
      await safeWalletService.proposeSignedTransaction(safeTransactionData, transaction.txHash, signature);

      toast.success('Transaction Signed', {
        message: 'Your signature has been added to the transaction'
      });

      if (onTransactionSigned) {
        onTransactionSigned(signature);
      }

      onClose();

    } catch (error: any) {
      console.error('Error signing transaction:', error);
      const errorDetails = ErrorHandler.classifyError(error);
      setError(errorDetails.message);
      
      toast.error('Signing Failed', {
        message: errorDetails.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !transaction) return null;

  const progress = safeInfo ? (transaction.signatures.length / safeInfo.threshold) * 100 : 0;
  const isFullySigned = safeInfo ? transaction.signatures.length >= safeInfo.threshold : false;

  const formatValue = (value: string) => {
    if (value === '0') return '0 ETH';
    try {
      const ethValue = parseFloat(value) / 1e18;
      return `${ethValue.toFixed(6)} ETH`;
    } catch {
      return value;
    }
  };

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>
            🔐 Sign Transaction
          </ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <ModalContent>
          <SigningBadge>
            Step 2: Sign Pending Transaction
          </SigningBadge>

          <InfoSection>
            <InfoTitle>EIP-712 Transaction Signing</InfoTitle>
            <InfoText>
              Sign this pending transaction using EIP-712 structured data signing. 
              Your wallet will show you the exact transaction details before signing.
            </InfoText>
          </InfoSection>

          <TransactionDetails>
            <DetailRow>
              <DetailLabel>Transaction Hash:</DetailLabel>
              <DetailValue>{formatWalletAddress(transaction.txHash)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>To:</DetailLabel>
              <DetailValue>
                <AddressDisplay address={transaction.to} />
              </DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Value:</DetailLabel>
              <DetailValue>{formatValue(transaction.value)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Nonce:</DetailLabel>
              <DetailValue>{transaction.nonce}</DetailValue>
            </DetailRow>
            {transaction.data && transaction.data !== '0x' && (
              <DetailRow>
                <DetailLabel>Data:</DetailLabel>
                <DetailValue>
                  {transaction.data}
                </DetailValue>
              </DetailRow>
            )}
          </TransactionDetails>

          {safeInfo && (
            <SignatureProgress>
              <InfoTitle>Signature Progress</InfoTitle>
              <ProgressBar>
                <ProgressFill progress={progress} />
              </ProgressBar>
              <ProgressText>
                {transaction.signatures.length} of {safeInfo.threshold} required signatures
              </ProgressText>
              
              {transaction.signatures.length > 0 && (
                <>
                  <InfoTitle style={{ marginTop: '16px', fontSize: '0.875rem' }}>Signed by:</InfoTitle>
                  <SignersList>
                    {transaction.signatures.map((sig, index) => (
                      <SignerBadge key={index}>
                        {formatWalletAddress(sig.signer)}
                      </SignerBadge>
                    ))}
                  </SignersList>
                </>
              )}
            </SignatureProgress>
          )}

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

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSign}
              disabled={isLoading || hasUserSigned || !canUserSign}
              type="button"
            >
              {isLoading && <LoadingSpinner />}
              {isLoading ? 'Signing...' : hasUserSigned ? 'Already Signed' : 'Sign Transaction'}
            </Button>
          </div>
        </ModalContent>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default TransactionSigningModal;
