import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Asset, Transaction } from '../types';
import { formatWalletAddress } from '@utils';

const Container = styled.div`
  padding: 24px;
`;

const Heading = styled.h1`
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #fff;
`;

const InfoText = styled.p`
  font-size: 16px;
  color: #9ca3af;
  margin-bottom: 16px;
  line-height: 1.5;
`;

const TwoColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 24px;
`;

const Column = styled.div`
  background-color: rgba(30, 41, 59, 0.5);
  border-radius: 8px;
  padding: 16px;
`;

const ColumnHeading = styled.h2`
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ViewAllLink = styled.a`
  font-size: 14px;
  color: #4f46e5;
  cursor: pointer;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

// Asset Item Components
const AssetItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 8px;
  border-bottom: 1px solid #333;
  
  &:last-child {
    border-bottom: none;
  }
`;

const AssetIcon = styled.div<{ assetType: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${props => 
    props.assetType === 'native' ? '#627EEA' : 
    props.assetType === 'erc20' ? '#8247E5' : '#444'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
  margin-right: 12px;
  font-size: 12px;
`;

const AssetInfo = styled.div`
  flex: 1;
`;

const AssetName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  margin-bottom: 2px;
`;

const AssetSymbol = styled.div`
  font-size: 12px;
  color: #9ca3af;
`;

const AssetBalance = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  text-align: right;
  margin-bottom: 2px;
`;

const AssetValue = styled.div`
  font-size: 12px;
  color: #9ca3af;
  text-align: right;
`;

// Transaction Item Components
const TransactionItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 8px;
  border-bottom: 1px solid #333;
  
  &:last-child {
    border-bottom: none;
  }
`;

const TransactionIcon = styled.div<{ status: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${props => 
    props.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 
    props.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 
    'rgba(239, 68, 68, 0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => 
    props.status === 'pending' ? '#f59e0b' : 
    props.status === 'completed' ? '#10b981' : 
    '#ef4444'};
  margin-right: 12px;
  font-size: 12px;
`;

const TransactionInfo = styled.div`
  flex: 1;
`;

const TransactionType = styled.div<{ txType: string }>`
  font-size: 14px;
  font-weight: 500;
  color: ${props => 
    props.txType === 'send' ? '#ff4a6a' : 
    props.txType === 'receive' ? '#10b981' : '#fff'};
  margin-bottom: 2px;
`;

const TransactionAddress = styled.div`
  font-size: 12px;
  color: #9ca3af;
`;

const TransactionAmount = styled.div<{ txType: string }>`
  font-size: 14px;
  font-weight: 500;
  color: ${props => 
    props.txType === 'send' ? '#ff4a6a' : 
    props.txType === 'receive' ? '#10b981' : '#fff'};
  text-align: right;
`;

const EmptyStateText = styled.div`
  font-size: 14px;
  color: #9ca3af;
  text-align: center;
  padding: 24px 0;
`;

interface HomePageProps {
  walletAddress: string;
  ensName?: string;
  network: string;
}

// Mock data - In a real app these would be fetched from an API
const mockAssets: Asset[] = [
  { symbol: 'ETH', name: 'Ethereum', balance: '1.23', value: '$2,460', type: 'native' },
  { symbol: 'USDC', name: 'USD Coin', balance: '1,000', value: '$1,000', type: 'erc20' },
  { symbol: 'UNI', name: 'Uniswap', balance: '50', value: '$450', type: 'erc20' },
];

const mockPendingTransactions: Transaction[] = [
  { 
    id: 'tx1', 
    from: '0x1234567890abcdef1234567890abcdef12345678', 
    to: '0xabcdef1234567890abcdef1234567890abcdef12', 
    amount: '0.5', 
    status: 'pending', 
    timestamp: Date.now() - 3600000,
    type: 'send',
    token: 'ETH'
  },
  { 
    id: 'tx2', 
    from: '0xfedcba0987654321fedcba0987654321fedcba09', 
    to: '0x1234567890abcdef1234567890abcdef12345678', 
    amount: '100', 
    status: 'pending', 
    timestamp: Date.now() - 7200000,
    type: 'receive',
    token: 'USDC'
  }
];

const HomePage: React.FC<HomePageProps> = ({
  walletAddress,
  ensName,
  network
}) => {
  const [assets, setAssets] = useState<Asset[]>(mockAssets);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>(mockPendingTransactions);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // In a real app, you would fetch data from an API here
  useEffect(() => {
    // Fetch assets and transactions
    // setIsLoadingAssets(true);
    // apiClient.getAssets().then(data => {
    //   setAssets(data);
    //   setIsLoadingAssets(false);
    // });
    //
    // setIsLoadingTransactions(true);
    // apiClient.getPendingTransactions().then(data => {
    //   setPendingTransactions(data);
    //   setIsLoadingTransactions(false);
    // });
  }, []);

  const renderAssetItem = (asset: Asset) => (
    <AssetItem>
      <AssetIcon assetType={asset.type}>
        {asset.symbol.charAt(0)}
      </AssetIcon>
      <AssetInfo>
        <AssetName>{asset.name}</AssetName>
        <AssetSymbol>{asset.symbol}</AssetSymbol>
      </AssetInfo>
      <div>
        <AssetBalance>{asset.balance}</AssetBalance>
        <AssetValue>{asset.value}</AssetValue>
      </div>
    </AssetItem>
  );

  const renderTransactionItem = (tx: Transaction) => {
    const txType = tx.type || 'contract';
    const statusIcon = tx.status === 'pending' ? '⏳' : tx.status === 'completed' ? '✓' : '✗';
    
    return (
      <TransactionItem>
        <TransactionIcon status={tx.status}>
          {statusIcon}
        </TransactionIcon>
        <TransactionInfo>
          <TransactionType txType={txType}>
            {txType.charAt(0).toUpperCase() + txType.slice(1)}
          </TransactionType>
          <TransactionAddress>
            {txType === 'send' ? 'To: ' : 'From: '}
            {formatWalletAddress(txType === 'send' ? tx.to : tx.from)}
          </TransactionAddress>
        </TransactionInfo>
        <div>
          <TransactionAmount txType={txType}>
            {txType === 'send' ? '-' : '+'}{tx.amount} {tx.token}
          </TransactionAmount>
        </div>
      </TransactionItem>
    );
  };

  return (
    <Container>
      <Heading>Welcome to your Safe Wallet</Heading>
      
      <InfoText>
        Connected to <strong>{network}</strong> network with address{' '}
        <strong>{ensName || formatWalletAddress(walletAddress)}</strong>.
      </InfoText>
      
      <TwoColumnLayout>
        <Column>
          <ColumnHeading>
            Safe Wallet Assets
            <ViewAllLink>View All</ViewAllLink>
          </ColumnHeading>
          
          {isLoadingAssets ? (
            <EmptyStateText>Loading assets...</EmptyStateText>
          ) : assets.length === 0 ? (
            <EmptyStateText>No assets found in your wallet</EmptyStateText>
          ) : (
            assets.map(asset => renderAssetItem(asset))
          )}
        </Column>
        
        <Column>
          <ColumnHeading>
            Pending Transactions
            <ViewAllLink>View All</ViewAllLink>
          </ColumnHeading>
          
          {isLoadingTransactions ? (
            <EmptyStateText>Loading transactions...</EmptyStateText>
          ) : pendingTransactions.length === 0 ? (
            <EmptyStateText>No pending transactions</EmptyStateText>
          ) : (
            pendingTransactions.map(tx => renderTransactionItem(tx))
          )}
        </Column>
      </TwoColumnLayout>
    </Container>
  );
};

export default HomePage; 