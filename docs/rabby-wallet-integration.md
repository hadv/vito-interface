# Rabby Wallet Integration

This document describes the Rabby wallet integration implemented for connecting to Safe wallets.

## Overview

Rabby wallet is a multi-chain wallet that provides a better DeFi experience. This integration allows users to connect their Rabby wallet as a signer to interact with Safe wallets.

## Features

- **Rabby Wallet Detection**: Automatically detects if Rabby wallet is installed
- **Safe Integration**: Connect Rabby as a signer to existing Safe wallets
- **Multi-wallet Support**: Works alongside MetaMask, WalletConnect, and other wallets
- **Error Handling**: Proper error messages for common connection issues

## How It Works

### 1. Wallet Detection

The application detects Rabby wallet through the `window.ethereum` object:

```typescript
// Single wallet detection
if (window.ethereum.isRabby) {
  // Rabby is the primary wallet
}

// Multiple wallet detection
if (window.ethereum.providers) {
  const rabbyProvider = window.ethereum.providers.find(p => p.isRabby);
  if (rabbyProvider) {
    // Rabby found in providers array
  }
}
```

### 2. Connection Flow

1. User must first connect to a Safe wallet (read-only or with another signer)
2. User clicks "Connect Wallet" and selects Rabby from the modal
3. Application detects Rabby wallet and requests account access
4. User approves the connection in Rabby wallet
5. Application verifies the user is an owner of the Safe wallet
6. Connection is established and user can sign transactions

### 3. Usage in Components

The Rabby wallet integration is available in all wallet connection modals:

```typescript
const handleWalletSelect = async (walletType: string) => {
  if (walletType === 'rabby') {
    await walletConnectionService.connectRabbyWallet();
  }
  // ... other wallet types
};
```

## API Reference

### WalletConnectionService.connectRabbyWallet()

Connects Rabby wallet as a signer to an already connected Safe wallet.

**Returns**: `Promise<WalletConnectionState>`

**Throws**:
- `Error` if Safe wallet is not connected first
- `Error` if Rabby wallet is not detected
- `Error` if user rejects the connection
- `Error` if connection request is already pending

**Example**:
```typescript
try {
  const state = await walletConnectionService.connectRabbyWallet();
  console.log('Connected:', state.signerAddress);
} catch (error) {
  console.error('Connection failed:', error.message);
}
```

## Error Handling

The integration handles common error scenarios:

| Error Code | Description | User Message |
|------------|-------------|--------------|
| 4001 | User rejected request | "Connection cancelled by user" |
| -32002 | Request already pending | "Connection request already pending. Please check your Rabby wallet." |
| N/A | Rabby not detected | "Rabby wallet not found. Please install Rabby wallet." |
| N/A | Safe not connected | "Safe wallet must be connected first" |

## Installation Requirements

Users need to have:
1. Rabby wallet browser extension installed
2. At least one account set up in Rabby
3. The account must be an owner of the Safe wallet they want to interact with

## Supported Networks

Rabby wallet integration supports all networks that the Safe wallet supports:
- Ethereum Mainnet
- Sepolia Testnet  
- Arbitrum
- Other EVM-compatible networks

## Testing

The integration includes comprehensive tests covering:
- Wallet detection scenarios
- Multi-wallet environment handling
- Provider selection logic
- Error handling for various failure cases

Run tests with:
```bash
npm test -- --testPathPattern=RabbyWalletDetection.test.ts
```

## Security Considerations

- The integration only requests account access when explicitly triggered by user action
- Network validation ensures the wallet is on the correct network for the Safe
- Owner verification confirms the connected account can actually sign transactions for the Safe
- Proper error handling prevents information leakage about wallet states

## Browser Compatibility

Rabby wallet integration works in all modern browsers that support:
- ES6+ JavaScript features
- Web3 provider injection
- Browser extension APIs

## Troubleshooting

### Rabby Not Detected
- Ensure Rabby wallet extension is installed and enabled
- Refresh the page after installing Rabby
- Check that Rabby is not disabled by other wallet extensions

### Connection Fails
- Verify the connected account is an owner of the Safe wallet
- Ensure Rabby is on the correct network
- Try disconnecting and reconnecting Rabby wallet

### Multiple Wallets Conflict
- The integration automatically selects Rabby when multiple wallets are present
- If conflicts occur, try disabling other wallet extensions temporarily
