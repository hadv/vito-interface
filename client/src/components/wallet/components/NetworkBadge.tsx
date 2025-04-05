import React from 'react';
import styled from 'styled-components';

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
  font-size: 14px;
  font-weight: 600;
  color: white;
  padding: 6px;
  background-color: ${props => props.networkColor};
  margin: 0;
  border-radius: 0;
  text-transform: capitalize;
  width: 100%;
  box-sizing: border-box;
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