# Safe Wallet Integration with SafeTxPool Contract

This document describes the implementation of Safe Wallet transaction signing and submission functionality in the Vito interface, integrated with the custom SafeTxPool smart contract.

## Overview

The integration enables users to:
- Connect to their Safe multi-signature wallets
- Create and propose transactions via the SafeTxPool contract
- Sign transactions and submit signatures to the pool
- Monitor transaction status and confirmations from the pool
- Execute transactions when threshold is met
- View pending transactions from the SafeTxPool

## Architecture

### Services

#### 1. SafeTxPoolService (`client/src/services/SafeTxPoolService.ts`)
Core service for interacting with the SafeTxPool smart contract.

**Key Features:**
- Propose transactions to the SafeTxPool contract
- Sign proposed transactions and submit signatures
- Retrieve pending transactions from the pool
- Mark transactions as executed
- Generate transaction hashes
- Listen for contract events

#### 2. SafeWalletService (`client/src/services/SafeWalletService.ts`)
High-level service that integrates SafeTxPool with Safe wallet operations.

**Key Features:**
- Initialize Safe wallet connection with SafeTxPool integration
- Create Safe transactions and propose them to the pool
- Sign transactions and submit signatures to the pool
- Get Safe information (owners, threshold, balance)
- Retrieve pending transactions from SafeTxPool

#### 2. TransactionService (`client/src/services/TransactionService.ts`)
High-level service for transaction management.

**Key Features:**
- Send ETH and ERC20 tokens
- Propose transactions to other Safe owners
- Execute transactions
- Monitor transaction status
- Estimate gas costs
- Handle transaction errors

#### 3. WalletConnectionService (`client/src/services/WalletConnectionService.ts`)
Manages wallet connection state and Web3 provider integration.

**Key Features:**
- Connect to MetaMask or other Web3 wallets
- Manage connection state
- Handle network switching
- Listen for wallet events (account/network changes)
- Validate Safe addresses

#### 4. ContractService (`client/src/services/ContractService.ts`)
Utility service for smart contract interactions.

**Key Features:**
- ERC20 token information and balances
- Gas estimation
- Transaction receipt monitoring
- Contract address validation

### Components

#### 1. TransactionModal (`client/src/components/wallet/components/TransactionModal.tsx`)
Modal component for creating new transactions.

**Features:**
- Form validation
- Real-time transaction preview
- Gas estimation display
- Error handling and user feedback

#### 2. Updated SafeWallet Model (`client/src/models/SafeWallet.ts`)
Replaced mock implementations with real Safe SDK integration.

**Changes:**
- Real Safe wallet data fetching
- Actual transaction creation and signing
- Proper error handling
- Integration with Safe API services

## Usage

### 1. Connecting to a Safe Wallet with SafeTxPool

```typescript
import { walletConnectionService } from './services/WalletConnectionService';

// Connect to Safe wallet (automatically initializes SafeTxPool integration)
await walletConnectionService.connectWallet({
  safeAddress: '0x...', // Safe wallet address
  network: 'ethereum'   // Network name
});
```

### 1.1. Direct SafeTxPool Usage

```typescript
import { SafeTxPoolService } from './services/SafeTxPoolService';

// Create SafeTxPool service
const safeTxPool = new SafeTxPoolService('ethereum');
safeTxPool.setSigner(signer);

// Propose a transaction
const txHash = await safeTxPool.proposeTx({
  safe: '0x...',
  to: '0x...',
  value: '1000000000000000000', // 1 ETH in wei
  data: '0x',
  operation: 0,
  nonce: 123
});

// Sign the transaction
const signature = await signer.signMessage(ethers.utils.arrayify(txHash));
await safeTxPool.signTx(txHash, signature);
```

### 2. Creating a Transaction

```typescript
import { sendTransaction } from './models/SafeWallet';

// Send ETH
const transaction = await sendTransaction(
  fromAddress,
  toAddress,
  '0.1' // Amount in ETH
);

// Send ERC20 token
const tokenTransaction = await sendTransaction(
  fromAddress,
  toAddress,
  '100',
  '0x...' // Token contract address
);
```

### 3. Monitoring Transaction Status

```typescript
import { transactionService } from './services/TransactionService';

// Get transaction status
const status = await transactionService.getTransactionStatus(safeTxHash);

// Check if transaction can be executed
const canExecute = await transactionService.canExecuteTransaction(safeTxHash);
```

