import React from 'react';
import styled from 'styled-components';
import { VitoList } from '@components/vitoUI';
import { formatWalletAddress } from '@utils';
import { Transaction } from '../types';

// Format amount to display with token symbol
const formatAmount = (amount: string): string => {
  return amount;
};

const Container = styled.div`
  padding: 24px;
`;

const Heading = styled.h1`
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 24px;
  color: #fff;
`;

const TransactionItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-bottom: 1px solid #333;
  
  &:last-child {
    border-bottom: none;
  }
`;

const TransactionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const TransactionType = styled.div<{ txType: string }>`
  font-size: 16px;
  font-weight: 500;
  color: ${props => 
    props.txType === 'send' ? '#ff4a6a' : 
    props.txType === 'receive' ? '#10b981' : '#fff'};
`;

const TransactionAmount = styled.div<{ txType: string }>`
  font-size: 16px;
  font-weight: 500;
  color: ${props => 
    props.txType === 'send' ? '#ff4a6a' : 
    props.txType === 'receive' ? '#10b981' : '#fff'};
`;

const TransactionDetails = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const AddressLabel = styled.div`
  font-size: 14px;
  color: #9ca3af;
`;

const Address = styled.div`
  font-size: 14px;
  font-family: monospace;
  color: #d1d5db;
`;

const TransactionStatus = styled.div<{ status: string }>`
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: ${props => 
    props.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 
    props.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 
    'rgba(239, 68, 68, 0.2)'};
  color: ${props => 
    props.status === 'completed' ? '#10b981' : 
    props.status === 'pending' ? '#f59e0b' : 
    '#ef4444'};
`;

const DateText = styled.div`
  font-size: 14px;
  color: #9ca3af;
`;

interface TransactionsPageProps {
  transactions: Transaction[];
  isLoading: boolean;
}

const TransactionsPage: React.FC<TransactionsPageProps> = ({ 
  transactions, 
  isLoading 
}) => {
  // Derive transaction type based on from/to addresses
  // const getTransactionType = (tx: Transaction, walletAddress?: string): 'send' | 'receive' | 'contract' => {
  //   // This is a placeholder implementation
  //   // In a real app, would compare tx.from/to with current wallet address
  //   return tx.from === walletAddress ? 'send' : 'receive';
  // };
  
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const renderTransactionItem = (tx: Transaction, isSelected: boolean, isFocused: boolean) => {
    const txType = tx.type || 'contract';
    
    return (
      <TransactionItem>
        <TransactionHeader>
          <TransactionType txType={txType}>
            {txType.charAt(0).toUpperCase() + txType.slice(1)}
          </TransactionType>
          <TransactionAmount txType={txType}>
            {txType === 'send' ? '-' : '+'}{formatAmount(tx.amount)} {tx.token || 'ETH'}
          </TransactionAmount>
        </TransactionHeader>
        
        <TransactionDetails>
          <div>
            <AddressLabel>From:</AddressLabel>
            <Address>{formatWalletAddress(tx.from)}</Address>
          </div>
          <div>
            <AddressLabel>To:</AddressLabel>
            <Address>{formatWalletAddress(tx.to)}</Address>
          </div>
        </TransactionDetails>
        
        <TransactionDetails>
          <TransactionStatus status={tx.status}>
            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
          </TransactionStatus>
          <DateText>{formatDate(tx.timestamp)}</DateText>
        </TransactionDetails>
      </TransactionItem>
    );
  };

  return (
    <Container>
      <Heading>Transactions</Heading>
      
      {isLoading ? (
        <div>Loading transactions...</div>
      ) : (
        <VitoList
          items={transactions}
          renderItem={renderTransactionItem}
          onItemEnter={(tx) => window.open(`https://etherscan.io/tx/${tx.hash || tx.id}`, '_blank')}
        />
      )}
    </Container>
  );
};

export default TransactionsPage; 