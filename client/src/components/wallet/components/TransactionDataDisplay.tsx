import React, { useState } from 'react';
import styled from 'styled-components';
import { DecodedTransactionData } from '../../../utils/transactionDecoder';
import ParameterDisplay from './ParameterDisplay';

const Container = styled.div`
  margin-top: 8px;
`;

const FunctionDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const FunctionLabel = styled.span`
  font-size: 12px;
  color: #888;
`;

const FunctionValue = styled.span<{ type: string }>`
  font-size: 12px;
  font-weight: 600;
  color: ${props => 
    props.type === 'ERC20_TRANSFER' ? '#10b981' :
    props.type === 'CONTRACT_CALL' ? '#3b82f6' :
    '#f59e0b'
  };
`;

const RawDataContainer = styled.div`
  margin-top: 8px;
`;

const RawDataLabel = styled.div`
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: #4ECDC4;
  font-size: 11px;
  cursor: pointer;
  text-decoration: underline;
  
  &:hover {
    color: #5fd3cc;
  }
`;

const RawDataBox = styled.div<{ isExpanded: boolean }>`
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  color: #888;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  word-break: break-all;
  max-height: ${props => props.isExpanded ? '200px' : '60px'};
  overflow-y: auto;
  
  &:hover {
    background: #222;
    border-color: #4ECDC4;
  }
`;

const CopyIndicator = styled.span`
  font-size: 10px;
  color: #4ECDC4;
  margin-left: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
  
  &.show {
    opacity: 1;
  }
`;

export interface TransactionDataDisplayProps {
  data: string;
  decodedTransaction?: DecodedTransactionData | null;
  compact?: boolean;
  showCopyButton?: boolean;
  network?: string;
}

const TransactionDataDisplay: React.FC<TransactionDataDisplayProps> = ({
  data,
  decodedTransaction,
  compact = false,
  showCopyButton = true,
  network = 'ethereum'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  if (!data || data === '0x') {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy transaction data:', error);
    }
  };

  const getFunctionDisplay = () => {
    if (!decodedTransaction) return 'Contract Call';
    
    switch (decodedTransaction.type) {
      case 'ERC20_TRANSFER':
        return 'ERC-20 Transfer Function';
      case 'CONTRACT_CALL':
        return 'Contract Interaction';
      case 'ETH_TRANSFER':
        return 'ETH Transfer';
      default:
        return 'Contract Call';
    }
  };

  const getDisplayData = () => {
    if (isExpanded) return data;
    if (compact) return data.length > 50 ? `${data.slice(0, 50)}...` : data;
    return data.length > 100 ? `${data.slice(0, 100)}...` : data;
  };

  return (
    <Container>
      {/* Function Type Display */}
      <FunctionDisplay>
        <FunctionLabel>Function:</FunctionLabel>
        <FunctionValue type={decodedTransaction?.type || 'UNKNOWN'}>
          {decodedTransaction?.description || getFunctionDisplay()}
        </FunctionValue>
      </FunctionDisplay>

      {/* Parameters Display */}
      {decodedTransaction?.details?.decodedInputs && decodedTransaction.details.decodedInputs.length > 0 && (
        <ParameterDisplay
          parameters={decodedTransaction.details.decodedInputs}
          network={network}
          compact={compact}
        />
      )}

      {/* Raw Data Display */}
      <RawDataContainer>
        <RawDataLabel>
          <span>Raw Transaction Data:</span>
          {data.length > (compact ? 50 : 100) && (
            <ToggleButton onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? 'Show Less' : 'Show Full'}
            </ToggleButton>
          )}
          {showCopyButton && (
            <ToggleButton onClick={handleCopy}>
              Copy
            </ToggleButton>
          )}
          <CopyIndicator className={showCopied ? 'show' : ''}>
            Copied!
          </CopyIndicator>
        </RawDataLabel>
        
        <RawDataBox 
          isExpanded={isExpanded}
          onClick={handleCopy}
          title="Click to copy raw transaction data"
        >
          {getDisplayData()}
        </RawDataBox>
      </RawDataContainer>
    </Container>
  );
};

export default TransactionDataDisplay;
