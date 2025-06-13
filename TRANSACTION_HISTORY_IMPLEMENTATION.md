# Transaction History and Status Implementation

This document describes the implementation of ticket #7: "Add support for viewing transaction history and status from on-chain data" as part of the umbrella ticket #3 for Safe Wallet integration.

## Overview

The implementation adds comprehensive on-chain transaction history and real-time status monitoring capabilities to the vito-interface. Users can now view both pending and executed transactions with detailed blockchain information.

## Key Features Implemented

### 1. On-Chain Data Service (`client/src/services/OnChainDataService.ts`)

A new service dedicated to fetching blockchain data:

- **Transaction Receipt Retrieval**: Get detailed transaction receipts from the blockchain
- **Safe Transaction Events**: Query Safe contract events to get executed transaction history
- **Transaction Status Monitoring**: Real-time status updates with confirmation counts
- **Gas Price and Estimation**: Current gas prices and transaction cost estimation
- **Block Monitoring**: Listen for new blocks and transaction confirmations

**Key Methods:**
- `getTransactionReceipt(txHash)`: Get transaction receipt with confirmations
- `getSafeTransactionEvents(safeAddress)`: Get executed Safe transactions from blockchain events
- `getTransactionStatus(txHash)`: Get current transaction status (pending/confirmed/executed/failed)
- `hasEnoughConfirmations(txHash, required)`: Check if transaction has sufficient confirmations
- `waitForTransaction(txHash, confirmations)`: Wait for transaction confirmation

### 2. Enhanced Transaction Service (`client/src/services/TransactionService.ts`)

Extended the existing TransactionService with new capabilities:

- **Real-time Status Monitoring**: `monitorTransactionStatus()` with automatic polling
- **Transaction Status Queries**: `getTransactionStatus()` for current blockchain status
- **Execution Readiness**: `canExecuteTransaction()` to check if Safe transaction can be executed

### 3. Enhanced Safe Wallet Service (`client/src/services/SafeWalletService.ts`)

Improved the SafeWalletService to integrate on-chain data:

- **Comprehensive Transaction History**: `getTransactionHistory()` now fetches both pending and executed transactions
- **Blockchain Event Integration**: Queries Safe contract events for executed transactions
- **Enhanced Status Tracking**: Real-time status updates from blockchain data

### 4. Transaction Status Hooks (`client/src/hooks/useTransactionStatus.ts`)

Custom React hooks for transaction monitoring:

- **`useTransactionStatus(safeTxHash)`**: Monitor individual transaction status with real-time updates
- **`useMultipleTransactionStatus(safeTxHashes)`**: Monitor multiple transactions simultaneously
- **`useTransactionHistory()`**: Real-time transaction history with automatic refresh

**Features:**
- Automatic polling with configurable intervals
- Error handling and retry logic
- Cleanup on component unmount
- Loading states and error reporting

### 5. Enhanced Transaction UI (`client/src/components/wallet/pages/TransactionsPage.tsx`)

Improved the TransactionsPage component with:

- **Real-time Status Updates**: Live transaction status with visual indicators
- **Detailed Transaction Information**: Block numbers, gas usage, confirmation counts
- **Enhanced Transaction Metadata**: Safe transaction hashes, execution hashes, proposer information
- **Refresh Functionality**: Manual refresh button for immediate updates
- **Error Handling**: User-friendly error messages and loading states

**Visual Enhancements:**
- Status indicators with color coding (pending/confirmed/executed/failed)
- Confirmation progress (e.g., "2/3 confirmations")
- Gas usage and price information
- Block number and timestamp display
- Clickable transaction hashes linking to block explorer

### 6. Enhanced Transaction Types

Updated transaction interfaces to include comprehensive on-chain data:

```typescript
interface Transaction {
  // Existing fields...
  
  // Enhanced on-chain data fields
  blockNumber?: number;
  blockHash?: string;
  nonce?: number;
  operation?: number;
  data?: string;
  executor?: string;
  isExecuted?: boolean;
  submissionDate?: string;
  proposer?: string;
  txId?: number;
  signatures?: string[];
  value?: string;
  gasToken?: string;
  safeTxGas?: string;
  baseGas?: string;
  refundReceiver?: string;
}
```

## Technical Implementation Details

### Data Flow

1. **Transaction Creation**: When a transaction is created, it's proposed to SafeTxPool
2. **Pending Status**: Transaction appears in pending list with signature count
3. **Real-time Monitoring**: Hooks automatically poll for status updates
4. **Execution**: When threshold is met, transaction can be executed
5. **On-chain Confirmation**: Transaction appears in blockchain and status updates to "executed"
6. **History Integration**: Executed transactions are fetched from blockchain events

### Event-Driven Updates

The implementation uses multiple data sources:

- **SafeTxPool Contract**: For pending transactions and signatures
- **Safe Contract Events**: For executed transaction history
- **Blockchain Receipts**: For confirmation counts and gas information
- **Real-time Polling**: For automatic status updates

### Error Handling

Comprehensive error handling throughout:

- Network connectivity issues
- Contract interaction failures
- Invalid transaction hashes
- Provider unavailability
- Graceful degradation when services are unavailable

## Usage Examples

### Monitor Single Transaction

```typescript
import { useTransactionStatus } from '../hooks/useTransactionStatus';

const { status, isLoading, error, refresh } = useTransactionStatus(safeTxHash);

// status contains: { status, confirmations, blockNumber, gasUsed, etc. }
```

### Get Transaction History

```typescript
import { useTransactionHistory } from '../hooks/useTransactionStatus';

const { transactions, isLoading, error, refresh } = useTransactionHistory();

// transactions contains both pending and executed transactions
```

### Manual Status Check

```typescript
import { transactionService } from '../services/TransactionService';

const status = await transactionService.getTransactionStatus(safeTxHash);
const canExecute = await transactionService.canExecuteTransaction(safeTxHash);
```

## Configuration

The implementation supports multiple networks through environment variables:

```env
REACT_APP_INFURA_KEY=your_infura_key_here
REACT_APP_ALCHEMY_KEY=your_alchemy_key_here
```

Supported networks:
- Ethereum Mainnet
- Sepolia Testnet  
- Arbitrum One

## Testing

Basic test coverage is included for the OnChainDataService:

```bash
npm test -- --testPathPattern=OnChainDataService.test.ts
```

## Future Enhancements

Potential improvements for future iterations:

1. **WebSocket Integration**: Real-time updates via WebSocket connections
2. **Transaction Filtering**: Filter by status, date range, amount, etc.
3. **Export Functionality**: Export transaction history to CSV/JSON
4. **Advanced Analytics**: Gas usage analytics, transaction patterns
5. **Notification System**: Push notifications for transaction status changes
6. **Caching Layer**: Cache transaction data for better performance

## Dependencies

The implementation relies on:

- `ethers.js` v5.7.2 for blockchain interactions
- React hooks for state management
- Safe contract ABIs for event querying
- Provider services for network connectivity

## Conclusion

This implementation successfully adds comprehensive on-chain transaction history and status monitoring to the vito-interface, fulfilling the requirements of ticket #7. Users can now view detailed transaction information, monitor real-time status updates, and access complete transaction history from the blockchain.
