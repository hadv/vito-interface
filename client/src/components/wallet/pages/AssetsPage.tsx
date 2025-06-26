import React from 'react';
import styled from 'styled-components';
import { Asset } from '../types';
import { theme } from '../../../theme';
import { Card, Badge } from '../../ui';
import AddressDisplay from '../components/AddressDisplay';

const Container = styled.div`
  padding: 0;
  height: 100%;
  overflow-y: auto;
`;

const Header = styled.div`
  margin-bottom: ${theme.spacing[8]};
`;

const Heading = styled.h1`
  font-size: ${theme.typography.fontSize['3xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  margin-bottom: ${theme.spacing[4]};
  color: ${theme.colors.primary[400]};
`;

const SubHeading = styled.p`
  font-size: ${theme.typography.fontSize.lg};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing[6]};
`;

const AssetsGrid = styled.div`
  display: grid;
  gap: ${theme.spacing[4]};
`;

const AssetCard = styled(Card)`
  transition: ${theme.transitions.normal};
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.xl};
  }
`;

const AssetItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[4]};
`;

const AssetIcon = styled.div<{ assetType: string }>`
  width: 56px;
  height: 56px;
  border-radius: ${theme.borderRadius.full};
  background: ${props => {
    switch (props.assetType) {
      case 'native':
        return theme.colors.network.ethereum;
      case 'erc20':
        return theme.colors.primary[500];
      default:
        return theme.colors.neutral[600];
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.text.inverse};
  font-weight: ${theme.typography.fontWeight.bold};
  font-size: ${theme.typography.fontSize.lg};
  box-shadow: ${theme.shadows.md};
  border: 2px solid rgba(255, 255, 255, 0.1);
`;

const AssetInfo = styled.div`
  flex: 1;
`;

const AssetHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
  margin-bottom: ${theme.spacing[1]};
`;

const AssetName = styled.div`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const AssetSymbol = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.tertiary};
  font-family: ${theme.typography.fontFamily.mono.join(', ')};
`;

const AssetBalanceInfo = styled.div`
  text-align: right;
`;

const AssetBalance = styled.div`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing[1]};
`;

const AssetValue = styled.div`
  font-size: ${theme.typography.fontSize.base};
  color: ${theme.colors.text.tertiary};
  font-weight: ${theme.typography.fontWeight.medium};
`;

const AssetActions = styled.div`
  display: flex;
  gap: ${theme.spacing[2]};
  margin-left: ${theme.spacing[3]};
`;

const SendButton = styled.button`
  padding: ${theme.spacing[3]} ${theme.spacing[6]};
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.lg};
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  border: 1px solid rgba(16, 185, 129, 0.4);
  position: relative;
  overflow: hidden;

  /* Add subtle glow effect */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    background: linear-gradient(135deg, #059669, #047857);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
    border-color: rgba(16, 185, 129, 0.6);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  &:disabled {
    background: ${theme.colors.text.muted};
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    border-color: transparent;

    &::before {
      display: none;
    }
  }

  /* Send icon */
  svg {
    width: 18px;
    height: 18px;
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: translateX(2px);
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing[12]};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.lg};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing[12]};
  color: ${theme.colors.text.tertiary};
`;

const EmptyStateIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.background.elevated};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${theme.spacing[4]};
  color: ${theme.colors.text.muted};
`;

const EmptyStateTitle = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing[2]};
`;

const EmptyStateDescription = styled.p`
  font-size: ${theme.typography.fontSize.base};
  color: ${theme.colors.text.muted};
`;

interface AssetsPageProps {
  assets: Asset[];
  isLoading: boolean;
  onSendAsset?: (asset: Asset) => void;
  network?: string;
}

const AssetsPage: React.FC<AssetsPageProps> = ({ assets, isLoading, onSendAsset, network = 'ethereum' }) => {
  const renderAssetItem = (asset: Asset, isSelected: boolean, isFocused: boolean) => (
    <AssetCard
      variant="elevated"
      padding="lg"
      className={isSelected ? 'selected' : ''}
    >
      <AssetItem>
        <AssetIcon assetType={asset.type}>
          {asset.symbol.charAt(0)}
        </AssetIcon>
        <AssetInfo>
          <AssetHeader>
            <AssetName>{asset.name}</AssetName>
            <Badge variant={asset.type === 'native' ? 'primary' : 'secondary'} size="sm">
              {asset.type.toUpperCase()}
            </Badge>
          </AssetHeader>
          <AssetSymbol>{asset.symbol}</AssetSymbol>
          {asset.type === 'erc20' && asset.contractAddress && (
            <div style={{ marginTop: '4px' }}>
              <AddressDisplay
                address={asset.contractAddress}
                network={network}
                truncate={true}
                truncateLength={4}
                showCopy={true}
                showExplorer={true}
              />
            </div>
          )}
        </AssetInfo>
        <AssetBalanceInfo>
          <AssetBalance>{asset.balance} {asset.symbol}</AssetBalance>
          <AssetValue>{asset.value}</AssetValue>
        </AssetBalanceInfo>
        <AssetActions>
          <SendButton
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering list item selection
              onSendAsset?.(asset);
            }}
            disabled={!onSendAsset || parseFloat(asset.balance) <= 0}
            title={`Send ${asset.symbol}`}
          >
            <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M13.6819 10.4036C13.0879 10.4043 12.603 9.91941 12.6038 9.32544L12.6038 5.83327L5.29387 13.1432C4.87451 13.5625 4.18827 13.5625 3.76891 13.1432C3.34878 12.723 3.34955 12.0376 3.76891 11.6182L11.0788 4.30831L7.58589 4.30755C6.99268 4.30755 6.50774 3.82261 6.50774 3.2294C6.50774 2.63619 6.99268 2.15126 7.58589 2.15126L13.6819 2.15202C13.7719 2.15049 13.8527 2.18252 13.9358 2.2031C13.9869 2.21607 14.0403 2.21454 14.0906 2.23437C14.1356 2.2519 14.1707 2.28698 14.2111 2.31214C14.4162 2.43032 14.5862 2.60188 14.6777 2.82148C14.6968 2.86951 14.6953 2.92136 14.7075 2.97168C14.7296 3.05632 14.7601 3.13714 14.7601 3.23017L14.7601 9.32544C14.7601 9.91865 14.2751 10.4036 13.6819 10.4036Z" fill="currentColor" />
            </svg>
            Send
          </SendButton>
        </AssetActions>
      </AssetItem>
    </AssetCard>
  );

  if (isLoading) {
    return (
      <Container>
        <LoadingState>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: `2px solid ${theme.colors.primary[500]}`,
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Loading your assets...
          </div>
        </LoadingState>
      </Container>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <Container>
        <Header>
          <Heading>Assets</Heading>
          <SubHeading>Manage your digital assets and tokens</SubHeading>
        </Header>

        <EmptyState>
          <EmptyStateIcon>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 14V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 14V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 14V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 10V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 10V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 10V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </EmptyStateIcon>
          <EmptyStateTitle>No Assets Found</EmptyStateTitle>
          <EmptyStateDescription>
            Your wallet doesn't contain any assets yet. Assets will appear here once you receive tokens.
          </EmptyStateDescription>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Heading>Assets</Heading>
        <SubHeading>
          Manage your digital assets and tokens. Total assets: {assets.length}
        </SubHeading>
      </Header>

      <AssetsGrid>
        {assets.map((asset, index) => (
          <div key={asset.address || index} onClick={() => {
            // TODO: Implement asset selection functionality
            console.log(`Selected ${asset.name} (${asset.balance} ${asset.symbol})`);
          }}>
            {renderAssetItem(asset, false, false)}
          </div>
        ))}
      </AssetsGrid>
    </Container>
  );
};

export default AssetsPage; 