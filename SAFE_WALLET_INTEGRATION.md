# Safe Wallet Integration

This document describes the implementation of Safe Wallet transaction signing and submission functionality in the Vito interface.

## Overview

The integration enables users to:
- Connect to their Safe multi-signature wallets
- Create and sign transactions
- Submit transactions to the blockchain
- Monitor transaction status and confirmations
- View transaction history

## Architecture

### Services

#### 1. SafeWalletService (`client/src/services/SafeWalletService.ts`)
Core service for Safe wallet operations using the Safe Protocol Kit.

**Key Features:**
- Initialize Safe wallet connection
- Create Safe transactions
- Sign transactions with connected wallet
- Execute transactions when threshold is met
- Get Safe information (owners, threshold, balance)
- Retrieve transaction history and pending transactions

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

### 1. Connecting to a Safe Wallet

```typescript
import { walletConnectionService } from './services/WalletConnectionService';

// Connect to Safe wallet
await walletConnectionService.connectWallet({
  safeAddress: '0x...', // Safe wallet address
  network: 'ethereum'   // Network name
});
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

## Transaction Flow

1. **User initiates transaction** via UI (TransactionModal)
2. **Transaction validation** (address format, amount, balance)
3. **Safe transaction creation** using Safe Protocol Kit
4. **Transaction signing** with user's connected wallet
5. **Transaction proposal** to Safe API (for multi-sig approval)
6. **Execution** when threshold signatures are collected
7. **Status monitoring** and user feedback

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
