import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { ProposeTxData, SignTxData, SafeTxPoolDomain } from '../../../utils/eip712';

interface SafeTxPoolEIP712ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: () => Promise<void>;
  operationType: 'propose' | 'sign';
  data: ProposeTxData | SignTxData;
  domain: SafeTxPoolDomain;
}

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: ${slideIn} 0.3s ease-out;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
`;

const Icon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: white;
  font-size: 18px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
`;

const Subtitle = styled.p`
  margin: 8px 0 0 0;
  font-size: 14px;
  color: #718096;
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
`;

const DetailLabel = styled.span`
  font-weight: 500;
  color: #4a5568;
  min-width: 100px;
`;

const DetailValue = styled.span`
  color: #2d3748;
  word-break: break-all;
  text-align: right;
  flex: 1;
  margin-left: 12px;
`;

const AddressValue = styled(DetailValue)`
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
`;

const DataValue = styled(DetailValue)`
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const Button = styled.button<{ variant: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  ${props => props.variant === 'primary' ? `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    
    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  ` : `
    background: #f7fafc;
    color: #4a5568;
    border: 1px solid #e2e8f0;
    
    &:hover:not(:disabled) {
      background: #edf2f7;
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const WarningBox = styled.div`
  background: #fef5e7;
  border: 1px solid #f6ad55;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
`;

const WarningText = styled.p`
  margin: 0;
  font-size: 14px;
  color: #c05621;
`;

const SafeTxPoolEIP712Modal: React.FC<SafeTxPoolEIP712ModalProps> = ({
  isOpen,
  onClose,
  onSign,
  operationType,
  data,
  domain
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSign = async () => {
    console.log('🔐 SafeTxPool modal: Sign button clicked', { operationType, data, domain });
    setIsLoading(true);
    try {
      console.log('🔐 SafeTxPool modal: Calling onSign function...');
      await onSign();
      console.log('✅ SafeTxPool modal: onSign completed successfully');
      onClose();
    } catch (error) {
      console.error('❌ SafeTxPool modal: Error signing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDeadline = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const isProposeTx = operationType === 'propose';
  const proposeTxData = isProposeTx ? data as ProposeTxData : null;
  const signTxData = !isProposeTx ? data as SignTxData : null;

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <Header>
          <Icon>
            {isProposeTx ? '📝' : '✍️'}
          </Icon>
          <div>
            <Title>
              {isProposeTx ? 'Propose Transaction' : 'Sign Transaction'}
            </Title>
            <Subtitle>
              Review the details and sign with your wallet
            </Subtitle>
          </div>
        </Header>

        <WarningBox>
          <WarningText>
            🔒 This is an EIP-712 signature request. Your wallet will show structured, readable data instead of hex.
          </WarningText>
        </WarningBox>

        <Section>
          <SectionTitle>SafeTxPool Contract</SectionTitle>
          <DetailRow>
            <DetailLabel>Contract:</DetailLabel>
            <AddressValue>{formatAddress(domain.verifyingContract)}</AddressValue>
          </DetailRow>
          <DetailRow>
            <DetailLabel>Chain ID:</DetailLabel>
            <DetailValue>{domain.chainId}</DetailValue>
          </DetailRow>
          <DetailRow>
            <DetailLabel>Version:</DetailLabel>
            <DetailValue>{domain.version}</DetailValue>
          </DetailRow>
        </Section>

        <Section>
          <SectionTitle>Operation Details</SectionTitle>
          
          {isProposeTx && proposeTxData && (
            <>
              <DetailRow>
                <DetailLabel>Safe:</DetailLabel>
                <AddressValue>{formatAddress(proposeTxData.safe)}</AddressValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>To:</DetailLabel>
                <AddressValue>{formatAddress(proposeTxData.to)}</AddressValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Value:</DetailLabel>
                <DetailValue>{proposeTxData.value} ETH</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Operation:</DetailLabel>
                <DetailValue>{proposeTxData.operation === 0 ? 'Call' : 'DelegateCall'}</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Nonce:</DetailLabel>
                <DetailValue>{proposeTxData.nonce}</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Proposer:</DetailLabel>
                <AddressValue>{formatAddress(proposeTxData.proposer)}</AddressValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Deadline:</DetailLabel>
                <DetailValue>{formatDeadline(proposeTxData.deadline)}</DetailValue>
              </DetailRow>
              {proposeTxData.data !== '0x' && (
                <DetailRow>
                  <DetailLabel>Data:</DetailLabel>
                  <DataValue>{proposeTxData.data.slice(0, 20)}...</DataValue>
                </DetailRow>
              )}
            </>
          )}

          {!isProposeTx && signTxData && (
            <>
              <DetailRow>
                <DetailLabel>Transaction Hash:</DetailLabel>
                <DataValue>{signTxData.txHash}</DataValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Signer:</DetailLabel>
                <AddressValue>{formatAddress(signTxData.signer)}</AddressValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Deadline:</DetailLabel>
                <DetailValue>{formatDeadline(signTxData.deadline)}</DetailValue>
              </DetailRow>
            </>
          )}
        </Section>

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
            {isLoading ? 'Signing...' : `Sign ${isProposeTx ? 'Proposal' : 'Transaction'}`}
          </Button>
        </ButtonGroup>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default SafeTxPoolEIP712Modal;
