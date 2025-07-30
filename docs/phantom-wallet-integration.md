# Phantom Wallet Integration

This document describes the Phantom wallet integration implemented for connecting to Safe wallets.

## Overview

Phantom wallet is a popular multi-chain wallet that provides excellent support for Ethereum and Solana. This integration allows users to connect their Phantom wallet as a signer to interact with Safe wallets on Ethereum networks.

## Features

- **Phantom Wallet Detection**: Automatically detects if Phantom wallet is installed
- **Safe Integration**: Connect Phantom as a signer to existing Safe wallets
- **Multi-wallet Support**: Works alongside MetaMask, Rabby, WalletConnect, and other wallets
- **Error Handling**: Proper error messages for common connection issues
- **Type Safety**: Full TypeScript support with proper interfaces

## How It Works

### 1. Wallet Detection

The application detects Phantom wallet through multiple methods:

```typescript
// Phantom's dedicated ethereum provider
if (window.phantom?.ethereum) {
  // Phantom ethereum provider available
}

// Single wallet detection
if (window.ethereum.isPhantom) {
  // Phantom is the primary wallet
}

// Multiple wallet detection
if (window.ethereum.providers) {
  const phantomProvider = window.ethereum.providers.find(p => p.isPhantom);
  if (phantomProvider) {
    // Phantom found in providers array
  }
}
```

### 2. Connection Flow

1. User must first connect to a Safe wallet (read-only or with another signer)
2. User clicks "Connect Wallet" and selects Phantom from the modal
3. Application detects Phantom wallet and requests account access
4. User approves the connection in Phantom wallet
5. Application verifies the user is an owner of the Safe wallet
6. Connection is established and user can sign transactions

### 3. Usage in Components

The Phantom wallet integration is available in all wallet connection modals:

```typescript
const handleWalletSelect = async (walletType: string) => {
  if (walletType === 'phantom') {
    await walletConnectionService.connectPhantomWallet();
  }
  // ... other wallet types
};
```

## API Reference

### WalletConnectionService.connectPhantomWallet()

Connects Phantom wallet as a signer to an already connected Safe wallet.

**Returns:** `Promise<WalletConnectionState>`

**Throws:**
- `Error` if Safe wallet is not connected first
- `Error` if Phantom wallet is not detected
- `Error` if user rejects the connection
- `Error` if user is not an owner of the Safe wallet

**Example:**
```typescript
try {
  const state = await walletConnectionService.connectPhantomWallet();
  console.log('Phantom wallet connected:', state);
} catch (error) {
  console.error('Failed to connect Phantom wallet:', error);
}
```

## Error Handling

The integration handles various error scenarios:

### Common Errors

1. **Phantom Not Installed**
   - Error: "Phantom wallet not detected. Please install Phantom wallet."
   - Solution: Install Phantom browser extension

2. **User Rejection**
   - Error: "Connection cancelled by user"
   - Solution: User needs to approve the connection in Phantom

3. **Pending Request**
   - Error: "Connection request already pending. Please check your Phantom wallet."
   - Solution: Check Phantom wallet for pending connection request

4. **Not Safe Owner**
   - Error: User is not an owner of the connected Safe wallet
   - Solution: Use an account that is an owner of the Safe

### Error Codes

- `4001`: User rejected the request
- `-32002`: Request already pending

## Security Considerations

- Only requests account access on explicit user action
- Validates Safe ownership before allowing connections
- Proper error handling prevents information leakage
- Network validation ensures correct chain
- Provider isolation when multiple wallets are installed

## Browser Compatibility

- Chrome/Chromium-based browsers with Phantom extension
- Firefox with Phantom extension
- Edge with Phantom extension

## Troubleshooting

### Phantom Not Detected

1. Ensure Phantom wallet extension is installed
2. Refresh the page after installation
3. Check if Phantom is enabled in browser extensions

### Connection Issues

1. Try disabling other wallet extensions temporarily
2. Clear browser cache and cookies
3. Restart browser
4. Check Phantom wallet is unlocked

### Multiple Wallets Installed

The integration automatically detects and uses Phantom specifically when multiple wallets are installed. If issues persist:

1. Disable other wallet extensions
2. Set Phantom as default wallet in browser
3. Use Phantom's dedicated ethereum provider

## Integration Details

### Files Modified

- `client/src/services/WalletConnectionService.ts` - Added `connectPhantomWallet()` method
- `client/src/components/ui/WalletConnectionModal.tsx` - Added Phantom wallet option
- `client/src/components/ui/Header.tsx` - Updated wallet selection handler
- `client/src/components/wallet/components/SafeSetupTab.tsx` - Added Phantom support
- `client/src/components/wallet/pages/AddressBookPage.tsx` - Added Phantom support
- `client/src/hooks/useAddressBook.ts` - Extended wallet type handling

### TypeScript Support

```typescript
// Extended Window interface
declare global {
  interface Window {
    phantom?: {
      ethereum?: any;
      solana?: any;
    };
  }
}

// Wallet type union
type WalletType = 'metamask' | 'walletconnect' | 'ledger' | 'web3auth' | 'rabby' | 'phantom';
```

## Testing

To test the Phantom wallet integration:

1. Install Phantom wallet browser extension
2. Create or import an Ethereum account
3. Connect to a Safe wallet in the application
4. Click "Connect Wallet" and select Phantom
5. Approve the connection in Phantom
6. Verify successful connection and ability to sign transactions

## Future Enhancements

- Support for Phantom's Solana functionality
- Enhanced multi-chain support
- Improved error recovery mechanisms
- Advanced transaction signing features

---

**Note:** This integration focuses on Phantom's Ethereum functionality. Solana features are not currently supported but may be added in future versions.