## Configuration

### Environment Variables

Create a `.env` file in the client directory:

```env
REACT_APP_INFURA_KEY=your_infura_key_here
REACT_APP_ALCHEMY_KEY=your_alchemy_key_here
```

### Supported Networks

- **Ethereum Mainnet**: Full Safe API support
- **Sepolia Testnet**: For testing and development
- **Arbitrum One**: Layer 2 scaling solution

## Transaction Flow with SafeTxPool

1. **User initiates transaction** via UI (TransactionModal)
2. **Transaction validation** (address format, amount, balance)
3. **Transaction proposal** to SafeTxPool contract via `proposeTx()`
4. **Transaction hash generation** based on transaction parameters
5. **Transaction signing** with user's connected wallet
6. **Signature submission** to SafeTxPool via `signTx()`
7. **Multi-signature collection** from other Safe owners
8. **Transaction execution** when threshold is met
9. **Execution marking** in SafeTxPool via `markAsExecuted()`
10. **Status monitoring** and user feedback

### SafeTxPool Contract Integration

The SafeTxPool contract (`SafeTxPool.sol`) provides the following key functions:

- **`proposeTx()`**: Propose a new Safe transaction to the pool
- **`signTx()`**: Sign a proposed transaction
- **`markAsExecuted()`**: Mark a transaction as executed
- **`getTxDetails()`**: Get transaction details
- **`getPendingTxHashes()`**: Get pending transaction hashes for a Safe
- **`hasSignedTx()`**: Check if an address has signed a transaction

## Multi-Signature Workflow

### For Safe wallets with multiple owners:

1. **First owner** creates and signs the transaction
2. **Transaction is proposed** to other owners via Safe API
3. **Other owners** can view and sign the pending transaction
4. **When threshold is met**, any owner can execute the transaction
5. **Transaction is submitted** to the blockchain

## Error Handling

The integration includes comprehensive error handling for:

- **Network connectivity issues**
- **Insufficient funds**
- **Invalid addresses**
- **User rejection of transactions**
- **Gas estimation failures**
- **Safe API errors**

## Security Considerations

- **Private keys never leave the user's wallet**
- **All transactions require explicit user approval**
- **Safe multi-signature validation**
- **Network and address validation**
- **Gas limit protection**

## Testing

### Prerequisites

1. Install MetaMask or compatible Web3 wallet
2. Have a Safe wallet deployed on the target network
3. Ensure wallet has sufficient funds for gas fees

### Test Scenarios

1. **Connect to Safe wallet**
2. **Create ETH transfer transaction**
3. **Create ERC20 token transfer**
4. **Multi-signature approval workflow**
5. **Transaction execution**
6. **Error handling (insufficient funds, invalid addresses)**

## Dependencies

### Safe SDK Packages

- `@safe-global/protocol-kit`: Core Safe wallet functionality
- `@safe-global/api-kit`: Safe API integration
- `@safe-global/types-kit`: TypeScript types
- `@safe-global/safe-apps-sdk`: Safe Apps integration

### Web3 Libraries

- `ethers@5.7.2`: Ethereum library for blockchain interactions

## Future Enhancements

1. **Batch transactions**: Support for multiple operations in one transaction
2. **Advanced gas management**: EIP-1559 support, gas price optimization
3. **Token discovery**: Automatic detection of user's token balances
4. **Transaction templates**: Pre-configured transaction types
5. **Mobile wallet support**: WalletConnect integration
6. **Hardware wallet support**: Ledger, Trezor integration

## Troubleshooting

### Common Issues

1. **"No wallet detected"**: Install MetaMask or compatible wallet
2. **"Invalid Safe address"**: Verify the Safe wallet address is correct
3. **"Insufficient funds"**: Ensure wallet has enough ETH for gas fees
4. **"Transaction failed"**: Check network connectivity and gas limits
5. **"Safe not found"**: Verify Safe is deployed on the selected network

### Debug Mode

Enable debug logging by setting:
```javascript
localStorage.setItem('debug', 'safe:*');
```

## Support

For issues related to:
- **Safe SDK**: [Safe Documentation](https://docs.safe.global/)
- **Ethereum integration**: [Ethers.js Documentation](https://docs.ethers.io/)
- **MetaMask**: [MetaMask Documentation](https://docs.metamask.io/)

## License

This integration follows the same license as the main Vito project.
