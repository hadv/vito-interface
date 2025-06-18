import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 6px 12px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(76, 236, 196, 0.3);
  }
`;

const AddressText = styled.span<{ clickable?: boolean }>`
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  color: #e2e8f0;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  letter-spacing: 0.5px;

  &:hover {
    ${props => props.clickable && `
      color: #4ECDC4;
    `}
  }
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #94a3b8;

  &:hover {
    background: rgba(76, 236, 196, 0.1);
    color: #4ECDC4;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ExplorerLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;
  color: #94a3b8;

  &:hover {
    background: rgba(76, 236, 196, 0.1);
    color: #4ECDC4;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const CopyFeedback = styled.span<{ show: boolean }>`
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  background: #1a1a1a;
  color: #4ECDC4;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  opacity: ${props => props.show ? 1 : 0};
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 1000;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: #1a1a1a;
  }
`;

const ButtonContainer = styled.div`
  position: relative;
  display: inline-flex;
`;

export interface AddressDisplayProps {
  address: string;
  network?: string;
  showCopy?: boolean;
  showExplorer?: boolean;
  truncate?: boolean;
  truncateLength?: number;
  label?: string;
  type?: 'address' | 'transaction';
}

const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  network = 'ethereum',
  showCopy = true,
  showExplorer = true,
  truncate = true,
  truncateLength = 6,
  label,
  type = 'address'
}) => {
  const [showCopied, setShowCopied] = React.useState(false);

  // Get block explorer URL based on network and type
  const getExplorerUrl = (address: string, network: string, type: string): string => {
    const explorers: { [key: string]: string } = {
      ethereum: 'https://etherscan.io',
      sepolia: 'https://sepolia.etherscan.io',
      polygon: 'https://polygonscan.com',
      arbitrum: 'https://arbiscan.io',
      optimism: 'https://optimistic.etherscan.io',
      base: 'https://basescan.org',
      bsc: 'https://bscscan.com',
      avalanche: 'https://snowtrace.io',
      fantom: 'https://ftmscan.com',
      gnosis: 'https://gnosisscan.io'
    };

    const baseUrl = explorers[network.toLowerCase()] || explorers.ethereum;
    const path = type === 'transaction' ? 'tx' : 'address';
    return `${baseUrl}/${path}/${address}`;
  };

  // Get network display name
  const getNetworkName = (network: string): string => {
    const names: { [key: string]: string } = {
      ethereum: 'Ethereum',
      sepolia: 'Sepolia',
      polygon: 'Polygon',
      arbitrum: 'Arbitrum',
      optimism: 'Optimism',
      base: 'Base',
      bsc: 'BSC',
      avalanche: 'Avalanche',
      fantom: 'Fantom',
      gnosis: 'Gnosis'
    };

    return names[network.toLowerCase()] || 'Ethereum';
  };

  // Format address for display
  const formatAddress = (address: string, truncate: boolean, length: number): string => {
    if (!truncate) return address;
    if (address.length <= length * 2 + 2) return address;
    return `${address.slice(0, length + 2)}...${address.slice(-length)}`;
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  // Handle address click (copy)
  const handleAddressClick = () => {
    if (showCopy) {
      handleCopy();
    }
  };

  const displayAddress = formatAddress(address, truncate, truncateLength);
  const explorerUrl = getExplorerUrl(address, network, type);
  const networkName = getNetworkName(network);

  return (
    <Container>
      {label && (
        <span style={{
          fontSize: '11px',
          color: '#64748b',
          fontWeight: '500',
          marginRight: '4px'
        }}>
          {label}:
        </span>
      )}

      <AddressText
        clickable={showCopy}
        onClick={handleAddressClick}
        title={showCopy ? `Click to copy: ${address}` : address}
      >
        {displayAddress}
      </AddressText>

      {showCopy && (
        <ButtonContainer>
          <ActionButton onClick={handleCopy} title="Copy address">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </ActionButton>
          <CopyFeedback show={showCopied}>Copied!</CopyFeedback>
        </ButtonContainer>
      )}

      {showExplorer && (
        <ExplorerLink
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`View on ${networkName} Explorer`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15,3 21,3 21,9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </ExplorerLink>
      )}
    </Container>
  );
};

export default AddressDisplay;
