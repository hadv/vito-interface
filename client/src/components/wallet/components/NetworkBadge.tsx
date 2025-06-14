import React from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';

interface NetworkBadgeProps {
  network: string;
}

// Get appropriate color for each network
const getNetworkColor = (network: string): string => {
  switch (network.toLowerCase()) {
    case 'ethereum':
    case 'mainnet':
      return '#627EEA';  // Ethereum blue
    case 'optimism':
      return '#FF0420';  // Optimism red
    case 'arbitrum':
      return '#96BEDC';  // Arbitrum blue
    case 'polygon':
      return '#8247E5';  // Polygon purple
    case 'base':
      return '#0052FF';  // Base blue
    case 'sepolia':
      return '#CFB5F0';  // Sepolia lavender
    case 'goerli':
      return '#F6C343';  // Goerli yellow
    default:
      return '#888888';  // Default gray for unknown networks
  }
};

const NetworkBadgeContainer = styled.div<{ networkColor: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.networkColor};
  color: ${theme.colors.text.inverse};
  padding: ${theme.spacing[3]} ${theme.spacing[5]};
  margin: ${theme.spacing[4]};
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.bold};
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: ${theme.shadows.sm};
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: calc(100% - ${theme.spacing[8]});
  box-sizing: border-box;
  transition: ${theme.transitions.fast};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${theme.shadows.md};
  }
`;

const NetworkBadge: React.FC<NetworkBadgeProps> = ({ network }) => {
  const networkColor = getNetworkColor(network);
  
  return (
    <NetworkBadgeContainer networkColor={networkColor}>
      {network}
    </NetworkBadgeContainer>
  );
};

export default NetworkBadge; 