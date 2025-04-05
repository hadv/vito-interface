import React from 'react';
import styled from 'styled-components';
import { VitoList } from '@components/vitoUI';
import { Asset } from '../types';

const Container = styled.div`
  padding: 24px;
`;

const Heading = styled.h1`
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 24px;
  color: #fff;
`;

const AssetItem = styled.div`
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #333;
  
  &:last-child {
    border-bottom: none;
  }
`;

const AssetIcon = styled.div<{ assetType: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => 
    props.assetType === 'native' ? '#627EEA' : 
    props.assetType === 'erc20' ? '#8247E5' : '#444'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
  margin-right: 16px;
`;

const AssetInfo = styled.div`
  flex: 1;
`;

const AssetName = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  margin-bottom: 4px;
`;

const AssetSymbol = styled.div`
  font-size: 14px;
  color: #9ca3af;
`;

const AssetBalance = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  text-align: right;
  margin-bottom: 4px;
`;

const AssetValue = styled.div`
  font-size: 14px;
  color: #9ca3af;
  text-align: right;
`;

interface AssetsPageProps {
  assets: Asset[];
  isLoading: boolean;
}

const AssetsPage: React.FC<AssetsPageProps> = ({ assets, isLoading }) => {
  const renderAssetItem = (asset: Asset, isSelected: boolean, isFocused: boolean) => (
    <AssetItem>
      <AssetIcon assetType={asset.type}>
        {asset.symbol.charAt(0)}
      </AssetIcon>
      <AssetInfo>
        <AssetName>{asset.name}</AssetName>
        <AssetSymbol>{asset.symbol}</AssetSymbol>
      </AssetInfo>
      <div>
        <AssetBalance>{asset.balance} {asset.symbol}</AssetBalance>
        <AssetValue>{asset.value}</AssetValue>
      </div>
    </AssetItem>
  );

  return (
    <Container>
      <Heading>Assets</Heading>
      
      {isLoading ? (
        <div>Loading assets...</div>
      ) : (
        <VitoList
          items={assets}
          renderItem={renderAssetItem}
          onItemEnter={(asset) => alert(`Selected ${asset.name} (${asset.balance} ${asset.symbol})`)}
        />
      )}
    </Container>
  );
};

export default AssetsPage; 