import React from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { VitoList } from '@components/vitoUI';
import { formatWalletAddress } from '@utils';
import { Transaction } from '../types';
import { useTransactionHistory, useMultipleTransactionStatus } from '../../../hooks/useTransactionStatus';

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

const RefreshButton = styled.button`
  background: #374151;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 16px;

  &:hover {
    background: #4b5563;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusIndicator = styled.div<{ status: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  background-color: ${props =>
    props.status === 'executed' ? '#10b981' :
    props.status === 'confirmed' ? '#3b82f6' :
    props.status === 'pending' ? '#f59e0b' :
    '#ef4444'};
`;

const TransactionMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
`;

const ConfirmationCount = styled.span<{ hasEnough: boolean }>`
  color: ${props => props.hasEnough ? '#10b981' : '#f59e0b'};
  font-weight: 500;
`;

interface TransactionsPageProps {
  transactions?: Transaction[];
  isLoading?: boolean;
}

const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions: propTransactions,
  isLoading: propIsLoading
}) => {
  // const [useRealTimeData, setUseRealTimeData] = useState(true);

  // Use real-time transaction history if no props provided
  const {
    transactions: realTimeTransactions,
    isLoading: realTimeLoading,
    error: historyError,
    refresh: refreshHistory
  } = useTransactionHistory(30000); // Refresh every 30 seconds

  // Get transaction hashes for status monitoring
  const transactionHashes = (propTransactions || realTimeTransactions)
    .filter(tx => tx.safeTxHash)
    .map(tx => tx.safeTxHash!);

  // Monitor transaction statuses
  const {
    statuses,
    isLoading: statusLoading,
    refresh: refreshStatuses
  } = useMultipleTransactionStatus(transactionHashes, 10000); // Poll every 10 seconds

  // Use prop data if provided, otherwise use real-time data
  const transactions = propTransactions || realTimeTransactions;
  const isLoading = propIsLoading !== undefined ? propIsLoading : realTimeLoading;

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const handleRefresh = () => {
    refreshHistory();
    refreshStatuses();
  };

  const renderTransactionItem = (tx: Transaction, isSelected: boolean, isFocused: boolean) => {
    const txType = tx.type || 'contract';
    const currentStatus = tx.safeTxHash && statuses[tx.safeTxHash]
      ? statuses[tx.safeTxHash]
      : {
          status: tx.status,
          confirmations: tx.confirmations || 0,
          blockNumber: tx.blockNumber,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          executionTxHash: tx.executionTxHash,
          timestamp: tx.timestamp
        };

    const hasEnoughConfirmations = currentStatus.confirmations >= (tx.threshold || 1);

    return (
      <TransactionItem>
        <TransactionHeader>
          <TransactionType txType={txType}>
            <StatusIndicator status={currentStatus.status} />
            {txType.charAt(0).toUpperCase() + txType.slice(1)}
          </TransactionType>
          <TransactionAmount txType={txType}>
            {txType === 'send' ? '-' : '+'}{formatAmount(tx.amount || tx.value || '0')} {tx.token || 'ETH'}
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
          <TransactionStatus status={currentStatus.status}>
            {currentStatus.status.charAt(0).toUpperCase() + currentStatus.status.slice(1)}
          </TransactionStatus>
          <DateText>{formatDate(tx.timestamp)}</DateText>
        </TransactionDetails>

        {/* Enhanced transaction metadata */}
        <TransactionMeta>
          <div>
            {tx.safeTxHash && (
              <span>Safe TX: {formatWalletAddress(tx.safeTxHash)}</span>
            )}
            {tx.executionTxHash && (
              <span> | Execution TX: {formatWalletAddress(tx.executionTxHash)}</span>
            )}
          </div>
          <div>
            {tx.threshold && (
              <ConfirmationCount hasEnough={hasEnoughConfirmations}>
                {currentStatus.confirmations}/{tx.threshold} confirmations
              </ConfirmationCount>
            )}
            {currentStatus.blockNumber && (
              <span> | Block: {currentStatus.blockNumber}</span>
            )}
          </div>
        </TransactionMeta>

        {/* Gas information */}
        {(currentStatus.gasUsed || tx.gasUsed) && (
          <TransactionMeta>
            <span>
              Gas Used: {currentStatus.gasUsed || tx.gasUsed}
              {(currentStatus.gasPrice || tx.gasPrice) &&
                ` | Gas Price: ${ethers.utils.formatUnits(currentStatus.gasPrice || tx.gasPrice || '0', 'gwei')} gwei`
              }
            </span>
          </TransactionMeta>
        )}
      </TransactionItem>
    );
  };

  return (
    <Container>
      <Heading>Transactions</Heading>

      <RefreshButton
        onClick={handleRefresh}
        disabled={isLoading || statusLoading}
      >
        {isLoading || statusLoading ? 'Refreshing...' : 'Refresh'}
      </RefreshButton>

      {historyError && (
        <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '14px' }}>
          Error loading transactions: {historyError}
        </div>
      )}

      {isLoading ? (
        <div>Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>
          No transactions found
        </div>
      ) : (
        <VitoList
          items={transactions}
          renderItem={renderTransactionItem}
          onItemEnter={(tx) => {
            const txHash = tx.executionTxHash || tx.hash || tx.id;
            if (txHash && txHash.startsWith('0x')) {
              window.open(`https://etherscan.io/tx/${txHash}`, '_blank');
            }
          }}
        />
      )}
    </Container>
  );
};

export default TransactionsPage; 