# WalletConnect Bidirectional Disconnection

This document explains how the bidirectional disconnection handling works for WalletConnect in the Vito Interface application.

## Overview

The application now properly handles disconnection events in both directions:

1. **Mobile Wallet → App**: When a user disconnects from their mobile wallet, the app automatically updates its state
2. **App → Mobile Wallet**: When a user disconnects from the app, the mobile wallet is properly notified

## Implementation Details

### 1. Mobile Wallet Disconnection Handling

When a user disconnects from their mobile wallet (e.g., by closing the wallet app or manually disconnecting), the following happens:

#### Event Flow:
1. Mobile wallet sends `session_delete` or `session_expire` event
2. `WalletConnectService` receives the event and emits `session_disconnected` with `initiatedBy: 'mobile'`
3. `WalletConnectionService` listens for these events and calls `handleMobileWalletDisconnection()`
4. App state is updated to read-only mode, clearing signer information

#### Code Location:
- **WalletConnectService**: `setupWalletConnectListeners()` method handles WalletConnect events
- **WalletConnectionService**: `setupWalletConnectEventListeners()` and `handleMobileWalletDisconnection()` methods

### 2. App-Initiated Disconnection Handling

When a user disconnects from the app (e.g., clicking "Disconnect" button), the following happens:

#### Event Flow:
1. User clicks disconnect button in the UI
2. `WalletConnectionService.disconnectSignerWallet()` is called
3. If wallet type is 'walletconnect', `WalletConnectService.disconnect()` is called
4. WalletConnect sends disconnect message to mobile wallet
5. App state is updated to read-only mode

#### Code Location:
- **WalletConnectionService**: `disconnectSignerWallet()` method checks wallet type and calls WalletConnect disconnect
- **WalletConnectService**: `disconnect()` method sends disconnect message to mobile wallet

### 3. Event Listeners Setup

The `WalletConnectionService` constructor automatically sets up event listeners for WalletConnect events:

```typescript
constructor() {
  // Set up WalletConnect event listeners for mobile wallet disconnections
  this.setupWalletConnectEventListeners();
}
```

### 4. State Management

The wallet connection state includes a `walletType` field that tracks which type of wallet is connected:

- `'metamask'`: MetaMask browser extension
- `'walletconnect'`: WalletConnect mobile wallet
- `'ledger'`: Ledger hardware wallet (future)
- `'privatekey'`: Private key wallet (future)

This allows the disconnection logic to handle each wallet type appropriately.

## UI Components

### Header Component
- Shows connection status and disconnect button
- Automatically updates when wallet state changes
- Handles both MetaMask and WalletConnect disconnections

### WalletConnectModal
- Listens for `session_disconnected` events
- Updates modal state when mobile wallet disconnects
- Shows appropriate error messages

## Testing

The implementation includes comprehensive tests in `client/src/tests/walletconnect-disconnection.test.ts`:

- Mobile wallet disconnection handling
- App-initiated disconnection
- Event listener management
- State updates

## Error Handling

The disconnection handling includes robust error handling:

- Failed disconnections don't leave the app in a stuck state
- Session topics are cleared even if disconnect fails
- Appropriate error messages are shown to users
- Fallback to read-only mode when disconnection issues occur

## Benefits

1. **Consistent State**: App and mobile wallet stay in sync
2. **Better UX**: Users don't get stuck in connected state when mobile wallet disconnects
3. **Proper Cleanup**: Resources are properly cleaned up on disconnection
4. **Error Recovery**: Robust handling of disconnection failures

## Manual Testing Guide

### Testing Mobile Wallet → App Disconnection

1. **Setup**:
   - Connect to a Safe wallet in the app
   - Connect a signer wallet using WalletConnect (scan QR code with mobile wallet)
   - Verify the header shows "Connected" status

2. **Test Mobile Disconnection**:
   - On your mobile wallet, disconnect from the WalletConnect session
   - **Expected Result**: App should automatically switch to read-only mode
   - **Verify**: Header should show "Connect" button instead of "Connected"
   - **Verify**: Console should log "Mobile wallet disconnected, updating app state..."

3. **Test Session Expiry**:
   - Wait for WalletConnect session to expire (or force expiry)
   - **Expected Result**: App should handle expiry gracefully
   - **Verify**: App switches to read-only mode

### Testing App → Mobile Wallet Disconnection

1. **Setup**:
   - Connect to a Safe wallet in the app
   - Connect a signer wallet using WalletConnect
   - Verify connection is active on both app and mobile wallet

2. **Test App Disconnection**:
   - Click the "Disconnect" button in the app header
   - **Expected Result**: Mobile wallet should receive disconnection notification
   - **Verify**: Mobile wallet shows disconnected state
   - **Verify**: App switches to read-only mode
   - **Verify**: Console should log "WalletConnect disconnected from app"

### Testing Error Scenarios

1. **Network Issues**:
   - Disconnect internet during active session
   - **Expected Result**: App should handle gracefully without hanging

2. **Mobile App Closure**:
   - Force close mobile wallet app during active session
   - **Expected Result**: App should detect disconnection and switch to read-only

### Console Debugging

Enable browser console to see detailed logs:
- `WalletConnect session connected:` - Successful connection
- `WalletConnect session disconnected:` - Disconnection events
- `Mobile wallet disconnected, updating app state...` - Mobile-initiated disconnection
- `WalletConnect disconnected from app` - App-initiated disconnection

## Future Enhancements

- Add reconnection prompts when mobile wallet disconnects unexpectedly
- Implement session persistence across browser refreshes
- Add connection health monitoring with periodic pings
- Support for multiple simultaneous wallet connections
