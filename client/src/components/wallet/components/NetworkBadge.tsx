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
  background: ${props => props.networkColor}20;
  color: #ffffff;
  padding: ${theme.spacing[2]} ${theme.spacing[3]};
  margin: 0;
  border-radius: 0;
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: none;
  border-left: 3px solid ${props => props.networkColor};
  width: 100%;
  box-sizing: border-box;
  transition: ${theme.transitions.fast};
  backdrop-filter: blur(10px);

  &:hover {
    background: ${props => props.networkColor}30;
    border-left-width: 4px;
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