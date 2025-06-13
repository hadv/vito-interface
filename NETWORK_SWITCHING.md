# Network Switching Feature

This document describes the network switching functionality implemented in the Vito Safe Wallet Interface.

## Overview

The application now supports switching between different Ethereum networks while maintaining the Safe wallet connection. Users can seamlessly switch between:

- **Ethereum Mainnet** - Production network
- **Sepolia Testnet** - Test network for development and testing
- **Arbitrum One** - Layer 2 scaling solution (UI ready, may need additional configuration)

## Features

### 1. Network Selector
- Located in the top header of the application
- Shows the currently selected network
- Dropdown menu with available networks
- Visual indicators (colored badges) for each network
- Loading spinner when switching networks

### 2. Seamless Wallet Reconnection
- When switching networks, the Safe wallet automatically reconnects to the new network
- Maintains both read-only and signer wallet connections
- Preserves wallet state and transaction history for the new network
- Error handling with automatic rollback on failure

### 3. Visual Feedback
- **Network Switching Banner**: Shows when a network switch is in progress
- **Loading Indicators**: Spinner in network selector during switching
- **Disabled State**: Network options are disabled during switching to prevent conflicts

### 4. Block Explorer Integration
- Etherscan links automatically update based on the selected network:
  - Ethereum: `https://etherscan.io`
  - Sepolia: `https://sepolia.etherscan.io`
  - Arbitrum: `https://arbiscan.io`

## Implementation Details

### Core Components

1. **WalletConnectionService** (`client/src/services/WalletConnectionService.ts`)
   - Added `switchNetwork()` method
   - Handles reconnection to Safe wallet on new network
   - Maintains signer connection state across network switches

2. **App.tsx** (`client/src/App.tsx`)
   - Enhanced network selector with loading states
   - Automatic wallet reconnection on network change
   - Error handling and rollback functionality

3. **NetworkSwitchingBanner** (`client/src/components/wallet/components/NetworkSwitchingBanner.tsx`)
   - Shows progress indicator during network switching
   - Provides user feedback about the switching process

4. **WalletHeader** (`client/src/components/wallet/components/WalletHeader.tsx`)
   - Updated Etherscan link generation for different networks
   - Supports multiple block explorers

### Network Configuration

Networks are configured in `client/src/contracts/abis.ts`:

```typescript
export const NETWORK_CONFIGS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io',
    safeTxPoolAddress: SAFE_TX_POOL_ADDRESSES.ethereum
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io',
    safeTxPoolAddress: SAFE_TX_POOL_ADDRESSES.sepolia
  }
};
```

## User Experience

### Switching Networks

1. **Without Connected Wallet**:
   - User can freely switch networks
   - No wallet reconnection needed
   - Network selection is remembered for future connections

2. **With Connected Wallet**:
   - User selects new network from dropdown
   - Application shows "Switching Network" banner
   - Safe wallet reconnects to new network automatically
   - All wallet data refreshes for the new network
   - Success/error feedback provided

### Error Handling

- If network switching fails, the application reverts to the previous network
- Error messages are displayed to the user
- Wallet connection state is preserved even on failure

## Benefits

1. **Seamless Testing**: Developers can easily switch between mainnet and testnet
2. **Multi-Network Support**: Same Safe address can be accessed on different networks
3. **Preserved State**: Signer connections and read-only mode are maintained
4. **User-Friendly**: Clear visual feedback and error handling
5. **Extensible**: Easy to add support for additional networks

## Future Enhancements

- Add support for more Layer 2 networks (Polygon, Optimism, Base)
- Implement automatic network detection based on Safe address
- Add network-specific Safe configurations
- Support for custom RPC endpoints
- Network switching via wallet provider (MetaMask network switching)

## Testing

To test the network switching functionality:

1. Connect to a Safe wallet on Ethereum mainnet
2. Use the network selector to switch to Sepolia
3. Verify that the wallet reconnects and shows Sepolia data
4. Test both read-only and signer wallet modes
5. Verify Etherscan links point to the correct network explorer

## Configuration

To add support for additional networks:

1. Add network configuration to `NETWORK_CONFIGS`
2. Update the network selector UI in `App.tsx`
3. Add appropriate block explorer URLs in `WalletHeader.tsx`
4. Update network colors in the theme if needed
