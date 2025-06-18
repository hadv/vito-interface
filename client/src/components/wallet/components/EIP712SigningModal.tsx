import React, { useState } from 'react';
import styled from 'styled-components';
import { Button } from '@components/ui';
import { SafeTransactionData } from '../../../utils/eip712';
import { DecodedTransactionData } from '../../../utils/transactionDecoder';
import AddressDisplay from './AddressDisplay';

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 20px;
  padding: 32px;
  width: 95%;
  max-width: 800px;
  max-height: 95vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
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
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SecurityIcon = styled.div`
  color: #10b981;
  font-size: 24px;
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

const SigningInfo = styled.div`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
`;

const InfoTitle = styled.h3`
  color: #10b981;
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 8px 0;
`;

const InfoText = styled.p`
  color: #f0f0f0;
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  line-height: 1.5;
`;

const TransactionDetails = styled.div`
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
`;

const SectionTitle = styled.h4`
  color: #f1f5f9;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    width: 4px;
    height: 20px;
    background: linear-gradient(135deg, #4ECDC4, #44A08D);
    border-radius: 2px;
  }
`;

const DetailRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 20px;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);

  &:last-child {
    margin-bottom: 0;
    border-bottom: none;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: left;
  }
`;

const DetailLabel = styled.span`
  color: #94a3b8;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DetailValue = styled.div`
  color: #f1f5f9;
  font-size: 15px;
  font-weight: 500;
  word-break: break-word;
  line-height: 1.5;
`;

const EIP712Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
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

interface EIP712SigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: () => Promise<void>;
  transactionData: SafeTransactionData;
  safeAddress: string;
  chainId: number;
  decodedTransaction?: DecodedTransactionData | null;
  network?: string;
}

const EIP712SigningModal: React.FC<EIP712SigningModalProps> = ({
  isOpen,
  onClose,
  onSign,
  transactionData,
  safeAddress,
  chainId,
  decodedTransaction,
  network = 'ethereum'
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSign = async () => {
    setIsLoading(true);
    try {
      await onSign();
      onClose();
    } catch (error) {
      console.error('Error signing transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
            <SecurityIcon>🔐</SecurityIcon>
            Sign Safe Transaction
          </ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <EIP712Badge>
          🛡️ EIP-712 Structured Data Signing
        </EIP712Badge>

        <SigningInfo>
          <InfoTitle>Secure Transaction Signing</InfoTitle>
          <InfoText>
            You're about to sign a Safe transaction using EIP-712 structured data signing. 
            This ensures the transaction data is clearly readable and secure. Your wallet 
            will show you the exact transaction details before signing.
          </InfoText>
        </SigningInfo>

        <TransactionDetails>
          <SectionTitle>Transaction Details</SectionTitle>

          {decodedTransaction && (
            <DetailRow>
              <DetailLabel>Transaction Type:</DetailLabel>
              <DetailValue style={{ color: '#10b981', fontWeight: 'bold' }}>
                {decodedTransaction.description}
              </DetailValue>
            </DetailRow>
          )}

          <DetailRow>
            <DetailLabel>Safe Address:</DetailLabel>
            <DetailValue>
              <AddressDisplay
                address={safeAddress}
                network={network}
                truncate={true}
                truncateLength={6}
              />
            </DetailValue>
          </DetailRow>

          <DetailRow>
            <DetailLabel>Chain ID:</DetailLabel>
            <DetailValue>{chainId}</DetailValue>
          </DetailRow>

          <DetailRow>
            <DetailLabel>To:</DetailLabel>
            <DetailValue>
              <AddressDisplay
                address={transactionData.to}
                network={network}
                truncate={true}
                truncateLength={6}
              />
            </DetailValue>
          </DetailRow>

          <DetailRow>
            <DetailLabel>Value:</DetailLabel>
            <DetailValue>{formatValue(transactionData.value)}</DetailValue>
          </DetailRow>

          {decodedTransaction?.details.token && (
            <>
              <DetailRow>
                <DetailLabel>Token:</DetailLabel>
                <DetailValue>
                  {decodedTransaction.details.token.name} ({decodedTransaction.details.token.symbol})
                </DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Token Address:</DetailLabel>
                <DetailValue>
                  <AddressDisplay
                    address={decodedTransaction.details.token.address}
                    network={network}
                    truncate={true}
                    truncateLength={6}
                  />
                </DetailValue>
              </DetailRow>
              {decodedTransaction.details.formattedAmount && (
                <DetailRow>
                  <DetailLabel>Token Amount:</DetailLabel>
                  <DetailValue style={{ color: '#10b981', fontWeight: 'bold' }}>
                    {decodedTransaction.details.formattedAmount}
                  </DetailValue>
                </DetailRow>
              )}
            </>
          )}

          <DetailRow>
            <DetailLabel>Operation:</DetailLabel>
            <DetailValue>{transactionData.operation === 0 ? 'Call' : 'DelegateCall'}</DetailValue>
          </DetailRow>

          <DetailRow>
            <DetailLabel>Nonce:</DetailLabel>
            <DetailValue>{transactionData.nonce}</DetailValue>
          </DetailRow>

          {transactionData.data !== '0x' && (
            <>
              <DetailRow>
                <DetailLabel>Function:</DetailLabel>
                <DetailValue>
                  {decodedTransaction?.type === 'ERC20_TRANSFER' ? (
                    <span style={{ color: '#10b981' }}>ERC-20 Transfer Function</span>
                  ) : decodedTransaction?.type === 'CONTRACT_CALL' ? (
                    <span style={{ color: '#3b82f6' }}>Contract Interaction</span>
                  ) : (
                    'Contract Call'
                  )}
                </DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Raw Transaction Data:</DetailLabel>
                <DetailValue>
                  <div style={{
                    fontSize: '12px',
                    fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
                    color: '#94a3b8',
                    wordBreak: 'break-all',
                    cursor: 'pointer',
                    padding: '16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    lineHeight: '1.6',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(transactionData.data);
                    console.log('Transaction data copied to clipboard');
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(76, 236, 196, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(76, 236, 196, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)';
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                  }}
                  title="Click to copy raw transaction data"
                  >
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      fontSize: '10px',
                      color: '#64748b',
                      background: 'rgba(0, 0, 0, 0.5)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      Click to copy
                    </div>
                    {transactionData.data}
                  </div>
                </DetailValue>
              </DetailRow>
            </>
          )}
        </TransactionDetails>

        <ButtonGroup>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSign}
            disabled={isLoading}
          >
            {isLoading && <LoadingSpinner />}
            {isLoading ? 'Signing...' : 'Sign Transaction'}
          </Button>
        </ButtonGroup>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default EIP712SigningModal;
