import React, { useState } from 'react';
import styled from 'styled-components';
import { NETWORK_CONFIGS, isSafeTxPoolConfigured, getSafeTxPoolAddress } from '../../../contracts/abis';
import { theme } from '../../../theme';

const StatusContainer = styled.div`
  background: ${theme.colors.background.card};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing[4]};
  margin: ${theme.spacing[4]} 0;
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing[3]};
  cursor: pointer;
`;

const StatusTitle = styled.h3`
  margin: 0;
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.text.secondary};
  cursor: pointer;
  font-size: ${theme.typography.fontSize.xs};
  padding: ${theme.spacing[1]};
  
  &:hover {
    color: ${theme.colors.text.primary};
  }
`;

const NetworkList = styled.div<{ isExpanded: boolean }>`
  display: ${props => props.isExpanded ? 'block' : 'none'};
`;

const NetworkItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing[2]} 0;
  border-bottom: 1px solid ${theme.colors.border.tertiary};
  
  &:last-child {
    border-bottom: none;
  }
`;

const NetworkInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[1]};
`;

const NetworkName = styled.span`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.primary};
`;

const NetworkDetails = styled.span`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.secondary};
  font-family: ${theme.typography.fontFamily.mono};
`;

const StatusBadge = styled.div<{ status: 'configured' | 'not-configured' }>`
  padding: ${theme.spacing[1]} ${theme.spacing[2]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
  
  ${props => props.status === 'configured' ? `
    background: ${theme.colors.status.success}20;
    color: ${theme.colors.status.success};
    border: 1px solid ${theme.colors.status.success}30;
  ` : `
    background: ${theme.colors.status.warning}20;
    color: ${theme.colors.status.warning};
    border: 1px solid ${theme.colors.status.warning}30;
  `}
`;

const ConfigurationNote = styled.div`
  margin-top: ${theme.spacing[3]};
  padding: ${theme.spacing[3]};
  background: ${theme.colors.background.secondary};
  border-radius: ${theme.borderRadius.md};
  border-left: 3px solid ${theme.colors.status.info};
`;

const NoteTitle = styled.div`
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing[1]};
`;

const NoteText = styled.div`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.secondary};
  line-height: 1.4;
`;

interface NetworkConfigStatusProps {
  className?: string;
}

const NetworkConfigStatus: React.FC<NetworkConfigStatusProps> = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const networks = Object.entries(NETWORK_CONFIGS);
  const configuredCount = networks.filter(([networkKey]) => isSafeTxPoolConfigured(networkKey)).length;
  const totalCount = networks.length;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <StatusContainer className={className}>
      <StatusHeader onClick={toggleExpanded}>
        <StatusTitle>
          Safe TX Pool Configuration ({configuredCount}/{totalCount} networks)
        </StatusTitle>
        <ToggleButton>
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </ToggleButton>
      </StatusHeader>

      <NetworkList isExpanded={isExpanded}>
        {networks.map(([networkKey, networkConfig]) => {
          const isConfigured = isSafeTxPoolConfigured(networkKey);
          const contractAddress = getSafeTxPoolAddress(networkKey);

          return (
            <NetworkItem key={networkKey}>
              <NetworkInfo>
                <NetworkName>
                  {networkConfig.name}
                  {networkConfig.isTestnet && ' (Testnet)'}
                </NetworkName>
                <NetworkDetails>
                  Chain ID: {networkConfig.chainId} | 
                  Contract: {contractAddress || 'Not configured'}
                </NetworkDetails>
              </NetworkInfo>
              <StatusBadge status={isConfigured ? 'configured' : 'not-configured'}>
                {isConfigured ? 'Configured' : 'Not Configured'}
              </StatusBadge>
            </NetworkItem>
          );
        })}

        {configuredCount < totalCount && (
          <ConfigurationNote>
            <NoteTitle>Configuration Required</NoteTitle>
            <NoteText>
              Some networks don't have Safe TX Pool contracts configured. 
              To enable transaction features for these networks, please configure 
              the contract addresses in your environment variables or abis.ts file.
              See SAFE_TX_POOL_CONFIGURATION.md for detailed instructions.
            </NoteText>
          </ConfigurationNote>
        )}
      </NetworkList>
    </StatusContainer>
  );
};

export default NetworkConfigStatus;
