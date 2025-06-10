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
  background: linear-gradient(135deg, ${props => props.networkColor} 0%, ${props => props.networkColor}CC 100%);
  color: ${theme.colors.text.inverse};
  padding: ${theme.spacing[3]} ${theme.spacing[5]};
  margin: ${theme.spacing[4]};
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.bold};
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: ${theme.shadows.md};
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  width: calc(100% - ${theme.spacing[8]});
  box-sizing: border-box;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    animation: shimmer 3s infinite;
  }

  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
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