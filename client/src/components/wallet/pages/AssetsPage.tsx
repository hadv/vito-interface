import React from 'react';
import styled from 'styled-components';
import { VitoList } from '@components/vitoUI';
import { Asset } from '../types';
import { theme } from '../../../theme';
import { Card, Badge } from '../../ui';

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
  color: ${theme.colors.text.primary};
  background: linear-gradient(135deg, ${theme.colors.primary[400]} 0%, ${theme.colors.secondary[400]} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
        return `linear-gradient(135deg, ${theme.colors.network.ethereum} 0%, ${theme.colors.network.ethereum}CC 100%)`;
      case 'erc20':
        return `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.secondary[500]} 100%)`;
      default:
        return `linear-gradient(135deg, ${theme.colors.neutral[600]} 0%, ${theme.colors.neutral[700]} 100%)`;
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
}

const AssetsPage: React.FC<AssetsPageProps> = ({ assets, isLoading }) => {
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
        </AssetInfo>
        <AssetBalanceInfo>
          <AssetBalance>{asset.balance} {asset.symbol}</AssetBalance>
          <AssetValue>{asset.value}</AssetValue>
        </AssetBalanceInfo>
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
        <VitoList
          items={assets}
          renderItem={renderAssetItem}
          onItemEnter={(asset) => alert(`Selected ${asset.name} (${asset.balance} ${asset.symbol})`)}
        />
      </AssetsGrid>
    </Container>
  );
};

export default AssetsPage; 