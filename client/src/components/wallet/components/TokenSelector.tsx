import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { TokenInfo, TokenBalance } from '../../../services/TokenService';
import AddressDisplay from './AddressDisplay';

const Container = styled.div`
  position: relative;
`;

const TokenButton = styled.button<{ isOpen: boolean }>`
  width: 100%;
  padding: 12px 16px;
  background: #1a1a1a;
  border: 2px solid ${props => props.isOpen ? '#007bff' : '#333'};
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;

  &:hover {
    border-color: #007bff;
    background: #222;
  }

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
`;

const TokenDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TokenIcon = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #007bff, #0056b3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: bold;
`;

const TokenInfoContainer = styled.div`
  text-align: left;
`;

const TokenSymbol = styled.div`
  font-weight: 600;
  font-size: 16px;
`;

const TokenBalanceDisplay = styled.div`
  font-size: 12px;
  color: #888;
`;

const ChevronIcon = styled.div<{ isOpen: boolean }>`
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #888;
  transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.2s ease;
`;

const Dropdown = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border: 2px solid #333;
  border-radius: 8px;
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  display: ${props => props.isOpen ? 'block' : 'none'};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const DropdownSection = styled.div`
  padding: 8px 0;
`;

const SectionTitle = styled.div`
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TokenOption = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.2s ease;

  &:hover {
    background: #333;
  }

  &:focus {
    outline: none;
    background: #333;
  }
`;

const CustomTokenInput = styled.div`
  padding: 12px 16px;
  border-top: 1px solid #333;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  background: #222;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #007bff;
  }

  &::placeholder {
    color: #666;
  }
`;

const AddButton = styled.button`
  width: 100%;
  padding: 8px 12px;
  margin-top: 8px;
  background: #007bff;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: #0056b3;
  }

  &:disabled {
    background: #444;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #ff4444;
  font-size: 12px;
  margin-top: 4px;
`;

export interface TokenSelectorProps {
  selectedToken: TokenInfo | null;
  onTokenSelect: (token: TokenInfo) => void;
  knownTokens: TokenBalance[];
  onAddCustomToken: (address: string) => Promise<TokenInfo | null>;
  disabled?: boolean;
  network?: string;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onTokenSelect,
  knownTokens,
  onAddCustomToken,
  disabled = false,
  network = 'ethereum'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [error, setError] = useState('');

  // ETH as default native token
  const nativeToken: TokenInfo = {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-token-selector]')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTokenSelect = (token: TokenInfo) => {
    onTokenSelect(token);
    setIsOpen(false);
    setError('');
  };

  const handleAddCustomToken = async () => {
    if (!customTokenAddress.trim()) return;

    setIsAddingToken(true);
    setError('');

    try {
      const tokenInfo = await onAddCustomToken(customTokenAddress.trim());
      if (tokenInfo) {
        handleTokenSelect(tokenInfo);
        setCustomTokenAddress('');
      } else {
        setError('Invalid token address or unable to fetch token information');
      }
    } catch (error) {
      setError('Failed to add custom token');
    } finally {
      setIsAddingToken(false);
    }
  };

  const displayToken = selectedToken || nativeToken;
  const selectedBalance = selectedToken?.address === nativeToken.address 
    ? null 
    : knownTokens.find(t => t.tokenInfo.address === selectedToken?.address);

  return (
    <Container data-token-selector>
      <TokenButton
        type="button"
        isOpen={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <TokenDisplay>
          <TokenIcon>
            {displayToken.symbol.charAt(0)}
          </TokenIcon>
          <TokenInfoContainer>
            <TokenSymbol>{displayToken.symbol}</TokenSymbol>
            {selectedBalance && (
              <TokenBalanceDisplay>Balance: {selectedBalance.formattedBalance}</TokenBalanceDisplay>
            )}
          </TokenInfoContainer>
        </TokenDisplay>
        <ChevronIcon isOpen={isOpen} />
      </TokenButton>

      <Dropdown isOpen={isOpen && !disabled}>
        <DropdownSection>
          <SectionTitle>Native Token</SectionTitle>
          <TokenOption onClick={() => handleTokenSelect(nativeToken)}>
            <TokenIcon>ETH</TokenIcon>
            <TokenInfoContainer>
              <TokenSymbol>ETH</TokenSymbol>
              <TokenBalanceDisplay>Ethereum</TokenBalanceDisplay>
            </TokenInfoContainer>
          </TokenOption>
        </DropdownSection>

        {knownTokens.length > 0 && (
          <DropdownSection>
            <SectionTitle>Your Tokens</SectionTitle>
            {knownTokens.map((tokenBalance) => (
              <div key={tokenBalance.tokenInfo.address}>
                <TokenOption
                  onClick={() => handleTokenSelect(tokenBalance.tokenInfo)}
                >
                  <TokenIcon>
                    {tokenBalance.tokenInfo.symbol.charAt(0)}
                  </TokenIcon>
                  <TokenInfoContainer>
                    <TokenSymbol>{tokenBalance.tokenInfo.symbol}</TokenSymbol>
                    <TokenBalanceDisplay>Balance: {tokenBalance.formattedBalance}</TokenBalanceDisplay>
                    <div style={{ marginTop: '4px' }}>
                      <AddressDisplay
                        address={tokenBalance.tokenInfo.address}
                        network={network}
                        truncate={true}
                        truncateLength={4}
                        showCopy={false}
                        showExplorer={true}
                      />
                    </div>
                  </TokenInfoContainer>
                </TokenOption>
              </div>
            ))}
          </DropdownSection>
        )}

        <CustomTokenInput>
          <Input
            type="text"
            placeholder="Enter token contract address..."
            value={customTokenAddress}
            onChange={(e) => setCustomTokenAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomToken()}
          />
          <AddButton
            onClick={handleAddCustomToken}
            disabled={!customTokenAddress.trim() || isAddingToken}
          >
            {isAddingToken ? 'Adding...' : 'Add Custom Token'}
          </AddButton>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </CustomTokenInput>
      </Dropdown>
    </Container>
  );
};

export default TokenSelector;
