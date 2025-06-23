# WalletConnect Setup Guide

This guide helps you set up WalletConnect support in the Vito interface.

## Prerequisites

Make sure you have Node.js and npm installed on your system.

## Installation Steps

### 1. Install Dependencies

Navigate to the client directory and install the required WalletConnect packages:

```bash
cd client
npm install @walletconnect/web3-provider@1.8.0 @walletconnect/qrcode-modal@1.8.0
```

### 2. Install Additional Polyfills

Install the required webpack polyfills for browser compatibility:

```bash
npm install --save-dev stream-http https-browserify browserify-zlib
```

### 3. Build the Project

After installing the dependencies, build the project:

```bash
npm run build
```

## Troubleshooting

### Error: Cannot find module '@walletconnect/web3-provider'

If you see this error, it means the WalletConnect dependencies are not installed. Run:

```bash
cd client
npm install @walletconnect/web3-provider@1.8.0 @walletconnect/qrcode-modal@1.8.0
```

### Webpack Polyfill Errors

If you see errors related to missing Node.js modules (http, https, zlib), install the polyfills:

```bash
npm install --save-dev stream-http https-browserify browserify-zlib
```

### Build Warnings

The build may show warnings about missing source maps from WalletConnect packages. These are safe to ignore and don't affect functionality.

## Features

Once properly installed, users will be able to:

1. **Choose Wallet Provider**: Click "Connect" to see MetaMask and WalletConnect options
2. **MetaMask Connection**: Direct browser extension integration
3. **WalletConnect Connection**: QR code modal for mobile wallet connections
4. **Provider Display**: See which wallet provider is currently connected
5. **Easy Switching**: Disconnect and switch between providers

## Architecture

The implementation includes:

- `WalletProvider` interface for wallet abstraction
- `MetaMaskProvider` for MetaMask integration
- `WalletConnectProviderImpl` for WalletConnect integration
- `WalletProviderFactory` for managing providers
- `WalletSelectionModal` for user interface
- Enhanced `WalletConnectionService` with multi-provider support

## Backward Compatibility

All existing MetaMask functionality remains unchanged. The legacy `connectSignerWallet()` method still works and defaults to MetaMask.

## Future Enhancements

The architecture supports easy addition of more wallet providers:
- Coinbase Wallet
- Rainbow Wallet
- Trust Wallet
- Other WalletConnect-compatible wallets
