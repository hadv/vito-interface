# WalletConnect Bidirectional Disconnection - Usage Example

## How to Test the Implementation

### Prerequisites

1. **Connect to a Safe Wallet**:
   - Enter a Safe wallet address
   - Connect in read-only mode first

2. **Connect a WalletConnect Signer**:
   - Click "Connect" in the header
   - Select "WalletConnect" option
   - Scan QR code with your mobile wallet
   - Approve the connection

### Testing Scenarios

#### Scenario 1: Mobile Wallet Disconnection

**Steps**:
1. Ensure you're connected via WalletConnect (you should see "Connected" in the header)
2. On your mobile wallet app:
   - Either close the wallet app completely
   - Or manually disconnect from the dApp/session
   - Or switch to a different account
3. **Expected Result**:
   - Web app should show a notification: "Your mobile wallet has been disconnected"
   - Header should change from "Connected" to "Connect" button
   - Safe wallet should remain accessible in read-only mode
   - All transaction features should be disabled (since no signer is available)

#### Scenario 2: Web App Disconnection

**Steps**:
1. Ensure you're connected via WalletConnect
2. In the web app:
   - Click the "Connected" dropdown in the header
   - Click "Disconnect Wallet"
3. **Expected Result**:
   - Web app should show "Wallet Disconnected" success message
   - Mobile wallet should show disconnection (session ended)
   - Header should change to "Connect" button
   - Safe wallet should remain accessible in read-only mode

#### Scenario 3: Session Expiry

**Steps**:
1. Connect via WalletConnect
2. Wait for the session to expire (usually 24 hours, but can be configured)
3. **Expected Result**:
   - Web app should automatically detect expiry
   - User should see disconnection notification
   - App should gracefully switch to read-only mode

### Browser Console Testing

For advanced testing, you can use the provided test functions:

```javascript
// Open browser console (F12) and run:

// Test all scenarios
testWalletConnectDisconnection.runAll();

// Test specific scenarios
testWalletConnectDisconnection.testMobile();     // Simulate mobile disconnection
testWalletConnectDisconnection.testApp();        // Test app-initiated disconnection
testWalletConnectDisconnection.testValidation(); // Test session validation
```

### Debugging

If you encounter issues, check the browser console for detailed logs:

- **Connection events**: Look for logs starting with 🔗
- **Disconnection events**: Look for logs starting with 🔌
- **State changes**: Look for logs starting with 🔄
- **Errors**: Look for logs starting with ❌

### Expected Behavior Summary

| Action | Mobile Wallet | Web App | Safe Wallet |
|--------|---------------|---------|-------------|
| Mobile disconnects | Shows disconnection | Shows notification, switches to read-only | Remains accessible |
| App disconnects | Receives disconnection | Shows success message, switches to read-only | Remains accessible |
| Session expires | Shows expiry | Shows notification, switches to read-only | Remains accessible |
| Reconnect | Can reconnect | Can initiate new connection | Maintains state |

### Troubleshooting

**Issue**: Mobile wallet doesn't show disconnection when app disconnects
- **Solution**: Ensure WalletConnect v2 is being used and session is properly established

**Issue**: App doesn't detect mobile wallet disconnection
- **Solution**: Check that event listeners are properly set up and WalletConnect service is initialized

**Issue**: Safe wallet becomes inaccessible after disconnection
- **Solution**: This shouldn't happen - Safe wallet should remain in read-only mode. Check console for errors.

**Issue**: Multiple disconnection notifications
- **Solution**: This might indicate duplicate event listeners. Check that cleanup is working properly.

### Integration Notes

The implementation is designed to:
- **Not interfere** with other wallet types (MetaMask, etc.)
- **Maintain Safe wallet access** even when signer is disconnected
- **Provide clear user feedback** for all disconnection scenarios
- **Handle errors gracefully** without breaking the app
- **Clean up resources** properly to prevent memory leaks

### Performance Considerations

- Event listeners are set up once and cleaned up properly
- Session validation is done efficiently with timeouts
- State updates are batched to prevent excessive re-renders
- Error handling prevents cascading failures
