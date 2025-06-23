import React, { useState } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import AddressDisplay from './AddressDisplay';

const ParametersContainer = styled.div`
  margin-top: 16px;
`;

const ParametersHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const ParametersTitle = styled.h4`
  color: #4ECDC4;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 0 8px rgba(78, 205, 196, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
`;

const ToggleButton = styled.button`
  background: none;
  border: 1px solid rgba(78, 205, 196, 0.3);
  color: #4ECDC4;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(78, 205, 196, 0.1);
    border-color: #4ECDC4;
  }
`;

const ParametersList = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(78, 205, 196, 0.2);
  border-radius: 8px;
  overflow: hidden;
`;

const ParameterRow = styled.div`
  display: grid;
  grid-template-columns: 120px 80px 1fr;
  gap: 16px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: left;
  }
`;

const ParameterName = styled.div`
  color: #4ECDC4;
  font-size: 13px;
  font-weight: 600;
  text-shadow: 0 0 6px rgba(78, 205, 196, 0.2);
`;

const ParameterType = styled.div`
  color: #94a3b8;
  font-size: 11px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: rgba(148, 163, 184, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  text-align: center;
`;

const ParameterValue = styled.div`
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  word-break: break-all;
  line-height: 1.4;
`;

const AddressValue = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BytesValue = styled.div`
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 100px;
  overflow-y: auto;
  word-break: break-all;
`;

const StringValue = styled.div`
  background: rgba(78, 205, 196, 0.1);
  padding: 6px 10px;
  border-radius: 4px;
  border-left: 3px solid #4ECDC4;
`;

const NumberValue = styled.div`
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: #fbbf24;
  font-weight: 600;
`;

const BooleanValue = styled.div<{ value: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => props.value ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
  color: ${props => props.value ? '#22c55e' : '#ef4444'};
`;

interface DecodedInput {
  name: string;
  type: string;
  value: any;
  rawValue?: any;
}

interface ParameterDisplayProps {
  parameters: DecodedInput[];
  network: string;
  compact?: boolean;
}

const ParameterDisplay: React.FC<ParameterDisplayProps> = ({
  parameters,
  network,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);

  if (!parameters || parameters.length === 0) {
    return null;
  }

  const formatParameterValue = (param: DecodedInput) => {
    const { type, value } = param;

    // Handle address types
    if (type === 'address') {
      return (
        <AddressValue>
          <AddressDisplay
            address={value}
            network={network}
            truncate={true}
            truncateLength={6}
            showCopy={true}
            showExplorer={true}
          />
        </AddressValue>
      );
    }

    // Handle boolean types
    if (type === 'bool') {
      return <BooleanValue value={value}>{value ? 'true' : 'false'}</BooleanValue>;
    }

    // Handle string types
    if (type === 'string') {
      return <StringValue>"{value}"</StringValue>;
    }

    // Handle bytes32 types (try to convert to string if possible)
    if (type === 'bytes32') {
      try {
        const stringValue = ethers.utils.parseBytes32String(value);
        if (stringValue) {
          return (
            <div>
              <StringValue>"{stringValue}"</StringValue>
              <BytesValue style={{ marginTop: '4px', fontSize: '10px' }}>
                Raw: {value}
              </BytesValue>
            </div>
          );
        }
      } catch (e) {
        // Fall through to bytes display
      }
      return <BytesValue>{value}</BytesValue>;
    }

    // Handle bytes types
    if (type.startsWith('bytes')) {
      return <BytesValue>{value}</BytesValue>;
    }

    // Handle number types (uint, int)
    if (type.startsWith('uint') || type.startsWith('int')) {
      try {
        const bigNumber = ethers.BigNumber.from(value);
        const formatted = bigNumber.toString();
        return <NumberValue>{formatted}</NumberValue>;
      } catch (e) {
        return <NumberValue>{value.toString()}</NumberValue>;
      }
    }

    // Handle array types
    if (type.includes('[]')) {
      return (
        <BytesValue>
          [{Array.isArray(value) ? value.map(v => v.toString()).join(', ') : value.toString()}]
        </BytesValue>
      );
    }

    // Default: display as string
    return <ParameterValue>{value.toString()}</ParameterValue>;
  };

  return (
    <ParametersContainer>
      <ParametersHeader>
        <ParametersTitle>Parameters ({parameters.length})</ParametersTitle>
        {compact && (
          <ToggleButton onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? 'Hide' : 'Show'}
          </ToggleButton>
        )}
      </ParametersHeader>

      {isExpanded && (
        <ParametersList>
          {parameters.map((param, index) => (
            <ParameterRow key={index}>
              <ParameterName>{param.name || `param${index}`}</ParameterName>
              <ParameterType>{param.type}</ParameterType>
              {formatParameterValue(param)}
            </ParameterRow>
          ))}
        </ParametersList>
      )}
    </ParametersContainer>
  );
};

export default ParameterDisplay;
