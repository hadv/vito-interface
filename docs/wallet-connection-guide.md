# Wallet Connection Implementation Guide

## Overview

This document provides a comprehensive guide to the production-ready wallet connection implementation in the Vito Safe Wallet interface. The implementation uses Viem and @wagmi/core for reliable, type-safe wallet interactions.

## Architecture

### Core Components

1. **ViemWalletService** - Main wallet connection service using Viem
2. **WalletService** - Safe-specific wallet operations and state management
3. **WalletContext** - React context for wallet state management
4. **Error Handling** - Comprehensive error handling with user-friendly messages
5. **State Persistence** - Auto-reconnection and session management

### Technology Stack

- **Viem** - TypeScript interface for Ethereum
- **@wagmi/core** - React hooks for Ethereum
- **WalletConnect v2** - Mobile wallet connections
- **React Context** - State management
- **TypeScript** - Type safety

## Getting Started

### Basic Usage

```tsx
import { WalletProvider, useWallet } from './contexts/WalletContext'

function App() {
  return (
    <WalletProvider>
      <WalletComponent />
    </WalletProvider>
  )
}

function WalletComponent() {
  const { 
    state, 
    connectSafe, 
    connectSigner, 
    disconnect,
    showWalletModal 
  } = useWallet()

  const handleConnectSafe = async () => {
    try {
      await connectSafe({
        safeAddress: '0x...',
        network: 'ethereum',
        readOnlyMode: false
      })
    } catch (error) {
      console.error('Failed to connect Safe:', error)
    }
  }

  const handleConnectSigner = async () => {
    try {
      await connectSigner('metamask') // or 'walletconnect'
    } catch (error) {
      console.error('Failed to connect signer:', error)
    }
  }

  return (
    <div>
      <p>Status: {state.isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Signer: {state.signerConnected ? 'Connected' : 'Disconnected'}</p>
      
      <button onClick={handleConnectSafe}>Connect Safe</button>
      <button onClick={handleConnectSigner}>Connect Signer</button>
      <button onClick={showWalletModal}>Show Wallet Modal</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  )
}
```

### Wallet State

The wallet state includes:

```typescript
interface WalletState {
  // Connection status
  isConnected: boolean
  isConnecting: boolean
  
  // Safe wallet info
  safeAddress?: Address
  safeBalance?: string
  network?: string
  chainId?: number
  
  // Signer wallet info
  signerConnected: boolean
  signerAddress?: Address
  signerBalance?: string
  walletType?: WalletType
  
  // Mode and errors
  readOnlyMode: boolean
  error?: string
}
```

## Supported Wallets

### MetaMask
- Browser extension wallet
- Automatic detection and connection
- Chain switching support
- Transaction signing

### WalletConnect v2
- Mobile wallet connections
- QR code scanning
- Deep linking support
- Session persistence

## Error Handling

### Error Types

The system handles various error scenarios:

```typescript
enum WalletErrorCode {
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  WALLET_NOT_INSTALLED = 'WALLET_NOT_INSTALLED',
  CONNECTION_REJECTED = 'CONNECTION_REJECTED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  UNSUPPORTED_CHAIN = 'UNSUPPORTED_CHAIN',
  WALLETCONNECT_MODAL_CLOSED = 'WALLETCONNECT_MODAL_CLOSED',
  // ... more error types
}
```

### Error Handling Example

```typescript
import { safeWalletOperation } from './utils/walletErrors'

const connectWithErrorHandling = async () => {
  try {
    await safeWalletOperation(
      () => viemWalletService.connectMetaMask(),
      {
        maxRetries: 2,
        timeout: 30000,
        onError: (error) => {
          // Show user-friendly error message
          toast.error(error.userMessage)
        }
      }
    )
  } catch (error) {
    // Handle final error
    console.error('Connection failed:', error)
  }
}
```

## State Persistence

### Auto-Reconnection

The system automatically reconnects to previously connected wallets:

```typescript
// Enable auto-reconnection
viemWalletService.setAutoReconnect(true)

// Check if auto-reconnect is enabled
const isEnabled = viemWalletService.isAutoReconnectEnabled()
```

### Storage Management

Wallet state is persisted in localStorage with:
- Version compatibility checking
- Expiration handling (24 hours)
- Graceful degradation for storage errors

## Configuration

### Environment Variables

```env
# WalletConnect Project ID (required for WalletConnect)
REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id

# RPC URLs (optional, fallbacks provided)
REACT_APP_ETHEREUM_RPC_URL=https://eth.llamarpc.com
REACT_APP_SEPOLIA_RPC_URL=https://sepolia.gateway.tenderly.co
```

### Viem Configuration

