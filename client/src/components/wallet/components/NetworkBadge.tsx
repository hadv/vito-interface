import React from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';

interface NetworkBadgeProps {
  network: string;
}

// Network display configuration with concise labels
const getNetworkDisplayInfo = (network: string) => {
  const networkConfig = {
    ethereum: {
      short: 'ETH',
      full: 'Ethereum Mainnet',
      color: '#627EEA'
    },
    sepolia: {
      short: 'SEP',
      full: 'Sepolia Testnet',
      color: '#CFB5F0'
    },
    arbitrum: {
      short: 'ARB',
      full: 'Arbitrum One',
      color: '#96BEDC'
    },
    optimism: {
      short: 'OP',
      full: 'Optimism',
      color: '#FF0420'
    },
    polygon: {
      short: 'MATIC',
      full: 'Polygon',
      color: '#8247E5'
    },
    base: {
      short: 'BASE',
      full: 'Base',
      color: '#0052FF'
    },
    goerli: {
      short: 'GOR',
      full: 'Goerli Testnet',
      color: '#F6C343'
    }
  };

  return networkConfig[network.toLowerCase() as keyof typeof networkConfig] || {
    short: network.toUpperCase().slice(0, 3),
    full: network,
    color: '#888888'
  };
};

const NetworkBadgeContainer = styled.div<{ networkColor: string; fullName: string }>`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  background: ${props => props.networkColor}15;
  color: ${props => props.networkColor};
  padding: ${theme.spacing[2]} ${theme.spacing[3]};
  margin: ${theme.spacing[3]} ${theme.spacing[4]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.semibold};
  letter-spacing: 0.5px;
  border: 1px solid ${props => props.networkColor}30;
  box-sizing: border-box;
  transition: ${theme.transitions.fast};
  position: relative;
  cursor: default;

  &:hover {
    background: ${props => props.networkColor}20;
    border-color: ${props => props.networkColor}50;
    transform: translateY(-1px);
  }

  &:hover::after {
    content: '${props => props.fullName}';
    position: absolute;
    top: -32px;
    left: 50%;
    transform: translateX(-50%);
    background: ${theme.colors.background.primary};
    color: ${theme.colors.text.primary};
    padding: ${theme.spacing[1]} ${theme.spacing[2]};
    border-radius: ${theme.borderRadius.sm};
    font-size: ${theme.typography.fontSize.xs};
    white-space: nowrap;
    z-index: 1000;
    border: 1px solid ${theme.colors.border.primary};
    box-shadow: ${theme.shadows.md};
  }
`;

const NetworkIndicator = styled.div<{ networkColor: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.networkColor};
  margin-right: ${theme.spacing[2]};
  flex-shrink: 0;
`;

const NetworkLabel = styled.span`
  font-weight: ${theme.typography.fontWeight.bold};
  font-size: ${theme.typography.fontSize.xs};
  letter-spacing: 0.5px;
`;

const NetworkBadge: React.FC<NetworkBadgeProps> = ({ network }) => {
  const networkInfo = getNetworkDisplayInfo(network);

  return (
    <NetworkBadgeContainer
      networkColor={networkInfo.color}
      fullName={networkInfo.full}
    >
      <NetworkIndicator networkColor={networkInfo.color} />
      <NetworkLabel>{networkInfo.short}</NetworkLabel>
    </NetworkBadgeContainer>
  );
};

export default NetworkBadge; 