```typescript
// config/viem.ts
export const viemConfig = createConfig({
  chains: [mainnet, sepolia, polygon, arbitrum, optimism],
  connectors: [
    injected({ target: 'metaMask' }),
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: {
        name: 'Vito',
        description: 'Vito Safe Wallet Interface',
        url: 'https://vito.app',
        icons: ['https://vito.app/icon.png'],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(rpcUrls[mainnet.id]),
    [sepolia.id]: http(rpcUrls[sepolia.id]),
    // ... other chains
  },
})
```

## Testing

### Unit Tests

Run wallet service tests:

```bash
npm test -- --testPathPattern=ViemWalletService.test.ts
```

### Integration Tests

Run full wallet integration tests:

```bash
npm test -- --testPathPattern=WalletIntegration.test.tsx
```

### Test Coverage

The test suite covers:
- Wallet connection flows
- Error handling scenarios
- State persistence
- Auto-reconnection
- UI integration

## Best Practices

### 1. Error Handling
- Always wrap wallet operations in try-catch blocks
- Use `safeWalletOperation` for automatic retry logic
- Provide user-friendly error messages

### 2. State Management
- Subscribe to wallet state changes
- Handle loading states appropriately
- Implement proper cleanup in useEffect

### 3. User Experience
- Show loading indicators during connections
- Provide clear error messages
- Allow users to retry failed operations
- Implement auto-reconnection for better UX

### 4. Security
- Validate all user inputs
- Use read-only mode when appropriate
- Implement proper session management
- Clear sensitive data on disconnect

## Troubleshooting

### Common Issues

1. **MetaMask not detected**
   - Ensure MetaMask is installed
   - Check for conflicting wallet extensions
   - Verify browser compatibility

2. **WalletConnect connection fails**
   - Verify WalletConnect project ID
   - Check network connectivity
   - Ensure mobile wallet supports WalletConnect v2

3. **Auto-reconnection not working**
   - Check localStorage permissions
   - Verify session hasn't expired
   - Ensure auto-reconnect is enabled

### Debug Mode

Enable debug logging in development:

```typescript
// Development only
if (process.env.NODE_ENV === 'development') {
  window.viemWalletService = viemWalletService
}
```

## Migration Guide

### From Legacy Implementation

If migrating from the old wallet connection system:

1. Replace `WalletConnectionService` with `ViemWalletService`
2. Update context imports to use `WalletContext`
3. Replace error handling with new error utilities
4. Update tests to use new service interfaces

### Breaking Changes

- Removed legacy `WalletConnectionService`
- Removed `WalletConnectService` (now handled by Viem)
- Updated error handling interface
- Changed state persistence format

## API Reference

### ViemWalletService

```typescript
class ViemWalletService {
  // Connection methods
  connectMetaMask(): Promise<void>
  connectWalletConnect(): Promise<void>
  disconnectWallet(): Promise<void>

  // Chain management
  switchChain(chainId: number): Promise<void>

  // State management
  getState(): WalletState
  subscribe(listener: (state: WalletState) => void): () => void

  // Utilities
  getBalance(address: Address): Promise<string>
  getPublicClient(chainId?: number): PublicClient
  getWalletClient(): Promise<WalletClient>

  // Persistence
  setAutoReconnect(enabled: boolean): void
  isAutoReconnectEnabled(): boolean

  // Cleanup
  destroy(): void
}
```

### WalletContext Hook

```typescript
interface WalletContextType {
  // State
  state: WalletState

  // Modal state
  isModalOpen: boolean
  showWalletModal: () => void
  hideWalletModal: () => void

  // Connection actions
  connectSafe: (params: ConnectWalletParams) => Promise<void>
  connectSigner: (walletType: WalletType) => Promise<void>
  disconnect: () => Promise<void>
  disconnectSigner: () => Promise<void>

  // Utilities
  switchChain: (chainId: number) => Promise<void>
  getBalance: (address: Address, chainId: number) => Promise<string>
}
```

### Error Utilities

```typescript
// Safe operation wrapper
safeWalletOperation<T>(
  operation: () => Promise<T>,
  options?: {
    maxRetries?: number
    timeout?: number
    onError?: (error: WalletError) => void
  }
): Promise<T>

// Error parsing
WalletErrorHandler.parseError(error: any): WalletError

// Retry logic
WalletErrorHandler.withRetry<T>(
  operation: () => Promise<T>,
  maxRetries?: number,
  delay?: number
): Promise<T>

// Timeout handling
WalletErrorHandler.withTimeout<T>(
  promise: Promise<T>,
  timeoutMs?: number,
  timeoutMessage?: string
): Promise<T>
```

## Support

For issues and questions:
- Check the troubleshooting section
- Review test files for usage examples
- Consult Viem documentation for advanced features
